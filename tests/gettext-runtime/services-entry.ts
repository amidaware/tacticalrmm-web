import assert from "node:assert/strict";
import test from "node:test";
import { makeFunction } from "gettext-tested-functions";
import {
  FatalTransferError,
  BackendTransferError,
} from "@/services/fileTransfer/transferFaults";
import {
  parseContentRangeHeader,
  getAgentFileDownloadChunk,
  getUploadChunkReady,
} from "@/api/filebrowser";
import { withTransientRetry } from "@/services/fileTransfer/sessionLimit";
import { isAbortError } from "@/services/fileTransfer/resume";
import { createRenderer, nextTick, computed, ref } from "vue";
import { createStore } from "vuex";
import { useScriptDropdown } from "@/composables/scripts";
import { useCustomFieldDropdown } from "@/composables/core";
import axios, { AxiosError } from "axios";
import { gettext } from "@/gettext";
import {
  formatScriptOptions,
  formatCustomFieldOptions,
  groupScriptsByCategory,
} from "@/utils/format";
import mixins from "@/mixins/mixins";
import { TransferIntegrityError } from "@/services/fileTransfer/transferErrors";
import {
  isTransferIntegrityError,
  transferFailureErrorMessage,
} from "@/services/fileTransfer/transferQueueHelpers";
import { getFileBrowserErrorMessage } from "@/utils/filebrowser";
import {
  isDuplicateNameError,
  isListFilesAgentOfflineError,
  transferQueueStatusLabelWithSlotWait,
} from "@/utils/filebrowser";
import {
  setTransferMessage,
  transferItemMessage,
  setTransferFailureMessage,
} from "@/services/fileTransfer/queueMessages";
import {
  TransferSlotWaitTimeoutError,
  TransferStalledError,
  isRetryableTransferError,
  isTransferAckWaitError,
} from "@/services/fileTransfer/sessionLimit";
import type { TransferMessageState } from "@/types/filebrowser";
import {
  indexedDB as testIndexedDB,
  IDBKeyRange as TestKeyRange,
} from "fake-indexeddb";
import {
  closeFileTransferIdb,
  idbWriteDownloadBytes,
  idbGetDownloadBytes,
  downloadBytesSessionKey,
  saveDownloadResume,
  loadDownloadResume,
} from "@/services/fileTransfer/resume";
import {
  putTransferUiMeta,
  listTransferUiMetaForAgent,
  reconcileResumableTransfers,
  persistUploadQueueMeta,
  persistDownloadQueueMeta,
  listLocalPausedEntries,
} from "@/services/fileTransfer/transferQueuePersist";
import {
  FILE_TRANSFER_IDB_VERSION,
  FILE_TRANSFER_LOCAL_PAUSED_LS_KEY,
} from "@/constants/fileTransfer";

const scripts = [
  {
    id: 1,
    name: "zeta",
    category: null,
    script_type: "custom",
    default_timeout: 21,
  },
  {
    id: 2,
    name: "alpha",
    category: "Unassigned",
    script_type: "custom",
    default_timeout: 22,
  },
  {
    id: 3,
    name: "beta",
    category: "Без категории",
    script_type: "custom",
    default_timeout: 23,
  },
  {
    id: 4,
    name: "aardvark",
    category: "Basics",
    script_type: "builtin",
    default_timeout: 24,
  },
  {
    id: 5,
    name: "alpha",
    category: "",
    script_type: "custom",
    default_timeout: 25,
  },
];

test("script groups do not collide with translated Unassigned and keep ids/order in every locale", () => {
  const before = JSON.stringify(scripts);
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    const groups = groupScriptsByCategory(scripts as never);
    assert.deepEqual(
      groups.map((group) => [
        group.category,
        group.scripts.map((script) => script.id),
      ]),
      [
        ["Basics", [4]],
        ["Unassigned", [2]],
        ["Без категории", [3]],
        [null, [5, 1]],
      ],
    );
    const options = formatScriptOptions(scripts as never);
    assert.deepEqual(
      options
        .filter((option) => "value" in option)
        .map((option) => option.value),
      [4, 2, 3, 5, 1],
    );
    assert.equal(
      options.filter((option) => "category" in option).at(-1)?.category,
      gettext.$gettext("Unassigned"),
    );
    assert.equal(JSON.stringify(scripts), before);
  }
});

