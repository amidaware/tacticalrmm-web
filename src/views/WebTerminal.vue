<template>
  <div class="full-page-terminal">
    <div ref="xtermContainer" class="xterm-container"></div>
  </div>
</template>

<style>
.full-page-terminal {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.xterm-container {
  flex-grow: 1;
  overflow: hidden;
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import { useCliWSConnection } from "@/websocket/websocket";
import "@xterm/xterm/css/xterm.css";

const xtermContainer = ref<HTMLElement | null>(null);
let term: Terminal;
const fit = new FitAddon();

const { data, send, close } = useCliWSConnection();

onMounted(() => {
  setupXTerm();
  useResizeObserver(xtermContainer, () => {
    resizeWindow();
  });
});

onBeforeUnmount(() => {
  disconnect();
});

function setupXTerm() {
  term = new Terminal({
    convertEol: true,
    fontFamily: "Menlo, Monaco, Courier New, monospace",
    fontSize: 15,
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
    send(JSON.stringify({ action: "trmmcli.input", data: { input: data } }));
  });
}

const resizeWindow = useDebounceFn(() => {
  fit.fit();
  const dims = { cols: term.cols, rows: term.rows };
  send(JSON.stringify({ action: "trmmcli.resize", data: dims }));
}, 300);

function disconnect() {
  term.dispose();
  close();
  send(JSON.stringify({ action: "trmmcli.disconnect" }));
}

interface WSTrmmCliOutput {
  output: string;
  messageId: string;
}

watch(data, (newValue) => {
  if (newValue.action === "trmmcli.output") {
    const incomingData = newValue.data as WSTrmmCliOutput;
    term.write(incomingData.output);
  }
});
</script>
