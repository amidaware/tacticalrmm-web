import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import { globSync } from "./catalogue.mjs";
import { checkSources } from "./source-check.mjs";
import { extractAstFiles } from "./extract-ast.mjs";

checkSources();
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const isLegacyPackage = (name) =>
  name === "vue-i18n" || name.startsWith("@intlify/");
for (const name of Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}))
  assert.ok(!isLegacyPackage(name), `Legacy dependency: ${name}`);
for (const location of Object.keys(lock.packages))
  assert.ok(
    !isLegacyPackage(location.split("node_modules/").at(-1)),
    `Legacy transitive dependency: ${location}`,
  );
assert.ok(!fs.existsSync("src/i18n"));
assert.ok(!fs.existsSync("src/boot/i18n.ts"));
assert.ok(!fs.existsSync("src/utils/fileBrowserI18n.ts"));
const files = globSync("src/**/*.{vue,js,ts}", {
  ignore: ["**/*.d.ts", "src/gettext/generated/**"],
}).sort();
const extracted = extractAstFiles(files); // Rejects nonliteral gettext arguments.

const runtimes = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  assert.ok(
    !/vue-i18n|@\/i18n|fileBrowserI18n|translateFileBrowser/.test(text),
    `${file}: legacy dependency`,
  );
  const descriptor = file.endsWith(".vue") ? parse(text).descriptor : null;
  const source = descriptor
    ? [descriptor.script?.content, descriptor.scriptSetup?.content]
        .filter(Boolean)
        .join("\n")
    : text;
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const factoryAliases = new Set();
  const namespaces = new Set();
  for (const node of sf.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      node.moduleSpecifier.text !== "vue3-gettext"
    )
      continue;
    const named = node.importClause?.namedBindings;
    if (named && ts.isNamedImports(named))
      for (const entry of named.elements)
        if ((entry.propertyName?.text ?? entry.name.text) === "createGettext")
          factoryAliases.add(entry.name.text);
    if (named && ts.isNamespaceImport(named)) namespaces.add(named.name.text);
  }
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) &&
        factoryAliases.has(node.expression.text)) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          namespaces.has(node.expression.expression.getText(sf)) &&
          node.expression.name.text === "createGettext"))
    )
      runtimes.push(file);
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(node.operatorToken.kind)
    ) {
      const expression = node.getText(sf);
      assert.ok(
        !/\$(?:p|n|np)?gettext\s*\(/.test(expression),
        `${file}: translated comparison: ${expression}`,
      );
      assert.ok(
        !/\.errorMessage\b/.test(expression),
        `${file}: display text controls branching: ${expression}`,
      );
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "test"
    )
      assert.ok(
        !/errorMessage/.test(node.getText(sf)),
        `${file}: regex on display text`,
      );
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
assert.deepEqual(runtimes, ["src/gettext/index.ts"]);
const exceptions = JSON.parse(
  fs.readFileSync("scripts/gettext/diagnostic-exceptions.json", "utf8"),
);
for (const exception of exceptions.consoleOnly) {
  const source = fs.readFileSync(exception.file, "utf8");
  assert.ok(
    source.includes(JSON.stringify(exception.text)),
    `${exception.file}: stale diagnostic exception`,
  );
  assert.ok(
    !source.includes(`$gettext(${JSON.stringify(exception.text)}`),
    `${exception.file}: diagnostic unnecessarily translated`,
  );
  assert.ok(exception.reason);
}
const report = {
  sourceFiles: files.length,
  extractedTuples: extracted.items.length,
  legacyConsumers: 0,
  consoleOnlyExceptions: exceptions.consoleOnly.length,
  gettextFactories: runtimes,
  displayTextComparisonsInScripts: 0,
  dynamicGettextMsgids: 0,
  intentionalLocalizedConfirmation:
    "src/components/agents/ConfirmYesDialog.vue",
};
if (process.argv.includes("--write")) {
  fs.mkdirSync(".quasar/gettext-audit", { recursive: true });
  fs.writeFileSync(
    ".quasar/gettext-audit/services.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
