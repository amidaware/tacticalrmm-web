<template>
  <q-card>
    <q-bar v-if="modal">
      <q-btn @click="search" class="q-mr-sm" dense flat push icon="refresh" />
      <q-space />{{ $t("logs.auditManager.title") }}
      <q-space />
      <q-btn dense flat icon="close" v-close-popup>
        <q-tooltip class="bg-white text-primary">{{
          $t("common.close")
        }}</q-tooltip>
      </q-btn>
    </q-bar>
    <q-table
      @request="onRequest"
      :title="modal ? $t('logs.auditManager.tableTitle') : ''"
      :rows="auditLogs"
      :columns="columns"
      class="tabs-tbl-sticky"
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      :style="{
        'max-height': tabHeight ? tabHeight : `${$q.screen.height - 33}px`,
      }"
      row-key="id"
      dense
      binary-state-sort
      v-model:pagination="pagination"
      :rows-per-page-options="[25, 50, 100, 500, 1000]"
      :no-data-label="tableNoDataText"
      @row-click="openAuditDetail"
      virtual-scroll
      :loading="loading"
    >
      <template v-slot:top>
        <q-btn
          v-if="agent"
          class="q-pr-sm"
          dense
          flat
          push
          @click="search"
          icon="refresh"
        />
        <q-option-group
          v-if="!agent"
          class="q-pr-sm"
          v-model="filterType"
          :options="filterTypeOptions"
          color="primary"
        />
        <tactical-dropdown
          v-if="filterType === 'agents' && !agent"
          class="q-pr-sm"
          style="width: 200px"
          v-model="agentFilter"
          :options="agentOptions"
          :label="$t('common.agent')"
          clearable
          mapOptions
          multiple
          filled
          filterable
        />
        <tactical-dropdown
          v-if="filterType === 'clients' && !agent"
          class="q-pr-sm"
          style="width: 200px"
          v-model="clientFilter"
          :options="clientOptions"
          :label="$t('common.clients')"
          clearable
          multiple
          filled
          mapOptions
          filterable
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 200px"
          v-model="userFilter"
          :options="userOptions"
          :label="$t('common.users')"
          clearable
          filled
          multiple
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 200px"
          v-model="actionFilter"
          :options="actionOptions"
          :label="$t('logs.auditManager.action')"
          clearable
          filled
          multiple
          mapOptions
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 200px"
          v-if="!agent"
          v-model="objectFilter"
          :options="objectOptions"
          :label="$t('logs.auditManager.object')"
          clearable
          filled
          multiple
          mapOptions
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 200px"
          v-model="timeFilter"
          :options="timeOptions"
          :label="$t('logs.shared.time')"
          filled
          mapOptions
        />
        <q-btn
          v-if="!agent"
          color="primary"
          :label="$t('common.search')"
          @click="search"
        />

        <q-space />
        <export-table-btn :data="auditLogs" :columns="columns" />
      </template>
      <template v-slot:body-cell-action="props">
        <q-td :props="props">
          <div>
            <q-badge
              :color="formatActionColor(props.value)"
              :label="props.value"
            />
          </div>
        </q-td>
      </template>
      <template v-slot:body-cell-client="props">
        <q-td :props="props">
          <span v-if="props.value">{{ props.value.client_name }}</span>
        </q-td>
      </template>
      <template v-slot:body-cell-site="props">
        <q-td :props="props">
          <span v-if="props.value">{{ props.value.name }}</span>
        </q-td>
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
// composition imports
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { useClientDropdown } from "@/composables/clients";
import { useAgentDropdown } from "@/composables/agents";
import { useUserDropdown } from "@/composables/accounts";
import { useQuasar } from "quasar";
import { fetchAuditLog } from "@/api/logs";
import { formatTableColumnText } from "@/utils/format";
import { t } from "@/i18n";

