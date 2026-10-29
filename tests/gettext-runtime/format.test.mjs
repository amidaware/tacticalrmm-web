import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { command } from "../../scripts/gettext/catalogue.mjs";

test("format:check fails on bad formatting, never rewrites, and preserves legal/ignored files", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trmm-format-check-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const script = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts[
    "format:check"
  ];
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ scripts: { "format:check": script } }, null, 2) + "\n",
  );
  fs.copyFileSync(".prettierignore", path.join(root, ".prettierignore"));
  fs.writeFileSync(path.join(root, ".gitignore"), "ignored/\n");
  const legal = [
    "LICENSE.md",
    "LICENCE.md",
    "NOTICE.js",
    "COPYING.md",
    "COPYRIGHT.md",
    "PATENTS.md",
    "THIRD-PARTY.js",
  ];
  fs.mkdirSync(path.join(root, "nested"));
  fs.mkdirSync(path.join(root, "ignored"));
  for (const name of legal)
    fs.writeFileSync(
      path.join(root, "nested", name),
      "Legal text is preserved {    exactly   }\n",
    );
  fs.writeFileSync(
    path.join(root, "ignored/cache.js"),
    "unparseable ignored cache ((\n",
  );
  const bad = path.join(root, "bad.js"),
    content = "const value={name:'unformatted'}\n";
  fs.writeFileSync(bad, content);
  const options = {
    cwd: root,
    env: {
      ...process.env,
      PATH:
        path.resolve("node_modules/.bin") + path.delimiter + process.env.PATH,
    },
  };
  await assert.rejects(
    command("npm", ["run", "format:check"], options),
    /bad.js|Code style/,
  );
  assert.equal(fs.readFileSync(bad, "utf8"), content);
  fs.unlinkSync(bad);
  await command("npm", ["run", "format:check"], options);
  for (const name of legal)
    assert.equal(
      fs.readFileSync(path.join(root, "nested", name), "utf8"),
      "Legal text is preserved {    exactly   }\n",
    );
});
