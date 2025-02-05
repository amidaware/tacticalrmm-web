<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 800px">
      <q-bar>
        Apply patches to patch policies
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <div class="row">
        <div class="col-6">
          <div class="text-subtitle1 q-ma-sm">Selected Patches:</div>
          <q-scroll-area style="height: 200px">
            <div
              v-for="patch in patches"
              class="text-subtitle2 q-ml-md"
              :key="patch.id"
            >
              {{ patch.name }}
            </div>
          </q-scroll-area>
        </div>

        <q-card-section class="col-6 q-gutter-md">
          <q-option-group
            v-model="action"
            label="Select Action"
            :options="actionOptions"
            type="radio"
            inline
            dense
          />
          <tactical-dropdown
            v-model="selectedPolicies"
            label="Select Policies"
            :options="policyOptions"
            emit-value
            map-options
            filled
            dense
            options-dense
            multiple
            :rules="[
              (val: string) =>
                (val && val.length > 0) || 'Please select at least one policy',
            ]"
          />
        </q-card-section>
      </div>
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

import TacticalDropdown from "@/core/dashboard/ui/components/TacticalDropdown.vue";

defineProps<{
  patches: Patch[];
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { patchPolicies, getPatchPolicies, isLoading } = usePatchPolicyShared;

const action = ref<"approve" | "not_approved" | "uninstall">("approve");
const selectedPolicies = ref<number[]>([]);

const actionOptions = [
  { label: "Approve", value: "approve" },
  { label: "Not Approved", value: "not_approved" },
  { label: "Uninstall", value: "uninstall" },
];

const policyOptions = computed(() =>
  patchPolicies.value.map((policy) => ({
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

onMounted(getPatchPolicies);
</script>
