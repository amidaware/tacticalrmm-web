import axios from "axios";

import { TransferNotReadyError } from "@/services/fileTransfer/sessionLimit";

import {
  FILE_TRANSFER_COMPLETE_TIMEOUT_MS,
  FILE_TRANSFER_DOWNLOAD_CHUNK_TIMEOUT_MS,
  FILE_TRANSFER_UPLOAD_CHUNK_TIMEOUT_MS,
  FILE_TRANSFER_UPLOAD_READY_TIMEOUT_MS,
} from "@/constants/fileTransfer";
import type {
  FileTransferCompleteDownloadResponse,
  FileTransferCompleteUploadResponse,
  FileExtractStatusResponse,
  FileTransferDownloadStatusResponse,
  FileTransferInitDownloadResponse,
  FileTransferInitUploadResponse,
  FileTransferUploadChunkReadyResponse,
  FileTransferUploadChunkResponse,
  ResumableFileTransfersResponse,
} from "@/types/fileTransfer";

const baseUrl = "/agents";

const transferRequestConfig = {
  skipGlobalErrorNotify: true,
} as const;

export interface InitFileUploadPayload {
  filename: string;
  destination_path: string;
  total_size: number;
  chunk_size?: number;
  conflict_policy?: "skip" | "replace";
}

export interface ResumeFileUploadPayload {
  session_id: string;
  filename: string;
  total_size: number;
}

export async function initAgentFileUpload(
  agentId: string,
  payload: InitFileUploadPayload,
  signal?: AbortSignal,
): Promise<FileTransferInitUploadResponse> {
  const { data } = await axios.post<FileTransferInitUploadResponse>(
    `${baseUrl}/${agentId}/files/upload/init/`,
    payload,
    { timeout: 60_000, signal, ...transferRequestConfig },
  );
  return data;
}

export async function resumeAgentFileUpload(
  agentId: string,
  payload: ResumeFileUploadPayload,
  signal?: AbortSignal,
): Promise<FileTransferInitUploadResponse> {
  const { data } = await axios.post<FileTransferInitUploadResponse>(
    `${baseUrl}/${agentId}/files/upload/init/`,
    payload,
    { timeout: 60_000, signal, ...transferRequestConfig },
  );
  return data;
}

export async function getUploadChunkReady(
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<FileTransferUploadChunkReadyResponse> {
  const { data } = await axios.get<FileTransferUploadChunkReadyResponse>(
    `${baseUrl}/${agentId}/files/upload/${sessionId}/chunk/`,
    {
      timeout: FILE_TRANSFER_UPLOAD_READY_TIMEOUT_MS,
      signal,
      ...transferRequestConfig,
    },
  );
  return data;
}

export async function uploadAgentFileChunk(
  agentId: string,
  sessionId: string,
  body: Blob,
  contentRange: string,
  signal?: AbortSignal,
): Promise<FileTransferUploadChunkResponse> {
  const { data } = await axios.put<FileTransferUploadChunkResponse>(
    `${baseUrl}/${agentId}/files/upload/${sessionId}/chunk/`,
    body,
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Range": contentRange,
      },
      timeout: FILE_TRANSFER_UPLOAD_CHUNK_TIMEOUT_MS,
      signal,
      ...transferRequestConfig,
    },
  );
  return data;
}

export async function completeAgentFileUpload(
  agentId: string,
  sessionId: string,
  sha256: string,
  signal?: AbortSignal,
): Promise<FileTransferCompleteUploadResponse> {
  const { data } = await axios.post<FileTransferCompleteUploadResponse>(
    `${baseUrl}/${agentId}/files/upload/${sessionId}/complete/`,
    { sha256 },
    {
      ...transferRequestConfig,
      timeout: FILE_TRANSFER_COMPLETE_TIMEOUT_MS,
      signal,
    },
  );
  return data;
}

export interface InitFileDownloadPayload {
  source_path: string;
  chunk_size?: number;
}

export interface InitArchiveDownloadPayload {
  paths: string[];
  filename?: string;
  chunk_size?: number;
}

export interface ResumeFileDownloadPayload {
  session_id: string;
  resume_offset: number;
}

export async function initAgentArchiveDownload(
  agentId: string,
  payload: InitArchiveDownloadPayload,
  signal?: AbortSignal,
): Promise<FileTransferInitDownloadResponse> {
  const { data } = await axios.post<FileTransferInitDownloadResponse>(
    `${baseUrl}/${agentId}/files/download/archive/init/`,
    payload,
    { timeout: 60_000, signal, ...transferRequestConfig },
  );
  return data;
}

