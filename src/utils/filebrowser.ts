import type {
  DownloadQueueStatus,
  DownloadSelectionMode,
  FileBrowserApiItem,
  FileBrowserItem,
  UploadQueueStatus,
} from "@/types/filebrowser";
import {
  FILE_BROWSER_INVALID_NAME_CHARS,
  FILE_BROWSER_MAX_NAME_LENGTH,
  MAX_SEQUENTIAL_DOWNLOAD_FILES,
} from "@/constants/filebrowser";
import {
  TRANSFER_RATE_LIMIT_MESSAGE,
  TRANSFER_RECONNECTING_LABEL,
  TRANSFER_RECONNECTING_MESSAGE,
  TRANSFER_WAITING_FOR_AGENT_LABEL,
  TRANSFER_WAITING_FOR_AGENT_MESSAGE,
  TRANSFER_SLOT_WAIT_LABEL,
  TRANSFER_SLOT_WAIT_MESSAGE,
} from "@/constants/fileTransfer";
import {
  isTransferSessionLimitError,
  TransferSlotWaitTimeoutError,
} from "@/services/fileTransfer/sessionLimit";
import { bytes2Human, formatDate } from "@/utils/format";
import { getAxiosErrorDetail } from "@/utils/apiError";
import { AxiosError } from "axios";

export function isFolderRow(row: FileBrowserItem): boolean {
  return row.type === "folder";
}

export function compareFolderFirst(
  rowA: FileBrowserItem,
  rowB: FileBrowserItem,
): number {
  const aFolder = isFolderRow(rowA);
  const bFolder = isFolderRow(rowB);
  if (aFolder && !bFolder) return -1;
  if (!aFolder && bFolder) return 1;
  return 0;
}

