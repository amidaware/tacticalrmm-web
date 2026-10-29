<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 800px">
      <q-splitter v-model="splitterModel">
        <template v-slot:before>
          <q-tabs dense v-model="tab" vertical class="text-primary">
            <q-tab
              name="general"
              :label="$pgettext('Agent configuration', 'General')"
            />
            <q-tab name="customfields" :label="$gettext('Custom Fields')" />
            <q-tab name="patch" :label="$gettext('Patches')" />
            <q-tab name="policies" :label="$gettext('Automation Policies')" />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-form @submit.prevent="editAgent">
            <q-card-section class="row items-center">
              <div class="text-h6">
                {{ $gettext("Edit %{hostname}", { hostname: agent.hostname }) }}
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
                    <div class="col-2">{{ $gettext("Site:") }}</div>
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
                    <div class="col-2">
                      {{ $pgettext("Agent configuration", "Type:") }}
                    </div>
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
                      {{ $pgettext("Agent configuration", "Description:") }}
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
                      {{ $gettext("Timezone:") }}
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
                  <q-card-section class="row items-start content-between">
                    <div class="col-4">
                      {{ $gettext("Default Terminal") }}
                    </div>
                    <div class="col-8">
                      <q-option-group
                        v-if="agent && agent.plat"
                        class="q-gutter-lg"
                        v-model="agent.default_shell"
                        :options="defaultShellOptions"
                        type="radio"
                        inline
                        dense
                      />
                      <q-input
                        v-if="agent.default_shell === 'custom'"
                        v-model="agent.default_shell_custom"
                        class="q-mt-md"
                        dense
                        outlined
                        :placeholder="$gettext('Enter custom shell path')"
                        bottom-slots
                      >
                        <template v-slot:hint>
                          <span style="font-size: 1.2em">
                            {{ customShellPlaceholder }}
                          </span>
                        </template>
                      </q-input>
                    </div>
                  </q-card-section>
                  <q-card-section class="row">
                    <div class="col-10">
                      {{ $gettext("Run checks every:") }}
                    </div>
                    <q-input
                      dense
                      type="number"
                      filled
                      :label="$gettext('Seconds')"
                      v-model.number="agent.check_interval"
                      class="col-2"
                      :rules="[
                        (val) => !!val || $gettext('*Required'),
                        (val) =>
                          val >= 15 ||
                          $ngettext(
                            'Minimum is %{min} second',
                            'Minimum is %{min} seconds',
                            15,
                            { min: 15 },
                          ),
                        (val) =>
                          val <= 86400 ||
                          $ngettext(
                            'Maximum is %{max} second',
                            'Maximum is %{max} seconds',
                            86400,
                            { max: 86400 },
                          ),
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
                      {{ $gettext("Mark an agent as") }}
                      <span class="text-weight-bold">{{
                        $gettext("offline")
                      }}</span>
                      {{ $gettext("if it has not checked in after:") }}
                    </div>
                    <q-input
                      dense
                      type="number"
                      filled
                      :label="$gettext('Minutes')"
                      v-model.number="agent.offline_time"
                      class="col-2"
                      :rules="[
                        (val) => !!val || $gettext('*Required'),
                        (val) =>
                          val >= 2 ||
                          $ngettext(
                            'Minimum is %{min} minute',
                            'Minimum is %{min} minutes',
                            2,
                            { min: 2 },
                          ),
                        (val) =>
                          val < 9999999 ||
                          $ngettext(
                            'Maximum is %{max} minute',
                            'Maximum is %{max} minutes',
                            9999999,
                            {
                              max: 9999999,
                            },
                          ),
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
                      {{ $gettext("Mark an agent as") }}
                      <span class="text-weight-bold">{{
                        $gettext("overdue")
                      }}</span>
                      {{ $gettext("if it has not checked in after:") }}
                    </div>
                    <q-input
                      dense
                      type="number"
                      filled
                      :label="$gettext('Minutes')"
                      v-model.number="agent.overdue_time"
                      class="col-2"
                      :rules="[
                        (val) => !!val || $gettext('*Required'),
                        (val) =>
                          val >= 3 ||
                          $ngettext(
                            'Minimum is %{min} minute',
                            'Minimum is %{min} minutes',
                            3,
                            { min: 3 },
                          ),
                        (val) =>
                          val < 9999999 ||
                          $ngettext(
                            'Maximum is %{max} minute',
                            'Maximum is %{max} minutes',
                            9999999,
                            {
                              max: 9999999,
                            },
                          ),
                      ]"
                    />
                  </q-card-section>
                  <q-card-section class="row">
                    <q-checkbox
                      v-model="agent.overdue_email_alert"
                      :label="$gettext('Get overdue email alerts')"
                    />
                    <q-checkbox
                      v-model="agent.overdue_text_alert"
                      :label="$gettext('Get overdue sms alerts')"
                    />
                    <q-checkbox
                      v-model="agent.overdue_dashboard_alert"
                      :label="$gettext('Get overdue dashboard alerts')"
                    />
                  </q-card-section>
                </q-tab-panel>

                <!-- custom fields -->
                <q-tab-panel name="customfields">
                  <div class="text-subtitle" v-if="customFields.length === 0">
                    {{
                      $gettext(
                        "No agent custom fields found. Go to Settings > Global Settings > Custom Settings",
                      )
                    }}
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
                    {{ $gettext("Policies") }}
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
                          policy
                            ? policy.name
                            : $pgettext("Agent configuration", "None")
                        }}</q-item-label>
                      </q-item-section>
                      <q-item-section side v-if="policy">
                        <q-item-label>
                          <i>{{
                            policy.active
                              ? ""
                              : $pgettext("Agent configuration", "disabled")
                          }}</i>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <div class="text-subtitle2">
                    {{ $gettext("Alert Template") }}
                  </div>
                  <q-list dense padding>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{
                          agent.alert_template
                            ? agent.alert_template.name
                            : $pgettext("Agent configuration", "None")
                        }}</q-item-label>
                      </q-item-section>
                      <q-item-section side v-if="agent.alert_template">
                        <q-item-label>
                          <i>{{
                            agent.alert_template.is_active
                              ? ""
                              : $pgettext("Agent configuration", "disabled")
                          }}</i>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div class="text-subtitle2">
                    {{ $gettext("Effective Patch Policy") }}
                  </div>
                  <q-list separator padding dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $pgettext("Agent configuration", "Critical")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.critical !== "inherit"
                            ? capitalize(agent.effective_patch_policy.critical)
                            : $gettext("Do Nothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $pgettext("Agent configuration", "Important")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.important !== "inherit"
                            ? capitalize(agent.effective_patch_policy.important)
                            : $gettext("Do Nothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $gettext("Moderate")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.moderate !== "inherit"
                            ? capitalize(agent.effective_patch_policy.moderate)
                            : $gettext("Do Nothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $pgettext("Agent configuration", "Low")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.low !== "inherit"
                            ? capitalize(agent.effective_patch_policy.low)
                            : $gettext("Do Nothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $pgettext("Agent configuration", "Other")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.other !== "inherit"
                            ? capitalize(agent.effective_patch_policy.other)
                            : $gettext("Do Nothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $gettext("Run Time Frequency")
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
                          <b>{{ $gettext("week days:") }}</b>
                          {{
                            weekDaystoString(
                              agent.effective_patch_policy.run_time_days,
                            )
                          }}
                          <b>{{ $gettext("at hour:") }}</b>
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
                          <b>{{ $gettext("Every month on day:") }}</b>
                          {{ agent.effective_patch_policy.run_time_day }}
                          <b>{{ $gettext("at hour:") }}</b>
                          {{ agent.effective_patch_policy.run_time_hour }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section v-else>
                        <q-item-label>{{
                          $pgettext("Agent configuration", "None")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $gettext("Reboot after installation")
                        }}</q-item-label>
                        <q-item-label>{{
                          agent.effective_patch_policy.reboot_after_install !==
                          "inherit"
                            ? capitalize(
                                agent.effective_patch_policy
                                  .reboot_after_install,
                              )
                            : $gettext("Do Nothing")
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label overline>{{
                          $gettext("Failed patch options")
                        }}</q-item-label>
                        <q-item-label
                          v-if="
                            agent.effective_patch_policy
                              .reprocess_failed_inherit
                          "
                          >{{ $gettext("Do Nothing") }}</q-item-label
                        >
                        <q-item-label v-else>
                          <b>{{ $gettext("Reprocess failed patches:") }}</b>
                          {{
                            agent.effective_patch_policy.reprocess_failed
                              ? agent.effective_patch_policy
                                  .reprocess_failed_times
                              : $gettext("Never")
                          }}
                          <b>{{ $gettext("Email on fail:") }}</b>
                          {{
                            agent.effective_patch_policy.email_if_fail
                              ? $gettext("Yes")
                              : $gettext("Never")
                          }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-tab-panel>
              </q-tab-panels>
            </div>
            <q-card-section class="row items-center">
              <q-btn :label="$gettext('Save')" color="primary" type="submit" />
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

      // create shallow copy so we don't break UI when save fails
      const payload = { ...this.agent };

      for (const elem of toRemove) {
        delete payload[elem];
      }

      // only send the timezone data if it has changed
      // this way django will keep the db column as null and inherit from the global setting
      // until we explicity change the agent's timezone
      if (this.timezone !== this.original_tz) {
        payload.time_zone = this.timezone;
      }

      this.$axios
        .put(`/agents/${this.agent_id}/`, {
          ...payload,
          custom_fields: this.formatCustomFields(
            this.customFields,
            this.custom_fields,
          ),
        })
        .then(() => {
          this.$refs.dialogRef.hide();
          this.$emit("ok");
          this.notifySuccess(this.$gettext("Agent was edited!"));
        });
    },
    weekDaystoString(array) {
      if (array.length === 0) return this.$gettext("not set");

      let result = "";
      for (let day in array) {
        if (day === 1) result += `${this.$gettext("Mon")}, `;
        else if (day === 2) result += `${this.$gettext("Tue")}, `;
        else if (day === 3) result += `${this.$gettext("Wed")}, `;
        else if (day === 4) result += `${this.$gettext("Thur")}, `;
        else if (day === 5) result += `${this.$gettext("Fri")}, `;
        else if (day === 6) result += `${this.$gettext("Sat")}, `;
        else if (day === 0) result += `${this.$gettext("Sun")}, `;
      }

      return result.trimEnd(",");
    },
  },
  computed: {
    monTypesOptions() {
      return [
        { label: this.$gettext("Server"), value: "server" },
        {
          label: this.$gettext("Workstation"),
          value: "workstation",
        },
      ];
    },
    ...mapState(["dash_warning_color", "dash_negative_color"]),
    customShellPlaceholder() {
      let example;
      if (this.agent?.plat === "windows")
        example = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
      else if (this.agent?.plat === "linux") example = "/usr/bin/fish";
      else if (this.agent?.plat === "darwin") example = "/bin/zsh";

      return example
        ? this.$gettext("Enter custom shell path (e.g. %{example})", {
            example,
          })
        : this.$gettext("Enter custom shell path");
    },
    defaultShellOptions() {
      if (!this.agent?.plat) return [];
      const inheritText = this.$gettext("Inherit from Global Setting");
      const customText = this.$pgettext("Interactive terminal", "Custom");
      if (this.agent.plat === "windows") {
        return [
          { label: inheritText, value: "use_global" },
          { label: "CMD", value: "cmd" },
          { label: "PowerShell", value: "powershell" },
          { label: customText, value: "custom" },
        ];
      }

      if (this.agent.plat === "linux") {
        return [
          { label: inheritText, value: "use_global" },
          { label: "Bash", value: "bash" },
          { label: customText, value: "custom" },
        ];
      }

      if (this.agent.plat === "darwin") {
        return [
          { label: inheritText, value: "use_global" },
          { label: "Bash", value: "bash" },
          { label: customText, value: "custom" },
        ];
      }
      return [];
    },
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
