<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog
    ref="dialogRef"
    maximized
    @hide="unloadEditor"
    @show="initializeEditor"
  >
    <q-card>
      <q-bar>
        New Report Template
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-toolbar>
        <q-input
          v-model="state.name"
          label="Report Name"
          class="q-pr-sm"
          filled
          dense
          style="width: 250px"
          :error="!isNameValid"
          hide-bottom-space
        />
        <q-select
          v-model="state.template_html"
          style="width: 250px"
          class="q-pr-sm"
          :options="HTMLTemplateOptions"
          label="HTML Templates"
          map-options
          emit-value
          dense
          filled
          clearable
        />

        <q-option-group
          v-model="previewFormat"
          :options="formatOptions"
          dense
          color="primary"
        />
        <q-space />

        <q-tabs v-model="tab" dense shrink>
          <q-tab
            v-if="templateType === 'markdown'"
            name="markdown"
            label="Markdown"
            :ripple="false"
          />
          <q-tab
            v-else-if="templateType === 'html'"
            name="html"
            label="Html"
            :ripple="false"
          />
          <q-tab name="css" label="CSS" :ripple="false" />
          <q-tab name="preview" label="Preview" :ripple="false" />
        </q-tabs>
      </q-toolbar>

      <div
        v-show="tab === 'markdown' || tab === 'html' || tab === 'css'"
        class="q-px-sm"
      >
        <EditorToolbar v-if="tab === 'markdown' && editor" :editor="editor" />

        <div
          ref="editorDiv"
          :style="{ height: `${$q.screen.height - 164}px` }"
        ></div>
      </div>

      <!-- preview -->
      <iframe
        v-show="tab === 'preview'"
        :srcdoc="previewFormat === 'html' ? renderedPreview : undefined"
        :src="previewFormat === 'pdf' ? renderedPreview : undefined"
        :style="{
          'max-height': `${$q.screen.height - 132}px`,
          'min-height': `${$q.screen.height - 132}px`,
          'min-width': '100%',
          'background-color': 'white',
        }"
      ></iframe>

      <q-card-actions align="right">
        <q-btn v-close-popup dense flat label="Cancel" />
        <q-btn
          :loading="isLoading"
          dense
          flat
          label="Apply"
          color="primary"
          @click="applyChanges"
        />
        <q-btn
          :loading="isLoading"
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
// composition imports
import { ref, reactive, computed, watch, onBeforeMount, shallowRef } from "vue";
import { until } from "@vueuse/shared";
import {
  useQuasar,
  useDialogPluginComponent,
  extend,
  type QSelectOption,
} from "quasar";
import {
  useSharedReportTemplates,
  useSharedReportHTMLTemplates,
} from "../api/reporting";
import { notifyError } from "@/utils/notify";
import * as monaco from "monaco-editor";

// ui imports
import EditorToolbar from "./EditorToolbar.vue";

// type imports
import type { ReportTemplate, ReportTemplateType } from "../types/reporting";

// props
const props = defineProps<{
  templateType: ReportTemplateType;
  reportTemplate?: ReportTemplate;
  cloneTemplate?: ReportTemplate;
}>();

// emits
defineEmits([...useDialogPluginComponent.emits]);

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// quasar setup
const $q = useQuasar();

// new report logic
const state: ReportTemplate = props.reportTemplate
  ? reactive(extend({}, props.reportTemplate))
  : reactive({
      id: 0,
      name: props.cloneTemplate ? `Copy of ${props.cloneTemplate.name}` : "",
      template_md: props.cloneTemplate ? props.cloneTemplate.template_md : "",
      template_css: props.cloneTemplate ? props.cloneTemplate.template_css : "",
      template_html: props.cloneTemplate
        ? props.cloneTemplate.template_html
        : undefined,
      type: props.templateType,
      template_variables: props.cloneTemplate
        ? props.cloneTemplate.template_variables
        : "",
    });

const previewFormat = ref<"html" | "pdf">("html");
const formatOptions = [
  { label: "HTML", value: "html" },
  { label: "PDF", value: "pdf" },
];

const {
  isLoading,
  isError,
  renderedPreview,
  addReportTemplate,
  editReportTemplate,
  runReportPreview,
} = useSharedReportTemplates;

const { reportHTMLTemplates, getReportHTMLTemplates } =
  useSharedReportHTMLTemplates;

const tab = ref(props.templateType === "markdown" ? "markdown" : "html");

onBeforeMount(getReportHTMLTemplates);
const HTMLTemplateOptions = computed<QSelectOption<number>[]>(() =>
  reportHTMLTemplates.value.map((template) => ({
    label: template.name,
    value: template.id,
  }))
);

// load preview when preview tab is selected
watch(tab, (newValue) => {
  if (newValue === "preview") {
    const request = {
      ...state,
      format: previewFormat.value,
    };
    runReportPreview(request);
  } else if (newValue === props.templateType) {
    editor.value?.setModel(templateModel);
  } else if (newValue === "css") {
    editor.value?.setModel(cssModel);
  }
});

// load preview when preview tab is selected
watch(previewFormat, () => {
  if (tab.value === "preview") {
    const request = {
      ...state,
      format: previewFormat.value,
    };
    runReportPreview(request);
  }
});

const editorDiv = ref<HTMLElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();

// saves state for template
let templateModel: monaco.editor.ITextModel;
const templateUri = monaco.Uri.parse(`editor://${props.templateType}`);

// saves state for css
let cssModel: monaco.editor.ITextModel;
const cssUri = monaco.Uri.parse("editor://css");

function unloadEditor() {
  editor.value?.dispose();
  templateModel?.dispose();
  cssModel?.dispose();
  onDialogHide();
}

function initializeEditor() {
  templateModel = monaco.editor.createModel(
    state.template_md,
    props.templateType,
    templateUri
  );
  cssModel = monaco.editor.createModel(state.template_css, "css", cssUri);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor.value = monaco.editor.create(editorDiv.value!, {
    automaticLayout: true,
    model: templateModel,
    theme: "vs-dark",
  });

  editor.value?.onDidChangeModelContent(() => {
    const currentModel = editor.value?.getModel();

    if (currentModel) {
      if (currentModel?.uri === cssUri) {
        state.template_css = currentModel.getValue();
      } else {
        state.template_md = currentModel.getValue();
      }
    }
  });
}

const isNameValid = ref(true);
function validate(): boolean {
  if (!state.template_md) {
    notifyError("Template Text is required");
    return false;
  }

  if (!state.name) {
    notifyError("Template Name is required");
    isNameValid.value = false;
    return false;
  }

  return true;
}

function applyChanges() {
  if (validate()) {
    props.reportTemplate
      ? editReportTemplate(state.id, state)
      : addReportTemplate(state);
  }
}

async function submit() {
  if (validate()) {
    props.reportTemplate
      ? editReportTemplate(state.id, state)
      : addReportTemplate(state);

    // stops the dialog from closing when there is an error
    await until(isLoading).not.toBeTruthy();
    if (isError.value) return;

    onDialogOK();
  }
}
</script>
