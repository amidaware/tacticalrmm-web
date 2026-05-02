<template>
  <div
    class="full-page-terminal"
    :style="{ background: terminalTheme.background }"
  >
    <div
      v-if="shellOptions.length > 0"
      class="row items-center q-px-lg q-py-xs bg-grey-9 text-white"
    >
      <div class="row items-center">
        <div class="text-subtitle1 text-body2 q-mr-md">Shell:</div>
        <q-option-group
          dense
          v-model="selectedShell"
          :options="shellOptions"
          type="radio"
          inline
          color="primary"
          @update:model-value="onShellChange"
          class="q-gutter-lg"
        />

        <q-btn
          label="Edit Path"
          color="primary"
          @click="handleCustomEdit"
          class="q-px-sm q-ml-lg q-pb-0 text-caption text-capitalize"
          dense
        />
      </div>

      <div v-if="isWindows" class="row items-center q-ml-lg">
        <div class="text-subtitle1 text-body2 q-mr-md q-ml-md">Run as:</div>

        <q-option-group
          dense
          v-model="runAsUser"
          :options="runAsOptions"
          type="radio"
          inline
          color="primary"
          @update:model-value="onRunAsChange"
          class="q-gutter-lg"
        />
      </div>
    </div>

    <div class="terminal-wrapper">
      <div ref="xtermContainer" class="xterm-container"></div>
      <q-inner-loading :showing="loading" color="primary" />
    </div>
  </div>
  <q-dialog v-model="showCustomShellDialog" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="text-h6"> Enter Custom Shell Path </q-card-section>

      <q-card-section>
        <q-input
          v-model="customShellInput"
          label="Shell Path"
          dense
          autofocus
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="cancelCustomShell" />
        <q-btn color="primary" label="Start" @click="startCustomShell" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  Ref,
  computed,
  type WatchStopHandle,
} from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { uid, useQuasar } from "quasar";
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import { useTerminalWSConnection } from "@/websocket/websocket";
import "@xterm/xterm/css/xterm.css";

interface TerminalWSMessage {
  action?: string;
  data?: {
    output?: string;
    done?: boolean;
    messageId?: string;
    error?: string;
  };
  message?: string;
  error?: string;
}

interface ShellOption {
  label: string;
  value: string;
  disable?: boolean;
}

interface TerminalDefaults {
  agent_id: string;
  hostname: string;
  plat: string;
  default_shell: string;
  resolved_default_shell: string;
  effective_default_shell: string;
  terminal_mode: "new" | "legacy";
}

const $q = useQuasar();
const props = defineProps<{
  agent_id: string;
  agentPlatform: string;
  terminalDefaults?: TerminalDefaults | null;
}>();

const loading = ref(false);
const customShellPath = ref<string | null>(null);
const showCustomShellDialog = ref(false);
const customShellInput = ref("");
const invalidCustomShell = ref(false);
const lastSelectedShell = ref<string>("");
const pendingCustomShell = ref<string | null>(null);
const runAsUser = ref(false);
const isWindows = computed(() => props.agentPlatform === "windows");
const runAsOptions = [
  { label: "System", value: false },
  { label: "User", value: true },
];

const shellOptions = computed<ShellOption[]>(() => {
  const isWindows = props.agentPlatform === "windows";
  const base: ShellOption[] = isWindows
    ? [
        { label: "CMD", value: "cmd" },
        { label: "PowerShell", value: "powershell" },
      ]
    : [{ label: "Bash", value: "bash" }];

  let customLabel = "Custom Shell";
  if (loading.value && pendingCustomShell.value) {
    customLabel = "Custom (Shell loading...)";
  } else if (invalidCustomShell.value) {
    customLabel = "Custom (Shell path doesn't exist)";
  } else if (customShellPath.value) {
    customLabel = `Custom (${customShellPath.value})`;
  }

  base.push({
    label: customLabel,
    value: "custom",
  });

  return base;
});

const selectedShell = ref<string>("");

let term: Terminal | null = null;
const fit = new FitAddon();

