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
          @click="getReportSchedules"
        />{{ $t("reporting.reportScheduleTable.title") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            $t("common.close")
          }}</q-tooltip>
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
            :label="$t('reporting.new')"
            no-caps
            dense
            flat
            @click="openNewScheduleForm"
          />
          <q-space />
          <q-input
            v-model="search"
            style="width: 300px"
            :label="$t('common.search')"
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
                <q-item v-close-popup clickable @click="runSchedule(props.row)">
                  <q-item-section>{{
                    $t("reporting.reportScheduleTable.runScheduledReport")
                  }}</q-item-section>
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  @click="openEditSchedule(props.row)"
                >
                  <q-item-section>{{ $t("common.edit") }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="openCloneSchedule(props.row)"
                >
                  <q-item-section>{{ $t("reporting.clone") }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteSchedule(props.row)"
                >
                  <q-item-section>{{ $t("common.delete") }}</q-item-section>
                </q-item>

                <q-separator />
                <q-item v-close-popup clickable>
                  <q-item-section>{{ $t("common.close") }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>

            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.value }}
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
import { useI18n } from "vue-i18n";
import { formatDate, capitalize } from "@/utils/format";
import { useSharedReportSchedules } from "../api/reporting";
import ReportScheduleForm from "./ReportScheduleForm.vue";
import type { ReportSchedule } from "../types/reporting";

const { t } = useI18n();

const columns: QTableColumn[] = [
  {
    name: "name",
    label: t("common.name"),
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "enabled",
    label: t("common.enabled"),
    field: "enabled",
    align: "left",
    sortable: true,
    format: (val: boolean) => (val ? t("common.yes") : t("common.no")),
  },
  {
    name: "report_template_name",
    label: t("reporting.reportHistoryTable.template"),
    field: "report_template_name",
    align: "left",
    sortable: true,
  },
  {
    name: "format",
    label: t("reporting.reportScheduleForm.format"),
    field: "format",
    align: "left",
    sortable: true,
    format: (val: string) => capitalize(val),
  },
  {
    name: "schedule_name",
    label: t("reporting.reportScheduleForm.schedule"),
    field: "schedule_name",
    align: "left",
    sortable: true,
  },
  {
    name: "email_recipients",
    label: t("reporting.reportScheduleTable.recipients"),
    field: "email_recipients",
    align: "left",
    sortable: false,
    format: (val: string[]) => val.join(", "),
  },
  {
    name: "send_report_email",
    label: t("reporting.reportScheduleTable.sendEmail"),
    field: "send_report_email",
    align: "center",
    sortable: true,
    format: (val: boolean) => (val ? t("common.yes") : t("common.no")),
  },
  {
    name: "last_run",
    label: t("reporting.reportScheduleTable.lastRun"),
    field: "last_run",
    align: "center",
    sortable: true,
    format: (val: string) =>
      val ? formatDate(val) : t("reporting.reportScheduleTable.never"),
  },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

const {
  reportSchedules,
  isLoading,
  getReportSchedules,
  runReportSchedule,
  deleteReportSchedule,
} = useSharedReportSchedules;

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

function openCloneSchedule(schedule: ReportSchedule) {
  $q.dialog({
    component: ReportScheduleForm,
    componentProps: {
      schedule: {
        ...schedule,
        name: t("reporting.reportScheduleTable.copyName", {
          name: schedule.name,
        }),
      },
      clone: true,
    },
  });
}

function runSchedule(schedule: ReportSchedule) {
  runReportSchedule(schedule.id);
}

function deleteSchedule(schedule: ReportSchedule) {
  $q.dialog({
    title: t("reporting.reportScheduleTable.deleteTitle", {
      name: schedule.name,
    }),
    message: t("reporting.cannotBeUndone"),
    cancel: true,
    color: "primary",
    ok: { label: t("common.delete"), color: "negative" },
  }).onOk(() => {
    deleteReportSchedule(schedule.id);
  });
}

onMounted(getReportSchedules);
</script>
