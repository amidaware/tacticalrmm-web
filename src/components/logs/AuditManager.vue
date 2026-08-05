<template>
  <q-card>
    <q-bar v-if="modal">
      <q-btn @click="search" class="q-mr-sm" dense flat push icon="refresh" />
      <q-space />{{ $t("settings.auditManager.title") }}
      <q-space />
      <q-btn dense flat icon="close" v-close-popup>
        <q-tooltip class="bg-white text-primary">{{
          $t("common.buttons.close")
        }}</q-tooltip>
      </q-btn>
    </q-bar>
    <q-table
      @request="onRequest"
      :title="modal ? $t('settings.auditManager.auditLogs') : ''"
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
          :label="$t('settings.auditManager.agent')"
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
          :label="$t('settings.auditManager.clients')"
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
          :label="$t('settings.auditManager.users')"
          clearable
          filled
          multiple
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 200px"
          v-model="actionFilter"
          :options="actionOptions"
          :label="$t('settings.auditManager.action')"
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
          :label="$t('settings.auditManager.object')"
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
          :label="$t('settings.auditManager.time')"
          filled
          mapOptions
        />
        <q-btn
          v-if="!agent"
          color="primary"
          :label="$t('common.buttons.search')"
          @click="search"
        />

        <q-space />
        <export-table-btn :data="auditLogs" :columns="columns" />
      </template>
      <template v-slot:body-cell-action="props">
        <q-td :props="props">
          <div>
            <q-badge
              :color="formatActionColor(props.row.action)"
              :label="getAuditActionLabel(props.row.action)"
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
import { useI18n } from "vue-i18n";
import { useClientDropdown } from "@/composables/clients";
import { useAgentDropdown } from "@/composables/agents";
import { useUserDropdown } from "@/composables/accounts";
import { useQuasar } from "quasar";
import { fetchAuditLog } from "@/api/logs";
import { formatTableColumnText } from "@/utils/format";

