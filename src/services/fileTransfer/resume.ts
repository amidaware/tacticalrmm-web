import axios from "axios";

import {
  FILE_TRANSFER_DOWNLOAD_BYTES_STORE,
  FILE_TRANSFER_DOWNLOAD_IDB_NAME,
  FILE_TRANSFER_DOWNLOAD_IDB_STORE,
  FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY,
  FILE_TRANSFER_IDB_VERSION,
  FILE_TRANSFER_RESUME_MAX_AGE_MS,
  FILE_TRANSFER_UI_META_IDB_STORE,
  FILE_TRANSFER_UPLOAD_RESUME_LS_KEY,
} from "@/constants/fileTransfer";

export interface UploadResumeEntry {
  sessionId: string;
  destinationPath: string;
  ts: number;
}

export interface DownloadResumeEntry {
  sessionId: string;
  chunkSize: number;
  totalSize: number;
  ts: number;
}

function lsGet<T extends Record<string, unknown>>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as T;
  } catch {
    return {} as T;
  }
}

function lsSet(key: string, value: Record<string, unknown>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function pruneAgedResumeEntries<T extends { ts?: number }>(
  map: Record<string, T>,
  now = Date.now(),
  maxAgeMs = FILE_TRANSFER_RESUME_MAX_AGE_MS,
): { next: Record<string, T>; removed: number } {
  const next: Record<string, T> = {};
  let removed = 0;
  for (const [key, entry] of Object.entries(map)) {
    const ts = entry?.ts;
    if (typeof ts !== "number" || !Number.isFinite(ts) || now - ts > maxAgeMs) {
      removed += 1;
      continue;
    }
    next[key] = entry;
  }
  return { next, removed };
}

function lsGetResumeMap<T extends { ts?: number }>(
  key: string,
): Record<string, T> {
  const raw = lsGet<Record<string, T>>(key);
  const { next, removed } = pruneAgedResumeEntries(raw);
  if (removed > 0) {
    lsSet(key, next);
  }
  return next;
}

export function uploadResumeKey(
  agentId: string,
  file: File,
  destinationPath: string,
): string {
  return `${agentId}:${destinationPath}:${file.name}:${file.size}:${file.lastModified}`;
}

export function downloadResumeKey(agentId: string, sourcePath: string): string {
  return `${agentId}:${sourcePath}`;
}

export function archiveDownloadResumeKey(
  agentId: string,
  paths: string[],
): string {
  return `${agentId}:archive:${paths.slice().sort().join("\u0000")}`;
}

export function downloadHandleIdbKey(
  agentId: string,
  sourcePath: string,
): string {
  return `dl:${downloadResumeKey(agentId, sourcePath)}`;
}

export function archiveDownloadHandleIdbKey(
  agentId: string,
  paths: string[],
): string {
  return `dl:${archiveDownloadResumeKey(agentId, paths)}`;
}

export function downloadSessionHandleIdbKey(sessionId: string): string {
  return `dl:session:${sessionId}`;
}

export function downloadBytesPathKey(
  agentId: string,
  resumeScopeKey: string,
): string {
  return `bytes:${agentId}:${resumeScopeKey}`;
}

export function downloadBytesSessionKey(sessionId: string): string {
  return `bytes:session:${sessionId}`;
}

export function canPickDownloadSaveFile(): boolean {
  return "showSaveFilePicker" in window;
}

export function canPickExistingDownloadFile(): boolean {
  return "showOpenFilePicker" in window;
}

export async function pickDownloadSaveHandle(
  suggestedName: string,
): Promise<FileSystemFileHandle> {
  return window.showSaveFilePicker({
    suggestedName,
    startIn: "downloads",
  });
}

export async function pickExistingDownloadHandle(): Promise<FileSystemFileHandle> {
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    startIn: "downloads",
  });
  if (!(await requestFileHandlePermission(handle))) {
    throw new Error("Write access to that file was denied.");
  }
  return handle;
}

export async function removeFileSystemFileHandle(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  const remover = (
    handle as FileSystemFileHandle & { remove?: () => Promise<void> }
  ).remove;
  if (typeof remover !== "function") {
    return false;
  }
  try {
    await remover.call(handle);
    return true;
  } catch {
    return false;
  }
}

