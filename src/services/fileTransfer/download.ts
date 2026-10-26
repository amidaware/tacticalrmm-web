import {
  ackAgentFileDownloadChunk,
  assertDownloadChunkRange,
  cancelAgentFileDownload,
  completeAgentFileDownload,
  getAgentDownloadStatus,
  getAgentFileDownloadChunk,
  initAgentArchiveDownload,
  initAgentFileDownload,
  parseContentRangeHeader,
  resumeAgentFileDownload,
} from "@/api/filebrowser";
import {
  ARCHIVE_STATUS_POLL_INTERVAL_MS,
  FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
  FILE_TRANSFER_FINALIZE_WAIT_MAX_MS,
  MAX_IN_MEMORY_DOWNLOAD_BYTES,
} from "@/constants/fileTransfer";
import { ARCHIVE_PREPARE_TIMEOUT_MS } from "@/constants/filebrowser";
import type {
  FileTransferDownloadResult,
  FileTransferDownloadStatusResponse,
  FileTransferProgress,
  TransferAbortIntent,
} from "@/types/fileTransfer";
import { fileBrowserPathLeaf } from "@/utils/filebrowser";

import {
  createSha256Hasher,
  hashBlobPrefix,
  hashBytes,
  type Sha256Hasher,
} from "./hash";
import { writeDownloadChunkThenAck } from "./downloadChunkCommit";
import {
  archiveDownloadHandleIdbKey,
  archiveDownloadResumeKey,
  abortWritableAndMaybeRemoveFile,
  alignResumeOffset,
  clearDownloadResume,
  persistDownloadFileHandle,
  downloadBytesPathKey,
  downloadBytesSessionKey,
  downloadHandleIdbKey,
  downloadSessionHandleIdbKey,
  ensureFileHandlePermission,
  idbDeleteDownloadBytes,
  idbDeleteFileHandle,
  idbGetDownloadBytes,
  idbGetFileHandle,
  idbPutFileHandle,
  idbWriteDownloadBytes,
  isAbortError,
  loadDownloadResume,
  newDownloadChunksId,
  saveDownloadResume,
} from "./resume";
import {
  RetryableTransferError,
  TransferNotReadyError,
  type TransferSlotWaitInfo,
  type TransientRetryInfo,
  isRetryableTransferError,
  sleepAbortable,
  withTransferSessionRetry,
  withTransientRetry,
} from "./sessionLimit";

export interface RunFileDownloadOptions {
  signal?: AbortSignal;
  abortIntent?: TransferAbortIntent;
  chunkSize?: number;
  onProgress?: (progress: FileTransferProgress) => void;
  onStatus?: (status: "initializing" | "downloading" | "completing") => void;
  onSession?: (sessionId: string) => void;
  knownSessionId?: string;
  fileHandle?: FileSystemFileHandle;
  onArchiveBuilding?: () => void;
  onWaitingForSlot?: (info: TransferSlotWaitInfo) => void;
  onRetrying?: (info: TransientRetryInfo) => void;
}

interface DownloadSink {
  writeChunk(buf: ArrayBuffer): Promise<void>;
  hashPrefix(
    endOffset: number,
    chunkSize: number,
    hasher: Sha256Hasher,
  ): Promise<void>;
  resetForNewSession(): Promise<void>;
  bindSession?(sessionId: string): Promise<void>;
  finalize(): Promise<void>;
  abort(opts?: { discardFile?: boolean }): Promise<void>;
}

function trimBuffersToOffset(
  parts: ArrayBuffer[],
  endOffset: number,
): ArrayBuffer[] {
  if (endOffset <= 0) return [];
  const trimmed: ArrayBuffer[] = [];
  let kept = 0;
  for (const part of parts) {
    if (kept >= endOffset) break;
    const remaining = endOffset - kept;
    if (part.byteLength <= remaining) {
      trimmed.push(part);
      kept += part.byteLength;
    } else {
      trimmed.push(part.slice(0, remaining));
      kept += remaining;
    }
  }
  return trimmed;
}

