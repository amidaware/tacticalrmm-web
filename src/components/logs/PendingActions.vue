<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="height: 70vh; min-width: 70vw">
      <q-bar>
        <q-btn
          @click="getPendingActions"
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
        />
        {{
          agent
            ? $t("settings.pendingActions.titleForAgent", {
                hostname: agent.hostname,
              })
            : $t("settings.pendingActions.allPendingActions")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>
      <q-table
        dense
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        class="remote-bg-tbl-sticky"
        style="max-height: 65vh"
        :rows="filteredActions"
        :columns="columns"
        :visible-columns="visibleColumns"
        :pagination="{ rowsPerPage: 0, sortBy: 'status', descending: false }"
        row-key="id"
        virtual-scroll
        :rows-per-page-options="[0]"
        :no-data-label="$t('settings.pendingActions.noPendingActions')"
        :loading="loading"
      >
        <template v-slot:top>
          <q-space />
          <q-btn
            :label="
              showCompleted
                ? $t('settings.pendingActions.hideCompleted', {
                    count: completedCount,
                  })
                : $t('settings.pendingActions.showCompleted', {
                    count: completedCount,
                  })
            "
            :icon="showCompleted ? 'visibility_off' : 'visibility'"
            @click="showCompleted = !showCompleted"
            dense
            flat
          />
        </template>

        <template v-slot:body="props">
          <q-tr class="cursor-pointer">
            <q-menu context-menu auto-close>
              <q-list dense>
                <q-item
                  :disable="
                    props.row.status === 'completed' ||
                    props.row.action_type === 'agentinstall'
                  "
                  clickable
                  @click="cancelPendingAction(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="fas fa-trash-alt" size="xs" />
                  </q-item-section>
                  <q-item-section>{{
                    $t("settings.pendingActions.cancelAction")
                  }}</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup>
                  <q-item-section>{{
                    $t("common.buttons.close")
                  }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <q-td v-if="props.row.action_type === 'schedreboot'">
              <q-icon name="power_settings_new" size="sm" />
            </q-td>
            <q-td v-else-if="props.row.action_type === 'agentupdate'">
              <q-icon name="update" size="sm" />
            </q-td>
            <q-td v-else-if="props.row.action_type === 'chocoinstall'">
              <q-icon name="download" size="sm" />
            </q-td>
            <q-td v-if="props.row.status !== 'completed'">
              <span v-if="props.row.action_type === 'agentupdate'">{{
                getNextAgentUpdateTime()
              }}</span>
              <span v-else>{{
                props.row.action_type === "schedreboot"
                  ? formatDate(props.row.due)
                  : props.row.due
              }}</span>
            </q-td>
            <q-td v-else>{{ $t("settings.pendingActions.completed") }}</q-td>
            <q-td>{{ props.row.description }}</q-td>
            <q-td v-if="!agent">{{ props.row.hostname }}</q-td>
            <q-td v-if="!agent">{{ props.row.client }}</q-td>
            <q-td v-if="!agent">{{ props.row.site }}</q-td>
            <q-td
              v-if="
                props.row.action_type === 'chocoinstall' &&
                props.row.status === 'completed'
              "
            >
              <q-btn
                color="primary"
                icon="preview"
                size="sm"
                :label="$t('settings.pendingActions.viewOutput')"
                @click="showOutput(props.row.details.output)"
              />
            </q-td>
            <q-td v-else></q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";
import {
  fetchPendingActions,
  fetchAgentPendingActions,
  deletePendingAction,
} from "@/api/logs";
import { getNextAgentUpdateTime } from "@/utils/format";
import { notifySuccess } from "@/utils/notify";
import PreDialog from "@/components/ui/PreDialog.vue";

export default {
  name: "PendingActions",
  emits: [...useDialogPluginComponent.emits],
  props: {
    agent: Object,
  },
  setup(props) {
    // setup quasar dialog plugin
    const { dialogRef, onDialogHide } = useDialogPluginComponent();
    const $q = useQuasar();
    const { t } = useI18n();

    // vuex store
    const store = useStore();
    const formatDate = computed(() => store.getters.formatDate);

    const columns = [
      { name: "id", field: "id" },
      { name: "status", field: "status" },
      {
        name: "type",
        label: t("settings.pendingActions.columns.type"),
        field: "action_type",
        align: "left",
        sortable: true,
      },
      {
        name: "due",
        label: t("settings.pendingActions.columns.due"),
        field: "due",
        align: "left",
        sortable: true,
      },
      {
        name: "desc",
        label: t("settings.pendingActions.columns.description"),
        field: "description",
        align: "left",
        sortable: true,
      },
      {
        name: "agent",
        label: t("settings.pendingActions.columns.agent"),
        field: "hostname",
        align: "left",
        sortable: true,
      },
      {
        name: "client",
        label: t("settings.pendingActions.columns.client"),
        field: "client",
        align: "left",
        sortable: true,
      },
      {
        name: "site",
        label: t("settings.pendingActions.columns.site"),
        field: "site",
        align: "left",
        sortable: true,
      },
      { name: "details", field: "details", align: "left", sortable: false },
    ];

    // pending actions logic
    const actions = ref([]);
    const showCompleted = ref(false);
    const loading = ref(false);
    const completedCount = computed(() => {
      try {
        return actions.value.filter((action) => action.status === "completed")
          .length;
      } catch (e) {
        console.error(e);
        return 0;
      }
    });

    const visibleColumns = computed(() => {
      if (props.agent) return ["type", "due", "desc", "details"];
      else return ["type", "due", "desc", "agent", "client", "site", "details"];
    });

    const filteredActions = computed(() => {
      if (showCompleted.value) return actions.value;
      else
        return actions.value.filter((action) => action.status !== "completed");
    });

    function showOutput(details) {
      $q.dialog({
        component: PreDialog,
        componentProps: {
          title: t("settings.pendingActions.outputDetailsTitle"),
          dialogStyle: "width: 75vw; max-width: 85vw; max-height: 65vh;",
          message: details,
        },
      });
    }

    async function getPendingActions() {
      loading.value = true;
      try {
        actions.value = props.agent
          ? await fetchAgentPendingActions(props.agent.agent_id)
          : await fetchPendingActions();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    function cancelPendingAction(action) {
      $q.dialog({
        title: t("settings.pendingActions.deletePendingActionTitle"),
        cancel: true,
        ok: { label: t("common.buttons.delete"), color: "negative" },
      }).onOk(async () => {
        loading.value = true;
        try {
          const result = await deletePendingAction(action.id);
          notifySuccess(result);
          await getPendingActions();
          store.dispatch("refreshDashboard");
        } catch (e) {
          console.error(e);
        }
        loading.value = false;
      });
    }

    onMounted(getPendingActions);

    return {
      // reactive data
      filteredActions,
      loading,
      showCompleted,
      completedCount,
      visibleColumns,

      // methods
      showOutput,
      getPendingActions,
      cancelPendingAction,
      getNextAgentUpdateTime,
      formatDate,

      // non-reactive data
      columns,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
