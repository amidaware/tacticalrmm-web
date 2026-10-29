import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import { date } from "quasar";
import { createGettext } from "vue3-gettext";
import { extractAstFiles } from "../../scripts/gettext/extract-ast.mjs";
import { globSync } from "../../scripts/gettext/catalogue.mjs";

// Exercise translation behavior independently of optional production coverage.
const gettext = createGettext({
  defaultLanguage: "en",
  sourceCodeLanguage: "en",
  silent: true,
  translations: JSON.parse(
    fs.readFileSync(
      "tests/gettext-runtime/fixtures/test-translations.json",
      "utf8",
    ),
  ),
});
function actualFunction(file, name, bindings = {}) {
  const text = fs.readFileSync(file, "utf8");
  const source = file.endsWith(".vue")
    ? (parse(text).descriptor.scriptSetup ?? parse(text).descriptor.script)
        .content
    : text;
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found;
  function visit(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name?.getText(sf) === name
    )
      found = node;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(found, `${file}: ${name}`);
  const fn =
    (ts.isMethodDeclaration(found) ? "function " : "") +
    found.getText(sf).replace(/^export\s+/, "");
  const js = ts.transpileModule(`const tested = (${fn});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${js}\nreturn tested;`)(
    ...Object.values(bindings),
  );
}
const ruIndex = (count) =>
  count % 10 === 1 && count % 100 !== 11
    ? 0
    : count % 10 >= 2 &&
        count % 10 <= 4 &&
        (count % 100 < 10 || count % 100 >= 20)
      ? 1
      : 2;
const boundaries = [0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111];

test("both actual relative-time implementations choose RU and EN forms without changing time thresholds", () => {
  const now = Date.UTC(2026, 9, 29, 12);
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const units = [
    ["second", 1000, ["секунду", "секунды", "секунд"], 60],
    ["minute", 60000, ["минуту", "минуты", "минут"], 60],
    ["hour", 3600000, ["час", "часа", "часов"], 24],
    ["day", 86400000, ["день", "дня", "дней"], 30],
    ["month", 2592000000, ["месяц", "месяца", "месяцев"], 12],
    ["year", 31536000000, ["год", "года", "лет"], Infinity],
  ];
  for (const file of ["src/utils/format.ts", "src/mixins/mixins.js"]) {
    const elapsed = actualFunction(file, "getTimeLapse", {
      gettext,
      date,
      Date: FixedDate,
    });
    for (const locale of ["en", "ru", "en", "it"]) {
      gettext.current = locale;
      for (const [unit, duration, forms, upper] of units) {
        for (const count of boundaries.filter(
          (n) => n < upper && (n > 0 || unit === "second"),
        )) {
          const expected =
            locale === "ru"
              ? `${count} ${forms[ruIndex(count)]} назад`
              : `${count} ${unit}${count === 1 ? "" : "s"} ago`;
          assert.equal(
            elapsed((now - count * duration) / 1000),
            expected,
            `${file}: ${locale} ${count} ${unit}`,
          );
        }
      }
    }
  }
});

test("installer expiry notification uses its hours, including compound Russian numbers", () => {
  const notify = actualFunction(
    "src/components/modals/agents/InstallAgent.vue",
    "showDLMessage",
  );
  for (const locale of ["en", "ru", "it"]) {
    gettext.current = locale;
    for (const expires of boundaries) {
      let message;
      notify.call({
        $ngettext: gettext.$ngettext,
        $q: {
          dialog: (data) => {
            message = data.message;
          },
        },
        expires,
        client: { label: "RAW_CLIENT" },
        site: { label: "RAW_SITE" },
        agenttype: "server",
      });
      const expected =
        locale === "ru"
          ? `в течение ${expires} ${ruIndex(expires) === 0 ? "часа" : "часов"}`
          : `for ${expires} hour${expires === 1 ? "" : "s"}`;
      assert.ok(message.includes(expected), message);
      for (const raw of ["RAW_CLIENT", "RAW_SITE", "server"])
        assert.ok(message.includes(raw));
    }
  }
});

test("fractional script durations use an invariant unit without rounding or changing the raw number", () => {
  for (const locale of ["en", "ru", "it"]) {
    gettext.current = locale;
    for (const value of [0, 1, 2, 5, 1.25, 0.01, "1.250"]) {
      assert.equal(
        gettext.$gettext("%{value} s", { value }),
        `${value} ${locale === "ru" ? "с" : "s"}`,
      );
    }
  }
  for (const file of [
    "src/components/checks/ScriptOutput.vue",
    "src/components/scripts/TestScriptModal.vue",
    "src/components/modals/agents/RunScript.vue",
  ]) {
    const extracted = extractAstFiles([file]);
    assert.ok(
      extracted.items.some((item) => item.msgid === "%{value} s"),
      file,
    );
    assert.ok(
      !extracted.items.some(
        (item) => item.msgid === "seconds" || item.msgid === "%{value} seconds",
      ),
      file,
    );
  }
});