test("legacy mixin keeps filtering and timeout/argument contracts with stable category groups", async () => {
  axios.defaults.adapter = async (config) => {
    assert.equal(config.url, "/scripts/");
    return {
      data: scripts,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    for (const includeBuiltin of [false, true]) {
      const options = await mixins.methods.getScriptOptions(includeBuiltin);
      const rows = options.filter((option) => "value" in option);
      assert.deepEqual(
        rows.map((option) => option.value),
        includeBuiltin ? [4, 2, 3, 5, 1] : [2, 3, 5, 1],
      );
      for (const row of rows) {
        assert.equal(
          row.timeout,
          scripts.find((script) => script.id === row.value)?.default_timeout,
        );
        assert.deepEqual(Object.keys(row).sort(), [
          "args",
          "env_vars",
          "label",
          "timeout",
          "value",
        ]);
      }
    }
  }
});

test("custom-field model grouping and stored numeric selections do not depend on labels", () => {
  const fields = [
    { id: 11, model: "client", name: "Sites" },
    { id: 12, model: "site", name: "Agents" },
    { id: 13, model: "agent", name: "Пользовательское поле" },
    { id: 14, model: "unknown", name: "not shown" },
  ];
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    const options = formatCustomFieldOptions(fields as never);
    assert.deepEqual(
      options
        .filter((option) => "category" in option)
        .map((option) => option.value),
      ["client", "site", "agent"],
    );
    assert.deepEqual(
      options
        .filter((option) => !("category" in option))
        .map((option) => [option.value, option.label]),
      [
        [11, "Sites"],
        [12, "Agents"],
        [13, "Пользовательское поле"],
      ],
    );
    assert.equal(
      options.find((option) => option.value === 12)?.label,
      "Agents",
    );
  }
});

test("integrity classification uses an own error type or raw backend detail, never a displayed translation", () => {
  gettext.current = "en";
  const own = new TransferIntegrityError();
  const response = {
    data: { detail: "SHA-256 mismatch" },
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: {} as never,
  };
  const backend = new AxiosError(
    "localized display is irrelevant",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    response,
  );
  for (const locale of ["en", "ru", "it", "en"]) {
    gettext.current = locale;
    assert.equal(isTransferIntegrityError(own), true);
    assert.equal(isTransferIntegrityError(backend), true);
    assert.equal(
      isTransferIntegrityError(
        new Error("Download integrity check failed (SHA-256 mismatch)."),
      ),
      false,
    );
    assert.equal(
      transferFailureErrorMessage(own, "download"),
      gettext.$gettext("Download failed: file integrity check did not match."),
    );
    assert.equal(getFileBrowserErrorMessage({}, "FALLBACK"), "FALLBACK");
    assert.equal(
      getFileBrowserErrorMessage(new Error("USER_DEFINED_ERROR"), "FALLBACK"),
      "USER_DEFINED_ERROR.",
    );
  }
});

test("queue state codes render in the current locale and opaque legacy messages never become keys", () => {
  gettext.current = "en";
  const item: TransferMessageState = {};
  setTransferMessage(item, "waiting-slot");
  const snapshot = item.errorMessage;
  for (const locale of ["ru", "en", "it", "ru"]) {
    gettext.current = locale;
    assert.equal(item.messageCode, "waiting-slot");
    assert.equal(item.errorMessage, snapshot);
    assert.equal(
      transferQueueStatusLabelWithSlotWait("BASE", item.messageCode, true),
      gettext.$gettext("Waiting for slot…"),
    );
    if (locale === "ru") assert.notEqual(transferItemMessage(item), snapshot);
    for (const text of ["filebrowser.files", snapshot, "USER_ERROR_ошибка"]) {
      const legacy = { errorMessage: text };
      assert.equal(transferItemMessage(legacy), text);
      assert.equal(
        transferQueueStatusLabelWithSlotWait("BASE", undefined, true),
        "BASE",
      );
    }
  }
  setTransferMessage(item);
  assert.deepEqual(item, {
    messageCode: undefined,
    errorDetail: undefined,
    fault: undefined,
    errorMessage: undefined,
  });
});

