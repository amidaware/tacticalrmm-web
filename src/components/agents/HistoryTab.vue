<template>
  <div v-if="!selectedAgent" class="q-pa-sm">No agent selected</div>
  <div v-else>
    <q-table
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      :rows="filteredHistory"
      :columns="columns"
      v-model:pagination="pagination"
      :style="{ 'max-height': tabHeight }"
      :loading="loading"
      :rows-per-page-options="[25, 50, 100, 250, 500, 1000]"
      virtual-scroll
      dense
      binary-state-sort
      @request="onRequest"
    >
      <template v-slot:top>
        <q-btn dense flat push @click="getHistory" icon="refresh" />
        <q-space />
        <q-input
          v-model="filter"
          outlined
          label="Search"
          dense
          clearable
          class="q-pr-sm"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="primary" />
          </template>
        </q-input>
        <export-table-btn :data="filteredHistory" :columns="columns" />
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
            >Output
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
import { formatTableColumnText, truncateText } from "@/utils/format";
import { fetchAgentHistory } from "@/api/agents";

// ui imports
import ScriptOutput from "@/components/checks/ScriptOutput.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import PreDialog from "@/components/ui/PreDialog.vue";

// static data
const columns = [
  {
    name: "time",
    label: "Time",
    field: "time",
    align: "left",
    sortable: true,
  },
  {
    name: "type",
    label: "Action",
    field: "type",
    align: "left",
    sortable: true,
    format: (val) => formatTableColumnText(val),
  },
  /* {
    name: "status",
    label: "Status",
    field: "status",
    align: "left",
    sortable: true,
    format: (val, row) => formatTableColumnText(val),
  }, */
  {
    name: "command",
    label: "Script/Command",
    field: (row) => (row.type === "script_run" ? row.script_name : row.command),
    align: "left",
    sortable: true,
    format: (val) => truncateText(val, 30),
  },
  {
    name: "username",
    label: "Initiated By",
    field: "username",
    align: "left",
    sortable: true,
  },
  {
    name: "output",
    label: "Output",
    field: "output",
    align: "left",
    sortable: false,
  },
];

export default {
  name: "HistoryTab",
  components: {
    ExportTableBtn,
  },
  setup() {
    const $q = useQuasar();

    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const tabHeight = computed(() => store.state.tabHeight);
    const formatDate = computed(() => store.getters.formatDate);

    // setup main history functionality
    const history = ref([]);
    const loading = ref(false);
    const filter = ref("");
    const pagination = ref({
      sortBy: "time",
      descending: true,
      page: 1,
      rowsPerPage: 100,
      rowsNumber: 0,
    });

    const filteredHistory = computed(() => {
      if (!filter.value) return history.value;
      const needle = filter.value.toLowerCase();
      return history.value.filter((row) =>
        [
          formatDate.value(row.time),
          formatTableColumnText(row.type),
          row.type === "script_run" ? row.script_name : row.command,
          row.username,
        ].some((val) => val && String(val).toLowerCase().includes(needle)),
      );
    });

    async function onRequest(props) {
      const { page, rowsPerPage, sortBy, descending } = props.pagination;
      loading.value = true;
      const data = await fetchAgentHistory(selectedAgent.value, {
        page: page,
        page_size: rowsPerPage,
        ordering: `${descending ? "-" : ""}${sortBy || "time"}`,
      });
      if (data) {
        history.value = data.results;
        pagination.value = {
          page,
          rowsPerPage,
          sortBy,
          descending,
          rowsNumber: data.count,
        };
      }
      loading.value = false;
    }

    function getHistory() {
      onRequest({ pagination: pagination.value });
    }

    watch(selectedAgent, (newValue) => {
      if (newValue) {
        pagination.value.page = 1;
        getHistory();
      }
    });

    // quasar dialogs
    function showScriptOutput(output) {
      if (!output) {
        Notify.create({
          message: "No output is available yet",
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
      filteredHistory,
      loading,
      tabHeight,
      filter,
      pagination,

      // non-reactive data
      columns,

      // methods
      formatDate,
      showScriptOutput,
      showCommandOutput,
      getHistory,
      onRequest,
      truncateText,

      // computed
      selectedAgent,
    };
  },
};
</script>
