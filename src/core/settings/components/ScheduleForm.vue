<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        {{ schedule ? "Edit" : "Add" }} Schedule
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-form @submit.prevent="submit">
        <q-card-section>
          <!-- start time input -->
          <q-input
            v-model="localSchedule.name"
            class="q-pa-sm"
            dense
            label="Name"
            filled
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>

        <q-card-section>
          <q-option-group
            v-model="localSchedule.schedule_type"
            class="q-pa-sm"
            label="Task run type"
            :options="taskTypeOptions"
            dense
            inline
          />
        </q-card-section>

        <q-card-section>
          <!-- start time input -->
          <q-input
            class="q-pa-sm"
            type="time"
            dense
            label="Hour:Minute"
            stack-label
            filled
            v-model="localSchedule.run_time"
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>

        <!-- weekly options -->
        <q-card-section v-if="localSchedule.schedule_type === 'weekly'">
          <!-- day of week input -->
          Run on Days:
          <span v-if="dayOfWeekValidationError" class="text-negative"
            >*Required</span
          >
          <q-option-group
            inline
            dense
            :options="dayOfWeekOptions"
            type="checkbox"
            v-model="localSchedule.run_time_weekdays"
          />
        </q-card-section>

        <!-- monthly options -->
        <q-card-section
          v-if="localSchedule.schedule_type === 'monthly'"
          class="row"
        >
          <!-- type of monthly schedule -->
          <q-option-group
            class="col-12 q-pa-sm"
            v-model="localSchedule.monthly_type"
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
            v-model="localSchedule.monthly_months_of_year"
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

            <template
              v-slot:option="{ itemProps, opt, selected, toggleOption }"
            >
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
            v-if="localSchedule.monthly_type === 'days'"
            :rules="[(val) => val.length > 0 || '*Required']"
            class="col-4 q-pa-sm"
            filled
            dense
            options-dense
            v-model="localSchedule.monthly_days_of_month"
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

            <template
              v-slot:option="{ itemProps, opt, selected, toggleOption }"
            >
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

          <div v-if="localSchedule.monthly_type === 'days'" class="col-4"></div>

          <!-- week of month select input -->
          <q-select
            v-if="localSchedule.monthly_type === 'weeks'"
            :rules="[(val) => val.length > 0 || '*Required']"
            class="col-4 q-pa-sm"
            filled
            dense
            options-dense
            v-model="localSchedule.monthly_weeks_of_month"
            :options="weekOptions"
            label="Run on weeks"
            multiple
            emit-value
            map-options
          >
            <template
              v-slot:option="{ itemProps, opt, selected, toggleOption }"
            >
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
            v-if="localSchedule.monthly_type === 'weeks'"
            :rules="[(val) => val.length > 0 || '*Required']"
            class="col-4 q-pa-sm"
            filled
            dense
            options-dense
            v-model="localSchedule.run_time_weekdays"
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

            <template
              v-slot:option="{ itemProps, opt, selected, toggleOption }"
            >
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
            :loading="isLoading"
            dense
            flat
            label="Save"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from "vue";
import { until } from "@vueuse/shared";
import { useDialogPluginComponent, date } from "quasar";

import { useScheduleShared } from "../api";

import type { Schedule } from "../types";

// static data
const taskTypeOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const dayOfWeekOptions = [
  { label: "Monday", value: 0 },
  { label: "Tuesday", value: 1 },
  { label: "Wednesday", value: 2 },
  { label: "Thursday", value: 3 },
  { label: "Friday", value: 4 },
  { label: "Saturday", value: 5 },
  { label: "Sunday", value: 6 },
];

const dayOfMonthOptions = (() => {
  let result = [];
  let day = 1;
  for (let i = 1; i <= 31; i++) {
    result.push({ label: `${i}`, value: day });
    day = day + 1;
  }
  result.push({ label: "Last Day", value: 32 });
  return result;
})();

const monthOptions = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const weekOptions = [
  { label: "First Week", value: 1 },
  { label: "Second Week", value: 2 },
  { label: "Third Week", value: 3 },
  { label: "Fourth Week", value: 4 },
  { label: "Last Week", value: 5 },
];

const props = defineProps<{
  schedule?: Schedule;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits([...useDialogPluginComponent.emits]);

const { addSchedule, editSchedule, isLoading, isError } = useScheduleShared;

const localSchedule = reactive<Schedule>(
  props.schedule
    ? Object.assign({}, props.schedule)
    : {
        id: 0,
        name: "",
        run_time: date.formatDate(Date.now(), "HH:mm"),
        run_time_weekdays: [] as number[],
        monthly_months_of_year: [] as number[],
        monthly_days_of_month: [] as number[],
        monthly_weeks_of_month: [] as number[],
        schedule_type: "daily",
        monthly_type: "days",
      },
);

// if all months is selected or cleared it will either clear the monthly_months_of_year array or add all options to it.
const allMonthsCheckbox = ref(false);
function toggleMonths() {
  localSchedule.monthly_months_of_year = allMonthsCheckbox.value
    ? monthOptions.map((month) => month.value)
    : [];
}

const allMonthDaysCheckbox = ref(false);
function toggleMonthDays() {
  localSchedule.monthly_days_of_month = allMonthDaysCheckbox.value
    ? dayOfMonthOptions.map((day) => day.value)
    : [];
}

const allWeekDaysCheckbox = ref(false);
function toggleWeekDays() {
  localSchedule.run_time_weekdays = allWeekDaysCheckbox.value
    ? dayOfWeekOptions.map((day) => day.value)
    : [];
}

const dayOfWeekValidationError = ref(false);
watch(
  () => localSchedule.run_time_weekdays,
  () => {
    dayOfWeekValidationError.value = false;
  },
);
async function submit() {
  // manually validate option-group since it doesn't have builtin rules
  if (
    localSchedule.schedule_type == "weekly" &&
    localSchedule.run_time_weekdays.length === 0
  ) {
    dayOfWeekValidationError.value = true;
    return;
  }

  props.schedule
    ? editSchedule(props.schedule.id, localSchedule)
    : addSchedule(localSchedule);

  await until(isLoading).not.toBeTruthy();
  if (isError.value) return;

  onDialogOK();
}

watch(
  () => localSchedule.schedule_type,
  () => {
    localSchedule.run_time_weekdays = [];
    localSchedule.monthly_months_of_year = [];
    localSchedule.monthly_days_of_month = [];
    localSchedule.monthly_weeks_of_month = [];
  },
);
</script>
