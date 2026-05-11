<template>
  <div v-if="!selectedAgent" class="q-pa-sm">
    {{ $t("agents.shared.noAgentSelected") }}
  </div>
  <div v-else>
    <q-table
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      :rows="history"
      :columns="columns"
      :pagination="{ sortBy: 'time', descending: true, rowsPerPage: 0 }"
      :style="{ 'max-height': tabHeight }"
      :loading="loading"
      :rows-per-page-options="[0]"
      :filter="filter"
      virtual-scroll
      dense
      binary-state-sort
    >
      <template v-slot:top>
        <q-btn dense flat push @click="getHistory" icon="refresh" />
        <q-space />
        <q-input
          v-model="filter"
          outlined
          :label="$t('common.buttons.search')"
          dense
          clearable
          class="q-pr-sm"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="primary" />
          </template>
        </q-input>
        <export-table-btn :data="history" :columns="columns" />
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template v-slot:body-cell-output="props">
        <q-td :props="props">
          <span
            style="cursor: pointer; text-decoration: underline"
            class="text-primary"
            @click="
              props.row.type === 'cmd_run'
                ? showCommandOutput(props.row.command, props.row.results)
                : showScriptOutput(props.row.script_results)
            "
            >{{ $t("agents.historyTab.output") }}
          </span>
        </q-td>
      </template>

      <template v-slot:body-cell-time="props">
        <q-td :props="props">
          {{ formatDate(props.row.time) }}
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script>
// composition imports
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, Notify } from "quasar";
import { useI18n } from "vue-i18n";
import { formatTableColumnText, truncateText } from "@/utils/format";
import { fetchAgentHistory } from "@/api/agents";

// ui imports
import ScriptOutput from "@/components/checks/ScriptOutput.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import PreDialog from "@/components/ui/PreDialog.vue";

export default {
  name: "HistoryTab",
  components: {
    ExportTableBtn,
  },
  setup() {
    const $q = useQuasar();
    const { t } = useI18n();

    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const tabHeight = computed(() => store.state.tabHeight);
    const formatDate = computed(() => store.getters.formatDate);

    // setup main history functionality
    const history = ref([]);
    const loading = ref(false);
    const filter = ref("");

    const columns = computed(() => [
      {
        name: "time",
        label: t("agents.historyTab.columns.time"),
        field: "time",
        align: "left",
        sortable: true,
      },
      {
        name: "type",
        label: t("agents.historyTab.columns.action"),
        field: "type",
        align: "left",
        sortable: true,
        format: (val) => getHistoryActionLabel(val),
      },
      {
        name: "command",
        label: t("agents.historyTab.columns.scriptCommand"),
        field: (row) =>
          row.type === "script_run" ? row.script_name : row.command,
        align: "left",
        sortable: true,
        format: (val) => truncateText(val, 30),
      },
      {
        name: "username",
        label: t("agents.historyTab.columns.initiatedBy"),
        field: "username",
        align: "left",
        sortable: true,
      },
      {
        name: "output",
        label: t("agents.historyTab.columns.output"),
        field: "output",
        align: "left",
        sortable: true,
      },
    ]);

    async function getHistory() {
      loading.value = true;
      history.value = await fetchAgentHistory(selectedAgent.value);
      loading.value = false;
    }

    function getHistoryActionLabel(actionType) {
      if (!actionType) return actionType;
      const actionKey = `agents.historyTab.actions.${actionType}`;
      return t(actionKey) !== actionKey
        ? t(actionKey)
        : formatTableColumnText(actionType);
    }

    watch(selectedAgent, (newValue) => {
      if (newValue) {
        getHistory();
      }
    });

    // quasar dialogs
    function showScriptOutput(output) {
      if (!output) {
        Notify.create({
          message: t("agents.historyTab.noOutputYet"),
          type: "negative",
        });
        return;
      }
      $q.dialog({
        component: ScriptOutput,
        componentProps: {
          scriptInfo: output,
        },
      });
    }

    function showCommandOutput(title, output) {
      $q.dialog({
        component: PreDialog,
        componentProps: {
          title: title,
          dialogStyle: "width: 70vw; max-width: 80vw",
          message: output,
        },
      });
    }

    // vue component hooks
    onMounted(() => {
      if (selectedAgent.value) getHistory();
    });

    return {
      // reactive
      history,
      loading,
      tabHeight,
      filter,

      // non-reactive data
      columns,

      // methods
      formatDate,
      showScriptOutput,
      showCommandOutput,
      getHistory,
      truncateText,

      // computed
      selectedAgent,
    };
  },
};
</script>