async function releaseDownloadSession(
  agentId: string,
  sessionId: string | null | undefined,
  reason: "user" | "error" = "error",
): Promise<void> {
  if (!sessionId) return;
  try {
    await cancelAgentFileDownload(agentId, sessionId, reason);
  } catch {
    // frees agent session slot for retry
  }
}

async function abortDownloadSink(
  sink: DownloadSink,
  err: unknown,
  abortIntent?: TransferAbortIntent,
): Promise<void> {
  const discardFile =
    (isAbortError(err) && abortIntent?.mode === "cancel") ||
    (!isAbortError(err) && !isRetryableTransferError(err));
  await sink.abort({ discardFile });
}

async function discardDownloadResumeState(
  agentId: string,
  resumeScopeKey: string,
  handleKey: string,
  sessionId?: string | null,
): Promise<void> {
  clearDownloadResume(agentId, resumeScopeKey);
  await idbDeleteFileHandle(handleKey).catch(() => {});
  await idbDeleteDownloadBytes(
    downloadBytesPathKey(agentId, resumeScopeKey),
  ).catch(() => {});
  if (sessionId) {
    await idbDeleteDownloadBytes(downloadBytesSessionKey(sessionId)).catch(
      () => {},
    );
  }
}

async function waitForArchiveReady(
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
  onRetrying?: (info: TransientRetryInfo) => void,
): Promise<FileTransferDownloadStatusResponse> {
  const deadline = Date.now() + ARCHIVE_PREPARE_TIMEOUT_MS;
  let retryAttempt = 0;
  for (;;) {
    if (signal?.aborted) {
      throw new DOMException("Download aborted", "AbortError");
    }
    try {
      const status = await getAgentDownloadStatus(agentId, sessionId, signal);
      if (status.status === "agent_ready" || status.status === "transferring") {
        return status;
      }
      if (
        status.status === "failed" ||
        status.status === "cancelled" ||
        status.status === "expired"
      ) {
        throw new Error(
          status.error || `Archive preparation ${status.status}.`,
        );
      }
    } catch (err) {
      if (isAbortError(err) || !isRetryableTransferError(err)) {
        throw err;
      }
      if (Date.now() >= deadline) {
        throw err;
      }
      retryAttempt += 1;
      onRetrying?.({
        attempt: retryAttempt,
        delayMs: ARCHIVE_STATUS_POLL_INTERVAL_MS,
        error: err,
      });
    }
    if (Date.now() >= deadline) {
      throw new Error(
        "Timed out waiting for the archive to build on the agent.",
      );
    }
    await sleepAbortable(ARCHIVE_STATUS_POLL_INTERVAL_MS, signal);
  }
}

function assertMemoryDownloadAllowed(
  usesMemoryBuffer: boolean,
  totalSize: number,
): void {
  if (usesMemoryBuffer && totalSize > MAX_IN_MEMORY_DOWNLOAD_BYTES) {
    const limitMiB = Math.floor(MAX_IN_MEMORY_DOWNLOAD_BYTES / (1024 * 1024));
    throw new Error(
      `This download (${Math.ceil(totalSize / (1024 * 1024))} MiB) is too large ` +
        `for this browser, which must buffer it in memory (limit ${limitMiB} MiB). ` +
        "Use Chrome or Edge to stream large downloads directly to disk.",
    );
  }
}

const SAVE_PICKER_UNAVAILABLE_MESSAGE =
  "Could not open the save dialog. Click download again and choose where to save the file.";

function rethrowSavePickerError(
  err: unknown,
  signal: AbortSignal | undefined,
  abortIntent?: TransferAbortIntent,
): never {
  if (isAbortError(err)) {
    if (abortIntent && !signal?.aborted) {
      abortIntent.mode = "cancel";
    }
    throw err;
  }
  throw new Error(SAVE_PICKER_UNAVAILABLE_MESSAGE);
}

const DOWNLOAD_CHUNKS_IN_FLIGHT = 2;
const DOWNLOAD_AHEAD_BACKOFF_CHUNKS = 4;

