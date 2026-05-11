<template>
  <div v-if="!selectedAgent" class="q-pa-sm">
    {{ $t("agents.shared.noAgentSelected") }}
  </div>
  <div v-else-if="agentPlatform.toLowerCase() !== 'windows'" class="q-pa-sm">
    {{ $t("agents.shared.onlySupportedWindows") }}
  </div>
  <div v-else>
    <q-table
      dense
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      class="tabs-tbl-sticky"
      :style="{ 'max-height': tabHeight }"
      :rows="updates"
      :columns="columns"
      v-model:pagination="pagination"
      :filter="filter"
      row-key="id"
      binary-state-sort
      virtual-scroll
      :loading="loading"
      :rows-per-page-options="[0]"
      :no-data-label="$t('agents.winUpdateTab.noWindowsUpdates')"
    >
      <template v-slot:top>
        <q-btn
          dense
          flat
          push
          @click="getUpdates"
          icon="refresh"
          class="q-mr-sm"
        />
        <q-btn
          :label="$t('agents.winUpdateTab.runUpdateScan')"
          dense
          flat
          push
          no-caps
          @click="updateScan"
          class="q-mr-sm"
        />
        <q-btn
          :label="$t('agents.winUpdateTab.installApprovedUpdates')"
          dense
          flat
          push
          no-caps
          @click="installUpdates"
          class="q-mr-sm"
        />
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
        <export-table-btn :data="updates" :columns="columns" />
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-menu context-menu>
            <q-list dense style="min-width: 100px">
              <q-item
                v-if="!props.row.installed"
                clickable
                v-close-popup
                @click="editWinUpdate(props.row.id, 'inherit')"
              >
                <q-item-section>{{
                  $t("agents.winUpdateTab.actions.inherit")
                }}</q-item-section>
              </q-item>
              <q-item
                v-if="!props.row.installed"
                clickable
                v-close-popup
                @click="editWinUpdate(props.row.id, 'approve')"
              >
                <q-item-section>{{
                  $t("agents.winUpdateTab.actions.approve")
                }}</q-item-section>
              </q-item>
              <q-item
                v-if="!props.row.installed"
                clickable
                v-close-popup
                @click="editWinUpdate(props.row.id, 'ignore')"
              >
                <q-item-section>{{
                  $t("agents.winUpdateTab.actions.ignore")
                }}</q-item-section>
              </q-item>
              <q-item
                v-if="!props.row.installed"
                clickable
                v-close-popup
                @click="editWinUpdate(props.row.id, 'nothing')"
              >
                <q-item-section>{{
                  $t("agents.winUpdateTab.actions.doNothing")
                }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- policy -->
          <q-td>
            <q-icon
              v-if="props.row.action === 'nothing'"
              name="fiber_manual_record"
              color="grey"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.actions.doNothing")
              }}</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="props.row.action === 'approve'"
              name="fas fa-check"
              color="primary"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.actions.approve")
              }}</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="props.row.action === 'ignore'"
              name="fas fa-check"
              :color="dash_negative_color"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.actions.ignore")
              }}</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="props.row.action === 'inherit'"
              name="fiber_manual_record"
              color="accent"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.actions.inherit")
              }}</q-tooltip>
            </q-icon>
          </q-td>
          <q-td>
            <q-icon
              v-if="props.row.installed"
              name="fas fa-check"
              :color="dash_positive_color"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.status.installed")
              }}</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="props.row.action == 'approve'"
              name="fas fa-tasks"
              color="primary"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.status.pending")
              }}</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="props.row.action == 'ignore'"
              name="fas fa-ban"
              :color="dash_negative_color"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.status.ignored")
              }}</q-tooltip>
            </q-icon>
            <q-icon
              v-else
              name="fas fa-exclamation"
              :color="dash_warning_color"
            >
              <q-tooltip>{{
                $t("agents.winUpdateTab.status.missing")
              }}</q-tooltip>
            </q-icon>
          </q-td>
          <q-td>{{ getSeverityLabel(props.row.severity) }}</q-td>
          <q-td>{{ truncateText(props.row.title, 50) }}</q-td>
          <q-td @click="showUpdateDetails(props.row)">
            <span
              style="cursor: pointer; text-decoration: underline"
              class="text-primary"
              >{{ truncateText(props.row.description, 50) }}</span
            >
          </q-td>
          <q-td>{{ formatDate(props.row.date_installed) }}</q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script>
