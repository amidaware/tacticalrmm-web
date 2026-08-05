<template>
  <div class="row">
    <div class="col-12">
      <q-btn
        v-if="!!selectedPolicy"
        class="q-mr-sm"
        dense
        flat
        push
        @click="getChecks"
        icon="refresh"
      />
      <q-btn-dropdown
        v-if="!!selectedPolicy"
        icon="add"
        :label="$t('checks.policyTab.new')"
        no-caps
        dense
        flat
      >
        <q-list dense style="min-width: 200px">
          <q-item clickable v-close-popup @click="showCheckModal('diskspace')">
            <q-item-section side>
              <q-icon size="xs" name="far fa-hdd" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.diskSpace")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showCheckModal('ping')">
            <q-item-section side>
              <q-icon size="xs" name="fas fa-network-wired" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.ping")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showCheckModal('cpuload')">
            <q-item-section side>
              <q-icon size="xs" name="fas fa-microchip" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.cpuLoad")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showCheckModal('memory')">
            <q-item-section side>
              <q-icon size="xs" name="fas fa-memory" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.memory")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showCheckModal('winsvc')">
            <q-item-section side>
              <q-icon size="xs" name="fas fa-cogs" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.windowsService")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showCheckModal('script')">
            <q-item-section side>
              <q-icon size="xs" name="fas fa-terminal" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.script")
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showCheckModal('eventlog')">
            <q-item-section side>
              <q-icon size="xs" name="fas fa-clipboard-list" />
            </q-item-section>
            <q-item-section>{{
              $t("checks.policyTab.types.eventLog")
            }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <q-table
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        class="tabs-tbl-sticky"
        :rows="checks"
        :columns="columns"
        v-model:pagination="pagination"
        :rows-per-page-options="[0]"
        row-key="id"
        binary-state-sort
        dense
        hide-pagination
        virtual-scroll
      >
        <!-- No data Slot -->
        <template v-slot:no-data>
          <div class="full-width row flex-center q-gutter-sm">
            <span v-if="!selectedPolicy">{{
              $t("checks.policyTab.empty.selectPolicy")
            }}</span>
            <span v-else>{{ $t("checks.policyTab.empty.noChecks") }}</span>
          </div>
        </template>
        <!-- header slots -->
        <template v-slot:header-cell-smsalert="props">
          <q-th auto-width :props="props">
            <q-icon name="phone_android" size="1.5em">
              <q-tooltip>{{
                $t("checks.policyTab.headers.smsAlert")
              }}</q-tooltip>
            </q-icon>
          </q-th>
        </template>
        <template v-slot:header-cell-emailalert="props">
          <q-th auto-width :props="props">
            <q-icon name="email" size="1.5em">
              <q-tooltip>{{
                $t("checks.policyTab.headers.emailAlert")
              }}</q-tooltip>
            </q-icon>
          </q-th>
        </template>
        <template v-slot:header-cell-dashboardalert="props">
          <q-th auto-width :props="props">
            <q-icon name="notifications" size="1.5em">
              <q-tooltip>{{
                $t("checks.policyTab.headers.dashboardAlert")
              }}</q-tooltip>
            </q-icon>
          </q-th>
        </template>
        <template v-slot:header-cell-statusicon="props">
          <q-th auto-width :props="props"></q-th>
        </template>
        <!-- body slots -->
        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            @dblclick="showCheckModal(props.row.check_type, props.row)"
          >
            <!-- context menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  clickable
                  v-close-popup
                  @click="showCheckModal(props.row.check_type, props.row)"
                >
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>{{
                    $t("checks.policyTab.menu.edit")
                  }}</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="deleteCheck(props.row)">
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>{{
                    $t("checks.policyTab.menu.delete")
                  }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item
                  clickable
                  v-close-popup
                  @click="showPolicyStatus(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="sync" />
                  </q-item-section>
                  <q-item-section>{{
                    $t("checks.policyTab.menu.policyStatus")
                  }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item clickable v-close-popup>
                  <q-item-section>{{
                    $t("checks.policyTab.menu.close")
                  }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <!-- tds -->
            <q-td>
              <q-checkbox
                dense
                @update:model-value="
                  checkAlert(props.row.id, 'Text', props.row.text_alert)
                "
                v-model="props.row.text_alert"
              />
            </q-td>
            <q-td>
              <q-checkbox
                dense
                @update:model-value="
                  checkAlert(props.row.id, 'Email', props.row.email_alert)
                "
                v-model="props.row.email_alert"
              />
            </q-td>
            <q-td>
              <q-checkbox
                dense
                @update:model-value="
                  checkAlert(
                    props.row.id,
                    'Dashboard',
                    props.row.dashboard_alert,
                  )
                "
                v-model="props.row.dashboard_alert"
              />
            </q-td>
            <q-td>{{ props.row.readable_desc }}</q-td>
            <q-td>
              <span
                style="cursor: pointer; text-decoration: underline"
                @click="showPolicyStatus(props.row)"
                class="status-cell text-primary"
                >{{ $t("checks.policyTab.seeStatus") }}</span
              >
            </q-td>
            <q-td v-if="props.row.assignedtasks.length > 1">{{
              $t("checks.policyTab.assignedTasks.count", {
                count: props.row.assignedtasks.length,
              })
            }}</q-td>
            <q-td v-else-if="props.row.assignedtasks.length === 1">{{
              props.row.assignedtasks[0].name
            }}</q-td>
            <q-td v-else></q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import mixins from "@/mixins/mixins";
import PolicyStatus from "@/components/automation/modals/PolicyStatus.vue";
import DiskSpaceCheck from "@/components/checks/DiskSpaceCheck.vue";
import PingCheck from "@/components/checks/PingCheck.vue";
import CpuLoadCheck from "@/components/checks/CpuLoadCheck.vue";
import MemCheck from "@/components/checks/MemCheck.vue";
import WinSvcCheck from "@/components/checks/WinSvcCheck.vue";
import ScriptCheck from "@/components/checks/ScriptCheck.vue";
import EventLogCheck from "@/components/checks/EventLogCheck.vue";

export default {
  name: "PolicyChecksTab",
  mixins: [mixins],
  props: {
    selectedPolicy: !Number,
  },
  data() {
    return {
      checks: [],
      columns: [
        { name: "smsalert", field: "text_alert", align: "left" },
        { name: "emailalert", field: "email_alert", align: "left" },
        { name: "dashboardalert", field: "dashboard_alert", align: "left" },
        {
          name: "desc",
          field: "readable_desc",
          label: this.$t("checks.policyTab.columns.description"),
          align: "left",
          sortable: true,
        },
        {
          name: "status",
          label: this.$t("checks.policyTab.columns.status"),
          field: "status",
          align: "left",
        },
        {
          name: "assigned_task",
          label: this.$t("checks.policyTab.columns.assignedTasks"),
          field: "assigned_task",
          align: "left",
          sortable: true,
        },
      ],
      pagination: {
        rowsPerPage: 0,
        sortBy: "status",
        descending: true,
      },
    };
  },
  watch: {
    selectedPolicy: function (newValue, oldValue) {
      if (newValue !== oldValue) this.getChecks();
    },
  },
  computed: {
    ...mapState(["dash_positive_color", "dash_warning_color"]),
  },
  methods: {
    getChecks() {
      this.$q.loading.show();
      this.$axios
        .get(`/automation/policies/${this.selectedPolicy}/checks/`)
        .then((r) => {
          this.checks = r.data;
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    checkAlert(id, alert_type, action) {
      this.$q.loading.show();
      const data = {};

      if (alert_type === "Email") {
        data.email_alert = !action;
      } else if (alert_type === "Text") {
        data.text_alert = !action;
      } else {
        data.dashboard_alert = !action;
      }

      data.check_alert = true;
      const act = !action
        ? this.$t("checks.policyTab.actions.enabled")
        : this.$t("checks.policyTab.actions.disabled");
      const alertTypeLabel =
        alert_type === "Email"
          ? this.$t("checks.policyTab.alertTypes.email")
          : alert_type === "Text"
            ? this.$t("checks.policyTab.alertTypes.sms")
            : this.$t("checks.policyTab.alertTypes.dashboard");
      const color = !action
        ? this.dash_positive_color
        : this.dash_warning_color;
      this.$axios
        .put(`/checks/${id}/`, data)
        .then(() => {
          this.$q.loading.hide();
          this.$q.notify({
            color: color,
            icon: "fas fa-check-circle",
            message: this.$t("checks.policyTab.notify.alertsToggled", {
              type: alertTypeLabel,
              action: act,
            }),
          });
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    deleteCheck(check) {
      this.$q
        .dialog({
          title: this.$t("checks.policyTab.dialog.deleteTitle", {
            type: check.check_type,
          }),
          ok: {
            label: this.$t("checks.policyTab.menu.delete"),
            color: "negative",
          },
          cancel: true,
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/checks/${check.id}/`)
            .then(() => {
              this.getChecks();
              this.$q.loading.hide();
              this.notifySuccess(
                this.$t("checks.policyTab.notify.checkDeleted"),
              );
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        });
    },
    showPolicyStatus(check) {
      this.$q.dialog({
        component: PolicyStatus,
        componentProps: {
          type: "check",
          item: check,
        },
      });
    },
    showCheckModal(type, check) {
      let component;

      if (type === "diskspace") component = DiskSpaceCheck;
      else if (type === "memory") component = MemCheck;
      else if (type === "cpuload") component = CpuLoadCheck;
      else if (type === "ping") component = PingCheck;
      else if (type === "winsvc") component = WinSvcCheck;
      else if (type === "eventlog") component = EventLogCheck;
      else if (type === "script") component = ScriptCheck;
      else return;

      this.$q
        .dialog({
          component: component,
          componentProps: {
            check: check,
            parent: !check ? { policy: this.selectedPolicy } : undefined,
          },
        })
        .onOk(this.getChecks);
    },
  },
  created() {
    this.getChecks();
  },
};
</script>