export function compareNameAsc(
  rowA: FileBrowserItem,
  rowB: FileBrowserItem,
): number {
  return rowA.name.localeCompare(rowB.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function typeSortLabel(row: FileBrowserItem): string {
  if (isFolderRow(row)) return "Folder";
  return (row.extension || "File").toUpperCase();
}

export function parseModifiedToTimestamp(modified?: string): number {
  if (!modified) return 0;
  const t = new Date(modified).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function modifiedSortValue(row: FileBrowserItem): number {
  if (typeof row.modifiedAt === "number" && Number.isFinite(row.modifiedAt)) {
    return row.modifiedAt;
  }
  return parseModifiedToTimestamp(row.modified);
}

export function sizeSortValue(row: FileBrowserItem): number | null {
  if (isFolderRow(row)) return null;
  if (typeof row.sizeBytes === "number" && Number.isFinite(row.sizeBytes)) {
    return row.sizeBytes;
  }
  return parseSizeLabelToBytes(row.size);
}

export function parseSizeLabelToBytes(size?: string): number {
  if (!size || size === "—") return 0;
  const trimmed = size.trim();
  const m = trimmed.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const mult: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };
    return n * (mult[unit] ?? 1);
  }
  const raw = parseInt(trimmed, 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

export function isLikelyWindowsPath(path: string): boolean {
  const trimmed = (path || "").trim();
  return /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\\\");
}

function usesWindowsPathSeparators(path: string, platform?: string): boolean {
  const plat = (platform || "").toLowerCase();
  if (plat === "windows") return true;
  if (plat === "linux" || plat === "darwin") return false;
  return isLikelyWindowsPath(path);
}

export function normalizeFileBrowserPathSlashes(
  path: string,
  platform?: string,
): string {
  const trimmed = (path || "").trim();
  if (!trimmed) return trimmed;

  if (usesWindowsPathSeparators(trimmed, platform)) {
    return trimmed.replace(/\//g, "\\");
  }
  return trimmed;
}

export function normalizeAgentListPath(
  path: string,
  platform?: string,
): string {
  const trimmed = (path || "").trim();
  if (!trimmed) return trimmed;

  if (usesWindowsPathSeparators(trimmed, platform)) {
    const normalized = normalizeFileBrowserPathSlashes(trimmed, "windows");
    const driveRoot = /^([A-Za-z]):\\*$/.exec(normalized);
    if (driveRoot) return `${driveRoot[1]}:\\`;
    if (normalized.startsWith("\\\\")) return normalized.replace(/\\+$/, "");
    return normalized;
  }

  let normalized = normalizeFileBrowserPathSlashes(
    trimmed,
    platform || "linux",
  );
  if (normalized !== "/") normalized = normalized.replace(/\/+$/, "");
  return normalized || "/";
}

export function isZipFileItem(
  item: FileBrowserItem | null | undefined,
): boolean {
  return !!item && item.type === "file" && /\.zip$/i.test(item.name);
}

export function extractDestinationRule(
  value: string | number | null | undefined,
  platform?: string,
): true | string {
  const path = String(value ?? "").trim();
  if (!path) return "Enter a destination folder";
  const windows = (platform || "").toLowerCase() === "windows";
  const absolute = windows
    ? /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/][^\\/]+)/.test(path)
    : path.startsWith("/");
  if (!absolute) {
    return windows
      ? "Enter a full path, for example C:\\Folder"
      : "Enter a full path starting with /";
  }
  if (path.split(windows ? /[\\/]+/ : "/").includes("..")) {
    return "The path cannot contain ..";
  }
  return true;
}

export function defaultExtractDestination(
  folder: string,
  zipName: string,
  platform?: string,
): string {
  const sep = (platform || "").toLowerCase() === "windows" ? "\\" : "/";
  const base = zipName.replace(/\.zip$/i, "") || "extracted";
  return folder.endsWith(sep) ? `${folder}${base}` : `${folder}${sep}${base}`;
}

export function formatFileBrowserTimestamp(iso?: string): string {
  if (!iso) return "";
  return formatDate(iso, "YYYY-MM-DD h:mm A");
}

function parseApiTimestampMs(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? undefined : t;
}

export function mapApiItemToFileBrowserItem(
  raw: FileBrowserApiItem,
  platform?: string,
): FileBrowserItem {
  const normalizedPath = normalizeAgentListPath(raw.path, platform);
  const bytes = parseInt(raw.size, 10);
  const hasBytes = Number.isFinite(bytes) && bytes >= 0;
  const modifiedAt = parseApiTimestampMs(raw.modified);

  const item: FileBrowserItem = {
    id: normalizeAgentListPath(raw.id || raw.path, platform),
    name: raw.name,
    path: normalizedPath,
    type: raw.type,
    modified: formatFileBrowserTimestamp(raw.modified),
    created: formatFileBrowserTimestamp(raw.created),
    accessed: formatFileBrowserTimestamp(raw.accessed),
    hidden: raw.hidden,
    system: raw.system,
    readonly: raw.readonly,
  };

  if (modifiedAt !== undefined) {
    item.modifiedAt = modifiedAt;
  }

  if (raw.extension) {
    item.extension = raw.extension;
  }

  if (raw.location) {
    item.location = normalizeAgentListPath(raw.location, platform);
  }

  if (raw.type === "file") {
    if (hasBytes) {
      item.sizeBytes = bytes;
      item.size = bytes2Human(bytes);
    } else {
      item.size = "—";
    }
  } else if (raw.type === "folder" && hasBytes) {
    item.sizeBytes = bytes;
    item.size = bytes2Human(bytes);
  }

  if (typeof raw.file_count === "number") {
    item.fileCount = raw.file_count;
  }
  if (typeof raw.folder_count === "number") {
    item.folderCount = raw.folder_count;
  }
  if (raw.summary_truncated != null) {
    item.summaryTruncated = Boolean(raw.summary_truncated);
  }

  return item;
}

export function mapApiItemsToFileBrowserItems(
  items: FileBrowserApiItem[],
  platform?: string,
): FileBrowserItem[] {
  return items.map((item) => mapApiItemToFileBrowserItem(item, platform));
}

export function getListFilesErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (err.code === "ERR_NETWORK") {
      return "Unable to reach the server. Check your connection.";
    }
    if (err.code === "ERR_CANCELED") {
      return "Request was cancelled.";
    }
    if (err.response?.status === 403) {
      const detail = getAxiosErrorDetail(err);
      if (detail) {
        return formatFileBrowserApiErrorMessage(detail);
      }
      return "You do not have permission to use the file browser.";
    }
    const detail = getAxiosErrorDetail(err);
    if (detail) {
      return formatFileBrowserApiErrorMessage(detail);
    }
  } else if (err instanceof Error && err.message.trim()) {
    return formatFileBrowserApiErrorMessage(err.message);
  }
  return "Unable to load directory contents.";
}

