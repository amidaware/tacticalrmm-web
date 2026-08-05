<template>
  <q-dialog ref="dialog" @hide="onHide">
    <div class="q-dialog-plugin" style="width: 90vw; max-width: 90vw">
      <q-card>
        <q-bar>
          <q-btn
            ref="refresh"
            @click="refresh"
            class="q-mr-sm"
            dense
            flat
            push
            icon="refresh"
          />{{ $t("settings.automationManager.title") }}
          <q-space />
          <q-btn dense flat icon="close" v-close-popup>
            <q-tooltip class="bg-white text-primary">{{
              $t("common.buttons.close")
            }}</q-tooltip>
          </q-btn>
        </q-bar>
        <q-card-section>
          <div class="q-gutter-sm">
            <q-btn
              :label="$t('settings.automationManager.new')"
              dense
              flat
              push
              unelevated
              no-caps
              icon="add"
              @click="showAddPolicyForm"
            />
            <q-btn
              :label="$t('settings.automationManager.policyOverview')"
              dense
              flat
              push
              unelevated
              no-caps
              icon="remove_red_eye"
              @click="showPolicyOverview"
            />
          </div>
          <div class="scroll" style="min-height: 35vh; max-height: 35vh">
            <q-table
              :table-class="{
                'table-bgcolor': !$q.dark.isActive,
                'table-bgcolor-dark': $q.dark.isActive,
              }"
              class="tabs-tbl-sticky"
              :rows="policies"
              :columns="columns"
              v-model:pagination="pagination"
              :rows-per-page-options="[0]"
              dense
              row-key="id"
              binary-state-sort
              hide-pagination
              virtual-scroll
              :no-data-label="$t('settings.automationManager.noPolicies')"
            >
              <!-- header slots -->
              <template v-slot:header-cell-active="props">
                <q-th :props="props" auto-width>
                  <q-icon name="power_settings_new" size="1.5em">
                    <q-tooltip>{{
                      $t("settings.automationManager.enablePolicy")
                    }}</q-tooltip>
                  </q-icon>
                </q-th>
              </template>

              <template v-slot:header-cell-enforced="props">
                <q-th :props="props" auto-width>
                  <q-icon name="security" size="1.5em">
                    <q-tooltip>{{
                      $t("settings.automationManager.enforcePolicyTooltip")
                    }}</q-tooltip>
                  </q-icon>
                </q-th>
              </template>

              <!-- body slots -->
              <template v-slot:body="props">
                <q-tr
                  :props="props"
                  class="cursor-pointer"
                  :class="rowSelectedClass(props.row.id, selectedPolicy)"
                  @click="selectedPolicy = props.row"
                  @contextmenu="selectedPolicy = props.row"
                  @dblclick="showEditPolicyForm(props.row)"
                >
                  <!-- context menu -->
                  <q-menu context-menu>
                    <q-list dense style="min-width: 200px">
                      <q-item
                        clickable
                        v-close-popup
                        @click="showEditPolicyForm(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="edit" />
                        </q-item-section>
                        <q-item-section>{{
                          $t("common.buttons.edit")
                        }}</q-item-section>
                      </q-item>

                      <q-item
                        clickable
                        v-close-popup
                        @click="showCopyPolicyForm(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="content_copy" />
                        </q-item-section>
                        <q-item-section>{{
                          $t("settings.automationManager.copy")
                        }}</q-item-section>
                      </q-item>

                      <q-item
                        clickable
                        v-close-popup
                        @click="deletePolicy(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="delete" />
                        </q-item-section>
                        <q-item-section>{{
                          $t("common.buttons.delete")
                        }}</q-item-section>
                      </q-item>

                      <q-separator></q-separator>

                      <q-item
                        clickable
                        v-close-popup
                        @click="showRelations(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="account_tree" />
                        </q-item-section>
                        <q-item-section>{{
                          $t("settings.automationManager.showRelations")
                        }}</q-item-section>
                      </q-item>

                      <q-item
                        clickable
                        v-close-popup
                        @click="showPolicyExclusions(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="rule" />
                        </q-item-section>
                        <q-item-section>{{
                          $t("settings.automationManager.policyExclusions")
                        }}</q-item-section>
                      </q-item>

                      <q-item
                        clickable
                        v-close-popup
                        @click="showPatchPolicyForm(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="system_update" />
                        </q-item-section>
                        <q-item-section>{{
                          patchPolicyText(props.row)
                        }}</q-item-section>
                      </q-item>

                      <q-item
                        clickable
                        v-close-popup
                        @click="showAlertTemplateAdd(props.row)"
                      >
                        <q-item-section side>
                          <q-icon name="warning" />
                        </q-item-section>
                        <q-item-section>{{
                          alertTemplateText(props.row)
                        }}</q-item-section>
                      </q-item>

                      <q-separator></q-separator>

                      <q-item clickable v-close-popup>
                        <q-item-section>{{
                          $t("common.buttons.close")
                        }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                  <!-- enabled checkbox -->
                  <q-td>
                    <q-checkbox
                      dense
                      @update:model-value="toggleCheckbox(props.row, 'Active')"
                      v-model="props.row.active"
                    />
                  </q-td>
                  <!-- enforced checkbox -->
                  <q-td>
                    <q-checkbox
                      dense
                      @update:model-value="
                        toggleCheckbox(props.row, 'Enforced')
                      "
                      v-model="props.row.enforced"
                    />
                  </q-td>
                  <q-td>
                    {{ props.row.name }}
                    <q-chip
                      v-if="props.row.default_server_policy"
                      color="primary"
                      text-color="white"
                      size="sm"
                      >{{
                        $t("settings.automationManager.defaultServer")
                      }}</q-chip
                    >
                    <q-chip
                      v-if="props.row.default_workstation_policy"
                      color="primary"
                      text-color="white"
                      size="sm"
                      >{{
                        $t("settings.automationManager.defaultWorkstation")
                      }}</q-chip
                    >
                  </q-td>
                  <q-td>{{ props.row.desc }}</q-td>
                  <q-td>
                    <span
                      style="cursor: pointer; text-decoration: underline"
                      class="text-primary"
                      @click="showRelations(props.row)"
                      >{{
                        $t("settings.automationManager.showRelationsCount", {
                          count: props.row.agents_count,
                        })
                      }}</span
                    >
                  </q-td>
                  <q-td>
                    <span
                      style="cursor: pointer; text-decoration: underline"
                      class="text-primary"
                      @click="showPolicyExclusions(props.row)"
                      >{{
                        $t(
                          "settings.automationManager.showPolicyExclusionsCount",
                          {
                            count:
                              props.row.excluded_agents.length +
                              props.row.excluded_clients.length +
                              props.row.excluded_sites.length,
                          },
                        )
                      }}</span
                    >
                  </q-td>
                  <q-td>
                    <span
                      style="cursor: pointer; text-decoration: underline"
                      class="text-primary"
                      @click="showPatchPolicyForm(props.row)"
                      >{{ patchPolicyText(props.row) }}</span
                    >
                  </q-td>
                  <q-td>
                    <span
                      style="cursor: pointer; text-decoration: underline"
                      class="text-primary"
                      @click="showAlertTemplateAdd(props.row)"
                      >{{ alertTemplateText(props.row) }}</span
                    >
                  </q-td>
                  <q-td>
                    <q-icon
                      name="content_copy"
                      size="1.5em"
                      @click="showCopyPolicyForm(props.row)"
                    >
                      <q-tooltip>{{
                        $t("settings.automationManager.createCopyTooltip")
                      }}</q-tooltip>
                    </q-icon>
                  </q-td>
                </q-tr>
              </template>
            </q-table>
          </div>
        </q-card-section>

        <q-card-section>
          <q-tabs
            v-model="subtab"
            dense
            inline-label
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
            no-caps
          >
            <q-tab
              name="checks"
              icon="fas fa-check-double"
              :label="$t('settings.rolesForm.sections.checks')"
            />
            <q-tab
              name="tasks"
              icon="fas fa-tasks"
              :label="$t('settings.rolesForm.sections.tasks')"
            />
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="subtab" :animated="false">
            <q-tab-panel name="checks">
              <div class="scroll" style="min-height: 25vh; max-height: 25vh">
                <PolicyChecksTab
                  v-if="!!selectedPolicy"
                  :selectedPolicy="selectedPolicy.id"
                />
              </div>
            </q-tab-panel>
            <q-tab-panel name="tasks">
              <div class="scroll" style="min-height: 25vh; max-height: 25vh">
                <PolicyAutomatedTasksTab
                  v-if="!!selectedPolicy"
                  :selectedPolicy="selectedPolicy.id"
                />
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>
      </q-card>
    </div>
  </q-dialog>
</template>

<script>
import mixins from "@/mixins/mixins";
import DialogWrapper from "@/components/ui/DialogWrapper.vue";
import PolicyForm from "@/components/automation/modals/PolicyForm.vue";
import PolicyOverview from "@/components/automation/PolicyOverview.vue";
import RelationsView from "@/components/automation/modals/RelationsView.vue";
import PatchPolicyForm from "@/components/modals/agents/PatchPolicyForm.vue";
import AlertTemplateAdd from "@/components/modals/alerts/AlertTemplateAdd.vue";
import PolicyExclusions from "@/components/automation/modals/PolicyExclusions.vue";
import PolicyChecksTab from "@/components/automation/PolicyChecksTab.vue";
import PolicyAutomatedTasksTab from "@/components/automation/PolicyAutomatedTasksTab.vue";

export default {
  name: "AutomationManager",
  emits: ["hide", "ok", "cancel"],
  components: { PolicyChecksTab, PolicyAutomatedTasksTab },
  mixins: [mixins],
  data() {
    return {
      subtab: "checks",
      policies: [],
      selectedPolicy: null,
      columns: [
        {
          name: "active",
          label: this.$t("settings.automationManager.columns.active"),
          field: "active",
          align: "left",
        },
        {
          name: "enforced",
          label: this.$t("settings.automationManager.columns.enforced"),
          field: "enforced",
          align: "left",
        },
        {
          name: "name",
          label: this.$t("settings.common.name"),
          field: "name",
          align: "left",
          sortable: true,
        },
        {
          name: "desc",
          label: this.$t("settings.automationManager.columns.description"),
          field: "desc",
          align: "left",
        },
        {
          name: "relations",
          label: this.$t("settings.automationManager.columns.relations"),
          field: "relations",
          align: "left",
        },
        {
          name: "exclusions",
          label: this.$t("settings.automationManager.columns.exclusions"),
          align: "left",
        },
        {
          name: "winupdatepolicy",
          label: this.$t("settings.automationManager.columns.patchPolicy"),
          field: "winupdatepolicy",
          align: "left",
        },
        {
          name: "alert_template",
          label: this.$t("settings.automationManager.columns.alertTemplate"),
          field: "alert_template",
          align: "left",
        },
        {
          name: "actions",
          label: this.$t("settings.automationManager.columns.actions"),
          field: "actions",
          align: "left",
        },
      ],
      pagination: {
        rowsPerPage: 0,
        sortBy: "name",
        descending: true,
      },
    };
  },
  methods: {
    getPolicies() {
      this.$q.loading.show();
      this.$axios
        .get("/automation/policies/")
        .then((r) => {
          this.policies = r.data;
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    clearRow() {
      this.selectedPolicy = null;
    },
    refresh() {
      this.getPolicies();
      this.clearRow();
    },
    deletePolicy(policy) {
      this.$q
        .dialog({
          title: this.$t("settings.automationManager.deletePolicyTitle"),
          cancel: true,
          ok: { label: this.$t("common.buttons.delete"), color: "negative" },
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/automation/policies/${policy.id}/`)
            .then(() => {
              this.refresh();
              this.$q.loading.hide();
              this.notifySuccess(
                this.$t("settings.automationManager.notify.policyDeleted"),
              );
              this.$store.dispatch("loadTree");
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        });
    },
    showRelations(policy) {
      this.$q.dialog({
        component: RelationsView,
        componentProps: {
          policy: policy,
        },
      });
    },
    showPolicyOverview() {
      this.$q.dialog({
        component: PolicyOverview,
      });
    },
    showAddPolicyForm() {
      this.$q
        .dialog({
          component: PolicyForm,
        })
        .onOk(() => {
          this.refresh();
        });
    },
    showCopyPolicyForm(policy) {
      this.$q
        .dialog({
          component: PolicyForm,
          componentProps: {
            copyPolicy: policy,
          },
        })
        .onOk(() => {
          this.refresh();
        });
    },
    showEditPolicyForm(policy) {
      this.$q
        .dialog({
          component: PolicyForm,
          componentProps: {
            policy: policy,
          },
        })
        .onOk(() => {
          this.refresh();
        });
    },
    showAlertTemplateAdd(policy) {
      this.$q
        .dialog({
          component: AlertTemplateAdd,
          componentProps: {
            type: "policy",
            object: policy,
          },
        })
        .onOk(() => {
          this.refresh();
        });
    },
    showPatchPolicyForm(policy) {
      this.$q
        .dialog({
          component: DialogWrapper,
          componentProps: {
            title:
              policy.winupdatepolicy.length > 0
                ? this.$t("settings.automationManager.editPatchPolicy")
                : this.$t("settings.automationManager.addPatchPolicy"),
            vuecomponent: PatchPolicyForm,
            componentProps: {
              policy: policy,
            },
          },
        })
        .onOk(() => {
          this.refresh();
        });
    },
    showPolicyExclusions(policy) {
      this.$q
        .dialog({
          component: PolicyExclusions,
          componentProps: {
            policy: policy,
          },
        })
        .onOk(() => {
          this.refresh();
        });
    },
    toggleCheckbox(policy, type) {
      this.$q.loading.show();
      let text = "";

      const data = {
        id: policy.id,
        name: policy.name,
        desc: policy.desc,
      };

      if (type === "Active") {
        text = !policy.active
          ? this.$t("settings.automationManager.notify.policyEnabled")
          : this.$t("settings.automationManager.notify.policyDisabled");
        data["active"] = !policy.active;
      } else if (type === "Enforced") {
        text = !policy.enforced
          ? this.$t("settings.automationManager.notify.policyEnforced")
          : this.$t(
              "settings.automationManager.notify.policyEnforcementDisabled",
            );
        data["enforced"] = !policy.enforced;
      }

      this.$axios
        .put(`/automation/policies/${data.id}/`, data)
        .then(() => {
          this.refresh();
          this.$q.loading.hide();
          this.notifySuccess(text);
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    patchPolicyText(policy) {
      return policy.winupdatepolicy.length > 0
        ? this.$t("settings.automationManager.modifyPatchPolicy")
        : this.$t("settings.automationManager.createPatchPolicy");
    },
    alertTemplateText(policy) {
      return policy.alert_template
        ? this.$t("settings.automationManager.modifyAlertTemplate")
        : this.$t("settings.automationManager.assignAlertTemplate");
    },
    rowSelectedClass(id, selectedPolicy) {
      if (selectedPolicy && selectedPolicy.id === id)
        return this.$q.dark.isActive ? "highlight-dark" : "highlight";
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
    this.getPolicies();
  },
};
</script>