test("counted nouns across production use plural calls with the same displayed count", () => {
  const files = globSync("src/**/*.{vue,js,ts}", {
    ignore: ["**/*.d.ts", "src/gettext/generated/**"],
  });
  const countedNoun =
    /%\{(count|value|days|hours|minutes|seconds|expires|min|max|limit|fileLimit|total|considered|queued|bytes)\}\s+(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?|files?|folders?|items?|agents?|tasks?|checks?|matches?|paths?|warnings?|bytes?|characters?|assets?)\b/i;
  let checked = 0;
  const extracted = extractAstFiles(files, {
    onAst(sf, { file }) {
      function visit(node) {
        if (ts.isCallExpression(node)) {
          const name = ts.isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : node.expression.getText(sf);
          const contextual = name === "$pgettext" || name === "$npgettext";
          const plural = name === "$ngettext" || name === "$npgettext";
          const id = node.arguments[contextual ? 1 : 0];
          if (
            ["$gettext", "$pgettext", "$ngettext", "$npgettext"].includes(
              name,
            ) &&
            id &&
            ts.isStringLiteral(id)
          ) {
            const match = id.text.match(countedNoun);
            if (match) {
              checked++;
              assert.ok(
                plural,
                `${file}: counted noun needs plural: ${id.text}`,
              );
              const args = node.arguments[contextual ? 4 : 3];
              assert.ok(
                args && ts.isObjectLiteralExpression(args),
                `${file}: explicit interpolation values`,
              );
              const value = args.properties.find(
                (p) => p.name?.getText(sf) === match[1],
              );
              assert.ok(value, `${file}: missing ${match[1]}`);
              let number = ts.isShorthandPropertyAssignment(value)
                ? value.name
                : value.initializer;
              if (
                ts.isCallExpression(number) &&
                ts.isPropertyAccessExpression(number.expression) &&
                number.expression.name.text === "toLocaleString"
              ) {
                number = number.expression.expression;
              }
              assert.equal(
                node.arguments[contextual ? 3 : 2].getText(sf),
                number.getText(sf),
                `${file}: plural selector must match displayed ${match[1]}`,
              );
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
    },
  });
  for (const item of extracted.items)
    if (countedNoun.test(item.msgid)) assert.ok(item.msgid_plural, item.msgid);
  assert.ok(
    checked >= 75,
    `Expected whole-source coverage, got ${checked} calls`,
  );
});

test("asset deletion confirmation translates the whole counted sentence without changing or submitting selected paths", () => {
  for (const locale of ["en", "ru", "it"]) {
    gettext.current = locale;
    for (const count of boundaries) {
      let message;
      const nodes = Array.from({ length: count }, (_, index) => ({
        path: `RAW/${index}`,
      }));
      const snapshot = structuredClone(nodes);
      const show = actualFunction(
        "src/ee/reporting/components/ReportAssets.vue",
        "deleteFiles",
        {
          gettext,
          $q: {
            dialog: (data) => {
              message = data.message;
              return { onOk: () => {} };
            },
          },
        },
      );
      show(nodes, { children: nodes });
      const expected =
        locale === "ru"
          ? `${count} ${["ресурс", "ресурса", "ресурсов"][ruIndex(count)]}`
          : `${count} asset${count === 1 ? "" : "s"}`;
      assert.ok(message.includes(expected), message);
      assert.deepEqual(nodes, snapshot);
    }
  }
});

test("file drag count uses Russian forms at 21 and 22 and keeps the single-file prompt", () => {
  const title = actualFunction(
    "src/utils/filebrowser.ts",
    "formatDropOverlayTitle",
    { gettext },
  );
  gettext.current = "ru";
  assert.equal(title(null, 1), "Перетащите файл для загрузки");
  for (const count of [2, 5, 11, 21, 22, 25, 101, 111]) {
    assert.equal(
      title(null, count),
      `Перетащите ${count} ${["файл", "файла", "файлов"][ruIndex(count)]} для загрузки`,
    );
  }
  gettext.current = "en";
  assert.equal(title(null, 2), "Drop 2 files to upload");
});

test("formatted thousands preserve display grouping but never become the plural selector", () => {
  const checkedGettext = {
    $gettext: gettext.$gettext,
    $ngettext: (singular, plural, count, parameters) => {
      assert.equal(
        typeof count,
        "number",
        "Plural selector must be the raw numeric value",
      );
      return gettext.$ngettext(singular, plural, count, parameters);
    },
  };
  const size = actualFunction(
    "src/components/agents/remotebg/FileBrowserPropertiesDialog.vue",
    "formatSize",
    { gettext: checkedGettext, bytes2Human: () => "HUMAN" },
  );
  const progress = actualFunction(
    "src/components/agents/remotebg/FileBrowserExtractProgress.vue",
    "statusLabel",
    { gettext: checkedGettext },
  );
  for (const locale of ["en", "ru", "it"]) {
    gettext.current = locale;
    for (const count of [1, 2, 5, 1001, 1002, 1005, 1011, 1021]) {
      const unit =
        locale === "ru"
          ? ["байт", "байта", "байт"][ruIndex(count)]
          : count === 1
            ? "byte"
            : "bytes";
      assert.equal(
        size({ sizeBytes: count }),
        `HUMAN (${count.toLocaleString()} ${unit})`,
      );
      const done = (count - 1).toLocaleString();
      const total = count.toLocaleString();
      assert.equal(
        progress({ filesTotal: count, filesDone: count - 1 }),
        locale === "ru"
          ? `Файлов: ${done} из ${total}`
          : `${done} of ${total} file${count === 1 ? "" : "s"}`,
      );
    }
  }
});