export function formatFileBrowserApiErrorMessage(raw: string): string {
  const afterFailed = unwrapApiErrorText(raw);
  if (!afterFailed) return afterFailed;

  if (
    /destination already exists \(conflict_policy=skip\)/i.test(afterFailed)
  ) {
    return "Skipped — file already exists.";
  }
  if (
    /this destination already contains a (file|folder) named/i.test(afterFailed)
  ) {
    return ensureSentence(afterFailed);
  }
  if (/^a (file|folder) named .+ already exists\.?$/i.test(afterFailed)) {
    return ensureSentence(afterFailed);
  }

  const namedDup =
    /^a file or folder named ["“]?(.+?)["”]? already exists\.?$/i.exec(
      afterFailed,
    );
  if (namedDup?.[1]) {
    return `A file or folder named "${namedDup[1]}" already exists.`;
  }
  if (/already exists/i.test(afterFailed)) {
    return "A file or folder with this name already exists.";
  }

  return ensureSentence(afterFailed);
}

function unwrapApiErrorText(raw: string): string {
  let text = raw.trim();
  if (!text) return text;

  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") {
        text = parsed.trim();
      }
    } catch {
      // Keep as it is, trailing "may be part of a name like ...named"
    }
  }

  const filesFailed = /^Files \w+ failed:\s*(.+)$/i.exec(text);
  if (filesFailed?.[1]) return filesFailed[1].trim();

  const genericFailed = /^[^:]+\s+failed:\s*(.+)$/i.exec(text);
  if (genericFailed?.[1]) return genericFailed[1].trim();

  return text;
}

