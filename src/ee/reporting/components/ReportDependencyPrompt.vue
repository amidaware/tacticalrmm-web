<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 400px">
      <q-bar>
        Select Report Dependencies
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section v-for="(_, label) in dependencies" :key="label">
        <tactical-dropdown
          v-if="label === 'client'"
          v-model="dependencies[label]"
          :label="`${capitalize(label)}`"
          :options="clientOptions"
          outlined
          mapOptions
          filterable
        />

        <tactical-dropdown
          v-else-if="label === 'site'"
          v-model="dependencies[label]"
          :label="`${capitalize(label)}`"
          :options="siteOptions"
          outlined
          mapOptions
          filterable
        />

        <tactical-dropdown
          v-else-if="label === 'agent'"
          v-model="dependencies[label]"
          :label="`${capitalize(label)}`"
          :options="agentOptions"
          outlined
          mapOptions
          filterable
        />

        <q-input
          v-else
          v-model="dependencies[label]"
          :label="`${capitalize(label)}`"
          outlined
          dense
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup dense flat label="Cancel" />
        <q-btn
          :loading="loading"
          dense
          flat
          label="Submit"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onBeforeMount } from "vue";
import { useDialogPluginComponent } from "quasar";
import { notifyError } from "@/utils/notify";
import { capitalize } from "@/utils/format";
import { useAgentDropdown } from "@/composables/agents";
import { useClientDropdown, useSiteDropdown } from "@/composables/clients";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import { ReportDependencies } from "../types/reporting";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  dependsOn: string[];
  values?: ReportDependencies;
}>();

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// setup dropdown options
const { agentOptions, getAgentOptions } = useAgentDropdown();
const { clientOptions, getClientOptions } = useClientDropdown();
const { siteOptions, getSiteOptions } = useSiteDropdown();

// logic
const dependencies = props.values
  ? reactive(props.values)
  : reactive<{ [x: string]: string | number | null }>({});

props.dependsOn.forEach((dep) => {
  if (!dependencies[dep]) dependencies[dep] = null;
});

const loading = ref(false);

function validate() {
  let valid = true;
  props.dependsOn.forEach((dep) => {
    if (!dependencies[dep]) valid = false;
  });

  return valid;
}

function submit() {
  if (validate()) onDialogOK(dependencies);
  else notifyError("All fields must have a value");
}

onBeforeMount(() => {
  if (props.dependsOn.includes("client")) {
    getClientOptions();
  }

  if (props.dependsOn.includes("site")) {
    getSiteOptions();
  }

  if (props.dependsOn.includes("agent")) {
    getAgentOptions();
  }
});
</script>
