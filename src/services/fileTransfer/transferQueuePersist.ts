import {
  FILE_TRANSFER_LOCAL_PAUSED_LS_KEY,
  FILE_TRANSFER_UI_META_IDB_STORE,
} from "@/constants/fileTransfer";
import type {
  DownloadQueueItem,
  TransferRecoveryHint,
  UploadFileIdentity,
  UploadQueueItem,
} from "@/types/filebrowser";
import type { ResumableFileTransfer } from "@/types/fileTransfer";
import { bytes2Human } from "@/utils/format";

import {
  archiveDownloadHandleIdbKey,
  archiveDownloadResumeKey,
  canPickExistingDownloadFile,
  downloadHandleIdbKey,
  downloadSessionHandleIdbKey,
  downloadBytesPathKey,
  downloadBytesSessionKey,
  findDownloadResumeScopeKeyBySessionId,
  idbDeleteFileHandle,
  idbGetDownloadBytes,
  idbGetFileHandle,
  openFileTransferIdb,
  queryFileHandlePermission,
  requestFileHandlePermission,
} from "./resume";

export interface TransferUiMeta {
  sessionId: string;
  agentId: string;
  operation: "upload" | "download";
  hidden?: boolean;
  filename: string;
  destinationPath: string;
  totalSize: number;
  committedOffset?: number;
  chunkSize?: number;
  conflictPolicy?: "skip" | "replace";
  isArchive?: boolean;
  kind?: "file" | "archive";
  archivePaths?: string[];
  resumeScopeKey?: string;
  handleKey?: string;
  uploadIdentity?: UploadFileIdentity;
  expiresAt?: string;
  updatedAt: number;
  localQueueId?: string;
}

export interface LocalPausedQueueEntry {
  id: string;
  agentId: string;
  operation: "upload" | "download";
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  destinationPath?: string;
  sourcePath?: string;
  kind?: "file" | "archive";
  archivePaths?: string[];
  conflictPolicy?: "skip" | "replace";
  hidden?: boolean;
  uploadIdentity?: UploadFileIdentity;
  updatedAt: number;
}

function uiMetaKey(agentId: string, sessionId: string): string {
  return `${agentId}:${sessionId}`;
}

export async function putTransferUiMeta(meta: TransferUiMeta): Promise<void> {
  const db = await openFileTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_UI_META_IDB_STORE, "readwrite");
    tx.objectStore(FILE_TRANSFER_UI_META_IDB_STORE).put(
      meta,
      uiMetaKey(meta.agentId, meta.sessionId),
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTransferUiMeta(
  agentId: string,
  sessionId: string,
): Promise<void> {
  const db = await openFileTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_UI_META_IDB_STORE, "readwrite");
    tx.objectStore(FILE_TRANSFER_UI_META_IDB_STORE).delete(
      uiMetaKey(agentId, sessionId),
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listTransferUiMetaForAgent(
  agentId: string,
): Promise<TransferUiMeta[]> {
  const db = await openFileTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_UI_META_IDB_STORE, "readonly");
    const req = tx.objectStore(FILE_TRANSFER_UI_META_IDB_STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as TransferUiMeta[]) || [];
      resolve(all.filter((m) => m && m.agentId === agentId));
    };
    req.onerror = () => reject(req.error);
  });
}

function lsGetLocalPaused(): Record<string, LocalPausedQueueEntry> {
  try {
    return JSON.parse(
      localStorage.getItem(FILE_TRANSFER_LOCAL_PAUSED_LS_KEY) || "{}",
    ) as Record<string, LocalPausedQueueEntry>;
  } catch {
    return {};
  }
}

function lsSetLocalPaused(map: Record<string, LocalPausedQueueEntry>): void {
  localStorage.setItem(FILE_TRANSFER_LOCAL_PAUSED_LS_KEY, JSON.stringify(map));
}

export function saveLocalPausedEntry(entry: LocalPausedQueueEntry): void {
  const map = lsGetLocalPaused();
  map[`${entry.agentId}:${entry.id}`] = { ...entry, updatedAt: Date.now() };
  lsSetLocalPaused(map);
}

export function deleteLocalPausedEntry(agentId: string, id: string): void {
  const map = lsGetLocalPaused();
  delete map[`${agentId}:${id}`];
  lsSetLocalPaused(map);
}

export function listLocalPausedEntries(
  agentId: string,
): LocalPausedQueueEntry[] {
  return Object.values(lsGetLocalPaused()).filter((e) => e.agentId === agentId);
}

