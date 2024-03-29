<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog
    ref="dialogRef"
    maximized
    @hide="onDialogHide"
    @show="initializeEditor"
    @before-hide="cleanupEditors"
  >
    <q-card>
      <q-bar>
        New Report Template
        <!-- <q-btn
          icon="help"
          round
          flat
          color="info"
          @click="showHelp = !showHelp"
        /> -->
        <q-space />
        <q-btn dense flat icon="close" @click="openClosePrompt">
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
          style="width: 425px"
          :error="!isNameValid"
          hide-bottom-space
        />
        <q-select
          v-model="state.template_html"
          style="width: 250px"
          class="q-pr-sm"
          :options="HTMLTemplateOptions"
          label="Base Templates"
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
          :disable="debug"
        />
        <q-toggle v-model="debug" dense label="Debug" class="q-pl-sm" />
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
          <q-tab v-else name="plaintext" label="Plain Text" :ripple="false" />
          <q-tab
            v-if="templateType !== 'plaintext'"
            name="css"
            label="CSS"
            :ripple="false"
          />
          <q-tab name="preview" label="Preview" :ripple="false" />
        </q-tabs>
      </q-toolbar>

      <!-- main editor -->
      <div v-show="tab !== 'preview'" class="q-px-sm">
        <q-layout
          view="lHh lpR lFf"
          :style="{ height: `${$q.screen.height - 132}px` }"
          container
        >
          <q-drawer
            v-model="showVariablesDrawer"
            :mini="drawerMiniState"
            side="left"
            bordered
            :width="500"
            :mini-width="40"
          >
            <q-btn
              icon="chevron_left"
              color="dark"
              class="absolute"
              style="top: 15px; right: -17px"
              @click="drawerMiniState = true"
              dense
              round
            />
            <template v-slot:mini>
              <div class="q-pt-sm">
                <q-btn
                  class=""
                  icon="chevron_right"
                  color="dark"
                  @click="drawerMiniState = false"
                  dense
                  round
                />
              </div>
            </template>
            <VariablesSelector
              :variables="state.template_variables"
              :template="state.template_md"
              :dependencies="dependencies"
              :dependsOn="state.depends_on"
              :base_template="state.template_html"
            />
          </q-drawer>

          <!-- <q-drawer
            v-model="showHelp"
            side="right"
            :width="600"
            overlay
            bordered
          >
            <ReportingHelpMenu section="template" />
          </q-drawer> -->

          <q-page-container>
            <q-splitter
              v-model="splitter"
              emit-immediately
              reverse
              :limits="[3, 45]"
            >
              <template v-slot:before>
                <EditorToolbar
                  v-if="
                    tab !== 'preview' &&
                    tab !== 'css' &&
                    editor &&
                    variablesEditor
                  "
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
                      @click="splitter > 3 ? (splitter = 3) : (splitter = 35)"
                    >
                      <q-tooltip :delay="500">{{
                        splitter >= 3 ? "Hide variables" : "Show variables"
                      }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      :ripple="false"
                      label="base"
                      no-caps
                      @click="openBaseTemplateForm"
                    >
                      <q-tooltip :delay="500">Add Base Template</q-tooltip>
                    </q-btn>
                  </template>
                </EditorToolbar>
                <div
                  ref="editorDiv"
                  :style="{ height: `${$q.screen.height - 168}px` }"
                ></div>
              </template>
              <template v-slot:after>
                <q-bar>
                  <q-btn
                    v-if="splitter > 6"
                    round
                    dense
                    flat
                    icon="chevron_right"
                    @click="splitter = 3"
                  ></q-btn>
                  <q-btn
                    v-else
                    round
                    dense
                    flat
                    icon="chevron_left"
                    @click="splitter = 35"
                  ></q-btn>

                  <div v-if="splitter > 8" class="q-pl-xs text-subtitle">
                    Variables
                  </div>
                </q-bar>
                <div
                  ref="variablesDiv"
                  v-show="splitter > 8"
                  :style="{ height: `${$q.screen.height - 168}px` }"
                ></div>
              </template>
            </q-splitter>
          </q-page-container>
        </q-layout>
      </div>
      <!-- preview -->
      <ReportTemplatePreview
        v-if="tab == 'preview' && !isLoading"
        :previewFormat="previewFormat"
        :source="renderedPreview"
        :debug="debug"
        :variables="renderedVariables"
      />

      <q-inner-loading
        v-if="tab == 'preview'"
        :showing="isLoading"
        label="Generating Report..."
        label-class="text-teal"
        label-style="font-size: 1.1em"
      />

      <q-card-actions v-if="tab !== 'preview'">
        <q-toggle
          v-if="reportTemplate"
          v-model="autoSave"
          label="Auto-save"
          dense
        />
        <span class="q-pl-sm" v-if="showSaved">Template Saved!</span>
        <q-space />
        <q-btn dense flat label="Cancel" @click="openClosePrompt" />
        <q-btn
          v-if="reportTemplate"
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
import { until, useDebounceFn, useTimeoutFn } from "@vueuse/shared";
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
import { parseDocument } from "yaml";

// ui imports
import EditorToolbar from "./EditorToolbar.vue";
import ReportTemplatePreview from "./ReportTemplatePreview.vue";
import ReportDependencyPrompt from "./ReportDependencyPrompt.vue";
import ReportHTMLTemplateForm from "./ReportHTMLTemplateForm.vue";
import VariablesSelector from "./VariablesSelector.vue";
//import ReportingHelpMenu from "./ReportingHelpMenu.vue";

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

// are you sure? close prompt if work isn't saved
const edited = ref(false);

// watch variables and set the edited variable
watch(
  state,
  () => {
    edited.value = true;
  },
  { deep: true },
);

function openClosePrompt() {
  if (edited.value) {
    $q.dialog({
      title: "You have unsaved changes",
      message: "Would you like to close?",
      cancel: true,
      persistent: true,
    }).onOk(() => {
      dialogRef.value?.hide();
    });
  } else {
    dialogRef.value?.hide();
  }
}

// help menu
//const showHelp = ref(false);

// variables drawer menu state
const showVariablesDrawer = ref(true);
const drawerMiniState = ref(true);

// splitter
const splitter = ref(35);

const previewFormat = ref<ReportFormat>(
  props.templateType === "html" || props.templateType === "markdown"
    ? "html"
    : "plaintext",
);

const formatOptions = [
  {
    label:
      props.templateType === "html" || props.templateType === "markdown"
        ? "HTML"
        : "Text",
    value:
      props.templateType === "html" || props.templateType === "markdown"
        ? "html"
        : "plaintext",
  },
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
  },
);

