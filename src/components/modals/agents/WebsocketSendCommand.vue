<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    persistent
    @keydown.esc="onDialogHide"
  >
    <q-card
      class="q-dialog-plugin"
      :style="{ 'min-width': !ret ? '40vw' : '70vw' }"
    >
      <q-bar>
        {{
          $t("agents.websocketSendCommand.title", { hostname: agent.hostname })
        }}
        <q-space />
        <q-chip
          v-if="!wsConnected"
          color="red"
          text-color="white"
          icon="error"
          >{{ $t("agents.websocketSendCommand.websocketDisconnected") }}</q-chip
        >
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <q-card-section>
          <p>{{ $t("agents.websocketSendCommand.shell") }}</p>
          <div class="q-gutter-sm">
            <q-radio
              v-if="agent.plat !== 'windows'"
              dense
              v-model="state.shell"
              val="/bin/bash"
              :label="$t('agents.websocketSendCommand.shells.bash')"
              @update:model-value="state.custom_shell = null"
            />
            <q-radio
              v-if="agent.plat !== 'windows'"
              dense
              v-model="state.shell"
              val="custom"
              :label="$t('agents.websocketSendCommand.shells.custom')"
            />
            <q-radio
              v-if="agent.plat === 'windows'"
              dense
              v-model="state.shell"
              val="cmd"
              :label="$t('agents.websocketSendCommand.shells.cmd')"
            />
            <q-radio
              v-if="agent.plat === 'windows'"
              dense
              v-model="state.shell"
              val="powershell"
              :label="$t('agents.websocketSendCommand.shells.powershell')"
            />
          </div>
        </q-card-section>
        <q-card-section v-if="state.shell === 'custom'">
          <q-input
            v-model="state.custom_shell"
            outlined
            :label="$t('agents.websocketSendCommand.customShell')"
            stack-label
            placeholder="/usr/bin/python3"
            :rules="[(val) => !!val || $t('agents.shared.required')]"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model.number="state.timeout"
            dense
            outlined
            type="number"
            style="max-width: 150px"
            :label="$t('agents.websocketSendCommand.timeoutSeconds')"
            stack-label
            :rules="[
              (val) => !!val || $t('agents.shared.required'),
              (val) =>
                val >= 10 ||
                $t('agents.websocketSendCommand.minimumSeconds', { min: 10 }),
              (val) =>
                val <= 3600 ||
                $t('agents.websocketSendCommand.maximumSeconds', { max: 3600 }),
            ]"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="state.cmd"
            outlined
            :label="$t('agents.websocketSendCommand.command')"
            stack-label
            :placeholder="cmdPlaceholder(state.shell)"
            :rules="[(val) => !!val || $t('agents.shared.required')]"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            dense
            push
            :label="$t('common.buttons.cancel')"
            v-close-popup
          />
          <q-btn
            :loading="loading"
            :disable="!wsConnected"
            flat
            dense
            push
            :label="$t('agents.websocketSendCommand.send')"
            color="primary"
            type="submit"
          >
          </q-btn>
        </q-card-actions>
        <q-card-section
          v-if="ret !== null"
          class="q-pl-md q-pr-md q-pt-none q-ma-none scroll"
          style="max-height: 50vh"
        >
          <pre>{{ ret }}</pre>
        </q-card-section>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useStore } from "vuex";
import { useDialogPluginComponent } from "quasar";
import { cmdPlaceholder } from "@/composables/agents";
import { getWSUrl } from "@/websocket/channels";

export default {
  name: "SendCommand",
  emits: [...useDialogPluginComponent.emits],
  props: {
    agent: !Object,
  },
  setup(props) {
    const store = useStore();
    // setup quasar dialog plugin
    const { dialogRef, onDialogHide } = useDialogPluginComponent();

    // run command logic
    const state = ref({
      shell: props.agent.plat === "windows" ? "cmd" : "/bin/bash",
      cmd: null,
      timeout: 30,
      custom_shell: null,
      agent_id: props.agent.agent_id,
    });

    const loading = ref(false);
    const ret = ref(null);

    // websocket
    const ws = ref(null);
    const wsConnected = ref(false);

    function setupWS() {
      const token = computed(() => store.state.token);
      console.log("Starting send command websocket");
      let url = getWSUrl("sendcmd", token.value);
      ws.value = new WebSocket(url);
      ws.value.onopen = () => {
        wsConnected.value = true;
        console.log("Send command websocket connected");
      };
      ws.value.onmessage = (e) => {
        const data = JSON.parse(e.data);
        ret.value = data.ret;
        loading.value = false;
      };
      ws.value.onclose = () => {
        console.log("Send command websocket disconnected");
        wsConnected.value = false;
      };
      ws.value.onerror = () => {
        wsConnected.value = false;
        console.log("Send command websocket error");
        ws.value.onclose();
      };
    }

    function submit() {
      ret.value = null;
      loading.value = true;
      ret.value = ws.value.send(JSON.stringify(state.value));
    }

    onMounted(() => {
      setupWS();
    });

    onBeforeUnmount(() => {
      ws.value.close();
    });

    return {
      // reactive data
      state,
      loading,
      ret,
      wsConnected,

      // methods
      submit,
      cmdPlaceholder,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
