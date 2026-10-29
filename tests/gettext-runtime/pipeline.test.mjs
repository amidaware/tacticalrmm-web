import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { extract } from "../../scripts/gettext/extract.mjs";
import { compile } from "../../scripts/gettext/compile.mjs";
import { PO } from "../../scripts/gettext/catalogue.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trmm gettext test "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "src/nested"), { recursive: true });
  fs.mkdirSync(path.join(root, "locales"));
  for (const locale of ["ru", "it"])
    fs.copyFileSync(
      `src/gettext/locales/${locale}.po`,
      path.join(root, `locales/${locale}.po`),
    );
  const config = path.join(root, "gettext.config.cjs");
  fs.writeFileSync(
    config,
    `module.exports = ${JSON.stringify({ input: { path: "src", include: ["**/*.vue", "**/*.js", "**/*.ts"], exclude: ["**/*.d.ts", "generated/**"] }, output: { path: "locales", potPath: "locales/messages.pot", jsonPath: "generated/translations.json", locales: ["ru", "it"], flat: true, fuzzyMatching: true, locations: true } })};`,
  );
  return {
    root,
    config,
    read(name) {
      return fs.readFileSync(path.join(root, name), "utf8");
    },
  };
}

test("recursive source coverage, Vue directives, file-only references and repeated extraction are stable", async (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    path.join(f.root, "src/nested/Example.vue"),
    String.raw`<template><div v-for="row in [$gettext('Row')]" :key="row"><Child v-slot="{ label = $gettext('Slot default') }"><button :title="$gettext('Title')" @click="$gettext('Click'); run()">{{ label }}{{ $gettext('Caption') }}</button></Child></div></template><script setup lang="ts">const setup = $gettext("Setup");</script>`,
  );
  fs.writeFileSync(
    path.join(f.root, "src/plain.js"),
    'obj.$pgettext("action", "Open");',
  );
  fs.writeFileSync(
    path.join(f.root, "src/service.ts"),
    '$ngettext("%{count} file", "%{count} files", count, {count});',
  );
  fs.writeFileSync(
    path.join(f.root, "src/types.d.ts"),
    '$gettext("Excluded declaration");',
  );
  fs.mkdirSync(path.join(f.root, "src/generated"));
  fs.writeFileSync(
    path.join(f.root, "src/generated/cache.ts"),
    '$gettext("Excluded generated");',
  );
  await extract(f.config);
  const po = PO.parse(f.read("locales/messages.pot"));
  assert.deepEqual(
    po.items.map((i) => i.msgid).sort(),
    [
      "Row",
      "Slot default",
      "Title",
      "Click",
      "Caption",
      "Setup",
      "Open",
      "%{count} file",
    ].sort(),
  );
  assert.ok(
    po.items.every((i) =>
      i.references.every((ref) => ref.startsWith("src/") && !/:\d+$/.test(ref)),
    ),
  );
  const before = ["messages.pot", "ru.po", "it.po"].map((name) =>
    f.read("locales/" + name),
  );
  await extract(f.config);
  assert.deepEqual(
    ["messages.pot", "ru.po", "it.po"].map((name) => f.read("locales/" + name)),
    before,
  );
  fs.writeFileSync(
    path.join(f.root, "src/plain.js"),
    '\n\nobj.$pgettext("action", "Open");',
  );
  await extract(f.config);
  assert.deepEqual(
    ["messages.pot", "ru.po", "it.po"].map((name) => f.read("locales/" + name)),
    before,
    "moving a source line must not dirty PO/POT",
  );
  assert.ok(!f.read("locales/messages.pot").includes("POT-Creation-Date"));
});