// initial set of depends on options
const dependsOnOptions = ["client", "site", "agent"];

// will add any custom added depend_on options to the list
state.depends_on?.forEach((item) =>
  !dependsOnOptions.includes(item) ? dependsOnOptions.push(item) : null,
);

// the filtered list that the select uses
const dependsOnFilterOptions = ref(dependsOnOptions);

function createValue(
  val: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  done: (val: any, mode: "add-unique" | "add" | "toggle" | undefined) => void,
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
        (v) => v.toLowerCase().indexOf(needle) > -1,
      );
    }
  });
}

const {
  isLoading,
  isError,
  renderedPreview,
  renderedVariables,
  addReportTemplate,
  editReportTemplate,
  runReportPreview,
  runReportPreviewDebug,
  getAllowedValues,
} = useSharedReportTemplates;

const { reportHTMLTemplates, getReportHTMLTemplates } =
  useSharedReportHTMLTemplates;

const tab = ref(
  props.templateType === "markdown"
    ? "markdown"
    : props.templateType === "html"
    ? "html"
    : "plaintext",
);

onBeforeMount(() => {
  getReportHTMLTemplates();

  if (state.depends_on?.length === 0) {
    getAllowedValues({
      variables: state.template_variables,
      dependencies: dependencies.value,
    });
  }
});

const HTMLTemplateOptions = computed<QSelectOption<number>[]>(() =>
  reportHTMLTemplates.value.map((template) => ({
    label: template.name,
    value: template.id,
  })),
);

const debug = ref(false);

