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
    fontFamily: "Menlo, Monaco, 'SF Mono', 'Courier New', monospace",
    fontSize: 15,
    fontWeight: 400,
    cursorBlink: true,
    scrollback: 50000,
    theme: {
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
    },
  });

  term.loadAddon(fit);
  term.open(xtermContainer.value!);
  fit.fit();
  requestAnimationFrame(() => {
    term?.focus();
  });
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
