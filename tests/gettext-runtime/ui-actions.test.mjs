import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import { createGettext } from "vue3-gettext";
import { computed } from "vue";

// Exercise translation behavior independently of optional production coverage.
const gettext = createGettext({
  defaultLanguage: "en",
  sourceCodeLanguage: "en",
  silent: true,
  translations: JSON.parse(
    fs.readFileSync(
      "tests/gettext-runtime/fixtures/test-translations.json",
      "utf8",
    ),
  ),
});

const uiLabels = JSON.parse(
  fs.readFileSync("tests/gettext-runtime/fixtures/ui-labels.json", "utf8"),
);

function actualFunction(file, name, bindings = {}) {
  const descriptor = parse(fs.readFileSync(file, "utf8")).descriptor;
  const source = (descriptor.scriptSetup ?? descriptor.script).content;
  const sf = ts.createSourceFile(
    file + ".ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let target;
  function visit(node) {
    if (
      (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) &&
      node.name?.getText(sf) === name
    )
      target = node;
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sf) === name &&
      node.initializer &&
      ts.isArrowFunction(node.initializer)
    )
      target = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(target, `${file}: ${name}`);
  const text =
    (ts.isMethodDeclaration(target) ? "function " : "") + target.getText(sf);
  const javascript = ts.transpileModule(`const tested = (${text});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(
    ...Object.keys(bindings),
    `${javascript}\nreturn tested;`,
  )(...Object.values(bindings));
}

test("agent alert actions preserve backend fields and raw hostname across EN/RU/IT and unknown categories", async () => {
  const action = actualFunction(
    "src/components/AgentTable.vue",
    "overdueAlert",
  );
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    for (const [category, field] of [
      ["email", "overdue_email_alert"],
      ["text", "overdue_text_alert"],
      ["dashboard", "overdue_dashboard_alert"],
      ["unknown", ""],
    ]) {
      for (const enabled of [true, false]) {
        const requests = [],
          notifications = [];
        action.call(
          {
            $gettext: gettext.$gettext,
            $pgettext: gettext.$pgettext,
            dash_positive_color: "green",
            dash_info_color: "blue",
            $axios: {
              put: (url, data) => {
                requests.push({ url, data });
                return Promise.resolve();
              },
            },
            $q: { notify: (payload) => notifications.push(payload) },
          },
          category,
          { agent_id: 42, hostname: "USER_HOSTNAME" },
          enabled,
        );
        await Promise.resolve();
        assert.deepEqual(requests, [
          { url: "/agents/42/", data: { [field]: !enabled } },
        ]);
        assert.equal(notifications.length, 1);
        assert.ok(notifications[0].message.includes("USER_HOSTNAME"));
        if (category === "unknown")
          assert.ok(
            notifications[0].message.includes(
              "dashboard.agentTable.alerts.category.unknown",
            ),
          );
        if (locale === "ru")
          assert.match(notifications[0].message, /Оповещения/);
        else assert.match(notifications[0].message, /alerts will now be/);
      }
    }
  }
});

test("history and severity maps translate only known labels and preserve original fallbacks", () => {
  const en = uiLabels.agents.en;
  const ru = uiLabels.agents.ru;
  const history = actualFunction(
    "src/components/agents/HistoryTab.vue",
    "getHistoryActionLabel",
    {
      gettext,
      formatTableColumnText: (value) => `FORMATTED:${value}`,
    },
  );
  const severity = actualFunction(
    "src/components/agents/WinUpdateTab.vue",
    "getSeverityLabel",
    { gettext },
  );
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    const messages = locale === "ru" ? ru : en;
    for (const [value, expected] of Object.entries(messages.historyTab.actions))
      assert.equal(history(value), expected);
    assert.equal(history("unrecognized_event"), "FORMATTED:unrecognized_event");
    assert.equal(history("constructor"), "FORMATTED:constructor");
    for (const value of [null, undefined, ""])
      assert.equal(history(value), value);
    for (const [value, expected] of Object.entries(
      messages.winUpdateTab.severity,
    ))
      assert.equal(severity(` ${value.toUpperCase()} `), expected);
    assert.equal(severity("Unrecognized severity"), "Unrecognized severity");
    assert.equal(severity(null), messages.winUpdateTab.severity.other);
  }
});

test("native file drag detection uses the browser Files token independently of language", () => {
  const isFileDragEvent = actualFunction(
    "src/components/agents/remotebg/FileBrowserManager.vue",
    "isFileDragEvent",
  );
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    assert.equal(
      isFileDragEvent({ dataTransfer: { types: ["text/plain", "Files"] } }),
      true,
    );
    assert.equal(
      isFileDragEvent({ dataTransfer: { types: ["Файлы"] } }),
      false,
    );
    assert.equal(isFileDragEvent({ dataTransfer: null }), false);
  }
});

test("task scheduling options update labels while preserving every original bitmask and enum value", () => {
  const expectedByLocale = JSON.parse(
    fs.readFileSync("tests/gettext-runtime/fixtures/task-options.json", "utf8"),
  );
  const options = Object.fromEntries(
    Object.keys(expectedByLocale.en).map((name) => {
      const factory = actualFunction(
        "src/components/tasks/AutomatedTaskForm.vue",
        name,
        { gettext },
      );
      return [name, computed(() => factory())];
    }),
  );
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    for (const [name, expected] of Object.entries(expectedByLocale[locale])) {
      assert.deepEqual(options[name].value, expected, `${locale}: ${name}`);
    }
  }
});

test("audit and debug maps retain normalization and unknown-value fallback", () => {
  const file = "src/components/logs/AuditManager.vue";
  const audit = actualFunction(file, "getAuditActionLabel", {
    gettext,
    normalizeActionKey: actualFunction(file, "normalizeActionKey"),
    formatTableColumnText: (value) => `FORMATTED:${value}`,
  });
  const debugFile = "src/components/logs/DebugLog.vue";
  const level = actualFunction(debugFile, "getLogLevelLabel", { gettext });
  const type = actualFunction(debugFile, "getLogTypeLabel", {
    gettext,
    formatTableColumnText: (value) => `FORMATTED:${value}`,
  });
  const en = uiLabels.settings.en;
  const ru = uiLabels.settings.ru;
  const types = {
    agent_update: "agentUpdate",
    agent_issues: "agentIssues",
    windows_updates: "windowsUpdates",
    system_issues: "systemIssues",
    scripting: "scripting",
  };
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    const messages = locale === "ru" ? ru : en;
    for (const [key, expected] of Object.entries(messages.auditManager.actions))
      assert.equal(
        audit(` ${key.replaceAll("_", " ").toUpperCase()} `),
        expected,
      );
    for (const [key, expected] of Object.entries(
      messages.editCoreSettings.logLevel,
    ))
      assert.equal(level(key.toUpperCase()), expected);
    for (const [key, property] of Object.entries(types))
      assert.equal(type(key), messages.debugLog.logTypes[property]);
    assert.equal(
      audit("  Unrecognized Action  "),
      "FORMATTED:unrecognized_action",
    );
    assert.equal(level("Unrecognized level"), "Unrecognized level");
    assert.equal(type("unrecognized_type"), "FORMATTED:unrecognized_type");
    for (const value of [null, undefined, ""]) {
      assert.equal(audit(value), value);
      assert.equal(level(value), value);
      assert.equal(type(value), value);
    }
  }
});

test("chart captions react to locale while preserving threshold coordinates and styles", () => {
  const options = actualFunction(
    "src/components/graphs/CheckGraph.vue",
    "chartOptions",
  );
  const base = {
    noData: { text: "old" },
    annotations: {
      yaxis: [
        {
          id: "error-threshold",
          y: 90,
          borderColor: "red",
          label: { text: "old", position: "left" },
        },
        {
          id: "warning-threshold",
          y: 70,
          borderColor: "orange",
          label: { text: "old", position: "left" },
        },
      ],
    },
  };
  const before = JSON.stringify(base);
  const rendered = computed(() =>
    options.call({ baseChartOptions: base, $gettext: gettext.$gettext }),
  );
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    assert.equal(rendered.value.noData.text, gettext.$gettext("No Data"));
    assert.deepEqual(
      rendered.value.annotations.yaxis.map((row) => [
        row.y,
        row.borderColor,
        row.label.position,
      ]),
      [
        [90, "red", "left"],
        [70, "orange", "left"],
      ],
    );
    assert.deepEqual(
      rendered.value.annotations.yaxis.map((row) => row.label.text),
      [
        gettext.$gettext("Error Threshold"),
        gettext.$gettext("Warning Threshold"),
      ],
    );
    assert.equal(JSON.stringify(base), before);
  }
});

test("client/site deletion keeps selected destination and API payload while translating confirmation", async () => {
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    for (const type of ["client", "site"]) {
      const requests = [],
        notifications = [],
        dialogs = [],
        loading = { value: false };
      let confirm,
        finished = 0;
      const submit = actualFunction(
        "src/components/clients/DeleteClient.vue",
        "submit",
        {
          gettext,
          props: {
            type,
            object: { id: 17, name: "USER_OBJECT", agent_count: 9 },
          },
          site: { value: 84 },
          loading,
          $q: {
            dialog: (dialog) => {
              dialogs.push(dialog);
              return {
                onOk(callback) {
                  confirm = callback;
                },
              };
            },
          },
          removeClient: async (id, payload) => {
            requests.push({ type: "client", id, payload });
            return "backend-result";
          },
          removeSite: async (id, payload) => {
            requests.push({ type: "site", id, payload });
            return "backend-result";
          },
          notifySuccess: (message) => notifications.push(message),
          onDialogOK: () => finished++,
        },
      );
      submit();
      assert.equal(requests.length, 0, "must wait for confirmation");
      assert.ok(dialogs[0].message.includes("USER_OBJECT"));
      assert.ok(dialogs[0].message.includes("9"));
      assert.equal(dialogs[0].ok.label, locale === "ru" ? "Удалить" : "Delete");
      await confirm();
      assert.deepEqual(requests, [
        { type, id: 17, payload: { move_to_site: 84 } },
      ]);
      assert.deepEqual(notifications, ["backend-result"]);
      assert.equal(finished, 1);
      assert.equal(loading.value, false);
    }
  }
});

test("file dialogs preserve names, extraction destination and conflict policy in every language", async () => {
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    for (const component of [
      "FileBrowserNewFolderModal",
      "FileBrowserRenameModal",
    ]) {
      const events = [];
      const submit = actualFunction(
        `src/components/agents/remotebg/${component}.vue`,
        "onSubmit",
        {
          props: { saving: false },
          nameInputRef: { value: { validate: async () => true } },
          localName: { value: "  USER_Папка.zip  " },
          originalName: { value: "old" },
          emit: (...event) => events.push(event),
        },
      );
      await submit();
      assert.deepEqual(events, [["save", "USER_Папка.zip"]]);
    }
    for (const policy of ["skip", "replace"]) {
      const events = [];
      const submit = actualFunction(
        "src/components/agents/remotebg/FileBrowserExtractDialog.vue",
        "onSubmit",
        {
          props: { saving: false },
          destInputRef: { value: { validate: async () => true } },
          destination: { value: "  /USER_Папка/archive  " },
          conflictPolicy: { value: policy },
          emit: (...event) => events.push(event),
        },
      );
      await submit();
      assert.deepEqual(events, [
        [
          "save",
          { destination: "/USER_Папка/archive", conflictPolicy: policy },
        ],
      ]);
    }
    const decisions = [];
    const choose = actualFunction(
      "src/components/agents/remotebg/FileBrowserUploadConflictDialog.vue",
      "choose",
      {
        onDialogOK: (action) => decisions.push(action),
        onDialogCancel: () => decisions.push("cancel"),
      },
    );
    for (const action of ["skip", "replace", "cancel"]) choose(action);
    assert.deepEqual(decisions, ["skip", "replace", "cancel"]);
  }
});

test("download UI uses stable selection modes and passes raw items to ZIP/single/multiple download actions", async () => {
  const items = [
    {
      id: "raw-id",
      name: "USER_Архив.zip",
      path: "/USER_Архив.zip",
      type: "file",
    },
  ];
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    for (const mode of ["none", "zip", "single", "multiple"]) {
      for (const proceed of [true, false]) {
        const events = [],
          warnings = [];
        const start = actualFunction(
          "src/components/agents/remotebg/FileBrowserManager.vue",
          "startDownloads",
          {
            gettext,
            classifyDownloadSelection: (actual) => {
              assert.equal(actual, items);
              return { mode, files: items };
            },
            notifyWarning: (message) => warnings.push(message),
            offerZipDownloadDialog: async () => proceed,
            startZipDownload: (actual) => {
              assert.equal(actual, items);
              events.push("zip");
            },
            enqueueDownloads: async (actual, single) => {
              assert.equal(actual, items);
              events.push(single ? "single" : "multiple");
            },
          },
        );
        await start(items);
        assert.deepEqual(
          events,
          mode === "none" || (mode === "zip" && !proceed) ? [] : [mode],
        );
        assert.equal(warnings.length, mode === "none" ? 1 : 0);
        assert.equal(items[0].name, "USER_Архив.zip");
      }
    }
  }
});
