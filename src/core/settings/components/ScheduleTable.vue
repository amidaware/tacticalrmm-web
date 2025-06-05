<template>
  <div class="text-h6">Schedules</div>
  <q-card>
    <tactical-table
      :rows="schedules"
      :columns="columns"
      row-key="id"
      binary-state-sort
      virtual-scroll
      :rows-per-page-options="[0]"
      :loading="isLoading"
      column-select
      selection="single"
      v-model:selected="selected"
      storage-key="schedule-table"
    >
      <template v-slot:top>
        <div class="q-gutter-sm">
          <q-btn
            label="Add Schedule"
            no-caps
            flat
            @click="openAddScheduleForm"
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
                  selected.length > 0 && openEditScheduleForm(selected[0])
                "
              >
                <q-item-section>
                  <q-item-label>Edit</q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                clickable
                v-close-popup
                @click="selected.length > 0 && removeSchedule(selected[0])"
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
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useScheduleShared } from "../api";
import type { Schedule } from "../types";

// ui imports
import ScheduleForm from "./ScheduleForm.vue";
import TacticalTable from "@/components/ui/TacticalTable.vue";
import { until } from "@vueuse/shared";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getAbbrevMonth(n: number) {
  return months[n - 1];
}

function getAbbrevWeekday(n: number) {
  return weekDays[n];
}

const columns = [
  {
    name: "name",
    label: "Name",
    align: "left",
    field: "name",
    sortable: true,
    required: true,
  },
  {
    name: "run_time",
    label: "Run Time",
    align: "left",
    field: "run_time",
    sortable: true,
  },
  {
    name: "run_time_weekdays",
    label: "Weekdays",
    align: "left",
    field: "run_time_weekdays",
    format: (val: number[]) => {
      if (val.length === 7) return "Every Weekday";
      else return val.map((weekday) => getAbbrevWeekday(weekday)).join(", ");
    },
  },
  {
    name: "monthly_months_of_year",
    label: "Months",
    align: "left",
    field: "monthly_months_of_year",
    format: (val: number[]) => {
      if (val.length === 12) return "Every Month";
      else {
        return val.map((month) => getAbbrevMonth(month)).join(", ");
      }
    },
  },
  {
    name: "monthly_days_of_month",
    label: "Days of Month",
    align: "left",
    field: "monthly_days_of_month",
    format: (val: number[]) => {
      if (val.length >= 31) return "Every Day";
      else return val.map((day) => (day !== 32 ? day : "Last")).join(", ");
    },
  },
  {
    name: "monthly_weeks_of_month",
    label: "Weeks of Month",
    align: "left",
    field: "monthly_weeks_of_month",
    format: (val: number[]) => {
      if (val.length === 5) return "Every week";
      return val
        .map((week) => {
          if (week === 1) {
            return "1st";
          } else if (week === 2) {
            return "2nd";
          } else if (week === 3) {
            return "3rd";
          } else if (week === 4) {
            return "4th";
          } else if (week === 5) {
            return "Last";
          }
        })
        .join(", ");
    },
  },
];

const $q = useQuasar();

const { schedules, getSchedules, deleteSchedule, isLoading, isError } =
  useScheduleShared;

const selected = ref<Schedule[]>([]);

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
    message: `Are you sure you want to delete schedule: ${schedule.name}?`,
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
