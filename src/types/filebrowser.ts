// type imports
import { type QTreeNode } from "quasar";

export interface LazyLoadCallbackParams {
  path: string;
  isDone(nodes: QTreeFileNode[]): void;
  isFail(): void;
}

export interface FileSystemNodeTable {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  asset_id?: string;
  size?: string;
}

export interface QTreeFileNode extends QTreeNode<unknown> {
  id: string;
  path: string;
  type: "folder" | "file";
  size?: string;
  asset_id?: string;
  children?: QTreeFileNode[];
}

export type FileBrowserItemType = "folder" | "file";

export interface FileBrowserItem {
  id: string;
  name: string;
  path: string;
  type: FileBrowserItemType;
  extension?: string;
  size?: string;
  sizeBytes?: number;
  modified?: string;
  modifiedAt?: number;
  created?: string;
  accessed?: string;
  hidden?: boolean;
  system?: boolean;
  readonly?: boolean;
  location?: string;
  fileCount?: number;
  folderCount?: number;
  summaryTruncated?: boolean;
}

export interface FileBrowserApiItem {
  id: string;
  name: string;
  path: string;
  type: FileBrowserItemType;
  extension?: string;
  size: string;
  modified: string;
  created: string;
  accessed: string;
  hidden?: boolean;
  system?: boolean;
  readonly?: boolean;
  location?: string;
  file_count?: number;
  folder_count?: number;
  summary_truncated?: boolean;
}

export interface FileBrowserDirectoryResponse {
  path: string;
  items: FileBrowserApiItem[];
  has_more: boolean;
  page: number;
  page_size: number;
  total: number;
}

export interface FileBrowserMutationResponse {
  status: "success";
  item: FileBrowserApiItem;
}

export interface FileBrowserDeleteResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface FileBrowserDeleteResponse {
  status: "success";
  results: FileBrowserDeleteResult[];
}

export interface BreadcrumbSegment {
  label: string;
  fullPath: string;
}

export type UploadQueueStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "failed"
  | "paused"
  | "cancelled";

export interface UploadQueueItem {
  id: string;
  file?: File;
  name: string;
  sizeLabel: string;
  sizeBytes: number;
  destinationPath: string;
  status: UploadQueueStatus;
  progress: number;
  conflictPolicy?: "skip" | "replace";
  acceptedOffset?: number;
  committedOffset?: number;
  errorMessage?: string;
  sessionId?: string;
  hidden?: boolean;
  expiresAt?: string;
  recoveryHint?: TransferRecoveryHint;
  uploadFileIdentity?: UploadFileIdentity;
  ownedByOtherTab?: boolean;
}

export type TransferRecoveryHint =
  | "ready"
  | "needs_file"
  | "needs_destination"
  | "needs_permission"
  | "archive_preparing"
  | "non_resumable";

export interface UploadFileIdentity {
  name: string;
  size: number;
  lastModified: number;
}

export type DownloadQueueStatus =
  | "queued"
  | "initializing"
  | "downloading"
  | "completing"
  | "completed"
  | "failed"
  | "paused"
  | "cancelled";

export interface DownloadQueueItem {
  id: string;
  name: string;
  sourcePath: string;
  kind?: "file" | "archive";
  archivePaths?: string[];
  status: DownloadQueueStatus;
  progress: number;
  errorMessage?: string;
  sessionId?: string;
  hidden?: boolean;
  expiresAt?: string;
  recoveryHint?: TransferRecoveryHint;
  committedOffset?: number;
  totalSize?: number;
  chunkSize?: number;
  ownedByOtherTab?: boolean;
  handleKey?: string;
  resumeFileHandle?: FileSystemFileHandle;
}

export type DownloadSelectionMode = "none" | "single" | "sequential" | "zip";

export interface ExtractJob {
  sessionId: string;
  name: string;
  destination: string;
  status: string;
  written: number;
  total: number;
  filesDone: number;
  filesTotal: number;
  cancelling?: boolean;
}
