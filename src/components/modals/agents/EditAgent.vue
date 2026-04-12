<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 800px">
      <q-splitter v-model="splitterModel">
        <template v-slot:before>
          <q-tabs dense v-model="tab" vertical class="text-primary">
            <q-tab
              name="general"
              :label="$t('agents.editAgent.tabs.general')"
            />
            <q-tab
              name="customfields"
              :label="$t('agents.editAgent.tabs.customFields')"
            />
            <q-tab name="patch" :label="$t('agents.editAgent.tabs.patches')" />
            <q-tab
              name="policies"
              :label="$t('agents.editAgent.tabs.automationPolicies')"
            />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-form @submit.prevent="editAgent">
            <q-card-section class="row items-center">
              <div class="text-h6">
                {{ $t("agents.editAgent.title", { hostname: agent.hostname }) }}
              </div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <div class="scroll" style="height: 65vh; max-height: 65vh">
              <q-tab-panels
                v-model="tab"
                animated
                transition-prev="jump-up"
                transition-next="jump-up"
              >
                <!-- general -->
                <q-tab-panel name="general">
                  <q-card-section class="row">
                    <div class="col-2">{{ $t("agents.editAgent.site") }}</div>
                    <div class="col-2"></div>
                    <tactical-dropdown
                      class="col-8"
                      v-model="agent.site"
                      :options="siteOptions"
                      outlined
                      mapOptions
                      filterable
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-2">{{ $t("agents.editAgent.type") }}</div>
                    <div class="col-2"></div>
                    <q-select
                      dense
                      options-dense
                      outlined
                      v-model="agent.monitoring_type"
                      :options="monTypesOptions"
                      emit-value
                      map-options
                      class="col-8"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-2">
                      {{ $t("agents.editAgent.description") }}
                    </div>
                    <div class="col-2"></div>
                    <q-input
                      outlined
                      dense
                      v-model="agent.description"
                      class="col-8"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-2">
                      {{ $t("agents.editAgent.timezone") }}
                    </div>
                    <div class="col-2"></div>
                    <tactical-dropdown
                      filterable
                      outlined
                      dense
                      options-dense
                      v-model="timezone"
                      :options="allTimezones"
                      class="col-8"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-10">
                      {{ $t("agents.editAgent.runChecksEvery") }}
                    </div>
                    <q-input
                      dense
                      type="number"
                      filled
                      :label="$t('agents.editAgent.seconds')"
                      v-model.number="agent.check_interval"
                      class="col-2"
                      :rules="[
                        (val) => !!val || $t('agents.shared.required'),
                        (val) =>
                          val >= 15 ||
                          $t('agents.editAgent.minimumSeconds', { min: 15 }),
                        (val) =>
                          val <= 86400 ||
                          $t('agents.editAgent.maximumSeconds', { max: 86400 }),
                      ]"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-10">
                      <q-icon
                        class="q-pr-sm"
                        name="fas fa-signal"
                        size="1.2em"
                        :color="dash_warning_color"
                      />
                      {{ $t("agents.editAgent.markAgentAs") }}
                      <span class="text-weight-bold">{{
                        $t("agents.editAgent.offline")
                      }}</span>
                      {{ $t("agents.editAgent.ifNotCheckedInAfter") }}
                    </div>
                    <q-input
                      dense
                      type="number"
                      filled
                      :label="$t('agents.editAgent.minutes')"
                      v-model.number="agent.offline_time"
                      class="col-2"
                      :rules="[
                        (val) => !!val || $t('agents.shared.required'),
                        (val) =>
                          val >= 2 ||
                          $t('agents.editAgent.minimumMinutes', { min: 2 }),
                        (val) =>
                          val < 9999999 ||
                          $t('agents.editAgent.maximumMinutes', {
                            max: 9999999,
                          }),
                      ]"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-10">
                      <q-icon
                        class="q-pr-sm"
                        name="fas fa-signal"
                        size="1.2em"
                        :color="dash_negative_color"
                      />
                      {{ $t("agents.editAgent.markAgentAs") }}
                      <span class="text-weight-bold">{{
                        $t("agents.editAgent.overdue")
                      }}</span>
                      {{ $t("agents.editAgent.ifNotCheckedInAfter") }}
                    </div>
                    <q-input
                      dense
                      type="number"
                      filled
                      :label="$t('agents.editAgent.minutes')"
                      v-model.number="agent.overdue_time"
                      class="col-2"
                      :rules="[
                        (val) => !!val || $t('agents.shared.required'),
                        (val) =>
                          val >= 3 ||
                          $t('agents.editAgent.minimumMinutes', { min: 3 }),
                        (val) =>
                          val < 9999999 ||
                          $t('agents.editAgent.maximumMinutes', {
                            max: 9999999,
                          }),
                      ]"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <q-checkbox
                      v-model="agent.overdue_email_alert"
                      :label="$t('agents.editAgent.getOverdueEmailAlerts')"
                    />
                    <q-checkbox
                      v-model="agent.overdue_text_alert"
                      :label="$t('agents.editAgent.getOverdueSmsAlerts')"
                    />
                    <q-checkbox
                      v-model="agent.overdue_dashboard_alert"
                      :label="$t('agents.editAgent.getOverdueDashboardAlerts')"
                    />
                  </q-card-section>
                </q-tab-panel>

                <!-- custom fields -->
                <q-tab-panel name="customfields">
                  <div class="text-subtitle" v-if="customFields.length === 0">
                    {{ $t("agents.editAgent.noCustomFieldsFound") }}
                  </div>
                  <q-card-section v-for="field in customFields" :key="field.id">
                    <CustomField
                      v-model="custom_fields[field.name]"
                      :field="field"
                    />
                  </q-card-section>
                </q-tab-panel>

                <!-- patch -->
                <q-tab-panel name="patch">
                  <PatchPolicyForm :agent="agent" />
                </q-tab-panel>

                <!-- automation policies -->
                <q-tab-panel name="policies">
                  <div class="text-subtitle2">
                    {{ $t("agents.editAgent.policies") }}
                  </div>
                  <q-list separator padding dense>
                    <q-item
                      v-for="(policy, key) in agent.applied_policies"
                      :key="key"
                    >
                      <q-item-section>
                        <q-item-label overline>
                          {{ capitalize(key).split("_").join(" ") }}
                        </q-item-label>
                        <q-item-label>{{
                          policy ? policy.name : $t("agents.editAgent.none")
                        }}</q-item-label>
                      </q-item-section>
                      <q-item-section side v-if="policy">
                        <q-item-label>
                          <i>{{
                            policy.active ? "" : $t("agents.editAgent.disabled")
                          }}</i>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <div class="text-subtitle2">
                    {{ $t("agents.editAgent.alertTemplate") }}
                  </div>
                  <q-list dense padding>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{
                          agent.alert_template
                            ? agent.alert_template.name
                            : $t("agents.editAgent.none")
                        }}</q-item-label>
                      </q-item-section>
                      <q-item-section side v-if="agent.alert_template">
                        <q-item-label>
                          <i>{{
                            agent.alert_template.is_active
                              ? ""
                              : $t("agents.editAgent.disabled")
                          }}</i>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div class="text-subtitle2">
                    {{ $t("agents.editAgent.effectivePatchPolicy") }}
                  </div>
                  <q-list separator padding dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.critical")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.critical !== "inherit"
                            ? capitalize(agent.effective_patch_policy.critical)
                            : $t("agents.editAgent.doNothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.important")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.important !== "inherit"
                            ? capitalize(agent.effective_patch_policy.important)
                            : $t("agents.editAgent.doNothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.moderate")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.moderate !== "inherit"
                            ? capitalize(agent.effective_patch_policy.moderate)
                            : $t("agents.editAgent.doNothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.low")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.low !== "inherit"
                            ? capitalize(agent.effective_patch_policy.low)
                            : $t("agents.editAgent.doNothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.other")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.other !== "inherit"
                            ? capitalize(agent.effective_patch_policy.other)
                            : $t("agents.editAgent.doNothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.runTimeFrequency")
                        }}</q-item-label>
                        <q-item-label>{{
                          capitalize(
                            agent.effective_patch_policy.run_time_frequency,
                          )
                        }}</q-item-label>
                      </q-item-section>
                      <q-item-section
                        v-if="
                          agent.effective_patch_policy.run_time_frequency ===
                          'daily'
                        "
                      >
                        <q-item-label>
                          <b>{{ $t("agents.editAgent.weekDays") }}</b>
                          {{
                            weekDaystoString(
                              agent.effective_patch_policy.run_time_days,
                            )
                          }}
                          <b>{{ $t("agents.editAgent.atHour") }}</b>
                          {{ agent.effective_patch_policy.run_time_hour }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section
                        v-else-if="
                          agent.effective_patch_policy.run_time_frequency ===
                          'monthly'
                        "
                      >
                        <q-item-label>
                          <b>{{ $t("agents.editAgent.everyMonthOnDay") }}</b>
                          {{ agent.effective_patch_policy.run_time_day }}
                          <b>{{ $t("agents.editAgent.atHour") }}</b>
                          {{ agent.effective_patch_policy.run_time_hour }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section v-else>
                        <q-item-label>{{
                          $t("agents.editAgent.none")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.rebootAfterInstallation")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.reboot_after_install !==
                          "inherit"
                            ? capitalize(
                                agent.effective_patch_policy
                                  .reboot_after_install,
                              )
                            : $t("agents.editAgent.doNothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $t("agents.editAgent.failedPatchOptions")
                        }}</q-item-label>
                        <q-item-label
                          v-if="
                            agent.effective_patch_policy
                              .reprocess_failed_inherit
                          "
                          >{{ $t("agents.editAgent.doNothing") }}</q-item-label
                        >
                        <q-item-label v-else>
                          <b>{{
                            $t("agents.editAgent.reprocessFailedPatches")
                          }}</b>
                          {{
                            agent.effective_patch_policy.reprocess_failed
                              ? agent.effective_patch_policy
                                  .reprocess_failed_times
                              : $t("agents.shared.never")
                          }}
                          <b>{{ $t("agents.editAgent.emailOnFail") }}</b>
                          {{
                            agent.effective_patch_policy.email_if_fail
                              ? $t("common.system.yes")
                              : $t("agents.shared.never")
                          }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-tab-panel>
              </q-tab-panels>
            </div>
            <q-card-section class="row items-center">
              <q-btn
                :label="$t('common.buttons.save')"
                color="primary"
                type="submit"
              />
            </q-card-section>
          </q-form>
        </template>
      </q-splitter>
    </q-card>
  </q-dialog>
</template>

<script>
import { mapState } from "vuex";
import { useDialogPluginComponent } from "quasar";
import mixins from "@/mixins/mixins";
import PatchPolicyForm from "@/components/modals/agents/PatchPolicyForm.vue";
import CustomField from "@/components/ui/CustomField.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import { capitalize } from "@/utils/format";

export default {
  name: "EditAgent",
  emits: [...useDialogPluginComponent.emits],
  components: { PatchPolicyForm, CustomField, TacticalDropdown },
  mixins: [mixins],
  props: {
    agent_id: !String,
  },
  setup() {
    // quasar dialog setup
    const { dialogRef, onDialogHide } = useDialogPluginComponent();

    return {
      // methods
      capitalize,

      // dialog
      dialogRef,
      onDialogHide,
    };
  },
  data() {
    return {
      customFields: [],
      custom_fields: {},
      agent: {},
      monTypes: ["server", "workstation"],
      client_options: [],
      splitterModel: 25,
      tab: "general",
      timezone: null,
      tz_inherited: true,
      original_tz: null,
      allTimezones: [],
      siteOptions: [],
    };
  },
  methods: {
    getAgentInfo() {
      this.$axios.get(`/agents/${this.agent_id}/`).then((r) => {
        this.agent = r.data;
        this.allTimezones = Object.freeze(r.data.all_timezones);

        // r.data.time_zone is the actual db column from the agent
        // r.data.timezone is a computed property based on the db time_zone field
        // which whill return null if the time_zone field is not set
        // and is therefore inheriting from the default global setting
        if (r.data.time_zone === null) {
          this.timezone = r.data.timezone;
          this.original_tz = r.data.timezone;
        } else {
          this.tz_inherited = false;
          this.timezone = r.data.time_zone;
          this.original_tz = r.data.time_zone;
        }

        for (let field of this.customFields) {
          const value = r.data.custom_fields.find(
            (value) => value.field === field.id,
          );

          if (field.type === "multiple") {
            if (value) this.custom_fields[field.name] = value.value;
            else this.custom_fields[field.name] = [];
          } else if (field.type === "checkbox") {
            if (value) this.custom_fields[field.name] = value.value;
            else this.custom_fields[field.name] = false;
          } else {
            if (value) this.custom_fields[field.name] = value.value;
            else this.custom_fields[field.name] = "";
          }
        }
      });
    },
    getSiteOptions() {
      this.$axios.get("/clients/").then((r) => {
        r.data.forEach((client) => {
          this.siteOptions.push({ category: client.name });
          client.sites.forEach((site) =>
            this.siteOptions.push({
              label: site.name,
              value: site.id,
              cat: client.name,
            }),
          );
        });
      });
    },
    editAgent() {
      // TODO we need to fix the serializer to not send this stuff
      const toRemove = [
        "created_by",
        "created_time",
        "modified_by",
        "modified_time",
        "all_timezones",
        "timezone",
        "wmi_detail",
        "services",
        "status",
        "cpu_model",
        "local_ips",
        "make_model",
        "physical_disks",
        "graphics",
        "checks",
        "patches_last_installed",
        "last_seen",
        "applied_policies",
        "effective_patch_policy",
        "version",
        "operating_system",
        "plat",
        "goarch",
        "hostname",
        "public_ip",
        "total_ram",
        "disks",
        "boot_time",
        "logged_in_username",
        "last_logged_in_user",
        "needs_reboot",
        "choco_installed",
        "policy",
        "mesh_node_id",
        "block_policy_inheritance",
        "maintenance_mode",
        "alert_template",
        "client",
        "site_name",
      ];
      for (const elem of toRemove) {
        delete this.agent[elem];
      }

      // only send the timezone data if it has changed
      // this way django will keep the db column as null and inherit from the global setting
      // until we explicity change the agent's timezone
      if (this.timezone !== this.original_tz) {
        this.agent.time_zone = this.timezone;
      }

      this.$axios
        .put(`/agents/${this.agent_id}/`, {
          ...this.agent,
          custom_fields: this.formatCustomFields(
            this.customFields,
            this.custom_fields,
          ),
        })
        .then(() => {
          this.$refs.dialogRef.hide();
          this.$emit("ok");
          this.notifySuccess(this.$t("agents.editAgent.agentEdited"));
        });
    },
    weekDaystoString(array) {
      if (array.length === 0) return this.$t("agents.editAgent.notSet");

      let result = "";
      for (let day in array) {
        if (day === 1)
          result += `${this.$t("agents.editAgent.weekdayShort.mon")}, `;
        else if (day === 2)
          result += `${this.$t("agents.editAgent.weekdayShort.tue")}, `;
        else if (day === 3)
          result += `${this.$t("agents.editAgent.weekdayShort.wed")}, `;
        else if (day === 4)
          result += `${this.$t("agents.editAgent.weekdayShort.thu")}, `;
        else if (day === 5)
          result += `${this.$t("agents.editAgent.weekdayShort.fri")}, `;
        else if (day === 6)
          result += `${this.$t("agents.editAgent.weekdayShort.sat")}, `;
        else if (day === 0)
          result += `${this.$t("agents.editAgent.weekdayShort.sun")}, `;
      }

      return result.trimEnd(",");
    },
  },
  computed: {
    monTypesOptions() {
      return [
        { label: this.$t("agents.installAgent.server"), value: "server" },
        {
          label: this.$t("agents.installAgent.workstation"),
          value: "workstation",
        },
      ];
    },
    ...mapState(["dash_warning_color", "dash_negative_color"]),
  },
  mounted() {
    // Get custom fields
    this.getCustomFields("agent").then((r) => {
      this.customFields = r.data.filter((field) => !field.hide_in_ui);
    });
    this.getAgentInfo();
    this.getSiteOptions();
  },
};
</script>
