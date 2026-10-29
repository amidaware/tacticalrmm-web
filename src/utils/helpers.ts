import { gettext } from "@/gettext";
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

  const notifyOnSuccess = opts.notifyOnSuccess !== false;

  return copyToClipboard(val)
    .then(() => {
      if (notifyOnSuccess) {
        notifySuccess(
          opts.successMessage ?? gettext.$gettext("Copied to clipboard"),
          opts.successTimeout,
        );
      }
    })
    .catch(() => {
      notifyError(
        opts.errorMessage ?? gettext.$gettext("Unable to copy to clipboard."),
      );
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
