import {
  cancelAgentFileUpload,
  completeAgentFileUpload,
  getUploadChunkReady,
  initAgentFileUpload,
  resumeAgentFileUpload,
  uploadAgentFileChunk,
} from "@/api/filebrowser";
import {
  FILE_TRANSFER_ACK_WAIT_MAX_MS,
  FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
  FILE_TRANSFER_FINALIZE_WAIT_MAX_MS,
  FILE_TRANSFER_STALL_NOTICE_MS,
  FILE_TRANSFER_TRANSIENT_RETRY_HARD_CAP,
} from "@/constants/fileTransfer";
import { AxiosError } from "axios";

import { getAxiosErrorDetail } from "@/utils/apiError";
import type {
  FileTransferProgress,
  FileTransferUploadChunkReadyResponse,
  FileTransferUploadChunkResponse,
  FileTransferUploadResult,
  TransferAbortIntent,
} from "@/types/fileTransfer";

import { createSha256Hasher, hashFilePrefix, type Sha256Hasher } from "./hash";
import {
  clearUploadResume,
  isAbortError,
  loadUploadResume,
  saveUploadResume,
} from "./resume";
import {
  type TransferSlotWaitInfo,
  type TransientRetryInfo,
  RetryableTransferError,
  TransferStalledError,
  ackPollDelayMs,
  isRetryableTransferError,
  isTransferAckWaitError,
  sleepAbortable,
  withTransferSessionRetry,
  withTransientRetry,
} from "./sessionLimit";

export interface RunFileUploadOptions {
  signal?: AbortSignal;
  abortIntent?: TransferAbortIntent;
  chunkSize?: number;
  conflictPolicy?: "skip" | "replace";
  onProgress?: (progress: FileTransferProgress) => void;
  onSession?: (sessionId: string) => void;
  knownSessionId?: string;
  onWaitingForSlot?: (info: TransferSlotWaitInfo) => void;
  onRetrying?: (info: TransientRetryInfo) => void;
}

async function releaseUploadSession(
  agentId: string,
  sessionId: string | null | undefined,
  reason: "user" | "error" = "error",
): Promise<void> {
  if (!sessionId) return;
  try {
    await cancelAgentFileUpload(agentId, sessionId, reason);
  } catch {
    // frees the server session slot for retry
  }
}

function isRelayOffsetMismatch(err: unknown): boolean {
  return (
    err instanceof AxiosError &&
    err.response?.status === 400 &&
    /does not match expected \d+/i.test(getAxiosErrorDetail(err) || "")
  );
}

const UPLOAD_TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

async function hashFileRange(
  file: File,
  start: number,
  end: number,
  blockSize: number,
  hasher: Sha256Hasher,
): Promise<void> {
  if (end > start) {
    hasher.updateBlob(file.slice(start, end), blockSize);
  }
}

async function waitForUploadPipelineSlot(
  agentId: string,
  sessionId: string,
  offset: number,
  options: {
    signal?: AbortSignal;
    onRetry?: (info: TransientRetryInfo) => void;
  } = {},
): Promise<FileTransferUploadChunkReadyResponse> {
  const { signal, onRetry } = options;
  const started = Date.now();
  let polls = 0;
  let stallNoticeSent = false;
  for (;;) {
    if (signal?.aborted) {
      throw new DOMException("Upload aborted", "AbortError");
    }
    const ready = await withTransientRetry(
      () => getUploadChunkReady(agentId, sessionId, signal),
      { signal, onRetry },
    );
    if (UPLOAD_TERMINAL_STATUSES.has(ready.status)) {
      if (ready.status !== "failed" && ready.accepted_offset > offset) {
        return ready;
      }
      throw new Error(
        ready.status === "failed"
          ? ready.error || "Upload failed"
          : `Upload session is ${ready.status}`,
      );
    }
    if (ready.accepted_offset > offset || ready.can_put) {
      return ready;
    }
    if (Date.now() - started >= FILE_TRANSFER_ACK_WAIT_MAX_MS) {
      throw new TransferStalledError();
    }
    if (
      !stallNoticeSent &&
      Date.now() - started >= FILE_TRANSFER_STALL_NOTICE_MS
    ) {
      stallNoticeSent = true;
      onRetry?.({ attempt: 0, delayMs: 0, error: null, waitingForAgent: true });
    }
    polls += 1;
    await sleepAbortable(ackPollDelayMs(polls), signal);
  }
}

async function waitForUploadCommitted(
  agentId: string,
  sessionId: string,
  totalSize: number,
  options: {
    signal?: AbortSignal;
    onRetry?: (info: TransientRetryInfo) => void;
  } = {},
): Promise<void> {
  const { signal, onRetry } = options;
  const started = Date.now();
  let polls = 0;
  for (;;) {
    const ready = await withTransientRetry(
      () => getUploadChunkReady(agentId, sessionId, signal),
      { signal, onRetry },
    );
    if (ready.status === "failed") {
      throw new Error(ready.error || "Upload failed");
    }
    if (
      ready.committed_offset >= totalSize ||
      UPLOAD_TERMINAL_STATUSES.has(ready.status)
    ) {
      return;
    }
    if (Date.now() - started >= FILE_TRANSFER_ACK_WAIT_MAX_MS) {
      throw new TransferStalledError();
    }
    polls += 1;
    await sleepAbortable(ackPollDelayMs(polls), signal);
  }
}

