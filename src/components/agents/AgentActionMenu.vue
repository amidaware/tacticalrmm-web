<template>
  <q-list dense style="min-width: 200px">
    <!-- edit agent -->
    <q-item clickable v-close-popup @click="showEditAgent(agent.agent_id)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-edit" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.editAgent", { hostname: agent.hostname })
      }}</q-item-section>
    </q-item>
    <!-- agent pending actions -->
    <q-item clickable v-close-popup @click="showPendingActionsModal(agent)">
      <q-item-section side>
        <q-icon size="xs" name="far fa-clock" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.pendingAgentActions")
      }}</q-item-section>
    </q-item>
    <!-- take control -->
    <q-item
      clickable
      v-ripple
      v-close-popup
      @click="runTakeControl(agent.agent_id)"
    >
      <q-item-section side>
        <q-icon size="xs" name="fas fa-desktop" />
      </q-item-section>

      <q-item-section>{{
        $t("agents.agentActionMenu.takeControl")
      }}</q-item-section>
    </q-item>

    <!-- vnc -->
    <q-item
      clickable
      v-ripple
      v-close-popup
      @click="launchWebVNC(agent.agent_id)"
    >
      <q-item-section side>
        <q-icon size="xs" name="screen_share" />
      </q-item-section>

      <q-item-section>{{ $t("agents.agentActionMenu.vnc") }}</q-item-section>
    </q-item>

    <q-item clickable v-ripple :disable="urlActions.length === 0">
      <q-item-section side>
        <q-icon size="xs" name="open_in_new" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.runUrlAction")
      }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>
      <q-menu auto-close anchor="top end" self="top start">
        <q-list>
          <q-item
            v-for="action in urlActions"
            :key="action.id"
            dense
            clickable
            v-close-popup
            @click="
              runURLAction({ agent_id: agent.agent_id, action: action.id })
            "
          >
            <q-item-section>{{ action.name }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>

    <q-item clickable v-ripple v-close-popup @click="showSendCommand(agent)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-terminal" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.sendCommand")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-ripple v-close-popup @click="showRunScript(agent)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-terminal" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.runScript")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-ripple :disable="favoriteScripts.length === 0">
      <q-item-section side>
        <q-icon size="xs" name="star" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.runFavoritedScript")
      }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>
      <q-menu auto-close anchor="top end" self="top start">
        <q-list>
          <q-item
            v-for="script in favoriteScripts"
            :key="script.value"
            dense
            clickable
            v-close-popup
            @click="showRunScript(agent, script.value)"
          >
            <q-item-section>{{ script.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>

    <q-item
      clickable
      v-close-popup
      @click="runRemoteBackground(agent.agent_id, agent.plat)"
    >
      <q-item-section side>
        <q-icon size="xs" name="terminal" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.remoteBackground")
      }}</q-item-section>
    </q-item>

    <!-- maintenance mode -->
    <q-item clickable v-close-popup @click="toggleMaintenance(agent)">
      <q-item-section side>
        <q-icon size="xs" name="construction" />
      </q-item-section>
      <q-item-section>
        {{
          agent.maintenance_mode
            ? $t("agents.agentActionMenu.disableMaintenanceMode")
            : $t("agents.agentActionMenu.enableMaintenanceMode")
        }}
      </q-item-section>
    </q-item>

    <!-- patch management -->
    <q-item clickable>
      <q-item-section side>
        <q-icon size="xs" name="system_update" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.patchManagement")
      }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>

      <q-menu auto-close anchor="top right" self="top left">
        <q-list dense style="min-width: 100px">
          <q-item clickable v-ripple @click="runPatchStatusScan(agent)">
            <q-item-section>{{
              $t("agents.agentActionMenu.runPatchStatusScan")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="installPatches(agent)">
            <q-item-section>{{
              $t("agents.agentActionMenu.installPatchesNow")
            }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>

    <q-item clickable v-close-popup @click="runChecks(agent)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-check-double" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.runChecks")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-close-popup @click="wakeUp(agent)">
      <q-item-section side>
        <q-icon size="xs" name="offline_bolt" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.wakeUpWol")
      }}</q-item-section>
    </q-item>

    <q-item clickable>
      <q-item-section side>
        <q-icon size="xs" name="power_settings_new" />
      </q-item-section>
      <q-item-section>{{ $t("agents.agentActionMenu.reboot") }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>

      <q-menu auto-close anchor="top right" self="top left">
        <q-list dense style="min-width: 100px">
          <!-- reboot now -->
          <q-item clickable v-ripple @click="rebootNow(agent)">
            <q-item-section>{{
              $t("agents.agentActionMenu.now")
            }}</q-item-section>
          </q-item>
          <!-- reboot later -->
          <q-item clickable v-ripple @click="showRebootLaterModal(agent)">
            <q-item-section>{{
              $t("agents.agentActionMenu.later")
            }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>

    <q-item clickable v-close-popup @click="shutdown(agent)">
      <q-item-section side>
        <q-icon size="xs" name="power" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.shutdown")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-close-popup @click="showPolicyAdd(agent)">
      <q-item-section side>
        <q-icon size="xs" name="policy" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.assignAutomationPolicy")
      }}</q-item-section>
    </q-item>

    <q-item
      clickable
      v-if="
        $integrations &&
        $integrations.agentMenuIntegrations &&
        $integrations.agentMenuIntegrations.length > 0
      "
    >
      <q-item-section side>
        <q-icon size="xs" name="analytics" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.reporting")
      }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>
      <integrations-context-menu type="agent" :id="agent.agent_id" />
    </q-item>

    <q-item clickable v-close-popup @click="showAgentRecovery(agent)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-first-aid" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.agentRecovery")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-close-popup @click="pingAgent(agent)">
      <q-item-section side>
        <q-icon size="xs" name="delete" />
      </q-item-section>
      <q-item-section>{{
        $t("agents.agentActionMenu.removeAgent")
      }}</q-item-section>
    </q-item>

    <q-separator />
    <q-item clickable v-close-popup>
      <q-item-section>{{ $t("common.buttons.close") }}</q-item-section>
    </q-item>
  </q-list>
