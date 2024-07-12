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
        Run a script on {{ agent.hostname }}
        <q-space />
        <q-btn
          dense
          flat
          icon="minimize"
          @click="maximized = false"
          :disable="!maximized"
        >
          <q-tooltip v-if="maximized" class="bg-white text-primary"
            >Minimize</q-tooltip
          >
        </q-btn>
        <q-btn
          dense
          flat
          icon="crop_square"
          @click="maximized = true"
          :disable="maximized"
        >
          <q-tooltip v-if="!maximized" class="bg-white text-primary"
            >Maximize</q-tooltip
          >
        </q-btn>
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="sendScript">
        <q-card-section>
          <tactical-dropdown
            :rules="[(val: number) => !!val || '*Required']"
            v-model="state.script"
            :options="filterByPlatformOptions"
            label="Select script"
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
                  v-html="formatScriptSyntax(syntax)"
                />
              </q-btn>
            </template>
          </tactical-dropdown>
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            v-model="state.args"
            label="Script Arguments (press Enter after typing each argument)"
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
            :label="envVarsLabel"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section>
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
              label="Use email addresses from global settings"
            />
            <q-radio
              dense
              v-model="state.emailMode"
              val="custom"
              label="Custom emails"
            />
          </div>
        </q-card-section>
        <q-card-section
          v-if="state.emailMode === 'custom' && state.output === 'email'"
        >
          <tactical-dropdown
            v-model="state.emails"
            label="Email recipients (press Enter after typing each email)"
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
            :rules="[(val: number) => !!val || '*Required']"
            outlined
            v-model="state.custom_field"
            :options="customFieldOptions"
            label="Select custom field"
            mapOptions
            filterable
          />
          <q-checkbox v-model="state.save_all_output" label="Save all output" />
        </q-card-section>
        <q-card-section v-if="agent.plat === 'windows'">
          <q-checkbox v-model="state.run_as_user" label="Run As User">
            <q-tooltip>{{ runAsUserToolTip }}</q-tooltip>
          </q-checkbox>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model.number="state.timeout"
            dense
            outlined
            type="number"
            style="max-width: 150px"
            label="Timeout (seconds)"
            stack-label
            :rules="[
              (val) => !!val || '*Required',
              (val) => val >= 5 || 'Minimum is 5 seconds',
            ]"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn label="Cancel" v-close-popup />
          <q-btn
            :loading="loading"
            :disabled="loading"
            label="Run"
            color="primary"
            type="submit"
          />
        </q-card-actions>
        <q-card-section
          v-if="ret !== null"
          class="q-pl-md q-pr-md q-pt-none q-ma-none scroll"
          style="max-height: 50vh"
        >
          <script-output-copy-clip label="Output" :data="ret" />
          <q-separator />
          <pre>{{ ret }}</pre>
        </q-card-section>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, watch } from "vue";
import { useDialogPluginComponent, openURL } from "quasar";
import { useScriptDropdown } from "@/composables/scripts";
import { useCustomFieldDropdown } from "@/composables/core";
import { runScript } from "@/api/agents";
import { notifySuccess } from "@/utils/notify";
import { envVarsLabel, runAsUserToolTip } from "@/constants/constants";
import { formatScriptSyntax } from "@/utils/format";

//ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import ScriptOutputCopyClip from "@/components/scripts/ScriptOutputCopyClip.vue";

// types
import type { Agent } from "@/types/agents";

// static data
const outputOptions = [
  { label: "Wait for Output", value: "wait" },
  { label: "Fire and Forget", value: "forget" },
  { label: "Email results", value: "email" },
  { label: "Save results to Custom Field", value: "collector" },
  { label: "Save results to Agent Notes", value: "note" },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  agent: Agent;
  script?: number;
}>();

// setup quasar dialog plugin
const { dialogRef, onDialogHide } = useDialogPluginComponent();

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
});

const ret = ref(null);
const loading = ref(false);
const maximized = ref(false);

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
