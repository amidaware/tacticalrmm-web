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
      :srcdoc="$route.query.format === 'html' ? reportData : undefined"
      :src="$route.query.format === 'pdf' ? reportData : undefined"
      :style="{
        'max-height': `${$q.screen.height}px`,
        'min-height': `${$q.screen.height}px`,
        'min-width': '100%',
        'background-color': 'white',
      }"
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
  dependencies: ReportDependencies;
  dependsOn: string[];
}>();

// setup vue router
const $route = useRoute();

// setup quasar
const $q = useQuasar();

// logic
const { reportData, isLoading, runReport } = useReportTemplates();
const needsPrompt = props.dependsOn.filter((dep) => !props.dependencies[dep]);

const dialogOpen = ref(false);

const dependencies = ref(Object.assign({}, props.dependencies));

if (needsPrompt.length > 0) {
  dialogOpen.value = true;
  $q.dialog({
    component: ReportDependencyPrompt,
    componentProps: { dependsOn: needsPrompt },
  })
    .onOk((deps) => (dependencies.value = { ...dependencies.value, ...deps }))
    .onDismiss(() => {
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
