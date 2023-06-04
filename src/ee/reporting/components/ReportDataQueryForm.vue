<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide" @show="loadEditor">
    <q-card>
      <q-bar>
        New Data Query
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-toolbar>
        <q-input
          v-model="state.name"
          label="Data Query Name"
          filled
          dense
          style="width: 400px"
        />
        <q-space />
      </q-toolbar>

      <div
        ref="queryEditor"
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
import { reactive, ref, onUnmounted } from "vue";
import { useDialogPluginComponent, extend } from "quasar";
import { useSharedReportDataQueries } from "../api/reporting";
import { until } from "@vueuse/shared";
import * as monaco from "monaco-editor";
import { getBaseUrl } from "@/boot/axios";

// ui imports

// type imports
import { type ReportDataQuery } from "../types/reporting";

// props
const props = defineProps<{ dataQuery?: ReportDataQuery }>();

// emits
defineEmits([...useDialogPluginComponent.emits]);

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// new data query logic
const state: ReportDataQuery = props.dataQuery
  ? reactive(extend({}, props.dataQuery))
  : reactive({
      id: 0,
      name: "",
      json_query: {},
    });

const json_string = ref(JSON.stringify(state.json_query, null, 4));

const { isLoading, isError, addReportDataQuery, editReportDataQuery } =
  useSharedReportDataQueries;

async function submit() {
  state.json_query = JSON.parse(json_string.value);
  props.dataQuery
    ? editReportDataQuery(state.id, state)
    : addReportDataQuery(state);

  await until(isLoading).not.toBeTruthy();
  if (isError.value) return;

  onDialogOK(state.name);
}

const queryEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

function loadEditor() {
  var modelUri = monaco.Uri.parse("model://new"); // a made up unique URI for our model
  var model = monaco.editor.createModel(json_string.value, "json", modelUri);

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    enableSchemaRequest: true,
    schemas: [
      {
        uri: `${getBaseUrl()}/static/reporting/schemas/query_schema.json`,
        fileMatch: [modelUri.toString()],
      },
    ],
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor = monaco.editor.create(queryEditor.value!, {
    model: model,
    theme: "vs-dark",
  });

  editor.onDidChangeModelContent(() => {
    json_string.value = editor.getValue();
  });
}

onUnmounted(() => {
  editor.getModel()?.dispose();
  editor.dispose();
});
</script>
