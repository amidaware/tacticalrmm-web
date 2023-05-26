<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 400px">
      <q-bar>
        Run {{ capitalize(type) }} Report
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section v-if="reportTemplates.length === 0">
        There are no report templates that depend on {{ capitalize(type) }}. You
        can specify {{ `\{\{ ${type}.property \}\}` }} in the variables section
        of a report template.
      </q-card-section>
      <div v-else>
        <q-card-section>
          <q-option-group
            v-model="reportFormat"
            :options="[
              { label: 'PDF', value: 'pdf' },
              { label: 'HTML', value: 'html' },
            ]"
            inline
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="reportTemplate"
            :options="reportTemplateOptions"
            label="Report Template"
            outlined
            mapOptions
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup dense flat label="Cancel" />
          <q-btn
            :loading="isLoading"
            :disable="!reportTemplate"
            dense
            flat
            label="Run Report"
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
}>();

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const { reportTemplates, isLoading, getReportTemplates, openReport } =
  useSharedReportTemplates;

// run report logic
const reportTemplate = ref<number | null>(null);
const reportFormat = ref<ReportFormat>("pdf");

const reportTemplateOptions = computed(() =>
  reportTemplates.value.map((template) => ({
    label: template.name,
    value: template.id,
  }))
);

async function submit() {
  if (reportTemplate.value === null) {
    notifyError("Report Template is required.");
    return;
  }
  const selectedTemplate = reportTemplates.value.find(
    (template) => template.id === reportTemplate.value
  );
  if (selectedTemplate && selectedTemplate.depends_on) {
    openReport(
      reportTemplate.value,
      reportFormat.value,
      selectedTemplate.depends_on,
      {
        [props.type]: props.id,
      }
    );
  }

  onDialogOK();
}

onBeforeMount(() => getReportTemplates([props.type]));
</script>