test("backend duplicate/offline classification and pending error display remain independent of UI locale", () => {
  const response = (detail: string) => ({
    data: { detail },
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: {} as never,
  });
  const duplicate = new AxiosError(
    "DISPLAY",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    response('A file or folder named "USER_Папка" already exists.'),
  );
  const offline = new AxiosError(
    "DISPLAY",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    response("Unable to contact the agent"),
  );
  const item: TransferMessageState = {};
  gettext.current = "en";
  setTransferFailureMessage(item, duplicate, "upload");
  assert.equal(item.messageCode, "backend");
  for (const locale of ["ru", "en", "it", "ru"]) {
    gettext.current = locale;
    assert.equal(isDuplicateNameError(duplicate), true);
    assert.equal(isListFilesAgentOfflineError(offline), true);
    assert.equal(isListFilesAgentOfflineError(duplicate), false);
    assert.ok(transferItemMessage(item)?.includes("USER_Папка"));
    assert.equal(
      transferItemMessage(item),
      gettext.$gettext('A file or folder named "%{name}" already exists.', {
        name: "USER_Папка",
      }),
    );
    assert.equal(
      item.errorDetail,
      response('A file or folder named "USER_Папка" already exists.').data
        .detail,
    );
  }
});

test("retry and acknowledgement timeout flags survive translation changes; custom timeout text is preserved", () => {
  gettext.current = "en";
  const stalled = new TransferStalledError();
  const timeout = new TransferSlotWaitTimeoutError();
  const custom = new TransferSlotWaitTimeoutError("CUSTOM_TIMEOUT");
  const ack = new AxiosError(
    "DISPLAY",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      data: { detail: "Timed out waiting for agent to commit chunk" },
      status: 408,
      statusText: "Timeout",
      headers: {},
      config: {} as never,
    },
  );
  for (const locale of ["ru", "en", "it", "ru"]) {
    gettext.current = locale;
    assert.equal(isRetryableTransferError(stalled), true);
    assert.equal(isRetryableTransferError(ack), true);
    assert.equal(isTransferAckWaitError(ack), true);
    const item: TransferMessageState = {};
    setTransferFailureMessage(item, timeout, "upload");
    assert.equal(item.messageCode, "slot-timeout");
    assert.equal(
      transferItemMessage(item),
      getFileBrowserErrorMessage(timeout),
    );
    setTransferFailureMessage(item, custom, "download");
    assert.equal(transferItemMessage(item), "CUSTOM_TIMEOUT");
    assert.equal(getFileBrowserErrorMessage(custom), "CUSTOM_TIMEOUT");
  }
});