// composition imports
import { ref, computed, watch, inject, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import {
  fetchAgentUpdates,
  editAgentUpdate,
  runAgentUpdateScan,
  runAgentUpdateInstall,
} from "@/api/winupdates";
import { notifySuccess } from "@/utils/notify";
import { truncateText } from "@/utils/format";

// ui imports
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import WinUpdateDialog from "@/components/ui/WinUpdateDialog.vue";

export default {
  name: "WindowsUpdates",
  components: { ExportTableBtn },
  setup() {
    const { t, te } = useI18n();
    // setup vuex
    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const tabHeight = computed(() => store.state.tabHeight);
    const agentPlatform = computed(() => store.state.agentPlatform);
    const formatDate = computed(() => store.getters.formatDate);
    const dash_positive_color = computed(() => store.state.dash_positive_color);
    const dash_negative_color = computed(() => store.state.dash_negative_color);
    const dash_warning_color = computed(() => store.state.dash_warning_color);

    // setup quasar
    const $q = useQuasar();

    // inject function to refresh dashboard
    const refreshDashboard = inject("refreshDashboard");

    // setup win update tab component
    const updates = ref([]);
    const filter = ref("");
    const pagination = ref({
      rowsPerPage: 0,
      sortBy: "installed",
      descending: false,
    });
    const loading = ref(false);

    const columns = computed(() => [
      {
        name: "action",
        field: "action",
        align: "left",
      },
      {
        name: "installed",
        field: "installed",
        align: "left",
      },
      {
        name: "severity",
        label: t("agents.winUpdateTab.columns.severity"),
        field: "severity",
        align: "left",
        sortable: true,
      },
      {
        name: "title",
        label: t("agents.winUpdateTab.columns.name"),
        field: "title",
        align: "left",
        sortable: true,
      },
      {
        name: "description",
        label: t("agents.winUpdateTab.columns.moreInfo"),
        field: "description",
        align: "left",
        sortable: true,
      },
      {
        name: "date_installed",
        label: t("agents.winUpdateTab.columns.installedOn"),
        field: "date_installed",
        align: "left",
        sortable: true,
      },
    ]);

    async function getUpdates() {
      loading.value = true;
      updates.value = await fetchAgentUpdates(selectedAgent.value);
      loading.value = false;
    }

    async function editWinUpdate(pk, action) {
      loading.value = true;
      try {
        const result = await editAgentUpdate(pk, { action: action });
        await getUpdates(selectedAgent.value);
        notifySuccess(result);
        refreshDashboard();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    async function updateScan() {
      loading.value = true;
      try {
        const result = await runAgentUpdateScan(selectedAgent.value);
        notifySuccess(result);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    async function installUpdates() {
      loading.value = true;
      try {
        const result = await runAgentUpdateInstall(selectedAgent.value);
        notifySuccess(result);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    function showUpdateDetails(update) {
      $q.dialog({
        component: WinUpdateDialog,
        componentProps: {
          title: update.title,
          dialogStyle: { width: "80vw", maxWidth: "85vw" },
          categories: update.categories,
          description: update.description,
          supportUrls: update.more_info_urls,
        },
      });
    }

    function getSeverityLabel(severity) {
      const normalizedSeverity =
        severity?.toString().trim().toLowerCase() || "other";
      const severityKey = `agents.winUpdateTab.severity.${normalizedSeverity}`;

      if (te(severityKey)) {
        return t(severityKey);
      }

      return severity || t("agents.winUpdateTab.severity.other");
    }

    watch(selectedAgent, (newValue) => {
      if (newValue) {
        getUpdates();
      }
    });

    // vue lifecycle hooks
    onMounted(() => {
      if (selectedAgent.value) getUpdates();
    });

    return {
      // reactive data
      updates,
      filter,
      pagination,
      loading,
      selectedAgent,
      tabHeight,
      agentPlatform,
      dash_positive_color,
      dash_warning_color,
      dash_negative_color,

      // non-reactive data
      columns,

      // methods
      getUpdates,
      editWinUpdate,
      updateScan,
      installUpdates,
      showUpdateDetails,
      getSeverityLabel,
      notifySuccess,
      truncateText,
      formatDate,
    };
  },
};
</script>
