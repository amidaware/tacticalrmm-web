<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        <template v-if="!emailOnly">
          {{ schedule && !clone ? "Edit" : "Add" }} Report Schedule
        </template>
        <template v-else> Email Report </template>
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-form @submit.prevent="submit">
        <q-card-section class="q-pa-md">
          <q-input
            v-if="!emailOnly"
            v-model="localSchedule.name"
            label="Name"
            dense
            filled
            :rules="[(val: string) => !!val || '*Required']"
          />

          <q-toggle
            v-if="!emailOnly"
            v-model="localSchedule.enabled"
            label="Enabled"
            dense
            dense-toggle
            class="q-mb-sm"
          />

          <tactical-dropdown
            v-model="localSchedule.report_template"
            :options="reportTemplateOptions"
            label="Report Template"
            dense
            filled
            map-options
            emit-value
            options-dense
            filterable
            :rules="[(val: number) => !!val || '*Required']"
          >
            <template #after v-if="hasDependencies">
              <q-btn
                flat
                dense
                no-caps
                :icon="!areDependenciesMet ? 'warning' : undefined"
                :color="!areDependenciesMet ? 'warning' : 'primary'"
                label="Dependencies"
                @click="openDependenciesForm"
              />
            </template>
          </tactical-dropdown>

          <q-option-group
            v-model="localSchedule.format"
            :options="formatOptions"
            label="Format"
            inline
            dense
            class="q-mb-sm"
            :rules="[(val: number) => !!val || '*Required']"
          />

          <tactical-dropdown
            v-if="!emailOnly"
            v-model="localSchedule.schedule"
            :options="scheduleOptions"
            label="Schedule"
            map-options
            emit-value
            options-dense
            dense
            filled
            filterable
            :rules="[(val: string) => !!val || '*Required']"
          >
            <template #after>
              <q-btn
                @click="openCoreScheduleForm"
                icon="fas fa-plus"
                color="primary"
                flat
                no-caps
                dense
                label="Create New Schedule"
              />
            </template>
          </tactical-dropdown>

          <div class="row">
            <div class="col-9 text-weight-medium">Email recipients</div>
            <div class="col-3">
              <q-btn
                no-caps
                dense
                flat
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
                  <q-item-label
                    >No recipients added yet, emails from global settings will
                    be used.</q-item-label
                  >
                </q-item-section>
              </q-list>
            </div>
          </div>
          <q-checkbox
            v-if="!emailOnly"
            v-model="localSchedule.send_report_email"
            label="Send report via Email"
            class="q-pt-md"
            dense
          />
        </q-card-section>
        <q-card-section>
          <q-btn
            no-caps
            dense
            flat
            color="primary"
            label=" Customize Email Content"
            @click="openEmailSettings"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup dense />
          <q-btn
            flat
            :label="!emailOnly ? 'Save' : 'Send'"
            color="primary"
            :loading="isLoading"
            class="q-ml-sm"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, unref, reactive, computed } from "vue";
import { useQuasar, useDialogPluginComponent, extend } from "quasar";
import { until } from "@vueuse/shared";
import {
  useSharedReportSchedules,
  useSharedReportTemplates,
} from "../api/reporting";
import { useReportTemplateDropdown } from "../composables";
import { useScheduleDropdown } from "@/core/settings/composables";
import { isValidEmail } from "@/utils/validation";
import { notifyWarning } from "@/utils/notify";

// ui imports
import ReportDependencyPrompt from "./ReportDependencyPrompt.vue";
import ScheduleForm from "@/core/settings/components/ScheduleForm.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

import type {
  ReportSchedule,
  ReportFormat,
  ReportTemplate,
  ReportDependencies,
  EmailSettings,
} from "../types/reporting";
import ReportEmailSettingsForm from "./ReportEmailSettingsForm.vue";

const props = defineProps<{
  schedule?: ReportSchedule;
  reportTemplate?: number;
  clone?: boolean;
  emailOnly?: boolean;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits(useDialogPluginComponent.emits);

const { addReportSchedule, editReportSchedule, isLoading, isError } =
  useSharedReportSchedules;

const { reportTemplates, emailReport } = useSharedReportTemplates;

const $q = useQuasar();

const { reportTemplateOptions } = useReportTemplateDropdown();
const { scheduleOptions } = useScheduleDropdown();

const formatOptions: { label: string; value: ReportFormat }[] = [
  { label: "PDF", value: "pdf" },
  { label: "HTML", value: "html" },
];

const localSchedule = reactive<ReportSchedule>(
  props.schedule
    ? extend(true, {}, props.schedule)
    : {
        id: 0,
        name: "",
        enabled: true,
        report_template: props.reportTemplate,
        format: "pdf",
        schedule: undefined,
        email_recipients: [],
        send_report_email: true,
        dependencies: {},
        email_settings: {},
      },
);

const selectedTemplate = ref<ReportTemplate | null>(null);

const areDependenciesMet = computed(() => {
  const required = selectedTemplate.value?.depends_on;

  if (!required || required.length === 0) {
    return true;
  }

  return required.every((key) => localSchedule.dependencies[key] != null);
});

// set selected template if editing the form or r
if (
  props.reportTemplate ||
  (props.schedule && props.schedule.report_template)
) {
  const template = reportTemplates.value.find(
    (t) => t.id === localSchedule?.report_template,
  );
  if (template?.depends_on && template.depends_on.length > 0) {
    selectedTemplate.value = template;
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
      if (template?.depends_on && template.depends_on.length > 0) {
        selectedTemplate.value = template;
      }
    }
  },
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

function openCoreScheduleForm() {
  $q.dialog({
    component: ScheduleForm,
  });
}

function openEmailSettings() {
  $q.dialog({
    component: ReportEmailSettingsForm,
    componentProps: {
      emailSettings: localSchedule.email_settings,
    },
  }).onOk((data: EmailSettings) => (localSchedule.email_settings = data));
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
  if (!areDependenciesMet.value) {
    notifyWarning(
      `All required dependencies must be set before ${!props.emailOnly ? "saving" : "sending"}.`,
    );
    return;
  }

  if (props.emailOnly && props.reportTemplate) {
    if (props.reportTemplate)
      emailReport(props.reportTemplate, {
        format: localSchedule.format,
        email_recipients: localSchedule.email_recipients,
        dependencies: localSchedule.dependencies,
        email_settings: localSchedule.email_settings,
      });
  } else if (!props.clone && props.schedule) {
    editReportSchedule(props.schedule.id, localSchedule);
  } else {
    addReportSchedule(localSchedule);
  }
  await until(isLoading).not.toBeTruthy();
  if (isError.value) return;

  onDialogOK();
}
</script>
