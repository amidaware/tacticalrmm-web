import {
  FILE_TRANSFER_TAB_SYNC_CHANNEL,
  FILE_TRANSFER_TAB_SYNC_HEARTBEAT_MS,
  FILE_TRANSFER_TAB_SYNC_STALE_MS,
} from "@/constants/fileTransfer";

export type TransferReleaseReason =
  | "pause"
  | "cancel"
  | "complete"
  | "fail"
  | "unmount";

export function isTerminalTransferRelease(
  reason: TransferReleaseReason,
): boolean {
  return reason === "complete" || reason === "fail";
}

export function claimShouldYield(
  localTabId: string,
  localTs: number,
  remoteTabId: string,
  remoteTs: number,
): boolean {
  if (remoteTs !== localTs) {
    return remoteTs < localTs;
  }
  return remoteTabId < localTabId;
}

export type TransferTabSyncEvent =
  | { type: "remote_claim"; key: string; tabId: string }
  | {
      type: "remote_release";
      key: string;
      tabId: string;
      reason: TransferReleaseReason;
    }
  | { type: "remote_change" };

type TabSyncMessage =
  | { type: "claim"; key: string; tabId: string; ts: number }
  | { type: "heartbeat"; key: string; tabId: string; ts: number }
  | {
      type: "release";
      key: string;
      tabId: string;
      reason: TransferReleaseReason;
      ts: number;
    }
  | { type: "query"; tabId: string; ts: number }
  | { type: "announce"; key: string; tabId: string; ts: number };

interface RemoteClaim {
  tabId: string;
  expiresAt: number;
}

export interface TransferTabSync {
  readonly tabId: string;
  tryClaim(key: string): boolean;
  rekeyClaim(oldKey: string, newKey: string): boolean;
  release(key: string, reason: TransferReleaseReason): void;
  releaseAll(reason?: TransferReleaseReason): void;
  isRemotelyOwned(key: string): boolean;
  query(): void;
  close(): void;
}

export function transferClaimKey(
  agentId: string,
  opts: { sessionId?: string | null; queueId: string },
): string {
  if (opts.sessionId) {
    return `${agentId}:${opts.sessionId}`;
  }
  return `${agentId}:local:${opts.queueId}`;
}

