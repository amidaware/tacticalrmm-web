<template>
  <div class="remote-proxy">
    <!-- unified control bar -->
    <q-toolbar class="bg-grey-9 text-white q-px-sm proxy-bar">
      <q-select
        v-model="protocol"
        :options="protocolOptions"
        emit-value
        map-options
        dense
        dark
        options-dense
        outlined
        style="min-width: 110px"
        :disable="connected"
        @update:model-value="onProtocolChange"
      />
      <q-input
        v-model="address"
        dense
        dark
        outlined
        :placeholder="mode === 'web' ? '192.168.200.254' : '192.168.1.1'"
        class="q-ml-sm col"
        :disable="connected"
        @keyup.enter="connect"
      >
        <template #prepend>
          <q-icon size="xs" :name="mode === 'web' ? 'lan' : 'dns'" />
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
        style="width: 100px"
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
        style="width: 130px"
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
        style="width: 140px"
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
        v-else-if="mode === 'term'"
        color="negative"
        icon="close"
        label="Disconnect"
        no-caps
        class="q-ml-sm"
        @click="disconnect"
      />
      <template v-if="mode === 'web'">
        <q-btn
          flat
          dense
          round
          icon="refresh"
          class="q-ml-xs"
          :disable="!iframeSrc"
          @click="reloadFrame"
        >
          <q-tooltip>Reload</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          icon="open_in_new"
          class="q-ml-xs"
          :disable="!iframeSrc"
          @click="openExternal"
        >
          <q-tooltip>Open in new tab</q-tooltip>
        </q-btn>
      </template>
    </q-toolbar>

    <!-- body: web iframe OR terminal -->
    <div class="proxy-body" :class="{ 'term-bg': mode === 'term' }">
      <iframe
        v-if="mode === 'web' && iframeSrc"
        ref="frame"
        :src="iframeSrc"
        class="proxy-frame"
        allow="clipboard-read; clipboard-write"
      ></iframe>

      <div
        v-show="mode === 'term' && (connected || loading)"
        ref="xtermContainer"
        class="xterm-container"
      ></div>

      <div
        v-if="!hasContent"
        class="column flex-center text-grey-6 fit text-center q-pa-md"
      >
        <q-icon
          :name="mode === 'web' ? 'public' : 'terminal'"
          size="64px"
        />
        <div class="q-mt-sm">
          Choose a protocol, enter an address and port, then click Connect to
          reach a device on
          <b class="q-mx-xs">{{ hostname || "this agent" }}</b>'s network.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.remote-proxy {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.proxy-bar {
  min-height: 52px;
}
.proxy-body {
  flex-grow: 1;
  position: relative;
  background: #fff;
}
.proxy-body.term-bg {
  background: #1e1e1e;
}
.proxy-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.xterm-container {
  position: absolute;
  inset: 0;
  padding: 4px;
  overflow: hidden;
}
</style>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useMeta } from "quasar";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import { getBaseUrl } from "@/boot/axios";
import { getWSUrl } from "@/websocket/websocket";
import { useAuthStore } from "@/stores/auth";
import { createWebProxySession } from "@/api/agents";
import { notifyError } from "@/utils/notify";
import "@xterm/xterm/css/xterm.css";

const { params, query } = useRoute();
const auth = useAuthStore();

const protocolOptions = [
  { label: "HTTPS", value: "https" },
  { label: "HTTP", value: "http" },
  { label: "SSH", value: "ssh" },
  { label: "Telnet", value: "telnet" },
];
const defaultPorts = { https: 443, http: 80, ssh: 22, telnet: 23 };

const protocol = ref(query.protocol || "https");
const address = ref(query.address || "");
const port = ref(query.port ? Number(query.port) : 443);
const username = ref(query.username || "");
const password = ref("");
const hostname = ref("");
const loading = ref(false);
const connected = ref(false);

// web
const iframeSrc = ref("");
const frame = ref(null);
// terminal
const xtermContainer = ref(null);
let term;
let ws;
const fit = new FitAddon();

useMeta({ title: "Remote Proxy" });

const mode = computed(() =>
  protocol.value === "ssh" || protocol.value === "telnet" ? "term" : "web",
);
const hasContent = computed(
  () =>
    (mode.value === "web" && !!iframeSrc.value) ||
    (mode.value === "term" && (connected.value || loading.value)),
);

function onProtocolChange(val) {
  // reset any active connection when switching protocol
  resetConnections();
  const known = Object.values(defaultPorts);
  if (!port.value || known.includes(Number(port.value))) {
    port.value = defaultPorts[val];
  }
}

function resetConnections() {
  iframeSrc.value = "";
  if (ws || connected.value) disconnect();
  connected.value = false;
  loading.value = false;
}

function connect() {
  if (!address.value) {
    notifyError("Enter an address");
    return;
  }
  if (!port.value || port.value < 1 || port.value > 65535) {
    notifyError("Enter a valid port");
    return;
  }
  if (mode.value === "web") connectWeb();
  else connectTerm();
}

// ---------------- web (http/https) ----------------
async function connectWeb() {
  loading.value = true;
  iframeSrc.value = "";
  try {
    const data = await createWebProxySession(params.agent_id, {
      protocol: protocol.value,
      address: address.value,
      port: port.value,
    });
    hostname.value = data.hostname;
    iframeSrc.value = `${getBaseUrl()}${data.url}`;
    useMeta({ title: `${data.hostname} \u2192 ${data.target}` });
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function reloadFrame() {
  if (frame.value) {
    // eslint-disable-next-line no-self-assign
    frame.value.src = frame.value.src;
  }
}

function openExternal() {
  if (iframeSrc.value) window.open(iframeSrc.value, "_blank");
}

// ---------------- terminal (ssh/telnet) ----------------
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

function connectTerm() {
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
  ws = undefined;
  connected.value = false;
}

onMounted(() => {
  if (address.value && query.autoconnect) connect();
});

onBeforeUnmount(() => {
  disconnect();
  if (term) term.dispose();
});
</script>
