<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">{{ $t("settings.schedules.title") }}</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        :label="$t('settings.schedules.add')"
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
                  <q-item-label>{{ $t("common.edit") }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="removeSchedule(row)">
                <q-item-section>
                  <q-item-label>{{ $t("common.delete") }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup>
                <q-item-section>
                  <q-item-label>{{ $t("common.close") }}</q-item-label>
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
import { onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { useScheduleShared } from "../api";
import type { Schedule } from "../types";

// ui imports
import ScheduleForm from "./ScheduleForm.vue";
import TacticalTable from "src/core/dashboard/ui/TacticalTable.vue";
import { until } from "@vueuse/shared";
import { capitalize } from "@/utils/format";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const months = [
  t("settings.schedules.monthsShort.jan"),
  t("settings.schedules.monthsShort.feb"),
  t("settings.schedules.monthsShort.mar"),
  t("settings.schedules.monthsShort.apr"),
  t("settings.schedules.monthsShort.may"),
  t("settings.schedules.monthsShort.jun"),
  t("settings.schedules.monthsShort.jul"),
  t("settings.schedules.monthsShort.aug"),
  t("settings.schedules.monthsShort.sep"),
  t("settings.schedules.monthsShort.oct"),
  t("settings.schedules.monthsShort.nov"),
  t("settings.schedules.monthsShort.dec"),
];

const weekDays = [
  t("settings.schedules.weekdaysShort.sun"),
  t("settings.schedules.weekdaysShort.mon"),
  t("settings.schedules.weekdaysShort.tue"),
  t("settings.schedules.weekdaysShort.wed"),
  t("settings.schedules.weekdaysShort.thu"),
  t("settings.schedules.weekdaysShort.fri"),
  t("settings.schedules.weekdaysShort.sat"),
];

const scheduleTypeLabels: Record<string, string> = {
  daily: t("settings.schedules.types.daily"),
  weekly: t("settings.schedules.types.weekly"),
  monthly: t("settings.schedules.types.monthly"),
};

function getAbbrevMonth(n: number) {
  return months[n - 1];
}

function getAbbrevWeekday(n: number) {
  return weekDays[n];
}

const columns: QTableColumn[] = [
  {
    name: "name",
    label: t("common.name"),
    align: "left",
    field: "name",
    sortable: true,
    required: true,
  },
  {
    name: "schedule_type",
    label: t("settings.schedules.columns.scheduleType"),
    align: "left",
    field: "schedule_type",
    sortable: true,
    format: (val: string) => scheduleTypeLabels[val] ?? capitalize(val),
  },
  {
    name: "run_time",
    label: t("settings.schedules.columns.runTime"),
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
    label: t("settings.schedules.columns.weekdays"),
    align: "left",
    field: "run_time_weekdays",
    format: (val: number[]) => {
      if (val.length === 7) return t("settings.schedules.everyWeekday");
      else return val.map((weekday) => getAbbrevWeekday(weekday)).join(", ");
    },
  },
  {
    name: "monthly_months_of_year",
    label: t("settings.schedules.columns.months"),
    align: "left",
    field: "monthly_months_of_year",
    format: (val: number[]) => {
      if (val.length === 12) return t("settings.schedules.everyMonth");
      else {
        return val.map((month) => getAbbrevMonth(month)).join(", ");
      }
    },
  },
  {
    name: "monthly_days_of_month",
    label: t("settings.schedules.columns.daysOfMonth"),
    align: "left",
    field: "monthly_days_of_month",
    format: (val: number[]) => {
      if (val.length >= 31) return t("settings.schedules.everyDay");
      else
        return val
          .map((day) =>
            day !== 32 ? day : t("settings.schedules.lastDayShort"),
          )
          .join(", ");
    },
  },
  {
    name: "monthly_weeks_of_month",
    label: t("settings.schedules.columns.weeksOfMonth"),
    align: "left",
    field: "monthly_weeks_of_month",
    format: (val: number[]) => {
      if (val.length === 5) return t("settings.schedules.everyWeek");
      return val
        .map((week) => {
          if (week === 1) {
            return t("settings.schedules.weekOrdinals.first");
          } else if (week === 2) {
            return t("settings.schedules.weekOrdinals.second");
          } else if (week === 3) {
            return t("settings.schedules.weekOrdinals.third");
          } else if (week === 4) {
            return t("settings.schedules.weekOrdinals.fourth");
          } else if (week === 5) {
            return t("settings.schedules.weekOrdinals.last");
          }
        })
        .join(", ");
    },
  },
];

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
    message: t("settings.schedules.deleteConfirm", { name: schedule.name }),
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
