import { copyToClipboard } from "quasar";
import { notifySuccess } from "@/utils/notify";

export function copyOutput(val: string) {
  copyToClipboard(val).then(() => {
    notifySuccess("Copied to clipboard");
  });
}


// Generate a UUID
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}