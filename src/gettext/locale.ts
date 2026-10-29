import { readonly, shallowRef } from "vue";
import { Quasar } from "quasar";
import en from "quasar/lang/en-US.js";
import ru from "quasar/lang/ru.js";
import it from "quasar/lang/it.js";

const registry = {
  en: {
    label: "English",
    pack: en,
    aliases: ["en", "en-us", "en_us", "en-gb", "en_gb"],
  },
  it: { label: "Italiano", pack: it, aliases: ["it", "it-it", "it_it"] },
  ru: { label: "Русский", pack: ru, aliases: ["ru", "ru-ru", "ru_ru"] },
} as const;

export type AppLocale = keyof typeof registry;
export type LocalePreference = AppLocale | "system";
export const fallbackLocale: AppLocale = "en";
export const supportedLocales = Object.keys(registry) as AppLocale[];
export const locales = supportedLocales.map((value) => ({
  value,
  label: registry[value].label,
}));
export const localeStorageKey = "ui_locale";
export const localePreferenceStorageKey = "ui_locale_preference";

function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* The live locale still works when storage is unavailable. */
  }
}
export function clearStoredLocale(): void {
  try {
    if (typeof window !== "undefined")
      window.localStorage.removeItem(localeStorageKey);
  } catch {
    /* Private/sandboxed contexts may deny storage. */
  }
}
export function normalizeLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  for (const locale of supportedLocales)
    if ((registry[locale].aliases as readonly string[]).includes(raw))
      return locale;
  const base = raw.replace("_", "-").split("-")[0];
  return supportedLocales.includes(base as AppLocale)
    ? (base as AppLocale)
    : null;
}
export function getLocaleFromStorage(): AppLocale | null {
  return normalizeLocale(readStorage(localeStorageKey));
}
export function getLocalePreference(): LocalePreference {
  const raw = readStorage(localePreferenceStorageKey);
  return raw === "system" ? "system" : (normalizeLocale(raw) ?? "system");
}
export function setLocalePreference(preference: LocalePreference): void {
  writeStorage(localePreferenceStorageKey, preference);
}
export function getLocaleFromBrowser(): AppLocale | null {
  return typeof window === "undefined"
    ? null
    : normalizeLocale(window.navigator?.language);
}
export function resolveSystemLocale(): AppLocale {
  return getLocaleFromBrowser() ?? fallbackLocale;
}
export function resolveInitialLocale(): AppLocale {
  const preference = getLocalePreference();
  return preference === "system" ? resolveSystemLocale() : preference;
}
export function getLocaleFromProfile(payload: unknown): AppLocale | null {
  if (!payload || typeof payload !== "object") return null;
  const profile = payload as Record<string, unknown>;
  const candidates = [
    profile.locale,
    profile.language,
    profile.lang,
    profile.ui_locale,
    typeof profile.user === "object" && profile.user
      ? (profile.user as Record<string, unknown>).locale
      : null,
  ];
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }
  return null;
}

const activeLocale = shallowRef<AppLocale>(resolveInitialLocale());
export const currentLocale = readonly(activeLocale);
export async function setLocale(
  locale: unknown,
  options: { persist?: boolean } = {},
): Promise<AppLocale> {
  const next = normalizeLocale(locale) ?? fallbackLocale;
  activeLocale.value = next;
  if (options.persist !== false) writeStorage(localeStorageKey, next);
  if (typeof window !== "undefined" && typeof document !== "undefined")
    Quasar.lang.set(registry[next].pack);
  return next;
}
