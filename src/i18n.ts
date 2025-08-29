import { createI18n } from "vue-i18n";
import en from "./locales/en";
import it from "./locales/it";

export const locales = [
  { label: "English", value: "en" },
  { label: "Italiano", value: "it" },
];

const savedLocale = localStorage.getItem("locale") || "en";

const i18n = createI18n({
  locale: savedLocale,
  fallbackLocale: "en",
  messages: {
    en,
    it,
  },
});

export default i18n;
