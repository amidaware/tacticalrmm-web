<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        Edit policies assigned to {{ type }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <div class="h6-text">Polcies</div>
        <q-card-section v-if="policyOptions.length > 0">
          <tactical-dropdown
            v-if="type === 'client' || type === 'site'"
            class="q-mb-md"
            v-model="formData.selectedServerPolicy"
            :options="policyOptions"
            label="Server Policy"
            outlined
            clearable
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-if="type === 'client' || type === 'site'"
            v-model="formData.selectedWorkstationPolicy"
            :options="policyOptions"
            label="Workstation Policy"
            outlined
            clearable
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-if="type === 'agent'"
            v-model="formData.selectedAgentPolicy"
            :options="policyOptions"
            label="Policy"
            outlined
            clearable
            mapOptions
            filterable
          />

          <q-checkbox
            label="Block policy inheritance"
            v-model="formData.blockInheritance"
          >
            <q-tooltip
              >This {{ type }} will not inherit from higher policies</q-tooltip
            >
          </q-checkbox>
        </q-card-section>

        <!-- No policies configured-->
        <q-card-section v-else>
          No Automation Policies have been setup. Go to Settings > Automation
          Manager
        </q-card-section>

        <!-- Alert Template-->
        <q-card-section v-if="!isAgent()">
          <tactical-dropdown
            v-if="type === 'agent'"
            v-model="formData.alert_template"
            :options="alertTemplateOptions"
            label="Alert Template"
            outlined
            clearable
            mapOptions
            filterable
          />
        </q-card-section>

        <!-- Patch Policy -->
        <q-card-section>
          <tactical-dropdown
            v-model="formData.patch_policy"
            :options="patchPolicyOptions"
            label="Patch Policy"
            outlined
            clearable
            mapOptions
            filterable
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn dense flat label="Cancel" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            label="Submit"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import {computed, reactive, ref, watch, onMounted} from "vue"
import { useDialogPluginComponent } from "quasar";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import axios from "axios";
import { notifySuccess } from "@/utils/notify";
import { Policy } from "@/types/automation";


const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

defineEmits([...useDialogPluginComponent.emits]);

interface EntityWithAssignments {
  agent_id?: number
  id?: number;
  client?: number;
  server_policy?: number;
  workstation_policy?: number;
  policy?: number;
  alert_template: number;
  patch_policy: number
  blockInheritance: boolean
}

function isAgent() {
  return props.entity.agent_id !== undefined
}

function isSite() {
  return props.entity.id !== undefined && props.entity.client !== undefined
}

function isClient() {
  return props.entity.id !== undefined && props.entity.client === undefined
}

const type = computed(() => {
  if (isAgent()) return "agent"
  else if (isClient()) return "client"
  else if (isSite()) return "site"
  else return ""
})

// props
const props =
  defineProps<{
    entity: EntityWithAssignments;
  }>()

const formData = reactive({
  selectedWorkstationPolicy: props.entity.workstation_policy,
  selectedServerPolicy: props.entity.server_policy,
  selectedAgentPolicy: props.entity.policy,
  blockInheritance: props.entity.blockInheritance,
  patch_policy: props.entity.patch_policy,
  alert_template: props.entity.alert_template
})

const changed = ref(false)

watch(formData, () => {
  changed.value = true
})

const loading = ref(false)

function submit() {

  if (!changed.value) {
    onDialogHide()
  }

  loading.value = true

  let data = {};
  let url = "";
  if (isClient()) {
    url = `/clients/${props.entity.id}/`;
    data = {
      client: {
        server_policy: formData.selectedServerPolicy,
        workstation_policy: formData.selectedWorkstationPolicy,
        block_policy_inheritance: formData.blockInheritance,
        alert_template: formData.alert_template,
        patch_policy: formData.patch_policy
      },
    };
  } else if (isSite()) {
    url = `/clients/sites/${props.entity.id}/`;
    data = {
      site: {
        server_policy: formData.selectedServerPolicy,
        workstation_policy: formData.selectedWorkstationPolicy,
        block_policy_inheritance: formData.blockInheritance,
        alert_template: formData.alert_template,
        patch_policy: formData.patch_policy
      },
    };
  } else if (isAgent()) {
    url = `/agents/${props.entity.agent_id}/`;
    data = {
      policy: formData.selectedAgentPolicy,
      block_policy_inheritance: formData.blockInheritance,
      patch_policy: formData.patch_policy
    };
  }

  axios
    .put(url, data)
    .then(() => {
      loading.value = false
      onDialogOK()
      notifySuccess("Policies Updated Successfully!");
    })
    .catch(() => {
      loading.value = false
    });
}

const policyOptions = ref([]);

function getPolicies() {
    axios
      .get("/automation/policies/")
      .then((r) => {
        policyOptions.value = r.data.map((policy: Policy) => ({
          label: policy.name,
          value: policy.id,
        }));
      })
      .catch(() => {

      });
  }

const alertTemplateOptions = ref([])

function getAlertTemplates() {

}

const patchPolicyOptions = ref([])

function getPatchPolicies() {

}

onMounted(() => {
  getPolicies()
  getAlertTemplates()
  getPatchPolicies()
})
