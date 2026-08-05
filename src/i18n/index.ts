import { createI18n } from "vue-i18n";
import { Quasar } from "quasar";
import quasarEnUS from "quasar/lang/en-US";
import quasarIt from "quasar/lang/it";
import quasarRu from "quasar/lang/ru";

import en from "@/i18n/en";
import it from "@/i18n/it";
import ru from "@/i18n/ru";

const localeRegistry = {
  en: {
    label: "English",
    messages: en,
    quasarPack: quasarEnUS,
    aliases: ["en", "en-us", "en_us", "en-gb", "en_gb"],
  },
  it: {
    label: "Italiano",
    messages: it,
    quasarPack: quasarIt,
    aliases: ["it", "it-it", "it_it"],
  },
  ru: {
    label: "Русский",
    messages: ru,
    quasarPack: quasarRu,
    aliases: ["ru", "ru-ru", "ru_ru"],
  },
} as const;

export type AppLocale = keyof typeof localeRegistry;
export const supportedLocales = Object.keys(localeRegistry) as AppLocale[];
export const locales = supportedLocales.map((value) => ({
  value,
  label: localeRegistry[value].label,
}));

export const fallbackLocale: AppLocale = "en";
export const localeStorageKey = "ui_locale";
export const localePreferenceStorageKey = "ui_locale_preference";
export type LocalePreference = AppLocale | "system";

const localeAliases = supportedLocales.reduce<Record<string, AppLocale>>(
  (acc, locale) => {
    for (const alias of localeRegistry[locale].aliases) {
      acc[alias.toLowerCase()] = locale;
    }
    return acc;
  },
  {},
);

const messages = supportedLocales.reduce<Record<AppLocale, typeof en>>(
  (acc, locale) => {
    acc[locale] = localeRegistry[locale].messages as typeof en;
    return acc;
  },
  {} as Record<AppLocale, typeof en>,
);

const quasarLanguagePacks = supportedLocales.reduce<
  Record<AppLocale, typeof quasarEnUS>
>(
  (acc, locale) => {
    acc[locale] = localeRegistry[locale].quasarPack;
    return acc;
  },
  {} as Record<AppLocale, typeof quasarEnUS>,
);

function isClientSide(): boolean {
  return typeof window !== "undefined";
}

export function normalizeLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") {
    return null;
  }

  const raw = value.trim().toLowerCase();
  if (!raw) {
    return null;
  }

  if (localeAliases[raw]) {
    return localeAliases[raw];
  }

  const normalized = raw.replace("_", "-");
  if (localeAliases[normalized]) {
    return localeAliases[normalized];
  }

  const base = normalized.split("-")[0];
  return (base && localeAliases[base]) || null;
}

export function getLocaleFromStorage(): AppLocale | null {
  if (!isClientSide()) {
    return null;
  }

  return normalizeLocale(window.localStorage.getItem(localeStorageKey));
}

export function getLocalePreference(): LocalePreference {
  if (!isClientSide()) {
    return "system";
  }

  const raw = window.localStorage.getItem(localePreferenceStorageKey);
  if (raw === "system") {
    return "system";
  }

  const normalized = normalizeLocale(raw);
  return normalized ?? "system";
}

export function setLocalePreference(preference: LocalePreference): void {
  if (!isClientSide()) {
    return;
  }

  window.localStorage.setItem(localePreferenceStorageKey, preference);
}

export function resolveSystemLocale(): AppLocale {
  return getLocaleFromBrowser() ?? fallbackLocale;
}

export function getLocaleFromBrowser(): AppLocale | null {
  if (!isClientSide()) {
    return null;
  }

  return normalizeLocale(window.navigator.language);
}

export function getLocaleFromProfile(payload: unknown): AppLocale | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

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
    const normalized = normalizeLocale(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveInitialLocale(): AppLocale {
  const preference = getLocalePreference();

  if (preference !== "system") {
    return preference;
  }

  return resolveSystemLocale();
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale,
  messages,
});

function applyLocale(locale: AppLocale): void {
  const target = i18n.global.locale as unknown;

  if (
    target &&
    typeof target === "object" &&
    "value" in target &&
    typeof (target as { value: unknown }).value === "string"
  ) {
    (target as { value: string }).value = locale;
    return;
  }

  (i18n.global as unknown as { locale: string }).locale = locale;
}

export async function setLocale(
  locale: unknown,
  options: { persist?: boolean } = {},
): Promise<AppLocale> {
  const nextLocale = normalizeLocale(locale) ?? fallbackLocale;
  const { persist = true } = options;

  applyLocale(nextLocale);

  if (isClientSide() && persist) {
    window.localStorage.setItem(localeStorageKey, nextLocale);
  }

  await Quasar.lang.set(quasarLanguagePacks[nextLocale]);
  return nextLocale;
}