</template>

<script>
// composition imports
import { ref, inject, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchURLActions, runURLAction } from "@/api/core";
import {
  editAgent,
  agentRebootNow,
  agentShutdown,
  sendAgentPing,
  removeAgent,
  runRemoteBackground,
  runTakeControl,
  runWebVNC,
  wakeUpWOL,
} from "@/api/agents";
import { runAgentUpdateScan, runAgentUpdateInstall } from "@/api/winupdates";
import { runAgentChecks } from "@/api/checks";
import { fetchScripts } from "@/api/scripts";
import { notifySuccess, notifyError } from "@/utils/notify";

// ui imports
import PendingActions from "@/components/logs/PendingActions.vue";
import AgentRecovery from "@/components/modals/agents/AgentRecovery.vue";
import PolicyAdd from "@/components/automation/modals/PolicyAdd.vue";
import RebootLater from "@/components/modals/agents/RebootLater.vue";
import EditAgent from "@/components/modals/agents/EditAgent.vue";
import SendCommand from "@/components/modals/agents/SendCommand.vue";
import RunScript from "@/components/modals/agents/RunScript.vue";
import IntegrationsContextMenu from "@/components/ui/IntegrationsContextMenu.vue";
import ConfirmYesDialog from "@/components/agents/ConfirmYesDialog.vue";

