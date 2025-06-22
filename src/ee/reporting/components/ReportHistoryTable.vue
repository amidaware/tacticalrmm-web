<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide">
    <q-card>
      <q-bar>
        <q-btn
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
          @click="getReportHistory"
        />Report History
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
        :style="{ 'max-height': `${$q.screen.height - 24}px` }"
        class="tbl-sticky"
        :rows="reportHistory"
        :columns="columns"
        :loading="isLoading"
        :pagination="{
          rowsPerPage: 0,
          sortBy: 'date_created',
          descending: true,
        }"
        :filter="search"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #top>
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

        <template #header-cell-report_template_name>
          <q-th auto-width></q-th>
        </template>

        <template #body="props">
          <q-tr :props="props" class="cursor-pointer">
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  v-close-popup
                  clickable
                  :disabled="props.row.error_data"
                  @click="openReportHistory(props.row.id, 'pdf')"
                >
                  <q-item-section side>
                    <q-icon name="mdi-file-pdf-box" />
                  </q-item-section>
                  <q-item-section>Open PDF Report</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  :disabled="props.row.error_data"
                  @click="
                    openReportHistory(
                      props.row.id,
                      props.row.report_template_type !== 'plaintext'
                        ? 'html'
                        : 'plaintext',
                    )
                  "
                >
                  <q-item-section side>
                    <q-icon
                      :name="
                        props.row.report_template_type !== 'plaintext'
                          ? 'code'
                          : 'description'
                      "
                    />
                  </q-item-section>
                  <q-item-section
                    >Open
                    {{
                      props.row.report_template_type !== "plaintext"
                        ? "HTML"
                        : "Text"
                    }}
                    Report</q-item-section
                  >
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  :disabled="props.row.error_data"
                  @click="
                    downloadReportHistory(
                      props.row.id,
                      props.row.report_template_name,
                      'pdf',
                    )
                  "
                >
                  <q-item-section side>
                    <q-icon name="mdi-download" />
                  </q-item-section>
                  <q-item-section>Download PDF Report</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  :disabled="props.row.error_data"
                  @click="
                    downloadReportHistory(
                      props.row.id,
                      props.row.report_template_name,
                      props.row.report_template_type !== 'plaintext'
                        ? 'html'
                        : 'plaintext',
                    )
                  "
                >
                  <q-item-section side>
                    <q-icon name="mdi-download" />
                  </q-item-section>
                  <q-item-section
                    >Download
                    {{
                      props.row.report_template_type !== "plaintext"
                        ? "HTML"
                        : "Text"
                    }}
                    Report</q-item-section
                  >
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteHistory(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>Delete</q-item-section>
                </q-item>

                <q-separator />
                <q-item v-close-popup clickable>
                  <q-item-section>Close</q-item-section>
                </q-item>
              </q-list>
            </q-menu>

            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'error_data'">
                <q-icon
                  v-if="props.row.error_data"
                  class="cursor-pointer"
                  name="warning"
                  color="negative"
                  size="sm"
                  @click="openErrorMessage(props.row.error_data)"
                ></q-icon>
              </template>

              <template v-else>
                {{ col.value }}
              </template>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useQuasar, useDialogPluginComponent, type QTableColumn } from "quasar";
import { formatDate, capitalize } from "@/utils/format";
import { useSharedReportHistory } from "../api/reporting";
import type { ReportHistory } from "../types/reporting";

const columns: QTableColumn[] = [
  {
    name: "report_template_name",
    label: "Template",
    field: "report_template_name",
    align: "left",
    sortable: true,
  },
  {
    name: "error_data",
    label: "",
    field: "error_data",
    align: "left",
    sortable: true,
  },
  {
    name: "report_template_type",
    label: "Template Type",
    field: "report_template_type",
    align: "left",
    sortable: true,
    format: (val: string) => capitalize(val),
  },
  {
    name: "date_created",
    label: "Date Created",
    field: "date_created",
    align: "left",
    sortable: true,
    format: (val: string) => formatDate(val),
  },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

const {
  reportHistory,
  isLoading,
  getReportHistory,
  deleteReportHistory,
  openReportHistory,
  downloadReportHistory,
} = useSharedReportHistory;

const search = ref("");

// Confirm and delete
function deleteHistory(entry: ReportHistory) {
  $q.dialog({
    title: `Delete History for ${entry.report_template_name}?`,
    message: "This will remove the history entry permanently.",
    color: "primary",
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(() => {
    deleteReportHistory(entry.id);
  });
}

function openErrorMessage(msg: string) {
  $q.dialog({
    message: msg,
    color: "primary",
  });
}
onMounted(getReportHistory);
</script>
