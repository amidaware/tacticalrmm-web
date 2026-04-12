<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    persistent
    @keydown.esc="onDialogHide"
    :maximized="maximized"
  >
    <q-card class="dialog-plugin" style="min-width: 60vw">
      <q-bar>
        {{ $t("scripts.runScript.title", { hostname: agent.hostname }) }}
        <q-space />
        <q-btn
          dense
          flat
          icon="minimize"
          @click="maximized = false"
          :disable="!maximized"
        >
          <q-tooltip v-if="maximized" class="bg-white text-primary">{{
            $t("scripts.runScript.minimize")
          }}</q-tooltip>
        </q-btn>
        <q-btn
          dense
          flat
          icon="crop_square"
          @click="maximized = true"
          :disable="maximized"
        >
          <q-tooltip v-if="!maximized" class="bg-white text-primary">{{
            $t("scripts.runScript.maximize")
          }}</q-tooltip>
        </q-btn>
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("scripts.shared.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="sendScript">
        <q-card-section>
          <tactical-dropdown
            :rules="[(val: number) => !!val || $t('scripts.shared.required')]"
            v-model="state.script"
            :options="filterByPlatformOptions"
            :label="$t('scripts.runScript.selectScript')"
            outlined
            mapOptions
            filterable
          >
            <template v-slot:after>
              <q-btn
                size="sm"
                round
                dense
                flat
                icon="info"
                @click="openScriptURL"
              >
                <q-tooltip
                  v-if="syntax"
                  class="bg-white text-primary text-body1"
                  >{{ syntax }}</q-tooltip
                >
              </q-btn>
            </template>
          </tactical-dropdown>
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            v-model="state.args"
            :label="$t('scripts.runScript.scriptArguments')"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            v-model="state.env_vars"
            :label="$t('scripts.shared.environmentVariables')"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section v-if="!state.run_on_server">
          <q-option-group
            v-model="state.output"
            :options="outputOptions"
            color="primary"
            inline
            dense
          />
        </q-card-section>
        <q-card-section v-if="state.output === 'email'">
          <div class="q-gutter-sm">
            <q-radio
              dense
              v-model="state.emailMode"
              val="default"
              :label="$t('scripts.runScript.useGlobalEmails')"
            />
            <q-radio
              dense
              v-model="state.emailMode"
              val="custom"
              :label="$t('scripts.runScript.customEmails')"
            />
          </div>
        </q-card-section>
        <q-card-section
          v-if="state.emailMode === 'custom' && state.output === 'email'"
        >
          <tactical-dropdown
            v-model="state.emails"
            :label="$t('scripts.runScript.emailRecipients')"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section v-if="state.output === 'collector'">
          <tactical-dropdown
            :rules="[(val: number) => !!val || $t('scripts.shared.required')]"
            outlined
            v-model="state.custom_field"
            :options="customFieldOptions"
            :label="$t('scripts.runScript.selectCustomField')"
            mapOptions
            filterable
          />
          <q-checkbox
            v-model="state.save_all_output"
            :label="$t('scripts.runScript.saveAllOutput')"
          />
        </q-card-section>
        <q-card-section>
          <q-checkbox
            v-if="agent.plat === 'windows' && !state.run_on_server"
            v-model="state.run_as_user"
            :label="$t('scripts.runScript.runAsUser')"
          >
            <q-tooltip>{{
              $t("scripts.runScript.runAsUserTooltip")
            }}</q-tooltip>
          </q-checkbox>
          <q-checkbox
            v-if="!hosted"
            :disable="!server_scripts_enabled"
            v-model="state.run_on_server"
            :label="$t('scripts.runScript.runOnServer')"
            @update:model-value="ret = null"
          >
            <q-tooltip v-if="!server_scripts_enabled">{{
              $t("scripts.runScript.enableServerScriptsHint")
            }}</q-tooltip>
            <q-tooltip v-else>{{
              $t("scripts.runScript.runOnServerHint")
            }}</q-tooltip>
          </q-checkbox>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model.number="state.timeout"
            dense
            outlined
            type="number"
            style="max-width: 150px"
            :label="$t('scripts.runScript.timeoutSeconds')"
            stack-label
            :rules="[
              (val) => !!val || $t('scripts.shared.required'),
              (val) =>
                val >= 5 || $t('scripts.runScript.minimumSeconds', { min: 5 }),
            ]"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn :label="$t('scripts.shared.cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            :disabled="loading"
            :label="$t('scripts.runScript.run')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
        <q-card-section
          v-if="ret !== null"
          class="q-pl-md q-pr-md q-pt-none q-ma-none scroll"
          style="max-height: 50vh"
        >
          <script-output-copy-clip
            v-if="!state.run_on_server"
            :label="$t('scripts.runScript.output')"
            :data="ret"
          />
          <q-separator />
          <pre v-if="!state.run_on_server">{{ ret }}</pre>
          <q-card-section v-if="state.run_on_server" class="scroll">
            <div>
              {{ $t("scripts.runScript.runTime") }}:
              <code>{{
                $t("scripts.runScript.secondsValue", {
                  value: ret.execution_time,
                })
              }}</code>
              <br />{{ $t("scripts.runScript.returnCode") }}:
              <code>{{ ret.retcode }}</code>
              <br />
            </div>
            <br />
            <div v-if="ret.stdout">
              <script-output-copy-clip
                :label="$t('scripts.runScript.standardOutput')"
                :data="ret.stdout"
              />
              <q-separator />
              <pre>{{ ret.stdout }}</pre>
            </div>
            <div v-if="ret.stderr">
              <script-output-copy-clip
                :label="$t('scripts.runScript.standardError')"
                :data="ret.stderr"
              />
              <q-separator />
              <pre>{{ ret.stderr }}</pre>
            </div>
          </q-card-section>
        </q-card-section>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";
import { useDialogPluginComponent, openURL } from "quasar";
import { useI18n } from "vue-i18n";
import { useScriptDropdown } from "@/composables/scripts";
import { useCustomFieldDropdown } from "@/composables/core";
import { runScript } from "@/api/agents";
import { notifySuccess } from "@/utils/notify";

//ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import ScriptOutputCopyClip from "@/components/scripts/ScriptOutputCopyClip.vue";

// types
import type { Agent } from "@/types/agents";

// store
const store = useStore();
const hosted = computed(() => store.state.hosted);
const server_scripts_enabled = computed(
  () => store.state.server_scripts_enabled,
);

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  agent: Agent;
  script?: number;
}>();

