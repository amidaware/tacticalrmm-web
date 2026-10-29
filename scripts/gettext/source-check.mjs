import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";
import { extractAstFiles } from "./extract-ast.mjs";
import { loadConfig, globSync, configArgument } from "./catalogue.mjs";

const keywords = new Set(["$gettext", "$pgettext", "$ngettext", "$npgettext"]);
const fields = new Set([
  "label",
  "title",
  "caption",
  "message",
  "hint",
  "placeholder",
  "tooltip",
  "description",
  "text",
  "ok",
  "cancel",
  "alt",
  "aria-label",
  "ariaLabel",
  "no-data-label",
  "no-results-label",
  "loading-label",
  "prefix",
  "suffix",
]);
const key = (entry) => JSON.stringify([entry.file, entry.kind, entry.text]);
export function sourceCandidates(configFile) {
  const { input, base, sourceRoot } = loadConfig(configFile);
  const files = globSync(input.include, {
    cwd: input.path,
    ignore: input.exclude ?? [],
    absolute: true,
    nodir: true,
  });
  const candidates = new Map(),
    consoles = [],
    bindings = new Map();
  function add(file, kind, text) {
    if (!/[\p{L}]/u.test(text)) return;
    const entry = {
      file: path.relative(sourceRoot, file).replaceAll(path.sep, "/"),
      kind,
      text,
    };
    candidates.set(key(entry), entry);
  }
  const extracted = extractAstFiles(files, {
    sourceRoot,
    onAst(sf, { file }) {
      const relative = path
        .relative(sourceRoot, file)
        .replaceAll(path.sep, "/");
      const declared = bindings.get(file) ?? new Set();
      function declarations(node) {
        if (
          ts.isImportSpecifier(node) ||
          ts.isVariableDeclaration(node) ||
          ts.isFunctionDeclaration(node)
        ) {
          if (node.name && ts.isIdentifier(node.name))
            declared.add(node.name.text);
        }
        ts.forEachChild(node, declarations);
      }
      declarations(sf);
      bindings.set(file, declared);
      function parents(node) {
        const result = [];
        for (let parent = node.parent; parent; parent = parent.parent)
          result.push(parent);
        return result;
      }
      function visit(node) {
        if (
          ts.isImportDeclaration(node) ||
          (ts.isExportDeclaration(node) && node.moduleSpecifier)
        ) {
          const module = node.moduleSpecifier.text;
          if (/vue-i18n|(?:^|\/)i18n$|fileBrowserI18n/.test(module))
            assert.ok(
              false,
              `${relative}: legacy translation import ${module}`,
            );
        }
        if (ts.isPropertyAccessExpression(node))
          assert.ok(
            !/^(?:i18n\.global\.(?:t|te|tm)|this\.\$i18n\.(?:t|te|tm))$/.test(
              node.getText(sf).replace(/\s+/g, ""),
            ),
            `${relative}: legacy translator reference/alias`,
          );
        if (ts.isCallExpression(node)) {
          const callee = node.expression.getText(sf);
          const bareLegacy =
            /^(?:useI18n|\$t|te|fbT|translateFileBrowser)$/.test(callee) &&
            !declared.has(callee);
          assert.ok(
            !bareLegacy &&
              !/^this\.(?:\$t|\$te|\$tm|\$i18n\.(?:t|te|tm))$/.test(callee),
            `${relative}: legacy translation call ${callee}`,
          );
          assert.ok(
            !/i18n\.global\.(?:t|te|tm)$/.test(callee),
            `${relative}: legacy global call`,
          );
          if (
            ts.isPropertyAccessExpression(node.expression) &&
            keywords.has(node.expression.name.text) &&
            node.expression.expression.getText(sf) === "gettext"
          )
            assert.ok(
              declared.has("gettext"),
              `${relative}: gettext runtime is used without an import/declaration`,
            );
        }
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateExpression(node)
        ) {
          const ancestors = parents(node);
          const text = ts.isTemplateExpression(node)
            ? ts
                .createPrinter({ removeComments: true })
                .printNode(ts.EmitHint.Expression, node, sf)
            : node.text;
          if (
            ancestors.some(
              (parent) =>
                ts.isCallExpression(parent) &&
                keywords.has(
                  ts.isPropertyAccessExpression(parent.expression)
                    ? parent.expression.name.text
                    : parent.expression.getText(sf),
                ),
            )
          )
            return;
          if (
            ancestors.some(
              (parent) =>
                ts.isImportDeclaration(parent) ||
                ts.isExportDeclaration(parent) ||
                ts.isTypeNode(parent),
            )
          )
            return;
          if (
            ancestors.some(
              (parent) =>
                ts.isCallExpression(parent) &&
                /^console\./.test(parent.expression.getText(sf)),
            )
          ) {
            consoles.push({
              file: relative,
              text,
              reason: "Machine console/debug diagnostic",
            });
            return;
          }
          const parent = node.parent;
          const property = ts.isPropertyAssignment(parent)
            ? parent.name.getText(sf).replace(/^["']|["']$/g, "")
            : "";
          const visibleField = fields.has(property);
          const visibleCall =
            ts.isCallExpression(parent) &&
            /(?:notifySuccess|notifyError|notifyWarning|notifyInfo|Error)$/.test(
              parent.expression.getText(sf),
            );
          const humanPhrase = /[\p{L}\d]+[ \t]+[\p{L}\d]+/u.test(text);
          const returned = ts.isReturnStatement(parent);
          // Conditions and lookup keys are data, not rendered string values.
          const structural =
            ts.isBinaryExpression(parent) &&
            [
              ts.SyntaxKind.EqualsEqualsEqualsToken,
              ts.SyntaxKind.ExclamationEqualsEqualsToken,
            ].includes(parent.operatorToken.kind);
          if (
            !structural &&
            (visibleField || visibleCall || humanPhrase || returned)
          )
            add(
              file,
              visibleField
                ? `field:${property}`
                : visibleCall
                  ? "notification/error"
                  : returned
                    ? "return"
                    : "phrase",
              text,
            );
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
    },
    onTemplate(ast, { file }) {
      function visit(node) {
        if (node.type === 2)
          add(file, "template-text", node.content.replace(/\s+/g, " ").trim());
        if (node.type === 1) {
          for (const prop of node.props)
            if (prop.type === 6 && fields.has(prop.name) && prop.value)
              add(file, `attribute:${prop.name}`, prop.value.content);
          for (const child of node.children) visit(child);
        }
      }
      for (const child of ast.children) visit(child);
    },
  });
  for (const item of extracted.items)
    assert.ok(
      !/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(item.msgid),
      `Artificial translation key used as msgid: ${item.msgid}`,
    );
  return {
    candidates: [...candidates.values()].sort((a, b) =>
      key(a).localeCompare(key(b)),
    ),
    consoles,
    extractedTuples: extracted.items.length,
    sourceFiles: files.length,
    base,
  };
}

export function checkSources(configFile) {
  const result = sourceCandidates(configFile);
  const config = loadConfig(configFile);
  const manifest = path.resolve(
    config.base,
    config.input.exceptions ?? "scripts/gettext/source-exceptions.json",
  );
  const exceptions = JSON.parse(fs.readFileSync(manifest, "utf8"));
  const reviewed = new Map();
  for (const entry of exceptions) {
    assert.ok(entry.reason?.trim(), `Missing exception reason: ${key(entry)}`);
    assert.ok(!reviewed.has(key(entry)), `Duplicate exception: ${key(entry)}`);
    reviewed.set(key(entry), entry);
  }
  const actual = new Set(result.candidates.map(key));
  const missing = result.candidates.filter(
    (entry) => !reviewed.has(key(entry)),
  );
  const stale = exceptions.filter((entry) => !actual.has(key(entry)));
  assert.deepEqual(
    missing,
    [],
    "Untranslated UI candidates require gettext or a reviewed exact exception",
  );
  assert.deepEqual(
    stale,
    [],
    "Stale source exceptions must be removed/reviewed",
  );
  console.log(
    `gettext source check: ${result.sourceFiles} files, ${result.extractedTuples} tuples, ${exceptions.length} exact reviewed exceptions; ${result.consoles.length} console diagnostics; no legacy consumers or unreviewed candidates.`,
  );
  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  checkSources(configArgument(process.argv.slice(2)));
