#!/usr/bin/env node
/**
 * i18n integrity checker.
 *
 * Uses `en` as the source of truth. Checks every other locale against it.
 *
 * Checks:
 *   1. Key parity – missing keys compared to `en`.
 *   2. Placeholder consistency – {var}, %s, %d etc. must match for shared keys.
 *
 * This script NEVER blocks a merge. It reports coverage and issues
 * so the team can track translation progress incrementally.
 *
 * Usage:
 *   node scripts/i18n-check.mjs [--parity] [--placeholders]
 *
 * Defaults to running both checks if no flags given.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

// ── helpers ──────────────────────────────────────────────────────────

const I18N_DIR = resolve("src/i18n");
const EN = "en";

function detectLocales() {
  return readdirSync(I18N_DIR)
    .filter((d) => {
      const full = join(I18N_DIR, d);
      return statSync(full).isDirectory() &&
        readdirSync(full).some((f) => f.endsWith(".json"));
    });
}

function loadJSONs(locale) {
  const dir = join(I18N_DIR, locale);
  const result = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = readFileSync(join(dir, file), "utf-8");
    result[file] = JSON.parse(raw);
  }
  return result;
}

/** Flatten nested object to dot-path keys */
function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(out, flatten(val, full));
    } else {
      out[full] = String(val ?? "");
    }
  }
  return out;
}

/** Extract placeholders: {name}, %s, %d, {0}, etc. */
function extractPlaceholders(str) {
  const tokens = new Set();
  for (const m of str.matchAll(/\{[^}]+\}/g)) tokens.add(m[0]);
  for (const m of str.matchAll(/%[sdflxXcbo]/g)) tokens.add(m[0]);
  return tokens;
}

// ── checks ───────────────────────────────────────────────────────────

let totalIssues = 0;

function checkLocale(localeName, localeData, en, runParity, runPH) {
  let localeIssues = 0;
  const domains = new Set([...Object.keys(en), ...Object.keys(localeData)]);

  // --- parity ---
  if (runParity) {
    for (const domain of [...domains].sort()) {
      const enFlat = en[domain] ? flatten(en[domain]) : {};
      const locFlat = localeData[domain] ? flatten(localeData[domain]) : {};

      const enKeys = new Set(Object.keys(enFlat));
      const locKeys = new Set(Object.keys(locFlat));

      const missing = [...enKeys].filter((k) => !locKeys.has(k));
      const extra = [...locKeys].filter((k) => !enKeys.has(k));

      if (missing.length || extra.length) {
        console.log(`  ⚠️  ${localeName}/${domain}:`);
        if (missing.length)
          console.log(`     missing keys: ${missing.length}`);
        if (extra.length)
          console.log(`     extra keys:   ${extra.length}`);
        localeIssues += missing.length + extra.length;
      }
    }
  }

  // --- placeholders ---
  if (runPH) {
    for (const domain of Object.keys(en)) {
      const enFlat = en[domain] ? flatten(en[domain]) : {};
      const locFlat = localeData[domain] ? flatten(localeData[domain]) : {};

      for (const [key, enVal] of Object.entries(enFlat)) {
        const enPH = extractPlaceholders(enVal);
        if (enPH.size === 0) continue;

        const locVal = locFlat[key];
        if (locVal === undefined) continue;

        const locPH = extractPlaceholders(locVal);
        const missing = [...enPH].filter((p) => !locPH.has(p));
        const extra = [...locPH].filter((p) => !enPH.has(p));

        if (missing.length || extra.length) {
          console.log(`  ⚠️  ${localeName}/${domain}.${key}:`);
          if (missing.length)
            console.log(`     missing placeholders: ${missing.join(", ")}`);
          if (extra.length)
            console.log(`     extra placeholders:   ${extra.join(", ")}`);
          localeIssues++;
        }
      }
    }
  }

  return localeIssues;
}

function coverageReport(en, localeName, localeData) {
  const enKeys = new Set();
  const locKeys = new Set();

  for (const domain of Object.keys(en)) {
    const enFlat = flatten(en[domain]);
    const locFlat = localeData[domain] ? flatten(localeData[domain]) : {};
    for (const k of Object.keys(enFlat)) enKeys.add(k);
    for (const k of Object.keys(locFlat)) {
      if (enKeys.has(k)) locKeys.add(k);
    }
  }

  const total = enKeys.size;
  const translated = locKeys.size;
  const pct = total > 0 ? ((translated / total) * 100).toFixed(1) : 0;
  console.log(`  📊 ${localeName}: ${translated}/${total} keys (${pct}%)`);
}

// ── main ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const runParity = args.length === 0 || args.includes("--parity");
  const runPH = args.length === 0 || args.includes("--placeholders");

  console.log("🔍 i18n integrity check\n");

  const en = loadJSONs(EN);
  const locales = detectLocales().filter((l) => l !== EN);

  if (locales.length === 0) {
    console.log("  No non-English locales found. Nothing to check.");
    process.exit(0);
    return;
  }

  for (const locale of locales.sort()) {
    const locData = loadJSONs(locale);

    // Coverage summary
    coverageReport(en, locale, locData);

    const issues = checkLocale(locale, locData, en, runParity, runPH);
    totalIssues += issues;

    if (issues === 0) {
      console.log(`  ✅ ${locale}: fully in sync with en`);
    }

    console.log("");
  }

  // Always exit 0 – this is informational, never blocks merge.
  if (totalIssues > 0) {
    console.log(`⚠️  ${totalIssues} i18n issue(s) found (non-blocking).`);
    console.log("   Community needs more time to complete translations.");
  } else {
    console.log("✅ All locales fully in sync with en.");
  }
  process.exit(0);
}

main();
