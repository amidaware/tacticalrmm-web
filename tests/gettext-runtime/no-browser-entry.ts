import assert from "node:assert/strict";
import { gettext } from "@/gettext";
import {
  resolveInitialLocale,
  getLocalePreference,
  getLocaleFromStorage,
  setLocalePreference,
  clearStoredLocale,
  setLocale,
} from "@/gettext/locale";

async function check() {
  assert.equal(typeof window, "undefined");
  assert.equal(resolveInitialLocale(), "en");
  assert.equal(getLocalePreference(), "system");
  assert.equal(getLocaleFromStorage(), null);
  setLocalePreference("ru");
  clearStoredLocale();
  await setLocale("ru");
  assert.equal(gettext.current, "ru");
  console.log(
    "Gettext initializes and switches safely without browser globals.",
  );
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
