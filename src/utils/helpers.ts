import { copyToClipboard } from "quasar";
import { notifySuccess } from "@/utils/notify";

export function copyOutput(val: string) {
  copyToClipboard(val).then(() => {
    notifySuccess("Copied to clipboard");
  });
}

let remoteOpenMode = "window";

export function setRemoteOpenMode(mode: string) {
  remoteOpenMode = mode;
}

// popup window or plain new tab, depending on the user's preference
export function getRemoteWindowOptions(width: number, height: number) {
  return remoteOpenMode === "tab"
    ? {}
    : getCenteredWindowOptions(width, height);
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