interface StreamDownloadChunksParams {
  agentId: string;
  sessionId: string;
  totalSize: number;
  chunkSize: number;
  startOffset: number;
  sink: DownloadSink;
  hasher: Sha256Hasher;
  signal?: AbortSignal;
  onProgress?: (progress: FileTransferProgress) => void;
  onRetrying?: (info: TransientRetryInfo) => void;
}

async function streamDownloadChunks(
  params: StreamDownloadChunksParams,
): Promise<void> {
  const {
    agentId,
    sessionId,
    totalSize,
    chunkSize,
    sink,
    hasher,
    signal,
    onProgress,
    onRetrying,
  } = params;
  let committedOffset = params.startOffset;

  const prefetchAbort = new AbortController();
  const onOuterAbort = () => prefetchAbort.abort();
  signal?.addEventListener("abort", onOuterAbort, { once: true });

  const fetchChunk = (offset: number, poll: boolean) =>
    withTransientRetry(
      async () => {
        let response;
        try {
          response = await getAgentFileDownloadChunk(
            agentId,
            sessionId,
            offset,
            prefetchAbort.signal,
          );
        } catch (err) {
          if (!poll && err instanceof TransferNotReadyError) return null;
          throw err;
        }
        const { data, contentRange } = response;
        const range = parseContentRangeHeader(contentRange);
        assertDownloadChunkRange(range, {
          start: offset,
          totalSize,
        });
        const expectedLen = range.end - range.start + 1;
        if (data.byteLength !== expectedLen) {
          throw new RetryableTransferError(
            `Chunk size mismatch: received ${data.byteLength}, expected ${expectedLen}`,
          );
        }
        return { data, newCommitted: range.end + 1 };
      },
      { signal: prefetchAbort.signal, onRetry: onRetrying },
    );

  type PendingChunk = {
    offset: number;
    result: ReturnType<typeof fetchChunk>;
  };
  let queue: PendingChunk[] = [];
  let nextRequestOffset = committedOffset;
  let singleAheadFor = 0;
  const topUp = () => {
    const limit = singleAheadFor > 0 ? 1 : DOWNLOAD_CHUNKS_IN_FLIGHT;
    while (queue.length < limit && nextRequestOffset < totalSize) {
      const result = fetchChunk(nextRequestOffset, queue.length === 0);
      result.catch(() => {});
      queue.push({ offset: nextRequestOffset, result });
      nextRequestOffset = Math.min(nextRequestOffset + chunkSize, totalSize);
    }
  };

  try {
    while (committedOffset < totalSize) {
      if (signal?.aborted) {
        throw new DOMException("Download aborted", "AbortError");
      }

      topUp();
      const pending = queue.shift()!;
      let fetched = await pending.result;
      if (singleAheadFor > 0) singleAheadFor -= 1;
      if (!fetched) {
        singleAheadFor = DOWNLOAD_AHEAD_BACKOFF_CHUNKS;
        fetched = await fetchChunk(pending.offset, true);
      }
      if (!fetched) {
        throw new RetryableTransferError("Download chunk was not received");
      }
      const { data: chunkBuf, newCommitted } = fetched;
      if (queue.length && queue[0].offset !== newCommitted) {
        queue = [];
        nextRequestOffset = newCommitted;
      }
      topUp();

      await writeDownloadChunkThenAck({
        chunk: chunkBuf,
        writeChunk: (buf) => sink.writeChunk(buf),
        afterWrite: () => hashBytes(hasher, chunkBuf),
        ack: () =>
          withTransientRetry(
            () => ackAgentFileDownloadChunk(agentId, sessionId, newCommitted),
            { signal, onRetry: onRetrying },
          ),
      });
      committedOffset = newCommitted;

      onProgress?.({
        acceptedOffset: committedOffset,
        committedOffset,
        totalSize,
      });
    }
  } finally {
    prefetchAbort.abort();
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

async function createDownloadSink(
  agentId: string,
  resumeScopeKey: string,
  fileName: string,
  options: {
    signal?: AbortSignal;
    handleKeyOverride?: string;
    beforeSavePicker?: () => Promise<void>;
    knownSessionId?: string;
    existingHandle?: FileSystemFileHandle;
    abortIntent?: TransferAbortIntent;
  } = {},
): Promise<{
  sink: DownloadSink;
  resumeOffset: number;
  resumeSessionId: string | null;
  abandonedSessionId: string | null;
  usesMemoryBuffer: boolean;
  fileHandle: FileSystemFileHandle | null;
}> {
  const {
    signal,
    handleKeyOverride,
    beforeSavePicker,
    knownSessionId,
    existingHandle,
    abortIntent,
  } = options;
  const canFS = "showSaveFilePicker" in window;
  const saved = loadDownloadResume(agentId, resumeScopeKey);
  const handleKey =
    handleKeyOverride ?? downloadHandleIdbKey(agentId, resumeScopeKey);
  const queuedSessionId = knownSessionId || saved?.sessionId || null;

  let fileHandle: FileSystemFileHandle | null = existingHandle ?? null;
  let writable: FileSystemWritableFileStream | null = null;
  let buffers: ArrayBuffer[] | null = null;
  let resumeOffset = 0;
  let resumeSessionId: string | null = null;
  const abandonedSessionId: string | null = null;

  async function openExistingHandle(
    handle: FileSystemFileHandle,
  ): Promise<void> {
    const existing = await handle.getFile();
    writable = await handle.createWritable({ keepExistingData: true });
    fileHandle = handle;
    if (queuedSessionId) {
      const priorChunk = saved?.chunkSize || FILE_TRANSFER_DEFAULT_CHUNK_SIZE;
      resumeOffset = alignResumeOffset(existing.size, priorChunk);
      resumeSessionId = queuedSessionId;
      await writable.truncate(resumeOffset);
      await writable.seek(resumeOffset);
    } else {
      await writable.truncate(0);
      await writable.seek(0);
    }
  }

  if (canFS && existingHandle) {
    try {
      await openExistingHandle(existingHandle);
    } catch (err) {
      if (isAbortError(err)) throw err;
      console.warn("file browser: could not reopen the download file", err);
      throw new Error(
        "Could not reopen the saved download file. Click Resume and allow file access.",
      );
    }
  } else if (canFS) {
    try {
      fileHandle = (await idbGetFileHandle(handleKey)) ?? null;
      if (fileHandle && (await ensureFileHandlePermission(fileHandle))) {
        await openExistingHandle(fileHandle);
      } else {
        fileHandle = null;
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      fileHandle = null;
      writable = null;
    }
  }

  if (!writable) {
    const pathBytesKey = downloadBytesPathKey(agentId, resumeScopeKey);
    const sessionBytesKey = queuedSessionId
      ? downloadBytesSessionKey(queuedSessionId)
      : null;
    let stored =
      (sessionBytesKey
        ? await idbGetDownloadBytes(sessionBytesKey)
        : undefined) || (await idbGetDownloadBytes(pathBytesKey));
    let persistKeys = [pathBytesKey];
    if (sessionBytesKey) persistKeys.push(sessionBytesKey);

    if (queuedSessionId) {
      resumeSessionId = queuedSessionId;
      const priorChunk =
        stored?.chunkSize ||
        saved?.chunkSize ||
        FILE_TRANSFER_DEFAULT_CHUNK_SIZE;
      resumeOffset = alignResumeOffset(
        stored?.committedOffset || 0,
        priorChunk,
      );
      buffers = trimBuffersToOffset(stored?.buffers || [], resumeOffset);
    } else if (canFS) {
      if (signal?.aborted) {
        throw new DOMException("Download aborted", "AbortError");
      }
      await beforeSavePicker?.();
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: "downloads",
        });
        writable = await fileHandle.createWritable();
        await idbPutFileHandle(handleKey, fileHandle);
      } catch (err) {
        rethrowSavePickerError(err, signal, abortIntent);
      }
    } else {
      // nothing to resume, so stored bytes are from an abandoned download
      if (stored) {
        for (const key of persistKeys) {
          await idbDeleteDownloadBytes(key).catch(() => {});
        }
        stored = undefined;
      }
      buffers = [];
    }

    const chunksId = stored?.chunksId || newDownloadChunksId();
    let dirtyFrom = 0;
    let persistDisabled = false;

    async function persistIdbBytes(): Promise<void> {
      if (!buffers || persistDisabled) return;
      const committedOffset = buffers.reduce(
        (sum, part) => sum + part.byteLength,
        0,
      );
      try {
        await idbWriteDownloadBytes(
          persistKeys,
          {
            buffers,
            committedOffset,
            chunkSize: saved?.chunkSize || FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
            chunksId,
          },
          dirtyFrom,
        );
        dirtyFrom = buffers.length;
      } catch (err) {
        persistDisabled = true;
        console.warn(
          "Download resume copy could not be stored; continuing without resume after reload.",
          err,
        );
        // A partial copy would resume from the wrong offset.
        for (const key of persistKeys) {
          await idbDeleteDownloadBytes(key).catch(() => {});
        }
      }
    }

    if (buffers && !writable) {
      const idbSink: DownloadSink = {
        async writeChunk(buf) {
          buffers!.push(buf);
          await persistIdbBytes();
        },
        async hashPrefix(endOffset, _chunkSize, hasher) {
          let hashed = 0;
          for (const part of buffers || []) {
            if (hashed >= endOffset) break;
            const remaining = endOffset - hashed;
            if (part.byteLength <= remaining) {
              hashBytes(hasher, part);
              hashed += part.byteLength;
            } else {
              hashBytes(hasher, part.slice(0, remaining));
              hashed += remaining;
            }
          }
        },
        async resetForNewSession() {
          buffers = [];
          dirtyFrom = 0;
          await persistIdbBytes();
        },
        async bindSession(sessionId: string) {
          persistKeys = [
            ...new Set([...persistKeys, downloadBytesSessionKey(sessionId)]),
          ];
          await persistIdbBytes();
        },
        async finalize() {
          const blob = new Blob(buffers || []);
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
          buffers = null;
          for (const key of persistKeys) {
            await idbDeleteDownloadBytes(key).catch(() => {});
          }
        },
        async abort(opts?: { discardFile?: boolean }) {
          if (opts?.discardFile) {
            buffers = null;
            for (const key of persistKeys) {
              await idbDeleteDownloadBytes(key).catch(() => {});
            }
            return;
          }
          await persistIdbBytes();
        },
      };
      return {
        sink: idbSink,
        resumeOffset,
        resumeSessionId,
        abandonedSessionId,
        usesMemoryBuffer: true,
        fileHandle: null,
      };
    }
  }

  const sink: DownloadSink = {
    async writeChunk(buf) {
      if (writable) {
        await writable.write(buf);
      } else if (buffers) {
        buffers.push(buf);
      }
    },
    async hashPrefix(endOffset, chunkSize, hasher) {
      if (fileHandle) {
        const existing = await fileHandle.getFile();
        await hashBlobPrefix(existing, endOffset, chunkSize, hasher);
      } else if (buffers) {
        for (const part of buffers) {
          hashBytes(hasher, part);
        }
      }
    },
    async resetForNewSession() {
      if (writable) {
        await writable.truncate(0);
        await writable.seek(0);
      } else if (buffers) {
        buffers.length = 0;
      }
    },
    async finalize() {
      if (writable) {
        await writable.close();
        writable = null;
      } else if (buffers) {
        const blob = new Blob(buffers);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        buffers = null;
      }
    },
    async abort(opts?: { discardFile?: boolean }) {
      await abortWritableAndMaybeRemoveFile({
        writable,
        handle: fileHandle,
        discardFile: !!opts?.discardFile,
      });
      writable = null;
    },
  };

  return {
    sink,
    resumeOffset,
    resumeSessionId,
    abandonedSessionId,
    usesMemoryBuffer: buffers !== null,
    fileHandle,
  };
}