export async function abortWritableAndMaybeRemoveFile(opts: {
  writable: FileSystemWritableFileStream | null | undefined;
  handle: FileSystemFileHandle | null | undefined;
  discardFile: boolean;
}): Promise<void> {
  const { writable, handle, discardFile } = opts;
  if (writable) {
    try {
      if (discardFile && typeof writable.abort === "function") {
        await writable.abort();
      } else {
        await writable.close();
      }
    } catch {
      try {
        await writable.close();
      } catch {
        // Already closed.
      }
    }
  }
  if (discardFile && handle) {
    await removeFileSystemFileHandle(handle);
  }
}

export async function persistDownloadFileHandle(
  keys: Array<string | null | undefined>,
  handle: FileSystemFileHandle,
): Promise<void> {
  const unique = [...new Set(keys.filter((key): key is string => !!key))];
  for (const key of unique) {
    await idbPutFileHandle(key, handle);
  }
}

export function loadUploadResume(
  agentId: string,
  file: File,
  destinationPath: string,
): UploadResumeEntry | null {
  const entry = lsGetResumeMap<UploadResumeEntry>(
    FILE_TRANSFER_UPLOAD_RESUME_LS_KEY,
  )[uploadResumeKey(agentId, file, destinationPath)];
  return entry ?? null;
}

export function saveUploadResume(
  agentId: string,
  file: File,
  destinationPath: string,
  sessionId: string,
): void {
  const map = lsGetResumeMap<UploadResumeEntry>(
    FILE_TRANSFER_UPLOAD_RESUME_LS_KEY,
  );
  map[uploadResumeKey(agentId, file, destinationPath)] = {
    sessionId,
    destinationPath,
    ts: Date.now(),
  };
  lsSet(FILE_TRANSFER_UPLOAD_RESUME_LS_KEY, map);
}

export function clearUploadResume(
  agentId: string,
  file: File,
  destinationPath: string,
): void {
  const map = lsGetResumeMap<UploadResumeEntry>(
    FILE_TRANSFER_UPLOAD_RESUME_LS_KEY,
  );
  delete map[uploadResumeKey(agentId, file, destinationPath)];
  lsSet(FILE_TRANSFER_UPLOAD_RESUME_LS_KEY, map);
}

export function loadDownloadResume(
  agentId: string,
  sourcePath: string,
): DownloadResumeEntry | null {
  const entry = lsGetResumeMap<DownloadResumeEntry>(
    FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY,
  )[downloadResumeKey(agentId, sourcePath)];
  return entry ?? null;
}

export function saveDownloadResume(
  agentId: string,
  sourcePath: string,
  data: Omit<DownloadResumeEntry, "ts">,
): void {
  const map = lsGetResumeMap<DownloadResumeEntry>(
    FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY,
  );
  map[downloadResumeKey(agentId, sourcePath)] = { ...data, ts: Date.now() };
  lsSet(FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY, map);
}

export function clearDownloadResume(agentId: string, sourcePath: string): void {
  const map = lsGetResumeMap<DownloadResumeEntry>(
    FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY,
  );
  delete map[downloadResumeKey(agentId, sourcePath)];
  lsSet(FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY, map);
}

export function clearUploadResumeBySessionId(sessionId: string): void {
  const map = lsGetResumeMap<UploadResumeEntry>(
    FILE_TRANSFER_UPLOAD_RESUME_LS_KEY,
  );
  let changed = false;
  for (const [key, entry] of Object.entries(map)) {
    if (entry?.sessionId === sessionId) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) lsSet(FILE_TRANSFER_UPLOAD_RESUME_LS_KEY, map);
}

export function clearDownloadResumeBySessionId(sessionId: string): void {
  const map = lsGetResumeMap<DownloadResumeEntry>(
    FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY,
  );
  let changed = false;
  for (const [key, entry] of Object.entries(map)) {
    if (entry?.sessionId === sessionId) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) lsSet(FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY, map);
}

