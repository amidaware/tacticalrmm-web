import { boot } from "quasar/wrappers";
import { i18n, initLocale } from "@/i18n";

export default boot(async ({ app }) => {
  app.use(i18n);
  // applies html lang + quasar language pack for the detected locale
  await initLocale();
});
