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
        />

        <q-toggle
          v-model="localSchedule.enabled"
          label="Enabled"
          dense
          dense-toggle
          class="q-mb-sm"
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
        >
          <template #after v-if="hasDependencies">
            <q-btn
              size="sm"
              :icon="dependenciesNeeded ? 'warning' : undefined"
              :color="dependenciesNeeded ? 'warning' : 'primary'"
              label="Dependencies"
              @click="openDependenciesForm"
            />
          </template>
        </q-select>

        <q-option-group
          v-model="localSchedule.format"
          :options="formatOptions"
          label="Format"
          inline
          dense
          class="q-mb-sm"
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
        />

        <div class="row">
          <div class="col-9">Email recipients</div>
          <div class="col-3">
            <q-btn
              size="sm"
              icon="fas fa-plus"
              color="primary"
              label="Add email"
              @click="toggleAddEmail"
            />
          </div>
          <div class="col-12">
            <q-list dense v-if="localSchedule.email_recipients.length !== 0">
              <q-item
                v-for="email in localSchedule.email_recipients"
                :key="email"
                dense
              >
                <q-item-section>
                  <q-item-label>{{ email }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon
                    class="cursor-pointer"
                    name="delete"
                    color="red"
                    @click="removeEmail(email)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
            <q-list v-else>
              <q-item-section>
                <q-item-label>No recipients</q-item-label>
              </q-item-section>
            </q-list>
          </div>
        </div>

        <q-checkbox
          v-model="localSchedule.no_email"
          label="Do not send any emails"
          dense
        />
      </q-card-section>
      <q-card-actions align="right">
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
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, unref, reactive, computed } from "vue";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { until } from "@vueuse/shared";
import {
  useSharedReportSchedules,
  useSharedReportTemplates,
} from "../api/reporting";
import { useReportTemplateDropdown } from "../composables";
import { useScheduleDropdown } from "@/core/settings/composables";
import { isValidEmail } from "@/utils/validation";
import ReportDependencyPrompt from "./ReportDependencyPrompt.vue";

import type {
  ReportSchedule,
  ReportFormat,
  ReportTemplate,
  ReportDependencies,
} from "../types/reporting";
import { notifyWarning } from "@/utils/notify";

const props = defineProps<{
  schedule?: ReportSchedule;
  template?: ReportTemplate;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits(useDialogPluginComponent.emits);

const { addReportSchedule, editReportSchedule, isLoading, isError } =
  useSharedReportSchedules;

const { reportTemplates } = useSharedReportTemplates;

const $q = useQuasar();

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
        name: `${props.template?.name} Schedule` || "",
        enabled: true,
        report_template: props.template?.id || undefined,
        format: "html",
        schedule: undefined,
        email_recipients: [],
        no_email: false,
        dependencies: {},
      },
);

const selectedTemplate = ref<ReportTemplate | null>(null);

const dependenciesNeeded = ref(false);

// set selected template if editing the form
if (props.schedule) {
  const template = reportTemplates.value.find((t) => t.id === localSchedule.id);
  if (template?.depends_on && template.depends_on.length > 0) {
    selectedTemplate.value = template;

    // check if dependencies are needed
    template.depends_on?.forEach((d) => {
      if (!localSchedule.dependencies[d]) dependenciesNeeded.value = true;
    });
  }
}

const hasDependencies = computed(() => {
  if (selectedTemplate.value && selectedTemplate.value.depends_on) {
    return selectedTemplate.value.depends_on.length > 0;
  }
  return false;
});

watch(
  () => localSchedule.report_template,
  (newValue) => {
    localSchedule.dependencies = {};
    selectedTemplate.value = null;

    if (newValue) {
      const template = reportTemplates.value.find((t) => t.id === newValue);
      if (template?.depends_on && template.depends_on.length > 0)
        selectedTemplate.value = template;
    }
  },
);

watch(
  () => localSchedule.dependencies,
  (newValue) => {
    if (selectedTemplate.value)
      selectedTemplate.value?.depends_on?.forEach((d) => {
        if (!newValue[d]) dependenciesNeeded.value = true;
      });
    dependenciesNeeded.value = false;
  },
  { deep: true },
);

function openDependenciesForm() {
  $q.dialog({
    component: ReportDependencyPrompt,
    componentProps: {
      dependsOn: selectedTemplate.value?.depends_on,
      values: localSchedule.dependencies,
    },
  }).onOk((data: ReportDependencies) => {
    localSchedule.dependencies = unref(data);
  });
}

function toggleAddEmail() {
  $q.dialog({
    title: "Add email",
    prompt: {
      model: "",
      isValid: (val) => isValidEmail(val),
      type: "email",
    },
    cancel: true,
    ok: { label: "Add", color: "primary" },
    persistent: false,
  }).onOk((data) => {
    localSchedule.email_recipients.push(data);
  });
}

function removeEmail(email: string) {
  const removed = localSchedule.email_recipients.filter((k) => k !== email);
  localSchedule.email_recipients = removed;
}

async function submit() {
  // make sure dependencies are set
  if (dependenciesNeeded.value) {
    notifyWarning("Dependencies need to be set");
  }

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
