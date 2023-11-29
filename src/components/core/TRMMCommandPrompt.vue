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
import { useDashWSConnection } from "@/websocket/websocket";

import "xterm/css/xterm.css";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// setup quasar plugins
const { dialogRef, onDialogHide } = useDialogPluginComponent();

// set ws connection
const { data, send } = useDashWSConnection();

watch(data, (newValue) => {
  if (newValue.action === "trmmcli.output") term.write(newValue.data.output);
});

const xtermContainer = ref<HTMLElement | null>(null);

let term: Terminal;
const fit = new FitAddon();

// Setup Xterm
function setupXTerm() {
  term = new Terminal({
    cursorBlink: true,
    scrollback: 1000,
  });

  term.loadAddon(fit);
  term.open(xtermContainer.value!);
  fit.fit();
  term.onData((data) => {
    console.log("browser terminal received new data:", data);
    send(JSON.stringify({ action: "trmmcli.input", data: { input: data } }));
  });

  send(
    JSON.stringify({
      action: "trmmcli.connect",
      data: { cols: term.cols, rows: term.rows },
    }),
  );

  useResizeObserver(dialogRef, () => {
    resizeWindow();
  });
}

const resizeWindow = useDebounceFn(() => {
  fit.fit();
  const dims = { cols: term.cols, rows: term.rows };
  console.log("sending new dimensions to server's pty", dims);
  send(JSON.stringify({ action: "trmmcli.resize", data: dims }));
}, 300);

function disconnect() {
  term.dispose();
  send(JSON.stringify({ action: "trmmcli.disconnect" }));
}
</script>