test("version-3 metadata and paused entries restore after close/reopen without persisting translation fields", async () => {
  const values = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  globalThis.indexedDB = testIndexedDB;
  globalThis.IDBKeyRange = TestKeyRange;
  globalThis.window = Object.assign(new EventTarget(), {
    showOpenFilePicker: () => [],
  }) as never;
  assert.equal(FILE_TRANSFER_IDB_VERSION, 3);
  const now = Date.now();
  const upload = {
    sessionId: "up-old",
    agentId: "agent",
    operation: "upload",
    filename: "USER_файл.txt",
    destinationPath: "/dest/USER_файл.txt",
    totalSize: 12,
    uploadIdentity: { name: "USER_файл.txt", size: 12, lastModified: 100 },
    updatedAt: now,
    localQueueId: "old-upload",
  };
  const download = {
    sessionId: "down-old",
    agentId: "agent",
    operation: "download",
    filename: "USER_архив.zip",
    destinationPath: "/raw/source.zip",
    totalSize: 12,
    updatedAt: now,
    localQueueId: "old-download",
  };
  const archive = {
    sessionId: "archive-old",
    agentId: "agent",
    operation: "download",
    filename: "USER_archive.zip",
    destinationPath: "",
    totalSize: 0,
    isArchive: true,
    archivePaths: ["/raw/folder"],
    updatedAt: now,
  };
  for (const meta of [upload, download, archive])
    await putTransferUiMeta(meta as never);
  saveDownloadResume("agent", "/raw/source.zip", {
    sessionId: "down-old",
    handleKey: "old-handle",
  } as never);
  await idbWriteDownloadBytes(
    [downloadBytesSessionKey("down-old")],
    {
      buffers: [new Uint8Array([1, 2, 3, 4]).buffer],
      committedOffset: 4,
      chunkSize: 4,
      chunksId: "old-chunks",
    },
    0,
  );
  const transfers = [
    {
      session_id: "up-old",
      operation: "upload",
      filename: upload.filename,
      destination_path: upload.destinationPath,
      total_size: 12,
      committed_offset: 4,
      chunk_size: 4,
      status: "paused",
      expires_at: new Date(now + 600_000).toISOString(),
      is_archive: false,
    },
    {
      session_id: "down-old",
      operation: "download",
      filename: download.filename,
      destination_path: download.destinationPath,
      total_size: 12,
      committed_offset: 4,
      chunk_size: 4,
      status: "paused",
      expires_at: new Date(now + 600_000).toISOString(),
      is_archive: false,
    },
    {
      session_id: "archive-old",
      operation: "download",
      filename: archive.filename,
      destination_path: "",
      total_size: 0,
      committed_offset: 0,
      chunk_size: 4,
      status: "waiting_for_agent",
      expires_at: new Date(now + 600_000).toISOString(),
      is_archive: true,
    },
  ];
  try {
    for (const locale of ["en", "ru", "en", "it"]) {
      gettext.current = locale;
      closeFileTransferIdb();
      const restored = await reconcileResumableTransfers(
        "agent",
        transfers as never,
      );
      const file = restored.downloads.find(
        (item) => item.sessionId === "down-old",
      )!;
      const zip = restored.downloads.find(
        (item) => item.sessionId === "archive-old",
      )!;
      assert.equal(file.id, "old-download");
      assert.equal(file.name, download.filename);
      assert.equal(file.sourcePath, download.destinationPath);
      assert.equal(file.progress, 1 / 3);
      assert.equal(file.recoveryHint, "ready");
      assert.equal(zip.messageCode, "archive-preparing");
      assert.equal(
        transferItemMessage(zip),
        gettext.$gettext("Archive was still preparing. Resume to continue."),
      );
      assert.equal(restored.uploads[0].id, "old-upload");
      assert.deepEqual(
        restored.uploads[0].uploadFileIdentity,
        upload.uploadIdentity,
      );
      assert.deepEqual(
        loadDownloadResume("agent", "/raw/source.zip")?.sessionId,
        "down-old",
      );
      const bytes = await idbGetDownloadBytes(
        downloadBytesSessionKey("down-old"),
      );
      assert.equal(bytes?.committedOffset, 4);
      assert.deepEqual(
        Array.from(new Uint8Array(bytes!.buffers[0])),
        [1, 2, 3, 4],
      );
      const meta = await listTransferUiMetaForAgent("agent");
      assert.deepEqual(
        meta.find((item) => item.sessionId === "up-old"),
        upload,
      );
      assert.ok(
        meta.every(
          (item) =>
            !("messageCode" in item) &&
            !("errorDetail" in item) &&
            !("errorMessage" in item),
        ),
      );
    }
    const pausedUpload = {
      id: "local-up",
      name: "RAW_local.txt",
      sizeBytes: 12,
      sizeLabel: "12 B",
      destinationPath: "/local/upload",
      status: "paused",
      progress: 0,
      uploadFileIdentity: upload.uploadIdentity,
    };
    const pausedDownload = {
      id: "local-down",
      name: "RAW_local.zip",
      sourcePath: "/local/download",
      status: "paused",
      progress: 0,
      totalSize: 12,
    };
    setTransferMessage(pausedUpload, "reconnecting");
    setTransferMessage(pausedDownload, "waiting-slot");
    await persistUploadQueueMeta("agent", pausedUpload as never);
    await persistDownloadQueueMeta("agent", pausedDownload as never);
    const raw = localStorage.getItem(FILE_TRANSFER_LOCAL_PAUSED_LS_KEY)!;
    assert.ok(
      !raw.includes("messageCode") &&
        !raw.includes("errorMessage") &&
        !raw.includes("errorDetail"),
    );
    assert.equal(listLocalPausedEntries("agent").length, 2);
    gettext.current = "ru";
    closeFileTransferIdb();
    const restored = await reconcileResumableTransfers(
      "agent",
      transfers as never,
    );
    assert.equal(
      restored.uploads.find((item) => item.id === "local-up")?.destinationPath,
      "/local/upload",
    );
    assert.equal(
      restored.downloads.find((item) => item.id === "local-down")?.sourcePath,
      "/local/download",
    );
    assert.equal(localStorage.getItem(FILE_TRANSFER_LOCAL_PAUSED_LS_KEY), raw);
  } finally {
    closeFileTransferIdb();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).localStorage;
  }
});

