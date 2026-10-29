<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="dialog-plugin" style="min-width: 30vw">
      <q-bar>
        {{
          $gettext("Schedule reboot on %{hostname}", {
            hostname: agent.hostname,
          })
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-input
          type="datetime-local"
          dense
          :label="$gettext('Reboot time')"
          stack-label
          filled
          v-model="state.datetime"
          :hint="$gettext('Uses the agent\u0027s local time zone')"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn dense flat push :label="$gettext('Cancel')" v-close-popup />
        <q-btn
          :loading="loading"
          dense
          flat
          push
          :label="$gettext('Schedule Reboot')"
          color="primary"
          @click="scheduleReboot"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { gettext } from "@/gettext";
// composition imports
import { ref } from "vue";
import { useQuasar, useDialogPluginComponent, date } from "quasar";
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
          title: gettext.$gettext("Reboot pending"),
          style: "width: 40vw",
          message: gettext.$gettext(
            "A reboot has been scheduled for %{time} on %{hostname}. It can be cancelled from the Pending Actions menu until the scheduled time.",
            {
              time: ret.time,
              hostname: props.agent.hostname,
            },
          ),
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