export default {
  name: "AgentActionMenu",
  components: {
    IntegrationsContextMenu,
  },
  props: {
    agent: !Object,
  },
  setup() {
    // setup quasar
    const $q = useQuasar();
    const { t } = useI18n();

    // setup vuex
    const store = useStore();

    const refreshDashboard = inject("refreshDashboard");

    const urlActions = ref([]);
    const favoriteScripts = ref([]);

    function showEditAgent(agent_id) {
      $q.dialog({
        component: EditAgent,
        componentProps: {
          agent_id: agent_id,
        },
      }).onOk(refreshDashboard);
    }

    function showPendingActionsModal(agent) {
      $q.dialog({
        component: PendingActions,
        componentProps: {
          agent: agent,
        },
      });
    }

    async function getURLActions() {
      try {
        urlActions.value = (await fetchURLActions())
          .filter((action) => action.action_type === "web")
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (e) {
        console.error(e);
      }
    }

    function showSendCommand(agent) {
      $q.dialog({
        component: SendCommand,
        componentProps: {
          agent: agent,
        },
      });
    }

    function showRunScript(agent, script = undefined) {
      $q.dialog({
        component: RunScript,
        componentProps: {
          agent,
          script,
        },
      });
    }

    async function getFavoriteScripts() {
      favoriteScripts.value = [];

      try {
        const data = await fetchScripts({
          showCommunityScripts: store.state.showCommunityScripts,
        });

        const scripts = data.filter((script) => !!script.favorite);

        favoriteScripts.value = scripts
          .map((script) => ({
            label: script.name,
            value: script.id,
            timeout: script.default_timeout,
            args: script.args,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      } catch (e) {
        console.error(e);
      }
    }

    async function toggleMaintenance(agent) {
      let data = {
        maintenance_mode: !agent.maintenance_mode,
      };

      try {
        await editAgent(agent.agent_id, data);
        notifySuccess(
          t("agents.agentActionMenu.maintenanceModeUpdated", {
            mode: agent.maintenance_mode
              ? t("common.status.disabled").toLowerCase()
              : t("common.status.enabled").toLowerCase(),
            hostname: agent.hostname,
          }),
        );
        store.commit("setRefreshSummaryTab", true);
        refreshDashboard();
      } catch (e) {
        console.error(e);
      }
    }

    async function runPatchStatusScan(agent) {
      try {
        await runAgentUpdateScan(agent.agent_id);
        notifySuccess(
          t("agents.agentActionMenu.patchScanQueued", {
            hostname: agent.hostname,
          }),
        );
      } catch (e) {
        console.error(e);
      }
    }

    async function installPatches(agent) {
      try {
        const data = await runAgentUpdateInstall(agent.agent_id);
        notifySuccess(data);
      } catch (e) {
        console.error(e);
      }
    }

    async function runChecks(agent) {
      try {
        const data = await runAgentChecks(agent.agent_id);
        notifySuccess(data);
      } catch (e) {
        console.error(e);
      }
    }

    async function wakeUp(agent) {
      try {
        const data = await wakeUpWOL(agent.agent_id);
        notifySuccess(data);
      } catch (e) {
        console.error(e);
      }
    }

    function showRebootLaterModal(agent) {
      $q.dialog({
        component: RebootLater,
        componentProps: {
          agent: agent,
        },
      }).onOk(refreshDashboard);
    }

    function launchWebVNC(agent_id) {
      $q.dialog({
        title: t("agents.agentActionMenu.vncServerPort"),
        message: t("agents.agentActionMenu.enterVncServerPort"),
        prompt: {
          model: "5900",
          type: "text",
        },
        cancel: true,
        ok: { label: t("agents.agentActionMenu.launch"), color: "primary" },
        persistent: true,
      }).onOk((port) => {
        runWebVNC(agent_id, port);
      });
    }

    function rebootNow(agent) {
      $q.dialog({
        title: t("agents.shared.areYouSure"),
        message: t("agents.agentActionMenu.rebootNow", {
          hostname: agent.hostname,
        }),
        cancel: true,
        persistent: true,
      }).onOk(async () => {
        $q.loading.show();
        try {
          await agentRebootNow(agent.agent_id);
          notifySuccess(
            t("agents.agentActionMenu.willBeRestarted", {
              hostname: agent.hostname,
            }),
          );
          $q.loading.hide();
        } catch (e) {
          $q.loading.hide();
          console.error(e);
        }
      });
    }

    function shutdown(agent) {
      $q.dialog({
        component: ConfirmYesDialog,
        componentProps: {
          hostname: agent.hostname,
          actionVerb: t("agents.agentActionMenu.shutdownAction"),
          title: t("agents.agentActionMenu.confirmShutdown"),
          okLabel: t("agents.agentActionMenu.shutdown"),
          okColor: "negative",
        },
      }).onOk(async () => {
        $q.loading.show();
        try {
          await agentShutdown(agent.agent_id);
          notifySuccess(
            t("agents.agentActionMenu.willBeShutdown", {
              hostname: agent.hostname,
            }),
          );
          $q.loading.hide();
        } catch (e) {
          $q.loading.hide();
          console.error(e);
        }
      });
    }

    function showPolicyAdd(agent) {
      $q.dialog({
        component: PolicyAdd,
        componentProps: {
          type: "agent",
          object: agent,
        },
      }).onOk(refreshDashboard);
    }

    function showAgentRecovery(agent) {
      $q.dialog({
        component: AgentRecovery,
        componentProps: {
          agent: agent,
        },
      });
    }

    async function pingAgent(agent) {
      try {
        $q.loading.show();
        const data = await sendAgentPing(agent.agent_id);
        $q.loading.hide();
        if (data.status === "offline") {
          $q.dialog({
            title: t("agents.agentActionMenu.agentOffline"),
            message: t("agents.agentActionMenu.offlineUninstallPrompt", {
              hostname: agent.hostname,
            }),
            cancel: { label: t("common.system.no"), color: "negative" },
            ok: { label: t("common.system.yes"), color: "positive" },
            persistent: true,
          })
            .onOk(() => deleteAgent(agent))
            .onCancel(() => {
              return;
            });
        } else if (data.status === "online") {
          deleteAgent(agent);
        } else {
          notifyError(t("agents.agentActionMenu.somethingWentWrong"));
        }
      } catch (e) {
        $q.loading.hide();
        console.error(e);
      }
    }

    function deleteAgent(agent) {
      $q.dialog({
        component: ConfirmYesDialog,
        componentProps: {
          hostname: agent.hostname,
          actionVerb: t("agents.agentActionMenu.deletionAction"),
          title: t("agents.agentActionMenu.confirmDeletion"),
          okLabel: t("agents.agentActionMenu.uninstall"),
          okColor: "negative",
        },
      }).onOk(async () => {
        try {
          const data = await removeAgent(agent.agent_id);
          notifySuccess(data);
          refreshDashboard(
            false /* clearTreeSelected */,
            true /* clearSubTable */,
          );
        } catch (e) {
          console.error(e);
        }
      });
    }

    onMounted(async () => {
      await getURLActions();
      await getFavoriteScripts();
    });

    return {
      // reactive data
      urlActions,
      favoriteScripts,

      // methods
      showEditAgent,
      showPendingActionsModal,
      runTakeControl,
      runRemoteBackground,
      getURLActions,
      runURLAction,
      showSendCommand,
      showRunScript,
      getFavoriteScripts,
      toggleMaintenance,
      runPatchStatusScan,
      installPatches,
      runChecks,
      showRebootLaterModal,
      rebootNow,
      shutdown,
      showPolicyAdd,
      showAgentRecovery,
      pingAgent,
      wakeUp,
      launchWebVNC,
    };
  },
};
</script>
