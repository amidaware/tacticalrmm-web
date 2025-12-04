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
let term: Terminal;
const fit = new FitAddon();

onMounted(() => {
  setupXTerm();
  useResizeObserver(xtermContainer, () => resizeWindow());
  const wsReadyInterval = setInterval(() => {
    if (status.value === "OPEN") {
      send(
        JSON.stringify({
          action: "start",
          shell: "/bin/bash",
        }),
      );
      clearInterval(wsReadyInterval);
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
    theme: {
      background: "#333",
    },
  });

  term.loadAddon(fit);
  term.open(xtermContainer.value!);
  fit.fit();

  term.onData((data) => {
    send(JSON.stringify({ action: "input", data: data }));
  });
}

const resizeWindow = useDebounceFn(() => {
  if (!term) return;

  fit.fit();
  send(
    JSON.stringify({
      action: "resize",
      rows: term.rows,
      cols: term.cols,
    }),
  );
}, 200);

function disconnect() {
  try {
    send(JSON.stringify({ action: "kill" }));
  } catch {}
  close();
  term.dispose();
}

watch(data, (msg) => {
  if (!msg || !msg.action) return;
  const output = msg.data?.output;
  const done = msg.data?.done;

  if (output !== undefined) {
    term.write(output);
  }

  if (done) {
    term.write("\r\n[Session Ended]\r\n");
  }
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
