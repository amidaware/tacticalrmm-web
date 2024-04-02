<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    maximized
    @show="setupXTerm"
    @before-hide="disconnect"
  >
    <q-card class="q-dialog-plugin">
      <q-bar>
        Tactical RMM Server Command Prompt - Careful! With great power comes
        great responsibility!
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <div
        ref="xtermContainer"
        :style="{ height: `${$q.screen.height - 34}px` }"
      ></div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import { useCliWSConnection } from "@/websocket/websocket";

import "xterm/css/xterm.css";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// setup quasar plugins
const { dialogRef, onDialogHide } = useDialogPluginComponent();

// set ws connection
const { data, send, close } = useCliWSConnection();

const xtermContainer = ref<HTMLElement | null>(null);

let term: Terminal;
const fit = new FitAddon();

// Setup Xterm
function setupXTerm() {
  term = new Terminal({
    convertEol: true,
    fontFamily: "Menlo, Monaco, Courier New, monospace",
    fontSize: 15,
    fontWeight: 400,
    cursorBlink: true,
  });

  term.options = {
    theme: {
      background: "#333",
    },
  };

  term.loadAddon(fit);
  term.open(xtermContainer.value!);
  fit.fit();
  term.onData((data) => {
    send(JSON.stringify({ action: "trmmcli.input", data: { input: data } }));
  });

  useResizeObserver(dialogRef, () => {
    resizeWindow();
  });

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
</script>