// ui imported
import AuditLogDetailModal from "@/components/logs/AuditLogDetailModal.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

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
    const { t } = useI18n();
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

    const columns = [
      {
        name: "entry_time",
        label: t("settings.auditManager.columns.time"),
        field: "entry_time",
        align: "left",
        sortable: true,
      },
      {
        name: "username",
        label: t("settings.auditManager.columns.username"),
        field: "username",
        align: "left",
        sortable: true,
      },
      {
        name: "agent",
        label: t("settings.auditManager.columns.agent"),
        field: "agent",
        align: "left",
        sortable: true,
      },
      {
        name: "client",
        label: t("settings.auditManager.columns.client"),
        field: "client",
        align: "left",
        sortable: true,
      },
      {
        name: "site",
        label: t("settings.auditManager.columns.site"),
        field: "site",
        align: "left",
        sortable: true,
      },
      {
        name: "action",
        label: t("settings.auditManager.columns.action"),
        field: "action",
        align: "left",
        sortable: true,
      },
      {
        name: "object_type",
        label: t("settings.auditManager.columns.object"),
        field: "object_type",
        align: "left",
        sortable: true,
        format: (val) => formatTableColumnText(val),
      },
      {
        name: "message",
        label: t("settings.auditManager.columns.message"),
        field: "message",
        align: "left",
        sortable: true,
      },
      {
        name: "client_ip",
        label: t("settings.auditManager.columns.clientIp"),
        field: "ip_address",
        align: "left",
        sortable: true,
      },
    ];

    const agentActionOptions = [
      { value: "add", label: t("settings.auditManager.options.addObject") },
      {
        value: "modify",
        label: t("settings.auditManager.options.modifyObject"),
      },
      {
        value: "execute_command",
        label: t("settings.auditManager.options.executeCommand"),
      },
      {
        value: "execute_script",
        label: t("settings.auditManager.options.executeScript"),
      },
      {
        value: "remote_session",
        label: t("settings.auditManager.options.remoteSession"),
      },
      {
        value: "url_action",
        label: t("settings.auditManager.options.urlAction"),
      },
    ];

    const actionOptions = [
      {
        value: "agent_install",
        label: t("settings.auditManager.options.agentInstalls"),
      },
      {
        value: "bulk_action",
        label: t("settings.auditManager.options.bulkActions"),
      },
      {
        value: "delete",
        label: t("settings.auditManager.options.deleteObject"),
      },
      {
        value: "failed_login",
        label: t("settings.auditManager.options.failedUserLogin"),
      },
      { value: "login", label: t("settings.auditManager.options.userLogin") },
      {
        value: "modify",
        label: t("settings.auditManager.options.modifyObject"),
      },
      {
        value: "task_run",
        label: t("settings.auditManager.options.taskRunResults"),
      },
    ];

    const objectOptions = [
      { value: "agent", label: t("settings.auditManager.objects.agent") },
      {
        value: "automatedtask",
        label: t("settings.auditManager.objects.automatedTask"),
      },
      { value: "bulk", label: t("settings.auditManager.objects.bulkActions") },
      {
        value: "coresettings",
        label: t("settings.auditManager.objects.coreSettings"),
      },
      { value: "check", label: t("settings.auditManager.objects.check") },
      { value: "client", label: t("settings.auditManager.objects.client") },
      { value: "policy", label: t("settings.auditManager.objects.policy") },
      { value: "site", label: t("settings.auditManager.objects.site") },
      { value: "script", label: t("settings.auditManager.objects.script") },
      { value: "user", label: t("settings.auditManager.objects.user") },
      {
        value: "winupdatepolicy",
        label: t("settings.auditManager.objects.patchPolicy"),
      },
      {
        value: "alerttemplate",
        label: t("settings.auditManager.objects.alertTemplate"),
      },
      { value: "role", label: t("settings.auditManager.objects.role") },
      {
        value: "urlaction",
        label: t("settings.auditManager.objects.urlAction"),
      },
      {
        value: "keystore",
        label: t("settings.auditManager.objects.globalKeyStore"),
      },
      {
        value: "customfield",
        label: t("settings.auditManager.objects.customField"),
      },
      { value: "schedule", label: t("settings.auditManager.objects.schedule") },
      {
        value: "reportschedule",
        label: t("settings.auditManager.objects.reportSchedule"),
      },
    ];

    const timeOptions = [
      { value: 1, label: t("alerts.overview.timeOptions.dayAgo") },
      { value: 7, label: t("alerts.overview.timeOptions.weekAgo") },
      { value: 30, label: t("alerts.overview.timeOptions.days30Ago") },
      { value: 90, label: t("alerts.overview.timeOptions.months3Ago") },
      { value: 180, label: t("alerts.overview.timeOptions.months6Ago") },
      { value: 365, label: t("alerts.overview.timeOptions.yearAgo") },
      { value: 0, label: t("alerts.overview.timeOptions.everything") },
    ];

    const filterTypeOptions = [
      { label: t("settings.auditManager.clients"), value: "clients" },
      { label: t("settings.auditManager.agents"), value: "agents" },
    ];

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
      switch (normalizeActionKey(action)) {
        case "modify":
          return dash_warning_color.value;
        case "add":
        case "agent_install":
          return dash_positive_color.value;
        case "delete":
        case "failed_login":
          return dash_negative_color.value;
        default:
          return "primary";
      }
    }

    function normalizeActionKey(action) {
      if (!action) return "";
      return action.toString().trim().toLowerCase().replace(/\s+/g, "_");
    }

    function getAuditActionLabel(action) {
      if (!action) return action;
      const normalized = normalizeActionKey(action);
      const translationKey = `settings.auditManager.actions.${normalized}`;
      return t(translationKey) !== translationKey
        ? t(translationKey)
        : formatTableColumnText(normalized);
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
          ? t("settings.auditManager.noDataSearched")
          : t("settings.auditManager.noDataInitial"),
      ),

      // methods
      search,
      onRequest,
      openAuditDetail,
      formatActionColor,
      getAuditActionLabel,
      formatDate,
    };
  },
};
</script>
