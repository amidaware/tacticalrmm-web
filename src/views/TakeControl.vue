<template>
  <div>
    <q-bar>
      <span class="text-caption">
        {{ $t("takeControl.agentStatus") }}
        <q-badge :color="statusColor" :label="statusLabel" />
      </span>
      <q-space />
      <q-btn
        class="q-mr-md"
        color="primary"
        size="sm"
        :label="$t('takeControl.restartConnection')"
        icon="refresh"
        @click="restartMeshService"
      />
      <q-btn
        :color="dash_negative_color"
        size="sm"
        :label="$t('takeControl.recoverConnection')"
        icon="fas fa-first-aid"
        @click="repairMeshCentral"
      />
      <q-space />
    </q-bar>
    <div class="q-video" :style="{ height: `${$q.screen.height - 26}px` }">
      <iframe
        v-show="control"
        :src="control"
        allow="clipboard-read; clipboard-write"
        allowfullscreen
        frameborder="0"
      ></iframe>
    </div>
  </div>
</template>

<script>
// composition imports
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import { useMeta, useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchAgentMeshCentralURLs, sendAgentRecoverMesh } from "@/api/agents";
import { fetchDashboardInfo } from "@/api/core";
import { sendAgentServiceAction } from "@/api/services";
import { notifySuccess } from "@/utils/notify";

export default {
  name: "TakeControl",
  setup() {
    // vue lifecycle hooks
    onMounted(() => {
      dashInfo();
      getDashInfo();
      getMeshURLs();
    });

    // quasar setup
    const $q = useQuasar();
    const store = useStore();
    const { t } = useI18n();
    const dash_positive_color = computed(() => store.state.dash_positive_color);
    const dash_negative_color = computed(() => store.state.dash_negative_color);
    const dash_warning_color = computed(() => store.state.dash_warning_color);

    // vue router
    const { params } = useRoute();

    // take control setup
    const control = ref("");
    const status = ref(null);

    const statusColor = computed(() => {
      switch (status.value) {
        case "online":
          return dash_positive_color.value;
        case "offline":
          return dash_warning_color.value;
        default:
          return dash_negative_color.value;
      }
    });

    const statusLabel = computed(() => {
      switch (status.value) {
        case "online":
          return t("common.online");
        case "offline":
          return t("common.offline");
        case "overdue":
          return t("common.overdue");
        default:
          return status.value;
      }
    });

    // TODO refactor this so we're not calling the api twice
    const dashInfo = () => {
      store.dispatch("getDashInfo", false);
    };

    async function getMeshURLs() {
      $q.loading.show();
      try {
        const data = await fetchAgentMeshCentralURLs(params.agent_id);
        control.value = data.control;
        status.value = data.status;
        useMeta({
          title: `${data.hostname} - ${data.client} - ${data.site} | ${t(
            "takeControl.title",
          )}`,
        });
      } catch (e) {
        console.error(e);
      }
      $q.loading.hide();
    }

    async function getDashInfo() {
      const { dark_mode, loading_bar_color } = await fetchDashboardInfo();
      $q.dark.set(dark_mode);
      $q.loadingBar.setDefaults({ color: loading_bar_color });
    }

    async function repairMeshCentral() {
      control.value = "";
      $q.loading.show({ message: t("takeControl.repairing") });
      try {
        const data = await sendAgentRecoverMesh(params.agent_id);
        await getMeshURLs();
        setTimeout(() => {
          notifySuccess(data);
        }, 500);
      } catch (e) {
        console.error(e);
      }
      $q.loading.hide();
    }

    async function restartMeshService() {
      $q.loading.show({ message: t("takeControl.restarting") });
      const data = {
        sv_action: "restart",
      };

      try {
        await sendAgentServiceAction(params.agent_id, "mesh agent", data);
        setTimeout(() => {
          notifySuccess(t("takeControl.restarted"));
        }, 500);
      } catch (e) {
        console.error(e);
      }

      $q.loading.hide();
    }

    return {
      // reactive data
      control,
      status,
      statusColor,
      statusLabel,
      dash_negative_color,

      // methods
      repairMeshCentral,
      restartMeshService,
    };
  },
};
</script>