export function findDownloadResumeScopeKeyBySessionId(
  agentId: string,
  sessionId: string,
): string | null {
  const map = lsGetResumeMap<DownloadResumeEntry>(
    FILE_TRANSFER_DOWNLOAD_RESUME_LS_KEY,
  );
  const prefix = `${agentId}:`;
  for (const [key, entry] of Object.entries(map)) {
    if (entry?.sessionId === sessionId && key.startsWith(prefix)) {
      return key.slice(prefix.length);
    }
  }
  return null;
}

let fileTransferIdb: IDBDatabase | null = null;
let fileTransferIdbOpening: Promise<IDBDatabase> | null = null;
let fileTransferIdbPagehideBound = false;

function ensureFileTransferStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(FILE_TRANSFER_DOWNLOAD_IDB_STORE)) {
    db.createObjectStore(FILE_TRANSFER_DOWNLOAD_IDB_STORE);
  }
  if (!db.objectStoreNames.contains(FILE_TRANSFER_UI_META_IDB_STORE)) {
    db.createObjectStore(FILE_TRANSFER_UI_META_IDB_STORE);
  }
  if (!db.objectStoreNames.contains(FILE_TRANSFER_DOWNLOAD_BYTES_STORE)) {
    db.createObjectStore(FILE_TRANSFER_DOWNLOAD_BYTES_STORE);
  }
}

function bindFileTransferIdbPagehide(): void {
  if (fileTransferIdbPagehideBound || typeof window === "undefined") {
    return;
  }
  fileTransferIdbPagehideBound = true;
  window.addEventListener("pagehide", () => {
    closeFileTransferIdb();
  });
}

function attachFileTransferIdbLifecycle(db: IDBDatabase): void {
  db.onversionchange = () => {
    closeFileTransferIdb();
  };
  db.onclose = () => {
    if (fileTransferIdb === db) {
      fileTransferIdb = null;
    }
  };
}

export function closeFileTransferIdb(): void {
  const db = fileTransferIdb;
  fileTransferIdb = null;
  fileTransferIdbOpening = null;
  if (!db) {
    return;
  }
  try {
    db.close();
  } catch {
    // already closed.
  }
}

function openTransferIdb(): Promise<IDBDatabase> {
  if (fileTransferIdb) {
    return Promise.resolve(fileTransferIdb);
  }
  if (fileTransferIdbOpening) {
    return fileTransferIdbOpening;
  }

  bindFileTransferIdbPagehide();
  fileTransferIdbOpening = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      FILE_TRANSFER_DOWNLOAD_IDB_NAME,
      FILE_TRANSFER_IDB_VERSION,
    );
    request.onupgradeneeded = () => {
      ensureFileTransferStores(request.result);
    };
    request.onsuccess = () => {
      const db = request.result;
      attachFileTransferIdbLifecycle(db);
      fileTransferIdb = db;
      fileTransferIdbOpening = null;
      resolve(db);
    };
    request.onerror = () => {
      fileTransferIdbOpening = null;
      reject(request.error);
    };
  });
  return fileTransferIdbOpening;
}

export function openFileTransferIdb(): Promise<IDBDatabase> {
  return openTransferIdb();
}

