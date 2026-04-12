<template>
  <q-dialog
    ref="dialogRef"
    maximized
    @hide="onDialogHide"
    @show="loadEditor"
    @before-hide="unloadEditor"
  >
    <q-card class="q-dialog-plugin">
      <q-bar>
        <span class="q-pr-sm">{{ title }}</span>
        <q-btn
          v-if="!snippet && openAIEnabled"
          :disable="loading"
          dense
          size="xs"
          :label="t('scripts.shared.generateScript')"
          color="primary"
          no-caps
          @click="generateScriptOpenAI"
        />
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            t("scripts.shared.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <div class="row">
        <q-input
          :rules="[(val: string) => !!val || t('scripts.shared.required')]"
          class="q-pa-sm col-4"
          v-model="snippet.name"
          :label="t('scripts.shared.name')"
          filled
          dense
        />
        <q-select
          v-model="snippet.shell"
          :options="shellOptions"
          class="q-pa-sm col-2"
          :label="t('scripts.shared.shellType')"
          options-dense
          filled
          dense
          emit-value
          map-options
        />
        <q-input
          class="q-pa-sm col-6"
          filled
          dense
          v-model="snippet.desc"
          :label="t('scripts.shared.description')"
        />
      </div>

      <div
        ref="snippetEditor"
        :style="{ height: `${$q.screen.height - 132}px` }"
      ></div>

      <q-card-actions align="right">
        <q-btn dense flat :label="t('scripts.shared.cancel')" v-close-popup />
        <q-btn
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
import { ref, watch, reactive, computed } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { generateScript } from "@/api/core";
import { useDialogPluginComponent } from "quasar";
import { saveScriptSnippet, editScriptSnippet } from "@/api/scripts";
import { notifySuccess } from "@/utils/notify";

// ui imports
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
import type { ScriptSnippet } from "@/types/scripts";

// static data
import { shellOptions } from "@/composables/scripts";

// props
const props = defineProps<{ snippet?: ScriptSnippet }>();

// emits
defineEmits([...useDialogPluginComponent.emits]);

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// setup quasar
const $q = useQuasar();
const { t } = useI18n();

// setup store
const store = useStore();
const openAIEnabled = computed(() => store.state.openAIIntegrationEnabled);

// snippet form logic
const snippet: ScriptSnippet = props.snippet
  ? reactive(Object.assign({}, props.snippet))
  : reactive({ name: "", code: "", shell: "powershell" });
const loading = ref(false);

const title = computed(() => {
  if (props.snippet) {
    return t("scripts.scriptSnippetFormModal.editing", { name: snippet.name });
  } else {
    return t("scripts.scriptSnippetFormModal.addingNewScriptSnippet");
  }
});

// convert highlighter language to match what ace expects
const lang = computed(() => {
  switch (snippet.shell) {
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
  try {
    const result = props.snippet
      ? await editScriptSnippet(snippet)
      : await saveScriptSnippet(snippet);
    onDialogOK();
    notifySuccess(result);
  } catch (e) {
    console.error(e);
  }

  loading.value = false;
}

const snippetEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

function loadEditor() {
  var model = monaco.editor.createModel(snippet.code, lang.value);

  const theme = $q.dark.isActive ? "vs-dark" : "vs-light";

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor = monaco.editor.create(snippetEditor.value!, {
    automaticLayout: true,
    model: model,
    theme: theme,
  });

  editor.onDidChangeModelContent(() => {
    snippet.code = editor.getValue();
  });

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
    snippet.code = completion;
  });
}
</script>
