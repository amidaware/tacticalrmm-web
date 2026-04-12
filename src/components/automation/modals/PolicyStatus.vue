<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="min-width: 70vw">
      <q-bar>
        <q-btn
          ref="refresh"
          @click="refresh"
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
        />
        {{ title.slice(0, 27) }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-table
          style="max-height: 35vh"
          :table-class="{
            'table-bgcolor': !$q.dark.isActive,
            'table-bgcolor-dark': $q.dark.isActive,
          }"
          class="tabs-tbl-sticky"
          :rows="data"
          :columns="columns"
          v-model:pagination="pagination"
          :rows-per-page-options="[0]"
          row-key="id"
          binary-state-sort
          dense
          virtual-scroll
          hide-pagination
          :no-data-label="$t('settings.policyStatus.noAgentsInPolicy')"
        >
          <!-- header slots -->
          <template v-slot:header-cell-statusicon="props">
            <q-th auto-width :props="props"></q-th>
          </template>
          <!-- body slots -->
          <template v-slot:body="props">
            <q-tr :props="props">
              <!-- tds -->
              <!-- agent hostname -->
              <q-td>{{ props.row.hostname }}</q-td>
              <!-- status icon -->
              <q-td v-if="props.row.status === 'passing'">
                <q-icon
                  style="font-size: 1.3rem"
                  :color="dash_positive_color"
                  name="check_circle"
                >
                  <q-tooltip>{{ $t("agents.shared.passing") }}</q-tooltip>
                </q-icon>
              </q-td>
              <q-td v-else-if="props.row.status === 'failing'">
                <q-icon
                  v-if="props.row.alert_severity === 'info'"
                  style="font-size: 1.3rem"
                  :color="dash_info_color"
                  name="info"
                >
                  <q-tooltip>{{ $t("agents.shared.informational") }}</q-tooltip>
                </q-icon>
                <q-icon
                  v-else-if="props.row.alert_severity === 'warning'"
                  style="font-size: 1.3rem"
                  :color="dash_warning_color"
                  name="warning"
                >
                  <q-tooltip>{{ $t("common.status.warning") }}</q-tooltip>
                </q-icon>
                <q-icon
                  v-else
                  style="font-size: 1.3rem"
                  :color="dash_negative_color"
                  name="error"
                >
                  <q-tooltip>{{ $t("common.status.error") }}</q-tooltip>
                </q-icon>
              </q-td>
              <q-td v-else></q-td>
              <!-- status text -->
              <q-td v-if="props.row.status === 'pending'">{{
                $t("settings.policyStatus.awaitingFirstSynchronization")
              }}</q-td>
              <q-td v-else-if="props.row.sync_status === 'notsynced'">{{
                $t("tasks.automatedTasksTab.syncStatus.willSyncOnNextCheckin")
              }}</q-td>
              <q-td v-else-if="props.row.sync_status === 'synced'">{{
                $t("tasks.automatedTasksTab.syncStatus.synced")
              }}</q-td>
              <q-td v-else-if="props.row.sync_status === 'pendingdeletion'">{{
                $t("tasks.automatedTasksTab.syncStatus.pendingDeletion")
              }}</q-td>
              <q-td v-else-if="props.row.sync_status === 'initial'">{{
                $t("tasks.automatedTasksTab.syncStatus.waitingForCreation")
              }}</q-td>
              <q-td v-else></q-td>
              <!-- more info -->
              <q-td v-if="props.row.check_type === 'ping'">
                <span
                  style="cursor: pointer; text-decoration: underline"
                  @click="pingInfo(props.row)"
                  class="ping-cell text-primary"
                  >{{ $t("tasks.automatedTasksTab.output") }}</span
                >
              </q-td>
              <q-td
                v-else-if="
                  props.row.check_type === 'script' ||
                  props.row.retcode ||
                  props.row.stdout ||
                  props.row.stderr
                "
              >
                <span
                  style="cursor: pointer; text-decoration: underline"
                  @click="showScriptOutput(props.row)"
                  class="script-cell text-primary"
                  >{{ $t("tasks.automatedTasksTab.output") }}</span
                >
              </q-td>
              <q-td v-else-if="props.row.check_type === 'eventlog'">
                <span
                  style="cursor: pointer; text-decoration: underline"
                  @click="showEventInfo(props.row)"
                  class="eventlog-cell text-primary"
                  >{{ $t("tasks.automatedTasksTab.output") }}</span
                >
              </q-td>
              <q-td
                v-else-if="
                  props.row.check_type === 'cpuload' ||
                  props.row.check_type === 'memory'
                "
                >{{ props.row.history_info }}</q-td
              >
              <q-td v-else-if="props.row.more_info">{{
                props.row.more_info
              }}</q-td>
              <q-td v-else>{{
                $t("tasks.automatedTasksTab.awaitingOutput")
              }}</q-td>
              <!-- last run -->
              <q-td>{{
                props.row.last_run
                  ? formatDate(props.row.last_run)
                  : $t("agents.shared.never")
              }}</q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { computed } from "vue";
