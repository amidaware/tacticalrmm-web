<template>
  <div class="full-page-terminal">
    <div ref="xtermContainer" class="xterm-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, Ref } from "vue";
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

const props = defineProps<{ agent_id: string }>();
const session_id = uid();

const { data, send, close, status } = useTerminalWSConnection(
  props.agent_id,
  session_id,
) as {
  data: Ref<TerminalWSMessage | null>;
  send: (msg: string) => void;
  close: () => void;
  status: Ref<string>;
};

const xtermContainer = ref<HTMLElement | null>(null);
let term: Terminal | null = null;
const fit = new FitAddon();

let dataDisposable: { dispose: () => void } | null = null;
let stopResizeObserver: (() => void) | null = null;
let wsReadyInterval: number | null = null;

let started = false;
let pendingResize: { rows: number; cols: number } | null = null;

onMounted(() => {
  setupXTerm();
  const { stop } = useResizeObserver(xtermContainer, () => resizeWindow());
  stopResizeObserver = stop;

  wsReadyInterval = window.setInterval(() => {
    if (status.value === "OPEN") {
      send(JSON.stringify({ action: "start", shell: "/bin/bash" }));
      started = true;
      if (pendingResize) {
        send(JSON.stringify({ action: "resize", ...pendingResize }));
        pendingResize = null;
      } else if (term) {
        send(
          JSON.stringify({
            action: "resize",
            rows: term.rows,
            cols: term.cols,
          }),
        );
      }

      if (wsReadyInterval) {
        clearInterval(wsReadyInterval);
        wsReadyInterval = null;
      }
    }
  }, 100);
});

onBeforeUnmount(() => {
  disconnect();
});

function setupXTerm() {
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

  // store disposable
  dataDisposable = term.onData((d) => {
    if (!started) return;
    send(JSON.stringify({ action: "input", data: d }));
  });
}

const resizeWindow = useDebounceFn(() => {
  if (!term) return;

  fit.fit();
  const rows = term.rows;
  const cols = term.cols;

  // buffer resize until started
  if (!started) {
    pendingResize = { rows, cols };
    return;
  }

  send(JSON.stringify({ action: "resize", rows, cols }));
}, 200);

function disconnect() {
  // stop interval if still running
  if (wsReadyInterval) {
    clearInterval(wsReadyInterval);
    wsReadyInterval = null;
  }

  // stop resize observer
  if (stopResizeObserver) {
    stopResizeObserver();
    stopResizeObserver = null;
  }

  // dispose onData handler first (prevents duplicates on reopen)
  if (dataDisposable) {
    dataDisposable.dispose();
    dataDisposable = null;
  }

  // reset gating state
  started = false;
  pendingResize = null;

  try {
    send(JSON.stringify({ action: "kill" }));
  } catch {}

  close();

  if (term) {
    term.dispose();
    term = null;
  }
}

watch(data, (msg) => {
  if (!msg || !msg.action || !term) return;
  const output = msg.data?.output;
  const done = msg.data?.done;

  if (output !== undefined) term.write(output);
  if (done) term.write("\r\n[Session Ended]\r\n");
});
</script>

<style scoped>
.full-page-terminal {
  height: calc(100vh - 22px);
  display: flex;
  flex-direction: column;
  background: #333333;
}

.xterm-container {
  flex-grow: 1;
  overflow: hidden;
  margin: 10px 0;
}
</style>
