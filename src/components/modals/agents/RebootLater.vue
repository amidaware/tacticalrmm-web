<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="dialog-plugin" style="min-width: 30vw">
      <q-bar>
        {{ $t("agents.rebootLater.title", { hostname: agent.hostname }) }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-input
          type="datetime-local"
          dense
          :label="$t('agents.rebootLater.rebootTime')"
          stack-label
          filled
          v-model="state.datetime"
          :hint="$t('agents.rebootLater.localTimeZoneHint')"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          dense
          flat
          push
          :label="$t('common.buttons.cancel')"
          v-close-popup
        />
        <q-btn
          :loading="loading"
          dense
          flat
          push
          :label="$t('agents.rebootLater.scheduleReboot')"
          color="primary"
          @click="scheduleReboot"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref } from "vue";
import { useQuasar, useDialogPluginComponent, date } from "quasar";
import { useI18n } from "vue-i18n";
import { scheduleAgentReboot } from "@/api/agents";
import { formatDateInputField } from "@/utils/format";

export default {
  name: "RebootLater",
  emits: [...useDialogPluginComponent.emits],
  props: {
    agent: !Object,
  },
  setup(props) {
    // setup quasar dialog plugin
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
    const $q = useQuasar();
    const { t } = useI18n();

    // setup reboot later logic
    const state = ref({
      datetime: formatDateInputField(date.addToDate(Date.now(), { hours: 1 })),
    });
    const loading = ref(false);

    async function scheduleReboot() {
      loading.value = true;

      try {
        const ret = await scheduleAgentReboot(
          props.agent.agent_id,
          state.value,
        );
        $q.dialog({
          title: t("agents.rebootLater.rebootPending"),
          style: "width: 40vw",
          message: t("agents.rebootLater.rebootScheduledMessage", {
            time: ret.time,
            hostname: props.agent.hostname,
          }),
        }).onDismiss(onDialogOK);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    return {
      // reactive data
      state,
      loading,

      // methods
      scheduleReboot,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