import { useStore, mapState } from "vuex";
import ScriptOutput from "@/components/checks/ScriptOutput.vue";
import EventLogCheckOutput from "@/components/checks/EventLogCheckOutput.vue";
import PreDialog from "@/components/ui/PreDialog.vue";

export default {
  name: "PolicyStatus",
  emits: ["hide", "ok", "cancel"],
  props: {
    item: {
      required: true,
      type: Object,
    },
    type: {
      required: true,
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ["task", "check"].includes(value);
      },
    },
  },
  setup() {
    // setup vuex store
    const store = useStore();
    const formatDate = computed(() => store.getters.formatDate);

    return {
      formatDate,
    };
  },
  data() {
    return {
      data: [],
      columns: [
        {
          name: "agent",
          label: this.$t("settings.policyStatus.columns.hostname"),
          field: "agent",
          align: "left",
          sortable: true,
        },
        { name: "statusicon", align: "left" },
        {
          name: "status",
          label: this.$t("settings.policyStatus.columns.status"),
          field: "status",
          align: "left",
          sortable: true,
        },
        {
          name: "moreinfo",
          label: this.$t("settings.policyStatus.columns.moreInfo"),
          field: "more_info",
          align: "left",
          sortable: true,
        },
        {
          name: "datetime",
          label: this.$t("settings.policyStatus.columns.dateTime"),
          field: "last_run",
          align: "left",
          sortable: true,
        },
      ],
      pagination: {
        rowsPerPage: 0,
        sortBy: "status",
        descending: false,
      },
    };
  },
  computed: {
    ...mapState([
      "dash_info_color",
      "dash_positive_color",
      "dash_negative_color",
      "dash_warning_color",
    ]),
    title() {
      return !!this.item.readable_desc
        ? this.$t("settings.policyStatus.title", {
            name: this.item.readable_desc,
          })
        : this.$t("settings.policyStatus.title", { name: this.item.name });
    },
  },
  methods: {
    getCheckData() {
      this.$q.loading.show();
      this.$axios
        .get(`/automation/checks/${this.item.id}/status/`)
        .then((r) => {
          this.$q.loading.hide();
          this.data = r.data;
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    getTaskData() {
      this.$q.loading.show();
      this.$axios
        .get(`/automation/tasks/${this.item.id}/status/`)
        .then((r) => {
          this.$q.loading.hide();
          this.data = r.data;
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    pingInfo(check) {
      this.$q.dialog({
        component: PreDialog,
        componentProps: {
          title: check.readable_desc,
          dialogStyle: "width: 50vw; max-width: 60vw",
          message: check.more_info,
        },
      });
    },
    showEventInfo(data) {
      this.$q.dialog({
        component: EventLogCheckOutput,
        componentProps: {
          evtLogData: data,
        },
      });
    },
    showScriptOutput(script) {
      this.$q.dialog({
        component: ScriptOutput,
        componentProps: {
          scriptInfo: script,
        },
      });
    },
    refresh() {
      if (this.type === "task") {
        this.getTaskData();
      } else {
        this.getCheckData();
      }
    },
    show() {
      this.$refs.dialog.show();
    },
    hide() {
      this.$refs.dialog.hide();
    },
    onHide() {
      this.$emit("hide");
    },
  },
  mounted() {
    if (this.type === "task") {
      this.getTaskData();
    } else {
      this.getCheckData();
    }
  },
};
</script>
