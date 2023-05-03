<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" maximized @hide="unloadEditor" @show="loadEditor">
    <q-card>
      <q-bar>
        New HTML Template
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-toolbar>
        <q-input
          v-model="state.name"
          label="HTML Template Name"
          filled
          dense
          style="width: 400px"
        />
        <q-space />
      </q-toolbar>

      <div
        ref="htmlEditor"
        :style="{ height: `${$q.screen.height - 126}px` }"
      ></div>

      <q-card-actions align="right">
        <q-btn v-close-popup dense flat label="Cancel" />
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
import { ref, reactive } from "vue";
import { useDialogPluginComponent, extend } from "quasar";
import { useSharedReportHTMLTemplates } from "../api/reporting";
import { until } from "@vueuse/shared";
import * as monaco from "monaco-editor";

// type imports
import { type ReportHTMLTemplate } from "../types/reporting";

// props
const props = defineProps<{
  template?: ReportHTMLTemplate;
  cloneTemplate?: ReportHTMLTemplate;
}>();

// emits
defineEmits([...useDialogPluginComponent.emits]);

const defaultTemplate = `<html>
    <head>
        <style>
            {{ css }}
        </style>
    </head>
    <body>
        {{ body }}
    </body>
</html>
`;

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// new html template logic
const state: ReportHTMLTemplate = props.template
  ? reactive(extend({}, props.template))
  : reactive({
      id: 0,
      name: props.cloneTemplate ? props.cloneTemplate.name : "",
      html: props.cloneTemplate ? props.cloneTemplate.html : defaultTemplate,
    });

const { isLoading, isError, addReportHTMLTemplate, editReportHTMLTemplate } =
  useSharedReportHTMLTemplates;

async function submit() {
  props.template
    ? editReportHTMLTemplate(state.id, state)
    : addReportHTMLTemplate(state);

  // stops the dialog from closing when there is an error
  await until(isLoading).not.toBeTruthy();
  if (isError.value) return;

  onDialogOK();
}

const htmlEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

function loadEditor() {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor = monaco.editor.create(htmlEditor.value!, {
    language: "html",
    value: state.html,
    theme: "vs-dark",
  });

  editor.onDidChangeModelContent(() => {
    state.html = editor.getValue();
  });
}

function unloadEditor() {
  editor.dispose();
  onDialogHide();
}
</script>
