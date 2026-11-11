/*
 * Internationalization (i18n) for the Tactical RMM dashboard.
 *
 * Translations live in src/i18n/locales/<locale>/<namespace>.json and are
 * loaded automatically. Each JSON file becomes a top level namespace, so
 * src/i18n/locales/pt-BR/agents.json is accessed as t("agents.someKey").
 *
 * To add a new language:
 *   1. Copy src/i18n/locales/en-US to src/i18n/locales/<new-locale>
 *      and translate the values (keys must stay the same).
 *   2. Add an entry to SUPPORTED_LOCALES below (with the matching Quasar
 *      language pack name from node_modules/quasar/lang).
 *   3. Add the locale code to the LANGUAGE_CHOICES in the backend
 *      (api/tacticalrmm/accounts/models.py).
 * Missing keys automatically fall back to English (en-US).
 */

import { createI18n } from "vue-i18n";
import { Quasar } from "quasar";
import type { QuasarLanguage } from "quasar";

export interface LocaleOption {
  value: string;
  label: string;
  quasarLang: string;
}

export const DEFAULT_LOCALE = "en-US";
const STORAGE_KEY = "trmm_locale";

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { value: "en-US", label: "English", quasarLang: "en-US" },
  { value: "pt-BR", label: "Português (Brasil)", quasarLang: "pt-BR" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Messages = Record<string, Record<string, any>>;

function loadMessages(): Messages {
  // vite 2: globEager (vite 3+ would be import.meta.glob(..., { eager: true }))
  const modules = import.meta.globEager("./locales/*/*.json") as Record<
    string,
    { default: Record<string, unknown> }
  >;

  const messages: Messages = {};
  for (const path in modules) {
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
    if (!match) continue;
    const [, locale, namespace] = match;
    if (!messages[locale]) messages[locale] = {};
    messages[locale][namespace] = modules[path].default;
  }
  return messages;
}

function isSupported(locale: string | null | undefined): boolean {
  return !!locale && SUPPORTED_LOCALES.some((l) => l.value === locale);
}

// best match for a browser locale like "pt", "pt-BR" or "pt-PT"
function matchLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  if (isSupported(locale)) return locale;
  const lang = locale.split("-")[0].toLowerCase();
  const found = SUPPORTED_LOCALES.find(
    (l) => l.value.split("-")[0].toLowerCase() === lang,
  );
  return found ? found.value : null;
}

function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function detectInitialLocale(): string {
  return (
    matchLocale(readStoredLocale()) ||
    matchLocale(typeof navigator !== "undefined" ? navigator.language : null) ||
    DEFAULT_LOCALE
  );
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  missingWarn: false,
  fallbackWarn: false,
  messages: loadMessages(),
});

// for use outside of components (stores, api helpers, plain js/ts files)
// (explicit type: vue-i18n's inferred type for global.t is too deep for tsc)
type TranslateFn = (key: string, ...args: unknown[]) => string;
export const t: TranslateFn = (key, ...args) =>
  (i18n.global as unknown as { t: TranslateFn }).t(key, ...args);

// Quasar's own component strings (tables, date pickers, etc).
// When adding a language, add its Quasar language pack here too.
const quasarLangs: Record<string, () => Promise<{ default: QuasarLanguage }>> =
  {
    "en-US": () => import("quasar/lang/en-US"),
    "pt-BR": () => import("quasar/lang/pt-BR"),
  };

async function setQuasarLang(locale: string) {
  const option = SUPPORTED_LOCALES.find((l) => l.value === locale);
  const loader = quasarLangs[option ? option.quasarLang : DEFAULT_LOCALE];
  if (!loader) return;
  try {
    const lang = await loader();
    Quasar.lang.set(lang.default);
  } catch (e) {
    console.error(e);
  }
}

export function getLocale(): string {
  return i18n.global.locale.value;
}

function resolveLocale(preference: string | null | undefined): string {
  return (
    matchLocale(preference) ||
    matchLocale(typeof navigator !== "undefined" ? navigator.language : null) ||
    DEFAULT_LOCALE
  );
}

async function applyLocale(locale: string) {
  i18n.global.locale.value = locale;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", locale);
  }
  await setQuasarLang(locale);
}

// called once at startup (boot/i18n.ts)
export async function initLocale() {
  await applyLocale(getLocale());
}

/**
 * Saves the user's language preference and applies it.
 * An empty/unknown value means "automatic" (browser language).
 * Returns true when the language actually changed.
 */
export async function setLocale(
  preference: string | null | undefined,
): Promise<boolean> {
  try {
    if (preference && isSupported(preference))
      localStorage.setItem(STORAGE_KEY, preference);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors (private mode etc)
  }
  const resolved = resolveLocale(preference);
  const changed = resolved !== getLocale();
  await applyLocale(resolved);
  return changed;
}

/**
 * Applies the language saved in the user's profile (from /core/dashinfo/).
 * Strings computed when components are created only update after a reload,
 * so the page is reloaded when the language changes.
 */
export async function syncUserLocale(preference: string | null | undefined) {
  if (await setLocale(preference)) window.location.reload();
}

export default i18n;
