<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">{{ $gettext("Schedules") }}</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        :label="$gettext('Add Schedule')"
        @click="openAddScheduleForm"
      />
    </div>
    <q-separator />

    <tactical-table
      :rows="schedules"
      :columns="columns"
      row-key="id"
      binary-state-sort
      virtual-scroll
      :rows-per-page-options="[0]"
      :loading="isLoading"
      column-select
      dense
      storage-key="schedule-table"
    >
      <template #body="{ row, cols }">
        <q-tr class="cursor-pointer" @dblclick="openEditScheduleForm(row)">
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item
                clickable
                v-close-popup
                @click="openEditScheduleForm(row)"
              >
                <q-item-section>
                  <q-item-label>{{
                    $pgettext("Settings actions", "Edit")
                  }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="removeSchedule(row)">
                <q-item-section>
                  <q-item-label>{{ $gettext("Delete") }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup>
                <q-item-section>
                  <q-item-label>{{ $gettext("Close") }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>

          <q-td v-for="col in cols" :key="col.id">
            {{ col.value }}
          </q-td>
        </q-tr>
      </template>
    </tactical-table>
  </div>
</template>

<script lang="ts" setup>
import { gettext } from "@/gettext";
import { computed, onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { useScheduleShared } from "../api";
import type { Schedule } from "../types";

// ui imports
import ScheduleForm from "./ScheduleForm.vue";
import TacticalTable from "src/core/dashboard/ui/TacticalTable.vue";
import { until } from "@vueuse/shared";
import { capitalize } from "@/utils/format";

const months = computed(() => [
  gettext.$gettext("Jan"),
  gettext.$gettext("Feb"),
  gettext.$gettext("Mar"),
  gettext.$gettext("Apr"),
  gettext.$gettext("May"),
  gettext.$gettext("Jun"),
  gettext.$gettext("Jul"),
  gettext.$gettext("Aug"),
  gettext.$gettext("Sep"),
  gettext.$gettext("Oct"),
  gettext.$gettext("Nov"),
  gettext.$gettext("Dec"),
]);

const weekDays = computed(() => [
  gettext.$gettext("Sun"),
  gettext.$gettext("Mon"),
  gettext.$gettext("Tue"),
  gettext.$gettext("Wed"),
  gettext.$gettext("Thu"),
  gettext.$gettext("Fri"),
  gettext.$gettext("Sat"),
]);

function getAbbrevMonth(n: number) {
  return months.value[n - 1];
}

function getAbbrevWeekday(n: number) {
  return weekDays.value[n];
}

const columns = computed<QTableColumn[]>(() => [
  {
    name: "name",
    label: gettext.$pgettext("Settings actions", "Name"),
    align: "left",
    field: "name",
    sortable: true,
    required: true,
  },
  {
    name: "schedule_type",
    label: gettext.$gettext("Schedule Type"),
    align: "left",
    field: "schedule_type",
    sortable: true,
    format: (val: string) => capitalize(val),
  },
  {
    name: "run_time",
    label: gettext.$pgettext("Scheduled start time", "Run Time"),
    align: "left",
    field: "run_time",
    sortable: true,
    format: (val: string) => {
      const parts = val.split(":");
      return `${parts[0]}:${parts[1]}`;
    },
  },
  {
    name: "run_time_weekdays",
    label: gettext.$gettext("Weekdays"),
    align: "left",
    field: "run_time_weekdays",
    format: (val: number[]) => {
      if (val.length === 7) return gettext.$gettext("Every Weekday");
      else return val.map((weekday) => getAbbrevWeekday(weekday)).join(", ");
    },
  },
  {
    name: "monthly_months_of_year",
    label: gettext.$gettext("Months"),
    align: "left",
    field: "monthly_months_of_year",
    format: (val: number[]) => {
      if (val.length === 12) return gettext.$gettext("Every Month");
      else {
        return val.map((month) => getAbbrevMonth(month)).join(", ");
      }
    },
  },
  {
    name: "monthly_days_of_month",
    label: gettext.$gettext("Days of Month"),
    align: "left",
    field: "monthly_days_of_month",
    format: (val: number[]) => {
      if (val.length >= 31) return gettext.$gettext("Every Day");
      else
        return val
          .map((day) => (day !== 32 ? day : gettext.$gettext("Last")))
          .join(", ");
    },
  },
  {
    name: "monthly_weeks_of_month",
    label: gettext.$gettext("Weeks of Month"),
    align: "left",
    field: "monthly_weeks_of_month",
    format: (val: number[]) => {
      if (val.length === 5) return gettext.$gettext("Every week");
      return val
        .map((week) => {
          if (week === 1) {
            return gettext.$gettext("1st");
          } else if (week === 2) {
            return gettext.$gettext("2nd");
          } else if (week === 3) {
            return gettext.$gettext("3rd");
          } else if (week === 4) {
            return gettext.$gettext("4th");
          } else if (week === 5) {
            return gettext.$gettext("Last");
          }
        })
        .join(", ");
    },
  },
]);

const $q = useQuasar();

const { schedules, getSchedules, deleteSchedule, isLoading, isError } =
  useScheduleShared;

function openEditScheduleForm(schedule: Schedule) {
  $q.dialog({
    component: ScheduleForm,
    componentProps: {
      schedule,
    },
  });
}

function openAddScheduleForm() {
  $q.dialog({
    component: ScheduleForm,
  });
}

function removeSchedule(schedule: Schedule) {
  $q.dialog({
    color: "primary",
    message: gettext.$gettext(
      "Are you sure you want to delete schedule: %{name}?",
      { name: schedule.name },
    ),
    ok: {
      color: "negative",
    },
    cancel: true,
  }).onOk(async () => {
    deleteSchedule(schedule.id);
    await until(isLoading).not.toBeTruthy();
    if (isError.value) return;
  });
}

onMounted(getSchedules);
</script>
