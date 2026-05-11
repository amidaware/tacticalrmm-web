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
          :label="t('scripts.shared.generateScript')"
          color="primary"
          no-caps
          @click="generateScriptOpenAI"
        />
        <q-space />
        <q-btn dense flat icon="close" @click="closeEditor">
          <q-tooltip class="bg-white text-primary">{{
            t("scripts.shared.close")
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
        >{{ t("scripts.scriptFormModal.shebangWarning") }}
        <code>#!/bin/bash</code> {{ t("scripts.shared.or") }}
        <code>#!/usr/bin/python3</code><br />
        {{ t("scripts.scriptFormModal.shebangWarningHint") }}
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
              :label="t('scripts.shared.name')"
              :rules="[(val) => !!val || t('scripts.shared.required')]"
              hide-bottom-space
            />
            <q-input
              filled
              dense
              :readonly="readonly"
              v-model="script.description"
              :label="t('scripts.shared.description')"
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
              :label="t('scripts.shared.shellType')"
            />
            <tactical-dropdown
              v-model="script.supported_platforms"
              :options="agentPlatformOptions"
              :label="t('scripts.shared.supportedPlatforms')"
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
              :label="t('scripts.shared.category')"
              :readonly="readonly"
              hide-bottom-space
            />
            <tactical-dropdown
              v-model="script.args"
              :label="t('scripts.shared.scriptArguments')"
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
              :label="t('scripts.shared.environmentVariables')"
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
              :label="t('scripts.shared.timeoutSeconds')"
              :rules="[
                (val) =>
                  val >= 5 || t('scripts.shared.minimumSeconds', { min: 5 }),
              ]"
              hide-bottom-space
            />
            <q-input
              :label="t('scripts.scriptFormModal.syntax')"
              v-model="script.syntax"
              dense
              filled
              autogrow
              :readonly="readonly"
            />
            <q-checkbox
              v-model="script.run_as_user"
              :label="t('scripts.scriptFormModal.runAsUserWindowsOnly')"
            >
              <q-tooltip
                >{{ t("scripts.scriptFormModal.runAsUserTooltip") }}
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
          :label="t('scripts.scriptFormModal.agentToRunTestScriptOn')"
          mapOptions
          filterable
        >
          <template v-slot:after>
            <q-btn
              size="md"
              color="primary"
              dense
              flat
              :label="t('scripts.scriptFormModal.testScript')"
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
              :label="t('scripts.scriptFormModal.testOnServer')"
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
                    t("scripts.scriptFormModal.testOnServerTooltip.title")
                  }}</strong
                  ><br />
                  {{ t("scripts.scriptFormModal.testOnServerTooltip.body")
                  }}<br />
                  <em>{{ t("scripts.shared.example") }}:</em>
                  {{ t("scripts.scriptFormModal.testOnServerTooltip.example") }}
                </div>
              </q-tooltip>
            </q-btn>
          </template>
        </tactical-dropdown>
        <q-space />
        <q-btn
          dense
          flat
          :label="t('scripts.shared.cancel')"
          @click="closeEditor"
        />
        <q-btn
          v-if="!readonly"
          :loading="loading"
          dense
          flat
          :label="t('scripts.shared.save')"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composable imports
import { ref, reactive, watch, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";
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
const { t } = useI18n();

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
  script.name = t("scripts.scriptFormModal.copyNamePrefix", {
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
      ? t("scripts.scriptFormModal.viewing", { name: script.name })
      : props.clone
        ? t("scripts.scriptFormModal.copying", { name: script.name })
        : t("scripts.scriptFormModal.editing", { name: script.name });
  } else {
    return t("scripts.scriptFormModal.addingNewScript");
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
    notifyError(t("scripts.scriptFormModal.shebangRequiredError"), 7000);
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
    title: t("scripts.shared.askChatGpt"),
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
      title: t("scripts.scriptFormModal.unsavedChangesConfirm"),
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
