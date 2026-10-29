import fs from "node:fs";
import path from "node:path";
import {
  parse,
  compileScript,
  compileTemplate,
  rewriteDefault,
} from "@vue/compiler-sfc";

export function sfcPlugin() {
  return {
    name: "test-vue",
    setup(builder) {
      // Match Vite's browser-external handling; no filesystem implementation is bundled.
      builder.onResolve({ filter: /^(node:)?fs$/ }, () => ({
        path: "fs",
        namespace: "test-browser-external",
      }));
      builder.onLoad(
        { filter: /.*/, namespace: "test-browser-external" },
        () => ({
          contents:
            'export function writeFile() { throw new Error("Node filesystem unavailable in browser"); }',
          loader: "js",
        }),
      );
      builder.onLoad({ filter: /\.vue$/ }, (args) => {
        const source = fs.readFileSync(args.path, "utf8"),
          { descriptor, errors } = parse(source, { filename: args.path });
        if (errors.length) throw new Error(String(errors[0]));
        const id = path.basename(args.path);
        let code;
        if (descriptor.scriptSetup)
          code = compileScript(descriptor, {
            id,
            inlineTemplate: true,
          }).content;
        else {
          const script = compileScript(descriptor, { id });
          const template = compileTemplate({
            source: descriptor.template.content,
            filename: args.path,
            id,
            compilerOptions: { bindingMetadata: script.bindings },
          });
          if (template.errors.length)
            throw new Error(String(template.errors[0]));
          code =
            rewriteDefault(script.content, "__sfc__") +
            "\n" +
            template.code.replace("export function render", "function render") +
            "\n__sfc__.render = render; export default __sfc__;";
        }
        return {
          contents: code,
          loader: "ts",
          resolveDir: path.dirname(args.path),
        };
      });
    },
  };
}
