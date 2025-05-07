<template>
  <q-dialog ref="dialogRef" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 500px">
      <q-bar>
        <div class="text-h6">Patch Classification Install Schedules</div>
        <q-space />
        <q-btn dense flat icon="close" @click="onDialogHide" />
      </q-bar>

      <q-card-section>
        Patch Classification Schedules will take priority over Install Schedules
        in the Patch Policy
      </q-card-section>

      <q-card-section>
        <q-select
          v-model="formData.critical_schedule"
          :options="patchScheduleOptions"
          label="Critical Updates Schedule"
          emit-value
          map-options
          filled
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-select
          v-model="formData.security_schedule"
          :options="patchScheduleOptions"
          label="Security Updates Schedule"
          emit-value
          map-options
          filled
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-select
          v-model="formData.optional_schedule"
          :options="patchScheduleOptions"
          label="Optional Updates Schedule"
          emit-value
          map-options
          filled
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-select
          v-model="formData.hardware_schedule"
          :options="patchScheduleOptions"
          label="Hardware Updates Schedule"
          emit-value
          map-options
          filled
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-select
          v-model="formData.preview_schedule"
          :options="patchScheduleOptions"
          label="Preview Updates Schedule"
          emit-value
          map-options
          filled
          dense
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          color="primary"
          label="Save"
          :loading="isLoading"
          @click="submit"
        />
        <q-btn label="Cancel" flat v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { reactive } from "vue";
import { useDialogPluginComponent } from "quasar";
import { usePatchPolicyShared } from "../api";
import { usePatchScheduleDropdown } from "../composables";
import { PatchPolicy } from "../types";

// ui imports
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const { editPatchPolicy, isLoading } = usePatchPolicyShared;
const { patchScheduleOptions } = usePatchScheduleDropdown();

const props = defineProps<{
  patchPolicy: PatchPolicy;
}>();

const formData = reactive({
  critical_schedule: props.patchPolicy.critical_schedule || undefined,
  security_schedule: props.patchPolicy.security_schedule || undefined,
  optional_schedule: props.patchPolicy.optional_schedule || undefined,
  preview_schedule: props.patchPolicy.preview_schedule || undefined,
  hardware_schedule: props.patchPolicy.hardware_schedule || undefined,
});

function submit() {
  // TODO: check form for validation errors prior to sending
  editPatchPolicy(props.patchPolicy.id, formData);

  // TODO: Error handling
  onDialogOK();
}
</script>
