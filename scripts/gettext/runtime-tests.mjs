#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import { sfcPlugin } from "./sfc-test-plugin.mjs";
import { PO, command, writeChanged } from "./catalogue.mjs";
import { compile } from "./compile.mjs";

const root = process.cwd(),
  work = path.resolve(
    process.env.GETTEXT_RUNTIME_WORK ?? ".quasar/gettext-runtime-tests",
  ),
  report = path.resolve(
    process.env.GETTEXT_RUNTIME_REPORT ?? ".quasar/gettext-runtime-report",
  );
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(report, { recursive: true });
const fixture = path.join(work, "locales");
fs.mkdirSync(fixture, { recursive: true });
for (const [locale, translation] of [
  ["ru", "Сохранить"],
  ["it", "Salva"],
]) {
  const po = PO.parse(
    fs.readFileSync(`src/gettext/locales/${locale}.po`, "utf8"),
  );
  po.items = po.items.filter((item) => item.msgid !== "Save" || item.msgctxt);
  const item = new PO.Item();
  item.msgid = "Save";
  item.msgstr = [translation];
  po.items.push(item);
  fs.writeFileSync(path.join(fixture, locale + ".po"), po.toString());
}
const config = path.join(work, "gettext.config.cjs"),
  compiled = path.join(work, "translations.json");
fs.writeFileSync(
  config,
  "module.exports = " +
    JSON.stringify({
      input: { path: "src", include: ["**/*.ts"] },
      output: {
        path: fixture,
        locales: ["ru", "it"],
        potPath: path.join(work, "messages.pot"),
        jsonPath: compiled,
        flat: true,
      },
    }) +
    ";",
);
await compile(config);

