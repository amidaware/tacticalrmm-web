import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import { ref, computed } from "vue";
import { createGettext } from "vue3-gettext";

const gettext = createGettext({
  defaultLanguage: "en",
  sourceCodeLanguage: "en",
  silent: true,
  translations: JSON.parse(
    fs.readFileSync("src/gettext/generated/translations.json", "utf8"),
  ),
});
function actual(file, name, bindings) {
  const source = fs.readFileSync(file, "utf8");
  const descriptor = file.endsWith(".vue") ? parse(source).descriptor : null;
  const sf = ts.createSourceFile(
    file,
    descriptor ? (descriptor.scriptSetup ?? descriptor.script).content : source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let target;
  function visit(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name?.getText(sf) === name
    )
      target = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === name)
      target = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(target, `${file}: missing tested ${name}`);
  const code =
    (ts.isMethodDeclaration(target) ? "function " : "") +
    target.getText(sf).replace(/^export\s+/, "");
  const js = ts.transpileModule(`const tested = (${code});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), js + "\nreturn tested;")(
    ...Object.values(bindings),
  );
}

test("audited file-browser branches render current-language counts without changing props", () => {
  const props = {
    loading: false,
    folderItemCount: 2,
    listTotal: 5,
    filterActive: false,
    hasMore: true,
    loadingMore: false,
    rows: [],
    filterMatchCount: 2,
    filterTotalCount: 5,
    pausedCount: 3,
    filterBusy: false,
  };
  const footer = actual(
    "src/components/agents/remotebg/FileBrowserTable.vue",
    "footerLabel",
    { props, gettext },
  );
  const paused = actual(
    "src/components/agents/remotebg/FileBrowserToolbar.vue",
    "pausedTooltip",
    { props, gettext },
  );
  for (const locale of ["en", "ru", "en", "it"]) {
    gettext.current = locale;
    props.filterActive = false;
    props.hasMore = true;
    assert.equal(
      footer(),
      gettext.$gettext("%{loaded} of %{total} loaded", {
        loaded: "2",
        total: "5",
      }),
    );
    props.listTotal = null;
    assert.equal(footer(), gettext.$gettext("%{count} loaded", { count: "2" }));
    props.hasMore = false;
    props.filterActive = true;
    for (const count of [0, 1, 2, 5, 11, 21, 22, 25]) {
      props.folderItemCount = count;
      assert.equal(
        footer(),
        gettext.$ngettext("%{count} match", "%{count} matches", count, {
          count: count.toLocaleString(),
        }),
      );
    }
    assert.equal(paused(), gettext.$gettext("%{count} paused", { count: 3 }));
    props.folderItemCount = 2;
    props.listTotal = 5;
  }
});

test("check modal option captions react while severity/filter values and form data stay raw", () => {
  const create = actual("src/composables/checks.js", "useCheckModal", {
    ref,
    computed,
    gettext,
    onMounted: () => {},
    defaultServiceOptions: [],
  });
  const state = {
    check_type: "eventlog",
    log_name: "System",
    event_id: 17,
    severity: "warning",
    fail_when: "not_contains",
  };
  const modal = create({ initialState: state });
  for (const locale of ["en", "ru", "en", "it"]) {
    gettext.current = locale;
    assert.deepEqual(modal.severityOptions.value, [
      { label: gettext.$gettext("Informational"), value: "info" },
      { label: gettext.$gettext("Warning"), value: "warning" },
      { label: gettext.$gettext("Error"), value: "error" },
    ]);
    assert.deepEqual(
      modal.failWhenOptions.value.map((item) => item.value),
      ["contains", "not_contains"],
    );
    assert.equal(
      modal.failWhenOptions.value[1].label,
      gettext.$gettext("Log does not contain"),
    );
    assert.deepEqual(modal.state.value, state);
    assert.deepEqual(modal.logNameOptions, [
      "Application",
      "System",
      "Security",
    ]);
  }
});

test("custom-field hints and validation translate the wrapper and preserve user names/defaults", () => {
  const hint = actual("src/components/ui/CustomField.vue", "hintText", {
    truncateText: (value) => value,
  });
  const rules = actual(
    "src/components/ui/CustomField.vue",
    "validationRules",
    {},
  );
  const context = {
    $gettext: gettext.$gettext,
    field: { name: "RAW_USER_FIELD", required: true },
  };
  let previousLocale = gettext.current;
  const liveRules = computed(() => rules.call(context));
  let previousRules = liveRules.value;
  for (const locale of ["en", "ru", "en", "it"]) {
    gettext.current = locale;
    if (previousLocale !== locale)
      assert.notEqual(
        liveRules.value,
        previousRules,
        "Quasar reactive-rules needs a new rule array when language changes",
      );
    previousRules = liveRules.value;
    previousLocale = locale;
    const field = { type: "text", default_value_string: "RAW_default" };
    assert.equal(
      hint.call(context, field),
      gettext.$gettext("Default value: %{value}", { value: "RAW_default" }),
    );
    assert.equal(
      liveRules.value[0](""),
      gettext.$gettext("%{name} is required", { name: "RAW_USER_FIELD" }),
    );
    assert.equal(liveRules.value[0]("RAW_input"), true);
    assert.equal(field.default_value_string, "RAW_default");
  }
});

test("RunScript declares gettext in script and contains no rendered import statement", () => {
  const descriptor = parse(
    fs.readFileSync("src/components/modals/agents/RunScript.vue", "utf8"),
  ).descriptor;
  assert.ok(!descriptor.template.content.includes("import { gettext }"));
  const sf = ts.createSourceFile(
    "RunScript.ts",
    descriptor.scriptSetup.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  assert.ok(
    sf.statements.some(
      (node) =>
        ts.isImportDeclaration(node) &&
        node.moduleSpecifier.text === "@/gettext" &&
        node.importClause.namedBindings.elements.some(
          (entry) => entry.name.text === "gettext",
        ),
    ),
  );
});