export async function runFileDownloadTransfer(
  agentId: string,
  sourcePath: string,
  options: RunFileDownloadOptions = {},
): Promise<FileTransferDownloadResult> {
  const {
    signal,
    abortIntent,
    onProgress,
    onStatus,
    onSession,
    knownSessionId,
    fileHandle,
    onWaitingForSlot,
    onRetrying,
  } = options;
  const leaf = fileBrowserPathLeaf(sourcePath, { emptyFallback: "download" });
  const fileName = /^[A-Za-z]:\\$/.test(leaf) ? "download" : leaf;

  onStatus?.("initializing");
  const {
    sink,
    resumeOffset,
    resumeSessionId,
    abandonedSessionId,
    usesMemoryBuffer,
    fileHandle: sinkHandle,
  } = await createDownloadSink(agentId, sourcePath, fileName, {
    signal,
    abortIntent,
    knownSessionId,
    existingHandle: fileHandle,
  });

  const handleKey = downloadHandleIdbKey(agentId, sourcePath);
  let initData = null as Awaited<
    ReturnType<typeof initAgentFileDownload>
  > | null;
  let effectiveResumeOffset = resumeOffset;
  let sessionId: string | null = null;
  let staleSessionId: string | null = abandonedSessionId;
  let hasher: Sha256Hasher | null = null;

  try {
    if (resumeSessionId) {
      try {
        initData = await resumeAgentFileDownload(
          agentId,
          {
            session_id: resumeSessionId,
            resume_offset: resumeOffset,
          },
          signal,
        );
      } catch (err) {
        if (isAbortError(err) || isRetryableTransferError(err)) throw err;
        staleSessionId = resumeSessionId;
        clearDownloadResume(agentId, sourcePath);
        initData = null;
        effectiveResumeOffset = 0;
      }
    }

    if (!initData) {
      if (staleSessionId) {
        await releaseDownloadSession(agentId, staleSessionId, "user");
        staleSessionId = null;
      }
      if (resumeOffset > 0) {
        await sink.resetForNewSession();
      }
      initData = await withTransferSessionRetry(
        () =>
          initAgentFileDownload(
            agentId,
            {
              source_path: sourcePath,
              chunk_size: options.chunkSize ?? FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
            },
            signal,
          ),
        { signal, onWaitingForSlot },
      );
      effectiveResumeOffset = 0;
    }

    const sessionIdValue = initData.session_id;
    sessionId = sessionIdValue;
    onSession?.(sessionIdValue);
    await sink.bindSession?.(sessionIdValue);
    const totalSize = initData.total_size;
    const chunkSize = initData.chunk_size;
    const committedOffset =
      initData.committed_offset || effectiveResumeOffset || 0;

    assertMemoryDownloadAllowed(usesMemoryBuffer, totalSize);

    saveDownloadResume(agentId, sourcePath, {
      sessionId: sessionIdValue,
      chunkSize,
      totalSize,
    });
    if (sinkHandle) {
      await persistDownloadFileHandle(
        [handleKey, downloadSessionHandleIdbKey(sessionIdValue)],
        sinkHandle,
      ).catch(() => {});
    }

    hasher = createSha256Hasher();
    if (committedOffset > 0) {
      await sink.hashPrefix(committedOffset, chunkSize, hasher);
      onProgress?.({
        acceptedOffset: committedOffset,
        committedOffset,
        totalSize,
      });
    }

    onStatus?.("downloading");

    await streamDownloadChunks({
      agentId,
      sessionId: sessionIdValue,
      totalSize,
      chunkSize,
      startOffset: committedOffset,
      sink,
      hasher,
      signal,
      onProgress,
      onRetrying,
    });

    onStatus?.("completing");
    const completeData = await withTransientRetry(
      () => completeAgentFileDownload(agentId, sessionIdValue, signal),
      {
        signal,
        onRetry: onRetrying,
        finalizeWaitMs: FILE_TRANSFER_FINALIZE_WAIT_MAX_MS,
      },
    );

    const localSha256 = await hasher.hex();
    const agentSha = (completeData.sha256 || "").toLowerCase();
    const integrityOk = !agentSha || agentSha === localSha256;

    if (!integrityOk) {
      throw new Error("Download integrity check failed (SHA-256 mismatch).");
    }

    clearDownloadResume(agentId, sourcePath);
    await idbDeleteFileHandle(handleKey).catch(() => {});
    await idbDeleteFileHandle(
      downloadSessionHandleIdbKey(sessionIdValue),
    ).catch(() => {});
    await sink.finalize();

    return {
      sourcePath: completeData.source_path,
      fileName,
      sha256: localSha256,
      integrityOk,
      bytesWritten: totalSize,
    };
  } catch (err) {
    hasher?.dispose();
    await abortDownloadSink(sink, err, abortIntent);
    if (isAbortError(err)) {
      if (abortIntent?.mode === "cancel") {
        await releaseDownloadSession(agentId, sessionId, "user");
        await discardDownloadResumeState(
          agentId,
          sourcePath,
          handleKey,
          sessionId,
        );
      }
    } else if (!isRetryableTransferError(err)) {
      await releaseDownloadSession(agentId, sessionId, "error");
      await discardDownloadResumeState(
        agentId,
        sourcePath,
        handleKey,
        sessionId,
      );
    }
    throw err;
  }
}

