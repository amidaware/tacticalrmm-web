<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{
          check
            ? $t("checks.script.dialog.editTitle")
            : $t("checks.script.dialog.addTitle")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("checks.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section v-if="filterByPlatformOptions.length === 0">
        <p>{{ $t("checks.script.empty.uploadFirst") }}</p>
        <p>{{ $t("checks.script.empty.path") }}</p>
      </q-card-section>

      <q-form v-else @submit.prevent="submit(onDialogOK)">
        <q-card-section>
          <tactical-dropdown
            :rules="[(val) => !!val || $t('checks.validation.required')]"
            outlined
            v-model="state.script"
            :options="filterByPlatformOptions"
            :label="$t('checks.script.fields.selectScript')"
            mapOptions
            :disable="!!check"
            filterable
          />
        </q-card-section>
        <q-card-section>
          <q-select
            dense
            :label="$t('checks.script.fields.scriptArgs')"
            filled
            v-model="state.script_args"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section>
          <q-select
            dense
            :label="$t('checks.script.fields.environmentVars')"
            filled
            v-model="state.env_vars"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            :label="$t('checks.script.fields.infoReturnCodes')"
            filled
            v-model="state.info_return_codes"
            multiple
            hide-dropdown-icon
            use-input
            input-debounce="0"
            new-value-mode="add-unique"
            @new-value="validateRetcode"
          />
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            :label="$t('checks.script.fields.warningReturnCodes')"
            filled
            v-model="state.warning_return_codes"
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add-unique"
            @new-value="validateRetcode"
          />
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            :label="$t('checks.script.fields.successReturnCodes')"
            filled
            v-model="state.success_return_codes"
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add-unique"
            @new-value="validateRetcode"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            outlined
            dense
            v-model.number="state.timeout"
            :label="$t('checks.script.fields.timeoutSeconds')"
          />
        </q-card-section>
        <q-card-section>
          <q-select
            outlined
            dense
            options-dense
            v-model="state.fails_b4_alert"
            :options="failOptions"
            :label="$t('checks.common.fields.failuresBeforeAlert')"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            outlined
            dense
            type="number"
            v-model.number="state.run_interval"
            :label="$t('checks.common.fields.runEverySeconds')"
            :hint="$t('checks.common.hints.runEveryOverride')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn dense flat :label="$t('checks.common.cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            :label="$t('checks.common.save')"
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
import { useScriptDropdown } from "@/composables/scripts";
import { validateRetcode } from "@/utils/validation";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  components: { TacticalDropdown },
  name: "ScriptCheck",
  emits: [...useDialogPluginComponent.emits],
  props: {
    check: Object,
    parent: Object, // {agent: agent.agent_id} or {policy: policy.id}
    plat: String,
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // setup script dropdown
    const {
      script,
      filterByPlatformOptions,
      defaultTimeout,
      defaultArgs,
      defaultEnvVars,
    } = useScriptDropdown({
      script: props.check ? props.check.script : undefined,
      plat: props.plat,
      onMount: true,
    });

    // check logic
    const { state, loading, submit, failOptions, severityOptions } =
      useCheckModal({
        editCheck: props.check,
        initialState: {
          ...props.parent,
          script,
          script_args: defaultArgs,
          env_vars: defaultEnvVars,
          timeout: defaultTimeout,
          check_type: "script",
          fails_b4_alert: 1,
          info_return_codes: [],
          warning_return_codes: [],
          success_return_codes: [],
          run_interval: 0,
        },
      });

    return {
      // reactive data
      state,
      loading,

      // non-reactive data
      failOptions,
      filterByPlatformOptions,
      severityOptions,

      // methods
      submit,
      validateRetcode,

      // quasar dialog
      dialogRef,
      onDialogHide,
      onDialogOK,
    };
  },
};
</script>
