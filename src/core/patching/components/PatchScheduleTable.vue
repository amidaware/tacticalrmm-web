<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 1250px">
      <q-bar>
        Patch Schedules
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>
      <tactical-table
        :rows="patchSchedules"
        :columns="columns"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
        :loading="isLoading"
        column-select
        filter-header
        selection="multiple"
        v-model:selected="selected"
        storage-key="patch-schedule-table"
      >
        <template v-slot:top>
          <div class="q-gutter-sm">
            <q-btn
              label="Add Schedule"
              no-caps
              flat
              @click="openAddPatchScheduleForm"
            />
            <q-btn-dropdown
              label="Manage Schedule"
              no-caps
              flat
              :disable="selected.length === 0"
            >
              <q-list>
                <q-item
                  clickable
                  v-close-popup
                  @click="
                    selected.length > 0 &&
                      openEditPatchScheduleForm(selected[0])
                  "
                >
                  <q-item-section>
                    <q-item-label>Edit</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-close-popup
                  @click="
                    selected.length > 0 && removePatchSchedule(selected[0])
                  "
                >
                  <q-item-section>
                    <q-item-label>Delete</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>
          <q-space />
        </template>
      </tactical-table>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useDialogPluginComponent } from "quasar";
import { usePatchScheduleShared } from "../api";
import type { PatchSchedule } from "../types";

// ui imports
import PatchScheduleForm from "./PatchScheduleForm.vue";
import TacticalTable from "@/core/dashboard/ui/components/TacticalTable.vue";

const columns = [
  {
    name: "name",
    label: "Name",
    align: "left",
    field: "name",
    sortable: true,
    filterType: "text",
  },
  {
    name: "run_time_date",
    label: "Run Time",
    align: "left",
    field: "run_time_date",
    sortable: true,
    filterType: "date",
  },
  {
    name: "task_type",
    label: "Task Type",
    align: "left",
    field: "task_type",
    sortable: true,
    filterType: "select",
    filterOptions: ["daily", "weekly", "monthly"],
  },
  {
    name: "monthly_type",
    label: "Monthly Type",
    align: "left",
    field: "monthly_type",
    sortable: true,
    filterType: "select",
    filterOptions: ["days", "weeks"],
  },
  {
    name: "run_time_bit_weekdays",
    label: "Weekdays",
    align: "left",
    field: "run_time_bit_weekdays",
    format: (val: number[]) => val.join(", "),
    sortable: false,
    filterType: "text",
  },
  {
    name: "monthly_months_of_year",
    label: "Months",
    align: "left",
    field: "monthly_months_of_year",
    format: (val: number[]) => val.join(", "),
    sortable: false,
    filterType: "text",
  },
  {
    name: "monthly_days_of_month",
    label: "Days of Month",
    align: "left",
    field: "monthly_days_of_month",
    format: (val: number[]) => val.join(", "),
    sortable: false,
    filterType: "text",
  },
  {
    name: "monthly_weeks_of_month",
    label: "Weeks of Month",
    align: "left",
    field: "monthly_weeks_of_month",
    format: (val: number[]) => val.join(", "),
    sortable: false,
    filterType: "text",
  },
];

const $q = useQuasar();
const { dialogRef, onDialogHide } = useDialogPluginComponent();
defineEmits([...useDialogPluginComponent.emits]);

const { patchSchedules, getPatchSchedules, isLoading, deletePatchSchedule } =
  usePatchScheduleShared;

const selected = ref<PatchSchedule[]>([]);

function openEditPatchScheduleForm(schedule: PatchSchedule) {
  $q.dialog({
    component: PatchScheduleForm,
    componentProps: {
      patchSchedule: schedule,
    },
  });
}

function openAddPatchScheduleForm() {
  $q.dialog({
    component: PatchScheduleForm,
  });
}

function removePatchSchedule(schedule: PatchSchedule) {
  deletePatchSchedule(schedule.id);

  // TODO: Add error handling
}

onMounted(getPatchSchedules);
</script>
