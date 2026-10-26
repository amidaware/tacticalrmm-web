import { AxiosError } from "axios";

import {
  FILE_TRANSFER_ACK_POLL_MAX_MS,
  FILE_TRANSFER_ACK_POLL_MS,
  FILE_TRANSFER_ACK_WAIT_MAX_MS,
  FILE_TRANSFER_SLOT_RETRY_BASE_MS,
  FILE_TRANSFER_SLOT_RETRY_MAX_ATTEMPTS,
  FILE_TRANSFER_SLOT_RETRY_MAX_DURATION_MS,
  FILE_TRANSFER_SLOT_RETRY_MAX_MS,
  FILE_TRANSFER_STALL_NOTICE_MS,
  FILE_TRANSFER_TRANSIENT_RETRY_ATTEMPTS,
  FILE_TRANSFER_TRANSIENT_RETRY_BASE_MS,
  FILE_TRANSFER_TRANSIENT_RETRY_HARD_CAP,
  FILE_TRANSFER_TRANSIENT_RETRY_MAX_DURATION_MS,
  FILE_TRANSFER_TRANSIENT_RETRY_MAX_MS,
  TRANSFER_SLOT_WAIT_TIMEOUT_MESSAGE,
} from "@/constants/fileTransfer";
import { getAxiosErrorDetail } from "@/utils/apiError";

const TRANSFER_SESSION_LIMIT_MESSAGE = /too many concurrent file transfers/i;

export interface TransferSlotWaitInfo {
  attempt: number;
  delayMs: number;
}

export interface WithTransferSessionRetryOptions {
  signal?: AbortSignal;
  onWaitingForSlot?: (info: TransferSlotWaitInfo) => void;
  maxAttempts?: number;
  maxDurationMs?: number;
  delayMsForAttempt?: (attempt: number) => number;
}

export class TransferSlotWaitTimeoutError extends Error {
  constructor(message = TRANSFER_SLOT_WAIT_TIMEOUT_MESSAGE) {
    super(message);
    this.name = "TransferSlotWaitTimeoutError";
  }
}

export function isTransferSessionLimitError(err: unknown): boolean {
  if (!(err instanceof AxiosError)) return false;
  if (err.response?.status !== 429) return false;

  const detail = getAxiosErrorDetail(err);
  return Boolean(detail && TRANSFER_SESSION_LIMIT_MESSAGE.test(detail));
}

export function transferSlotRetryDelayMs(attempt: number): number {
  const n = Math.max(1, Math.floor(attempt));
  const delay = FILE_TRANSFER_SLOT_RETRY_BASE_MS * 2 ** (n - 1);
  return Math.min(FILE_TRANSFER_SLOT_RETRY_MAX_MS, delay);
}

function abortError(): DOMException {
  return new DOMException("Transfer aborted", "AbortError");
}

export function sleepAbortable(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withTransferSessionRetry<T>(
  operation: () => Promise<T>,
  options: WithTransferSessionRetryOptions = {},
): Promise<T> {
  const {
    signal,
    onWaitingForSlot,
    maxAttempts = FILE_TRANSFER_SLOT_RETRY_MAX_ATTEMPTS,
    maxDurationMs = FILE_TRANSFER_SLOT_RETRY_MAX_DURATION_MS,
    delayMsForAttempt = transferSlotRetryDelayMs,
  } = options;
  let attempt = 0;
  let firstFailureAt: number | null = null;

  for (;;) {
    if (signal?.aborted) {
      throw abortError();
    }
    try {
      return await operation();
    } catch (err) {
      if (!isTransferSessionLimitError(err)) {
        throw err;
      }
      if (signal?.aborted) {
        throw abortError();
      }
      attempt += 1;
      if (firstFailureAt === null) {
        firstFailureAt = Date.now();
      }
      const timedOut = Date.now() - firstFailureAt >= maxDurationMs;
      if (attempt >= maxAttempts || timedOut) {
        throw new TransferSlotWaitTimeoutError();
      }
      const delayMs = delayMsForAttempt(attempt);
      onWaitingForSlot?.({ attempt, delayMs });
      await sleepAbortable(delayMs, signal);
    }
  }
}

export class RetryableTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableTransferError";
  }
}

export class TransferStalledError extends RetryableTransferError {
  constructor(message = "The agent stopped responding to this transfer") {
    super(message);
    this.name = "TransferStalledError";
  }
}

export class TransferNotReadyError extends RetryableTransferError {
  constructor(message: string) {
    super(message);
    this.name = "TransferNotReadyError";
  }
}

function isAbortLikeError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof AxiosError) {
    return err.code === "ERR_CANCELED" || err.name === "CanceledError";
  }
  return false;
}

const TRANSIENT_NETWORK_MESSAGE =
  /network error|failed to fetch|err_internet_disconnected|err_network_changed|load failed/i;

