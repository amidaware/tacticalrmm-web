/** Extract real Vue/JS/TS literal values; never turn runtime expressions into msgids. */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parse as parseSfc } from "@vue/compiler-sfc";
import { baseParse } from "@vue/compiler-dom";
import { PO, compare } from "./catalogue.mjs";

export function extractAstFiles(
  files,
  { sourceRoot = process.cwd(), locations = true, onAst, onTemplate } = {},
) {
  const items = new Map();
  const keywords = new Set([
    "$gettext",
    "$pgettext",
    "$ngettext",
    "$npgettext",
  ]);
  const literal = (node) =>
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node));
  for (const file of [...files].sort(compare)) {
    const text = fs.readFileSync(file, "utf8");
    function scan(code, _base, prefix = "", suffix = "") {
      const sf = ts.createSourceFile(
        file + ".ts",
        prefix + code + suffix,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      if (sf.parseDiagnostics.length)
        throw new Error(
          `${file}: ${ts.flattenDiagnosticMessageText(sf.parseDiagnostics[0].messageText, " ")}`,
        );
      function visit(node) {
        if (
          ts.isImportSpecifier(node) &&
          keywords.has(node.propertyName?.text) &&
          node.name.text !== node.propertyName.text
        )
          throw new Error(`${file}: gettext import aliases are not supported`);
        if (
          ts.isBindingElement(node) &&
          keywords.has(node.propertyName?.text) &&
          node.name.text !== node.propertyName.text
        )
          throw new Error(
            `${file}: gettext aliases are not supported; use the standard name`,
          );
        if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isIdentifier(node.initializer) &&
          keywords.has(node.initializer.text)
        )
          throw new Error(`${file}: gettext aliases are not supported`);
        if (
          ts.isPropertyAccessExpression(node) &&
          keywords.has(node.name.text) &&
          !(ts.isCallExpression(node.parent) && node.parent.expression === node)
        )
          throw new Error(
            `${file}: gettext method references/aliases are not supported`,
          );
        if (
          ts.isElementAccessExpression(node) &&
          (keywords.has(node.argumentExpression?.text) ||
            /^(?:this\.)?gettext$/.test(node.expression.getText(sf)))
        )
          throw new Error(
            `${file}: use a standard gettext call, not computed access`,
          );
        if (ts.isCallExpression(node)) {
          const callee = node.expression,
            keyword = ts.isPropertyAccessExpression(callee)
              ? callee.name.text
              : ts.isIdentifier(callee)
                ? callee.text
                : "";
          if (keywords.has(keyword)) {
            const context = keyword === "$pgettext" || keyword === "$npgettext",
              plural = keyword === "$ngettext" || keyword === "$npgettext";
            const count = (context ? 1 : 0) + (plural ? 2 : 1);
            const strings = node.arguments.slice(0, count);
            if (strings.length !== count || !strings.every(literal))
              throw new Error(
                `${file}: ${keyword} requires literal msgid/context/plural`,
              );
            const msgctxt = context ? strings[0].text : undefined,
              msgid = strings[context ? 1 : 0].text,
              msgid_plural = plural ? strings.at(-1).text : undefined;
            const key = JSON.stringify([msgctxt ?? "", msgid]);
            let item = items.get(key);
            if (!item) {
              item = new PO.Item();
              Object.assign(item, { msgid, msgctxt, msgid_plural });
              items.set(key, item);
            }
            if (item.msgid_plural !== msgid_plural)
              throw new Error(`${msgid}: conflicting singular/plural uses`);
            item.references.push(
              ...(locations
                ? [path.relative(sourceRoot, file).replaceAll(path.sep, "/")]
                : []),
            );
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
      onAst?.(sf, { file, offset: _base, prefixLength: prefix.length });
    }
    if (!file.endsWith(".vue")) {
      scan(text, 0);
      continue;
    }
    const { descriptor, errors } = parseSfc(text, { filename: file });
    if (errors.length) throw new Error(String(errors[0]));
    for (const block of [descriptor.script, descriptor.scriptSetup].filter(
      Boolean,
    ))
      scan(block.content, block.loc.start.offset);
    if (descriptor.template) {
      const block = descriptor.template,
        ast = baseParse(block.content);
      onTemplate?.(ast, { file });
      function walk(node) {
        if (node.type === 5)
          scan(
            node.content.content,
            block.loc.start.offset + node.content.loc.start.offset,
            "(\n",
            "\n)",
          );
        if (node.type === 1) {
          for (const prop of node.props)
            if (prop.type === 7 && prop.exp) {
              if (prop.name === "for") {
                const match = prop.exp.content.match(
                  /^([\s\S]*?)\s+(?:in|of)\s+([\s\S]+)$/,
                );
                if (!match)
                  throw new Error(`${file}: invalid v-for expression`);
                scan(match[2], 0, "(\n", "\n)");
                continue;
              }
              if (prop.name === "slot") {
                scan(prop.exp.content, 0, "function slot(", ") {}\n");
                continue;
              }
              scan(
                prop.exp.content,
                block.loc.start.offset + prop.exp.loc.start.offset,
                prop.name === "on" ? "function handler() {\n" : "(\n",
                prop.name === "on" ? "\n}" : "\n)",
              );
            }
          for (const child of node.children) walk(child);
        }
      }
      for (const child of ast.children) walk(child);
    }
  }
  const po = new PO();
  po.headers["Content-Type"] = "text/plain; charset=UTF-8";
  po.items = [...items.values()].sort((a, b) =>
    compare(
      JSON.stringify([a.msgctxt ?? "", a.msgid]),
      JSON.stringify([b.msgctxt ?? "", b.msgid]),
    ),
  );
  return po;
}
