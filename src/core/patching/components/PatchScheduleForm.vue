<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        {{ schedule ? "Edit" : "Add" }} Patch Schedule
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section>
        <!-- start time input -->
        <q-input
          v-model="schedule.name"
          class="q-pa-sm"
          dense
          label="Name"
          filled
          :rules="[(val) => !!val || '*Required']"
        />
      </q-card-section>

      <q-card-section>
        <q-option-group
          v-model="schedule.task_type"
          class="q-pa-sm"
          label="Task run type"
          :options="taskTypeOptions"
          dense
          inline
        />
      </q-card-section>

      <!-- task start/expire time fields -->
      <q-card-section>
        <!-- start time input -->
        <q-input
          class="q-pa-sm"
          type="time"
          dense
          label="Hour:Minute"
          stack-label
          filled
          v-model="schedule.run_time_date"
          hint="Agent timezone will be used."
          :rules="[(val) => !!val || '*Required']"
        />
      </q-card-section>

      <!-- weekly options -->
      <q-card-section v-if="schedule.task_type === 'weekly'">
        <!-- day of week input -->
        Run on Days:
        <q-option-group
          :rules="[(val: number[]) => val.length > 0 || '*Required']"
          inline
          dense
          :options="dayOfWeekOptions"
          type="checkbox"
          v-model="schedule.run_time_bit_weekdays"
        />
      </q-card-section>

      <!-- monthly options -->
      <q-card-section v-if="schedule.task_type === 'monthly'" class="row">
        <!-- type of monthly schedule -->
        <q-option-group
          class="col-12 q-pa-sm"
          v-model="schedule.monthly_type"
          inline
          :options="[
            { label: 'On Days', value: 'days' },
            { label: 'On Weeks', value: 'weeks' },
          ]"
        />

        <!-- month select input -->
        <q-select
          :rules="[(val) => val.length > 0 || '*Required']"
          class="col-4 q-pa-sm"
          filled
          dense
          options-dense
          v-model="schedule.monthly_months_of_year"
          :options="monthOptions"
          label="Run on Months"
          multiple
          emit-value
          map-options
        >
          <template v-slot:before-options>
            <q-item>
              <q-item-section>
                <q-item-label>All months</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  v-model="allMonthsCheckbox"
                  @update:model-value="toggleMonths"
                />
              </q-item-section>
            </q-item>
          </template>

          <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
            <q-item v-bind="itemProps">
              <q-item-section>
                <q-item-label v-html="opt.label" />
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  :model-value="selected"
                  @update:model-value="
                    toggleOption(opt);
                    allMonthsCheckbox = false;
                  "
                />
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- days of month select input -->
        <q-select
          v-if="schedule.monthly_type === 'days'"
          :rules="[(val) => val.length > 0 || '*Required']"
          class="col-4 q-pa-sm"
          filled
          dense
          options-dense
          v-model="schedule.monthly_days_of_month"
          :options="dayOfMonthOptions"
          label="Run on Days"
          multiple
          emit-value
          map-options
        >
          <template v-slot:before-options>
            <q-item>
              <q-item-section>
                <q-item-label>All days</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  v-model="allMonthDaysCheckbox"
                  @update:model-value="toggleMonthDays"
                />
              </q-item-section>
            </q-item>
          </template>

          <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
            <q-item v-bind="itemProps">
              <q-item-section>
                <q-item-label v-html="opt.label" />
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  :model-value="selected"
                  @update:model-value="
                    toggleOption(opt);
                    allMonthDaysCheckbox = false;
                  "
                />
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <div v-if="schedule.monthly_type === 'days'" class="col-4"></div>

        <!-- week of month select input -->
        <q-select
          v-if="schedule.monthly_type === 'weeks'"
          :rules="[(val) => val.length > 0 || '*Required']"
          class="col-4 q-pa-sm"
          filled
          dense
          options-dense
          v-model="schedule.monthly_weeks_of_month"
          :options="weekOptions"
          label="Run on weeks"
          multiple
          emit-value
          map-options
        >
          <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
            <q-item v-bind="itemProps">
              <q-item-section>
                <q-item-label v-html="opt.label" />
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  :model-value="selected"
                  @update:model-value="toggleOption(opt)"
                />
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- day of week select input -->
        <q-select
          v-if="schedule.monthly_type === 'weeks'"
          :rules="[(val) => val.length > 0 || '*Required']"
          class="col-4 q-pa-sm"
          filled
          dense
          options-dense
          v-model="schedule.run_time_bit_weekdays"
          :options="dayOfWeekOptions"
          label="Run on days"
          multiple
          emit-value
          map-options
        >
          <template v-slot:before-options>
            <q-item>
              <q-item-section>
                <q-item-label>All days</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  v-model="allWeekDaysCheckbox"
                  @update:model-value="toggleWeekDays"
                />
              </q-item-section>
            </q-item>
          </template>

          <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
            <q-item v-bind="itemProps">
              <q-item-section>
                <q-item-label v-html="opt.label" />
              </q-item-section>
              <q-item-section side>
                <q-checkbox
                  dense
                  :model-value="selected"
                  @update:model-value="
                    toggleOption(opt);
                    allWeekDaysCheckbox = false;
                  "
                />
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn dense flat label="Cancel" v-close-popup />
        <q-btn
          :loading="loading"
          dense
          flat
          label="Save"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from "vue";