export function formatResumeWindowCaption(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return "Resume window expired";
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem
      ? `Resume available for ${hours}h ${rem}m`
      : `Resume available for ${hours}h`;
  }
  return `Resume available for ${mins} minute${mins === 1 ? "" : "s"}`;
}

export function matchesUploadFileIdentity(
  file: File,
  identity: UploadFileIdentity,
): boolean {
  return (
    file.name === identity.name &&
    file.size === identity.size &&
    file.lastModified === identity.lastModified
  );
}

export async function persistUploadQueueMeta(
  agentId: string,
  item: UploadQueueItem,
): Promise<void> {
  if (!item.sessionId) {
    if (item.status === "paused") {
      saveLocalPausedEntry({
        id: item.id,
        agentId,
        operation: "upload",
        name: item.name,
        sizeBytes: item.sizeBytes,
        sizeLabel: item.sizeLabel,
        destinationPath: item.destinationPath,
        conflictPolicy: item.conflictPolicy,
        hidden: item.hidden,
        uploadIdentity: item.file
          ? {
              name: item.file.name,
              size: item.file.size,
              lastModified: item.file.lastModified,
            }
          : item.uploadFileIdentity,
        updatedAt: Date.now(),
      });
    }
    return;
  }

  const identity: UploadFileIdentity | undefined = item.file
    ? {
        name: item.file.name,
        size: item.file.size,
        lastModified: item.file.lastModified,
      }
    : item.uploadFileIdentity;

  await putTransferUiMeta({
    sessionId: item.sessionId,
    agentId,
    operation: "upload",
    hidden: item.hidden,
    filename: item.name,
    destinationPath: item.destinationPath,
    totalSize: item.sizeBytes,
    committedOffset: item.committedOffset,
    conflictPolicy: item.conflictPolicy,
    uploadIdentity: identity,
    expiresAt: item.expiresAt,
    updatedAt: Date.now(),
    localQueueId: item.id,
  });
  deleteLocalPausedEntry(agentId, item.id);
}

export async function persistDownloadQueueMeta(
  agentId: string,
  item: DownloadQueueItem,
): Promise<void> {
  if (!item.sessionId) {
    if (item.status === "paused") {
      saveLocalPausedEntry({
        id: item.id,
        agentId,
        operation: "download",
        name: item.name,
        sizeBytes: item.totalSize ?? 0,
        sizeLabel: "",
        sourcePath: item.sourcePath,
        kind: item.kind,
        archivePaths: item.archivePaths,
        hidden: item.hidden,
        updatedAt: Date.now(),
      });
    }
    return;
  }

  const isArchive = item.kind === "archive" && !!item.archivePaths?.length;
  // Match download.ts: file scope is source path; archive scope already includes agentId.
  const resumeScopeKey = isArchive
    ? archiveDownloadResumeKey(agentId, item.archivePaths!)
    : item.sourcePath;
  const handleKey = isArchive
    ? archiveDownloadHandleIdbKey(agentId, item.archivePaths!)
    : downloadHandleIdbKey(agentId, item.sourcePath);

  await putTransferUiMeta({
    sessionId: item.sessionId,
    agentId,
    operation: "download",
    hidden: item.hidden,
    filename: item.name,
    destinationPath: item.sourcePath,
    totalSize: item.totalSize ?? 0,
    committedOffset: item.committedOffset,
    chunkSize: item.chunkSize,
    isArchive,
    kind: item.kind ?? (isArchive ? "archive" : "file"),
    archivePaths: item.archivePaths,
    resumeScopeKey,
    handleKey,
    expiresAt: item.expiresAt,
    updatedAt: Date.now(),
    localQueueId: item.id,
  });
  deleteLocalPausedEntry(agentId, item.id);
}

export async function clearTransferPersistence(
  agentId: string,
  sessionId: string | undefined,
  opts?: { handleKey?: string; localQueueId?: string },
): Promise<void> {
  if (sessionId) {
    await deleteTransferUiMeta(agentId, sessionId).catch(() => {});
  }
  if (opts?.handleKey) {
    await idbDeleteFileHandle(opts.handleKey).catch(() => {});
  }
  if (opts?.localQueueId) {
    deleteLocalPausedEntry(agentId, opts.localQueueId);
  }
}

