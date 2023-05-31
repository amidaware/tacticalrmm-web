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

        <q-select
          v-model="state.depends_on"
          style="width: 250px"
          class="q-pr-sm"
          :options="dependsOnFilterOptions"
          label="Template Dependencies"
          multiple
          dense
          filled
          use-input
          input-debounce="0"
          @new-value="createValue"
          @filter="filterFn"
        >
          <template v-slot:selected>
            <span v-if="state.depends_on && state.depends_on?.length > 0"
              >{{ state.depends_on?.length }} Selected</span
            >
          </template>
        </q-select>

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
        <EditorToolbar
          v-if="(tab === 'markdown' || tab === 'html') && editor"
          :editor="editor"
          :variablesEditor="variablesEditor"
          :templateType="templateType"
        >
          <template v-slot:buttons>
            <q-btn
              flat
              dense
              :ripple="false"
              label="vars"
              no-caps
              @click="splitter > 0 ? (splitter = 0) : (splitter = 50)"
            >
              <q-tooltip :delay="500">{{
                splitter > 0 ? "Hide variables" : "Show variables"
              }}</q-tooltip>
            </q-btn>
          </template>
        </EditorToolbar>

        <q-splitter
          v-model="splitter"
          emit-immediately
          reverse
          :limits="[0, 50]"
        >
          <template v-slot:before>
            <div
              ref="editorDiv"
              :style="{ height: `${$q.screen.height - 164}px` }"
            ></div>
          </template>
          <template v-slot:after>
            <div
              ref="variablesDiv"
              v-show="splitter > 0"
              :style="{ height: `${$q.screen.height - 164}px` }"
            ></div>
          </template>
        </q-splitter>
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
import ReportDependencyPrompt from "./ReportDependencyPrompt.vue";

// type imports
import type {
  ReportTemplate,
  ReportTemplateType,
  ReportFormat,
  ReportDependencies,
} from "../types/reporting";

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
      depends_on: props.cloneTemplate ? props.cloneTemplate?.depends_on : [],
    });

// splitter
const splitter = ref(0);

const previewFormat = ref<ReportFormat>("html");
const formatOptions = [
  { label: "HTML", value: "html" },
  { label: "PDF", value: "pdf" },
];

const dependencies = ref<ReportDependencies>({});

watch(
  () => state.depends_on,
  (newArray, oldArray) => {
    if (newArray && oldArray) {
      const removed = oldArray.filter((item) => newArray.indexOf(item) == -1);
      removed.forEach((item) => delete dependencies.value[item]);
    }
  }
);

// initial set of depends on options
const dependsOnOptions = ["client", "site", "agent"];

// will add any custom added depend_on options to the list
state.depends_on?.forEach((item) =>
  !dependsOnOptions.includes(item) ? dependsOnOptions.push(item) : null
);

// the filtered list that the select uses
const dependsOnFilterOptions = ref(dependsOnOptions);

function createValue(
  val: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  done: (val: any, mode: "add-unique" | "add" | "toggle" | undefined) => void
) {
  if (val.length > 0) {
    if (!dependsOnOptions.includes(val)) {
      dependsOnOptions.push(val);
    }
    done(val, "add-unique");
  }
}

function filterFn(val: string, update: (callback: () => void) => void) {
  update(() => {
    if (val === "") {
      dependsOnFilterOptions.value = dependsOnOptions;
    } else {
      const needle = val.toLowerCase();
      dependsOnFilterOptions.value = dependsOnOptions.filter(
        (v) => v.toLowerCase().indexOf(needle) > -1
      );
    }
  });
}

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

function previewReport() {
  let needsPrompt: string[] = [];
  if (state.depends_on && state.depends_on.length > 0) {
    needsPrompt = state.depends_on.filter((dep) => !dependencies.value[dep]);
  }

  if (needsPrompt.length > 0) {
    $q.dialog({
      component: ReportDependencyPrompt,
      componentProps: { dependsOn: needsPrompt },
    })
      .onOk((deps: ReportDependencies) => {
        dependencies.value = { ...dependencies.value, ...deps };
      })
      .onDismiss(() => {
        const request = {
          ...state,
          format: previewFormat.value,
          dependencies: dependencies.value,
        };
        runReportPreview(request);
      });
  } else {
    const request = {
      ...state,
      format: previewFormat.value,
      dependencies: dependencies.value,
    };
    runReportPreview(request);
  }
}

// load preview when preview tab is selected
watch(tab, (newValue) => {
  if (newValue === "preview") {
    previewReport();
  } else if (newValue === props.templateType) {
    editor.value?.setModel(templateModel);
  } else if (newValue === "css") {
    splitter.value = 0;
    editor.value?.setModel(cssModel);
  }
});

// load preview when preview format changes
watch(previewFormat, () => {
  if (tab.value === "preview") {
    previewReport();
  }
});

// main editor
const editorDiv = ref<HTMLElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();

// saves state for template
let templateModel: monaco.editor.ITextModel;
const templateUri = monaco.Uri.parse(`editor://${props.templateType}`);

// saves state for css
let cssModel: monaco.editor.ITextModel;
const cssUri = monaco.Uri.parse("editor://css");

// saves state for variables editor
const variablesDiv = ref<HTMLElement | null>(null);
const variablesEditor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
let variablesModel: monaco.editor.ITextModel;
const variablesUri = monaco.Uri.parse("editor://variables");

function unloadEditor() {
  editor.value?.dispose();
  variablesEditor.value?.dispose();
  templateModel?.dispose();
  cssModel?.dispose();
  variablesModel?.dispose();
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
    minimap: { enabled: false },
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

  variablesModel = monaco.editor.createModel(
    state.template_variables,
    "yaml",
    variablesUri
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  variablesEditor.value = monaco.editor.create(variablesDiv.value!, {
    automaticLayout: true,
    model: variablesModel,
    theme: "vs-dark",
    minimap: { enabled: false },
  });

  variablesEditor.value?.onDidChangeModelContent(() => {
    const currentModel = variablesEditor.value?.getModel();

    if (currentModel) {
      state.template_variables = currentModel.getValue();
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