function ensureSentence(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

export function isDuplicateNameError(err: unknown, message?: string): boolean {
  const text =
    (message && message.trim()) || getFileBrowserErrorMessage(err, "");
  return /already exists|already contains/i.test(text);
}

function deletePathIdentityKey(
  path: string,
  platform: string | undefined,
): string {
  const isWindows = (platform ?? "").toLowerCase() === "windows";
  let key = path.trim();
  if (isWindows) {
    key = key.replace(/\//g, "\\").toLowerCase();
    return key.replace(/\\+$/g, "");
  }
  if (key !== "/") {
    key = key.replace(/\/+$/g, "");
  }
  return key;
}

const WINDOWS_PROTECTED_DELETE_PATHS = new Set([
  "c:\\windows",
  "c:\\windows\\system32",
  "c:\\windows\\syswow64",
  "c:\\program files",
  "c:\\program files (x86)",
  "c:\\programdata",
  "c:\\users",
]);

const UNIX_PROTECTED_DELETE_PATHS = new Set([
  "/bin",
  "/sbin",
  "/usr",
  "/usr/bin",
  "/usr/sbin",
  "/usr/lib",
  "/usr/lib64",
  "/lib",
  "/lib64",
  "/etc",
  "/boot",
  "/dev",
  "/proc",
  "/sys",
  "/run",
  "/root",
  "/home",
  "/opt",
  "/var",
  "/usr/local",
  "/Users",
  "/users",
]);

export function isLikelyProtectedDeletePath(
  path: string,
  platform?: string,
): boolean {
  const key = deletePathIdentityKey(path, platform);
  if (!key) return false;
  const isWindows = (platform ?? "").toLowerCase() === "windows";
  if (isWindows) {
    if (/^[a-z]:$/.test(key)) return true;
    return WINDOWS_PROTECTED_DELETE_PATHS.has(key);
  }
  if (key === "/") return true;
  if (
    (platform ?? "").toLowerCase() === "darwin" &&
    (key === "/System" || key === "/Library")
  ) {
    return true;
  }
  return UNIX_PROTECTED_DELETE_PATHS.has(key);
}

export function fileBrowserDeleteErrorMessage(error?: string): string {
  const text = (error ?? "").trim();
  if (/^protected path$/i.test(text)) {
    return "protected system or agent path";
  }
  return text;
}

export function getFileBrowserErrorMessage(
  err: unknown,
  fallback = "Unable to complete the operation.",
): string {
  if (err instanceof TransferSlotWaitTimeoutError) {
    return err.message;
  }
  if (isTransferSessionLimitError(err)) {
    return "Too many concurrent file transfers. All slots are in use, possibly by other users; cancel one of your paused transfers or try again later.";
  }
  if (err instanceof AxiosError && err.response?.status === 429) {
    const detail = getAxiosErrorDetail(err);
    if (detail && detail.length < 200 && !detail.includes("<")) {
      return formatFileBrowserApiErrorMessage(detail);
    }
    return TRANSFER_RATE_LIMIT_MESSAGE;
  }
  const message = getListFilesErrorMessage(err);
  if (message === "Unable to load directory contents.") {
    return fallback;
  }
  return message;
}

export function isListFilesPermissionError(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 403;
}

export function isListFilesAgentOfflineError(message: string): boolean {
  return /unable to contact the agent/i.test(message);
}

export function sortFileBrowserRows(
  data: readonly FileBrowserItem[],
  sortBy: string,
  descending: boolean,
): FileBrowserItem[] {
  if (!sortBy) return data.slice();

  const dir = descending ? -1 : 1;

  const compareField = (
    rowA: FileBrowserItem,
    rowB: FileBrowserItem,
  ): number => {
    switch (sortBy) {
      case "modified":
        return modifiedSortValue(rowA) - modifiedSortValue(rowB);
      case "type":
        return typeSortLabel(rowA).localeCompare(
          typeSortLabel(rowB),
          undefined,
          {
            sensitivity: "base",
          },
        );
      case "size": {
        const a = sizeSortValue(rowA);
        const b = sizeSortValue(rowB);
        if (a === null && b === null) return 0;
        if (a === null) return 0;
        if (b === null) return 0;
        return a - b;
      }
      case "name":
      default:
        return compareNameAsc(rowA, rowB);
    }
  };

  return data.slice().sort((rowA, rowB) => {
    const folderCmp = compareFolderFirst(rowA, rowB);
    if (folderCmp !== 0) return folderCmp;

    const fieldCmp = compareField(rowA, rowB);
    if (fieldCmp !== 0) return fieldCmp * dir;

    const nameCmp = compareNameAsc(rowA, rowB);
    return nameCmp === 0 ? 0 : nameCmp * dir;
  });
}

export function normalizeFileBrowserFilterQuery(
  query: string | null | undefined,
): string {
  return (query ?? "").trim();
}

export function getFileBrowserNameHighlightParts(
  name: string,
  query: string | null | undefined,
): { text: string; match: boolean }[] {
  const q = normalizeFileBrowserFilterQuery(query);
  if (!q || !name) return [{ text: name, match: false }];

  const lowerName = name.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  let idx = lowerName.indexOf(lowerQ, start);

  while (idx !== -1) {
    if (idx > start) {
      parts.push({ text: name.slice(start, idx), match: false });
    }
    parts.push({ text: name.slice(idx, idx + q.length), match: true });
    start = idx + q.length;
    idx = lowerName.indexOf(lowerQ, start);
  }

  if (start < name.length) {
    parts.push({ text: name.slice(start), match: false });
  }

  return parts.length > 0 ? parts : [{ text: name, match: false }];
}

export function isFileDrag(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) return false;

  const types = dataTransfer.types;
  if (types) {
    for (let i = 0; i < types.length; i++) {
      if (types[i] === "Files") return true;
    }
  }

  const items = dataTransfer.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") return true;
    }
  }

  return false;
}

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

export type FileDragInspection = {
  isFileDrag: boolean;
  fileCount: number;
  folderCount: number;
  countKnown: boolean;
  oversizedFileCount: number;
  sizeKnown: boolean;
};

export type DropOverlayRejectReason =
  | "folders"
  | "unsupported"
  | "too-many"
  | "queue-full"
  | "size-limit";

