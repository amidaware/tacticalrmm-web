#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PO,
  loadConfig,
  configArgument,
  command,
  compiler,
  stableJson,
  writeChanged,
} from "./catalogue.mjs";

export async function compile(configFile) {
  const { output } = loadConfig(configFile);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trmm-gettext-compile-"));
  try {
    for (const locale of output.locales) {
      const file = path.join(output.path, locale + ".po");
      const po = PO.parse(fs.readFileSync(file, "utf8"));
      if (po.headers.Language !== locale)
        throw new Error(`Expected Language: ${locale} in ${file}`);
      // Whitespace-only forms are untranslated too. Normalize only the temporary
      // compiler input, leaving the translator's PO and fuzzy flags untouched.
      for (const item of po.items)
        item.msgstr = item.msgstr.map((text) => (text.trim() ? text : ""));
      fs.writeFileSync(path.join(temp, locale + ".po"), po.toString());
      await command("msgfmt", [
        "--check",
        "-o",
        path.join(temp, locale + ".mo"),
        file,
      ]);
    }
    const jsonFile = path.join(temp, "translations.json"),
      config = path.join(temp, "gettext.config.cjs");
    fs.writeFileSync(
      config,
      "module.exports = " +
        JSON.stringify({
          output: { ...output, path: temp, jsonPath: jsonFile },
        }) +
        ";\n",
    );
    await command(process.execPath, [compiler, "--config", config]);
    const translations = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
    if (
      Object.keys(translations).sort().join() !==
      [...output.locales].sort().join()
    )
      throw new Error("Compiled languages do not match configured locales");
    writeChanged(
      output.jsonPath,
      JSON.stringify(stableJson(translations), null, 2) + "\n",
    );
    console.log(
      `gettext: compiled ${output.locales.join(", ")} → ${path.relative(process.cwd(), output.jsonPath)}`,
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await compile(configArgument(process.argv.slice(2)));
