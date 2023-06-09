<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->
<template>
  <q-list dense>
    <q-item-label header>Base Template</q-item-label>
    <q-item>
      <q-item-section>Some Template</q-item-section>
    </q-item>

    <q-separator />

    <q-item-label header>Variables</q-item-label>
    <q-item v-for="(type, prop) in variableAnalysis" :key="prop">
      <q-item-section avatar class="q-pr-xs">
        <q-badge color="primary" :label="type"
          ><q-tooltip>{{ type }}</q-tooltip></q-badge
        >
      </q-item-section>
      <q-item-section>
        <span
          class="cursor-pointer"
          style="text-decoration-line: underline; font-size: smaller"
          @click="copy(prop.toString(), type.toLowerCase() === 'array')"
          >{{ prop }}</span
        >
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ReportDependencies } from "../types/reporting";
import { useSharedReportTemplates } from "../api/reporting";
import { onMounted } from "vue";
import { copyToClipboard } from "quasar";

const props = defineProps<{
  variables: string;
  base_template?: number;
  dependencies?: ReportDependencies;
}>();

const { getAllowedValues, variableAnalysis } = useSharedReportTemplates;

const copied = ref(true);

function copy(text: string, is_for = false) {
  if (is_for)
    copyToClipboard("{% for item in " + text + " %}\n\n{% endfor %}").then(
      () => {
        copied.value = true;
      }
    );
  else
    copyToClipboard("{{ " + text + " }}").then(() => {
      copied.value = true;
    });
}
onMounted(() =>
  getAllowedValues({
    variables: props.variables,
    dependencies: props?.dependencies,
    base_template: props?.base_template,
  })
);
</script>
