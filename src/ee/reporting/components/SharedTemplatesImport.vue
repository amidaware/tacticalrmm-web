<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide">
    <q-card>
      <q-bar>
        Shared Templates
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-table
        dense
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        :style="{ 'max-height': `${$q.screen.height - 32}px` }"
        class="tbl-sticky"
        :rows="sharedTemplates"
        :columns="columns"
        :loading="isLoading"
        :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: true }"
        :filter="search"
        selection="multiple"
        v-model:selected="selected"
        row-key="name"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #top>
          <q-btn
            class="q-ml-sm"
            label="Import"
            no-caps
            dense
            flat
            :disable="selected.length === 0 || isLoading"
            @click="importTemplates"
          />
          <q-checkbox
            class="q-ml-sm"
            dense
            label="Overwrite if name conflicts"
            v-model="overwrite"
          />
          <q-space />
          <q-input
            v-model="search"
            style="width: 300px"
            label="Search"
            dense
            outlined
            clearable
            class="q-pr-md q-pb-xs"
          >
            <template #prepend>
              <q-icon name="search" color="primary" />
            </template>
          </q-input>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, onMounted } from "vue";
import { until } from "@vueuse/shared";
import { useQuasar, useDialogPluginComponent, type QTableColumn } from "quasar";
import { useSharedReportTemplates } from "../api/reporting";
import { truncateText } from "@/utils/format";

const columns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "url",
    label: "Download Url",
    field: "url",
    align: "left",
    sortable: true,
    format: (val) => truncateText(val, 90),
  },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

// shared templates import logic
const {
  isLoading,
  isError,
  sharedTemplates,
  importSharedTemplates,
  getSharedTemplates,
} = useSharedReportTemplates;

const search = ref("");
const selected = ref([]);
const overwrite = ref(false);

async function importTemplates() {
  importSharedTemplates({
    templates: selected.value,
    overwrite: overwrite.value,
  });

  // stops the dialog from closing when there is an error
  await until(isLoading).not.toBeTruthy();
  if (isError.value) return;

  selected.value = [];
}

onMounted(getSharedTemplates);
</script>
