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
            <div class="text-subtitle1">Schedules</div>
            <div class="q-col-gutter-md">
              <q-select
                v-model="patchPolicy.scan_schedule"
                :options="patchScheduleOptions"
                label="Scan Schedule"
                emit-value
                map-options
                filled
                dense
                clearable
              />

              <q-select
                v-model="patchPolicy.install_schedule"
                :options="patchScheduleOptions"
                label="Install Schedule"
                emit-value
                map-options
                filled
                dense
                clearable
              />

              <q-select
                v-model="patchPolicy.reboot_schedule"
                :options="patchScheduleOptions"
                label="Reboot Schedule"
                emit-value
                map-options
                filled
                dense
                clearable
              />
            </div>
            <q-btn
              class="q-mt-md"
              label="Patch Classification Schedules"
              no-caps
              color="secondary"
              @click="openPatchClassificationScheduleForm"
            />
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
          <div class="col-12 col-md-6" v-if="isEditMode">
            <div class="text-subtitle1 q-mt-md">Actions</div>
            <div class="q-gutter-sm">
              <q-btn
                label="Edit Exclusions"
                no-caps
                color="secondary"
                @click="openPatchPolicyExclusionsForm"
              />
              <q-btn
                label="Edit Applied Patches"
                no-caps
                color="secondary"
                @click="openPatchPolicyPatchForm"
              />
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
import { useDialogPluginComponent, useQuasar, extend } from "quasar";
import { usePatchPolicyShared } from "../api";
import { usePatchScheduleDropdown } from "../composables";
import { PatchPolicy } from "../types";

// ui imports
import PatchPolicyExclusionsForm from "./PatchPolicyExclusionsForm.vue";
import PatchPolicyPatchForm from "./PatchPolicyPatchForm.vue";
import PatchClassificationScheduleForm from "./PatchClassificationScheduleForm.vue";

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const $q = useQuasar();

const { addPatchPolicy, editPatchPolicy, isLoading } = usePatchPolicyShared;
const { patchScheduleOptions } = usePatchScheduleDropdown();

const props = defineProps<{
  patchPolicy?: PatchPolicy;
}>();

const patchPolicy = reactive<PatchPolicy>(
  props.patchPolicy
    ? extend(true, {}, props.patchPolicy)
    : {
        id: 0,
        name: "",
        description: "",
        scan_schedule: undefined,
        install_schedule: undefined,
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
        applied_agents: [],
        applied_clients: [],
        applied_sites: [],
      },
);

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

function openPatchPolicyExclusionsForm() {
  $q.dialog({
    component: PatchPolicyExclusionsForm,
    componentProps: {
      patchPolicy,
    },
  });
}

function openPatchPolicyPatchForm() {
  $q.dialog({
    component: PatchPolicyPatchForm,
    componentProps: {
      patchPolicy,
    },
  });
}

function openPatchClassificationScheduleForm() {
  $q.dialog({
    component: PatchClassificationScheduleForm,
    componentProps: {
      patchPolicy,
    },
  });
}
</script>
