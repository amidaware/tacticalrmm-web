<template>
  <q-card>
    <q-bar v-if="modal">
      <q-btn
        @click="getDebugLog"
        class="q-mr-sm"
        dense
        flat
        push
        icon="refresh"
      />{{ $t("logs.debugLog.title") }}
      <q-space />
      <q-btn dense flat icon="close" v-close-popup>
        <q-tooltip content-class="bg-white text-primary">{{
          $t("common.close")
        }}</q-tooltip>
      </q-btn>
    </q-bar>
    <q-table
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      class="tabs-tbl-sticky"
      :style="{
        'max-height': tabHeight ? tabHeight : `${$q.screen.height - 33}px`,
      }"
      :rows="debugLog"
      :columns="columns"
      :title="modal ? $t('logs.debugLog.tableTitle') : ''"
      :pagination="{ sortBy: 'entry_time', descending: true, rowsPerPage: 0 }"
      :loading="loading"
      :filter="filter"
      virtual-scroll
      dense
      binary-state-sort
      :rows-per-page-options="[0]"
    >
      <template v-slot:top>
        <q-btn
          v-if="agent"
          class="q-pr-sm"
          dense
          flat
          push
          @click="getDebugLog"
          icon="refresh"
        />
        <tactical-dropdown
          v-if="!agent"
          class="q-pr-sm"
          style="width: 250px"
          v-model="agentFilter"
          :label="$t('logs.debugLog.agentsFilter')"
          :options="agentOptions"
          mapOptions
          outlined
          clearable
          filterable
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 250px"
          v-model="logTypeFilter"
          :label="$t('logs.debugLog.logTypeFilter')"
          :options="logTypeOptions"
          mapOptions
          outlined
          clearable
        />
        <q-radio
          v-model="logLevelFilter"
          :color="dash_info_color"
          val="info"
          :label="$t('logs.debugLog.info')"
        />
        <q-radio
          v-model="logLevelFilter"
          :color="dash_negative_color"
          val="critical"
          :label="$t('logs.debugLog.critical')"
        />
        <q-radio
          v-model="logLevelFilter"
          :color="dash_negative_color"
          val="error"
          :label="$t('common.error')"
        />
        <q-radio
          v-model="logLevelFilter"
          :color="dash_warning_color"
          val="warning"
          :label="$t('logs.debugLog.warning')"
        />
        <q-space />
        <q-input
          v-model="filter"
          outlined
          :label="$t('common.search')"
          dense
          clearable
          class="q-pr-sm"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="primary" />
          </template>
        </q-input>
        <export-table-btn :data="debugLog" :columns="columns" />
      </template>

      <template v-slot:top-row>
        <q-tr v-if="Array.isArray(debugLog) && debugLog.length === 1000">
          <q-td colspan="100%">
            <q-icon name="warning" :color="dash_warning_color" />
            {{ $t("logs.debugLog.resultsLimited") }}
          </q-td>
        </q-tr>
      </template>

      <template v-slot:body-cell-entry_time="props">
        <q-td :props="props">
          {{ formatDate(props.value) }}
        </q-td>
      </template>
    </q-table>
  </q-card>
</template>

<script>
// composition api
import { ref, toRef, watch, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useAgentDropdown } from "@/composables/agents";
import { fetchDebugLog } from "@/api/logs";
import { formatTableColumnText } from "@/utils/format";
import { t } from "@/i18n";

// ui components
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";

// static data
const logTypeOptions = [
  { label: t("logs.debugLog.logTypes.agentUpdate"), value: "agent_update" },
  { label: t("logs.debugLog.logTypes.agentIssues"), value: "agent_issues" },
  {
    label: t("logs.debugLog.logTypes.windowsUpdates"),
    value: "windows_updates",
  },
  {
    label: t("logs.debugLog.logTypes.systemIssues"),
    value: "system_issues",
  },
  { label: t("logs.debugLog.logTypes.scripting"), value: "scripting" },
];

const columns = [
  {
    name: "entry_time",
    label: t("logs.shared.time"),
    field: "entry_time",
    align: "left",
    sortable: true,
  },
  {
    name: "log_level",
    label: t("logs.debugLog.columns.logLevel"),
    field: "log_level",
    align: "left",
    sortable: true,
  },
  {
    name: "agent",
    label: t("common.agent"),
    field: "agent",
    align: "left",
    sortable: true,
  },
  {
    name: "log_type",
    label: t("logs.debugLog.columns.logType"),
    field: "log_type",
    align: "left",
    sortable: true,
    format: (val) => formatTableColumnText(val),
  },
  {
    name: "message",
    label: t("logs.shared.message"),
    field: "message",
    align: "left",
    sortable: true,
  },
];

export default {
  name: "LogModal",
  components: {
    TacticalDropdown,
    ExportTableBtn,
  },
  props: {
    agent: String,
    tabHeight: String,
    modal: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    // setup vuex
    const store = useStore();

    const formatDate = computed(() => store.getters.formatDate);
    const dash_info_color = computed(() => store.state.dash_info_color);
    const dash_positive_color = computed(() => store.state.dash_positive_color);
    const dash_negative_color = computed(() => store.state.dash_negative_color);
    const dash_warning_color = computed(() => store.state.dash_warning_color);

    // setup dropdowns
    const { agentOptions, getAgentOptions } = useAgentDropdown();

    // set main debug log functionality
    const debugLog = ref([]);
    const agentFilter = props.agent ? toRef(props, "agent") : ref(null);
    const logLevelFilter = ref("info");
    const logTypeFilter = ref(null);
    const loading = ref(false);
    const filter = ref("");

    async function getDebugLog() {
      loading.value = true;
      try {
        const data = {
          logLevelFilter: logLevelFilter.value,
        };
        if (agentFilter.value) data["agentFilter"] = agentFilter.value;
        if (logTypeFilter.value) data["logTypeFilter"] = logTypeFilter.value;

        debugLog.value = await fetchDebugLog(data);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    if (props.agent) {
      watch(
        () => props.agent,
        (newValue) => {
          if (newValue) {
            agentFilter.value = props.agent;
            getDebugLog();
          }
        },
      );
    }

    // watchers
    watch([logLevelFilter, agentFilter, logTypeFilter], getDebugLog);

    // vue component hooks
    onMounted(() => {
      if (!props.agent) getAgentOptions();
      getDebugLog();
    });

    return {
      // data
      debugLog,
      logLevelFilter,
      logTypeFilter,
      agentFilter,
      agentOptions,
      loading,
      filter,
      dash_info_color,
      dash_positive_color,
      dash_warning_color,
      dash_negative_color,

      // non-reactive data
      columns,
      logTypeOptions,

      // methods
      getDebugLog,
      formatDate,
    };
  },
};
</script>
