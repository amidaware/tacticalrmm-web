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
import { useRoute } from "vue-router";
import { useQuasar } from "quasar";
import { useSharedReportHistory } from "../api/reporting";

// type
import type { ReportFormat } from "../types/reporting";

// props
const props = defineProps<{
  id: number;
  format: ReportFormat;
}>();

// setup vue router
const $route = useRoute();

// setup quasar
const $q = useQuasar();

// logic
const { reportData, runReportHistory, isLoading } = useSharedReportHistory;

runReportHistory(props.id, props.format);
</script>