function newTabId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTransferTabSync(
  onEvent?: (event: TransferTabSyncEvent) => void,
): TransferTabSync {
  const tabId = newTabId();
  const localClaims = new Set<string>();
  const localClaimTs = new Map<string, number>();
  const remoteClaims = new Map<string, RemoteClaim>();
  let closed = false;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const channel: BroadcastChannel | null =
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(FILE_TRANSFER_TAB_SYNC_CHANNEL)
      : null;

  function emit(event: TransferTabSyncEvent): void {
    onEvent?.(event);
  }

  function pruneRemote(): void {
    const now = Date.now();
    let changed = false;
    for (const [key, claim] of remoteClaims) {
      if (claim.expiresAt <= now) {
        remoteClaims.delete(key);
        changed = true;
      }
    }
    if (changed) {
      emit({ type: "remote_change" });
    }
  }

  function post(msg: TabSyncMessage): void {
    if (!channel || closed) return;
    try {
      channel.postMessage(msg);
    } catch {
      // Channel may be closed concurrently.
    }
  }

  function ensureHeartbeat(): void {
    if (heartbeatTimer || !channel || closed) return;
    heartbeatTimer = setInterval(() => {
      if (closed || localClaims.size === 0) {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        return;
      }
      const ts = Date.now();
      for (const key of localClaims) {
        post({ type: "heartbeat", key, tabId, ts });
      }
    }, FILE_TRANSFER_TAB_SYNC_HEARTBEAT_MS);
  }

  function stopHeartbeatIfIdle(): void {
    if (localClaims.size > 0 || !heartbeatTimer) return;
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function setRemoteClaim(key: string, ownerTabId: string, ts: number): void {
    if (ownerTabId === tabId) return;
    const prev = remoteClaims.get(key);
    remoteClaims.set(key, {
      tabId: ownerTabId,
      expiresAt: ts + FILE_TRANSFER_TAB_SYNC_STALE_MS,
    });
    if (!prev || prev.tabId !== ownerTabId) {
      emit({ type: "remote_claim", key, tabId: ownerTabId });
      emit({ type: "remote_change" });
    }
  }

  function considerRemoteClaim(
    key: string,
    ownerTabId: string,
    ts: number,
  ): void {
    if (ownerTabId === tabId) return;
    if (localClaims.has(key)) {
      const localTs = localClaimTs.get(key) ?? 0;
      if (!claimShouldYield(tabId, localTs, ownerTabId, ts)) {
        post({
          type: "announce",
          key,
          tabId,
          ts: localTs || Date.now(),
        });
        return;
      }
      localClaims.delete(key);
      localClaimTs.delete(key);
      stopHeartbeatIfIdle();
      setRemoteClaim(key, ownerTabId, ts);
      return;
    }
    setRemoteClaim(key, ownerTabId, ts);
  }

  function clearRemoteClaim(
    key: string,
    ownerTabId: string,
    reason: TransferReleaseReason,
  ): void {
    const prev = remoteClaims.get(key);
    if (!prev) return;
    if (prev.tabId !== ownerTabId) return;
    remoteClaims.delete(key);
    emit({ type: "remote_release", key, tabId: ownerTabId, reason });
    emit({ type: "remote_change" });
  }

  function onMessage(event: MessageEvent<TabSyncMessage>): void {
    if (closed) return;
    const msg = event.data;
    if (!msg || typeof msg !== "object" || !("type" in msg)) return;
    if ("tabId" in msg && msg.tabId === tabId) return;

    switch (msg.type) {
      case "claim":
      case "heartbeat":
      case "announce":
        considerRemoteClaim(msg.key, msg.tabId, msg.ts || Date.now());
        break;
      case "release":
        if (msg.reason === "cancel" || isTerminalTransferRelease(msg.reason)) {
          remoteClaims.delete(msg.key);
          emit({
            type: "remote_release",
            key: msg.key,
            tabId: msg.tabId,
            reason: msg.reason,
          });
          emit({ type: "remote_change" });
        } else {
          clearRemoteClaim(msg.key, msg.tabId, msg.reason);
        }
        break;
      case "query": {
        const ts = Date.now();
        for (const key of localClaims) {
          post({ type: "announce", key, tabId, ts });
        }
        break;
      }
      default:
        break;
    }
  }

  if (channel) {
    channel.onmessage = onMessage;
  }

  function isRemotelyOwned(key: string): boolean {
    pruneRemote();
    const remote = remoteClaims.get(key);
    return !!remote && remote.expiresAt > Date.now();
  }

  function tryClaim(key: string): boolean {
    if (!channel) {
      const ts = Date.now();
      localClaims.add(key);
      localClaimTs.set(key, ts);
      return true;
    }
    pruneRemote();
    if (isRemotelyOwned(key) && !localClaims.has(key)) {
      return false;
    }
    const ts = Date.now();
    localClaims.add(key);
    localClaimTs.set(key, ts);
    remoteClaims.delete(key);
    post({ type: "claim", key, tabId, ts });
    ensureHeartbeat();
    return true;
  }

  function rekeyClaim(oldKey: string, newKey: string): boolean {
    if (oldKey === newKey) {
      return localClaims.has(newKey) || tryClaim(newKey);
    }
    if (!localClaims.has(oldKey)) {
      return tryClaim(newKey);
    }
    if (!channel) {
      const ts = localClaimTs.get(oldKey) ?? Date.now();
      localClaims.delete(oldKey);
      localClaimTs.delete(oldKey);
      localClaims.add(newKey);
      localClaimTs.set(newKey, ts);
      return true;
    }
    pruneRemote();
    if (isRemotelyOwned(newKey) && !localClaims.has(newKey)) {
      return false;
    }
    const ts = Date.now();
    localClaims.delete(oldKey);
    localClaimTs.delete(oldKey);
    localClaims.add(newKey);
    localClaimTs.set(newKey, ts);
    remoteClaims.delete(newKey);
    post({ type: "release", key: oldKey, tabId, reason: "pause", ts });
    post({ type: "claim", key: newKey, tabId, ts });
    ensureHeartbeat();
    return true;
  }

  function release(key: string, reason: TransferReleaseReason): void {
    const wasLocal = localClaims.delete(key);
    localClaimTs.delete(key);
    stopHeartbeatIfIdle();
    if (wasLocal || reason === "cancel" || isTerminalTransferRelease(reason)) {
      post({ type: "release", key, tabId, reason, ts: Date.now() });
    }
  }

  function releaseAll(reason: TransferReleaseReason = "unmount"): void {
    const keys = [...localClaims];
    localClaims.clear();
    localClaimTs.clear();
    stopHeartbeatIfIdle();
    const ts = Date.now();
    for (const key of keys) {
      post({ type: "release", key, tabId, reason, ts });
    }
  }

  function query(): void {
    if (!channel) return;
    post({ type: "query", tabId, ts: Date.now() });
  }

  function close(): void {
    if (closed) return;
    closed = true;
    releaseAll("unmount");
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (channel) {
      channel.onmessage = null;
      try {
        channel.close();
      } catch {
        // ignore
      }
    }
  }

  return {
    tabId,
    tryClaim,
    rekeyClaim,
    release,
    releaseAll,
    isRemotelyOwned,
    query,
    close,
  };
}
