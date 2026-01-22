<template>
  <div class="full-page-terminal">
    <div
      v-if="shellOptions.length > 0"
      class="row items-center q-px-lg q-py-xs bg-grey-9 text-white"
    >
      <div class="text-subtitle1 text-body2 q-mr-lg">Shell:</div>
      <q-option-group
        dense
        v-model="selectedShell"
        :options="shellOptions"
        type="radio"
        inline
        color="primary"
        @update:model-value="onShellChange"
        class="q-ml-sm"
      />
    </div>
    <div class="terminal-wrapper">
      <div ref="xtermContainer" class="xterm-container"></div>
      <q-inner-loading :showing="loading" color="primary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, Ref, computed } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { uid } from "quasar";
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import { useTerminalWSConnection } from "@/websocket/websocket";
import "@xterm/xterm/css/xterm.css";

interface TerminalWSMessage {
  action?: string;
  data?: {
    output?: string;
    done?: boolean;
    messageId?: string;
  };
}

const props = defineProps<{ agent_id: string; agentPlatform: string }>();
const loading = ref(false);

const shellOptions = computed(() => {
  return props.agentPlatform === "windows"
    ? [
        { label: "CMD", value: "cmd" },
        { label: "PowerShell", value: "powershell" },
      ]
    : [{ label: "Bash", value: "/bin/bash" }];
});

const selectedShell = ref(
  props.agentPlatform === "windows" ? "cmd" : "/bin/bash",
);

let term: Terminal | null = null;
const fit = new FitAddon();
let dataDisposable: { dispose: () => void } | null = null;
let stopResizeObserver: (() => void) | null = null;
let wsReadyInterval: number | null = null;
let started = false;

let wsData: Ref<TerminalWSMessage | null>;
let wsSend: (msg: string) => void;
let wsClose: () => void;
let wsStatus: Ref<string>;

const xtermContainer = ref<HTMLElement | null>(null);

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function initWS(shell: string) {
  dataDisposable?.dispose();
  dataDisposable = null;
  try {
    wsClose?.();
  } catch {}

  ({
    data: wsData,
    send: wsSend,
    close: wsClose,
    status: wsStatus,
  } = useTerminalWSConnection(props.agent_id, uid()) as {
    data: Ref<TerminalWSMessage | null>;
    send: (msg: string) => void;
    close: () => void;
    status: Ref<string>;
  });

  watch(wsData, (msg) => {
    if (!msg?.action || !term) return;

    if (msg.data?.output) term.write(msg.data.output);
    if (msg.data?.done) term.write("\r\n[Session Ended]\r\n");
  });

  dataDisposable = term!.onData((d) => {
    if (!started) return;
    wsSend(JSON.stringify({ action: "input", data: d }));
  });

  const interval = setInterval(async () => {
    if (wsStatus.value === "OPEN" && term) {
      await waitForLayout();
      fit.fit();
      wsSend(JSON.stringify({ action: "start", shell }));
      wsSend(
        JSON.stringify({
          action: "resize",
          rows: term.rows,
          cols: term.cols,
        }),
      );
      started = true;
      loading.value = false;
      clearInterval(interval);
    }
  }, 50);
}

async function onShellChange(newShell: string) {
  if (!term) return;
  loading.value = true;
  started = false;
  term.clear();
  fit.fit();
  initWS(newShell);
}

async function setupXTerm() {
  term = new Terminal({
    convertEol: true,
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 14,
    fontWeight: 400,
    cursorBlink: true,
    theme: { background: "#333" },
  });

  term.loadAddon(fit);
  term.open(xtermContainer.value!);
  fit.fit();
}

const resizeWindow = useDebounceFn(async () => {
  if (!term || !started) return;

  await waitForLayout();
  fit.fit();
  wsSend(
    JSON.stringify({ action: "resize", rows: term.rows, cols: term.cols }),
  );
}, 200);

function disconnect() {
  if (wsReadyInterval) clearInterval(wsReadyInterval);
  wsReadyInterval = null;
  stopResizeObserver?.();
  stopResizeObserver = null;

  dataDisposable?.dispose();
  dataDisposable = null;

  started = false;

  try {
    wsSend?.(JSON.stringify({ action: "kill" }));
  } catch {}
  wsClose?.();

  term?.dispose();
  term = null;
}

onMounted(() => {
  setupXTerm();
  const { stop } = useResizeObserver(xtermContainer, resizeWindow);
  stopResizeObserver = stop;
  initWS(selectedShell.value);
});

onBeforeUnmount(() => {
  disconnect();
});
</script>

<style scoped>
.full-page-terminal {
  height: calc(100vh - 36px);
  display: flex;
  flex-direction: column;
  background: #333333;
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
