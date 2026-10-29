import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { createGettext } from "vue3-gettext";
import { compile } from "../../scripts/gettext/compile.mjs";
import { PO } from "../../scripts/gettext/catalogue.mjs";
import {
  check,
  validateCatalogue,
  pluralEvaluator,
} from "../../scripts/gettext/check.mjs";
import { extract } from "../../scripts/gettext/extract.mjs";
import { extractAstFiles } from "../../scripts/gettext/extract-ast.mjs";
import { checkExtraction } from "../../scripts/gettext/check-extraction.mjs";
import { checkSources } from "../../scripts/gettext/source-check.mjs";

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trmm gettext checks "));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  fs.mkdirSync(path.join(root, "src"));
  fs.mkdirSync(path.join(root, "locales"));
  fs.writeFileSync(
    path.join(root, "src/example.ts"),
    '$gettext("One %{name}");',
  );
  fs.writeFileSync(path.join(root, "exceptions.json"), "[]");
  for (const locale of ["ru", "it"]) {
    const po = PO.parse(
      fs.readFileSync(`src/gettext/locales/${locale}.po`, "utf8"),
    );
    const item = new PO.Item();
    item.msgid = "One %{name}";
    item.msgstr = [locale === "ru" ? "Один %{name}" : ""];
    po.items = [item];
    fs.writeFileSync(path.join(root, `locales/${locale}.po`), po.toString());
  }
  const config = path.join(root, "gettext.config.cjs");
  fs.writeFileSync(
    config,
    "module.exports = " +
      JSON.stringify({
        input: {
          path: "src",
          include: ["**/*.ts", "**/*.vue"],
          exceptions: "exceptions.json",
        },
        output: {
          path: "locales",
          potPath: "locales/messages.pot",
          jsonPath: "generated/translations.json",
          locales: ["ru", "it"],
          flat: true,
          locations: true,
        },
      }) +
      ";",
  );
  await extract(config);
  return {
    root,
    config,
    source: path.join(root, "src/example.ts"),
    edit(locale, modify) {
      const file = path.join(root, `locales/${locale}.po`);
      const po = PO.parse(fs.readFileSync(file, "utf8"));
      modify(po);
      fs.writeFileSync(file, po.toString());
    },
  };
}

test("catalogue check permits partial translations, rejects invalid approved parameters/conflicts/duplicates/syntax", async (t) => {
  const f = await fixture(t);
  await check(f.config);
  const file = path.join(f.root, "locales/ru.po"),
    good = fs.readFileSync(file, "utf8");
  for (const [reason, modify] of [
    [
      /parameters/,
      (po) => {
        po.items[0].msgstr = ["Один %{other}"];
      },
    ],
    [
      /Conflict marker|unresolved conflict/,
      (po) => {
        po.items[0].msgstr = ["<<<<<<< conflict %{name}"];
      },
    ],
    [
      /Duplicate|msgfmt failed/,
      (po) => {
        po.items.push(po.items[0]);
      },
    ],
  ]) {
    fs.writeFileSync(file, good);
    f.edit("ru", modify);
    await assert.rejects(check(f.config), reason);
  }
  fs.writeFileSync(file, good);
  f.edit("it", (po) => {
    po.items[0].msgstr = ["Uno %{other}"];
  });
  await assert.rejects(check(f.config), /parameters/);
  fs.writeFileSync(file, good + '\nmsgid "broken\n');
  await assert.rejects(check(f.config), /msgfmt failed/);
});

test("plural validation checks every RU form, rules, counts and source plural parameters", () => {
  const po = PO.parse(fs.readFileSync("src/gettext/locales/ru.po", "utf8"));
  const item = po.items.find((item) => item.msgid_plural);
  po.items = [item];
  const active = { items: [item] };
  validateCatalogue(po, "ru", active);
  const saved = [...item.msgstr];
  item.msgstr[2] = "%{other} файлов";
  assert.throws(() => validateCatalogue(po, "ru", active), /parameters/);
  item.msgstr = saved.slice(0, 2);
  assert.throws(() => validateCatalogue(po, "ru", active), /number of forms/);
  item.msgstr = saved;
  item.msgid_plural = "%{other} files";
  assert.throws(
    () => validateCatalogue(po, "ru", active),
    /Source plural parameters/,
  );
  item.msgid_plural = "%{count} files";
  po.headers["Plural-Forms"] = "nplurals=3; plural=0;";
  assert.throws(
    () => validateCatalogue(po, "ru", active),
    /Plural rule differs/,
  );
  assert.throws(
    () => pluralEvaluator("nplurals=3; plural=process.exit();"),
    /token/,
  );
});

