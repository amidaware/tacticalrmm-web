import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import { checkSources } from "./source-check.mjs";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
checkSources();
const computedBindings = read(
  "tests/gettext-runtime/fixtures/reactive-bindings.json",
);
for (const [file, names] of Object.entries(computedBindings)) {
  const descriptor = parse(fs.readFileSync(file, "utf8")).descriptor;
  const block = descriptor.scriptSetup ?? descriptor.script;
  const sf = ts.createSourceFile(
    file,
    block.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declarations = new Set();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      names.includes(node.name.text)
    ) {
      assert.ok(
        ts.isCallExpression(node.initializer) &&
          node.initializer.expression.getText(sf) === "computed",
        `${file}: ${node.name.text} must remain reactive`,
      );
      declarations.add(node.name.text);
    }
    if (
      ts.isIdentifier(node) &&
      names.includes(node.text) &&
      node.parent.name !== node &&
      !ts.isShorthandPropertyAssignment(node.parent)
    ) {
      assert.ok(
        ts.isPropertyAccessExpression(node.parent) &&
          node.parent.expression === node &&
          node.parent.name.text === "value",
        `${file}: ${node.text} requires .value in script code`,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.equal(
    declarations.size,
    names.length,
    `${file}: missing reactive bindings`,
  );
}

console.log("Reactive UI binding audit passed.");
