import { AxiosError } from "axios";

const DEFAULT_DETAIL_KEYS = ["detail", "message", "error"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) &&
    !(typeof Blob !== "undefined" && value instanceof Blob)
  );
}

function decodeArrayBufferAsText(data: ArrayBuffer): string | undefined {
  try {
    const text = new TextDecoder("utf-8").decode(data).trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function detailFromDecodedBody(
  text: string,
  keys: readonly string[],
): string | undefined {
  if (!text) return undefined;

  const parsed = tryParseJson(text);
  if (typeof parsed === "string" && parsed.trim()) {
    return parsed.trim();
  }
  if (isPlainObject(parsed)) {
    for (const key of keys) {
      const found = firstStringFromUnknown(parsed[key]);
      if (found) return found;
    }
  }
  return text;
}

function firstStringFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.trim()) {
        return entry.trim();
      }
      if (isPlainObject(entry)) {
        for (const nested of Object.values(entry)) {
          if (typeof nested === "string" && nested.trim()) {
            return nested.trim();
          }
        }
      }
    }
  }
  return undefined;
}

export function getAxiosErrorDetail(
  err: unknown,
  options?: { keys?: readonly string[] },
): string | undefined {
  const keys = options?.keys ?? DEFAULT_DETAIL_KEYS;

  if (err instanceof AxiosError) {
    const data = err.response?.data;

    if (typeof data === "string" && data.trim()) {
      return data.trim();
    }

    if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
      const text = decodeArrayBufferAsText(data);
      if (text) {
        const fromBody = detailFromDecodedBody(text, keys);
        if (fromBody) return fromBody;
      }
    }

    if (typeof Uint8Array !== "undefined" && data instanceof Uint8Array) {
      const text = decodeArrayBufferAsText(
        data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ) as ArrayBuffer,
      );
      if (text) {
        const fromBody = detailFromDecodedBody(text, keys);
        if (fromBody) return fromBody;
      }
    }

    if (isPlainObject(data)) {
      for (const key of keys) {
        const found = firstStringFromUnknown(data[key]);
        if (found) return found;
      }
    }

    if (
      err.message &&
      err.message.trim() &&
      !/^Request failed with status code \d+$/i.test(err.message)
    ) {
      return err.message.trim();
    }

    return undefined;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof err === "string" && err.trim()) {
    return err.trim();
  }
  return undefined;
}
