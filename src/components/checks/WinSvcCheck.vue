<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{
          check ? $gettext("Edit Service Check") : $gettext("Add Service Check")
        }}
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
            <!-- policy check, either choose from a list of default services or enter manually -->
            <q-radio
              v-if="isPolicy && !check"
              v-model="state.svc_policy_mode"
              val="default"
              :label="$gettext('Choose from defaults')"
            />
            <q-radio
              v-if="isPolicy && !check"
              v-model="state.svc_policy_mode"
              val="manual"
              :label="$gettext('Enter manually')"
            />
            <q-select
              v-if="isPolicy && state.svc_policy_mode === 'default' && !check"
              :rules="[(val) => !!val || $gettext('*Required')]"
              dense
              options-dense
              outlined
              v-model="state.svc_name"
              :options="serviceOptions"
              :label="$gettext('Service')"
              map-options
              emit-value
              :disable="!!check"
            />
            <q-input
              v-if="isPolicy && state.svc_policy_mode === 'manual'"
              :rules="[(val) => !!val || $gettext('*Required')]"
              outlined
              dense
              v-model="state.svc_name"
              :label="$gettext('Service Name')"
            />
            <q-input
              v-if="isPolicy && state.svc_policy_mode === 'manual'"
              :rules="[(val) => !!val || $gettext('*Required')]"
              outlined
              dense
              v-model="state.svc_display_name"
              :label="$pgettext('Service checks', 'Display Name')"
            />
            <!-- agent check -->
            <!-- disable selection if editing -->
            <q-select
              v-if="isAgent"
              :rules="[(val) => !!val || $gettext('*Required')]"
              dense
              options-dense
              outlined
              v-model="state.svc_name"
              :options="serviceOptions"
              :label="$gettext('Service')"
              map-options
              emit-value
              :disable="!!check"
            />
          </q-card-section>
          <q-card-section>
            <q-checkbox
              v-model="state.pass_if_start_pending"
              :label="
                $gettext('PASS if service is in \u0027Start Pending\u0027 mode')
              "
            />
            <br />
            <q-checkbox
              v-model="state.pass_if_svc_not_exist"
              :label="$gettext('PASS if service doesn\u0027t exist')"
            />
            <br />
            <q-checkbox
              v-model="state.restart_if_stopped"
              :label="$gettext('Restart service if it\u0027s stopped')"
            />
          </q-card-section>
          <q-card-section>
            <q-select
              outlined
              dense
              options-dense
              map-options
              emit-value
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
import { computed, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useCheckModal } from "@/composables/checks";

export default {
  name: "WinSvcCheck",
  emits: [...useDialogPluginComponent.emits],
  props: {
    check: Object,
    parent: Object, // {agent: agent.agent_id} or {policy: policy.id}
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // check logic
    const {
      state,
      loading,
      submit,
      failOptions,
      severityOptions,
      serviceOptions,
    } = useCheckModal({
      editCheck: props.check,
      initialState: {
        ...props.parent,
        check_type: "winsvc",
        svc_name: null,
        svc_display_name: null,
        svc_policy_mode: null,
        pass_if_start_pending: false,
        pass_if_svc_not_exist: false,
        restart_if_stopped: false,
        fails_b4_alert: 1,
        alert_severity: "warning",
        run_interval: 0,
      },
    });

    watch(
      () => state.value.svc_name,
      () => {
        // prevent error when in manual mode
        try {
          state.value.svc_display_name = serviceOptions.value.find(
            (i) => i.value === state.value.svc_name,
          ).label;
        } catch {}
      },
    );

    watch(
      () => state.value.svc_policy_mode,
      () => {
        state.value.svc_name = null;
        state.value.svc_display_name = null;
      },
    );

    const isPolicy = computed(() => {
      if (props.check) return !!props.check.policy;
      else return !!props.parent.policy;
    });

    const isAgent = computed(() => {
      if (props.check) return !!props.check.agent;
      else return !!props.parent.agent;
    });

    return {
      // reactive data
      state,
      loading,
      isPolicy,
      isAgent,

      // non-reactive data
      failOptions,
      severityOptions,
      serviceOptions,

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
