import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { spawn } from "node:child_process";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";

const work = path.resolve(".quasar/gettext-service-tests");
fs.mkdirSync(work, { recursive: true });
const output = path.join(work, "tests.cjs");
const functions = {};
for (const [name, file] of [
  ...[
    "runSingleDownload",
    "runSingleUpload",
    "scheduleAutoResume",
    "formatDownloadBatchSummary",
  ].map((name) => [
    name,
    "src/components/agents/remotebg/FileBrowserManager.vue",
  ]),
  ["waitForUploadCommitted", "src/services/fileTransfer/upload.ts"],
  ["tree", "src/components/scripts/ScriptManager.vue"],
  ["copyOutput", "src/utils/helpers.ts"],
  ["useSchedule", "src/core/settings/api.ts"],
  ["isValidThreshold", "src/utils/validation.ts"],
  ["useReportTemplates", "src/ee/reporting/api/reporting.ts"],
]) {
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
  let target;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name)
      target = node;
    if (
      name === "tree" &&
      ts.isVariableDeclaration(node) &&
      node.name.getText(sf) === name
    )
      target = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!target) throw new Error(`Missing tested function: ${file}:${name}`);
  functions[name] =
    ts.transpileModule(
      `const tested = (${target.getText(sf).replace(/^export\s+/, "")});`,
      {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      },
    ).outputText + "\nreturn tested;";
}
await build({
  entryPoints: ["tests/gettext-runtime/services-entry.ts"],
  outfile: output,
  platform: "node",
  format: "cjs",
  bundle: true,
  target: "node20",
  loader: { ".png": "dataurl" },
  define: { "import.meta.hot": "undefined" },
  plugins: [
    {
      name: "source-alias",
      setup(builder) {
        // Service behavior tests need a stable translated label, not complete RU.
        builder.onResolve({ filter: /generated\/translations\.json$/ }, () => ({
          path: path.resolve(
            "tests/gettext-runtime/fixtures/test-translations.json",
          ),
        }));
        builder.onResolve({ filter: /^gettext-tested-functions$/ }, () => ({
          path: "tested-functions",
          namespace: "tested-functions",
        }));
        builder.onLoad({ filter: /.*/, namespace: "tested-functions" }, () => ({
          contents: `const functions = ${JSON.stringify(functions)}; export function makeFunction(name, bindings) { return new Function(...Object.keys(bindings), functions[name])(...Object.values(bindings)); }`,
          loader: "js",
        }));
        builder.onResolve({ filter: /^@\/router$/ }, () => ({
          path: "service-test-router",
          namespace: "service-test-router",
        }));
        builder.onLoad(
          { filter: /.*/, namespace: "service-test-router" },
          () => ({
            contents:
              'export const router = { push() { throw new Error("Unexpected navigation in service test"); } };',
            loader: "js",
          }),
        );
        builder.onResolve({ filter: /^@\// }, (args) => {
          const base = path.resolve("src", args.path.slice(2));
          const file = [
            base,
            base + ".ts",
            base + ".js",
            path.join(base, "index.ts"),
            path.join(base, "index.js"),
          ].find(
            (candidate) =>
              fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
          );
          if (!file) throw new Error(`Unresolved alias: ${args.path}`);
          return { path: file };
        });
      },
    },
  ],
  logLevel: "silent",
});
process.exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [output], { stdio: "inherit" });
  child.on("error", reject);
  child.on("close", (code) => resolve(code ?? 1));
});
