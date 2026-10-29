<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{ check ? $gettext("Edit Disk Check") : $gettext("Add Disk Check") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>

      <q-form @submit.prevent="submit(onDialogOK)">
        <div style="max-height: 70vh" class="scroll">
          <q-card-section>
            <q-select
              dense
              :disable="!!check"
              outlined
              v-model="state.disk"
              :options="diskOptions"
              :label="$gettext('Disk')"
              :rules="[(val) => !!val || $gettext('*Required')]"
            />
          </q-card-section>
          <q-card-section>
            <q-input
              dense
              outlined
              type="number"
              v-model.number="state.warning_threshold"
              :label="$gettext('Warning Threshold Remaining (%)')"
              :rules="[
                (val) =>
                  val >= 0 ||
                  $gettext('Minimum threshold is %{min}', { min: 0 }),
                (val) =>
                  val < 100 ||
                  $gettext('Maximum threshold is %{max}', { max: 99 }),
              ]"
            />
          </q-card-section>
          <q-card-section>
            <q-input
              dense
              outlined
              type="number"
              v-model.number="state.error_threshold"
              :label="$gettext('Error Threshold Remaining (%)')"
              :rules="[
                (val) =>
                  val >= 0 ||
                  $gettext('Minimum threshold is %{min}', { min: 0 }),
                (val) =>
                  val < 100 ||
                  $gettext('Maximum threshold is %{max}', { max: 99 }),
              ]"
            />
          </q-card-section>
          <q-card-section>
            <q-select
              outlined
              dense
              options-dense
              v-model="state.fails_b4_alert"
              :options="failOptions"
              :label="$gettext('Number of consecutive failures before alert')"
            />
          </q-card-section>
          <q-card-section>
            <q-input
              dense
              outlined
              type="number"
              v-model.number="state.run_interval"
              :label="$gettext('Run this check every (seconds)')"
              :hint="
                $gettext(
                  'Setting this value to anything other than 0 will override the \u0027Run checks every\u0027 setting on the agent',
                )
              "
            />
          </q-card-section>
        </div>
        <q-card-actions align="right">
          <q-btn dense flat :label="$gettext('Cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            :label="$gettext('Save')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { useDialogPluginComponent } from "quasar";
import { useCheckModal } from "@/composables/checks";

export default {
  name: "DiskSpaceCheck",
  emits: [...useDialogPluginComponent.emits],
  props: {
    check: Object,
    parent: Object, // {agent: agent.agent_id} or {policy: policy.id} only when adding
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // check logic
    const { state, loading, submit, failOptions, diskOptions } = useCheckModal({
      editCheck: props.check,
      initialState: {
        ...props.parent,
        disk: null,
        check_type: "diskspace",
        warning_threshold: 25,
        error_threshold: 10,
        fails_b4_alert: 1,
        run_interval: 0,
      },
    });

    return {
      // reactive data
      state,
      loading,

      // non-reactive data
      failOptions,
      diskOptions,

      // methods
      submit,

      // quasar dialog
      dialogRef,
      onDialogHide,
      onDialogOK,
    };
  },
};
</script>
