/// <reference lib="webworker" />
// Incremental SHA-256 off the main thread. Messages are applied strictly in
// arrival order, including Blob reads, so the digest matches the byte order.
import { sha256 } from "js-sha256";

import type { Sha256WorkerRequest, Sha256WorkerResponse } from "./hash";

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const hasher = sha256.create();
let queue: Promise<void> = Promise.resolve();
let failed: string | null = null;

async function handle(msg: Sha256WorkerRequest): Promise<void> {
  if (msg.type === "bytes") {
    hasher.update(new Uint8Array(msg.bytes));
  } else if (msg.type === "blob") {
    const { blob, blockSize } = msg;
    for (let pos = 0; pos < blob.size; pos += blockSize) {
      const part = blob.slice(pos, Math.min(pos + blockSize, blob.size));
      hasher.update(new Uint8Array(await part.arrayBuffer()));
    }
  } else {
    const reply: Sha256WorkerResponse = failed
      ? { type: "error", message: failed }
      : { type: "hex", hex: hasher.hex() };
    ctx.postMessage(reply);
  }
}

ctx.onmessage = (event: MessageEvent<Sha256WorkerRequest>) => {
  const msg = event.data;
  queue = queue
    .then(() => (failed && msg.type !== "hex" ? undefined : handle(msg)))
    .catch((err) => {
      failed = err instanceof Error ? err.message : String(err);
    });
};
