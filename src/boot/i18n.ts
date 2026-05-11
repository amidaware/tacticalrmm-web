import { boot } from "quasar/wrappers";

import { i18n, resolveInitialLocale, setLocale } from "@/i18n";

export default boot(async ({ app }) => {
  app.use(i18n);
  await setLocale(resolveInitialLocale(), { persist: false });
});