import { useDialogPluginComponent, date } from "quasar";

import { usePatchScheduleShared } from "../api";

import type { PatchSchedule } from "../types";

// static data
const taskTypeOptions = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const dayOfWeekOptions = [
  { label: "Monday", value: 0x2 },
  { label: "Tuesday", value: 0x4 },
  { label: "Wednesday", value: 0x8 },
  { label: "Thursday", value: 0x10 },
  { label: "Friday", value: 0x20 },
  { label: "Saturday", value: 0x40 },
  { label: "Sunday", value: 0x1 },
];

const dayOfMonthOptions = (() => {
  let result = [];
  let day = 0x1;
  for (let i = 1; i <= 31; i++) {
    result.push({ label: `${i}`, value: day });
    day = day << 1;
  }
  result.push({ label: "Last Day", value: 0x80000000 });
  return result;
})();

const monthOptions = [
  { label: "January", value: 0x1 },
  { label: "February", value: 0x2 },
  { label: "March", value: 0x4 },
  { label: "April", value: 0x8 },
  { label: "May", value: 0x10 },
  { label: "June", value: 0x20 },
  { label: "July", value: 0x40 },
  { label: "August", value: 0x80 },
  { label: "September", value: 0x100 },
  { label: "October", value: 0x200 },
  { label: "November", value: 0x400 },
  { label: "December", value: 0x800 },
];

const weekOptions = [
  { label: "First Week", value: 0x1 },
  { label: "Second Week", value: 0x2 },
  { label: "Third Week", value: 0x4 },
  { label: "Fourth Week", value: 0x8 },
  { label: "Last Week", value: 0x10 },
];

const props = defineProps<{
  patchSchedule?: PatchSchedule;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits([...useDialogPluginComponent.emits]);

const { addPatchSchedule, editPatchSchedule } = usePatchScheduleShared;

const schedule = reactive<PatchSchedule>(
  props.patchSchedule
    ? Object.assign({}, props.patchSchedule)
    : {
        id: 0,
        name: "",
        run_time_date: date.formatDate(Date.now(), "HH:mm"),
        run_time_bit_weekdays: [] as number[],
        monthly_months_of_year: [] as number[],
        monthly_days_of_month: [] as number[],
        monthly_weeks_of_month: [] as number[],
        task_type: "weekly",
        monthly_type: "days",
      },
);

const loading = ref(false);

// if all months is selected or cleared it will either clear the monthly_months_of_year array or add all options to it.
const allMonthsCheckbox = ref(false);
function toggleMonths() {
  schedule.monthly_months_of_year = allMonthsCheckbox.value
    ? monthOptions.map((month) => month.value)
    : [];
}

const allMonthDaysCheckbox = ref(false);
function toggleMonthDays() {
  schedule.monthly_days_of_month = allMonthDaysCheckbox.value
    ? dayOfMonthOptions.map((day) => day.value)
    : [];
}

const allWeekDaysCheckbox = ref(false);
function toggleWeekDays() {
  schedule.run_time_bit_weekdays = allWeekDaysCheckbox.value
    ? dayOfWeekOptions.map((day) => day.value)
    : [];
}

function submit() {
  loading.value = true;
  try {
    props.patchSchedule
      ? editPatchSchedule(props.patchSchedule.id, schedule)
      : addPatchSchedule(schedule);
    onDialogOK();
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
}

watch(
  () => schedule.task_type,
  () => {
    schedule.run_time_bit_weekdays = [];
    schedule.monthly_months_of_year = [];
    schedule.monthly_days_of_month = [];
    schedule.monthly_weeks_of_month = [];
  },
);
</script>
