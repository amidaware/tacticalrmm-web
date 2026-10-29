import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Baseline was measured with a CompilerHost overlay of the original service sources.
// Keep the existing diagnostics visible; this is a regression check, not a clean tsc claim.
const reportPath =
  "tests/gettext-runtime/fixtures/service-typecheck-baseline.json";
const baseline = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const configFile = "tests/gettext-runtime/services-tsconfig.json";
const config = ts.readConfigFile(configFile, ts.sys.readFile);
assert.ok(!config.error);
const parsed = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  path.dirname(configFile),
);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const after = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)].map(
  (diagnostic) => ({
    file: diagnostic.file
      ? path.relative(process.cwd(), diagnostic.file.fileName)
      : null,
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
  }),
);
const remaining = baseline.before.map((entry) => JSON.stringify(entry));
const newDiagnostics = after.filter((entry) => {
  const index = remaining.indexOf(JSON.stringify(entry));
  if (index < 0) return true;
  remaining.splice(index, 1);
  return false;
});
if (process.argv.includes("--write"))
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { before: baseline.before, after, newDiagnostics },
      null,
      2,
    ) + "\n",
  );
assert.deepEqual(newDiagnostics, [], "New service TypeScript diagnostics");
console.log(
  `Service TypeScript regression check: ${baseline.before.length} baseline diagnostics, ${after.length} current, ${newDiagnostics.length} new. Existing errors remain documented in ${reportPath}.`,
);
