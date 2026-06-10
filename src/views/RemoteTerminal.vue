<template>
  <div class="remote-term">
    <!-- connection bar -->
    <q-toolbar class="bg-grey-9 text-white q-px-sm term-bar">
      <q-select
        v-model="protocol"
        :options="['ssh', 'telnet']"
        dense
        dark
        options-dense
        outlined
        style="min-width: 95px"
        :disable="connected"
        @update:model-value="onProtocolChange"
      />
      <q-input
        v-model="address"
        dense
        dark
        outlined
        placeholder="192.168.1.1"
        class="q-ml-sm col"
        :disable="connected"
        @keyup.enter="connect"
      >
        <template #prepend>
          <q-icon size="xs" name="dns" />
        </template>
      </q-input>
      <q-input
        v-model.number="port"
        dense
        dark
        outlined
        type="number"
        placeholder="Port"
        class="q-ml-sm"
        style="width: 95px"
        :disable="connected"
        @keyup.enter="connect"
      />
      <q-input
        v-if="protocol === 'ssh'"
        v-model="username"
        dense
        dark
        outlined
        placeholder="user"
        class="q-ml-sm"
        style="width: 140px"
        :disable="connected"
        @keyup.enter="connect"
      />
      <q-input
        v-if="protocol === 'ssh'"
        v-model="password"
        dense
        dark
        outlined
        type="password"
        placeholder="password"
        class="q-ml-sm"
        style="width: 150px"
        :disable="connected"
        @keyup.enter="connect"
      />
      <q-btn
        v-if="!connected"
        :loading="loading"
        color="primary"
        icon="cast_connected"
        label="Connect"
        no-caps
        class="q-ml-sm"
        @click="connect"
      />
      <q-btn
        v-else
        color="negative"
        icon="close"
        label="Disconnect"
        no-caps
        class="q-ml-sm"
        @click="disconnect"
      />
    </q-toolbar>

    <div ref="xtermContainer" class="xterm-container"></div>
  </div>
</template>

<style scoped>
.remote-term {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}
.term-bar {
  min-height: 52px;
}
.xterm-container {
  flex-grow: 1;
  overflow: hidden;
  padding: 4px;
}
</style>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useMeta } from "quasar";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import { getWSUrl } from "@/websocket/websocket";
import { useAuthStore } from "@/stores/auth";
import "@xterm/xterm/css/xterm.css";

const { params, query } = useRoute();
const auth = useAuthStore();

const protocol = ref(query.protocol || "ssh");
const address = ref(query.address || "");
const port = ref(query.port ? Number(query.port) : 22);
const username = ref(query.username || "");
const password = ref("");
const loading = ref(false);
const connected = ref(false);

const xtermContainer = ref(null);
let term;
let ws;
const fit = new FitAddon();

useMeta({ title: "Remote Terminal" });

function onProtocolChange(val) {
  if (port.value === 22 || port.value === 23 || !port.value) {
    port.value = val === "ssh" ? 22 : 23;
  }
}

function setupTerm() {
  if (term) return;
  term = new Terminal({
    convertEol: false,
    fontFamily: "Menlo, Monaco, Courier New, monospace",
    fontSize: 14,
    cursorBlink: true,
    theme: { background: "#1e1e1e" },
  });
  term.loadAddon(fit);
  term.open(xtermContainer.value);
  fit.fit();
  term.onData((d) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ action: "input", data: { input: d } }));
    }
  });
  useResizeObserver(xtermContainer, () => doResize());
}

const doResize = useDebounceFn(() => {
  if (!term) return;
  fit.fit();
  if (ws && ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        action: "resize",
        data: { cols: term.cols, rows: term.rows },
      }),
    );
  }
}, 200);

function connect() {
  if (!address.value || !port.value) return;
  loading.value = true;
  setupTerm();
  term.clear();

  const url = getWSUrl(`agent/${params.agent_id}/term`, auth.token);
  ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        action: "start",
        data: {
          protocol: protocol.value,
          address: address.value,
          port: port.value,
          username: username.value,
          password: password.value,
          cols: term.cols,
          rows: term.rows,
        },
      }),
    );
  };

  ws.onmessage = (ev) => {
    if (ev.data instanceof ArrayBuffer) {
      term.write(new Uint8Array(ev.data));
      return;
    }
    try {
      const msg = JSON.parse(ev.data);
      if (msg.action === "connected") {
        connected.value = true;
        loading.value = false;
        useMeta({ title: `${protocol.value} ${address.value}:${port.value}` });
        term.focus();
        doResize();
      } else if (msg.action === "error") {
        term.write(`\r\n\x1b[31m*** ${msg.data} ***\x1b[0m\r\n`);
        loading.value = false;
      } else if (msg.action === "closed") {
        term.write("\r\n\x1b[33m*** Session closed ***\x1b[0m\r\n");
      }
    } catch (e) {
      console.error(e);
    }
  };

  ws.onclose = () => {
    connected.value = false;
    loading.value = false;
  };
  ws.onerror = () => {
    loading.value = false;
  };
}

function disconnect() {
  try {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ action: "disconnect" }));
    }
    if (ws) ws.close();
  } catch (e) {
    /* noop */
  }
  connected.value = false;
}

onMounted(() => {
  if (address.value && (protocol.value === "telnet" || query.autoconnect)) {
    connect();
  }
});

onBeforeUnmount(() => {
  disconnect();
  if (term) term.dispose();
});
</script>