async function classifyDownloadRecovery(
  agentId: string,
  transfer: ResumableFileTransfer,
  meta: TransferUiMeta | undefined,
): Promise<TransferRecoveryHint> {
  try {
    if (transfer.is_archive && transfer.status === "waiting_for_agent") {
      return "archive_preparing";
    }

    const scopeFromMeta = meta?.resumeScopeKey;
    const scopeFromLs = findDownloadResumeScopeKeyBySessionId(
      agentId,
      transfer.session_id,
    );
    const resumeScopeKey =
      scopeFromMeta ||
      scopeFromLs ||
      (transfer.is_archive ? null : transfer.destination_path);

    if (!resumeScopeKey) {
      return "needs_destination";
    }

    const handleKeys = [
      meta?.handleKey,
      downloadSessionHandleIdbKey(transfer.session_id),
      meta?.archivePaths?.length
        ? archiveDownloadHandleIdbKey(agentId, meta.archivePaths)
        : null,
      !transfer.is_archive
        ? downloadHandleIdbKey(agentId, resumeScopeKey)
        : null,
    ];
    let handle: FileSystemFileHandle | undefined;
    for (const key of handleKeys) {
      if (!key) continue;
      handle = await idbGetFileHandle(key);
      if (handle) break;
    }

    const bytes =
      (await idbGetDownloadBytes(downloadBytesSessionKey(transfer.session_id), {
        withBuffers: false,
      })) ||
      (resumeScopeKey
        ? await idbGetDownloadBytes(
            downloadBytesPathKey(agentId, resumeScopeKey),
            { withBuffers: false },
          )
        : undefined);
    if (bytes && bytes.committedOffset > 0) {
      return "ready";
    }

    if (!handle) {
      if (canPickExistingDownloadFile()) {
        return "needs_destination";
      }
      return "ready";
    }
    const state = await queryFileHandlePermission(handle);
    if (state === "granted") return "ready";
    return "needs_permission";
  } catch {
    return "needs_destination";
  }
}

function downloadHandleKeyForQueueItem(
  agentId: string,
  item: {
    sourcePath: string;
    kind?: "file" | "archive";
    archivePaths?: string[];
  },
): string | null {
  if (item.kind === "archive" && item.archivePaths?.length) {
    return archiveDownloadHandleIdbKey(agentId, item.archivePaths);
  }
  if (item.sourcePath) {
    return downloadHandleIdbKey(agentId, item.sourcePath);
  }
  return null;
}

type StoredDownloadHandleItem = {
  sourcePath: string;
  kind?: "file" | "archive";
  archivePaths?: string[];
  handleKey?: string;
  sessionId?: string;
};

async function storedDownloadHandles(
  agentId: string,
  item: StoredDownloadHandleItem,
): Promise<FileSystemFileHandle[]> {
  const keys = [
    item.handleKey,
    item.sessionId ? downloadSessionHandleIdbKey(item.sessionId) : null,
    downloadHandleKeyForQueueItem(agentId, item),
  ];
  const seen = new Set<string>();
  const handles: FileSystemFileHandle[] = [];
  for (const key of keys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const handle = await idbGetFileHandle(key);
    if (handle) handles.push(handle);
  }
  return handles;
}

export async function requestStoredDownloadHandle(
  agentId: string,
  item: StoredDownloadHandleItem,
): Promise<FileSystemFileHandle | null> {
  for (const handle of await storedDownloadHandles(agentId, item)) {
    if (await requestFileHandlePermission(handle)) return handle;
  }
  return null;
}

export async function hasStoredDownloadHandle(
  agentId: string,
  item: StoredDownloadHandleItem,
): Promise<boolean> {
  try {
    return (await storedDownloadHandles(agentId, item)).length > 0;
  } catch {
    return false;
  }
}

function downloadRecoveryErrorMessage(
  recoveryHint: TransferRecoveryHint,
): string | undefined {
  if (recoveryHint === "non_resumable") {
    return "This download cannot be resumed here. Cancel to free the session.";
  }
  if (recoveryHint === "needs_destination") {
    return "Select the existing download file to resume.";
  }
  if (recoveryHint === "needs_permission") {
    return "Click Resume and allow file access to continue.";
  }
  if (recoveryHint === "archive_preparing") {
    return "Archive was still preparing. Resume to continue.";
  }
  return undefined;
}

export interface ReconcileResult {
  uploads: UploadQueueItem[];
  downloads: DownloadQueueItem[];
}

