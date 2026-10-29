<template>
  <q-card>
    <q-bar v-if="modal">
      <q-btn @click="search" class="q-mr-sm" dense flat push icon="refresh" />
      <q-space />{{ $gettext("Audit Manager") }}
      <q-space />
      <q-btn dense flat icon="close" v-close-popup>
        <q-tooltip class="bg-white text-primary">{{
          $gettext("Close")
        }}</q-tooltip>
      </q-btn>
    </q-bar>
    <q-table
      @request="onRequest"
      :title="modal ? $gettext('Audit Logs') : ''"
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
          :label="$pgettext('Audit log', 'Agent')"
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
          :label="$pgettext('Audit log', 'Clients')"
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
          :label="$gettext('Users')"
          clearable
          filled
          multiple
        />
        <tactical-dropdown
          class="q-pr-sm"
          style="width: 200px"
          v-model="actionFilter"
          :options="actionOptions"
          :label="$pgettext('Audit log', 'Action')"
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
          :label="$pgettext('Audit log', 'Object')"
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
          :label="$pgettext('Audit log', 'Time')"
          filled
          mapOptions
        />
        <q-btn
          v-if="!agent"
          color="primary"
          :label="$pgettext('General actions', 'Search')"
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
import { gettext } from "@/gettext";
// composition imports
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
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

    const columns = computed(() => [
      {
        name: "entry_time",
        label: gettext.$pgettext("Audit log", "Time"),
        field: "entry_time",
        align: "left",
        sortable: true,
      },
      {
        name: "username",
        label: gettext.$pgettext("Audit log", "Username"),
        field: "username",
        align: "left",
        sortable: true,
      },
      {
        name: "agent",
        label: gettext.$pgettext("Audit log", "Agent"),
        field: "agent",
        align: "left",
        sortable: true,
      },
      {
        name: "client",
        label: gettext.$pgettext("Audit log", "Client"),
        field: "client",
        align: "left",
        sortable: true,
      },
      {
        name: "site",
        label: gettext.$pgettext("Audit log", "Site"),
        field: "site",
        align: "left",
        sortable: true,
      },
      {
        name: "action",
        label: gettext.$pgettext("Audit log", "Action"),
        field: "action",
        align: "left",
        sortable: true,
      },
      {
        name: "object_type",
        label: gettext.$pgettext("Audit log", "Object"),
        field: "object_type",
        align: "left",
        sortable: true,
        format: (val) => formatTableColumnText(val),
      },
      {
        name: "message",
        label: gettext.$gettext("Message"),
        field: "message",
        align: "left",
        sortable: true,
      },
      {
        name: "client_ip",
        label: gettext.$gettext("Client IP"),
        field: "ip_address",
        align: "left",
        sortable: true,
      },
    ]);

    const agentActionOptions = computed(() => [
      { value: "add", label: gettext.$gettext("Add Object") },
      {
        value: "modify",
        label: gettext.$gettext("Modify Object"),
      },
      {
        value: "execute_command",
        label: gettext.$gettext("Execute Command"),
      },
      {
        value: "execute_script",
        label: gettext.$gettext("Execute Script"),
      },
      {
        value: "remote_session",
        label: gettext.$gettext("Remote Session"),
      },
      {
        value: "file_transfer",
        label: gettext.$gettext("File Transfer"),
      },
      {
        value: "url_action",
        label: gettext.$pgettext("Audit log", "URL Action"),
      },
    ]);

    const actionOptions = computed(() => [
      {
        value: "agent_install",
        label: gettext.$gettext("Agent Installs"),
      },
      {
        value: "bulk_action",
        label: gettext.$pgettext("Audit log", "Bulk Actions"),
      },
      {
        value: "delete",
        label: gettext.$gettext("Delete Object"),
      },
      {
        value: "failed_login",
        label: gettext.$gettext("Failed User login"),
      },
      { value: "login", label: gettext.$gettext("User Login") },
      {
        value: "modify",
        label: gettext.$gettext("Modify Object"),
      },
      {
        value: "task_run",
        label: gettext.$gettext("Task Run Results"),
      },
    ]);

    const objectOptions = computed(() => [
      { value: "agent", label: gettext.$pgettext("Audit log", "Agent") },
      {
        value: "automatedtask",
        label: gettext.$gettext("Automated Task"),
      },
      { value: "bulk", label: gettext.$pgettext("Audit log", "Bulk Actions") },
      {
        value: "coresettings",
        label: gettext.$gettext("Core Settings"),
      },
      { value: "check", label: gettext.$gettext("Check") },
      { value: "client", label: gettext.$pgettext("Audit log", "Client") },
      { value: "policy", label: gettext.$pgettext("Audit log", "Policy") },
      { value: "site", label: gettext.$pgettext("Audit log", "Site") },
      { value: "script", label: gettext.$pgettext("Audit log", "Script") },
      { value: "user", label: gettext.$pgettext("Audit log", "User") },
      {
        value: "winupdatepolicy",
        label: gettext.$gettext("Patch Policy"),
      },
      {
        value: "alerttemplate",
        label: gettext.$gettext("Alert Template"),
      },
      { value: "role", label: gettext.$pgettext("Audit log", "Role") },
      {
        value: "urlaction",
        label: gettext.$pgettext("Audit log", "URL Action"),
      },
      {
        value: "keystore",
        label: gettext.$gettext("Global Key Store"),
      },
      {
        value: "customfield",
        label: gettext.$gettext("Custom Field"),
      },
      { value: "schedule", label: gettext.$pgettext("Audit log", "Schedule") },
      {
        value: "reportschedule",
        label: gettext.$gettext("Report Schedule"),
      },
    ]);

    const timeOptions = computed(() => [
      { value: 1, label: gettext.$gettext("1 Day Ago") },
      { value: 7, label: gettext.$gettext("1 Week Ago") },
      { value: 30, label: gettext.$gettext("30 Days Ago") },
      { value: 90, label: gettext.$gettext("3 Months Ago") },
      { value: 180, label: gettext.$gettext("6 Months Ago") },
      { value: 365, label: gettext.$gettext("1 Year Ago") },
      { value: 0, label: gettext.$pgettext("Alert history", "Everything") },
    ]);

    const filterTypeOptions = computed(() => [
      { label: gettext.$pgettext("Audit log", "Clients"), value: "clients" },
      { label: gettext.$pgettext("Audit log", "Agents"), value: "agents" },
    ]);

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
        case "file_transfer":
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
      switch (normalized) {
        case "add":
          return gettext.$gettext("Add Object");
        case "agent_install":
          return gettext.$gettext("Agent Installs");
        case "bulk_action":
          return gettext.$pgettext("Audit log", "Bulk Actions");
        case "delete":
          return gettext.$gettext("Delete Object");
        case "execute_command":
          return gettext.$gettext("Execute Command");
        case "execute_script":
          return gettext.$gettext("Execute Script");
        case "failed_login":
          return gettext.$gettext("Failed User login");
        case "file_transfer":
          return gettext.$gettext("File Transfer");
        case "login":
          return gettext.$gettext("User Login");
        case "modify":
          return gettext.$gettext("Modify Object");
        case "remote_session":
          return gettext.$gettext("Remote Session");
        case "task_run":
          return gettext.$gettext("Task Run Results");
        case "url_action":
          return gettext.$pgettext("Audit log", "URL Action");
        default:
          return formatTableColumnText(normalized);
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
      actionOptions: computed(() =>
        props.agent
          ? [...agentActionOptions.value]
          : [...agentActionOptions.value, ...actionOptions.value],
      ),
      objectOptions,
      timeOptions,
      filterTypeOptions,

      //computed
      tableNoDataText: computed(() =>
        searched.value
          ? gettext.$gettext("No data found. Try to refine your search")
          : gettext.$gettext("Click search to find audit logs"),
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