watch(debug, (newValue) => {
  if (newValue)
    props.templateType === "html" || props.templateType === "markdown"
      ? (previewFormat.value = "html")
      : (previewFormat.value = "plaintext");
});

function openBaseTemplateForm() {
  $q.dialog({
    component: ReportHTMLTemplateForm,
  }).onOk(() => getReportHTMLTemplates);
}

function previewReport() {
  wrapDoubleQuotes();
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
          debug: debug.value,
        };
        debug.value
          ? runReportPreviewDebug(request)
          : runReportPreview(request);
      });
  } else {
    const request = {
      ...state,
      format: previewFormat.value,
      dependencies: dependencies.value,
      debug: debug.value,
    };
    debug.value ? runReportPreviewDebug(request) : runReportPreview(request);
  }
}

// load preview when preview tab is selected
watch(tab, (newValue) => {
  if (newValue === "preview") {
    previewReport();
  } else if (newValue === props.templateType) {
    editor.value?.setModel(templateModel);
  } else if (newValue === "css") {
    splitter.value = 3;
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

function cleanupEditors() {
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
    templateUri,
  );
  cssModel = monaco.editor.createModel(state.template_css, "css", cssUri);

  const theme = $q.dark.isActive ? "vs-dark" : "vs-light";

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor.value = monaco.editor.create(editorDiv.value!, {
    automaticLayout: true,
    model: templateModel,
    theme: theme,
    minimap: { enabled: false },
    quickSuggestions: false,
  });

  editor.value?.onDidChangeModelContent(() => {
    const currentModel = editor.value?.getModel();

    if (currentModel) {
      if (currentModel?.uri === cssUri) {
        state.template_css = currentModel.getValue();
      } else {
        state.template_md = currentModel.getValue();
      }
      autoSave.value && applyChanges();
    }
  });

  variablesModel = monaco.editor.createModel(
    state.template_variables,
    "yaml",
    variablesUri,
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  variablesEditor.value = monaco.editor.create(variablesDiv.value!, {
    automaticLayout: true,
    model: variablesModel,
    theme: theme,
    minimap: { enabled: false },
  });

  variablesEditor.value?.onDidChangeModelContent(() => {
    const currentModel = variablesEditor.value?.getModel();

    if (currentModel) {
      state.template_variables = currentModel.getValue();
      autoSave.value && applyChanges();
    }
  });
}

// make sure to put quotes around any variable values that have { or }
function wrapDoubleQuotes() {
  const matchJsonCharacters = /([^:\s'"]+:\s*)([^'"]*[{}][^'"\n]*)/;
  const editorValue = variablesEditor.value?.getValue();
  if (editorValue && matchJsonCharacters.test(editorValue)) {
    state.template_variables = editorValue
      .split("\n")
      .map((line) => line.replace(matchJsonCharacters, "$1'$2'"))
      .join("\n");

    variablesEditor.value?.setValue(state.template_variables);
  }
}

const isNameValid = ref(true);
function validate(dontNotify = false): boolean {
  let isValid = true;

  if (!state.template_md) {
    dontNotify || notifyError("Template Text is required");
    isValid = false;
  }

  if (!state.name) {
    dontNotify || notifyError("Template Name is required");
    isNameValid.value = false;
    isValid = false;
  }

  // check if yaml is valid
  const doc = parseDocument(state.template_variables, { prettyErrors: true });
  if (doc.errors.length > 0) {
    dontNotify ||
      notifyError("Error in variables: " + doc.errors[0].message, 5000);
    isValid = false;
  }

  isNameValid.value = true;
  return isValid;
}

const autoSave = ref(props.reportTemplate ? true : false);
const showSaved = ref(false);

const applyChanges = useDebounceFn(() => {
  isLoading.value = true;
  if (validate(true)) {
    wrapDoubleQuotes();
    editReportTemplate(state.id, state, { dontNotify: true });

    edited.value = false;
    showSaved.value = true;
    useTimeoutFn(() => (showSaved.value = false), 5000);
  }
  isLoading.value = false;
}, 2000);

async function submit() {
  if (validate()) {
    wrapDoubleQuotes();
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