export async function idbPutFileHandle(
  key: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  const db = await openTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_DOWNLOAD_IDB_STORE, "readwrite");
    tx.objectStore(FILE_TRANSFER_DOWNLOAD_IDB_STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetFileHandle(
  key: string,
): Promise<FileSystemFileHandle | undefined> {
  const db = await openTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_DOWNLOAD_IDB_STORE, "readonly");
    const request = tx.objectStore(FILE_TRANSFER_DOWNLOAD_IDB_STORE).get(key);
    request.onsuccess = () =>
      resolve(request.result as FileSystemFileHandle | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function idbDeleteFileHandle(key: string): Promise<void> {
  const db = await openTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_DOWNLOAD_IDB_STORE, "readwrite");
    tx.objectStore(FILE_TRANSFER_DOWNLOAD_IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface DownloadBytesRecord {
  buffers: ArrayBuffer[];
  committedOffset: number;
  chunkSize: number;
  chunksId?: string;
}

interface DownloadBytesMeta {
  committedOffset: number;
  chunkSize: number;
  chunksId?: string;
  chunkCount?: number;
  buffers?: ArrayBuffer[];
}

function downloadChunkRange(
  chunksId: string,
  fromIndex = 0,
  toIndex = Infinity,
): IDBKeyRange {
  return IDBKeyRange.bound(
    ["chunk", chunksId, fromIndex],
    ["chunk", chunksId, toIndex],
  );
}

export function newDownloadChunksId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function idbWriteDownloadBytes(
  keys: string[],
  record: DownloadBytesRecord & { chunksId: string },
  fromIndex: number,
): Promise<void> {
  const db = await openTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_DOWNLOAD_BYTES_STORE, "readwrite");
    const store = tx.objectStore(FILE_TRANSFER_DOWNLOAD_BYTES_STORE);
    const { buffers, chunksId } = record;
    store.delete(downloadChunkRange(chunksId, buffers.length));
    for (let i = Math.max(0, fromIndex); i < buffers.length; i++) {
      store.put(buffers[i], ["chunk", chunksId, i]);
    }
    const meta: DownloadBytesMeta = {
      committedOffset: record.committedOffset,
      chunkSize: record.chunkSize,
      chunksId,
      chunkCount: buffers.length,
    };
    for (const key of keys) {
      store.put(meta, key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function idbGetDownloadBytes(
  key: string,
  options: { withBuffers?: boolean } = {},
): Promise<DownloadBytesRecord | undefined> {
  const withBuffers = options.withBuffers ?? true;
  const db = await openTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_DOWNLOAD_BYTES_STORE, "readonly");
    const store = tx.objectStore(FILE_TRANSFER_DOWNLOAD_BYTES_STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const meta = request.result as DownloadBytesMeta | undefined;
      if (!meta) {
        resolve(undefined);
        return;
      }
      const base = {
        committedOffset: meta.committedOffset,
        chunkSize: meta.chunkSize,
        chunksId: meta.chunksId,
      };
      if (!meta.chunksId || !withBuffers) {
        resolve({ ...base, buffers: withBuffers ? meta.buffers || [] : [] });
        return;
      }
      const count = meta.chunkCount ?? 0;
      if (count < 1) {
        resolve({ ...base, buffers: [] });
        return;
      }
      const chunks = store.getAll(
        downloadChunkRange(meta.chunksId, 0, count - 1),
      );
      chunks.onsuccess = () =>
        resolve({ ...base, buffers: chunks.result as ArrayBuffer[] });
      chunks.onerror = () => reject(chunks.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbDeleteDownloadBytes(key: string): Promise<void> {
  const db = await openTransferIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_TRANSFER_DOWNLOAD_BYTES_STORE, "readwrite");
    const store = tx.objectStore(FILE_TRANSFER_DOWNLOAD_BYTES_STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const meta = request.result as DownloadBytesMeta | undefined;
      if (meta?.chunksId) {
        store.delete(downloadChunkRange(meta.chunksId));
      }
      store.delete(key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queryFileHandlePermission(
  handle: FileSystemFileHandle,
): Promise<PermissionState> {
  try {
    return await handle.queryPermission({ mode: "readwrite" });
  } catch {
    return "prompt";
  }
}

export async function requestFileHandlePermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  try {
    if ((await queryFileHandlePermission(handle)) === "granted") return true;
    return (
      (await handle.requestPermission({ mode: "readwrite" })) === "granted"
    );
  } catch {
    return false;
  }
}

export async function ensureFileHandlePermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  return requestFileHandlePermission(handle);
}

export function alignResumeOffset(
  partialSize: number,
  chunkSize: number,
): number {
  return Math.floor(partialSize / chunkSize) * chunkSize;
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (typeof err !== "object" || err === null) return false;

  const e = err as {
    code?: string;
    name?: string;
    message?: string;
  };

  if (e.code === "ERR_CANCELED") return true;
  if (e.name === "CanceledError" || e.name === "AbortError") return true;
  if (typeof axios.isCancel === "function" && axios.isCancel(err)) return true;
  if (
    /^(canceled|cancelled|download aborted|upload aborted|transfer aborted)$/i.test(
      (e.message ?? "").trim(),
    )
  ) {
    return true;
  }
  return false;
}