// ui imported
import AuditLogDetailModal from "@/components/logs/AuditLogDetailModal.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// static data
const columns = [
  {
    name: "entry_time",
    label: t("logs.shared.time"),
    field: "entry_time",
    align: "left",
    sortable: true,
  },
  {
    name: "username",
    label: t("common.username"),
    field: "username",
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
    name: "client",
    label: t("common.client"),
    field: "site",
    align: "left",
    sortable: true,
  },
  {
    name: "site",
    label: t("common.site"),
    field: "site",
    align: "left",
    sortable: true,
  },
  {
    name: "action",
    label: t("logs.auditManager.action"),
    field: "action",
    align: "left",
    sortable: true,
    format: (val) => formatTableColumnText(val),
  },
  {
    name: "object_type",
    label: t("logs.auditManager.object"),
    field: "object_type",
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
  {
    name: "client_ip",
    label: t("logs.auditManager.columns.clientIp"),
    field: "ip_address",
    align: "left",
    sortable: true,
  },
];

const agentActionOptions = [
  { value: "add", label: t("logs.auditManager.actions.addObject") },
  { value: "modify", label: t("logs.auditManager.actions.modifyObject") },
  {
    value: "execute_command",
    label: t("logs.auditManager.actions.executeCommand"),
  },
  {
    value: "execute_script",
    label: t("logs.auditManager.actions.executeScript"),
  },
  {
    value: "remote_session",
    label: t("logs.auditManager.actions.remoteSession"),
  },
  {
    value: "file_transfer",
    label: t("logs.auditManager.actions.fileTransfer"),
  },
  { value: "url_action", label: t("logs.auditManager.actions.urlAction") },
];

const actionOptions = [
  {
    value: "agent_install",
    label: t("logs.auditManager.actions.agentInstalls"),
  },
  { value: "bulk_action", label: t("logs.auditManager.actions.bulkActions") },
  { value: "delete", label: t("logs.auditManager.actions.deleteObject") },
  { value: "failed_login", label: t("logs.auditManager.actions.failedLogin") },
  { value: "login", label: t("logs.auditManager.actions.userLogin") },
  { value: "modify", label: t("logs.auditManager.actions.modifyObject") },
  { value: "task_run", label: t("logs.auditManager.actions.taskRunResults") },
];

const objectOptions = [
  { value: "agent", label: t("common.agent") },
  {
    value: "automatedtask",
    label: t("logs.auditManager.objects.automatedTask"),
  },
  { value: "bulk", label: t("logs.auditManager.objects.bulkActions") },
  { value: "coresettings", label: t("logs.auditManager.objects.coreSettings") },
  { value: "check", label: t("logs.auditManager.objects.check") },
  { value: "client", label: t("common.client") },
  { value: "policy", label: t("logs.auditManager.objects.policy") },
  { value: "site", label: t("common.site") },
  { value: "script", label: t("logs.auditManager.objects.script") },
  { value: "user", label: t("common.user") },
  {
    value: "winupdatepolicy",
    label: t("logs.auditManager.objects.patchPolicy"),
  },
  {
    value: "alerttemplate",
    label: t("logs.auditManager.objects.alertTemplate"),
  },
  { value: "role", label: t("logs.auditManager.objects.role") },
  { value: "urlaction", label: t("logs.auditManager.objects.urlAction") },
  { value: "keystore", label: t("logs.auditManager.objects.globalKeyStore") },
  { value: "customfield", label: t("logs.auditManager.objects.customField") },
  { value: "schedule", label: t("logs.auditManager.objects.schedule") },
  {
    value: "reportschedule",
    label: t("logs.auditManager.objects.reportSchedule"),
  },
];

const timeOptions = [
  { value: 1, label: t("logs.auditManager.times.oneDay") },
  { value: 7, label: t("logs.auditManager.times.oneWeek") },
  { value: 30, label: t("logs.auditManager.times.thirtyDays") },
  { value: 90, label: t("logs.auditManager.times.threeMonths") },
  { value: 180, label: t("logs.auditManager.times.sixMonths") },
  { value: 365, label: t("logs.auditManager.times.oneYear") },
  { value: 0, label: t("logs.auditManager.times.everything") },
];

const filterTypeOptions = [
  {
    label: t("common.clients"),
    value: "clients",
  },
  {
    label: t("common.agents"),
    value: "agents",
  },
];

export default {
  name: "AuditManager",
  components: { TacticalDropdown, ExportTableBtn },
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
    const dash_positive_color = computed(() => store.state.dash_positive_color);
    const dash_negative_color = computed(() => store.state.dash_negative_color);
    const dash_warning_color = computed(() => store.state.dash_warning_color);

    // setup dropdowns
    const { clientOptions, getClientOptions } = useClientDropdown();
    const { agentOptions, getAgentOptions } = useAgentDropdown();
    const { userOptions, getUserOptions } = useUserDropdown();

    // setup main audit log functionality
    const auditLogs = ref([]);
    const agentFilter = ref(null);
    const userFilter = ref(null);
    const actionFilter = ref(null);
    const clientFilter = ref(null);
    const objectFilter = ref(null);
    const timeFilter = ref(7);
    const filterType = ref("clients");
    const loading = ref(false);
    const searched = ref(false);

    const pagination = ref({
      rowsPerPage: 25,
      rowsNumber: null,
      sortBy: "entry_time",
      descending: true,
      page: 1,
    });

    async function search() {
      loading.value = true;
      searched.value = true;

      const data = {
        pagination: pagination.value,
      };

      if (agentFilter.value && agentFilter.value.length > 0)
        data["agentFilter"] = agentFilter.value;
      else if (clientFilter.value && clientFilter.value.length > 0)
        data["clientFilter"] = clientFilter.value;
      if (userFilter.value && userFilter.value.length > 0)
        data["userFilter"] = userFilter.value;
      if (timeFilter.value) data["timeFilter"] = timeFilter.value;
      if (actionFilter.value && actionFilter.value.length > 0)
        data["actionFilter"] = actionFilter.value;
      if (objectFilter.value && objectFilter.value.length > 0)
        data["objectFilter"] = objectFilter.value;
      try {
        const { audit_logs, total } = await fetchAuditLog(data);
        auditLogs.value = audit_logs;
        pagination.value.rowsNumber = total;
      } catch (e) {}

      loading.value = false;
    }

    function onRequest(data) {
      const { page, rowsPerPage, sortBy, descending } = data.pagination;

      pagination.value.page = page;
      pagination.value.rowsPerPage = rowsPerPage;
      pagination.value.sortBy = sortBy;
      pagination.value.descending = descending;

      search();
    }

    // audit detail modal
    const { dialog } = useQuasar();
    function openAuditDetail(evt, log) {
      dialog({
        component: AuditLogDetailModal,
        componentProps: {
          log,
        },
      });
    }

    function formatActionColor(action) {
      switch (action.toLowerCase()) {
        case "modify":
          return dash_warning_color.value;
        case "add":
        case "agent_install":
        case "file_transfer":
          return dash_positive_color.value;
        case "delete":
        case "failed_login":
          return dash_negative_color.value;
        default:
          return "primary";
      }
    }

    // watchers
    watch(filterType, () => {
      agentFilter.value = null;
      clientFilter.value = null;
    });

    if (props.agent) {
      agentFilter.value = [props.agent];
      watch([userFilter, actionFilter, timeFilter], search);
      watch(
        () => props.agent,
        (newValue) => {
          if (newValue) {
            agentFilter.value = [props.agent];
            search();
          }
        },
      );
    }

    // vue component hooks
    onMounted(() => {
      if (!props.agent) {
        getClientOptions();
        getAgentOptions();
      } else {
        search();
      }

      getUserOptions(true);
    });

    return {
      // data
      auditLogs,
      agentFilter,
      userFilter,
      actionFilter,
      clientFilter,
      objectFilter,
      timeFilter,
      filterType,
      loading,
      searched,
      pagination,
      userOptions,

      // non-reactive data
      clientOptions,
      agentOptions,
      columns,
      actionOptions: props.agent
        ? [...agentActionOptions]
        : [...agentActionOptions, ...actionOptions],
      objectOptions,
      timeOptions,
      filterTypeOptions,

      //computed
      tableNoDataText: computed(() =>
        searched.value
          ? t("logs.auditManager.noDataFound")
          : t("logs.auditManager.clickSearch"),
      ),

      // methods
      search,
      onRequest,
      openAuditDetail,
      formatActionColor,
      formatDate,
    };
  },
};
</script>
