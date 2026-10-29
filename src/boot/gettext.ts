import { boot } from "quasar/wrappers";
import { gettext } from "@/gettext";
import { resolveInitialLocale, setLocale } from "@/gettext/locale";

export default boot(async ({ app }) => {
  app.use(gettext);
  await setLocale(resolveInitialLocale(), { persist: false });
});
