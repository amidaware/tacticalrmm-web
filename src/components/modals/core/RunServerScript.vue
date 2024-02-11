<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="dialog-plugin" style="min-width: 60vw">
      <q-bar>
        Run a script on Server
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <tactical-dropdown
          :rules="[(val) => !!val || '*Required']"
          v-model="script"
          :options="filteredScriptOptions"
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
          @click="runScript"
          :loading="loading"
          :disabled="loading"
          label="Run"
          color="primary"
        />
      </q-card-actions>
      <q-card-section
        v-if="ret !== null"
        class="q-pl-md q-pr-md q-pt-none q-ma-none scroll"
        style="max-height: 50vh"
      >
        <pre>{{ ret }}</pre>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
// composition imports
import { ref, reactive, computed } from "vue";
import { useDialogPluginComponent, openURL } from "quasar";
import { useScriptDropdown } from "@/composables/scripts";
import { runServerScript } from "@/api/core.ts";
import { envVarsLabel } from "@/constants/constants";
import {
  formatScriptSyntax,
  removeExtraOptionCategories,
} from "@/utils/format";

//ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// setup quasar dialog plugin
const { dialogRef, onDialogHide } = useDialogPluginComponent();

// setup dropdowns
const {
  script,
  scriptOptions,
  defaultTimeout,
  defaultArgs,
  defaultEnvVars,
  syntax,
  link,
} = useScriptDropdown(undefined, {
  onMount: true,
  filterByPlatform: "linux",
});

// main run script functionaity
const state = reactive({
  args: defaultArgs,
  env_vars: defaultEnvVars,
  timeout: defaultTimeout,
});

const ret = ref(null);
const loading = ref(false);

async function runScript() {
  ret.value = null;
  loading.value = true;

  try {
    ret.value = await runServerScript(script.value, state);
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
}

function openScriptURL() {
  link.value ? openURL(link.value) : null;
}

const filteredScriptOptions = computed(() => {
  return removeExtraOptionCategories(
    scriptOptions.value.filter(
      (script) =>
        script.category ||
        !script.supported_platforms ||
        script.supported_platforms.length === 0 ||
        script.supported_platforms.includes("linux"),
    ),
  );
});
</script>
