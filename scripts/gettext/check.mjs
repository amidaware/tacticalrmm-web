import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createGettext } from "vue3-gettext";
import {
  PO,
  loadConfig,
  configArgument,
  command,
  globSync,
} from "./catalogue.mjs";
import { extractAstFiles } from "./extract-ast.mjs";

export const identity = (item) =>
  JSON.stringify([item.msgctxt ?? "", item.msgid]);
export const parameters = (text) =>
  [
    ...new Set([...text.matchAll(/%\{([^}]+)\}/g)].map((match) => match[1])),
  ].sort();

// Parse GNU's C-style plural expression without evaluating catalogue JavaScript.
export function pluralEvaluator(header) {
  const match = header?.match(
    /^\s*nplurals\s*=\s*(\d+)\s*;\s*plural\s*=\s*([\s\S]+?)\s*;\s*$/,
  );
  if (!match) throw new Error("Invalid Plural-Forms header");
  const expression = match[2];
  const tokens =
    expression.match(/\d+|n|&&|\|\||==|!=|<=|>=|[?:()!%*/+<>-]|\s+/g) ?? [];
  assert.equal(tokens.join(""), expression, "Invalid plural expression token");
  const input = tokens.filter((token) => !/^\s+$/.test(token));
  const precedence = {
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "<": 4,
    ">": 4,
    "<=": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6,
  };
  const operations = {
    "||": (a, b) => Number(Boolean(a || b)),
    "&&": (a, b) => Number(Boolean(a && b)),
    "==": (a, b) => Number(a === b),
    "!=": (a, b) => Number(a !== b),
    "<": (a, b) => Number(a < b),
    ">": (a, b) => Number(a > b),
    "<=": (a, b) => Number(a <= b),
    ">=": (a, b) => Number(a >= b),
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => Math.trunc(a / b),
    "%": (a, b) => a % b,
  };
  let position = 0;
  function atom() {
    const token = input[position++];
    if (token === "n") return (n) => n;
    if (/^\d+$/.test(token ?? "")) return () => Number(token);
    if (token === "!" || token === "-") {
      const inner = atom();
      return token === "!" ? (n) => Number(!inner(n)) : (n) => -inner(n);
    }
    assert.equal(token, "(", "Invalid plural expression operand");
    const inner = conditional();
    assert.equal(input[position++], ")", "Unbalanced plural expression");
    return inner;
  }
  function binary(minimum = 1) {
    let left = atom();
    while ((precedence[input[position]] ?? 0) >= minimum) {
      const operator = input[position++],
        a = left,
        b = binary(precedence[operator] + 1);
      left = (n) => operations[operator](a(n), b(n));
    }
    return left;
  }
  function conditional() {
    const condition = binary();
    if (input[position] !== "?") return condition;
    position++;
    const yes = conditional();
    assert.equal(input[position++], ":", "Invalid plural conditional");
    const no = conditional();
    return (n) => (condition(n) ? yes(n) : no(n));
  }
  const evaluate = conditional();
  assert.equal(position, input.length, "Trailing plural expression");
  return { nplurals: Number(match[1]), evaluate };
}

export function validateCatalogue(po, locale, active) {
  assert.equal(po.headers.Language, locale, `Expected Language: ${locale}`);
  assert.match(po.headers["Content-Type"] ?? "", /charset=UTF-8/i);
  const plural = pluralEvaluator(po.headers["Plural-Forms"]);
  assert.ok(
    Number.isSafeInteger(plural.nplurals) && plural.nplurals > 0,
    "Invalid nplurals",
  );
  const samples = [
    ...Array(1001).keys(),
    1001,
    1011,
    1000000,
    1000001,
    1000011,
  ];
  // The pinned browser runtime uses its built-in language rules, not PO headers.
  // Probe it directly rather than maintaining another per-language rule table.
  const marker = "__plural_probe__";
  const forms = Array.from(
    { length: Math.min(plural.nplurals, samples.length) },
    (_, index) => String(index),
  );
  const runtime = createGettext({
    defaultLanguage: locale,
    sourceCodeLanguage: "en",
    silent: true,
    translations: { [locale]: { [marker]: forms } },
  });
  const used = new Set();
  for (const n of samples) {
    const index = plural.evaluate(n);
    assert.ok(
      Number.isInteger(index) && index >= 0 && index < plural.nplurals,
      `Invalid plural index ${index} for ${n}`,
    );
    let actual;
    try {
      actual = runtime.$ngettext(marker, marker + "_plural", n);
    } catch {
      assert.fail(
        `Plural rule incompatible with runtime for ${locale} at ${n}`,
      );
    }
    assert.equal(
      String(index),
      actual,
      `Plural rule differs from runtime for ${locale} at ${n}`,
    );
    used.add(index);
  }
  assert.equal(
    used.size,
    plural.nplurals,
    `Unreachable plural forms for ${locale} in compatibility samples`,
  );
  const entries = new Map();
  for (const item of po.items.filter((item) => !item.obsolete)) {
    const key = identity(item);
    assert.ok(!entries.has(key), `Duplicate tuple ${key}`);
    entries.set(key, item);
    const sourceParameters = parameters(item.msgid);
    if (item.msgid_plural)
      assert.deepEqual(
        parameters(item.msgid_plural),
        sourceParameters,
        `Source plural parameters: ${key}`,
      );
    // Unreviewed suggestions are never compiled. Their old parameters/forms may
    // no longer match a changed English source; this must not block a release.
    if (item.flags.fuzzy) continue;
    const count = item.msgid_plural ? plural.nplurals : 1;
    assert.equal(item.msgstr.length, count, `Wrong number of forms: ${key}`);
    for (const text of item.msgstr) {
      if (!text.trim()) continue; // Every translation locale may remain partial.
      assert.deepEqual(
        parameters(text),
        sourceParameters,
        `Translation parameters: ${key}`,
      );
      assert.ok(
        !/^(?:<{7}|={7}|>{7})(?: |$)/m.test(text),
        `Conflict marker: ${key}`,
      );
    }
  }
  let translated = 0,
    fuzzy = 0,
    untranslated = 0;
  for (const source of active.items) {
    const item = entries.get(identity(source));
    if (!item) {
      untranslated++;
      continue;
    }
    if (item.flags.fuzzy) {
      fuzzy++;
      continue;
    }
    if (item.msgstr.every((text) => text.trim())) translated++;
    else untranslated++;
    assert.equal(
      item.msgid_plural ?? "",
      source.msgid_plural ?? "",
      `Plural mismatch: ${identity(source)}`,
    );
  }
  return {
    locale,
    entries: entries.size,
    active: active.items.length,
    translated,
    fuzzy,
    untranslated,
  };
}

export async function check(configFile) {
  const { input, output, base } = loadConfig(configFile);
  const files = globSync(input.include, {
    cwd: input.path,
    ignore: input.exclude ?? [],
    absolute: true,
    nodir: true,
  });
  const active = extractAstFiles(files, { sourceRoot: base });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trmm-gettext-check-"));
  try {
    const results = [];
    for (const locale of output.locales) {
      const file = path.join(output.path, locale + ".po"),
        text = fs.readFileSync(file, "utf8");
      assert.ok(
        !/^(?:<{7}|={7}|>{7})(?: |$)/m.test(text),
        `${file}: unresolved conflict`,
      );
      await command("msgfmt", [
        "--check",
        "-o",
        path.join(temp, locale + ".mo"),
        file,
      ]);
      results.push(validateCatalogue(PO.parse(text), locale, active));
    }
    console.log("gettext catalogue check:", JSON.stringify(results));
    return results;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await check(configArgument(process.argv.slice(2)));
