<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{ check ? $gettext("Edit Ping Check") : $gettext("Add Ping Check") }}
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
            <q-input
              outlined
              dense
              v-model="state.name"
              :label="$gettext('Descriptive Name')"
              :rules="[(val) => !!val || $gettext('*Required')]"
            />
          </q-card-section>
          <q-card-section>
            <q-input
              dense
              outlined
              v-model="state.ip"
              :label="$gettext('Hostname or IP')"
              :rules="[(val) => !!val || $gettext('*Required')]"
            />
          </q-card-section>
          <q-card-section>
            <q-select
              outlined
              dense
              options-dense
              emit-value
              map-options
              v-model="state.alert_severity"
              :options="severityOptions"
              :label="
                $pgettext('Monitoring check configuration', 'Alert Severity')
              "
            />
          </q-card-section>
          <q-card-section>
            <q-select
              outlined
              dense
              options-dense
              map-options
              emit-value
              v-model="state.fails_b4_alert"
              :options="failOptions"
              :label="$gettext('Number of consecutive failures before alert')"
            />
          </q-card-section>
          <q-card-section>
            <q-input
              outlined
              dense
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
  name: "PingCheck",
  emits: [...useDialogPluginComponent.emits],
  props: {
    check: Object,
    parent: Object, // {agent: agent.agent_id} or {policy: policy.id}
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // check logic
    const { state, loading, submit, failOptions, severityOptions } =
      useCheckModal({
        editCheck: props.check,
        initialState: {
          ...props.parent,
          check_type: "ping",
          name: null,
          ip: null,
          alert_severity: "warning",
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
      severityOptions,

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