test("live dropdown labels do not refetch or overwrite edited arguments, timeout or selected ids", async () => {
  type Host = { children: Host[]; parent?: Host; text?: string };
  const renderer = createRenderer<Host, Host>({
    createElement: () => ({ children: [] }),
    createText: (text) => ({ children: [], text }),
    createComment: (text) => ({ children: [], text }),
    insert: (node, parent) => {
      node.parent = parent;
      parent.children.push(node);
    },
    remove: (node) => {
      if (node.parent)
        node.parent.children = node.parent.children.filter(
          (child) => child !== node,
        );
    },
    parentNode: (node) => node.parent ?? null,
    nextSibling: () => null,
    setText: (node, text) => {
      node.text = text;
    },
    setElementText: (node, text) => {
      node.text = text;
    },
    patchProp: () => {},
  });
  let dropdown: ReturnType<typeof useScriptDropdown>;
  let fields: ReturnType<typeof useCustomFieldDropdown>;
  const requests: { url: string | undefined; params: unknown }[] = [];
  axios.defaults.adapter = async (config) => {
    requests.push({ url: config.url, params: config.params });
    const data =
      config.url === "/scripts/"
        ? scripts.map((script) => ({
            ...script,
            args: ["BASE"],
            env_vars: ["BASE=1"],
            syntax: "powershell",
            supported_platforms: ["windows"],
          }))
        : [{ id: 12, name: "USER_FIELD", model: "site", type: "text" }];
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  const app = renderer.createApp({
    setup() {
      dropdown = useScriptDropdown({ script: 2, onMount: false });
      fields = useCustomFieldDropdown({ onMount: false });
      return () => null;
    },
  });
  app.use(createStore({ state: { showCommunityScripts: true } }));
  app.mount({ children: [] });
  try {
    gettext.current = "en";
    await dropdown!.getScriptOptions();
    await fields!.getCustomFieldOptions("site" as never);
    await nextTick();
    dropdown!.defaultArgs.value = ["USER --argument"];
    dropdown!.defaultEnvVars.value = ["USER_SECRET=value"];
    dropdown!.defaultTimeout.value = 99;
    for (const locale of ["ru", "en", "it", "ru"]) {
      gettext.current = locale;
      await nextTick();
      assert.equal(dropdown!.script.value, 2);
      assert.deepEqual(dropdown!.defaultArgs.value, ["USER --argument"]);
      assert.deepEqual(dropdown!.defaultEnvVars.value, ["USER_SECRET=value"]);
      assert.equal(dropdown!.defaultTimeout.value, 99);
      assert.equal(
        dropdown!.scriptOptions.value
          .filter((option) => "category" in option)
          .at(-1)?.category,
        gettext.$gettext("Unassigned"),
      );
      assert.equal(
        fields!.customFieldOptions.value.find((option) => option.value === 12)
          ?.label,
        "USER_FIELD",
      );
      assert.equal(
        fields!.customFieldOptions.value.filter(
          (option) => "category" in option,
        )[1].label,
        gettext.$pgettext("Custom fields", "Sites"),
      );
    }
    assert.deepEqual(requests, [
      { url: "/scripts/", params: { showCommunityScripts: true } },
      { url: "/core/customfields/", params: { site: "site" } },
    ]);
  } finally {
    app.unmount();
  }
});

test("fatal local/backend errors cannot be retried by matching the English word 'load failed'", async () => {
  const fault = new FatalTransferError({ code: "upload-rejected" });
  gettext.current = "en";
  assert.match(fault.message, /load failed/i);
  for (const locale of ["ru", "en", "it", "ru"]) {
    gettext.current = locale;
    for (const error of [
      fault,
      new TransferIntegrityError(),
      new BackendTransferError("Upload failed"),
      new BackendTransferError("Network error"),
    ]) {
      assert.equal(isRetryableTransferError(error), false);
      let attempts = 0;
      await assert.rejects(
        withTransientRetry(
          async () => {
            attempts++;
            throw error;
          },
          { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
        ),
        (actual) => actual === error,
      );
      assert.equal(attempts, 1);
    }
    const item: TransferMessageState = {};
    setTransferFailureMessage(item, fault, "upload");
    assert.equal(item.messageCode, "fatal");
    assert.deepEqual(item.fault, { code: "upload-rejected" });
    assert.equal(transferItemMessage(item), getFileBrowserErrorMessage(fault));
    assert.throws(
      () => parseContentRangeHeader("network error; already exists"),
      (error) => {
        assert.ok(error instanceof FatalTransferError);
        assert.equal(isRetryableTransferError(error), false);
        assert.equal(isDuplicateNameError(error), false);
        return true;
      },
    );
  }
});

test("actual upload/download handlers connect protocol failure to typed queue state and current-language notification", async () => {
  const previous = ["window", "localStorage", "indexedDB", "IDBKeyRange"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  const values = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  globalThis.indexedDB = testIndexedDB;
  globalThis.IDBKeyRange = TestKeyRange;
  globalThis.window = Object.assign(new EventTarget(), {
    showOpenFilePicker: () => [],
  }) as never;
  try {
    for (const [initialLocale, displayedLocale] of [
      ["en", "ru"],
      ["ru", "en"],
      ["en", "it"],
      ["ru", "en"],
    ]) {
      for (const direction of ["download", "upload"]) {
        for (const ownedElsewhere of [false, true]) {
          gettext.current = initialLocale;
          closeFileTransferIdb();
          const restored = await reconcileResumableTransfers("AGENT", [
            {
              session_id: "RESTORED",
              operation: direction,
              filename: "USER_файл.txt",
              destination_path:
                direction === "download" ? "/raw/source" : "/raw/dest",
              total_size: 16,
              committed_offset: 4,
              chunk_size: 4,
              status: "paused",
              expires_at: new Date(Date.now() + 600_000).toISOString(),
              is_archive: false,
            },
          ] as never);
          const recovered =
            direction === "download"
              ? restored.downloads[0]
              : restored.uploads[0];
          const item = {
            ...recovered,
            file: new File([new Uint8Array(16)], "USER_файл.txt", {
              lastModified: 1,
            }),
            status: "queued",
          };
          assert.equal(item.id, "restored-RESTORED");
          const requests: { url?: string; params?: unknown }[] = [],
            notifications: string[] = [],
            releases: string[] = [];
          const claims = new Map(),
            controllers = new Map(),
            intents = new Map();
          axios.defaults.adapter = async (config) => {
            requests.push({ url: config.url, params: config.params });
            const data =
              direction === "upload"
                ? { status: "failed", error: "", committed_offset: 0 }
                : new ArrayBuffer(4);
            return {
              data,
              status: 200,
              statusText: "OK",
              headers: { "content-range": "INVALID_RAW_HEADER" },
              config,
            };
          };
          const committed = makeFunction("waitForUploadCommitted", {
            withTransientRetry,
            getUploadChunkReady,
            FatalTransferError,
            BackendTransferError,
          });
          const transport = async (...args: unknown[]) => {
            assert.equal(args[0], "AGENT");
            if (direction === "download") assert.equal(args[1], "/raw/source");
            else {
              assert.equal(args[1], item.file);
              assert.equal(args[2], "/raw/dest");
            }
            const options = args.at(-1) as {
              knownSessionId: string;
              onWaitingForSlot(): void;
            };
            assert.equal(options.knownSessionId, "RESTORED");
            options.onWaitingForSlot();
            assert.equal(
              (item as TransferMessageState).messageCode,
              "waiting-slot",
            );
            gettext.current = displayedLocale;
            return withTransientRetry(
              async () => {
                if (direction === "upload")
                  return committed("AGENT", "RESTORED", 16, {});
                const chunk = await getAgentFileDownloadChunk(
                  "AGENT",
                  "RESTORED",
                  4,
                );
                return parseContentRangeHeader(chunk.contentRange);
              },
              { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
            );
          };
          const bindings = {
            gettext,
            props: { agent_id: "AGENT" },
            setTransferMessage,
            setTransferFailureMessage,
            transferItemMessage,
            [`find${direction === "download" ? "Download" : "Upload"}Item`]:
              () => item,
            [`claimKeyFor${direction === "download" ? "Download" : "Upload"}`]:
              () => "RAW_CLAIM",
            getTabSync: () => ({ tryClaim: () => !ownedElsewhere }),
            [`${direction}ClaimKeys`]: claims,
            [`${direction}AbortControllers`]: controllers,
            [`${direction}AbortIntents`]: intents,
            FILE_TRANSFER_DEFAULT_CHUNK_SIZE: 8 * 1024 * 1024,
            runFileDownloadTransfer: transport,
            runFileUploadTransfer: transport,
            isDownloadAbortError: isAbortError,
            isUploadAbortError: isAbortError,
            isRetryableTransferError,
            isUploadMultiBatchNotify: () => false,
            [`release${direction === "download" ? "Download" : "Upload"}Claim`]:
              (_id: string, reason: string) => {
                releases.push(reason);
                claims.clear();
              },
            downloadBatchIsSingle: { value: true },
            downloadQueue: { value: [item] },
            notifyError: (message: string) => notifications.push(message),
          };
          const run = makeFunction(
            direction === "download" ? "runSingleDownload" : "runSingleUpload",
            bindings,
          );
          await run(item.id);
          assert.equal(controllers.size, 0);
          assert.equal(intents.size, 0);
          if (ownedElsewhere) {
            assert.equal(item.status, "paused");
            assert.equal(requests.length, 0);
            assert.equal(notifications.length, 0);
          } else {
            assert.equal(item.status, "failed");
            assert.equal((item as TransferMessageState).messageCode, "fatal");
            assert.equal(requests.length, 1);
            assert.equal(
              requests[0].url,
              `/agents/AGENT/files/${direction}/RESTORED/chunk/`,
            );
            assert.deepEqual(
              requests[0].params,
              direction === "download" ? { committed_offset: 4 } : undefined,
            );
            assert.deepEqual(releases, ["fail"]);
            assert.equal(notifications.length, 1);
            assert.ok(notifications[0].includes(transferItemMessage(item)!));
            assert.equal(item.progress, 0.25);
          }
          assert.equal(item.name, "USER_файл.txt");
        }
      }
    }
  } finally {
    closeFileTransferIdb();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  }
});

test("an auto-resume scheduled before a locale change still fires, without reinterpreting legacy text", () => {
  for (const [before, after] of [
    ["en", "ru"],
    ["ru", "en"],
  ]) {
    gettext.current = before;
    const item = {
      id: "restored-item",
      status: "paused",
      committedOffset: 4,
    } as TransferMessageState & {
      id: string;
      status: string;
      committedOffset: number;
    };
    setTransferMessage(item, "reconnecting");
    let callback: () => void = () => {},
      resumed = 0;
    const schedule = makeFunction("scheduleAutoResume", {
      TransferStalledError,
      autoResumeState: new Map(),
      autoResumeTimers: new Set(),
      FILE_TRANSFER_AUTO_RESUME_ATTEMPTS: 5,
      FILE_TRANSFER_AUTO_RESUME_DELAY_MS: 15_000,
      setTimeout: (fn: () => void, delay: number) => {
        assert.equal(delay, 15_000);
        callback = fn;
        return 1;
      },
      findDownloadItem: () => item,
      findUploadItem: () => undefined,
    });
    assert.equal(
      schedule(item, new TransferStalledError(), (id: string) => {
        assert.equal(id, item.id);
        resumed++;
      }),
      true,
    );
    gettext.current = after;
    callback();
    assert.equal(resumed, 1);
    const snapshot = item.errorMessage;
    delete item.messageCode;
    item.errorMessage = snapshot;
    callback();
    assert.equal(resumed, 1, "unknown old text cannot trigger own-state retry");
  }
});

test("persistent batch summaries derive from counts and update in both locale directions", () => {
  const summary = makeFunction("formatDownloadBatchSummary", { gettext });
  const counts = { succeeded: 3, failed: 1, paused: 2, cancelled: 1 };
  const before = JSON.stringify(counts);
  const caption = computed(() => summary(counts));
  for (const locale of ["en", "ru", "en", "it"]) {
    gettext.current = locale;
    assert.equal(
      caption.value,
      [
        gettext.$gettext("%{count} succeeded", { count: 3 }),
        gettext.$gettext("%{count} failed", { count: 1 }),
        gettext.$gettext("%{count} paused", { count: 2 }),
        gettext.$gettext("%{count} cancelled", { count: 1 }),
      ].join(" · "),
    );
    assert.equal(JSON.stringify(counts), before);
  }
});

test("script tree categories and node IDs survive locale changes and label collisions", () => {
  const scripts = [
    { id: 1, name: "Zulu", category: "Unassigned" },
    { id: 2, name: "Alpha", category: null },
    { id: 3, name: "Beta", category: "Без категории" },
    { id: 4, name: "charlie", category: "Unassigned" },
  ];
  const tree = makeFunction("tree", {
    tableView: { value: false },
    visibleScripts: { value: scripts },
    categories: { value: ["Unassigned", "Без категории"] },
    gettext,
  });
  let original: unknown;
  for (const locale of ["en", "ru", "en", "it"]) {
    gettext.current = locale;
    const nodes = tree();
    const structure = nodes.map(
      (node: { id: string; children: { id: number }[] }) => ({
        id: node.id,
        children: node.children.map((child) => child.id),
      }),
    );
    original ??= structure;
    assert.deepEqual(structure, original);
    assert.deepEqual(
      nodes.map((node: { children: { id: number }[] }) =>
        node.children.map((child) => child.id),
      ),
      [[4, 1], [3], [2]],
    );
    assert.equal(nodes.at(-1).label, gettext.$gettext("Unassigned"));
    assert.equal(nodes[0].label, "Unassigned");
    assert.equal(nodes[1].label, "Без категории");
    assert.equal(new Set(nodes.map((node: { id: string }) => node.id)).size, 3);
  }
});

test("API and clipboard notifications use the language at async completion and preserve user payloads", async () => {
  for (const [before, after] of [
    ["en", "ru"],
    ["ru", "en"],
    ["en", "it"],
  ]) {
    for (const [factory, method, url, message] of [
      [
        "useSchedule",
        "addSchedule",
        "/core/schedules/",
        "Schedule was added successfully.",
      ],
      [
        "useReportTemplates",
        "addReportTemplate",
        "/reporting/templates/",
        "The report template was added successfully",
      ],
    ]) {
      gettext.current = before;
      let complete: (value: { data: object }) => void = () => {};
      const pending = new Promise<{ data: object }>((resolve) => {
        complete = resolve;
      });
      const payload = {
        id: 17,
        name: "RAW_name",
        schedule_type: "monthly",
        template: "{{ RAW_jinja }}",
      };
      const messages: string[] = [];
      const create = makeFunction(factory, {
        ref,
        gettext,
        baseUrl: factory === "useSchedule" ? "/core" : "/reporting",
        axios: {
          post: (actualUrl: string, actualPayload: object) => {
            assert.equal(actualUrl, url);
            assert.equal(actualPayload, payload);
            return pending;
          },
        },
        notifySuccess: (message: string) => messages.push(message),
      });
      const api = create();
      api[method](payload);
      assert.equal(api.isLoading.value, true);
      gettext.current = after;
      complete({ data: payload });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(api.isError.value, false);
      assert.equal(api.isLoading.value, false);
      assert.deepEqual(messages, [gettext.$gettext(message)]);
      assert.equal(payload.name, "RAW_name");
    }
    for (const fail of [false, true]) {
      gettext.current = before;
      let resolve: () => void = () => {},
        reject: () => void = () => {};
      const messages: string[] = [];
      const promise = new Promise<void>((ok, no) => {
        resolve = ok;
        reject = () => no(new Error("native clipboard"));
      });
      const copy = makeFunction("copyOutput", {
        gettext,
        copyToClipboard: (value: string) => {
          assert.equal(value, "RAW_clipboard");
          return promise;
        },
        notifySuccess: (message: string) => messages.push(message),
        notifyError: (message: string) => messages.push(message),
      });
      const pending = copy("RAW_clipboard");
      gettext.current = after;
      fail ? reject() : resolve();
      await pending;
      assert.deepEqual(messages, [
        gettext.$gettext(
          fail ? "Unable to copy to clipboard." : "Copied to clipboard",
        ),
      ]);
    }
  }
});

test("threshold validation keeps its numeric rules and translates new notifications", () => {
  const messages: string[] = [];
  const validate = makeFunction("isValidThreshold", {
    gettext,
    Notify: {
      create: ({ message }: { message: string }) => messages.push(message),
    },
  });
  for (const locale of ["en", "ru", "en", "it"]) {
    gettext.current = locale;
    for (const [warning, error, disk, expected] of [
      [0, 0, false, "Warning Threshold or Error Threshold need to be set"],
      [90, 50, false, "Warning Threshold must be less than Error Threshold"],
      [50, 90, true, "Warning Threshold must be more than Error Threshold"],
    ] as const) {
      assert.equal(validate(warning, error, disk), false);
      assert.equal(messages.at(-1), gettext.$gettext(expected));
    }
    const previous = messages.length;
    assert.equal(validate(50, 90, false), true);
    assert.equal(validate(90, 50, true), true);
    assert.equal(messages.length, previous);
  }
});
