<template>
  <q-dialog ref="dialogRef" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 800px">
      <q-bar>
        <div class="text-h6">
          {{ isEditMode ? "Edit Patch Policy" : "Add Patch Policy" }}
        </div>
        <q-space />
        <q-btn dense flat icon="close" @click="onDialogHide" />
      </q-bar>

      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="text-subtitle1 q-mb-md">General</div>
            <div class="q-gutter-md">
              <q-input
                v-model="patchPolicy.name"
                label="Policy Name"
                :rules="[(val) => !!val || 'Name is required']"
                filled
                dense
                hide-bottom-space
              />
              <q-input
                v-model="patchPolicy.description"
                label="Description"
                filled
                dense
              />
              <q-input
                v-model="patchPolicy.max_deferral_days"
                label="Max Deferral Days"
                type="number"
                filled
                dense
              />
              <q-checkbox
                v-model="patchPolicy.auto_reboot"
                label="Enable Auto Reboot"
                dense
              />
            </div>

            <div class="text-subtitle1 q-mt-md">
              Auto Approve Classifications
            </div>
            <div class="q-gutter-md">
              <q-checkbox
                v-model="patchPolicy.include_critical_updates"
                label="Critical Updates"
                dense
              />
              <q-checkbox
                v-model="patchPolicy.include_security_updates"
                label="Security Updates"
                dense
              />
              <q-checkbox
                v-model="patchPolicy.include_optional_updates"
                label="Optional Updates"
                dense
              />
              <q-checkbox
                v-model="patchPolicy.include_preview_updates"
                label="Preview Updates"
                dense
              />
              <q-checkbox
                v-model="patchPolicy.include_hardware_updates"
                label="Hardware Updates"
                dense
              />
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="text-subtitle1">Scan Schedule</div>
            <div class="q-gutter-md">
              <q-select
                v-model="patchPolicy.scan_schedule.frequency"
                label="Frequency"
                :options="scheduleFrequencyOptions"
                emit-value
                filled
                dense
              />
              <q-input
                v-model="patchPolicy.scan_schedule.time"
                label="Time (HH:MM)"
                :rules="[
                  (val) =>
                    /^[0-2]\\d:[0-5]\\d$/.test(val) ||
                    'Invalid time format (HH:MM)',
                ]"
                hide-bottom-space
                filled
                dense
              />
              <q-input
                v-if="patchPolicy.scan_schedule.frequency === 'weekly'"
                v-model="patchPolicy.scan_schedule.day_of_week"
                label="Day of Week"
                :rules="[
                  (val) =>
                    !!val || 'Day of week is required for weekly schedules',
                ]"
                hide-bottom-space
                filled
                dense
              />
              <q-input
                v-else-if="patchPolicy.scan_schedule.frequency === 'monthly'"
                v-model="patchPolicy.scan_schedule.day_of_month"
                label="Day of Month"
                type="number"
                :rules="[
                  (val) =>
                    (val > 0 && val <= 31) ||
                    'Day of month must be between 1 and 31',
                ]"
                hide-bottom-space
                filled
                dense
              />
            </div>
            <div class="text-subtitle1 q-mt-md">Install Schedule</div>
            <div class="q-gutter-md">
              <q-select
                v-model="patchPolicy.install_schedule.frequency"
                label="Frequency"
                :options="scheduleFrequencyOptions"
                emit-value
                filled
                dense
              />
              <q-input
                v-model="patchPolicy.install_schedule.time"
                label="Time (HH:MM)"
                :rules="[
                  (val) =>
                    /^[0-2]\\d:[0-5]\\d$/.test(val) ||
                    'Invalid time format (HH:MM)',
                ]"
                filled
                dense
              />
              <q-input
                v-if="patchPolicy.install_schedule.frequency === 'weekly'"
                v-model="patchPolicy.install_schedule.day_of_week"
                label="Day of Week"
                :rules="[
                  (val) =>
                    !!val || 'Day of week is required for weekly schedules',
                ]"
                filled
                dense
              />
              <q-input
                v-else-if="patchPolicy.install_schedule.frequency === 'monthly'"
                v-model="patchPolicy.install_schedule.day_of_month"
                label="Day of Month"
                type="number"
                :rules="[
                  (val) =>
                    (val > 0 && val <= 31) ||
                    'Day of month must be between 1 and 31',
                ]"
                filled
                dense
              />
            </div>
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="text-subtitle1 q-mt-md">Notifications</div>
            <div class="q-gutter-md">
              <q-checkbox
                v-model="patchPolicy.notifications.notify_on_failure"
                label="Notify on Failure"
                dense
              />
              <q-checkbox
                v-model="patchPolicy.notifications.notify_on_success"
                label="Notify on Success"
                dense
              />

              <!-- TODO: Test for valid email-->
              <q-input v-model="recipientsInput" filled dense label="Email">
                <template v-slot:append>
                  <q-btn
                    round
                    dense
                    flat
                    icon="add"
                    @click="
                      patchPolicy.notifications.recipients.push(
                        recipientsInput,
                      );
                      recipientsInput = '';
                    "
                  />
                </template>
              </q-input>

              <q-list>
                <q-item
                  v-for="item in patchPolicy.notifications.recipients"
                  :key="item"
                >
                  <q-item-section>
                    <q-item-label>{{ item }}</q-item-label>
                  </q-item-section>

                  <q-item-section side>
                    <q-btn
                      icon="close"
                      color="negative"
                      dense
                      flat
                      @click="
                        patchPolicy.notifications.recipients.splice(
                          patchPolicy.notifications.recipients.indexOf(item),
                          1,
                        )
                      "
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>
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
import { reactive, computed, ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { usePatchPolicyShared } from "../api";
import { PatchPolicy } from "../types";

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const { addPatchPolicy, editPatchPolicy, isLoading } = usePatchPolicyShared;

const props = defineProps<{
  patchPolicy?: PatchPolicy;
}>();

const patchPolicy = reactive<PatchPolicy>(
  props.patchPolicy
    ? { ...props.patchPolicy }
    : {
        id: 0,
        name: "",
        description: "",
        scan_schedule: {
          frequency: "daily",
          time: "",
          day_of_week: "",
          day_of_month: undefined,
        },
        install_schedule: {
          frequency: "daily",
          time: "",
          day_of_week: "",
          day_of_month: undefined,
        },
        include_critical_updates: false,
        include_security_updates: false,
        include_optional_updates: false,
        include_preview_updates: false,
        include_hardware_updates: false,
        max_deferral_days: undefined,
        auto_reboot: false,
        notifications: {
          notify_on_failure: false,
          notify_on_success: false,
          recipients: [],
        },
        patches_approved: [],
        patches_not_approved: [],
        patches_uninstall: [],
        excluded_clients: [],
        excluded_sites: [],
        excluded_agents: [],
      },
);

const scheduleFrequencyOptions = ["daily", "weekly", "monthly"];

const isEditMode = computed(() => !!props.patchPolicy);
const recipientsInput = ref("");

function submit() {
  // TODO: check form for validation errors prior to sending
  if (isEditMode.value && props.patchPolicy) {
    editPatchPolicy(props.patchPolicy.id, patchPolicy);
  } else {
    addPatchPolicy(patchPolicy);
  }

  // TODO: Error handling
  onDialogOK();
}
</script>
