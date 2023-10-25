<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->
<template>
  <q-list dense>
    <q-item-label header
      >Base Template Blocks
      <span v-if="copiedBlock" class="float-right">Copied!</span></q-item-label
    >
    <q-item
      v-for="block in templateBlocks"
      :key="block"
      :inset-level="block.warning ? 0 : 1"
    >
      <q-item-section avatar v-if="block.warning">
        <q-icon name="warning" color="warning">
          <q-tooltip
            >Block not found in template. Click on the block to copy and paste
            into template</q-tooltip
          >
        </q-icon>
      </q-item-section>
      <q-item-section>
        <span
          class="cursor-pointer"
          style="text-decoration-line: underline; font-size: smaller"
          @click="copy(block.block, false, true)"
        >
          {{ block.block }}
        </span>
      </q-item-section>
    </q-item>

    <q-separator />

    <q-item-label header>
      Variables <span v-if="copiedVariable" class="float-right">Copied!</span>
    </q-item-label>
    <q-item
      v-for="warning in [...dependencyWarnings, ...variableWarnings]"
      :key="warning"
    >
      <q-item-section avatar>
        <q-icon name="warning" color="warning" />
      </q-item-section>
      <q-item-section>
        <span style="font-size: smaller">{{ warning }}</span>
      </q-item-section>
    </q-item>

    <q-separator
      v-if="[...dependencyWarnings, ...variableWarnings].length > 0"
    />

    <q-item
      v-for="(type, prop) in variableAnalysis"
      :key="prop"
      @mouseover="mouseover = prop.toString()"
      @mouseleave="mouseover = ''"
    >
      <q-item-section avatar>
        <q-badge color="primary" :label="type"></q-badge>
      </q-item-section>
      <q-item-label :lines="1">
        <span
          class="cursor-pointer"
          style="text-decoration-line: underline; font-size: smaller"
          @click="copy(prop.toString(), type.toLowerCase() === 'array')"
        >
          {{ prop }}
        </span>
        <q-tooltip :delay="500">
          {{ prop }}
        </q-tooltip>
      </q-item-label>
      <q-item-section
        v-if="
          type.toLowerCase().substring(0, 5) === 'array' &&
          mouseover === prop.toString()
        "
        side
      >
        <q-badge
          class="cursor-pointer"
          label="for loop"
          @click="copy(prop.toString(), true)"
        />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { ReportDependencies } from "../types/reporting";
import {
  useSharedReportTemplates,
  useSharedReportHTMLTemplates,
} from "../api/reporting";
import { onMounted } from "vue";
import { copyToClipboard } from "quasar";
import { watchDebounced, until } from "@vueuse/core";

const props = defineProps<{
  variables: string;
  template: string;
  dependsOn?: string[];
  base_template?: number;
  dependencies?: ReportDependencies;
}>();

const { getAllowedValues, variableAnalysis, isLoading } =
  useSharedReportTemplates;

const { reportHTMLTemplates } = useSharedReportHTMLTemplates;

const copiedVariable = ref(false);
const copiedBlock = ref(false);
const templateBlocks = ref([] as { block: string; warning: boolean }[]);
const variableWarnings = ref([] as string[]);
const dependencyWarnings = ref([] as string[]);
const mouseover = ref("");

function copy(content: string, is_for = false, block = false) {
  let text = "";
  if (block) {
    text = "{% block " + content + " %}{% endblock %}";
  } else if (is_for) text = "{% for item in " + content + " %}{% endfor %}";
  else text = "{{ " + content + " }}";

  copyToClipboard(text).then(() => {
    if (block) copiedBlock.value = true;
    else copiedVariable.value = true;

    setTimeout(() => {
      if (block) copiedBlock.value = false;
      else copiedVariable.value = false;
    }, 2000);
  });
}

async function getVariables() {
  variableWarnings.value = [];

  // don't send variable analysis if client, site, or agent dependency isn't selected
  if (props.dependsOn) {
    for (let i = 0; i < props.dependsOn.length; i++) {
      let dep = props.dependsOn[i];
      if (dep === "client" || dep === "site" || dep === "agent") {
        if (!props.dependencies?.[dep]) return;
      }
    }
  }

  getAllowedValues({
    variables: props.variables,
    dependencies: props?.dependencies,
  });

  await until(isLoading).not.toBeTruthy();

  // check if any data queries returned empty results
  for (let key in variableAnalysis.value) {
    if (variableAnalysis.value[key].includes("0 Results")) {
      variableWarnings.value.push(`Data Query: ${key} returned no results`);
    }

    if (variableAnalysis.value[key].toLowerCase().substring(0, 5) === "array") {
      variableAnalysis.value[key] = "Array";
    }
  }
}

// watch for variables changes
watchDebounced(
  () => props.variables,
  () => {
    getVariables();
  },
  { debounce: 5000 }
);

// checks dependencies and adds warnings
function checkDependencies(
  dependsOn: string[] | undefined,
  dependencies: ReportDependencies | undefined
) {
  dependencyWarnings.value = [];
  // Check if dependencies aren't specified
  dependsOn?.forEach((dep) => {
    !dependencies?.[dep] &&
      dependencyWarnings.value.push(
        `Missing value for dependency: ${dep} . Open Preview to set values`
      );
  });
}

// watch for any dependency changes
watch(
  [() => props.dependencies, () => props.dependsOn],
  ([dependencies, dependsOn]) => {
    checkDependencies(dependsOn, dependencies);
  }
);

// checks available blocks in base template and checks if they are used
function checkBaseTemplate(template: string, base_id: number | undefined) {
  templateBlocks.value = [];
  if (base_id) {
    const base_template = reportHTMLTemplates.value.find(
      (template) => template.id === base_id
    );

    let regex = /\{% block ([A-Za-z0-9_ ]+) %\}/g,
      match: string[] | null;

    if (base_template)
      while ((match = regex.exec(base_template?.html))) {
        const full_match = match[0];
        const block_name = match[1];
        templateBlocks.value.push({
          block: block_name,
          warning: !template.includes(full_match),
        });
      }
  }
}

// watches for changes in base template and template
watch(
  [() => props.base_template, () => props.template],
  ([newBase, newTemplate]) => {
    checkBaseTemplate(newTemplate, newBase);
  }
);

onMounted(() => {
  getVariables();
  checkDependencies(props.dependsOn, props.dependencies);
  checkBaseTemplate(props.template, props.base_template);
});
</script>
