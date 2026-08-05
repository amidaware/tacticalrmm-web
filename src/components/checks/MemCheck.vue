<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{
          check
            ? $t("checks.memory.dialog.editTitle")
            : $t("checks.memory.dialog.addTitle")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("checks.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="submit(onDialogOK)">
        <div style="max-height: 70vh" class="scroll">
          <q-card-section>
            <q-input
              dense
              outlined
              type="number"
              v-model.number="state.warning_threshold"
              :label="$t('checks.memory.fields.warningThreshold')"
              :rules="[
                (val) =>
                  val >= 0 ||
                  $t('checks.validation.minimumThreshold', { min: 0 }),
                (val) =>
                  val < 100 ||
                  $t('checks.validation.maximumThreshold', { max: 99 }),
              ]"
            />
          </q-card-section>
          <q-card-section>
            <q-input
              dense
              outlined
              type="number"
              v-model.number="state.error_threshold"
              :label="$t('checks.memory.fields.errorThreshold')"
              :rules="[
                (val) =>
                  val >= 0 ||
                  $t('checks.validation.minimumThreshold', { min: 0 }),
                (val) =>
                  val < 100 ||
                  $t('checks.validation.maximumThreshold', { max: 99 }),
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
        </div>
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

export default {
  name: "MemCheck",
  emits: [...useDialogPluginComponent.emits],
  props: {
    check: Object,
    parent: Object, // {agent: agent.agent_id} or {policy: policy.id}
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // check logic
    const { state, loading, submit, failOptions } = useCheckModal({
      editCheck: props.check,
      initialState: {
        ...props.parent,
        check_type: "memory",
        warning_threshold: 70,
        error_threshold: 85,
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