let inputDisposable: { dispose: () => void } | null = null;
let stopResizeObserver: (() => void) | null = null;
let stopWSDataWatch: WatchStopHandle | null = null;
let wsReadyInterval: ReturnType<typeof setInterval> | null = null;

let startRequested = false;
let started = false;

let activeSessionId: string | null = null;

let wsData!: Ref<TerminalWSMessage | null>;
let wsSend!: (msg: string) => void;
let wsClose!: () => void;
let wsStatus!: Ref<string>;

const xtermContainer = ref<HTMLElement | null>(null);

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function clearWSReadyInterval() {
  if (wsReadyInterval) {
    clearInterval(wsReadyInterval);
    wsReadyInterval = null;
  }
}

function cleanupCurrentSession({
  sendKill = true,
}: { sendKill?: boolean } = {}) {
  clearWSReadyInterval();

  stopWSDataWatch?.();
  stopWSDataWatch = null;

  inputDisposable?.dispose();
  inputDisposable = null;

  startRequested = false;
  started = false;

  if (sendKill) {
    try {
      wsSend?.(JSON.stringify({ action: "kill" }));
    } catch {}
  }

  try {
    wsClose?.();
  } catch {}

  activeSessionId = null;
}

function markSessionReadyAndResize() {
  if (!term || !startRequested || started) return;

  started = true;
  loading.value = false;

  if (pendingCustomShell.value) {
    customShellPath.value = pendingCustomShell.value;
    selectedShell.value = "custom";
    showCustomShellDialog.value = false;
    pendingCustomShell.value = null;
    invalidCustomShell.value = false;
  }

  void waitForLayout().then(() => {
    if (!term || !started) return;
    fit.fit();
    wsSend(
      JSON.stringify({
        action: "resize",
        rows: term.rows,
        cols: term.cols,
      }),
    );
  });
}

function initWS(shell: string) {
  cleanupCurrentSession();

  const sessionId = uid();
  activeSessionId = sessionId;

  ({
    data: wsData,
    send: wsSend,
    close: wsClose,
    status: wsStatus,
  } = useTerminalWSConnection(props.agent_id, sessionId) as {
    data: Ref<TerminalWSMessage | null>;
    send: (msg: string) => void;
    close: () => void;
    status: Ref<string>;
  });

  stopWSDataWatch = watch(wsData, (msg) => {
    if (!msg || !term) return;
    if (activeSessionId !== sessionId) return;

    if (msg.action === "terminal_error") {
      loading.value = false;
      startRequested = false;
      started = false;
      invalidCustomShell.value = true;

      $q.notify({
        type: "negative",
        message: msg.error || msg.data?.error || "Shell path doesn't exist",
      });

      showCustomShellDialog.value = true;
      pendingCustomShell.value = null;
      return;
    }

    if (msg.action === "terminal_info") {
      runAsUser.value = false;
      $q.notify({
        type: "warning",
        message: msg.message || "Run as user was not available..",
      });

      return;
    }

    if (msg.data?.output) {
      term.write(msg.data.output);

      if (!started) {
        markSessionReadyAndResize();
      }
    }

    if (msg.data?.done) {
      started = false;
      startRequested = false;
      loading.value = false;
      term.write("\r\n[Session Ended]\r\n");
    }
  });

  inputDisposable = term!.onData((d) => {
    if (!started) return;
    if (activeSessionId !== sessionId) return;

    wsSend(JSON.stringify({ action: "input", data: d }));
  });

  wsReadyInterval = setInterval(async () => {
    if (activeSessionId !== sessionId) {
      clearWSReadyInterval();
      return;
    }

    if (wsStatus.value === "OPEN" && term) {
      clearWSReadyInterval();

      await waitForLayout();
      if (!term || activeSessionId !== sessionId) return;

      fit.fit();

      startRequested = true;
      started = false;
      loading.value = true;

      wsSend(
        JSON.stringify({
          action: "start",
          shell,
          run_as_user: isWindows.value ? runAsUser.value : false,
        }),
      );
    }
  }, 50);
}

