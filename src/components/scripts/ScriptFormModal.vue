<template>
  <q-dialog
    ref="dialogRef"
    persistent
    @keydown.esc.stop="onDialogHide"
    :maximized="maximized"
    @hide="onDialogHide"
    @show="loadEditor"
    @before-hide="unloadEditor"
  >
    <q-card
      class="q-dialog-plugin"
      :style="maximized ? '' : 'width: 90vw; max-width: 90vw'"
    >
      <q-bar>
        <span class="q-pr-sm">{{ title }}</span>
        <q-btn
          v-if="!script && openAIEnabled"
          size="xs"
          :disable="loading"
          dense
          label="Generate Script"
          color="primary"
          no-caps
          @click="generateScriptOpenAI"
        />
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
      <q-banner
        v-if="missingShebang"
        dense
        inline-actions
        class="text-black bg-warning"
      >
        <template v-slot:avatar>
          <q-icon class="text-center" name="warning" color="black" /> </template
        >Shell/Python scripts on Linux/Mac need a shebang at the top of the
        script e.g. <code>#!/bin/bash</code> or <code>#!/usr/bin/python3</code
        ><br />Add one to get rid of this warning. Ignore if windows.
      </q-banner>
      <div class="row q-pa-sm">
        <q-scroll-area
          :thumb-style="{
            right: '4px',
            borderRadius: '5px',
            width: '5px',
            opacity: '0.75',
          }"
          :bar-style="{
            right: '2px',
            borderRadius: '9px',
            width: '9px',
            opacity: '0.2',
          }"
          class="col-4 q-mb-none q-pb-none"
          :style="{ height: `${maximized ? '82vh' : '64vh'}` }"
        >
          <div class="q-gutter-sm q-pr-sm">
            <q-input
              filled
              dense
              :readonly="readonly"
              v-model="script.name"
              label="Name"
              :rules="[(val) => !!val || '*Required']"
              hide-bottom-space
            />
            <q-input
              filled
              dense
              :readonly="readonly"
              v-model="script.description"
              label="Description"
            />
            <q-select
              :readonly="readonly"
              options-dense
              filled
              dense
              v-model="script.shell"
              :options="shellOptions"
              emit-value
              map-options
              label="Shell Type"
            />
            <tactical-dropdown
              v-model="script.supported_platforms"
              :options="agentPlatformOptions"
              label="Supported Platforms (All supported if blank)"
              clearable
              mapOptions
              filled
              multiple
              :readonly="readonly"
            />
            <tactical-dropdown
              filled
              v-model="script.category"
              :options="categories"
              use-input
              clearable
              new-value-mode="add-unique"
              filterable
              label="Category"
              :readonly="readonly"
              hide-bottom-space
            />
            <tactical-dropdown
              v-model="script.args"
              label="Script Arguments (press Enter after typing each argument)"
              filled
              use-input
              multiple
              hide-dropdown-icon
              input-debounce="0"
              new-value-mode="add"
              :readonly="readonly"
            />
            <tactical-dropdown
              v-model="script.env_vars"
              :label="envVarsLabel"
              filled
              use-input
              multiple
              hide-dropdown-icon
              input-debounce="0"
              new-value-mode="add"
              :readonly="readonly"
            />
            <q-input
              type="number"
              filled
              dense
              :readonly="readonly"
              v-model.number="script.default_timeout"
              label="Timeout (seconds)"
              :rules="[(val) => val >= 5 || 'Minimum is 5']"
              hide-bottom-space
            />
            <q-checkbox
              v-model="script.run_as_user"
              label="Run As User (Windows only)"
            >
              <q-tooltip
                >Setting this value on the script model will always override any
                'Run As User' checkboxes in the UI and force this script to
                always be run in the context of the logged in user. If no user
                is logged in, the script will run as SYSTEM.
              </q-tooltip>
            </q-checkbox>
            <q-input
              label="Syntax"
              type="textarea"
              style="height: 150px; overflow-y: auto; resize: none"
              v-model="script.syntax"
              dense
              filled
              :readonly="readonly"
            />
          </div>
        </q-scroll-area>
        <div
          ref="scriptEditor"
          class="col-8 q-mb-none q-pb-none"
          :style="{ height: `${maximized ? '82vh' : '64vh'}` }"
        ></div>
      </div>
      <q-card-actions>
        <tactical-dropdown
          style="width: 350px"
          dense
          :loading="agentLoading"
          filled
          v-model="agent"
          :options="agentOptions"
          label="Agent to run test script on"
          mapOptions
          filterable
        >
          <template v-slot:after>
            <q-btn
              size="md"
              color="primary"
              dense
              flat
              label="Test Script"
              :disable="
                !agent || !script.script_body || !script.default_timeout
              "
              @click="openTestScriptModal"
            />
          </template>
        </tactical-dropdown>
        <q-space />
        <q-btn dense flat label="Cancel" v-close-popup />
        <q-btn
          v-if="!readonly"
          :loading="loading"
          dense
          flat
          label="Save"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composable imports
