<template>
  <div class="remote-proxy">
    <!-- top control bar -->
    <q-toolbar class="bg-grey-9 text-white q-px-sm proxy-bar">
      <q-select
        v-model="protocol"
        :options="['https', 'http']"
        dense
        dark
        options-dense
        outlined
        style="min-width: 90px"
        @update:model-value="onProtocolChange"
      />
      <q-input
        v-model="address"
        dense
        dark
        outlined
        placeholder="192.168.200.254"
        class="q-ml-sm col"
        @keyup.enter="connect"
      >
        <template #prepend>
          <q-icon size="xs" name="lan" />
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
        style="width: 110px"
        @keyup.enter="connect"
      />
      <q-btn
        :loading="loading"
        color="primary"
        icon="cast_connected"
        label="Connect"
        class="q-ml-sm"
        no-caps
        @click="connect"
      />
      <q-btn
        flat
        dense
        round
        icon="refresh"
        class="q-ml-xs"
        :disable="!iframeSrc"
        @click="reload"
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
    </q-toolbar>

    <!-- proxied page -->
    <div class="proxy-body">
      <iframe
        v-if="iframeSrc"
        ref="frame"
        :src="iframeSrc"
        class="proxy-frame"
        allow="clipboard-read; clipboard-write"
      ></iframe>
      <div v-else class="column flex-center text-grey-6 fit">
        <q-icon name="public" size="64px" />
        <div class="q-mt-sm">
          Enter an address and port, then click Connect to reach a device on
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
.proxy-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useMeta } from "quasar";
import { getBaseUrl } from "@/boot/axios";
import { createWebProxySession } from "@/api/agents";
import { notifyError } from "@/utils/notify";

const { params, query } = useRoute();

const protocol = ref(query.protocol || "https");
const address = ref(query.address || "");
const port = ref(query.port ? Number(query.port) : 443);
const hostname = ref("");
const loading = ref(false);
const iframeSrc = ref("");
const frame = ref(null);

useMeta({ title: "Remote Proxy" });

function onProtocolChange(val) {
  // only auto-fill common defaults
  if (port.value === 443 || port.value === 80 || !port.value) {
    port.value = val === "https" ? 443 : 80;
  }
}

async function connect() {
  if (!address.value) {
    notifyError("Enter an address");
    return;
  }
  if (!port.value || port.value < 1 || port.value > 65535) {
    notifyError("Enter a valid port");
    return;
  }
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
    useMeta({
      title: `${data.hostname} \u2192 ${data.target}`,
    });
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function reload() {
  if (frame.value) {
    // eslint-disable-next-line no-self-assign
    frame.value.src = frame.value.src;
  }
}

function openExternal() {
  if (iframeSrc.value) window.open(iframeSrc.value, "_blank");
}

onMounted(() => {
  // auto-connect if address provided via query params
  if (address.value) connect();
});
</script>