export async function runFileUploadTransfer(
  agentId: string,
  file: File,
  destinationPath: string,
  options: RunFileUploadOptions = {},
): Promise<FileTransferUploadResult> {
  const {
    signal,
    abortIntent,
    onProgress,
    onSession,
    knownSessionId,
    onWaitingForSlot,
    onRetrying,
  } = options;
  const totalSize = file.size;
  const saved = loadUploadResume(agentId, file, destinationPath);
  const resumeSessionId = knownSessionId || saved?.sessionId || null;

  let initData = null as Awaited<ReturnType<typeof initAgentFileUpload>> | null;
  let staleSessionId: string | null = null;

  if (resumeSessionId) {
    try {
      initData = await resumeAgentFileUpload(
        agentId,
        {
          session_id: resumeSessionId,
          filename: file.name,
          total_size: totalSize,
        },
        signal,
      );
    } catch (err) {
      // agent unreachable, keep the session so it can be resumed
      if (isAbortError(err) || isRetryableTransferError(err)) throw err;
      staleSessionId = resumeSessionId;
      clearUploadResume(agentId, file, destinationPath);
      initData = null;
    }
  }

  if (!initData) {
    if (staleSessionId) {
      await releaseUploadSession(agentId, staleSessionId, "user");
      staleSessionId = null;
    }
    initData = await withTransferSessionRetry(
      () =>
        initAgentFileUpload(
          agentId,
          {
            filename: file.name,
            destination_path: destinationPath,
            total_size: totalSize,
            chunk_size: options.chunkSize ?? FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
            conflict_policy: options.conflictPolicy ?? "replace",
          },
          signal,
        ),
      { signal, onWaitingForSlot },
    );
  }

  saveUploadResume(agentId, file, destinationPath, initData.session_id);

  const sessionId = initData.session_id;
  onSession?.(sessionId);
  const chunkSize = initData.chunk_size;
  let offset = initData.committed_offset || 0;

  let hasher: Sha256Hasher | null = null;
  try {
    hasher = createSha256Hasher();
    if (offset > 0) {
      await hashFilePrefix(file, offset, chunkSize, hasher);
      onProgress?.({
        acceptedOffset: offset,
        committedOffset: offset,
        totalSize,
      });
    }

    let pipelineHasRoom = false;
    while (offset < totalSize) {
      if (signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }

      if (!pipelineHasRoom) {
        const ready = await waitForUploadPipelineSlot(
          agentId,
          sessionId,
          offset,
          {
            signal,
            onRetry: onRetrying,
          },
        );
        if (ready.accepted_offset > offset) {
          const skipTo = Math.min(ready.accepted_offset, totalSize);
          await hashFileRange(file, offset, skipTo, chunkSize, hasher);
          offset = skipTo;
          onProgress?.({
            acceptedOffset: ready.accepted_offset,
            committedOffset: ready.committed_offset,
            totalSize,
          });
          continue;
        }
      }
      pipelineHasRoom = false;

      const blob = file.slice(offset, offset + chunkSize);
      const end = offset + blob.size - 1;
      hasher.updateBlob(blob);

      let chunkRes: FileTransferUploadChunkResponse | null = null;
      let putAttempts = 0;
      while (chunkRes === null) {
        putAttempts += 1;
        if (putAttempts > FILE_TRANSFER_TRANSIENT_RETRY_HARD_CAP) {
          throw new RetryableTransferError(
            "Timed out waiting for agent to commit previous chunk",
          );
        }
        try {
          chunkRes = await withTransientRetry(
            () =>
              uploadAgentFileChunk(
                agentId,
                sessionId,
                blob,
                `bytes ${offset}-${end}/${totalSize}`,
                signal,
              ),
            {
              signal,
              onRetry: onRetrying,
              isRetryable: (err) =>
                isRetryableTransferError(err) && !isTransferAckWaitError(err),
            },
          );
        } catch (err) {
          if (isRelayOffsetMismatch(err)) {
            // e.g. redis restarted, resuming re-syncs the offset
            throw new TransferStalledError(
              "The server lost track of this upload",
            );
          }
          if (!isTransferAckWaitError(err)) {
            throw err;
          }
          const again = await waitForUploadPipelineSlot(
            agentId,
            sessionId,
            offset,
            { signal, onRetry: onRetrying },
          );
          if (again.accepted_offset > offset) {
            chunkRes = {
              session_id: sessionId,
              status: again.status,
              accepted_offset: again.accepted_offset,
              committed_offset: again.committed_offset,
              chunk_start: offset,
              chunk_end: end,
              chunk_bytes: blob.size,
            };
          }
        }
      }

      offset = chunkRes.accepted_offset;
      pipelineHasRoom = chunkRes.can_put === true;
      onProgress?.({
        acceptedOffset: chunkRes.accepted_offset,
        committedOffset: chunkRes.committed_offset,
        totalSize,
      });
    }

    const fileSha256 = await hasher.hex();
    await waitForUploadCommitted(agentId, sessionId, totalSize, {
      signal,
      onRetry: onRetrying,
    });
    const completeData = await withTransientRetry(
      () => completeAgentFileUpload(agentId, sessionId, fileSha256, signal),
      {
        signal,
        onRetry: onRetrying,
        finalizeWaitMs: FILE_TRANSFER_FINALIZE_WAIT_MAX_MS,
      },
    );

    const agentSha = (completeData.sha256 || "").toLowerCase();
    const integrityOk = !agentSha || agentSha === fileSha256;

    clearUploadResume(agentId, file, destinationPath);

    return {
      destinationPath: completeData.destination_path,
      sha256: fileSha256,
      integrityOk,
    };
  } catch (err) {
    hasher?.dispose();
    if (isAbortError(err)) {
      if (abortIntent?.mode === "cancel") {
        await releaseUploadSession(agentId, sessionId, "user");
        clearUploadResume(agentId, file, destinationPath);
      }
    } else if (!isRetryableTransferError(err)) {
      await releaseUploadSession(agentId, sessionId, "error");
      clearUploadResume(agentId, file, destinationPath);
    }
    throw err;
  }
}

export { isAbortError };
