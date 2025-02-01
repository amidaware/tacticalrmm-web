<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        Edit assignments on {{ type }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>
      <div class="q-pa-sm">
        <div class="text-h6">Automation Polcies</div>
        <q-card-section class="q-pt-md">
          <tactical-dropdown
            v-if="type === 'client' || type === 'site'"
            class="q-mb-md"
            v-model="formData.serverPolicy"
            :options="policyOptions"
            label="Server Policy"
            outlined
            clearable
            mapOptions
            filterable
            options-dense
            dense
          />
          <tactical-dropdown
            v-if="type === 'client' || type === 'site'"
            v-model="formData.workstationPolicy"
            :options="policyOptions"
            label="Workstation Policy"
            outlined
            clearable
            mapOptions
            filterable
            options-dense
            dense
          />
          <tactical-dropdown
            v-if="type === 'agent'"
            v-model="formData.agentPolicy"
            :options="policyOptions"
            label="Policy"
            outlined
            clearable
            mapOptions
            filterable
            options-dense
            dense
          />

          <q-checkbox
            label="Block policy inheritance"
            v-model="formData.blockInheritance"
            class="q-pt-md"
          >
            <q-tooltip
              >This {{ type }} will not inherit from higher policies</q-tooltip
            >
          </q-checkbox>
        </q-card-section>

        <!-- Alert Template-->
        <div class="text-h6" v-if="!isAgent()">Alert Template</div>
        <q-card-section v-if="!isAgent()" class="q-pt-md">
          <tactical-dropdown
            v-model="formData.alertTemplate"
            :options="alertTemplateOptions"
            label="Alert Template"
            outlined
            clearable
            mapOptions
            filterable
            options-dense
            dense
          />
        </q-card-section>

        <!-- Patch Policy -->
        <div class="text-h6">Patch Policy</div>
        <q-card-section class="q-pt-md">
          <tactical-dropdown
            v-model="formData.patchPolicy"
            :options="patchPolicyOptions"
            label="Patch Policy"
            outlined
            clearable
            mapOptions
            filterable
            options-dense
            dense
          />
        </q-card-section>
      </div>

      <q-card-actions align="right">
        <q-btn dense flat label="Cancel" v-close-popup />
        <q-btn
          :loading="loading"
          :disable="!changed"
          dense
          flat
          label="Save"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useAlertTemplateDropdown } from "@/core/alerts/composables";
import { usePolicyDropdown } from "@/core/automation/composables";
import { usePatchPolicyDropdown } from "@/core/patching/composables";
import { useClientShared, useSiteShared } from "@/core/clients/api";
import { useAgentShared } from "@/core/agents/api";

// ui
import TacticalDropdown from "../ui/components/TacticalDropdown.vue";

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

defineEmits([...useDialogPluginComponent.emits]);

interface EntityWithAssignments {
  agent_id?: string;
  id?: number;
  client?: number;
  server_policy?: number;
  workstation_policy?: number;
  policy?: number;
  alert_template: number;
  patch_policy: number;
  block_policy_inheritance: boolean;
}

function isAgent() {
  return props.entity.agent_id !== undefined;
}

function isSite() {
  return props.entity.id !== undefined && props.entity.client !== undefined;
}

function isClient() {
  return props.entity.id !== undefined && props.entity.client === undefined;
}

const type = computed(() => {
  if (isAgent()) return "agent";
  else if (isClient()) return "client";
  else if (isSite()) return "site";
  else return "";
});

// props
const props = defineProps<{
  entity: EntityWithAssignments;
}>();

// setup dropdowns
const { alertTemplateOptions } = useAlertTemplateDropdown();
const { policyOptions } = usePolicyDropdown();
const { patchPolicyOptions } = usePatchPolicyDropdown();

const formData = reactive({
  workstationPolicy: props.entity.workstation_policy,
  serverPolicy: props.entity.server_policy,
  agentPolicy: props.entity.policy,
  blockInheritance: props.entity.block_policy_inheritance,
  patchPolicy: props.entity.patch_policy,
  alertTemplate: props.entity.alert_template,
});

const changed = ref(false);

watch(formData, () => {
  changed.value = true;
});

const loading = ref(false);

function submit() {
  if (!changed.value) {
    onDialogHide();
  }

  loading.value = true;

  if (isClient() && props.entity.id) {
    const { editClient } = useClientShared;
    editClient(props.entity.id, {
      server_policy: formData.serverPolicy,
      workstation_policy: formData.workstationPolicy,
      block_policy_inheritance: formData.blockInheritance,
      alert_template: formData.alertTemplate,
      patch_policy: formData.patchPolicy,
    });
  } else if (isSite() && props.entity.id) {
    const { editSite } = useSiteShared;

    editSite(props.entity.id, {
      server_policy: formData.serverPolicy,
      workstation_policy: formData.workstationPolicy,
      block_policy_inheritance: formData.blockInheritance,
      alert_template: formData.alertTemplate,
      patch_policy: formData.patchPolicy,
    });
  } else if (isAgent() && props.entity.agent_id) {
    const { editAgent } = useAgentShared;

    editAgent(props.entity.agent_id, {
      policy: formData.agentPolicy,
      block_policy_inheritance: formData.blockInheritance,
      patch_policy: formData.patchPolicy,
    });
  }

  // TODO: Error Handling

  onDialogOK();
}
</script>
