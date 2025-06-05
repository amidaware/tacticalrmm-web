<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div>
    <q-inner-loading
      :showing="isLoading"
      label="Please wait..."
      label-class="text-teal"
      label-style="font-size: 1.1em"
    />
    <iframe
      :srcdoc="$route.query.format !== 'pdf' ? reportData : undefined"
      :src="$route.query.format === 'pdf' ? reportData : undefined"
      :style="{
        'max-height': `${$q.screen.height}px`,
        'min-height': `${$q.screen.height}px`,
        'min-width': '100%',
        'background-color': 'white',
      }"
      id="report-iframe"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { useQuasar } from "quasar";
import { useReportTemplates } from "../api/reporting";

// ui imports
import ReportDependencyPrompt from "../components/ReportDependencyPrompt.vue";

// type
import type { ReportFormat, ReportDependencies } from "../types/reporting";

// props
const props = defineProps<{
  id: number;
  format: ReportFormat;
  dependencies?: ReportDependencies;
  dependsOn?: string[];
}>();

// setup vue router
const $route = useRoute();

// setup quasar
const $q = useQuasar();

// logic
const dependsOn = props.dependsOn || [];
const dependencies = ref(Object.assign({}, props.dependencies));

const { reportData, isLoading, runReport, openReport } = useReportTemplates();
const needsPrompt = dependsOn.filter((dep) => !dependencies.value[dep]);

if (needsPrompt.length > 0) {
  $q.dialog({
    component: ReportDependencyPrompt,
    componentProps: { dependsOn: needsPrompt },
  })
    .onOk((deps) => (dependencies.value = { ...dependencies.value, ...deps }))
    .onDismiss(() => {
      openReport(props.id, props.format, dependsOn, dependencies.value, false);

      runReport(props.id, {
        format: props.format,
        dependencies: dependencies.value,
      });
    });
} else {
  runReport(props.id, {
    format: props.format,
    dependencies: dependencies.value,
  });
}
</script>
