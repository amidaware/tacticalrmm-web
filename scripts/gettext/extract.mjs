#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractAstFiles } from "./extract-ast.mjs";
import {
  PO,
  parseMergedPo,
  globSync,
  loadConfig,
  configArgument,
  canonicalPo,
  command,
  writeChanged,
} from "./catalogue.mjs";

export async function extract(configFile) {
  const { input, output, sourceRoot } = loadConfig(configFile);
  const files = globSync(input.include, {
    cwd: input.path,
    ignore: input.exclude ?? [],
    absolute: true,
    nodir: true,
  });
  const extracted = extractAstFiles(files, {
    sourceRoot,
    locations: output.locations !== false,
  });
  const potText = canonicalPo(extracted);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trmm-gettext-extract-"));
  const results = [];
  try {
    const pot = path.join(temp, "messages.pot");
    fs.writeFileSync(pot, potText);
    for (const locale of output.locales) {
      const destination = path.join(output.path, locale + ".po"),
        copy = path.join(temp, locale + ".po");
      if (fs.existsSync(destination)) {
        fs.copyFileSync(destination, copy);
        await command("msgmerge", [
          "--update",
          "--backup=off",
          "--previous",
          ...(output.fuzzyMatching === false ? ["--no-fuzzy-matching"] : []),
          copy,
          pot,
        ]);
      } else
        await command("msginit", [
          "--no-translator",
          "--locale=" + locale,
          "--input=" + pot,
          "--output-file=" + copy,
        ]);
      const po = parseMergedPo(fs.readFileSync(copy, "utf8"));
      if (po.headers.Language !== locale)
        throw new Error(`Expected Language: ${locale} in ${destination}`);
      const text = canonicalPo(po);
      fs.writeFileSync(copy, text);
      await command("msgfmt", [
        "--check",
        "-o",
        path.join(temp, locale + ".mo"),
        copy,
      ]);
      results.push({ destination, text });
    }
    writeChanged(output.potPath, potText);
    for (const result of results) writeChanged(result.destination, result.text);
    console.log(
      `gettext: extracted ${PO.parse(potText).items.length} messages from ${files.length} files; merged ${output.locales.join(", ")}`,
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await extract(configArgument(process.argv.slice(2)));
