import { copyToClipboard } from "quasar";
import { i18n } from "@/i18n";
import { notifySuccess } from "@/utils/notify";

export function copyOutput(val: string) {
  copyToClipboard(val).then(() => {
    notifySuccess(i18n.global.t("common.messages.copiedToClipboard"));
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
