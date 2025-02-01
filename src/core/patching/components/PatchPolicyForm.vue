<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-bar>
        {{ isEditMode ? "Edit Patch Policy" : "Add Patch Policy" }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section>
        <!-- Name -->
        <q-input
          v-model="policy.name"
          label="Policy Name"
          :rules="[(val) => !!val || 'Name is required']"
          outlined
          dense
        />
      </q-card-section>

      <q-card-section>
        <!-- Description -->
        <q-input
          v-model="policy.description"
          label="Description"
          type="textarea"
          outlined
          dense
        />
      </q-card-section>

      <q-card-section>
        <!-- Schedule -->
        <q-select
          v-model="policy.schedule.frequency"
          label="Frequency"
          :options="scheduleFrequencyOptions"
          emit-value
          outlined
          dense
        />
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="policy.schedule.time"
          label="Time (HH:MM)"
          :rules="[
            (val) =>
              /^[0-2]\\d:[0-5]\\d$/.test(val) || 'Invalid time format (HH:MM)',
          ]"
          outlined
          dense
        />
      </q-card-section>

      <q-card-section>
        <q-input
          v-if="policy.schedule.frequency === 'weekly'"
          v-model="policy.schedule.day_of_week"
          label="Day of Week"
          :rules="[
            (val) => !!val || 'Day of week is required for weekly schedules',
          ]"
          outlined
          dense
        />

        <q-input
          v-else-if="policy.schedule.frequency === 'monthly'"
          v-model="policy.schedule.day_of_month"
          label="Day of Month"
          type="number"
          :rules="[
            (val) =>
              (val > 0 && val <= 31) || 'Day of month must be between 1 and 31',
          ]"
          outlined
          dense
        />
      </q-card-section>

      <q-card-section>
        <!-- Update Types -->
        <q-checkbox
          v-model="policy.include_critical_updates"
          label="Include Critical Updates"
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-checkbox
          v-model="policy.include_security_updates"
          label="Include Security Updates"
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-checkbox
          v-model="policy.include_optional_updates"
          label="Include Optional Updates"
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-checkbox
          v-model="policy.include_preview_updates"
          label="Include Preview Updates"
          dense
        />
      </q-card-section>

      <!-- Other Settings -->
      <q-card-section>
        <q-input
          v-model="policy.max_deferral_days"
          label="Max Deferral Days"
          type="number"
          outlined
          dense
        />
      </q-card-section>
      <q-card-section>
        <q-checkbox
          v-model="policy.auto_reboot"
          label="Enable Auto Reboot"
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
        <q-btn label="Cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { reactive, computed } from "vue";
import { useDialogPluginComponent, extend } from "quasar";
import { usePatchPolicyShared } from "../api";
import { PatchPolicy } from "../types";

const props = defineProps<{
  policy?: PatchPolicy;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { addPatchPolicy, editPatchPolicy, isLoading } = usePatchPolicyShared;

const scheduleFrequencyOptions = ["daily", "weekly", "monthly"];
const policy: PatchPolicy = props.policy
  ? reactive(extend(true, {}, props.policy))
  : reactive<PatchPolicy>({
      id: 0,
      name: "",
      description: "",
      schedule: {
        frequency: "daily",
        time: "",
        day_of_week: "",
        day_of_month: undefined,
      },
      include_critical_updates: false,
      include_security_updates: false,
      include_optional_updates: false,
      include_preview_updates: false,
      max_deferral_days: undefined,
      auto_reboot: false,
      patches_approved: [],
      patches_not_approved: [],
      patches_uninstall: [],
    });

const isEditMode = computed(() => !!props.policy);

// TODO: Add error handling when testing with real backend
function submit() {
  if (isEditMode.value) {
    editPatchPolicy(policy);
  } else {
    addPatchPolicy(policy);
  }
  onDialogOK(policy);
}
</script>
