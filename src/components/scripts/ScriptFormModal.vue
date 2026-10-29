<template>
  <q-dialog
    ref="dialogRef"
    maximized
    no-esc-dismiss
    @hide="onDialogHide"
    @show="loadEditor"
    @before-hide="unloadEditor"
    @keydown.esc.stop="closeEditor"
  >
    <q-card class="q-dialog-plugin">
      <q-bar>
        <span class="q-pr-sm">{{ title }}</span>
        <q-btn
          v-if="!script && openAIEnabled"
          size="xs"
          :disable="loading"
          dense
          :label="$gettext('Generate Script')"
          color="primary"
          no-caps
          @click="generateScriptOpenAI"
        />
        <q-space />
        <q-btn dense flat icon="close" @click="closeEditor">
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-banner
        v-if="script.script_body && missingShebang"
        dense
        inline-actions
        class="text-black bg-warning"
      >
        <template v-slot:avatar>
          <q-icon class="text-center" name="warning" color="black" /> </template
        >{{
          $gettext(
            "Shell/Python scripts on Linux/Mac need a shebang at the top of the script e.g.",
          )
        }}
        <code>#!/bin/bash</code> {{ $gettext("or") }}
        <code>#!/usr/bin/python3</code><br />
        {{ $gettext("Add one to get rid of this warning. Ignore if windows.") }}
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
          :style="{ height: `${$q.screen.height - 106}px` }"
        >
          <div class="q-gutter-sm q-pr-sm">
            <q-input
              filled
              dense
              :readonly="readonly"
              v-model="script.name"
              :label="$pgettext('Script configuration', 'Name')"
              :rules="[(val) => !!val || $gettext('*Required')]"
              hide-bottom-space
            />
            <q-input
              filled
              dense
              :readonly="readonly"
              v-model="script.description"
              :label="$pgettext('Script configuration', 'Description')"
              type="textarea"
              rows="2"
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
              :label="$gettext('Shell Type')"
            />
            <tactical-dropdown
              v-model="script.supported_platforms"
              :options="agentPlatformOptions"
              :label="$gettext('Supported Platforms (All supported if blank)')"
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
              :label="$gettext('Category')"
              :readonly="readonly"
              hide-bottom-space
            />
            <tactical-dropdown
              v-model="script.args"
              :label="
                $pgettext(
                  'Script configuration',
                  'Script Arguments (press Enter after typing each argument)',
                )
              "
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
              :label="$gettext('Environment Variables')"
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
              :label="$gettext('Timeout (seconds)')"
              :rules="[
                (val) => val >= 5 || $gettext('Minimum is %{min}', { min: 5 }),
              ]"
              hide-bottom-space
            />
            <q-input
              :label="$pgettext('Script editor', 'Syntax')"
              v-model="script.syntax"
              dense
              filled
              autogrow
              :readonly="readonly"
            />
            <q-checkbox
              v-model="script.run_as_user"
              :label="$gettext('Run As User (Windows only)')"
            >
              <q-tooltip
                >{{
                  $gettext(
                    "Setting this value on the script model will always override any \u0027Run As User\u0027 checkboxes in the UI and force this script to always be run in the context of the logged in user. If no user is logged in, the script will run as SYSTEM.",
                  )
                }}
              </q-tooltip>
            </q-checkbox>
          </div>
        </q-scroll-area>
        <div
          ref="scriptEditor"
          class="col-8 q-mb-none q-pb-none"
          :style="{ height: `${$q.screen.height - 106}px` }"
        ></div>
      </div>
      <q-card-actions>
        <tactical-dropdown
          style="width: 550px"
          dense
          :loading="agentLoading"
          filled
          v-model="agent"
          :options="agentOptions"
          :label="$gettext('Agent to run test script on')"
          mapOptions
          filterable
        >
          <template v-slot:after>
            <q-btn
              size="md"
              color="primary"
              dense
              flat
              :label="$gettext('Test Script')"
              :disable="
                !agent || !script.script_body || !script.default_timeout
              "
              @click="openTestScriptModal('agent')"
            />
            <q-btn
              v-if="!hosted"
              size="md"
              color="secondary"
              dense
              flat
              :label="$gettext('Test on Tactical\u0027s Server')"
              :disable="
                !script.script_body ||
                !script.default_timeout ||
                !server_scripts_enabled
              "
              @click="openTestScriptModal('server')"
            >
              <q-tooltip
                anchor="top middle"
                self="bottom middle"
                transition-show="fade"
                transition-hide="fade"
              >
                <div>
                  <strong>{{
                    $gettext("Runs on Tactical RMM local Linux Server.")
                  }}</strong
                  ><br />
                  {{
                    $gettext(
                      "Only available interpreters or frameworks will be used.",
                    )
                  }}<br />
                  <em>{{ $gettext("Example") }}:</em>
                  {{
                    $gettext(
                      "PowerShell scripts require PowerShell to be installed on the system.",
                    )
                  }}
                </div>
              </q-tooltip>
            </q-btn>
          </template>
        </tactical-dropdown>
        <q-space />
        <q-btn dense flat :label="$gettext('Cancel')" @click="closeEditor" />
        <q-btn
          v-if="!readonly"
          :loading="loading"
          dense
          flat
          :label="$gettext('Save')"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