test("compile recreates missing JSON, preserves PO bytes/fuzzy flags, skips fuzzy/obsolete/empty and is deterministic", async (t) => {
  const f = fixture(t);
  const file = path.join(f.root, "locales/ru.po"),
    po = PO.parse(fs.readFileSync(file, "utf8"));
  po.items = [];
  for (const [id, translated, flag] of [
    ["Save", "Сохранить", ""],
    ["Fuzzy", "Не подтверждено", "fuzzy"],
    ["Old", "Удалено", "obsolete"],
    ["Empty", "", ""],
    ["Whitespace", " \t", ""],
  ]) {
    const item = new PO.Item();
    item.msgid = id;
    item.msgstr = [translated];
    if (flag === "fuzzy") item.flags.fuzzy = true;
    if (flag === "obsolete") item.obsolete = true;
    po.items.push(item);
  }
  const contextual = new PO.Item();
  contextual.msgctxt = "action";
  contextual.msgid = "Open";
  contextual.msgstr = ["Открыть"];
  po.items.push(contextual);
  const plural = new PO.Item();
  plural.msgid = "%{count} file";
  plural.msgid_plural = "%{count} files";
  plural.msgstr = ["%{count} файл", "%{count} файла", "%{count} файлов"];
  po.items.push(plural);
  fs.writeFileSync(file, po.toString());
  const before = ["ru.po", "it.po"].map((name) => f.read("locales/" + name));
  await compile(f.config);
  const generated = f.read("generated/translations.json"),
    data = JSON.parse(generated);
  assert.equal(data.ru.Save, "Сохранить");
  assert.equal(data.ru.Open.action, "Открыть");
  assert.equal(data.ru["%{count} file"].length, 3);
  for (const key of ["Fuzzy", "Old", "Empty", "Whitespace"])
    assert.ok(!(key in data.ru));
  await compile(f.config);
  assert.equal(f.read("generated/translations.json"), generated);
  assert.deepEqual(
    ["ru.po", "it.po"].map((name) => f.read("locales/" + name)),
    before,
  );
  fs.rmSync(path.join(f.root, "generated"), { recursive: true });
  await compile(f.config);
  assert.equal(f.read("generated/translations.json"), generated);
});

test("invalid/dynamic source and corrupt catalogues fail instead of starting with silent empty translations", async (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    path.join(f.root, "src/dynamic.ts"),
    "$gettext(prefix + name);",
  );
  await assert.rejects(extract(f.config), /requires literal/);
  assert.ok(!fs.existsSync(path.join(f.root, "locales/messages.pot")));
  fs.writeFileSync(
    path.join(f.root, "locales/ru.po"),
    'msgid "Broken\nmsgstr "',
  );
  await assert.rejects(compile(f.config));
  assert.ok(!fs.existsSync(path.join(f.root, "generated/translations.json")));
});

test("moving a file preserves semantic contexts and their distinct translations", async (t) => {
  const f = fixture(t);
  const original = path.join(f.root, "src/plain.js");
  fs.writeFileSync(
    original,
    '$pgettext("file action", "Open"); $pgettext("connection state", "Open");',
  );
  await extract(f.config);
  const ruPath = path.join(f.root, "locales/ru.po");
  const ru = PO.parse(fs.readFileSync(ruPath, "utf8"));
  const translations = {
    "file action": "Открыть",
    "connection state": "Открыто",
  };
  for (const item of ru.items.filter((item) => !item.obsolete)) {
    item.msgstr = [translations[item.msgctxt]];
    delete item.flags.fuzzy;
  }
  fs.writeFileSync(ruPath, ru.toString());
  fs.renameSync(original, path.join(f.root, "src/nested/Relocated.ts"));
  await extract(f.config);
  const moved = PO.parse(f.read("locales/ru.po")).items.filter(
    (item) => !item.obsolete,
  );
  assert.equal(moved.length, 2);
  for (const item of moved) {
    assert.equal(item.msgid, "Open");
    assert.deepEqual(item.msgstr, [translations[item.msgctxt]]);
    assert.ok(!item.flags.fuzzy);
    assert.deepEqual(item.references, ["src/nested/Relocated.ts"]);
  }
});
