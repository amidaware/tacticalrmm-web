import type { TransferAbortIntent } from "@/types/fileTransfer";
import { getFileBrowserErrorMessage } from "@/utils/filebrowser";
import {
  transferClaimKey,
  type TransferReleaseReason,
  type TransferTabSync,
} from "./transferTabSync";

const INTEGRITY_ERROR_RE = /integrity check failed|sha-256 mismatch/i;

export type TransferDirection = "upload" | "download";

export function claimKeyForTransfer(
  agentId: string,
  item: { id: string; sessionId?: string },
): string {
  return transferClaimKey(agentId, {
    sessionId: item.sessionId,
    queueId: item.id,
  });
}

export function itemMatchesTransferClaimKey(
  agentId: string,
  item: { id: string; sessionId?: string },
  key: string,
): boolean {
  if (claimKeyForTransfer(agentId, item) === key) {
    return true;
  }
  return transferClaimKey(agentId, { queueId: item.id }) === key;
}

export function releaseTransferClaim(
  claimKeys: Map<string, string>,
  itemId: string,
  reason: TransferReleaseReason,
  tabSync: TransferTabSync,
): void {
  const key = claimKeys.get(itemId);
  if (!key) return;
  claimKeys.delete(itemId);
  tabSync.release(key, reason);
}

export function rekeyOrClaimTransferSession(opts: {
  agentId: string;
  itemId: string;
  sessionId: string;
  claimKeys: Map<string, string>;
  tabSync: TransferTabSync;
}): void {
  const prevKey = opts.claimKeys.get(opts.itemId);
  const nextKey = transferClaimKey(opts.agentId, {
    sessionId: opts.sessionId,
    queueId: opts.itemId,
  });
  if (prevKey && prevKey !== nextKey) {
    if (opts.tabSync.rekeyClaim(prevKey, nextKey)) {
      opts.claimKeys.set(opts.itemId, nextKey);
    }
  } else if (!prevKey) {
    if (opts.tabSync.tryClaim(nextKey)) {
      opts.claimKeys.set(opts.itemId, nextKey);
    }
  }
}

export function setTransferAbortMode(
  intents: Map<string, TransferAbortIntent>,
  controllers: Map<string, AbortController>,
  id: string,
  mode: TransferAbortIntent["mode"],
): void {
  const intent = intents.get(id);
  if (intent) intent.mode = mode;
  controllers.get(id)?.abort();
}

export function isTransferIntegrityError(err: unknown): boolean {
  return err instanceof Error && INTEGRITY_ERROR_RE.test(err.message);
}

export function transferIntegrityFailMessage(
  direction: TransferDirection,
): string {
  return direction === "upload"
    ? "Upload failed: file integrity check did not match."
    : "Download failed: file integrity check did not match.";
}

export function transferFailureErrorMessage(
  err: unknown,
  direction: TransferDirection,
): string {
  if (isTransferIntegrityError(err)) {
    return transferIntegrityFailMessage(direction);
  }
  return getFileBrowserErrorMessage(
    err,
    direction === "upload" ? "Upload failed." : "Download failed.",
  );
}
