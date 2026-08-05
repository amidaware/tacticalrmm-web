<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 400px">
      <q-bar>
        {{
          t(
            download
              ? "reporting.runReportDialog.download"
              : "reporting.runReportDialog.run",
          )
        }}
        {{ capitalize(type) }} {{ t("reporting.runReportDialog.report") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            t("reporting.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section v-if="reportTemplates.length === 0">
        {{
          t("reporting.runReportDialog.noTemplatesMessage", {
            typeDisplay: capitalize(type),
            type,
          })
        }}
      </q-card-section>
      <div v-else>
        <q-card-section>
          <tactical-dropdown
            v-model="reportTemplate"
            :options="reportTemplateOptions"
            :label="t('reporting.common.reportTemplate')"
            outlined
            mapOptions
            filterable
          />
        </q-card-section>

        <q-card-section>
          <q-option-group
            v-model="reportFormat"
            :options="reportFormatOptions"
            inline
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            dense
            flat
            :label="t('reporting.common.cancel')"
          />
          <q-btn
            :loading="isLoading"
            :disable="!reportTemplate"
            dense
            flat
            :label="t('reporting.runReportDialog.runReport')"
            color="primary"
            @click="submit"
          />
        </q-card-actions>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, computed, onBeforeMount } from "vue";
import { useDialogPluginComponent } from "quasar";
import { capitalize } from "@/utils/format";
import { useSharedReportTemplates } from "../api/reporting";
import { notifyError } from "@/utils/notify";
import { useI18n } from "vue-i18n";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// types
import { type ReportFormat } from "../types/reporting";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  id: string | number;
  type: "client" | "site" | "agent";
  download: boolean;
}>();

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { t } = useI18n();

const {
  reportTemplates,
  isLoading,
  getReportTemplates,
  openReport,
  downloadReport,
} = useSharedReportTemplates;

// run report logic
const reportTemplate = ref<number | null>(null);
const reportFormat = ref<ReportFormat>("pdf");

const reportTemplateOptions = computed(() =>
  reportTemplates.value.map((template) => ({
    label: template.name,
    value: template.id,
  })),
);

const selectedTemplate = computed(() => {
  return reportTemplates.value.find(
    (template) => template.id === reportTemplate.value,
  );
});

const reportFormatOptions = computed(() => {
  if (selectedTemplate.value) {
    if (selectedTemplate.value.type !== "plaintext")
      return [
        { label: t("reporting.common.pdf"), value: "pdf" },
        { label: t("reporting.common.html"), value: "html" },
      ];
    else
      return [
        { label: t("reporting.common.pdf"), value: "pdf" },
        { label: t("reporting.common.text"), value: "plaintext" },
      ];
  } else return [];
});

async function submit() {
  if (reportTemplate.value === null) {
    notifyError(t("reporting.runReportDialog.reportTemplateRequired"));
    return;
  }

  if (selectedTemplate.value && selectedTemplate.value.depends_on) {
    if (!props.download)
      openReport(
        reportTemplate.value,
        reportFormat.value,
        selectedTemplate.value.depends_on,
        {
          [props.type]: props.id,
        },
      );
    else
      downloadReport(selectedTemplate.value, reportFormat.value, {
        [props.type]: props.id,
      });
  }

  onDialogOK();
}

onBeforeMount(() => getReportTemplates([props.type]));
</script>
