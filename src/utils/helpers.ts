import { copyToClipboard } from "quasar";
import { notifyError, notifySuccess } from "@/utils/notify";

export interface CopyOutputOptions {
  successMessage?: string;
  errorMessage?: string;
  successTimeout?: number;
  notifyOnSuccess?: boolean;
}

export function copyOutput(
  val: string,
  options: CopyOutputOptions | string = {},
): Promise<void> {
  const opts: CopyOutputOptions =
    typeof options === "string" ? { successMessage: options } : options;

  const successMessage = opts.successMessage ?? "Copied to clipboard";
  const errorMessage = opts.errorMessage ?? "Unable to copy to clipboard.";
  const notifyOnSuccess = opts.notifyOnSuccess !== false;

  return copyToClipboard(val)
    .then(() => {
      if (notifyOnSuccess) {
        notifySuccess(successMessage, opts.successTimeout);
      }
    })
    .catch(() => {
      notifyError(errorMessage);
    });
}

export function getCenteredWindowOptions(width: number, height: number) {
  const left =
    typeof window === "undefined"
      ? 0
      : Math.round((window.screen.width - width) / 2);

  const top =
    typeof window === "undefined"
      ? 0
      : Math.round((window.screen.height - height) / 2);

  return {
    popup: true,
    scrollbars: false,
    location: false,
    status: false,
    toolbar: false,
    menubar: false,
    width,
    height,
    left,
    top,
  };
}
