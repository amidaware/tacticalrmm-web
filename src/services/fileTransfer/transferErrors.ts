import { gettext } from "@/gettext";
import { AxiosError } from "axios";
import { getAxiosErrorDetail } from "@/utils/apiError";
import { BackendTransferError } from "./transferFaults";

/** Machine classification must survive a UI locale change. */
export class TransferIntegrityError extends Error {
  readonly code = "integrity";

  constructor() {
    super(
      gettext.$gettext("Download integrity check failed (SHA-256 mismatch)."),
    );
    this.name = "TransferIntegrityError";
  }
}

export function isTransferIntegrityError(err: unknown): boolean {
  if (err instanceof TransferIntegrityError) return true;
  if (err instanceof BackendTransferError)
    return /integrity check failed|sha-256 mismatch/i.test(err.detail);
  return (
    err instanceof AxiosError &&
    /integrity check failed|sha-256 mismatch/i.test(
      getAxiosErrorDetail(err) ?? "",
    )
  );
}
