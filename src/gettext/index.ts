import { createGettext } from "vue3-gettext";
import translations from "./generated/translations.json";
import { watch } from "vue";
import { currentLocale, locales } from "./locale";

// One application instance, also usable in ordinary JS/TS before authentication.
export const gettext = createGettext({
  availableLanguages: Object.fromEntries(
    locales.map(({ value, label }) => [value, label]),
  ),
  defaultLanguage: currentLocale.value,
  sourceCodeLanguage: "en",
  translations,
  silent: true,
});
const unregister = watch(
  currentLocale,
  (locale) => {
    gettext.current = locale;
  },
  { flush: "sync" },
);
if (import.meta.hot) import.meta.hot.dispose(unregister);