import { ref, reactive, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { saveScript, editScript, downloadScript } from "@/api/scripts";
import { useAgentDropdown, agentPlatformOptions } from "@/composables/agents";
import { generateScript } from "@/api/core";
import { notifySuccess } from "@/utils/notify";

// ui imports
import TestScriptModal from "@/components/scripts/TestScriptModal.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import * as monaco from "monaco-editor";

// types
import type { Script } from "@/types/scripts";

// static data
import { shellOptions } from "@/composables/scripts";
import { envVarsLabel } from "@/constants/constants";

// props
const props = withDefaults(
  defineProps<{
    script?: Script;
    categories?: string[];
    readonly: boolean;
    clone?: boolean;
  }>(),
  {
    clone: false,
    readonly: false,
  },
);

// emits
defineEmits([...useDialogPluginComponent.emits]);

// setup quasar plugins
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const $q = useQuasar();

// setup store
const store = useStore();
const openAIEnabled = computed(() => store.state.openAIIntegrationEnabled);

// setup agent dropdown
const { agent, agentOptions, getAgentOptions } = useAgentDropdown();

// script form logic
const script: Script = props.script
  ? reactive(Object.assign({}, { ...props.script, script_body: "" }))
  : reactive({
      name: "",
      shell: "powershell",
      default_timeout: 90,
      args: [],
      script_body: "",
      run_as_user: false,
      env_vars: [],
    });

if (props.clone) script.name = `(Copy) ${script.name}`;
const maximized = ref(false);
const loading = ref(false);
const agentLoading = ref(false);

const missingShebang = computed(() => {
  if (script.shell === "shell" || script.shell === "python") {
    return !script.script_body.includes("#!");
  } else {
    return false;
  }
});

const title = computed(() => {
  if (props.script) {
    return props.readonly
      ? `Viewing ${script.name}`
      : props.clone
      ? `Copying ${script.name}`
      : `Editing ${script.name}`;
  } else {
    return "Adding new script";
  }
});

// convert highlighter language to match what ace expects
const lang = computed(() => {
  if (script.shell === "cmd") return "bat";
  else if (script.shell === "powershell") return "powershell";
  else if (script.shell === "python") return "python";
  else if (script.shell === "shell") return "shell";
  else return "";
});

async function submit() {
  loading.value = true;
  let result = "";
  try {
    // edit existing script
    if (props.script && !props.clone) {
      result = await editScript(script);

      // add or save cloned script
    } else {
      result = await saveScript(script);
    }

    onDialogOK();
    notifySuccess(result);
  } catch (e) {
    console.error(e);
  }

  loading.value = false;
}

function openTestScriptModal() {
  $q.dialog({
    component: TestScriptModal,
    componentProps: {
      script: { ...script },
      agent: agent.value,
    },
  });
}

const scriptEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

function loadEditor() {
  var modelUri = monaco.Uri.parse("model://new"); // a made up unique URI for our model
  var model = monaco.editor.createModel(
    script.script_body,
    lang.value,
    modelUri,
  );

  const theme = $q.dark.isActive ? "vs-dark" : "vs-light";

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor = monaco.editor.create(scriptEditor.value!, {
    readOnly: props.readonly,
    automaticLayout: true,
    model: model,
    theme: theme,
  });

  editor.onDidChangeModelContent(() => {
    script.script_body = editor.getValue();
  });

  // get code if editing or cloning script
  if (props.script)
    downloadScript(script.id, { with_snippets: props.readonly }).then((r) => {
      script.script_body = r.code;
      editor.setValue(r.code);
    });
}

function unloadEditor() {
  editor.getModel()?.dispose();
  editor.dispose();
  onDialogHide();
}

function generateScriptOpenAI() {
  $q.dialog({
    title: "Ask ChatGPT what you need!",
    prompt: {
      model: `${lang.value} code that `,
      type: "text",
    },
    cancel: true,
    persistent: true,
  }).onOk(async (data) => {
    const completion = await generateScript({
      prompt: data,
    });
    script.script_body = completion;
  });
}

// component life cycle hooks
onMounted(async () => {
  agentLoading.value = true;
  await getAgentOptions();
  agentLoading.value = false;
});
</script>
