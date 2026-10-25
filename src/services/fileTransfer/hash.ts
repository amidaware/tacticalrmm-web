import { sha256 } from "js-sha256";

export type Sha256WorkerRequest =
  | { type: "bytes"; bytes: ArrayBuffer | Uint8Array }
  | { type: "blob"; blob: Blob; blockSize: number }
  | { type: "hex" };

export type Sha256WorkerResponse =
  | { type: "hex"; hex: string }
  | { type: "error"; message: string };

const DEFAULT_HASH_BLOCK_SIZE = 8 * 1024 * 1024;

/**
 * Incremental SHA-256. Updates are queued and applied in call order; `hex()`
 * waits for them. Hashing runs in a Web Worker when one can be started so a
 * multi-GB transfer does not block the UI, and on the main thread otherwise.
 */
export interface Sha256Hasher {
  update(bytes: ArrayBuffer | Uint8Array): void;
  updateBlob(blob: Blob, blockSize?: number): void;
  hex(): Promise<string>;
  dispose(): void;
}

class WorkerSha256Hasher implements Sha256Hasher {
  private pending: {
    resolve: (hex: string) => void;
    reject: (err: Error) => void;
  } | null = null;

  constructor(private worker: Worker | null) {
    worker!.onmessage = (event: MessageEvent<Sha256WorkerResponse>) => {
      const msg = event.data;
      const pending = this.pending;
      this.pending = null;
      this.dispose();
      if (!pending) return;
      if (msg.type === "hex") pending.resolve(msg.hex);
      else pending.reject(new Error(`SHA-256 failed: ${msg.message}`));
    };
    worker!.onerror = (event) => {
      const pending = this.pending;
      this.pending = null;
      this.dispose();
      pending?.reject(new Error(`SHA-256 worker failed: ${event.message}`));
    };
  }

  private post(msg: Sha256WorkerRequest): void {
    if (!this.worker) throw new Error("SHA-256 hasher already released");
    this.worker.postMessage(msg);
  }

  update(bytes: ArrayBuffer | Uint8Array): void {
    this.post({ type: "bytes", bytes });
  }

  updateBlob(blob: Blob, blockSize = DEFAULT_HASH_BLOCK_SIZE): void {
    this.post({ type: "blob", blob, blockSize });
  }

  hex(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      try {
        this.post({ type: "hex" });
      } catch (err) {
        this.pending = null;
        reject(err);
      }
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

class MainThreadSha256Hasher implements Sha256Hasher {
  private hasher = sha256.create();
  private queue: Promise<void> = Promise.resolve();

  update(bytes: ArrayBuffer | Uint8Array): void {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.queue = this.queue.then(() => {
      this.hasher.update(view);
    });
  }

  updateBlob(blob: Blob, blockSize = DEFAULT_HASH_BLOCK_SIZE): void {
    this.queue = this.queue.then(async () => {
      for (let pos = 0; pos < blob.size; pos += blockSize) {
        const part = blob.slice(pos, Math.min(pos + blockSize, blob.size));
        this.hasher.update(new Uint8Array(await part.arrayBuffer()));
      }
    });
  }

  async hex(): Promise<string> {
    await this.queue;
    return this.hasher.hex();
  }

  dispose(): void {
    this.queue = Promise.resolve();
  }
}

export function createSha256Hasher(): Sha256Hasher {
  if (typeof Worker !== "undefined") {
    try {
      return new WorkerSha256Hasher(
        new Worker(new URL("./sha256.worker.ts", import.meta.url), {
          type: "module",
        }),
      );
    } catch {
      // Fall back to the main thread (worker blocked by CSP, old browser).
    }
  }
  return new MainThreadSha256Hasher();
}

export async function hashBlobPrefix(
  blob: Blob,
  endOffset: number,
  blockSize: number,
  hasher: Sha256Hasher,
): Promise<void> {
  hasher.updateBlob(blob.slice(0, endOffset), blockSize);
}

export async function hashFilePrefix(
  file: File,
  endOffset: number,
  blockSize: number,
  hasher: Sha256Hasher,
): Promise<void> {
  await hashBlobPrefix(file, endOffset, blockSize, hasher);
}

export function hashBytes(
  hasher: Sha256Hasher,
  bytes: ArrayBuffer | Uint8Array,
): void {
  hasher.update(bytes);
}
