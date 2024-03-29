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
    @show="loadEditor"
    @before-hide="cleanupEditors"
  >
    <q-card>
      <q-bar>
        {{ props.dataQuery ? "Edit Data Query" : "New Data Query" }}
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
import { reactive, ref } from "vue";
import { useDialogPluginComponent, extend, useQuasar } from "quasar";
import { useSharedReportDataQueries } from "../api/reporting";
import { until } from "@vueuse/shared";
import * as monaco from "monaco-editor";
import axios from "axios";

const $q = useQuasar();

// type imports
import { type ReportDataQuery } from "../types/reporting";
import { notifyError } from "@/utils/notify";

// props
const props = defineProps<{
  dataQuery?: ReportDataQuery;
  editInTemplate?: boolean;
}>();

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
  try {
    state.json_query = JSON.parse(json_string.value);
  } catch (e) {
    notifyError(`There was an error parsing the json: ${e}`);
    return;
  }

  if (!props.editInTemplate) {
    props.dataQuery
      ? editReportDataQuery(state.id, state)
      : addReportDataQuery(state);

    await until(isLoading).not.toBeTruthy();
    if (isError.value) return;
  }
  onDialogOK(state);
}

const queryEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

async function loadEditor() {
  const r = await axios.get("/reporting/queryschema/");

  var modelUri = monaco.Uri.parse("model://new"); // a made up unique URI for our model
  var model = monaco.editor.createModel(json_string.value, "json", modelUri);

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: "schema://model-schema",
        fileMatch: [modelUri.toString()],
        schema: r.data,
      },
    ],
  });

  const theme = $q.dark.isActive ? "vs-dark" : "vs-light";

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor = monaco.editor.create(queryEditor.value!, {
    model: model,
    theme: theme,
  });

  editor.onDidChangeModelContent(() => {
    json_string.value = editor.getValue();
  });
}

function cleanupEditors() {
  editor.getModel()?.dispose();
  editor.dispose();
}
</script>
