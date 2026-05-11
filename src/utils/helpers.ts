import { copyToClipboard } from "quasar";
import { i18n } from "@/i18n";
import { notifySuccess } from "@/utils/notify";

export function copyOutput(val: string) {
  copyToClipboard(val).then(() => {
    notifySuccess(i18n.global.t("common.messages.copiedToClipboard"));
  });
}
