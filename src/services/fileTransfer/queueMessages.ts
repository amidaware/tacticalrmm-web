import { gettext } from "@/gettext";
import { AxiosError } from "axios";
import type {
  TransferMessageCode,
  TransferMessageState,
  TransferRecoveryHint,
} from "@/types/filebrowser";
import { getAxiosErrorDetail } from "@/utils/apiError";
import { formatFileBrowserApiErrorMessage } from "@/utils/filebrowser";
import {
  isTransferSessionLimitError,
  TransferSlotWaitTimeoutError,
} from "./sessionLimit";
import { isTransferIntegrityError } from "./transferErrors";
import { FatalTransferError, transferFaultMessage } from "./transferFaults";
import { formatLiteralFileBrowserError } from "@/utils/filebrowser";

/** Codes are internal states. Legacy errorMessage is opaque text, never a key. */
export function transferItemMessage(
  item: TransferMessageState,
): string | undefined {
  switch (item.messageCode) {
    case "fatal":
      return item.fault
        ? formatLiteralFileBrowserError(transferFaultMessage(item.fault))
        : item.errorMessage;
    case "waiting-slot":
      return gettext.$gettext(
        "Waiting for a free transfer slot. All slots are in use, possibly by other users; cancelling one of your paused transfers frees one.",
      );
    case "waiting-agent":
      return gettext.$gettext("Waiting for the agent…");
    case "reconnecting":
      return gettext.$gettext("Connection interrupted — reconnecting…");
    case "connection-lost":
      return gettext.$gettext("Connection lost. Click Resume to continue.");
    case "file-permission":
      return gettext.$gettext(
        "File access was not allowed. Click Resume and allow access to continue the download.",
      );
    case "select-upload-file":
      return gettext.$gettext(
        "Select the original file to resume this upload.",
      );
    case "download-integrity":
      return gettext.$gettext(
        "Download failed: file integrity check did not match.",
      );
    case "upload-integrity":
      return gettext.$gettext(
        "Upload failed: file integrity check did not match.",
      );
    case "download-failed":
      return gettext.$gettext("Download failed.");
    case "upload-failed":
      return gettext.$gettext("Upload failed.");
    case "network":
      return gettext.$gettext(
        "Unable to reach the server. Check your connection.",
      );
    case "request-cancelled":
      return gettext.$gettext("Request was cancelled.");
    case "forbidden":
      return gettext.$gettext(
        "You do not have permission to use the file browser.",
      );
    case "rate-limit":
      return gettext.$gettext("Too many requests. Try again later.");
    case "session-limit":
      return gettext.$gettext(
        "Too many concurrent file transfers. All slots are in use, possibly by other users; cancel one of your paused transfers or try again later.",
      );
    case "slot-timeout":
      return gettext.$gettext(
        "No transfer slot became available. All slots are in use, possibly by other users; cancel one of your paused transfers or try again later.",
      );
    case "non-resumable":
      return gettext.$gettext(
        "This download cannot be resumed here. Cancel to free the session.",
      );
    case "needs-destination":
      return gettext.$gettext("Select the existing download file to resume.");
    case "needs-permission":
      return gettext.$gettext(
        "Click Resume and allow file access to continue.",
      );
    case "archive-preparing":
      return gettext.$gettext(
        "Archive was still preparing. Resume to continue.",
      );
    case "backend":
      return formatFileBrowserApiErrorMessage(item.errorDetail ?? "");
    default:
      return item.errorMessage;
  }
}

export function setTransferMessage(
  item: TransferMessageState,
  code?: TransferMessageCode,
  detail?: string,
  fault?: TransferMessageState["fault"],
): void {
  item.messageCode = code;
  item.errorDetail = detail;
  item.fault = fault;
  item.errorMessage = undefined;
  // Keep a snapshot for existing integrations; rendering and branching use code.
  item.errorMessage = transferItemMessage(item);
}

export function recoveryMessageCode(
  hint: TransferRecoveryHint,
): TransferMessageCode | undefined {
  switch (hint) {
    case "non_resumable":
      return "non-resumable";
    case "needs_destination":
      return "needs-destination";
    case "needs_permission":
      return "needs-permission";
    case "archive_preparing":
      return "archive-preparing";
    default:
      return undefined;
  }
}

export function setTransferFailureMessage(
  item: TransferMessageState,
  err: unknown,
  direction: "upload" | "download",
): void {
  if (err instanceof FatalTransferError) {
    setTransferMessage(item, "fatal", undefined, err.fault);
    return;
  }
  if (isTransferIntegrityError(err)) {
    setTransferMessage(
      item,
      direction === "upload" ? "upload-integrity" : "download-integrity",
    );
    return;
  }
  if (err instanceof TransferSlotWaitTimeoutError && err.defaultMessage) {
    setTransferMessage(item, "slot-timeout");
    return;
  }
  if (err instanceof TransferSlotWaitTimeoutError) {
    setTransferMessage(item);
    item.errorMessage = err.message;
    return;
  }
  if (isTransferSessionLimitError(err)) {
    setTransferMessage(item, "session-limit");
    return;
  }
  if (err instanceof AxiosError) {
    const detail = getAxiosErrorDetail(err);
    if (err.response?.status === 429) {
      setTransferMessage(
        item,
        detail && detail.length < 200 && !detail.includes("<")
          ? "backend"
          : "rate-limit",
        detail ?? undefined,
      );
      return;
    }
    if (err.code === "ERR_NETWORK" || err.code === "ERR_CANCELED") {
      setTransferMessage(
        item,
        err.code === "ERR_NETWORK" ? "network" : "request-cancelled",
      );
      return;
    }
    if (detail) {
      setTransferMessage(item, "backend", detail);
      return;
    }
    if (err.response?.status === 403) {
      setTransferMessage(item, "forbidden");
      return;
    }
  } else if (err instanceof Error && err.message.trim()) {
    setTransferMessage(item, "backend", err.message);
    return;
  }
  setTransferMessage(
    item,
    direction === "upload" ? "upload-failed" : "download-failed",
  );
}
