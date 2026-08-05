<template>
  <div v-if="agentPlatform.toLowerCase() !== 'windows'" class="q-pa-sm">
    {{ $t("agents.shared.onlySupportedWindows") }}
  </div>
  <q-table
    v-else
    dense
    :table-class="{
      'table-bgcolor': !$q.dark.isActive,
      'table-bgcolor-dark': $q.dark.isActive,
    }"
    class="remote-bg-tbl-sticky"
    :style="{ 'max-height': `${$q.screen.height - 36}px` }"
    :rows="services"
    :columns="columns"
    :pagination="{ rowsPerPage: 0, sortBy: 'display_name', descending: false }"
    :filter="filter"
    row-key="display_name"
    binary-state-sort
    :rows-per-page-options="[0]"
    :loading="loading"
  >
    <template v-slot:top>
      <q-btn dense flat push @click="getServices" icon="refresh" />
      <q-space />
      <q-input
        v-model="filter"
        outlined
        :label="$t('common.buttons.search')"
        dense
        clearable
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
      <!-- file download doesn't work so disabling -->
      <export-table-btn
        v-show="false"
        class="q-ml-sm"
        :columns="columns"
        :data="services"
      />
    </template>
    <template v-slot:body="props">
      <q-tr
        :props="props"
        class="cursor-pointer"
        @dblclick="showServiceDetail(props.row)"
      >
        <q-menu context-menu auto-close>
          <q-list dense style="min-width: 200px">
            <q-item clickable @click="sendServiceAction(props.row, 'start')">
              <q-item-section>{{
                $t("agents.servicesManager.start")
              }}</q-item-section>
            </q-item>
            <q-item clickable @click="sendServiceAction(props.row, 'stop')">
              <q-item-section>{{
                $t("agents.servicesManager.stop")
              }}</q-item-section>
            </q-item>
            <q-item clickable @click="sendServiceAction(props.row, 'restart')">
              <q-item-section>{{
                $t("agents.servicesManager.restart")
              }}</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable @click="showServiceDetail(props.row)">
              <q-item-section>{{
                $t("agents.servicesManager.serviceDetails")
              }}</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable>
              <q-item-section>{{ $t("common.buttons.close") }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <q-td key="display_name" :props="props">
          <q-icon name="fas fa-cogs" />
          &nbsp;&nbsp;&nbsp;{{ truncateText(props.row.display_name, 30) }}
        </q-td>
        <q-td key="name" :props="props">{{ props.row.name }}</q-td>
        <q-td key="start_type" :props="props">{{
          props.row.start_type.toLowerCase() === "automatic" &&
          props.row.autodelay
            ? `${props.row.start_type} (${t("agents.servicesManager.delayed")})`
            : `${props.row.start_type}`
        }}</q-td>
        <q-td key="pid" :props="props">{{
          props.row.pid === 0 ? "" : props.row.pid
        }}</q-td>
        <q-td key="status" :props="props">{{ props.row.status }}</q-td>
        <q-td key="username" :props="props">{{
          props.row.username
            ? props.row.username
            : $t("agents.servicesManager.localSystem")
        }}</q-td>
      </q-tr>
    </template>
  </q-table>
</template>

<script>
// composition imports
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { getAgentServices, sendAgentServiceAction } from "@/api/services";
import { notifySuccess } from "@/utils/notify";
import { truncateText } from "@/utils/format";

// ui imports
import ServiceDetail from "@/components/agents/remotebg/ServiceDetail.vue";
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";

export default {
  name: "ServicesManager",
  components: {
    ExportTableBtn,
  },
  props: {
    agent_id: !String,
    agentPlatform: !String,
  },
  setup(props) {
    // quasar setup
    const $q = useQuasar();
    const { t } = useI18n();

    // services manager setup
    const services = ref([]);
    const filter = ref("");
    const loading = ref(false);

    const columns = [
      {
        name: "display_name",
        label: t("agents.servicesManager.columns.displayName"),
        field: "display_name",
        align: "left",
        sortable: true,
      },
      {
        name: "name",
        label: t("agents.servicesManager.columns.name"),
        field: "name",
        align: "left",
        sortable: true,
      },
      {
        name: "start_type",
        label: t("agents.servicesManager.columns.startup"),
        field: "start_type",
        align: "left",
        sortable: true,
      },
      {
        name: "pid",
        label: t("agents.servicesManager.columns.pid"),
        field: "pid",
        align: "left",
        sortable: true,
      },
      {
        name: "status",
        label: t("agents.servicesManager.columns.status"),
        field: "status",
        align: "left",
        sortable: true,
      },
      {
        name: "username",
        label: t("agents.servicesManager.columns.logOnAs"),
        field: "username",
        align: "left",
        sortable: true,
      },
    ];

    const startupOptions = [
      {
        label: t("agents.serviceDetail.startupOptions.autodelay"),
        value: "autodelay",
      },
      {
        label: t("agents.serviceDetail.startupOptions.automatic"),
        value: "automatic",
      },
      {
        label: t("agents.serviceDetail.startupOptions.manual"),
        value: "manual",
      },
      {
        label: t("agents.serviceDetail.startupOptions.disabled"),
        value: "disabled",
      },
    ];

    function showServiceDetail(service) {
      $q.dialog({
        component: ServiceDetail,
        componentProps: {
          service: service,
          agent_id: props.agent_id,
        },
      }).onOk(getServices);
    }

    async function getServices() {
      loading.value = true;
      services.value = await getAgentServices(props.agent_id);
      loading.value = false;
    }

    async function sendServiceAction(service, action) {
      loading.value = true;

      try {
        const result = await sendAgentServiceAction(
          props.agent_id,
          service.name,
          { sv_action: action },
        );
        notifySuccess(result);
        await getServices();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    // vue lifecycle hooks
    onMounted(() => {
      if (props.agentPlatform === "windows") getServices();
    });
    return {
      // reactive data
      services,
      filter,
      loading,

      // dialogs
      showServiceDetail,

      // non-reactive data
      columns,
      startupOptions,

      // methods
      getServices,
      sendServiceAction,
      truncateText,
      t,
    };
  },
};
</script>