export function inspectFileDrag(
  dataTransfer: DataTransfer | null | undefined,
  maxFileSizeBytes = 0,
): FileDragInspection {
  const empty: FileDragInspection = {
    isFileDrag: false,
    fileCount: 0,
    folderCount: 0,
    countKnown: false,
    oversizedFileCount: 0,
    sizeKnown: false,
  };

  if (!isFileDrag(dataTransfer)) return empty;

  const items = dataTransfer?.items;
  if (!items?.length) {
    return {
      ...empty,
      isFileDrag: true,
      countKnown: false,
    };
  }

  let fileCount = 0;
  let folderCount = 0;
  let oversizedFileCount = 0;
  let sizedFiles = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as DataTransferItemWithEntry;
    if (item.kind !== "file") continue;

    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      folderCount += 1;
      continue;
    }

    fileCount += 1;
    const file = item.getAsFile?.();
    if (file && maxFileSizeBytes > 0) {
      sizedFiles += 1;
      if (file.size > maxFileSizeBytes) oversizedFileCount += 1;
    }
  }

  return {
    isFileDrag: true,
    fileCount,
    folderCount,
    countKnown: true,
    oversizedFileCount,
    sizeKnown:
      maxFileSizeBytes > 0 && sizedFiles === fileCount && fileCount > 0,
  };
}

export function resolveDropOverlayReject(options: {
  inspection: FileDragInspection;
  queueRoom: number;
  maxFilesPerSelection: number;
  maxFileSizeBytes: number;
}): DropOverlayRejectReason | null {
  const { inspection, queueRoom, maxFilesPerSelection, maxFileSizeBytes } =
    options;

  if (!inspection.isFileDrag) return "unsupported";

  if (inspection.countKnown) {
    if (inspection.fileCount === 0 && inspection.folderCount > 0) {
      return "folders";
    }
    if (inspection.fileCount === 0 && inspection.folderCount === 0) {
      return "unsupported";
    }
    if (queueRoom <= 0) return "queue-full";
    if (inspection.fileCount > maxFilesPerSelection) return "too-many";
    if (
      maxFileSizeBytes > 0 &&
      inspection.sizeKnown &&
      inspection.oversizedFileCount === inspection.fileCount
    ) {
      return "size-limit";
    }
  } else if (queueRoom <= 0) {
    return "queue-full";
  }

  return null;
}

export function formatDropOverlayTitle(
  reason: DropOverlayRejectReason | null,
  fileCount: number | null,
): string {
  switch (reason) {
    case "folders":
      return "Folders cannot be uploaded";
    case "unsupported":
      return "This item cannot be uploaded";
    case "too-many":
      return "Too many files selected";
    case "queue-full":
      return "Upload queue is full";
    case "size-limit":
      return "File exceeds the upload limit";
    default:
      break;
  }

  if (fileCount === 1) return "Drop file to upload";
  if (fileCount != null && fileCount > 1) {
    return `Drop ${fileCount} files to upload`;
  }
  return "Drop files to upload";
}

export function dropRejectToastMessage(
  reason: DropOverlayRejectReason,
): string {
  switch (reason) {
    case "folders":
      return "Folders cannot be uploaded. Drop files into this folder instead.";
    case "unsupported":
      return "This item cannot be uploaded.";
    case "too-many":
      return "Too many files selected for one upload.";
    case "queue-full":
      return "Upload queue is full. Clear finished items or cancel transfers, then try again.";
    case "size-limit":
      return "File exceeds the upload limit.";
  }
}

export function collectDroppedUploadFiles(
  dataTransfer: DataTransfer | null | undefined,
): { files: File[]; folderCount: number } {
  const files: File[] = [];
  let folderCount = 0;
  const items = dataTransfer?.items;

  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as DataTransferItemWithEntry;
      if (item.kind !== "file") continue;

      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        folderCount += 1;
        continue;
      }

      const file = item.getAsFile();
      if (file) files.push(file);
    }

    if (files.length > 0 || folderCount > 0) {
      return { files, folderCount };
    }
  }

  return { files: fileListToArray(dataTransfer?.files), folderCount: 0 };
}

