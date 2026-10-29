import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { loadConfig, configArgument } from "./catalogue.mjs";
import { extract } from "./extract.mjs";

export async function checkExtraction(configFile) {
  const { input, output, base } = loadConfig(configFile);
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "trmm-gettext-extraction-check-"),
  );
  try {
    const names = [
      "messages.pot",
      ...output.locales.map((locale) => locale + ".po"),
    ];
    for (const locale of output.locales)
      fs.copyFileSync(
        path.join(output.path, locale + ".po"),
        path.join(temp, locale + ".po"),
      );
    const config = path.join(temp, "gettext.config.cjs");
    fs.writeFileSync(
      config,
      "module.exports = " +
        JSON.stringify({
          input,
          output: {
            ...output,
            path: temp,
            potPath: path.join(temp, "messages.pot"),
            jsonPath: path.join(temp, "translations.json"),
          },
          sourceRoot: base,
        }) +
        ";\n",
    );
    await extract(config);
    for (const name of names) {
      const original =
        name === "messages.pot" ? output.potPath : path.join(output.path, name);
      assert.equal(
        fs.readFileSync(original, "utf8"),
        fs.readFileSync(path.join(temp, name), "utf8"),
        `${name} is stale. Run npm run gettext:extract and review PO changes.`,
      );
    }
    console.log(
      "gettext extraction check: POT/PO are current; working files unchanged.",
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await checkExtraction(configArgument(process.argv.slice(2)));
