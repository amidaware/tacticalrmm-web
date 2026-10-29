<template>
  <div v-if="!selectedAgent" class="q-pa-sm">
    {{ $gettext("No agent selected") }}
  </div>
  <div v-else-if="agentPlatform.toLowerCase() !== 'windows'" class="q-pa-sm">
    {{ $gettext("Only supported for Windows agents at this time") }}
  </div>
  <div v-else>
    <q-tabs
      v-model="tab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
      no-caps
    >
      <q-tab name="os" :label="$gettext('Operating System')" />
      <q-tab name="cpu" :label="$pgettext('Hardware inventory', 'CPU')" />
      <q-tab name="mem" :label="$gettext('Memory')" />
      <q-tab name="usb" :label="$gettext('USB')" />
      <q-tab name="bios" :label="$gettext('Bios')" />
      <q-tab name="disk" :label="$gettext('Disks')" />
      <q-tab name="comp_sys" :label="$gettext('Computer System')" />
      <q-tab name="base_board" :label="$gettext('Motherboard')" />
      <q-tab
        name="comp_sys_prod"
        :label="$gettext('Computer System Product')"
      />
      <q-tab name="network_config" :label="$gettext('Network Config')" />
      <q-tab name="graphics" :label="$gettext('Graphics')" />
      <q-tab name="desktop_monitor" :label="$gettext('Monitors')" />
      <q-tab name="network_adapter" :label="$gettext('Network Adapters')" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="tab">
      <q-tab-panel name="os">
        <WmiDetail :info="assets.os" />
      </q-tab-panel>
      <q-tab-panel name="cpu">
        <WmiDetail :info="assets.cpu" />
      </q-tab-panel>
      <q-tab-panel name="mem">
        <WmiDetail :info="assets.mem" />
      </q-tab-panel>
      <q-tab-panel name="usb">
        <WmiDetail :info="assets.usb" />
      </q-tab-panel>
      <q-tab-panel name="bios">
        <WmiDetail :info="assets.bios" />
      </q-tab-panel>
      <q-tab-panel name="disk">
        <WmiDetail :info="assets.disk" />
      </q-tab-panel>
      <q-tab-panel name="comp_sys">
        <WmiDetail :info="assets.comp_sys" />
      </q-tab-panel>
      <q-tab-panel name="base_board">
        <WmiDetail :info="assets.base_board" />
      </q-tab-panel>
      <q-tab-panel name="comp_sys_prod">
        <WmiDetail :info="assets.comp_sys_prod" />
      </q-tab-panel>
      <q-tab-panel name="network_config">
        <WmiDetail :info="assets.network_config" />
      </q-tab-panel>
      <q-tab-panel name="desktop_monitor">
        <WmiDetail :info="assets.desktop_monitor" />
      </q-tab-panel>
      <q-tab-panel name="graphics">
        <WmiDetail :info="assets.graphics" />
      </q-tab-panel>
      <q-tab-panel name="network_adapter">
        <WmiDetail :info="assets.network_adapter" />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script>
// composition imports
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { fetchAgent } from "@/api/agents";

// ui imports
import WmiDetail from "@/components/agents/WmiDetail.vue";

export default {
  name: "AssetsTab",
  components: { WmiDetail },
  setup() {
    // setup vuex
    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const agentPlatform = computed(() => store.state.agentPlatform);
    const loading = ref(false);

    // assets tab logic
    const assets = ref({});
    const tab = ref("os");

    async function getWMIData() {
      loading.value = true;
      const { wmi_detail } = await fetchAgent(selectedAgent.value);
      assets.value = wmi_detail;
      loading.value = false;
    }

    watch(selectedAgent, (newValue) => {
      if (newValue) {
        getWMIData();
      }
    });

    onMounted(() => {
      if (selectedAgent.value) getWMIData();
    });

    return {
      // reactive data
      assets,
      tab,
      selectedAgent,
      agentPlatform,
    };
  },
};
</script>