export function fileBrowserPathLeaf(
  path: string,
  options?: { emptyFallback?: string; platform?: string },
): string {
  const emptyFallback = options?.emptyFallback ?? "this folder";
  const trimmed = path.trim();
  if (!trimmed) return emptyFallback;

  if (usesWindowsPathSeparators(trimmed, options?.platform)) {
    const stripped = trimmed.replace(/[\\/]+$/, "");
    if (!stripped) return emptyFallback;
    const driveOnly = /^[A-Za-z]:$/.exec(stripped);
    if (driveOnly) return `${driveOnly[0]}\\`;
    const parts = stripped.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || stripped;
  }

  const stripped = trimmed === "/" ? trimmed : trimmed.replace(/\/+$/, "");
  if (!stripped) return emptyFallback;
  const idx = stripped.lastIndexOf("/");
  return idx === -1 ? stripped : stripped.slice(idx + 1) || stripped;
}

export function truncatePathMiddle(path: string, maxLen = 52): string {
  const trimmed = path.trim();
  if (trimmed.length <= maxLen) return trimmed;

  const ellipsis = "...";
  const keep = maxLen - ellipsis.length;
  if (keep < 8) return trimmed.slice(0, maxLen);

  const head = Math.ceil(keep * 0.45);
  const tail = keep - head;
  return `${trimmed.slice(0, head)}${ellipsis}${trimmed.slice(-tail)}`;
}

export function fileListToArray(list: FileList | null | undefined): File[] {
  if (!list?.length) return [];
  const out: File[] = [];
  for (let i = 0; i < list.length; i++) {
    const f = list.item(i);
    if (f) out.push(f);
  }
  return out;
}

export function fileNamesMatch(
  a: string,
  b: string,
  platform: string,
): boolean {
  if (platform === "windows") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

export function listUploadNameConflicts(
  files: File[],
  rows: FileBrowserItem[],
  platform: string,
): File[] {
  return files.filter((file) =>
    rows.some((row) => fileNamesMatch(row.name, file.name, platform)),
  );
}

export function filesMatchingExistingNames(
  files: File[],
  existingNames: string[],
  platform: string,
): File[] {
  return files.filter((file) =>
    existingNames.some((name) => fileNamesMatch(file.name, name, platform)),
  );
}

export function formatUploadConflictNamePreview(
  names: string[],
  maxVisible = 3,
): { visibleNames: string[]; remainingCount: number; summaryLine: string } {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length <= maxVisible) {
    return {
      visibleNames: cleaned,
      remainingCount: 0,
      summaryLine: cleaned.join(", "),
    };
  }
  const visibleNames = cleaned.slice(0, maxVisible);
  const remainingCount = cleaned.length - maxVisible;
  return {
    visibleNames,
    remainingCount,
    summaryLine: `${visibleNames.join(", ")}, and ${remainingCount} more`,
  };
}

export type UploadConflictAction = "cancel" | "skip" | "replace";