function handleCustomEdit() {
  showCustomShellDialog.value = true;
  customShellInput.value = customShellPath.value || "";
}

async function onShellChange(newShell: string) {
  if (!term) return;

  if (newShell === "custom") {
    if (selectedShell.value !== "custom") {
      lastSelectedShell.value = selectedShell.value;
    }

    if (!customShellPath.value || invalidCustomShell.value) {
      showCustomShellDialog.value = true;
      customShellInput.value = "";
      return;
    }

    newShell = customShellPath.value;
  }

  loading.value = true;
  startRequested = false;
  started = false;
  term.reset();
  fit.fit();
  initWS(newShell);
}

function startCustomShell() {
  if (!customShellInput.value || !term) return;

  loading.value = true;
  startRequested = false;
  started = false;
  invalidCustomShell.value = false;
  pendingCustomShell.value = customShellInput.value;

  term.reset();
  fit.fit();
  initWS(customShellInput.value);
}

const windowsThemeVariant = computed<"cmd" | "powershell" | "pwsh7">(() => {
  if (selectedShell.value === "powershell") return "powershell";

  if (selectedShell.value === "custom" && customShellPath.value) {
    if (
      /(?:^|[\\/])pwsh(?:-preview)?(?:\.exe)?$/i.test(customShellPath.value)
    ) {
      return "pwsh7";
    }
  }

  return "cmd";
});

const cmdTheme = {
  background: "#0c0c0c",
  foreground: "#f2f2f2",
  cursor: "#ffffff",
  cursorAccent: "#0c0c0c",
  selectionBackground: "rgba(255,255,255,0.22)",
  black: "#0c0c0c",
  red: "#c50f1f",
  green: "#13a10e",
  yellow: "#c19c00",
  blue: "#0037da",
  magenta: "#881798",
  cyan: "#3a96dd",
  white: "#cccccc",
  brightBlack: "#767676",
  brightRed: "#e74856",
  brightGreen: "#16c60c",
  brightYellow: "#f9f1a5",
  brightBlue: "#3b78ff",
  brightMagenta: "#b4009e",
  brightCyan: "#61d6d6",
  brightWhite: "#f2f2f2",
};

// classic powershell 5.x
const powershellTheme = {
  background: "#012456",
  foreground: "#ffffff",
  cursor: "#ffffff",
  cursorAccent: "#012456",
  selectionBackground: "rgba(255,255,255,0.25)",
  black: "#000000",
  red: "#800000",
  green: "#008000",
  yellow: "#eeedf0",
  blue: "#000080",
  magenta: "#012456",
  cyan: "#008080",
  white: "#c0c0c0",
  brightBlack: "#808080",
  brightRed: "#ff0000",
  brightGreen: "#00ff00",
  brightYellow: "#ffff00",
  brightBlue: "#0000ff",
  brightMagenta: "#ff00ff",
  brightCyan: "#00ffff",
  brightWhite: "#ffffff",
};

// pwsh 7
const pwsh7Theme = {
  background: "#282c34",
  foreground: "#dcdfe4",
  cursor: "#a3b3cc",
  cursorAccent: "#282c34",
  selectionBackground: "rgba(116,151,196,0.35)",
  black: "#282c34",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#dcdfe4",
  brightBlack: "#5d677a",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#dcdfe4",
};

const unixTheme = {
  background: "#1d1f21",
  foreground: "#c5c8c6",
  cursor: "#c5c8c6",
  cursorAccent: "#1d1f21",
  selectionBackground: "rgba(255,255,255,0.18)",
  black: "#1d1f21",
  red: "#cc6666",
  green: "#b5bd68",
  yellow: "#f0c674",
  blue: "#81a2be",
  magenta: "#b294bb",
  cyan: "#8abeb7",
  white: "#c5c8c6",
  brightBlack: "#666666",
  brightRed: "#d54e53",
  brightGreen: "#b9ca4a",
  brightYellow: "#e7c547",
  brightBlue: "#7aa6da",
  brightMagenta: "#c397d8",
  brightCyan: "#70c0b1",
  brightWhite: "#eaeaea",
};

