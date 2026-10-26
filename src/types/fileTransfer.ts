export interface FileTransferInitUploadResponse {
  session_id: string;
  status: string;
  chunk_size: number;
  committed_offset: number;
  resumed?: boolean;
}

export interface FileTransferUploadChunkResponse {
  session_id: string;
  status: string;
  accepted_offset: number;
  committed_offset: number;
  chunk_start: number;
  chunk_end: number;
  chunk_bytes: number;
  can_put?: boolean;
}

export interface FileTransferUploadChunkReadyResponse {
  session_id: string;
  status: string;
  accepted_offset: number;
  committed_offset: number;
  chunk_size: number;
  total_size: number;
  can_put: boolean;
  error?: string;
}

export interface FileTransferCompleteUploadResponse {
  session_id: string;
  status: string;
  destination_path: string;
  committed_offset: number;
  sha256?: string;
}

export interface FileTransferInitDownloadResponse {
  session_id: string;
  status: string;
  total_size: number;
  chunk_size: number;
  committed_offset: number;
  resumed?: boolean;
  filename?: string;
  is_archive?: boolean;
  warnings?: string[];
  preparing?: boolean;
}

export interface FileTransferCompleteDownloadResponse {
  session_id: string;
  status: string;
  source_path: string;
  committed_offset: number;
  sha256?: string;
}

export interface FileTransferDownloadStatusResponse {
  session_id: string;
  status: string;
  total_size: number;
  chunk_size: number;
  committed_offset: number;
  filename: string;
  is_archive: boolean;
  warnings: string[];
  error: string;
}

export interface FileExtractStatusResponse {
  session_id: string;
  status: string;
  filename: string;
  source_path: string;
  destination_path: string;
  conflict_policy: "skip" | "replace";
  total_size: number;
  committed_offset: number;
  files_done: number;
  files_total: number;
  files_skipped: number;
  warnings: string[];
  error: string;
}

export interface ResumableFileTransfer {
  session_id: string;
  operation: "upload" | "download" | "extract";
  filename: string;
  destination_path: string;
  total_size: number;
  chunk_size: number;
  committed_offset: number;
  status: string;
  expires_at: string;
  is_archive: boolean;
  warnings?: string[];
  conflict_policy?: "skip" | "replace";
  source_path?: string;
  files_done?: number;
  files_total?: number;
  files_skipped?: number;
}

export interface ResumableFileTransfersResponse {
  transfers: ResumableFileTransfer[];
}

export interface FileTransferProgress {
  acceptedOffset: number;
  committedOffset: number;
  totalSize: number;
}

export interface FileTransferUploadResult {
  destinationPath: string;
  sha256: string;
  integrityOk: boolean;
}

export interface FileTransferDownloadResult {
  sourcePath: string;
  fileName: string;
  sha256: string;
  integrityOk: boolean;
  bytesWritten: number;
  warnings?: string[];
}

export type DownloadTransferStatus =
  | "idle"
  | "initializing"
  | "downloading"
  | "completing"
  | "completed"
  | "failed"
  | "paused"
  | "cancelled";

export type TransferAbortMode = "pause" | "cancel";

export interface TransferAbortIntent {
  mode: TransferAbortMode;
}
