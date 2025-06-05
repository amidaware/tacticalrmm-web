<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        {{ localSchedule.id ? "Edit" : "Add" }} Report Schedule
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localSchedule.name"
          label="Name"
          dense
          filled
          :rules="[(val: string) => !!val || '*Required']"
          class="q-mb-md"
        />

        <q-toggle
          v-model="localSchedule.enabled"
          label="Enabled"
          class="q-mb-md"
          dense
          dense-toggle
        />

        <q-select
          v-model="localSchedule.report_template"
          :options="reportTemplateOptions"
          label="Report Template"
          dense
          filled
          map-options
          emit-value
          :rules="[(val: number) => !!val || '*Required']"
          class="q-mb-md"
        />

        <q-option-group
          v-model="localSchedule.format"
          :options="formatOptions"
          label="Format"
          inline
          dense
          class="q-mb-md"
          :rules="[(val: number) => !!val || '*Required']"
        />

        <q-select
          v-model="localSchedule.schedule"
          :options="scheduleOptions"
          option-label="label"
          option-value="value"
          label="Schedule"
          map-options
          emit-value
          dense
          filled
          :rules="[(val) => !!val || '*Required']"
          class="q-mb-md"
        />

        <q-select
          v-model="localSchedule.email_recipients"
          use-input
          multiple
          hide-dropdown-icon
          new-value-mode="add"
          label="Email Recipients"
          dense
          filled
          use-chips
          class="q-mb-md"
          hint="Press enter after typing an address"
        />

        <q-checkbox
          v-model="localSchedule.no_email"
          label="Do not send any emails"
          dense
          class="q-mb-md"
        />

        <div class="row justify-end q-pa-sm">
          <q-btn flat label="Cancel" v-close-popup dense />
          <q-btn
            flat
            label="Save"
            color="primary"
            type="submit"
            :loading="isLoading"
            class="q-ml-sm"
            @click="submit"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { reactive } from "vue";
import { useDialogPluginComponent } from "quasar";
import { until } from "@vueuse/shared";
import { useSharedReportSchedules } from "../api/reporting";
import { useReportTemplateDropdown } from "../composables";
import { useScheduleDropdown } from "@/core/settings/composables";
import type { ReportSchedule, ReportFormat } from "../types/reporting";

const props = defineProps<{
  schedule?: ReportSchedule;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits(useDialogPluginComponent.emits);

const { addReportSchedule, editReportSchedule, isLoading, isError } =
  useSharedReportSchedules;

const { reportTemplateOptions } = useReportTemplateDropdown();
const { scheduleOptions } = useScheduleDropdown();

const formatOptions: { label: string; value: ReportFormat }[] = [
  { label: "HTML", value: "html" },
  { label: "PDF", value: "pdf" },
];

const localSchedule = reactive<ReportSchedule>(
  props.schedule
    ? { ...props.schedule }
    : {
        id: 0,
        name: "",
        enabled: true,
        report_template: undefined,
        format: "html",
        schedule: undefined,
        email_recipients: [],
        no_email: false,
      },
);

// --- Submit handler ---
async function submit() {
  if (props.schedule) {
    editReportSchedule(props.schedule.id, localSchedule);
  } else {
    addReportSchedule(localSchedule);
  }
  await until(isLoading).not.toBeTruthy();
  if (isError.value) return;

  onDialogOK();
}
</script>