// setup quasar dialog plugin
const { dialogRef, onDialogHide } = useDialogPluginComponent();
const { t } = useI18n();

// setup dropdowns
const {
  script,
  filterByPlatformOptions,
  defaultTimeout,
  defaultArgs,
  defaultEnvVars,
  syntax,
  link,
} = useScriptDropdown({
  script: props.script,
  plat: props.agent.plat,
  onMount: true,
});
const { customFieldOptions } = useCustomFieldDropdown({ onMount: true });

// main run script functionaity
const state = ref({
  output: "wait",
  emails: [],
  emailMode: "default",
  custom_field: null,
  save_all_output: false,
  script,
  args: defaultArgs,
  env_vars: defaultEnvVars,
  timeout: defaultTimeout,
  run_as_user: false,
  run_on_server: false,
});

const ret = ref(null);
const loading = ref(false);
const maximized = ref(false);

const outputOptions = computed(() => [
  { label: t("scripts.runScript.outputOptions.wait"), value: "wait" },
  { label: t("scripts.runScript.outputOptions.forget"), value: "forget" },
  { label: t("scripts.runScript.outputOptions.email"), value: "email" },
  {
    label: t("scripts.runScript.outputOptions.collector"),
    value: "collector",
  },
  { label: t("scripts.runScript.outputOptions.note"), value: "note" },
]);

async function sendScript() {
  ret.value = null;
  loading.value = true;

  ret.value = await runScript(props.agent.agent_id, state.value);
  loading.value = false;
  if (state.value.output === "forget") {
    onDialogHide();
    if (ret.value) notifySuccess(ret.value);
  }
}

function openScriptURL() {
  link.value ? openURL(link.value) : null;
}

// watchers
watch(
  [() => state.value.output, () => state.value.emailMode],
  () => (state.value.emails = []),
);
</script>