// composable imports
import { ref, reactive, watch, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { saveScript, editScript, downloadScript } from "@/api/scripts";
import { useAgentDropdown, agentPlatformOptions } from "@/composables/agents";
import { generateScript } from "@/api/core";
import { notifyError, notifySuccess } from "@/utils/notify";

// ui imports
import TestScriptModal from "@/components/scripts/TestScriptModal.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import * as monaco from "monaco-editor";

import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

// https://github.com/microsoft/monaco-editor/issues/4045#issuecomment-1723787448
self.MonacoEnvironment = {
  getWorker: function (workerId, label) {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new jsWorker();
      default:
        return new editorWorker();
    }
  },
};

// types
import type { Script } from "@/types/scripts";

// static data
import { shellOptions } from "@/composables/scripts";

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
const hosted = computed(() => store.state.hosted);
const server_scripts_enabled = computed(
  () => store.state.server_scripts_enabled,
);

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

if (props.clone) {
  script.name = gettext.$gettext("(Copy) %{name}", {
    name: script.name,
  });
}
const loading = ref(false);
const agentLoading = ref(false);

const missingShebang = computed(() => {
  if (script.shell === "shell" || script.shell === "python") {
    return !script.script_body.startsWith("#!");
  } else {
    return false;
  }
});

const title = computed(() => {
  if (props.script) {
    return props.readonly
      ? gettext.$gettext("Viewing %{name}", { name: script.name })
      : props.clone
        ? gettext.$gettext("Copying %{name}", { name: script.name })
        : gettext.$gettext("Editing %{name}", { name: script.name });
  } else {
    return gettext.$gettext("Adding new script");
  }
});

// convert highlighter language to match what ace expects
const lang = computed(() => {
  switch (script.shell) {
    case "cmd":
      return "bat";
    case "powershell":
      return "powershell";
    case "python":
      return "python";
    case "shell":
    case "nushell":
      return "shell";
    case "deno":
      return "typescript";
    default:
      return "";
  }
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

function openTestScriptModal(ctx: string) {
  if (ctx === "server" && !script.script_body.startsWith("#!")) {
    notifyError(
      gettext.$gettext(
        "A shebang is required at the top of the script to specify the interpreter's path. Please ensure your script begins with a shebang line.",
      ),
      7000,
    );
    return;
  }
  $q.dialog({
    component: TestScriptModal,
    componentProps: {
      script: { ...script },
      agent: agent.value,
      ctx: ctx,
    },
  });
}

const scriptEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

function loadEditor() {
  var model = monaco.editor.createModel(script.script_body, lang.value);

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

      // need to add this in the download function otherwise the above will trigger an edit
      watch(
        () => script.script_body,
        () => {
          edited.value = true;
        },
      );
    });
  else {
    watch(
      () => script.script_body,
      () => {
        edited.value = true;
      },
    );
  }

  // watch for changes in language
  watch(lang, () => {
    monaco.editor.setModelLanguage(model, lang.value);
  });
}

function unloadEditor() {
  editor.getModel()?.dispose();
  editor.dispose();
  onDialogHide();
}

function generateScriptOpenAI() {
  $q.dialog({
    title: gettext.$gettext("Ask ChatGPT what you need!"),
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

// add are you sure prompt to unsaved script
const edited = ref(false);

function closeEditor() {
  if (edited.value)
    $q.dialog({
      title: gettext.$gettext(
        "You have unsaved changes. Are you sure you want to close?",
      ),
      cancel: true,
      ok: true,
    }).onOk(async () => {
      unloadEditor();
    });
  else unloadEditor();
}

// component life cycle hooks
onMounted(async () => {
  agentLoading.value = true;
  await getAgentOptions();
  agentLoading.value = false;
});
</script>
