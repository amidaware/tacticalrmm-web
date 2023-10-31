<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="unloadEditor" @show="loadEditor">
    <q-card style="width: 600px">
      <q-bar>
        Add Chart
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-input v-model="chartName" outlined dense label="Chart Name" />
      </q-card-section>
      <q-card-section>
        <q-select
          v-model="chartType"
          :options="chartOptions"
          outlined
          dense
          label="Chart Type"
          map-options
          emit-value
        />
      </q-card-section>
      <q-card-section>
        <q-option-group
          v-model="outputType"
          :options="outputOptions"
          dense
          inline
        />
      </q-card-section>
      <q-card-section>
        <div
          ref="chartEditor"
          :style="{ height: `${$q.screen.height / 2}px` }"
        ></div>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn dense flat label="Cancel" v-close-popup />
        <q-btn @click="submit" dense flat label="Select" color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { useDialogPluginComponent, useQuasar } from "quasar";
import * as monaco from "monaco-editor";

// setup quasar
const $q = useQuasar();

// emits
defineEmits([...useDialogPluginComponent.emits]);

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const chartOptions = [
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "line", label: "Line" },
];

const outputOptions = [
  { value: "image", label: "Image" },
  { value: "html", label: "Html" },
];

const chartName = ref("");
const chartType = ref("bar");
const outputType = ref("image");
const options = ref("");

const output = computed(() => ({
  name: chartName.value,
  chartType: chartType.value,
  outputType: outputType.value,
  options: options.value,
}));

function submit() {
  onDialogOK(output.value);
}

const chartEditor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

function loadEditor() {
  var modelUri = monaco.Uri.parse("model://new"); // a made up unique URI for our model
  var model = monaco.editor.createModel(options.value, "yaml", modelUri);

  const theme = $q.dark.isActive ? "vs-dark" : "vs-light";

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  editor = monaco.editor.create(chartEditor.value!, {
    model: model,
    theme: theme,
    minimap: { enabled: false },
  });

  editor.onDidChangeModelContent(() => {
    options.value = editor.getValue();
  });
}

function unloadEditor() {
  editor.getModel()?.dispose();
  editor.dispose();
  onDialogHide();
}
</script>