export function uploadStatusLabel(status: UploadQueueStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "uploading":
      return "Uploading";
    case "completed":
      return "Uploaded";
    case "failed":
      return "Failed";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function uploadStatusBadgeColor(status: UploadQueueStatus): string {
  return transferQueueBadgeColor(status);
}

export function classifyDownloadSelection(items: FileBrowserItem[]): {
  mode: DownloadSelectionMode;
  files: FileBrowserItem[];
  folderCount: number;
  fileCount: number;
} {
  if (!items.length) {
    return { mode: "none", files: [], folderCount: 0, fileCount: 0 };
  }

  const folders = items.filter((item) => item.type === "folder");
  const files = items.filter((item) => item.type === "file");
  const folderCount = folders.length;
  const fileCount = files.length;

  if (folderCount > 0 || fileCount > MAX_SEQUENTIAL_DOWNLOAD_FILES) {
    return { mode: "zip", files, folderCount, fileCount };
  }
  if (fileCount === 1) {
    return { mode: "single", files, folderCount, fileCount };
  }
  if (fileCount >= 2) {
    return { mode: "sequential", files, folderCount, fileCount };
  }

  return { mode: "none", files: [], folderCount, fileCount: 0 };
}

export function downloadStatusLabel(status: DownloadQueueStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "initializing":
      return "Initializing…";
    case "downloading":
      return "Downloading…";
    case "completing":
      return "Verifying…";
    case "completed":
      return "Downloaded";
    case "failed":
      return "Failed";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function downloadStatusBadgeColor(status: DownloadQueueStatus): string {
  return transferQueueBadgeColor(status);
}

export function transferQueueProgressColor(status: string): string {
  if (status === "failed") return "negative";
  if (status === "completed") return "positive";
  if (status === "paused") return "warning";
  if (status === "cancelled") return "grey-7";
  return "primary";
}

export function transferQueueBadgeColor(status: string): string {
  switch (status) {
    case "queued":
      return "grey-5";
    case "uploading":
    case "initializing":
    case "downloading":
    case "completing":
      return "primary";
    case "completed":
      return "positive";
    case "failed":
      return "negative";
    case "paused":
      return "warning";
    case "cancelled":
      return "grey-7";
    default:
      return "grey-5";
  }
}

export function transferQueueStatusLabelWithSlotWait(
  baseLabel: string,
  errorMessage: string | undefined,
  isActive: boolean,
): string {
  if (!isActive || !errorMessage) {
    return baseLabel;
  }
  if (
    errorMessage === TRANSFER_SLOT_WAIT_MESSAGE ||
    /waiting for a free transfer slot/i.test(errorMessage)
  ) {
    return TRANSFER_SLOT_WAIT_LABEL;
  }
  if (errorMessage === TRANSFER_RECONNECTING_MESSAGE) {
    return TRANSFER_RECONNECTING_LABEL;
  }
  if (errorMessage === TRANSFER_WAITING_FOR_AGENT_MESSAGE) {
    return TRANSFER_WAITING_FOR_AGENT_LABEL;
  }
  return baseLabel;
}

export function isDownloadQueueItemTerminal(
  status: DownloadQueueStatus,
): boolean {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
}

export function canDismissDownloadQueueItem(
  status: DownloadQueueStatus,
): boolean {
  return isDownloadQueueItemTerminal(status);
}

export function isDownloadQueueItemActive(
  status: DownloadQueueStatus,
): boolean {
  return (
    status === "initializing" ||
    status === "downloading" ||
    status === "completing"
  );
}

export function isUploadQueueItemActive(status: UploadQueueStatus): boolean {
  return status === "uploading";
}

export function isUploadQueueItemTerminal(status: UploadQueueStatus): boolean {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
}

export function deriveArchiveDownloadName(items: FileBrowserItem[]): string {
  if (items.length === 1) {
    const base =
      items[0].name.replace(/[\\/:*?"<>|]/g, "_").trim() || "download";
    return base.toLowerCase().endsWith(".zip") ? base : `${base}.zip`;
  }
  return "download.zip";
}

export function nameSegmentBaseRule(
  v: string | number | null | undefined,
  platform?: string,
): true | string {
  const raw = String(v ?? "");
  if (!raw.trim()) return "Name is required";
  const windows = !platform || platform === "windows";
  if (windows && (raw.endsWith(".") || raw.endsWith(" "))) {
    return "Name cannot end with a space or a period";
  }

  const name = raw.trim();
  if (name === "." || name === "..") return "The name cannot be . or ..";
  if (FILE_BROWSER_INVALID_NAME_CHARS.test(name)) {
    return 'Name cannot contain \\ / : * ? " < > | or control characters';
  }
  if (name.length > FILE_BROWSER_MAX_NAME_LENGTH) {
    return `Name must be at most ${FILE_BROWSER_MAX_NAME_LENGTH} characters`;
  }
  return true;
}

export function duplicateNameRule(
  v: string | number | null | undefined,
  existingNames: string[],
  excludeName?: string,
): true | string {
  const name = String(v ?? "").trim();
  if (!name) return true;
  const lower = name.toLowerCase();
  const excludeLower = excludeName?.toLowerCase();
  const dup = existingNames.some(
    (n) => n.toLowerCase() === lower && n.toLowerCase() !== excludeLower,
  );
  return !dup || "A file or folder with this name already exists";
}