test("missing active tuples and contexts report English fallback for every locale", () => {
  for (const locale of ["ru", "it"]) {
    const po = PO.parse(
      fs.readFileSync(`src/gettext/locales/${locale}.po`, "utf8"),
    );
    const result = validateCatalogue(po, locale, {
      items: [{ msgid: "New English message", msgctxt: "new context" }],
    });
    assert.equal(result.untranslated, 1);
    assert.equal(result.translated, 0);
  }
});

test("stale extraction fails without changing source POT/PO or generating JSON", async (t) => {
  const f = await fixture(t);
  await checkExtraction(f.config);
  const files = ["messages.pot", "ru.po", "it.po"].map((name) =>
    path.join(f.root, "locales", name),
  );
  const before = files.map((file) => fs.readFileSync(file, "utf8"));
  fs.appendFileSync(f.source, '\n$gettext("New message");');
  await assert.rejects(checkExtraction(f.config), /stale/);
  assert.deepEqual(
    files.map((file) => fs.readFileSync(file, "utf8")),
    before,
  );
  assert.ok(!fs.existsSync(path.join(f.root, "generated")));
});

test("AST source gate rejects unreviewed UI, legacy consumers, aliases and computed msgids", async (t) => {
  const f = await fixture(t);
  checkSources(f.config);
  for (const source of [
    "$gettext(variable);",
    'const tr = gettext.$gettext; tr("Hidden");',
    'const { $gettext: tr } = useGettext(); tr("Hidden");',
    'import { $gettext as tr } from "vue3-gettext"; tr("Hidden");',
    'gettext["$gettext"]("Hidden");',
  ]) {
    fs.writeFileSync(f.source, source);
    assert.throws(
      () => checkSources(f.config),
      /literal|aliases|computed|standard gettext|method references/,
    );
  }
  for (const source of [
    'import { i18n as old } from "@/i18n"; old.global.t("common.save");',
    'import { useI18n as old } from "vue-i18n"; const {t} = old(); t("common.save");',
    'Notify.create({message:"Forgotten UI caption"});',
    'const tr = i18n.global.t; tr("common.save");',
    'export { useI18n } from "vue-i18n";',
    'this.$te("common.save");',
    'te("common.save");',
  ]) {
    fs.writeFileSync(f.source, source);
    assert.throws(() => checkSources(f.config), /legacy|Untranslated UI/);
  }
  fs.writeFileSync(f.source, '$gettext("agents.historyTab.actions.delete");');
  assert.throws(() => checkSources(f.config), /Artificial translation key/);
  fs.writeFileSync(f.source, "function te(value) { return value; } te(data);");
  checkSources(f.config);
  fs.writeFileSync(f.source, 'gettext.$gettext("One %{name}");');
  assert.throws(() => checkSources(f.config), /without an import/);
  fs.writeFileSync(f.source, "function t(value) { return value; } t(data);");
  checkSources(f.config);
  fs.writeFileSync(f.source, '$gettext("One %{name}");');
  const vue = path.join(f.root, "src/Example.vue");
  fs.writeFileSync(
    vue,
    '<template><button title="Untranslated title">Forgotten UI</button></template>',
  );
  assert.throws(() => checkSources(f.config), /Untranslated UI/);
  fs.unlinkSync(vue);
  fs.writeFileSync(
    path.join(f.root, "exceptions.json"),
    JSON.stringify([
      {
        file: "src/example.ts",
        kind: "phrase",
        text: "Removed string",
        reason: "Technical fixture",
      },
    ]),
  );
  assert.throws(() => checkSources(f.config), /Stale source exceptions/);
});

test("extracts Options/Composition API, props, directives, service context and plural separately", async (t) => {
  const f = await fixture(t);
  const vue = path.join(f.root, "src/Example.vue");
  fs.writeFileSync(
    vue,
    String.raw`<template><button :title="$pgettext('action', 'Open')">{{ $gettext('Caption') }}</button></template><script>export default { computed: { label() { return this.$gettext('Options'); } } };</script><script setup>const { $gettext } = useGettext(); const props = defineProps({label:{default:()=> $gettext('Prop default')}}); const label = computed(() => $gettext('Composition'));</script>`,
  );
  fs.writeFileSync(
    f.source,
    'gettext.$npgettext("selection", "%{count} file", "%{count} files", count, {count});',
  );
  const po = extractAstFiles([vue, f.source]);
  assert.deepEqual(
    new Set(po.items.map((item) => item.msgid)),
    new Set([
      "Open",
      "Caption",
      "Options",
      "Prop default",
      "Composition",
      "%{count} file",
    ]),
  );
  assert.equal(
    po.items.find((item) => item.msgid === "Open").msgctxt,
    "action",
  );
  assert.equal(
    po.items.find((item) => item.msgid === "%{count} file").msgid_plural,
    "%{count} files",
  );
});

