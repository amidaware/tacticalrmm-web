import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { createGettext } from "vue3-gettext";
import { pluralEvaluator } from "../../scripts/gettext/check.mjs";
import {
  PO,
  parseMergedPo,
  loadConfig,
} from "../../scripts/gettext/catalogue.mjs";

const pot = PO.parse(
  fs.readFileSync("src/gettext/locales/messages.pot", "utf8"),
);
const locales = loadConfig().output.locales;
const catalogues = Object.fromEntries(
  locales.map((locale) => [
    locale,
    PO.parse(fs.readFileSync(`src/gettext/locales/${locale}.po`, "utf8")),
  ]),
);
const mapping = pot.items
  .filter((item) => !item.obsolete)
  .map((item) => ({
    ...item,
    key: `${item.msgctxt ?? ""}: ${item.msgid}`,
    msgctxt: item.msgctxt ?? "",
    reviewed: Object.fromEntries(
      Object.entries(catalogues).map(([locale, po]) => [
        locale,
        !po.items.find(
          (candidate) =>
            !candidate.obsolete &&
            candidate.msgid === item.msgid &&
            (candidate.msgctxt ?? "") === (item.msgctxt ?? ""),
        )?.flags.fuzzy,
      ]),
    ),
    parameters: Object.fromEntries(
      [...item.msgid.matchAll(/%\{([^}]+)\}/g)].map((match) => [
        match[1],
        match[1],
      ]),
    ),
    translations: Object.fromEntries(
      Object.entries(catalogues).map(([locale, po]) => [
        locale,
        po.items.find(
          (candidate) =>
            !candidate.obsolete &&
            candidate.msgid === item.msgid &&
            (candidate.msgctxt ?? "") === (item.msgctxt ?? ""),
        )?.msgstr ?? [],
      ]),
    ),
  }));
const translations = JSON.parse(
  fs.readFileSync("src/gettext/generated/translations.json", "utf8"),
);
const gettext = createGettext({
  defaultLanguage: "en",
  sourceCodeLanguage: "en",
  silent: true,
  translations,
});
const translatedForm = (entry, locale, index = 0) => {
  if (!entry.reviewed[locale] || !entry.translations[locale][0]?.trim())
    return null;
  const text = entry.translations[locale][index];
  return text?.trim() ? text : null;
};
const values = (entry, count = 1) =>
  Object.fromEntries(
    Object.values(entry.parameters).map((name) => [
      name,
      name === "count" ? count : `TEST_${name}`,
    ]),
  );
const interpolate = (text, parameters) =>
  text.replace(/%\{([^}]+)\}/g, (_, name) => {
    assert.ok(Object.hasOwn(parameters, name), `Missing ${name}`);
    return String(parameters[name]);
  });
const pluralRules = Object.fromEntries(
  Object.entries(catalogues).map(([locale, po]) => [
    locale,
    pluralEvaluator(po.headers["Plural-Forms"]),
  ]),
);

test("compiled catalogues match active reviewed translations; missing translations use the source", () => {
  for (const locale of locales) {
    gettext.current = locale;
    for (const entry of mapping) {
      if (entry.msgid_plural) continue;
      const parameters = values(entry);
      const expected = translatedForm(entry, locale) ?? entry.msgid;
      assert.equal(
        gettext.$pgettext(entry.msgctxt, entry.msgid, parameters),
        interpolate(expected, parameters),
        `${locale}: ${entry.key}`,
      );
    }
  }
});

test("reviewed plural translations and English fallback work at plural boundaries", () => {
  for (const entry of mapping.filter((entry) => entry.msgid_plural)) {
    for (const count of [0, 1, 2, 5, 11, 21, 22, 25, 101, 111]) {
      const parameters = values(entry, count);
      for (const locale of locales) {
        gettext.current = locale;
        const index = pluralRules[locale].evaluate(count);
        const expected =
          translatedForm(entry, locale, index) ??
          (count === 1 ? entry.msgid : entry.msgid_plural);
        assert.equal(
          gettext.$npgettext(
            entry.msgctxt,
            entry.msgid,
            entry.msgid_plural,
            count,
            parameters,
          ),
          interpolate(expected, parameters),
          `${entry.key}: ${locale} ${count}`,
        );
      }
    }
  }
});

test("literal documentation braces and pipes remain data in the actual runtime", () => {
  const literal = mapping.find((entry) =>
    entry.msgid.includes("(D|d|H|h|M|m|S|s)"),
  );
  assert.ok(!literal.msgid_plural);
  assert.match(literal.msgid, /\(D\|d\|H\|h\|M\|m\|S\|s\)/);
  gettext.current = "en";
  assert.equal(
    gettext.$pgettext(literal.msgctxt, literal.msgid),
    literal.msgid,
  );
  for (const locale of locales) {
    gettext.current = locale;
    assert.equal(
      gettext.$pgettext(literal.msgctxt, literal.msgid),
      translatedForm(literal, locale) ?? literal.msgid,
    );
  }
});

test("GNU previous-source comments preserve fuzzy review information after a plural entry", () => {
  const po = parseMergedPo(String.raw`msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Plural-Forms: nplurals=3; plural=0;\n"

msgid "file"
msgid_plural "files"
msgstr[0] "файл"
msgstr[1] "файла"
msgstr[2] "файлов"

#: src/example.vue
#, fuzzy
#| msgid "Location:"
msgid "Caption"
msgstr "Расположение:"
`);
  const item = po.items.find((item) => item.msgid === "Caption");
  assert.deepEqual(item.msgstr, ["Расположение:"]);
  assert.equal(item.flags.fuzzy, true);
  assert.ok(item.comments.includes('Previous source: msgid "Location:"'));
});