function aliasPlugin() {
  return {
    name: "gettext-test-aliases",
    setup(builder) {
      builder.onResolve({ filter: /generated\/translations\.json$/ }, () => ({
        path: compiled,
      }));
      builder.onResolve({ filter: /^@\// }, (args) => {
        const base = path.join(root, "src", args.path.slice(2));
        const resolved = [
          base,
          base + ".ts",
          base + ".js",
          base + ".vue",
          path.join(base, "index.ts"),
          path.join(base, "index.js"),
        ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
        if (!resolved) throw new Error("Missing alias " + args.path);
        return { path: resolved };
      });
    },
  };
}
const browserFile = path.join(work, "browser.js");
await build({
  entryPoints: ["tests/gettext-runtime/browser-entry.ts"],
  outfile: browserFile,
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2022",
  loader: { ".png": "dataurl" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.hot": "undefined",
    __VUE_OPTIONS_API__: "true",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
  },
  plugins: [aliasPlugin(), sfcPlugin()],
  logLevel: "silent",
});
const results = [],
  code = fs.readFileSync(browserFile, "utf8");
const check = (name, fn) => {
  fn();
  results.push(name);
};
async function realm({
  language = "en-US",
  storage = {},
  remote = false,
  blocked = false,
} = {}) {
  const errors = [],
    console = new VirtualConsole();
  console.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div></body></html>',
    {
      url:
        "https://gettext-tests.invalid/" +
        (remote ? "remotebg?agent_id=test" : "login"),
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: console,
      beforeParse(window) {
        Object.defineProperty(window.navigator, "language", {
          value: language,
          configurable: true,
        });
        for (const [key, value] of Object.entries(storage))
          window.localStorage.setItem(key, value);
        if (blocked)
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new window.DOMException("Blocked", "SecurityError");
            },
          });
        window.matchMedia = () => ({
          matches: false,
          addListener() {},
          removeListener() {},
        });
        window.ResizeObserver = class {
          observe() {}
          unobserve() {}
          disconnect() {}
        };
      },
    },
  );
  try {
    dom.window.eval(code);
    const api = await dom.window.gettextReady;
    return {
      dom,
      api,
      errors,
      close() {
        api.close();
        dom.window.close();
      },
    };
  } catch (error) {
    dom.window.close();
    throw error;
  }
}
const primary = await realm({
  language: "it-IT",
  storage: { ui_locale_preference: "ru", ui_locale: "ru" },
});
try {
  const { api, dom } = primary,
    preferences = api.vm.$refs.preferences;
  const assertLanguage = (locale, text) => {
    assert.equal(api.gettext.current, locale);
    assert.equal(api.locale.currentLocale.value, locale);
    assert.equal(api.language(), { en: "en-US", ru: "ru", it: "it" }[locale]);
    if (text)
      assert.equal(dom.window.document.querySelector("#new").textContent, text);
  };
  check(
    "actual boot before authentication preserves an explicit RU preference with gettext",
    () => {
      assert.equal(api.auth.loggedIn, false);
      assertLanguage("ru", "Сохранить");
    },
  );
  check("Vue globals contain gettext and no legacy translator", () =>
    assert.equal(api.hasLegacyApi, false),
  );
  const dropdown = api.vm.$refs.dropdown;
  dropdown.filterFn("s", (update) => update());
  for (const value of ["en-US", "RU_ru", "it-IT", "unknown"]) {
    const expected = {
      "en-US": "en",
      RU_ru: "ru",
      "it-IT": "it",
      unknown: "en",
    }[value];
    await api.locale.setLocale(value, { persist: false });
    await api.wait();
    check(
      "full upload/download queues render current-language codes and keep opaque legacy errors: " +
        value,
      () => {
        for (const selector of [
          "#download-message-queue",
          "#upload-message-queue",
        ]) {
          const text = dom.window.document.querySelector(selector)?.textContent;
          assert.ok(
            text?.includes(
              api.gettext.$gettext("Connection interrupted — reconnecting…"),
            ),
          );
          assert.ok(text?.includes("filebrowser.files"));
          assert.ok(!text?.includes("OLD_SNAPSHOT"));
          assert.ok(text?.includes("RAW_legacy"));
        }
      },
    );
    check(
      "compact download progress renders a stable message code: " + value,
      () => {
        const text = dom.window.document.querySelector(
          "#compact-download-progress",
        )?.textContent;
        assert.ok(
          text?.includes(
            api.gettext.$gettext("Connection interrupted — reconnecting…"),
          ),
        );
        assert.ok(text?.includes("RAW_compact"));
        assert.ok(!text?.includes("OLD_SNAPSHOT"));
      },
    );
    check(
      "filtered dropdown follows translated options and retains its selected value: " +
        value,
      () => {
        assert.equal(dropdown.modelValue, "save");
        assert.deepEqual(
          Array.from(dropdown.filteredOptions, (option) => option.label),
          Array.from(dropdown.options)
            .filter((option) => option.label.toLowerCase().includes("s"))
            .map((option) => option.label),
        );
      },
    );
    const queueButtons = () => [
      ...dom.window.document.querySelectorAll("#transfer-actions button"),
    ];
    const clickQueueButton = async (label) => {
      const button = queueButtons().find(
        (button) => button.textContent.trim() === api.gettext.$gettext(label),
      );
      assert.ok(button, `${expected}: ${label}`);
      button.click();
      await api.wait();
    };
    api.queueMode.value = "active";
    await api.wait();
    const eventCount = api.queueEvents.length;
    await clickQueueButton("Pause");
    await clickQueueButton("Resume");
    await clickQueueButton("Cancel");
    check(
      "transfer controls keep stable pause/resume/cancel events: " + value,
      () => {
        assert.deepEqual(Array.from(api.queueEvents.slice(eventCount)), [
          "pause",
          "resume",
          "cancel",
        ]);
        const disabled = [
          ...dom.window.document.querySelectorAll(
            "#owned-transfer-actions button",
          ),
        ].find(
          (button) =>
            button.textContent.trim() === api.gettext.$gettext("Resume"),
        );
        assert.ok(
          disabled?.disabled,
          "a queue owned by another tab stays disabled",
        );
        disabled.click();
        assert.ok(!api.queueEvents.includes("invalid-owned-resume"));
      },
    );
    check("TacticalTable column labels update without reload: " + value, () => {
      const header = dom.window.document.querySelector(
        "#translated-table thead",
      );
      assert.ok(header);
      assert.ok(
        header.textContent.includes(
          { en: "Save", ru: "Сохранить", it: "Salva" }[expected],
        ),
      );
    });
    check(
      "UserPreferences option labels update without reload: " + value,
      () => {
        for (const [property, keys] of [
          [
            "clientTreeSortOptions",
            [
              "Sort alphabetically, moving failing clients to the top",
              "Sort alphabetically only",
            ],
          ],
          [
            "agentDblClickOptions",
            [
              "Edit Agent",
              ["User preferences", "Take Control"],
              "Remote Background",
              "Run URL Action",
            ],
          ],
          ["defaultAgentTblTabOptions", ["Servers", "Workstations", "Mixed"]],
          ["localeOptions", ["System (auto)"]],
        ]) {
          for (const [index, key] of keys.entries())
            assert.equal(
              preferences[property][index].label,
              Array.isArray(key)
                ? api.gettext.$pgettext(...key)
                : api.gettext.$gettext(key),
              `${expected}: ${property}`,
            );
        }
        for (const option of preferences.loadingBarColorOptions)
          assert.equal(
            option.label,
            api.gettext.$gettext(
              option.value
                .split("-")
                .map((word) => word[0].toUpperCase() + word.slice(1))
                .join(" "),
            ),
          );
        assert.equal(preferences.clientTreeSortOptions[0].value, "alphafail");
        assert.equal(preferences.agentDblClickOptions[1].value, "takecontrol");
        assert.equal(preferences.defaultAgentTblTabOptions[0].value, "server");
      },
    );
    check("one setter synchronizes gettext/Quasar: " + value, () =>
      assertLanguage(
        expected,
        { en: "Save", ru: "Сохранить", it: "Salva" }[expected],
      ),
    );
  }
  check(
    "fallback and profile helpers retain their previous normalization policy",
    () => {
      assert.equal(api.locale.normalizeLocale("de-DE"), null);
      assert.equal(api.locale.normalizeLocale(null), null);
      assert.equal(
        api.locale.getLocaleFromProfile({ user: { locale: "ru_RU" } }),
        "ru",
      );
    },
  );
  check("persist:false leaves the saved locale untouched", () =>
    assert.equal(dom.window.localStorage.getItem("ui_locale"), "ru"),
  );
  for (const field of [null, "locale", "language", "lang", "ui_locale"]) {
    api.setDashboardField(field);
    preferences.getUserPrefs();
    await api.wait();
    preferences.locale = "ru";
    const start = api.requests.length;
    await preferences.editUserPrefs();
    await api.wait();
    const patch = api.requests
      .slice(start)
      .find((request) => request.method === "patch");
    check(
      "UserPreferences saves the existing payload; optional backend field " +
        field,
      () => {
        assert.equal(patch.url, "/accounts/users/ui/");
        const keys = ["locale", "language", "lang", "ui_locale"].filter((key) =>
          Object.hasOwn(patch.data, key),
        );
        assert.equal(keys.join(), field ?? "");
        if (field) assert.equal(patch.data[field], "ru");
        assert.equal(patch.data.date_format, "YYYY-MM-DD");
        assert.equal(patch.data.agent_dblclick_action, "takecontrol");
        assert.equal(
          dom.window.localStorage.getItem("ui_locale_preference"),
          "ru",
        );
        assert.equal(dom.window.localStorage.getItem("ui_locale"), "ru");
        assertLanguage("ru", "Сохранить");
      },
    );
  }
  await api.auth.checkCredentials({ username: "test", password: "test" });
  await api.wait();
  check(
    "real auth actions with mocked HTTP do not reset language on login",
    () => {
      assert.equal(api.auth.loggedIn, true);
      assertLanguage("ru");
    },
  );
  await api.auth.logout();
  await api.auth.login({
    username: "test",
    password: "test",
    twofactor: "123456",
  });
  await api.wait();
  check("two-factor login action preserves the shared locale", () => {
    assert.equal(api.auth.loggedIn, true);
    assertLanguage("ru");
  });
  await api.auth.logout();
  await api.wait();
  check("logout clears authentication but preserves locale preference", () => {
    assert.equal(api.auth.loggedIn, false);
    assert.equal(dom.window.localStorage.getItem("ui_locale_preference"), "ru");
    assertLanguage("ru");
  });
  const stored = Object.fromEntries(
    Object.keys(dom.window.localStorage).map((key) => [
      key,
      dom.window.localStorage.getItem(key),
    ]),
  );
  for (const remote of [false, true]) {
    const fresh = await realm({ language: "en-US", storage: stored, remote });
    try {
      check(
        remote
          ? "new RemoteBackground window uses the saved preference"
          : "reload restores saved preference before authentication",
        () => {
          assert.equal(fresh.api.gettext.current, "ru");
          assert.equal(fresh.api.language(), "ru");
          assert.deepEqual(fresh.errors, []);
        },
      );
    } finally {
      fresh.close();
    }
  }
  api.setDashboardField("language");
  preferences.getUserPrefs();
  await api.wait();
  preferences.locale = "system";
  const start = api.requests.length;
  await preferences.editUserPrefs();
  await api.wait();
  check(
    "system choice uses browser language, preserves optional payload and clears only ui_locale",
    () => {
      assertLanguage("it", "Salva");
      assert.equal(
        dom.window.localStorage.getItem("ui_locale_preference"),
        "system",
      );
      assert.equal(dom.window.localStorage.getItem("ui_locale"), null);
      assert.equal(
        api.requests.slice(start).find((r) => r.method === "patch").data
          .language,
        "it",
      );
    },
  );
  check("no unhandled DOM errors", () => assert.deepEqual(primary.errors, []));
} finally {
  primary.close();
}
for (const [name, options, expected] of [
  [
    "system follows browser aliases",
    { language: "ru-RU", storage: { ui_locale_preference: "system" } },
    "ru",
  ],
  ["unknown browser locale falls back to EN", { language: "de-DE" }, "en"],
  [
    "ui_locale alone does not override the existing system-preference policy",
    { language: "en-US", storage: { ui_locale: "ru" } },
    "en",
  ],
  [
    "blocked storage does not crash boot or switching",
    { language: "it-IT", blocked: true },
    "it",
  ],
]) {
  const fresh = await realm(options);
  try {
    check(name, () => {
      assert.equal(fresh.api.gettext.current, expected);
    });
    if (options.blocked) {
      fresh.api.locale.setLocalePreference("ru");
      fresh.api.locale.clearStoredLocale();
      await fresh.api.locale.setLocale("ru");
      check("live switching still works when persistence is denied", () =>
        assert.equal(fresh.api.gettext.current, "ru"),
      );
    }
  } finally {
    fresh.close();
  }
}
// Server/unit-test imports must work even without window, navigator, document or storage.
const nodeFile = path.join(work, "no-browser.cjs");
await build({
  entryPoints: ["tests/gettext-runtime/no-browser-entry.ts"],
  outfile: nodeFile,
  bundle: true,
  platform: "node",
  format: "cjs",
  define: { "import.meta.hot": "undefined" },
  plugins: [aliasPlugin()],
  logLevel: "silent",
});
const node = await command(process.execPath, [nodeFile]);
check("no browser globals", () =>
  assert.match(node.stdout, /safely without browser globals/),
);
writeChanged(
  path.join(report, "runtime.json"),
  JSON.stringify(
    {
      checks: results,
      passed: results.length,
      backend:
        "HTTP mocked; actual auth actions, boot functions and UserPreferences component executed",
      remoteWindow:
        "Independent DOM/global realm using production boot; no agent connection",
      errors: [],
    },
    null,
    2,
  ) + "\n",
);
console.log(`Gettext runtime: ${results.length} runtime/policy checks passed.`);
