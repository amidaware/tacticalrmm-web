import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const gettextEntry = import.meta.resolve("vue3-gettext");
export const requireGettext = createRequire(gettextEntry);
export const PO = requireGettext("pofile");
// pofile treats GNU previous-source comments (#|) as continued msgstr text.
// Preserve that review information as ordinary translator comments instead.
export function parseMergedPo(text) {
  return PO.parse(
    text.replace(/^#(?:~)?\|\s?(.*)$/gm, "# Previous source: $1"),
  );
}
export const { globSync } = requireGettext("glob");
export const compiler = path.join(
  path.dirname(fileURLToPath(gettextEntry)),
  "gettext_compile.js",
);
export const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function writeChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === text)
    return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return true;
}
export function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort(compare)
        .map((key) => [key, stableJson(value[key])]),
    );
  return value;
}
export async function command(executable, args, options = {}) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  if (result.code !== 0)
    throw new Error(`${executable} failed (${result.code}): ${result.stderr}`);
  return result;
}
export function loadConfig(file = "gettext.config.cjs") {
  const filename = path.resolve(file),
    base = path.dirname(filename);
  const config = createRequire(import.meta.url)(filename);
  if (!config.input?.include?.length || !config.output?.locales?.length)
    throw new Error("gettext config requires input.include and output.locales");
  const input = {
    ...config.input,
    path: path.resolve(base, config.input.path),
  };
  const output = {
    ...config.output,
    path: path.resolve(base, config.output.path),
    potPath: path.resolve(base, config.output.potPath),
    jsonPath: path.resolve(base, config.output.jsonPath),
  };
  if (output.flat !== true || output.splitJson)
    throw new Error("Use flat PO catalogues and one generated JSON");
  return {
    input,
    output,
    base,
    sourceRoot: path.resolve(base, config.sourceRoot ?? "."),
  };
}
export function canonicalPo(po) {
  delete po.headers["POT-Creation-Date"];
  po.headers = Object.fromEntries(
    Object.keys(po.headers)
      .sort(compare)
      .map((key) => [key, po.headers[key]]),
  );
  po.items.sort((a, b) =>
    compare(
      JSON.stringify([a.msgctxt ?? "", a.msgid, a.msgid_plural ?? ""]),
      JSON.stringify([b.msgctxt ?? "", b.msgid, b.msgid_plural ?? ""]),
    ),
  );
  for (const item of po.items)
    item.references = [
      ...new Set(item.references.map((ref) => ref.replace(/:\d+$/, ""))),
    ].sort(compare);
  return po.toString() + "\n";
}
export function configArgument(args) {
  const i = args.indexOf("--config");
  if (i >= 0 && !args[i + 1]) throw new Error("--config needs a filename");
  return i >= 0 ? args[i + 1] : undefined;
}
