<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="text-subtitle1">Selected Patches:</div>
        <div v-for="patch in patches" class="text-subtitle2" :key="patch.id">
          {{ patch.name }}
        </div>
      </q-card-section>

      <!-- Action Selection -->
      <q-card-section>
        <q-option-group
          v-model="action"
          label="Select Action"
          :options="actionOptions"
          type="radio"
          inline
          dense
        />
      </q-card-section>

      <!-- Policy Selection -->
      <q-card-section>
        <q-select
          v-model="selectedPolicies"
          label="Select Policies"
          :options="policyOptions"
          emit-value
          map-options
          outlined
          dense
          options-dense
          multiple
          :rules="[
            (val) =>
              (val && val.length > 0) || 'Please select at least one policy',
          ]"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          color="primary"
          label="Apply"
          :loading="isLoading"
          @click="submit"
        />
        <q-btn label="Cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useDialogPluginComponent } from "quasar";
import { usePatchPolicyShared } from "../api";
import { Patch } from "../types";

defineProps<{
  patches: Patch[];
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { policies, getPolicies, isLoading } = usePatchPolicyShared;

const action = ref<"approve" | "not_approved" | "uninstall">("approve");
const selectedPolicies = ref<number[]>([]);

const actionOptions = [
  { label: "Approve", value: "approve" },
  { label: "Not Approved", value: "not_approved" },
  { label: "Uninstall", value: "uninstall" },
];

const policyOptions = computed(() =>
  policies.value.map((policy) => ({
    label: policy.name,
    value: policy.id,
  })),
);

function submit() {
  if (!selectedPolicies.value.length) {
    return;
  }

  // TODO: Actually hit an endpoint

  onDialogOK();
}

onMounted(getPolicies);
</script>
