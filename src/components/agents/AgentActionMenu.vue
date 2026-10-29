<template>
  <q-list dense style="min-width: 200px">
    <!-- edit agent -->
    <q-item clickable v-close-popup @click="showEditAgent(agent.agent_id)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-edit" />
      </q-item-section>
      <q-item-section>{{
        $gettext("Edit %{hostname}", { hostname: agent.hostname })
      }}</q-item-section>
    </q-item>
    <!-- agent pending actions -->
    <q-item clickable v-close-popup @click="showPendingActionsModal(agent)">
      <q-item-section side>
        <q-icon size="xs" name="far fa-clock" />
      </q-item-section>
      <q-item-section>{{ $gettext("Pending Agent Actions") }}</q-item-section>
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
        $pgettext("Agent actions", "Take Control")
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

      <q-item-section>{{ $gettext("VNC") }}</q-item-section>
    </q-item>

    <q-item clickable v-ripple :disable="urlActions.length === 0">
      <q-item-section side>
        <q-icon size="xs" name="open_in_new" />
      </q-item-section>
      <q-item-section>{{ $gettext("Run URL Action") }}</q-item-section>
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
        $pgettext("Agent actions", "Send Command")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-ripple v-close-popup @click="showRunScript(agent)">
      <q-item-section side>
        <q-icon size="xs" name="fas fa-terminal" />
      </q-item-section>
      <q-item-section>{{
        $pgettext("Agent actions", "Run Script")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-ripple :disable="favoriteScripts.length === 0">
      <q-item-section side>
        <q-icon size="xs" name="star" />
      </q-item-section>
      <q-item-section>{{ $gettext("Run Favorited Script") }}</q-item-section>
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
      <q-item-section>{{ $gettext("Remote Background") }}</q-item-section>
    </q-item>

    <!-- maintenance mode -->
    <q-item clickable v-close-popup @click="toggleMaintenance(agent)">
      <q-item-section side>
        <q-icon size="xs" name="construction" />
      </q-item-section>
      <q-item-section>
        {{
          agent.maintenance_mode
            ? $gettext("Disable Maintenance Mode")
            : $gettext("Enable Maintenance Mode")
        }}
      </q-item-section>
    </q-item>

    <!-- patch management -->
    <q-item clickable>
      <q-item-section side>
        <q-icon size="xs" name="system_update" />
      </q-item-section>
      <q-item-section>{{ $gettext("Patch Management") }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>

      <q-menu auto-close anchor="top right" self="top left">
        <q-list dense style="min-width: 100px">
          <q-item clickable v-ripple @click="runPatchStatusScan(agent)">
            <q-item-section>{{
              $gettext("Run Patch Status Scan")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="installPatches(agent)">
            <q-item-section>{{
              $gettext("Install Patches Now")
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
        $pgettext("Agent actions", "Run Checks")
      }}</q-item-section>
    </q-item>

    <q-item clickable v-close-popup @click="wakeUp(agent)">
      <q-item-section side>
        <q-icon size="xs" name="offline_bolt" />
      </q-item-section>
      <q-item-section>{{ $gettext("Wake-Up (WoL)") }}</q-item-section>
    </q-item>

    <q-item clickable>
      <q-item-section side>
        <q-icon size="xs" name="power_settings_new" />
      </q-item-section>
      <q-item-section>{{ $gettext("Reboot") }}</q-item-section>
      <q-item-section side>
        <q-icon name="keyboard_arrow_right" />
      </q-item-section>

      <q-menu auto-close anchor="top right" self="top left">
        <q-list dense style="min-width: 100px">
          <!-- reboot now -->
          <q-item clickable v-ripple @click="rebootNow(agent)">
            <q-item-section>{{ $gettext("Now") }}</q-item-section>
          </q-item>
          <!-- reboot later -->
          <q-item clickable v-ripple @click="showRebootLaterModal(agent)">
            <q-item-section>{{ $gettext("Later") }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>

    <q-item clickable v-close-popup @click="shutdown(agent)">
      <q-item-section side>
        <q-icon size="xs" name="power" />
      </q-item-section>
      <q-item-section>{{ $gettext("Shutdown") }}</q-item-section>
    </q-item>

    <q-item clickable v-close-popup @click="showPolicyAdd(agent)">
      <q-item-section side>
        <q-icon size="xs" name="policy" />
      </q-item-section>
      <q-item-section>{{
        $gettext("Assign Automation Policy")
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
        $pgettext("Agent actions", "Reporting")
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
      <q-item-section>{{ $gettext("Agent Recovery") }}</q-item-section>
    </q-item>

    <q-item clickable v-close-popup @click="pingAgent(agent)">
      <q-item-section side>
        <q-icon size="xs" name="delete" />
      </q-item-section>
      <q-item-section>{{ $gettext("Remove Agent") }}</q-item-section>
    </q-item>

    <q-separator />
    <q-item clickable v-close-popup>
      <q-item-section>{{ $gettext("Close") }}</q-item-section>
    </q-item>
  </q-list>
</template>

<script>
import { gettext } from "@/gettext";
// composition imports
import { ref, inject, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
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
          gettext.$gettext("Maintenance mode was %{mode} on %{hostname}", {
            mode: agent.maintenance_mode
              ? gettext.$pgettext("General status", "Disabled").toLowerCase()
              : gettext.$pgettext("General status", "Enabled").toLowerCase(),
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
          gettext.$gettext("Scan will be run shortly on %{hostname}", {
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
        title: gettext.$gettext("VNC Server Port"),
        message: gettext.$gettext("Enter the VNC server port:"),
        prompt: {
          model: "5900",
          type: "text",
        },
        cancel: true,
        ok: { label: gettext.$gettext("Launch"), color: "primary" },
        persistent: true,
      }).onOk((port) => {
        runWebVNC(agent_id, port);
      });
    }

    function rebootNow(agent) {
      $q.dialog({
        title: gettext.$gettext("Are you sure?"),
        message: gettext.$gettext("Reboot %{hostname} now", {
          hostname: agent.hostname,
        }),
        cancel: true,
        persistent: true,
      }).onOk(async () => {
        $q.loading.show();
        try {
          await agentRebootNow(agent.agent_id);
          notifySuccess(
            gettext.$gettext("%{hostname} will now be restarted", {
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
          actionVerb: gettext.$gettext("shutdown"),
          title: gettext.$gettext("Confirm Shutdown"),
          okLabel: gettext.$gettext("Shutdown"),
          okColor: "negative",
        },
      }).onOk(async () => {
        $q.loading.show();
        try {
          await agentShutdown(agent.agent_id);
          notifySuccess(
            gettext.$gettext("%{hostname} will now be shutdown", {
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
            title: gettext.$gettext("Agent offline"),
            message: gettext.$gettext(
              "%{hostname} cannot be contacted. Would you like to continue with the uninstall? If so, the agent will need to be manually uninstalled from the computer.",
              {
                hostname: agent.hostname,
              },
            ),
            cancel: { label: gettext.$gettext("No"), color: "negative" },
            ok: { label: gettext.$gettext("Yes"), color: "positive" },
            persistent: true,
          })
            .onOk(() => deleteAgent(agent))
            .onCancel(() => {
              return;
            });
        } else if (data.status === "online") {
          deleteAgent(agent);
        } else {
          notifyError(gettext.$gettext("Something went wrong"));
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
          actionVerb: gettext.$gettext("deletion"),
          title: gettext.$gettext("Confirm Deletion"),
          okLabel: gettext.$pgettext("Agent actions", "Uninstall"),
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
