<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 40vw">
      <q-bar>
        {{ $t("clients.newDeployment.title") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary" />
        </q-btn>
      </q-bar>
      <q-card-section>
        <tactical-dropdown
          :rules="[(val) => !!val || $t('clients.validation.required')]"
          outlined
          :label="$t('common.site')"
          v-model="state.site"
          :options="siteOptions"
          mapOptions
          filterable
        />
      </q-card-section>
      <q-card-section>
        <div class="q-pl-sm">{{ $t("clients.newDeployment.agentType") }}</div>
        <q-radio
          v-model="state.agenttype"
          val="server"
          :label="$t('clients.newDeployment.server')"
          @update:model-value="power = false"
        />
        <q-radio
          v-model="state.agenttype"
          val="workstation"
          :label="$t('clients.newDeployment.workstation')"
        />
      </q-card-section>
      <q-card-section>
        <q-input
          type="datetime-local"
          dense
          :label="$t('clients.newDeployment.expiry')"
          stack-label
          filled
          v-model="state.expires"
        />
      </q-card-section>
      <q-card-section class="q-gutter-sm">
        <q-checkbox
          v-model="state.rdp"
          dense
          :label="$t('clients.newDeployment.enableRdp')"
        />
        <q-checkbox
          v-model="state.ping"
          dense
          :label="$t('clients.newDeployment.enablePing')"
        />
        <q-checkbox
          v-model="state.power"
          dense
          v-show="state.agenttype === 'workstation'"
          :label="$t('clients.newDeployment.disableSleep')"
        />
      </q-card-section>
      <q-card-section>
        <div class="q-pl-sm">{{ $t("clients.newDeployment.arch") }}</div>
        <q-radio
          v-model="state.goarch"
          :val="GOARCH_AMD64"
          :label="$t('clients.newDeployment.bit64')"
        />
        <q-radio
          v-model="state.goarch"
          :val="GOARCH_i386"
          :label="$t('clients.newDeployment.bit32')"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn dense flat :label="$t('common.cancel')" v-close-popup />
        <q-btn
          :loading="loading"
          dense
          flat
          :label="$t('common.create')"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref } from "vue";
import { useDialogPluginComponent, date } from "quasar";
import { useSiteDropdown } from "@/composables/clients";
import { saveDeployment } from "@/api/clients";
import { notifySuccess } from "@/utils/notify";
import {
  formatDateInputField,
  formatDateStringwithTimezone,
} from "@/utils/format";
import { GOARCH_AMD64, GOARCH_i386 } from "@/constants/constants";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
export default {
  name: "NewDeployment",
  components: {
    TacticalDropdown,
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // setup site dropdown
    const { siteOptions } = useSiteDropdown(true);

    // add deployment logic
    const state = ref({
      site: null,
      expires: formatDateInputField(date.addToDate(Date.now(), { days: 30 })),
      agenttype: "server",
      power: false,
      rdp: false,
      ping: false,
      goarch: GOARCH_AMD64,
    });

    const loading = ref(false);

    async function submit() {
      loading.value = true;

      const data = {
        ...state.value,
      };

      if (data.expires)
        data.expires = formatDateStringwithTimezone(data.expires);

      try {
        const result = await saveDeployment(data);
        notifySuccess(result);
        onDialogOK();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    return {
      // reactive data
      state,
      loading,
      siteOptions,

      // methods
      submit,

      // quasar dialog
      dialogRef,
      onDialogHide,

      // constants
      GOARCH_AMD64,
      GOARCH_i386,
    };
  },
};
</script>