export async function runArchiveDownloadTransfer(
  agentId: string,
  paths: string[],
  suggestedFileName: string,
  options: RunFileDownloadOptions = {},
): Promise<FileTransferDownloadResult> {
  const {
    signal,
    abortIntent,
    onProgress,
    onStatus,
    onSession,
    knownSessionId,
    fileHandle,
    onArchiveBuilding,
    onWaitingForSlot,
    onRetrying,
  } = options;
  const resumeScopeKey = archiveDownloadResumeKey(agentId, paths);
  const fileName = suggestedFileName.trim() || "download.zip";
  const handleKey = archiveDownloadHandleIdbKey(agentId, paths);

  onStatus?.("initializing");

  let initData = null as Awaited<
    ReturnType<typeof initAgentArchiveDownload>
  > | null;
  let sessionId: string | null = null;
  let sink: DownloadSink;
  let resumeOffset = 0;
  let resumeSessionId: string | null = null;
  let abandonedSessionId: string | null = null;
  let usesMemoryBuffer = false;
  let sinkHandle: FileSystemFileHandle | null = null;

  try {
    ({
      sink,
      resumeOffset,
      resumeSessionId,
      abandonedSessionId,
      usesMemoryBuffer,
      fileHandle: sinkHandle,
    } = await createDownloadSink(agentId, resumeScopeKey, fileName, {
      signal,
      abortIntent,
      handleKeyOverride: handleKey,
      knownSessionId,
      existingHandle: fileHandle,
      beforeSavePicker: async () => {
        const oldSessionId =
          knownSessionId ||
          loadDownloadResume(agentId, resumeScopeKey)?.sessionId;
        if (oldSessionId) {
          await releaseDownloadSession(agentId, oldSessionId, "user");
        }
        onArchiveBuilding?.();
        initData = await withTransferSessionRetry(
          () =>
            initAgentArchiveDownload(
              agentId,
              {
                paths,
                filename: fileName,
                chunk_size:
                  options.chunkSize ?? FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
              },
              signal,
            ),
          { signal, onWaitingForSlot },
        );
        sessionId = initData.session_id;
      },
    }));
  } catch (err) {
    if (sessionId) {
      if (isAbortError(err)) {
        if (abortIntent?.mode !== "pause") {
          await releaseDownloadSession(agentId, sessionId, "user");
        }
      } else {
        await releaseDownloadSession(agentId, sessionId, "error");
      }
    }
    throw err;
  }

  let effectiveResumeOffset = resumeOffset;
  let staleSessionId: string | null = abandonedSessionId;
  let hasher: Sha256Hasher | null = null;

  try {
    if (resumeSessionId) {
      try {
        initData = await resumeAgentFileDownload(
          agentId,
          {
            session_id: resumeSessionId,
            resume_offset: resumeOffset,
          },
          signal,
        );
        sessionId = initData.session_id;
      } catch {
        staleSessionId = resumeSessionId;
        clearDownloadResume(agentId, resumeScopeKey);
        initData = null;
        sessionId = null;
        effectiveResumeOffset = 0;
      }
    }

    if (!initData) {
      if (staleSessionId && staleSessionId !== sessionId) {
        await releaseDownloadSession(agentId, staleSessionId, "user");
        staleSessionId = null;
      }
      if (resumeOffset > 0) {
        await sink.resetForNewSession();
      }
      if (!sessionId) {
        onArchiveBuilding?.();
        initData = await withTransferSessionRetry(
          () =>
            initAgentArchiveDownload(
              agentId,
              {
                paths,
                filename: fileName,
                chunk_size:
                  options.chunkSize ?? FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
              },
              signal,
            ),
          { signal, onWaitingForSlot },
        );
        sessionId = initData.session_id;
      }
      effectiveResumeOffset = 0;
    }

    const sessionIdValue = initData.session_id;
    sessionId = sessionIdValue;
    onSession?.(sessionIdValue);

    await sink.bindSession?.(sessionIdValue);

    let totalSize = initData.total_size;
    let chunkSize = initData.chunk_size;
    const warnings: string[] = Array.isArray(initData.warnings)
      ? [...initData.warnings]
      : [];
    if (initData.preparing || totalSize < 1) {
      onArchiveBuilding?.();
      const ready = await waitForArchiveReady(
        agentId,
        sessionIdValue,
        signal,
        onRetrying,
      );
      totalSize = ready.total_size;
      chunkSize = ready.chunk_size || chunkSize;
      if (Array.isArray(ready.warnings)) {
        warnings.push(...ready.warnings);
      }
    }

    assertMemoryDownloadAllowed(usesMemoryBuffer, totalSize);

    const committedOffset =
      initData.committed_offset || effectiveResumeOffset || 0;

    saveDownloadResume(agentId, resumeScopeKey, {
      sessionId: sessionIdValue,
      chunkSize,
      totalSize,
    });
    if (sinkHandle) {
      await persistDownloadFileHandle(
        [handleKey, downloadSessionHandleIdbKey(sessionIdValue)],
        sinkHandle,
      ).catch(() => {});
    }

    hasher = createSha256Hasher();
    if (committedOffset > 0) {
      await sink.hashPrefix(committedOffset, chunkSize, hasher);
      onProgress?.({
        acceptedOffset: committedOffset,
        committedOffset,
        totalSize,
      });
    }

    onStatus?.("downloading");

    await streamDownloadChunks({
      agentId,
      sessionId: sessionIdValue,
      totalSize,
      chunkSize,
      startOffset: committedOffset,
      sink,
      hasher,
      signal,
      onProgress,
      onRetrying,
    });

    onStatus?.("completing");
    const completeData = await withTransientRetry(
      () => completeAgentFileDownload(agentId, sessionIdValue, signal),
      {
        signal,
        onRetry: onRetrying,
        finalizeWaitMs: FILE_TRANSFER_FINALIZE_WAIT_MAX_MS,
      },
    );

    const localSha256 = await hasher.hex();
    const agentSha = (completeData.sha256 || "").toLowerCase();
    const integrityOk = !agentSha || agentSha === localSha256;

    if (!integrityOk) {
      throw new Error("Download integrity check failed (SHA-256 mismatch).");
    }

    clearDownloadResume(agentId, resumeScopeKey);
    await idbDeleteFileHandle(handleKey).catch(() => {});
    await idbDeleteFileHandle(
      downloadSessionHandleIdbKey(sessionIdValue),
    ).catch(() => {});
    await sink.finalize();

    return {
      sourcePath: paths.join(";"),
      fileName: initData.filename || fileName,
      sha256: localSha256,
      integrityOk,
      bytesWritten: totalSize,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    hasher?.dispose();
    await abortDownloadSink(sink, err, abortIntent);
    if (isAbortError(err)) {
      if (abortIntent?.mode === "cancel") {
        await releaseDownloadSession(agentId, sessionId, "user");
        await discardDownloadResumeState(
          agentId,
          resumeScopeKey,
          handleKey,
          sessionId,
        );
      }
    } else if (!isRetryableTransferError(err)) {
      await releaseDownloadSession(agentId, sessionId, "error");
      await discardDownloadResumeState(
        agentId,
        resumeScopeKey,
        handleKey,
        sessionId,
      );
    }
    throw err;
  }
}

export { isAbortError };
