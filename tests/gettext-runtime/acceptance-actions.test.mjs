import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
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
  const source = fs.readFileSync(file, "utf8"),
    descriptor = file.endsWith(".vue") ? parse(source).descriptor : null;
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
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(target, `${file}:${name}`);
  let code = target.getText(sf).replace(/^export\s+/, "");
  if (ts.isMethodDeclaration(target))
    code = code.startsWith("async ")
      ? "async function " + code.slice(6)
      : "function " + code;
  const js = ts.transpileModule(`const tested = (${code});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), js + "\nreturn tested;")(
    ...Object.values(bindings),
  );
}
const locales = ["en", "ru", "en", "it"];
const clone = (value) => JSON.parse(JSON.stringify(value));

test("client create/edit submits original names, site and custom-field data in every locale", async () => {
  const formatCustomFields = actual(
    "src/utils/format.ts",
    "formatCustomFields",
    {},
  );
  for (const locale of locales)
    for (const editing of [false, true]) {
      gettext.current = locale;
      const state = { value: { id: 17, name: "RAW_Client" } },
        site = { value: { name: "RAW_Site" } },
        loading = { value: false };
      const fields = [{ id: 8, type: "text", name: "RAW_field" }],
        values = { RAW_field: "RAW_value" },
        calls = [],
        notices = [];
      let ok = 0;
      const submit = actual(
        "src/components/clients/ClientsForm.vue",
        "submit",
        {
          loading,
          state,
          site,
          customFields: { value: fields },
          custom_fields: { value: values },
          formatCustomFields,
          props: { client: editing ? { id: 17 } : null },
          saveClient: async (data) => {
            calls.push(["post", data]);
            return "RAW_BACKEND";
          },
          editClient: async (id, data) => {
            calls.push(["put", id, data]);
            return "RAW_BACKEND";
          },
          notifySuccess: (message) => notices.push(message),
          onDialogOK: () => ok++,
        },
      );
      await submit();
      const expected = {
        client: state.value,
        site: { name: "RAW_Site" },
        custom_fields: [{ string_value: "RAW_value", field: 8 }],
      };
      assert.deepEqual(calls, [
        editing ? ["put", 17, expected] : ["post", expected],
      ]);
      assert.deepEqual(notices, ["RAW_BACKEND"]);
      assert.equal(ok, 1);
      assert.equal(loading.value, false);
    }
});

test("role create/edit preserves permission flags and numeric client/site selections", async () => {
  for (const locale of locales)
    for (const editing of [false, true]) {
      gettext.current = locale;
      const role = {
          value: {
            id: 19,
            name: "RAW_Role",
            can_run_scripts: true,
            can_manage_reports: false,
            can_use_file_browser: true,
            can_view_clients: [17],
            can_view_sites: [23],
          },
        },
        loading = { value: false },
        calls = [];
      const before = clone(role.value);
      const submit = actual(
        "src/components/accounts/RolesForm.vue",
        "onSubmit",
        {
          role,
          loading,
          props: { role: editing ? role.value : null },
          saveRole: async (data) => {
            calls.push(["post", clone(data)]);
            return "RAW_OK";
          },
          editRole: async (id, data) => {
            calls.push(["put", id, clone(data)]);
            return "RAW_OK";
          },
          notifySuccess: () => {},
          onDialogOK: () => {},
        },
      );
      await submit();
      assert.deepEqual(calls, [
        editing ? ["put", 19, before] : ["post", before],
      ]);
      assert.deepEqual(role.value, before);
      assert.equal(loading.value, false);
    }
});

test("check create/edit preserves enum, agent, thresholds and event-log data", async () => {
  for (const locale of locales)
    for (const editing of [false, true]) {
      gettext.current = locale;
      const check = {
          value: {
            id: 29,
            check_type: "eventlog",
            agent: "RAW_AGENT",
            log_name: "System",
            severity: "warning",
            fail_when: "not_contains",
            event_id: 41,
            search_last_days: 3,
          },
        },
        loading = { value: false },
        calls = [];
      const before = clone(check.value);
      const submit = actual("src/composables/checks.js", "submit", {
        check,
        loading,
        editCheck: editing,
        saveCheck: async (data) => {
          calls.push(["post", clone(data)]);
          return "RAW_OK";
        },
        updateCheck: async (id, data) => {
          calls.push(["put", id, clone(data)]);
          return "RAW_OK";
        },
        notifySuccess: () => {},
      });
      let ok = 0;
      await submit(() => ok++);
      assert.deepEqual(calls, [
        editing ? ["put", 29, before] : ["post", before],
      ]);
      assert.deepEqual(check.value, before);
      assert.equal(ok, 1);
      assert.equal(loading.value, false);
    }
});

test("task create/edit keeps original bitmasks, UTC fields, script args and monthlydow conversion", async () => {
  const file = "src/components/tasks/AutomatedTaskForm.vue";
  const convertFromBitArray = actual(
    "src/utils/format.ts",
    "convertFromBitArray",
    {},
  );
  for (const locale of locales)
    for (const editing of [false, true]) {
      gettext.current = locale;
      const localTask = {
        id: 31,
        name: "RAW_Task",
        task_type: "monthly",
        run_time_bit_weekdays: [2, 8],
        monthly_months_of_year: [1, 64],
        monthly_days_of_month: [4, 16],
        monthly_weeks_of_month: [1, 8],
        run_time_date: "2026-11-01T10:30:00",
        expire_date: "2026-12-01T10:30:00",
        script: 11,
        script_args: ["--raw", "{value1}"],
        env_vars: ["RAW=данные"],
        task_instance_policy: 2,
      };
      const before = clone(localTask),
        calls = [],
        loading = { value: false };
      const processTaskDataforDB = actual(file, "processTaskDataforDB", {
        localTask,
        monthlyType: { value: "weeks" },
        convertFromBitArray,
      });
      const submit = actual(file, "submit", {
        loading,
        props: { task: editing ? localTask : null },
        localTask,
        processTaskDataforDB,
        saveTask: async (data) => {
          calls.push(["post", data]);
          return "RAW_OK";
        },
        updateTask: async (id, data) => {
          calls.push(["put", id, data]);
          return "RAW_OK";
        },
        notifySuccess: () => {},
        onDialogOK: () => {},
      });
      await submit();
      const expected = {
        ...before,
        task_type: "monthlydow",
        run_time_bit_weekdays: 10,
        monthly_months_of_year: 65,
        monthly_days_of_month: 20,
        monthly_weeks_of_month: 9,
        run_time_date: before.run_time_date + "Z",
        expire_date: before.expire_date + "Z",
      };
      assert.deepEqual(calls, [
        editing ? ["put", 31, expected] : ["post", expected],
      ]);
      assert.deepEqual(localTask, before);
      assert.equal(loading.value, false);
    }
});

test("script create/edit/clone never translates editor code, filenames, category or args", async () => {
  for (const locale of locales)
    for (const mode of ["create", "edit", "clone"]) {
      gettext.current = locale;
      const script = {
          id: 37,
          name: "RAW_Script",
          category: "Unassigned",
          shell: "python",
          filename: "raw.py",
          script_body: 'print("{value1} | {{ raw_jinja }}")',
          args: ["--raw"],
          env_vars: ["RAW=данные"],
          default_timeout: 91,
        },
        before = clone(script),
        calls = [],
        loading = { value: false };
      const submit = actual(
        "src/components/scripts/ScriptFormModal.vue",
        "submit",
        {
          loading,
          script,
          props: {
            script: mode === "create" ? null : script,
            clone: mode === "clone",
          },
          saveScript: async (data) => {
            calls.push(["post", clone(data)]);
            return "RAW_OK";
          },
          editScript: async (data) => {
            calls.push(["put", clone(data)]);
            return "RAW_OK";
          },
          notifySuccess: () => {},
          onDialogOK: () => {},
        },
      );
      await submit();
      assert.deepEqual(calls, [[mode === "edit" ? "put" : "post", before]]);
      assert.deepEqual(script, before);
      assert.equal(loading.value, false);
    }
});

test("policy create/edit/copy keeps API route and raw fields while notification follows current locale", async () => {
  const submit = actual(
    "src/components/automation/modals/PolicyForm.vue",
    "submit",
    {},
  );
  for (const locale of locales)
    for (const mode of ["create", "edit", "copy"]) {
      gettext.current = locale;
      const localPolicy = {
          id: 43,
          name: "RAW_Policy",
          desc: "RAW_description",
          active: true,
          enforced: false,
        },
        before = clone(localPolicy),
        calls = [],
        notices = [];
      let shown = 0,
        hidden = 0,
        ok = 0;
      const context = {
        localPolicy,
        editing: mode === "edit",
        copyPolicy: mode === "copy" ? { id: 47 } : null,
        $gettext: gettext.$gettext,
        $q: { loading: { show: () => shown++, hide: () => hidden++ } },
        $axios: {
          post: async (url, data) => calls.push(["post", url, data]),
          put: async (url, data) => calls.push(["put", url, data]),
        },
        notifySuccess: (message) => notices.push(message),
        onOk: () => ok++,
      };
      submit.call(context);
      await new Promise((resolve) => setImmediate(resolve));
      const expected = mode === "copy" ? { ...before, copyId: 47 } : before;
      assert.deepEqual(calls, [
        [
          mode === "edit" ? "put" : "post",
          mode === "edit"
            ? "/automation/policies/43/"
            : "/automation/policies/",
          expected,
        ],
      ]);
      assert.deepEqual(localPolicy, before);
      assert.equal(shown, 1);
      assert.equal(hidden, 1);
      assert.equal(ok, 1);
      assert.deepEqual(notices, [
        gettext.$gettext(
          mode === "edit"
            ? "Policy edited!"
            : "Policy added. Now you can add Tasks and Checks!",
        ),
      ]);
    }
});
