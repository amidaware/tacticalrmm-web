<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    persistent
    @keydown.esc="onDialogHide"
  >
    <q-card
      class="q-dialog-plugin"
      :style="{ 'min-width': ret || streamOutput ? '70vw' : '40vw' }"
    >
      <q-bar>
        {{ $t("agentModals.sendCommand.title", { hostname: agent.hostname }) }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <q-card-section>
          <p>{{ $t("agentModals.shared.shell") }}</p>
          <div class="q-gutter-sm">
            <q-radio
              v-if="agent.plat !== 'windows'"
              dense
              v-model="state.shell"
              val="/bin/bash"
              label="Bash"
              @update:model-value="state.custom_shell = null"
            />
            <q-radio
              v-if="agent.plat !== 'windows'"
              dense
              v-model="state.shell"
              val="custom"
              :label="$t('agentModals.shared.custom')"
            />
            <q-radio
              v-if="agent.plat === 'windows'"
              dense
              v-model="state.shell"
              val="cmd"
              label="CMD"
            />
            <q-radio
              v-if="agent.plat === 'windows'"
              dense
              v-model="state.shell"
              val="powershell"
              label="Powershell"
            />
          </div>
        </q-card-section>
        <q-card-section v-if="agent.plat === 'windows'">
          <q-checkbox
            v-model="state.run_as_user"
            :label="$t('agentModals.shared.runAsUser')"
          >
            <q-tooltip>{{ runAsUserToolTip }}</q-tooltip>
          </q-checkbox>
        </q-card-section>
        <q-card-section v-if="state.shell === 'custom'">
          <q-input
            v-model="state.custom_shell"
            outlined
            :label="$t('agentModals.shared.customShell')"
            stack-label
            placeholder="/usr/bin/python3"
            :rules="[(val) => !!val || $t('agentModals.shared.required')]"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model.number="state.timeout"
            dense
            outlined
            type="number"
            style="max-width: 150px"
            :label="$t('agentModals.shared.timeoutSeconds')"
            stack-label
            :rules="[
              (val) => !!val || $t('agentModals.shared.required'),
              (val) =>
                val >= 10 ||
                $t('agentModals.sendCommand.minTimeout', { n: 10 }),
              (val) =>
                val <= 3600 ||
                $t('agentModals.sendCommand.maxTimeout', { n: 3600 }),
            ]"
          />
        </q-card-section>
        <q-card-section class="q-pb-xs">
          <q-input
            v-model="state.cmd"
            outlined
            :label="$t('agentModals.shared.command')"
            stack-label
            :placeholder="cmdPlaceholder(state.shell)"
            :rules="[(val) => !!val || $t('agentModals.shared.required')]"
          />
        </q-card-section>
        <q-card-actions align="between">
          <q-toggle
            v-model="useStreaming"
            :label="$t('agentModals.sendCommand.streamOutput')"
          />
          <div>
            <q-btn flat dense push :label="$t('common.cancel')" v-close-popup />
            <q-btn
              :loading="loading"
              flat
              dense
              push
              :label="$t('agentModals.sendCommand.send')"
              color="primary"
              type="submit"
            />
          </div>
        </q-card-actions>
        <q-card-section v-if="ret !== null"
          ><script-output-copy-clip
            :label="$t('agentModals.shared.output')"
            :data="ret" />
          <q-separator
        /></q-card-section>
        <q-card-section
          v-if="ret !== null"
          class="q-pl-md q-pr-md q-pt-none q-ma-none scroll"
          style="max-height: 50vh"
        >
          <pre>{{ ret }}</pre>
        </q-card-section>
        <q-card-section v-if="showStream" class="q-py-xs">
          <command-stream
            :key="`${runId}`"
            :agent-id="agent.agent_id"
            :cmd="streamCmd"
            :shell="state.shell"
            :run_as_user="state.run_as_user"
            :custom_shell="state.custom_shell"
            :timeout="state.timeout"
            @updateOutput="(val) => (streamOutput = val)"
            @streamLoaded="loading = false"
            @streamClosed="loading = false"
          />
        </q-card-section>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, nextTick } from "vue";
import { useDialogPluginComponent } from "quasar";
import { sendAgentCommand } from "@/api/agents";
import { cmdPlaceholder } from "@/composables/agents";
import { runAsUserToolTip } from "@/constants/constants";

import ScriptOutputCopyClip from "@/components/scripts/ScriptOutputCopyClip.vue";
import CommandStream from "@/components/agents/CommandStream.vue";

export default {
  name: "SendCommand",
  components: {
    ScriptOutputCopyClip,
    CommandStream,
  },
  emits: [...useDialogPluginComponent.emits],
  props: {
    agent: !Object,
  },
  setup(props) {
    const { dialogRef, onDialogHide } = useDialogPluginComponent();

    const state = ref({
      shell: props.agent.plat === "windows" ? "cmd" : "/bin/bash",
      cmd: null,
      timeout: 30,
      custom_shell: null,
      run_as_user: false,
    });

    const loading = ref(false);
    const ret = ref(null);
    const useStreaming = ref(false);
    const showStream = ref(false);
    const streamOutput = ref("");
    const streamCmd = ref("");
    const streamShell = ref("");
    const streamTimeout = ref(30);
    const runId = ref(0);

    async function submit() {
      loading.value = true;
      ret.value = null;
      streamOutput.value = "";
      showStream.value = false;

      if (useStreaming.value) {
        streamCmd.value = state.value.cmd;
        streamShell.value = state.value.shell;
        streamTimeout.value = state.value.timeout;
        await nextTick();
        runId.value++;
        showStream.value = true;
        return;
      }

      try {
        ret.value = await sendAgentCommand(props.agent.agent_id, state.value);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    return {
      // reactive data
      dialogRef,
      onDialogHide,
      state,
      loading,
      ret,
      useStreaming,
      streamOutput,
      showStream,
      streamCmd,
      streamShell,
      streamTimeout,
      runId,
      submit,
      runAsUserToolTip,
      cmdPlaceholder,
    };
  },
};
</script>
