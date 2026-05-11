<template>
  <div v-if="!selectedAgent" class="q-pa-sm">
    {{ $t("agents.shared.noAgentSelected") }}
  </div>
  <div v-else-if="agentPlatform.toLowerCase() !== 'windows'" class="q-pa-sm">
    {{ $t("agents.shared.onlySupportedWindows") }}
  </div>
  <div v-else>
    <q-table
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      class="tabs-tbl-sticky"
      dense
      :rows="software"
      :columns="columns"
      :filter="filter"
      :style="{ 'max-height': tabHeight }"
      v-model:pagination="pagination"
      binary-state-sort
      row-key="id"
      virtual-scroll
      :rows-per-page-options="[0]"
      :loading="loading"
    >
      <template v-slot:loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template v-slot:top>
        <q-btn
          class="q-mr-sm"
          dense
          flat
          push
          @click="refreshSoftware"
          icon="refresh"
        />
        <q-btn
          icon="add"
          :label="$t('software.softwareTab.installSoftware')"
          no-caps
          dense
          flat
          push
          @click="showInstallSoftwareModal"
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
        <export-table-btn :data="software" :columns="columns" />
      </template>

      <template v-slot:body-cell-uninstall="props">
        <td>
          <q-btn
            v-if="props.row.uninstall"
            :label="$t('software.softwareTab.uninstall')"
            color="primary"
            dense
            size="sm"
            @click="openUninstallSoftware(props.row)"
          />
        </td>
      </template>
    </q-table>
  </div>
</template>

<script>
// composition imports
import { ref, computed, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import {
  fetchAgentSoftware,
  refreshAgentSoftware,
  uninstallAgentSoftware,
} from "@/api/software";

// ui imports
import InstallSoftware from "@/components/software/InstallSoftware.vue";
import UninstallSoftware from "@/components/software/UninstallSoftware.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import { notifySuccess } from "@/utils/notify";

export default {
  name: "SoftwareTab",
  components: {
    ExportTableBtn,
  },
  setup() {
    // setup quasar
    const $q = useQuasar();
    const { t } = useI18n();

    // setup vuex
    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const tabHeight = computed(() => store.state.tabHeight);
    const agentPlatform = computed(() => store.state.agentPlatform);

    // software tab logic
    const software = ref([]);
    const loading = ref(false);
    const filter = ref("");
    const pagination = ref({
      rowsPerPage: 0,
      sortBy: "name",
      descending: false,
    });

    async function getSoftware() {
      loading.value = true;
      software.value = (await fetchAgentSoftware(selectedAgent.value)) || [];
      loading.value = false;
    }

    async function refreshSoftware() {
      loading.value = true;
      await refreshAgentSoftware(selectedAgent.value);
      await getSoftware();
      loading.value = false;
    }

    function showInstallSoftwareModal() {
      $q.dialog({
        component: InstallSoftware,
        componentProps: {
          agent_id: selectedAgent.value,
        },
      });
    }

    function openUninstallSoftware(software) {
      $q.dialog({
        component: UninstallSoftware,

        componentProps: {
          softwareName: software.name,
          initialUninstallString:
            software.uninstall +
            (software.uninstall.toLowerCase().includes("msiexec")
              ? " /qn /norestart"
              : ""),
        },
      }).onOk(async (data) => {
        try {
          loading.value = true;
          const ret = await uninstallAgentSoftware(selectedAgent.value, {
            name: software.name,
            command: data.uninstallString, // use user supplied value, not the one from db. to prevent db injection attack
            run_as_user: data.run_as_user,
            timeout: data.timeout,
          });
          notifySuccess(ret);
        } catch (e) {
          console.error(e);
        } finally {
          loading.value = false;
        }
      });
    }

    watch(selectedAgent, (newValue) => {
      if (newValue) {
        getSoftware();
      }
    });

    onMounted(() => {
      if (selectedAgent.value) getSoftware();
    });

    const columns = computed(() => [
      {
        name: "name",
        align: "left",
        label: t("software.softwareTab.columns.name"),
        field: "name",
        sortable: true,
      },
      {
        name: "publisher",
        align: "left",
        label: t("software.softwareTab.columns.publisher"),
        field: "publisher",
        sortable: true,
      },
      {
        name: "install_date",
        align: "left",
        label: t("software.softwareTab.columns.installedOn"),
        field: "install_date",
        sortable: false,
        format: (val) => {
          return val === "01/01/1" || val === "01-1-01" ? "" : val;
        },
      },
      {
        name: "size",
        align: "left",
        label: t("software.softwareTab.columns.size"),
        field: "size",
        sortable: false,
      },
      {
        name: "version",
        align: "left",
        label: t("software.softwareTab.columns.version"),
        field: "version",
        sortable: false,
      },
      {
        name: "uninstall",
        align: "left",
        label: "",
        field: "uninstall",
        sortable: false,
      },
    ]);

    return {
      // reactive data
      software,
      loading,
      filter,
      pagination,
      selectedAgent,
      tabHeight,
      agentPlatform,

      // non-reactive data
      columns,

      // methods
      refreshSoftware,
      showInstallSoftwareModal,
      openUninstallSoftware,
    };
  },
};
</script>