test("new English messages, fuzzy RU and partial plurals pass release checks and fall back to English", async (t) => {
  const f = await fixture(t);
  fs.writeFileSync(
    f.source,
    '$gettext("One %{name}"); $gettext("New English %{name}"); $ngettext("%{count} device", "%{count} devices", count, {count});',
  );
  await extract(f.config);
  f.edit("ru", (po) => {
    const fuzzy = po.items.find(
      (item) => !item.obsolete && item.msgid === "One %{name}",
    );
    fuzzy.flags.fuzzy = true;
    fuzzy.msgstr = ["Предыдущее сообщение с %{oldName}"];
    const partial = po.items.find(
      (item) => !item.obsolete && item.msgid_plural,
    );
    partial.msgstr = ["%{count} устройство", "", ""];
    delete partial.flags.fuzzy;
    const fresh = po.items.find(
      (item) => !item.obsolete && item.msgid === "New English %{name}",
    );
    fresh.msgstr = [""];
    delete fresh.flags.fuzzy;
  });
  await extract(f.config);
  const before = fs.readFileSync(path.join(f.root, "locales/ru.po"), "utf8");
  const results = await check(f.config);
  const ru = results.find((result) => result.locale === "ru");
  assert.equal(ru.fuzzy, 1);
  assert.equal(ru.untranslated, 2);
  await checkExtraction(f.config);
  await compile(f.config);
  assert.equal(
    fs.readFileSync(path.join(f.root, "locales/ru.po"), "utf8"),
    before,
  );
  const translations = JSON.parse(
    fs.readFileSync(path.join(f.root, "generated/translations.json"), "utf8"),
  );
  const runtime = createGettext({
    defaultLanguage: "ru",
    sourceCodeLanguage: "en",
    silent: true,
    translations,
  });
  assert.equal(runtime.$gettext("One %{name}", { name: "RAW" }), "One RAW");
  assert.equal(
    runtime.$gettext("New English %{name}", { name: "RAW" }),
    "New English RAW",
  );
  assert.equal(
    runtime.$ngettext("%{count} device", "%{count} devices", 1, { count: 1 }),
    "1 устройство",
  );
  for (const count of [0, 2, 5, 11, 22, 25])
    assert.equal(
      runtime.$ngettext("%{count} device", "%{count} devices", count, {
        count,
      }),
      `${count} devices`,
    );
  assert.equal(
    runtime.$ngettext("%{count} device", "%{count} devices", 21, { count: 21 }),
    "21 устройство",
  );
  f.edit("ru", (po) => {
    for (const item of po.items) item.msgstr = item.msgstr.map(() => "");
  });
  await check(f.config);
  await compile(f.config);
  const empty = createGettext({
    defaultLanguage: "ru",
    sourceCodeLanguage: "en",
    silent: true,
    translations: JSON.parse(
      fs.readFileSync(path.join(f.root, "generated/translations.json"), "utf8"),
    ),
  });
  assert.equal(
    empty.$ngettext("%{count} device", "%{count} devices", 1, { count: 1 }),
    "1 device",
  );
  assert.equal(
    empty.$ngettext("%{count} device", "%{count} devices", 21, { count: 21 }),
    "21 devices",
  );
});

test("plural validation is language-neutral across one to six forms and checks actual runtime compatibility", () => {
  const cases = [
    ["ja", 1, "0"],
    ["de", 2, "n != 1"],
    ["fr", 2, "n > 1"],
    [
      "pl",
      3,
      "n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2",
    ],
    ["sl", 4, "n%100==1 ? 0 : n%100==2 ? 1 : n%100==3 || n%100==4 ? 2 : 3"],
    ["ga", 5, "n==1 ? 0 : n==2 ? 1 : n>2 && n<7 ? 2 : n>6 && n<11 ? 3 : 4"],
    [
      "ar",
      6,
      "n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5",
    ],
  ];
  for (const [locale, count, formula] of cases) {
    const po = new PO();
    po.headers = {
      Language: locale,
      "Content-Type": "text/plain; charset=UTF-8",
      "Plural-Forms": `nplurals=${count}; plural=${formula};`,
    };
    const item = new PO.Item();
    item.msgid = "%{count} record";
    item.msgid_plural = "%{count} records";
    item.msgstr = Array.from(
      { length: count },
      (_, index) => `%{count} form-${index}`,
    );
    po.items = [item];
    const active = { items: [item] };
    assert.equal(validateCatalogue(po, locale, active).translated, 1, locale);
    const header = po.headers["Plural-Forms"];
    po.headers["Plural-Forms"] = `nplurals=${count + 1}; plural=${formula};`;
    assert.throws(
      () => validateCatalogue(po, locale, active),
      /Unreachable plural forms/,
      locale,
    );
    po.headers["Plural-Forms"] = header;
    if (count > 1) {
      po.headers["Plural-Forms"] = `nplurals=${count}; plural=0;`;
      assert.throws(
        () => validateCatalogue(po, locale, active),
        /Plural rule differs/,
        locale,
      );
    }
  }
});
