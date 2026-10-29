import { gettext } from "@/gettext";

export type TransferFault =
  | { code: "invalid-content-range"; header: string }
  | { code: "chunk-offset"; expectedOffset: number; receivedOffset: number }
  | { code: "chunk-total"; expectedTotal: number; receivedTotal: number }
  | { code: "range-order"; end: number; start: number }
  | { code: "archive-preparation"; status: string }
  | { code: "archive-timeout" }
  | { code: "memory-limit"; size: number; limit: number }
  | { code: "save-picker" }
  | { code: "reopen-download" }
  | { code: "write-permission" }
  | { code: "upload-rejected" }
  | { code: "upload-session"; status: string };

export function transferFaultMessage(fault: TransferFault): string {
  switch (fault.code) {
    case "invalid-content-range":
      return gettext.$gettext("Invalid Content-Range header: %{header}", {
        header: fault.header,
      });
    case "chunk-offset":
      return gettext.$gettext(
        "Download chunk offset mismatch: expected %{expectedOffset}, received %{receivedOffset}.",
        {
          expectedOffset: fault.expectedOffset,
          receivedOffset: fault.receivedOffset,
        },
      );
    case "chunk-total":
      return gettext.$gettext(
        "Download chunk total mismatch: expected %{expectedTotal}, received %{receivedTotal}.",
        {
          expectedTotal: fault.expectedTotal,
          receivedTotal: fault.receivedTotal,
        },
      );
    case "range-order":
      return gettext.$gettext(
        "Invalid Content-Range: end %{end} is before start %{start}.",
        { end: fault.end, start: fault.start },
      );
    case "archive-preparation":
      return gettext.$gettext("Archive preparation %{status}.", {
        status: fault.status,
      });
    case "archive-timeout":
      return gettext.$gettext(
        "Timed out waiting for the archive to build on the agent.",
      );
    case "memory-limit":
      return gettext.$gettext(
        "This download (%{size} MiB) is too large for this browser, which must buffer it in memory (limit %{limit} MiB). Use Chrome or Edge to stream large downloads directly to disk.",
        { size: fault.size, limit: fault.limit },
      );
    case "save-picker":
      return gettext.$gettext(
        "Could not open the save dialog. Click download again and choose where to save the file.",
      );
    case "reopen-download":
      return gettext.$gettext(
        "Could not reopen the saved download file. Click Resume and allow file access.",
      );
    case "write-permission":
      return gettext.$gettext("Write access to that file was denied.");
    case "upload-rejected":
      return gettext.$gettext("Upload failed");
    case "upload-session":
      return gettext.$gettext("Upload session is %{status}", {
        status: fault.status,
      });
  }
}

/** Local validation/terminal failures are never inferred from translated words. */
export class FatalTransferError extends Error {
  constructor(readonly fault: TransferFault) {
    super(transferFaultMessage(fault));
    this.name = "FatalTransferError";
    Object.defineProperty(this, "message", {
      configurable: true,
      get: () => transferFaultMessage(this.fault),
    });
  }
}

/** Error reported by a terminal backend status; detail remains protocol data. */
export class BackendTransferError extends Error {
  constructor(readonly detail: string) {
    super(detail);
    this.name = "BackendTransferError";
  }
}