export async function getAgentDownloadStatus(
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<FileTransferDownloadStatusResponse> {
  const { data } = await axios.get<FileTransferDownloadStatusResponse>(
    `${baseUrl}/${agentId}/files/download/${sessionId}/status/`,
    { timeout: 30_000, signal, ...transferRequestConfig },
  );
  return data;
}

export async function initAgentFileDownload(
  agentId: string,
  payload: InitFileDownloadPayload,
  signal?: AbortSignal,
): Promise<FileTransferInitDownloadResponse> {
  const { data } = await axios.post<FileTransferInitDownloadResponse>(
    `${baseUrl}/${agentId}/files/download/init/`,
    payload,
    { timeout: 60_000, signal, ...transferRequestConfig },
  );
  return data;
}

export async function resumeAgentFileDownload(
  agentId: string,
  payload: ResumeFileDownloadPayload,
  signal?: AbortSignal,
): Promise<FileTransferInitDownloadResponse> {
  const { data } = await axios.post<FileTransferInitDownloadResponse>(
    `${baseUrl}/${agentId}/files/download/init/`,
    payload,
    { timeout: 60_000, signal, ...transferRequestConfig },
  );
  return data;
}

export function parseContentRangeHeader(header: string | undefined): {
  start: number;
  end: number;
  total: number;
} {
  const match = (header ?? "").match(/bytes (\d+)-(\d+)\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid Content-Range header: ${header ?? "(missing)"}`);
  }
  return {
    start: parseInt(match[1], 10),
    end: parseInt(match[2], 10),
    total: parseInt(match[3], 10),
  };
}

export function assertDownloadChunkRange(
  range: { start: number; end: number; total: number },
  expected: { start: number; totalSize: number },
): void {
  if (range.start !== expected.start) {
    throw new Error(
      `Download chunk offset mismatch: expected ${expected.start}, received ${range.start}.`,
    );
  }
  if (range.total !== expected.totalSize) {
    throw new Error(
      `Download chunk total mismatch: expected ${expected.totalSize}, received ${range.total}.`,
    );
  }
  if (range.end < range.start) {
    throw new Error(
      `Invalid Content-Range: end ${range.end} is before start ${range.start}.`,
    );
  }
}

export async function getAgentFileDownloadChunk(
  agentId: string,
  sessionId: string,
  committedOffset: number,
  signal?: AbortSignal,
): Promise<{ data: ArrayBuffer; contentRange: string }> {
  const response = await axios.get<ArrayBuffer>(
    `${baseUrl}/${agentId}/files/download/${sessionId}/chunk/`,
    {
      params: { committed_offset: committedOffset },
      responseType: "arraybuffer",
      timeout: FILE_TRANSFER_DOWNLOAD_CHUNK_TIMEOUT_MS,
      signal,
      ...transferRequestConfig,
    },
  );
  if (response.status === 204) {
    throw new TransferNotReadyError(
      "Timed out waiting for agent to push chunk",
    );
  }
  const contentRange =
    (response.headers["content-range"] as string | undefined) ??
    (response.headers["Content-Range"] as string | undefined) ??
    "";
  return { data: response.data, contentRange };
}

export async function ackAgentFileDownloadChunk(
  agentId: string,
  sessionId: string,
  committedOffset: number,
): Promise<{ committed_offset: number }> {
  const { data } = await axios.post<{ committed_offset: number }>(
    `${baseUrl}/${agentId}/files/download/${sessionId}/ack/`,
    { committed_offset: committedOffset },
    { timeout: 30_000, ...transferRequestConfig },
  );
  return data;
}

export async function completeAgentFileDownload(
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<FileTransferCompleteDownloadResponse> {
  const { data } = await axios.post<FileTransferCompleteDownloadResponse>(
    `${baseUrl}/${agentId}/files/download/${sessionId}/complete/`,
    {},
    {
      ...transferRequestConfig,
      timeout: FILE_TRANSFER_COMPLETE_TIMEOUT_MS,
      signal,
    },
  );
  return data;
}

export type FileTransferCancelReason = "user" | "error";

export async function cancelAgentFileDownload(
  agentId: string,
  sessionId: string,
  reason: FileTransferCancelReason = "user",
): Promise<void> {
  await axios.post(
    `${baseUrl}/${agentId}/files/download/${sessionId}/cancel/`,
    { reason },
    { timeout: 30_000, ...transferRequestConfig },
  );
}

export async function cancelAgentFileUpload(
  agentId: string,
  sessionId: string,
  reason: FileTransferCancelReason = "user",
): Promise<void> {
  await axios.post(
    `${baseUrl}/${agentId}/files/upload/${sessionId}/cancel/`,
    { reason },
    { timeout: 30_000, ...transferRequestConfig },
  );
}

export interface InitFileExtractPayload {
  source_path: string;
  destination_path: string;
  conflict_policy: "skip" | "replace";
}

export async function initAgentFileExtract(
  agentId: string,
  payload: InitFileExtractPayload,
): Promise<{ session_id: string; status: string }> {
  const { data } = await axios.post<{ session_id: string; status: string }>(
    `${baseUrl}/${agentId}/files/extract/`,
    payload,
    { timeout: 60_000, ...transferRequestConfig },
  );
  return data;
}

export async function getAgentFileExtractStatus(
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<FileExtractStatusResponse> {
  const { data } = await axios.get<FileExtractStatusResponse>(
    `${baseUrl}/${agentId}/files/extract/${sessionId}/`,
    { timeout: 30_000, signal, ...transferRequestConfig },
  );
  return data;
}

export async function cancelAgentFileExtract(
  agentId: string,
  sessionId: string,
): Promise<{ status: string; files_done: number; files_skipped: number }> {
  const { data } = await axios.post<{
    status: string;
    files_done: number;
    files_skipped: number;
  }>(
    `${baseUrl}/${agentId}/files/extract/${sessionId}/cancel/`,
    {},
    { timeout: 30_000, ...transferRequestConfig },
  );
  return data;
}

export async function listAgentFileTransfers(
  agentId: string,
): Promise<ResumableFileTransfersResponse> {
  const { data } = await axios.get<ResumableFileTransfersResponse>(
    `${baseUrl}/${agentId}/files/transfers/`,
    { timeout: 30_000, ...transferRequestConfig },
  );
  return data;
}

export async function checkAgentExistingNames(
  agentId: string,
  path: string,
  names: string[],
): Promise<{ existing: string[] }> {
  const { data } = await axios.post<{ existing: string[] }>(
    `${baseUrl}/${agentId}/files/exists/`,
    { path, names },
    { timeout: 30_000, ...transferRequestConfig },
  );
  return data;
}