const terminalTheme = computed(() => {
  if (!isWindows.value) return unixTheme;
  if (windowsThemeVariant.value === "powershell") return powershellTheme;
  if (windowsThemeVariant.value === "pwsh7") return pwsh7Theme;

  return cmdTheme;
});

async function setupXTerm() {
  term = new Terminal({
    convertEol: true,
    fontFamily: isWindows.value
      ? "'Cascadia Mono', Consolas, 'Courier New', monospace"
      : "Menlo, Monaco, 'SF Mono', 'Courier New', monospace",
    fontSize: 16,
    fontWeight: isWindows.value ? 100 : 400,
    cursorBlink: true,
    theme: terminalTheme.value,
    scrollback: 50000,
  });

  term.loadAddon(fit);
  term.open(xtermContainer.value!);
  fit.fit();
}

const resizeWindow = useDebounceFn(async () => {
  if (!term || !started) return;

  await waitForLayout();
  if (!term || !started) return;

  fit.fit();
  wsSend(
    JSON.stringify({
      action: "resize",
      rows: term.rows,
      cols: term.cols,
    }),
  );
}, 200);

function disconnect() {
  clearWSReadyInterval();

  stopResizeObserver?.();
  stopResizeObserver = null;

  cleanupCurrentSession();

  term?.dispose();
  term = null;
}

function cancelCustomShell() {
  showCustomShellDialog.value = false;
  selectedShell.value = lastSelectedShell.value;
  loading.value = true;
  startRequested = false;
  started = false;
  term?.reset();
  fit.fit();
  initWS(lastSelectedShell.value);
}

const BUILT_IN_SHELLS = ["cmd", "powershell", "bash"] as const;
type BuiltInShell = (typeof BUILT_IN_SHELLS)[number];

const isBuiltInShell = (shell: string): shell is BuiltInShell => {
  return (BUILT_IN_SHELLS as readonly string[]).includes(shell);
};

watch(terminalTheme, (newTheme) => {
  if (term) {
    term.options.theme = newTheme;
  }
});

onMounted(async () => {
  await setupXTerm();

  const { stop } = useResizeObserver(xtermContainer, resizeWindow);
  stopResizeObserver = stop;

  const data = props.terminalDefaults;
  if (data) {
    const { resolved_default_shell, effective_default_shell } = data;
    const isWindows = props.agentPlatform === "windows";

    if (resolved_default_shell === "custom") {
      if (isBuiltInShell(effective_default_shell)) {
        selectedShell.value = effective_default_shell;
        lastSelectedShell.value = effective_default_shell;
        customShellPath.value = null;
        invalidCustomShell.value = true;
      } else {
        customShellPath.value = effective_default_shell;
        selectedShell.value = "custom";
        lastSelectedShell.value = isWindows ? "cmd" : "bash";
        invalidCustomShell.value = false;
      }
    } else {
      selectedShell.value = effective_default_shell;
      lastSelectedShell.value = effective_default_shell;
      invalidCustomShell.value = false;
      customShellPath.value = null;
    }
  }

  const shellToStart =
    selectedShell.value === "custom"
      ? customShellPath.value!
      : selectedShell.value;

  initWS(shellToStart);
});

async function onRunAsChange() {
  if (!term) return;

  loading.value = true;
  startRequested = false;
  started = false;
  term.reset();
  fit.fit();

  const shellToStart =
    selectedShell.value === "custom"
      ? customShellPath.value!
      : selectedShell.value;

  initWS(shellToStart);
}

onBeforeUnmount(() => {
  disconnect();
});
</script>

<style scoped>
.full-page-terminal {
  height: calc(100vh - 36px);
  display: flex;
  flex-direction: column;
}
.terminal-wrapper {
  position: relative;
  flex-grow: 1;
  display: flex;
  min-height: 0;
  padding: 10px 6px 4px;
}
.xterm-container {
  flex-grow: 1;
  overflow: hidden;
  height: 100%;
}
</style>