export async function reconcileResumableTransfers(
  agentId: string,
  transfers: ResumableFileTransfer[],
): Promise<ReconcileResult> {
  const localMeta = await listTransferUiMetaForAgent(agentId);
  const metaBySession = new Map(localMeta.map((m) => [m.sessionId, m]));
  const liveSessionIds = new Set(transfers.map((t) => t.session_id));

  for (const meta of localMeta) {
    if (!liveSessionIds.has(meta.sessionId)) {
      await deleteTransferUiMeta(agentId, meta.sessionId).catch(() => {});
    }
  }

  const uploads: UploadQueueItem[] = [];
  const downloads: DownloadQueueItem[] = [];

  for (const transfer of transfers) {
    const meta = metaBySession.get(transfer.session_id);
    const progress =
      transfer.total_size > 0
        ? transfer.committed_offset / transfer.total_size
        : 0;
    const queueId = meta?.localQueueId || `restored-${transfer.session_id}`;

    try {
      if (transfer.operation === "upload") {
        const identity = meta?.uploadIdentity;
        uploads.push({
          id: queueId,
          name: transfer.filename,
          sizeLabel: bytes2Human(transfer.total_size),
          sizeBytes: transfer.total_size,
          destinationPath: transfer.destination_path,
          status: "paused",
          progress,
          conflictPolicy: transfer.conflict_policy ?? "replace",
          committedOffset: transfer.committed_offset,
          sessionId: transfer.session_id,
          hidden: !!meta?.hidden,
          expiresAt: transfer.expires_at,
          recoveryHint: "needs_file",
          uploadFileIdentity: identity,
        });
        continue;
      }

      const recoveryHint = await classifyDownloadRecovery(
        agentId,
        transfer,
        meta,
      );
      const isArchive = !!transfer.is_archive;
      const sourcePath =
        meta?.destinationPath ||
        findDownloadResumeScopeKeyBySessionId(agentId, transfer.session_id) ||
        transfer.destination_path;

      downloads.push({
        id: queueId,
        name: transfer.filename,
        sourcePath,
        kind: isArchive ? "archive" : "file",
        archivePaths: meta?.archivePaths,
        status: "paused",
        progress,
        sessionId: transfer.session_id,
        handleKey: meta?.handleKey,
        hidden: !!meta?.hidden,
        expiresAt: transfer.expires_at,
        recoveryHint,
        committedOffset: transfer.committed_offset,
        totalSize: transfer.total_size,
        chunkSize: transfer.chunk_size,
        errorMessage: downloadRecoveryErrorMessage(recoveryHint),
      });
    } catch {
      if (transfer.operation === "upload") {
        uploads.push({
          id: queueId,
          name: transfer.filename,
          sizeLabel: bytes2Human(transfer.total_size),
          sizeBytes: transfer.total_size,
          destinationPath: transfer.destination_path,
          status: "paused",
          progress,
          sessionId: transfer.session_id,
          hidden: !!meta?.hidden,
          expiresAt: transfer.expires_at,
          recoveryHint: "needs_file",
        });
      } else {
        downloads.push({
          id: queueId,
          name: transfer.filename,
          sourcePath: transfer.destination_path,
          kind: transfer.is_archive ? "archive" : "file",
          status: "paused",
          progress,
          sessionId: transfer.session_id,
          hidden: !!meta?.hidden,
          expiresAt: transfer.expires_at,
          recoveryHint: "needs_destination",
          committedOffset: transfer.committed_offset,
          totalSize: transfer.total_size,
          chunkSize: transfer.chunk_size,
          errorMessage: downloadRecoveryErrorMessage("needs_destination"),
        });
      }
    }
  }

  for (const entry of listLocalPausedEntries(agentId)) {
    if (entry.operation === "upload") {
      if (uploads.some((u) => u.id === entry.id)) continue;
      uploads.push({
        id: entry.id,
        name: entry.name,
        sizeLabel: entry.sizeLabel || bytes2Human(entry.sizeBytes),
        sizeBytes: entry.sizeBytes,
        destinationPath: entry.destinationPath || "",
        status: "paused",
        progress: 0,
        conflictPolicy: entry.conflictPolicy,
        hidden: !!entry.hidden,
        recoveryHint: "needs_file",
        uploadFileIdentity: entry.uploadIdentity,
      });
    } else {
      if (downloads.some((d) => d.id === entry.id)) continue;
      downloads.push({
        id: entry.id,
        name: entry.name,
        sourcePath: entry.sourcePath || "",
        kind: entry.kind,
        archivePaths: entry.archivePaths,
        status: "paused",
        progress: 0,
        hidden: !!entry.hidden,
        recoveryHint: "ready",
        totalSize: entry.sizeBytes || undefined,
      });
    }
  }

  return { uploads, downloads };
}
