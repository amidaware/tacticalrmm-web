import { boot } from "quasar/wrappers";
import { useBrandingStore } from "@/core/branding/store";

export default boot(async () => {
  await useBrandingStore().refresh();
});
