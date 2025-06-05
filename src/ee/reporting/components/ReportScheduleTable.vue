<!-- src/components/reportSchedule/ReportScheduleTable.vue -->
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
          @click="getReportSchedules"
        />Report Schedules
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
        :rows="reportSchedules"
        :columns="columns"
        :loading="isLoading"
        :pagination="{
          rowsPerPage: 0,
          sortBy: 'report_template',
          descending: false,
        }"
        :filter="search"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #top>
          <q-btn
            class="q-ml-sm"
            icon="add"
            label="New"
            no-caps
            dense
            flat
            @click="openNewScheduleForm"
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

        <template #body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            @dblclick="openEditSchedule(props.row)"
          >
            <!-- Context Menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  v-close-popup
                  clickable
                  @click="openEditSchedule(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteSchedule(props.row)"
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

            <td>{{ props.row.name }}</td>
            <td>{{ props.row.enabled }}</td>
            <td>{{ props.row.report_template_name }}</td>
            <td>{{ props.row.format }}</td>
            <td>{{ props.row.schedule_name }}</td>
            <td>{{ props.row.email_recipients }}</td>
            <td>{{ props.row.no_email }}</td>
            <td>{{ props.row.last_run }}</td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useQuasar, useDialogPluginComponent, type QTableColumn } from "quasar";
import { formatDate } from "@/utils/format";
import { useSharedReportSchedules } from "../api/reporting";
import ReportScheduleForm from "./ReportScheduleForm.vue";
import type { ReportSchedule } from "../types/reporting";

const columns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "enabled",
    label: "Enabled",
    field: "enabled",
    align: "left",
    sortable: true,
    format: (row: ReportSchedule) => (row.enabled ? "Yes" : "No"),
  },
  {
    name: "report_template_name",
    label: "Template",
    field: "report_template_name",
    align: "left",
    sortable: true,
  },
  {
    name: "format",
    label: "Format",
    field: "format",
    align: "left",
    sortable: true,
    format: (row: ReportSchedule) => row.format.toUpperCase(),
  },
  {
    name: "schedule_name",
    label: "Schedule",
    field: "schedule_name",
    align: "left",
    sortable: true,
  },
  {
    name: "email_recipients",
    label: "Recipients",
    field: "email_recipients",
    align: "left",
    sortable: false,
    format: (row: ReportSchedule) => row.email_recipients.join(", "),
  },
  {
    name: "no_email",
    label: "Don't Email",
    field: "no_email",
    align: "center",
    sortable: true,
    format: (row: ReportSchedule) => (row.no_email ? "Yes" : "No"),
  },
  {
    name: "last_run",
    label: "Last Run",
    field: "last_run",
    align: "center",
    sortable: true,
    format: (row: ReportSchedule) =>
      row.last_run ? formatDate(row.last_run) : "Never",
  },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

const { reportSchedules, isLoading, getReportSchedules, deleteReportSchedule } =
  useSharedReportSchedules;

const search = ref("");

function openNewScheduleForm() {
  $q.dialog({
    component: ReportScheduleForm,
  });
}

function openEditSchedule(schedule: ReportSchedule) {
  $q.dialog({
    component: ReportScheduleForm,
    componentProps: { schedule },
  });
}

function deleteSchedule(schedule: ReportSchedule) {
  $q.dialog({
    title: `Delete Schedule: ${schedule.id}?`,
    message: "This action cannot be undone.",
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(() => {
    deleteReportSchedule(schedule.id);
  });
}

onMounted(getReportSchedules);
</script>