export function isRetryableTransferError(err: unknown): boolean {
  if (isAbortLikeError(err)) return false;
  if (err instanceof RetryableTransferError) return true;

  const detail = getAxiosErrorDetail(err);
  if (detail && /timed out waiting for agent to /i.test(detail)) {
    return true;
  }

  const message = err instanceof Error ? err.message : String(err ?? "");
  if (TRANSIENT_NETWORK_MESSAGE.test(message)) {
    return true;
  }

  if (err instanceof AxiosError) {
    if (
      err.code === "ERR_NETWORK" ||
      err.code === "ECONNABORTED" ||
      err.code === "ETIMEDOUT"
    ) {
      return true;
    }
    const status = err.response?.status;
    if (typeof status === "number") {
      if (status >= 500 && status < 600) return true;
      if (status === 408 || status === 425) return true;
    }
    return false;
  }
  return false;
}

export function isTransferAckWaitError(err: unknown): boolean {
  if (err instanceof TransferNotReadyError) return true;
  if (!(err instanceof AxiosError) || err.response?.status !== 408) {
    return false;
  }
  const detail = getAxiosErrorDetail(err);
  return /timed out waiting for agent to /i.test(detail || "");
}

export function ackPollDelayMs(attempt: number): number {
  const n = Math.max(1, Math.floor(attempt));
  return Math.min(
    FILE_TRANSFER_ACK_POLL_MAX_MS,
    FILE_TRANSFER_ACK_POLL_MS * 2 ** (n - 1),
  );
}

export interface TransientRetryInfo {
  attempt: number;
  delayMs: number;
  error: unknown;
  waitingForAgent?: boolean;
}

export interface WithTransientRetryOptions {
  signal?: AbortSignal;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxDurationMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (info: TransientRetryInfo) => void;
  // for complete calls, the agent can take minutes hashing a big file so
  // don't treat that as a stall
  finalizeWaitMs?: number;
}

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  options: WithTransientRetryOptions = {},
): Promise<T> {
  const {
    signal,
    maxAttempts = FILE_TRANSFER_TRANSIENT_RETRY_ATTEMPTS,
    baseDelayMs = FILE_TRANSFER_TRANSIENT_RETRY_BASE_MS,
    maxDelayMs = FILE_TRANSFER_TRANSIENT_RETRY_MAX_MS,
    maxDurationMs = FILE_TRANSFER_TRANSIENT_RETRY_MAX_DURATION_MS,
    isRetryable = isRetryableTransferError,
    onRetry,
    finalizeWaitMs,
  } = options;
  let attempt = 0;
  let firstFailureAt: number | null = null;
  let ackWaitStartedAt: number | null = null;
  let ackPolls = 0;
  let stallNoticeSent = false;

  for (;;) {
    if (signal?.aborted) {
      throw abortError();
    }
    try {
      return await operation();
    } catch (err) {
      if (!isRetryable(err)) {
        throw err;
      }
      if (isTransferAckWaitError(err)) {
        firstFailureAt = null;
        attempt = 0;
        if (ackWaitStartedAt === null) {
          ackWaitStartedAt = Date.now();
        }
        if (finalizeWaitMs !== undefined) {
          if (Date.now() - ackWaitStartedAt >= finalizeWaitMs) throw err;
        } else if (
          Date.now() - ackWaitStartedAt >=
          FILE_TRANSFER_ACK_WAIT_MAX_MS
        ) {
          throw new TransferStalledError();
        }
        if (signal?.aborted) {
          throw abortError();
        }
        if (
          !stallNoticeSent &&
          Date.now() - ackWaitStartedAt >= FILE_TRANSFER_STALL_NOTICE_MS
        ) {
          stallNoticeSent = true;
          onRetry?.({
            attempt: 0,
            delayMs: 0,
            error: err,
            waitingForAgent: true,
          });
        }
        ackPolls += 1;
        await sleepAbortable(ackPollDelayMs(ackPolls), signal);
        continue;
      }
      ackWaitStartedAt = null;
      ackPolls = 0;
      if (firstFailureAt === null) {
        firstFailureAt = Date.now();
      }
      const retryWindowExpired = Date.now() - firstFailureAt >= maxDurationMs;
      attempt += 1;
      if (
        attempt >= FILE_TRANSFER_TRANSIENT_RETRY_HARD_CAP ||
        (attempt >= maxAttempts && retryWindowExpired)
      ) {
        throw err;
      }
      if (signal?.aborted) {
        throw abortError();
      }

      const capped = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = Math.round(capped / 2 + Math.random() * (capped / 2));
      onRetry?.({ attempt, delayMs, error: err });
      await sleepAbortable(delayMs, signal);
    }
  }
}
