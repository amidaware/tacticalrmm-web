<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 600px">
      <q-bar>
        Insert Table
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-option-group
          v-model="tableType"
          :options="tableTypeOptions"
          dense
          inline
        />
      </q-card-section>
      <q-card-section v-if="tableType === 'variables'">
        <q-select
          v-model="source"
          :options="arrayOptions"
          outlined
          dense
          label="Data Source"
        />
      </q-card-section>
      <q-card-section>
        <q-input v-model="output" filled type="textarea" lines="20" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup dense flat label="Cancel" />
        <q-btn dense flat label="Insert" color="primary" @click="insert" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useSharedReportTemplates } from "../api/reporting";

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { variableAnalysis } = useSharedReportTemplates;

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const tableTypeOptions = [
  { value: "blank", label: "Blank" },
  { value: "variables", label: "From Variables" },
];

const blankOutput = `<table>
  <thead>
    <tr>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td></td>
    </tr>
  </tbody>
</table>`;

const tableType = ref<"blank" | "variables">("blank");
const source = ref("");
const output = ref(blankOutput);

// watch for source change and get list of columns
watch(source, (newSource) => {
  let columns = [] as string[];
  for (let key in variableAnalysis.value)
    if (key.startsWith(newSource + "[0]"))
      columns.push(key.replace(newSource + "[0].", ""));

  generateTable(columns);
});

watch(tableType, (newValue) => {
  if (newValue === "blank") output.value = blankOutput;
});

// compute the arrayOptions
const arrayOptions = computed(() => {
  let options = [];
  for (let key in variableAnalysis.value)
    if (variableAnalysis.value[key].toLowerCase().startsWith("array"))
      options.push(key);
  return options;
});

function generateTable(columns: string[]) {
  let headers = "";
  let cells = "";
  columns.forEach((column) => {
    headers += `\t<th>${column}</th>\n`;
    cells += `\t<td>{{ item.${column} }}</td>\n`;
  });

  if (!headers) {
    headers = "\t<th>Column Name</th>";
  }

  if (!cells) {
    cells = "\t<td>{{ item }}</td>";
  }

  output.value = `<table>
  <thead>
    <tr>
${headers}
    </tr>
  </thead>
  <tbody>
    {% for item in ${source.value} %}
    <tr>
${cells}
    </tr>
    {% endfor %}
  </tbody>
</table>
`;
}

function insert() {
  onDialogOK(output.value);
}
</script>
