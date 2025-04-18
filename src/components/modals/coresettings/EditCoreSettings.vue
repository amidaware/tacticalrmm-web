<template>
  <q-card style="min-width: 60vw">
    <q-splitter v-model="splitterModel">
      <template v-slot:before>
        <q-tabs dense v-model="tab" vertical class="text-primary">
          <q-tab name="general" label="General" />
          <q-tab name="emailalerts" label="Email Alerts" />
          <q-tab name="smsalerts" label="SMS Alerts" />
          <q-tab name="meshcentral" label="MeshCentral" />
          <q-tab name="customfields" label="Custom Fields" />
          <q-tab name="keystore" label="Key Store" />
          <q-tab name="urlactions" label="URL Actions" />
          <q-tab name="webhooks" label="Web Hooks" />
          <q-tab name="retention" label="Retention" />
          <q-tab name="apikeys" label="API Keys" />
          <q-tab name="sso" label="Single Sign-On (SSO)" />
          <!-- <q-tab name="openai" label="Open AI" /> -->
        </q-tabs>
      </template>
      <template v-slot:after>
        <q-form @submit.prevent="editSettings">
          <q-card-section class="row items-center">
            <div class="text-h6">Global Settings</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-scroll-area :thumb-style="thumbStyle" style="height: 60vh">
            <q-tab-panels
              v-model="tab"
              animated
              transition-prev="jump-up"
              transition-next="jump-up"
            >
              <!-- general -->
              <q-tab-panel name="general">
                <div class="text-subtitle2">General</div>
                <q-separator />
                <q-card-section class="row">
                  <q-checkbox
                    v-model="settings.agent_auto_update"
                    label="Enable agent automatic self update"
                  >
                    <q-tooltip> Runs at 35mins past every hour </q-tooltip>
                  </q-checkbox>
                </q-card-section>
                <q-card-section v-if="!hosted" class="row">
                  <q-checkbox
                    v-model="settings.enable_server_scripts"
                    label="Enable server side scripts"
                  >
                    <q-tooltip
                      >Allow running scripts on TRMM server for alert
                      failure/resolve actions</q-tooltip
                    >
                  </q-checkbox>
                  <q-btn
                    size="sm"
                    round
                    dense
                    flat
                    icon="warning"
                    @click="
                      openURL(
                        'https://docs.tacticalrmm.com/functions/permissions/#permissions-with-extra-security-implications',
                      )
                    "
                  >
                  </q-btn>
                </q-card-section>
                <q-card-section v-if="!hosted" class="row">
                  <q-checkbox
                    v-model="settings.enable_server_webterminal"
                    label="Enable web terminal"
                  >
                    <q-tooltip>Enable the web terminal</q-tooltip>
                  </q-checkbox>
                  <q-btn
                    size="sm"
                    roundenable_server_webterminal
                    dense
                    flat
                    icon="warning"
                    @click="
                      openURL(
                        'https://docs.tacticalrmm.com/functions/permissions/#permissions-with-extra-security-implications',
                      )
                    "
                  >
                  </q-btn>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Default agent timezone:</div>
                  <div class="col-2"></div>
                  <tactical-dropdown
                    filterable
                    clearable
                    outlined
                    dense
                    options-dense
                    v-model="settings.default_time_zone"
                    :options="allTimezones"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Default date format:</div>
                  <div class="col-2"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.date_format"
                    class="col-6"
                  >
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        size="sm"
                        icon="info"
                        @click="
                          openURL(
                            'https://quasar.dev/quasar-utils/date-utils#format-for-display',
                          )
                        "
                      >
                        <q-tooltip>Click to see formatting options</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Default server policy:</div>
                  <div class="col-2"></div>
                  <q-select
                    clearable
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="settings.server_policy"
                    :options="policies"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Default workstation policy:</div>
                  <div class="col-2"></div>
                  <q-select
                    clearable
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="settings.workstation_policy"
                    :options="policies"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Default alert template:</div>
                  <div class="col-2"></div>
                  <q-select
                    clearable
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="settings.alert_template"
                    :options="alertTemplateOptions"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4 flex items-center">
                    Receive notifications on:
                  </div>
                  <div class="col-2"></div>
                  <q-checkbox
                    dense
                    v-model="settings.notify_on_info_alerts"
                    class="col-3"
                    label="Informational Alerts"
                  />
                  <q-checkbox
                    dense
                    v-model="settings.notify_on_warning_alerts"
                    class="col-3"
                    label="Warning Alerts"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Agent Debug Level:</div>
                  <div class="col-2"></div>
                  <q-select
                    emit-value
                    map-options
                    outlined
                    dense
                    options-dense
                    v-model="settings.agent_debug_level"
                    :options="logLevelOptions"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    Clear faults on agents that haven't checked in after (days):
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    hint="Setting this value to 0 disables this feature"
                    outlined
                    dense
                    v-model.number="settings.clear_faults_days"
                    class="col-6"
                    :rules="[(val) => val >= 0 || 'Minimum is 0']"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Reset Patch Policy on Agents:</div>
                  <div class="col-2"></div>
                  <q-btn
                    color="negative"
                    label="Reset"
                    @click="showResetPatchPolicy"
                  />
                </q-card-section>
              </q-tab-panel>
              <!-- email alerts -->
              <q-tab-panel name="emailalerts">
                <div class="text-subtitle2 row">
                  <div>Email Alert Routing</div>
                  <q-space />
                  <div>
                    <q-btn
                      size="sm"
                      color="grey-5"
                      icon="fas fa-plus"
                      text-color="black"
                      label="Add emails"
                      @click="toggleAddEmail"
                    />
                  </div>
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">Recipients</div>
                  <div class="col-4"></div>
                  <div class="col-5">
                    <q-list
                      dense
                      v-if="
                        ready && settings.email_alert_recipients.length !== 0
                      "
                    >
                      <q-item
                        v-for="email in settings.email_alert_recipients"
                        :key="email"
                        clickable
                        v-ripple
                        @click="removeEmail(email)"
                      >
                        <q-item-section>
                          <q-item-label>{{ email }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="delete" color="red" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                    <q-list v-else>
                      <q-item-section>
                        <q-item-label>No recipients</q-item-label>
                      </q-item-section>
                    </q-list>
                  </div>
                </q-card-section>
                <!-- smtp -->
                <div class="text-subtitle2">SMTP Settings</div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-2">From email:</div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_from_email"
                    class="col-6 q-pa-none"
                    :rules="[(val) => isValidEmail(val) || 'Invalid email']"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">From name:</div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_from_name"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">Host:</div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_host"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">Port:</div>
                  <div class="col-4"></div>
                  <q-input
                    dense
                    v-model.number="settings.smtp_port"
                    type="number"
                    filled
                    class="q-pa-none"
                    :rules="[
                      (val) => (val > 0 && val <= 65535) || 'Invalid Port',
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <q-checkbox
                    v-model="settings.smtp_requires_auth"
                    label="My Server Requires Authentication"
                    class="q-pa-none"
                  />
                </q-card-section>
                <q-card-section
                  class="row"
                  v-show="settings.smtp_requires_auth"
                >
                  <div class="col-2">Username:</div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_host_user"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section
                  class="row"
                  v-show="settings.smtp_requires_auth"
                >
                  <div class="col-2">Password:</div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    class="col-6 q-pa-none"
                    v-model="settings.smtp_host_password"
                    :type="isPwd ? 'password' : 'text'"
                  >
                    <template v-slot:append>
                      <q-icon
                        :name="isPwd ? 'visibility_off' : 'visibility'"
                        class="cursor-pointer"
                        @click="isPwd = !isPwd"
                      />
                    </template>
                  </q-input>
                </q-card-section>
              </q-tab-panel>
              <!-- twilio sms alerts -->
              <q-tab-panel name="smsalerts">
                <div class="text-subtitle2 row">
                  <div>SMS Alert Routing</div>
                  <q-space />
                  <div>
                    <q-btn
                      size="sm"
                      color="grey-5"
                      icon="fas fa-plus"
                      text-color="black"
                      label="Add numbers"
                      @click="toggleAddSMSNumber"
                    />
                  </div>
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">Recipients</div>
                  <div class="col-4"></div>
                  <div class="col-5">
                    <q-list
                      dense
                      v-if="ready && settings.sms_alert_recipients.length !== 0"
                    >
                      <q-item
                        v-for="num in settings.sms_alert_recipients"
                        :key="num"
                        clickable
                        v-ripple
                        @click="removeSMSNumber(num)"
                      >
                        <q-item-section>
                          <q-item-label>{{ num }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="delete" color="red" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                    <q-list v-else>
                      <q-item-section>
                        <q-item-label>No recipients</q-item-label>
                      </q-item-section>
                    </q-list>
                  </div>
                </q-card-section>
                <!-- smtp -->
                <div class="text-subtitle2">Twilio Settings</div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">Twilio Number:</div>
                  <div class="col-3"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.twilio_number"
                    class="col-6 q-pa-none"
                    placeholder="+12131231234"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-3">Twilio Account SID:</div>
                  <div class="col-3"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.twilio_account_sid"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-3">Twilio Auth Token:</div>
                  <div class="col-3"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.twilio_auth_token"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
              </q-tab-panel>
              <!-- meshcentral -->
              <q-tab-panel name="meshcentral">
                <div class="text-subtitle2">MeshCentral Settings</div>
                <q-separator />
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">Username:</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_username"
                    class="col-6"
                    :rules="[
                      (val) =>
                        (val == val.toLowerCase() &&
                          val != val.toUpperCase()) ||
                        'Username must be all lowercase',
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">Mesh Site:</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_site"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">Mesh Token:</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_token"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">Mesh Device Group Name:</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_device_group"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4 flex items-center">
                    Sync Mesh Perms with TRMM:
                    <q-icon
                      right
                      name="ion-information-circle-outline"
                      size="sm"
                      class="cursor-pointer"
                    >
                      <q-tooltip class="text-caption">
                        It is recommended to keep this option enabled;
                        otherwise, all TRMM users will have full permissions in
                        MeshCentral regardless of their permissions in TRMM.
                      </q-tooltip>
                    </q-icon>
                  </div>
                  <div class="col-2"></div>
                  <q-checkbox
                    dense
                    :model-value="settings.sync_mesh_with_trmm"
                    @update:model-value="confirmSyncChange"
                    class="col-6"
                  />
                </q-card-section>

                <q-card-section class="row items-center">
                  <div class="col-4 flex items-center">
                    Company Name:
                    <q-icon
                      name="ion-information-circle-outline"
                      size="sm"
                      class="q-ml-sm cursor-pointer"
                    >
                      <q-tooltip class="text-caption">
                        Adding your company name here will append it to the
                        user's full name that appears when doing a remote
                        control session, for example: 'John Doe - Amidaware
                        Inc.'
                      </q-tooltip>
                    </q-icon>
                  </div>

                  <div class="col-2"></div>

                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_company_name"
                    class="col-6"
                  >
                  </q-input>
                </q-card-section>
              </q-tab-panel>

              <!-- custom fields -->
              <q-tab-panel name="customfields">
                <CustomFields />
              </q-tab-panel>

              <!-- key store -->
              <q-tab-panel name="keystore">
                <KeyStoreTable />
              </q-tab-panel>

              <!-- url actions -->
              <q-tab-panel name="urlactions">
                <URLActionsTable type="web" />
              </q-tab-panel>

              <!-- web hooks -->
              <q-tab-panel name="webhooks">
                <URLActionsTable type="rest" />
              </q-tab-panel>

              <!-- retention -->
              <q-tab-panel name="retention">
                <q-card-section class="row">
                  <div class="col-4">Check History (days):</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.check_history_prune_days"
                    class="col-6"
                    hint="Setting this value to 0 disables this feature"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Resolved Alerts (days):</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.resolved_alerts_prune_days"
                    class="col-6"
                    hint="Setting this value to 0 disables this feature"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Agent History (days):</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.agent_history_prune_days"
                    class="col-6"
                    hint="Setting this value to 0 disables this feature"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Debug Logs (days):</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.debug_log_prune_days"
                    class="col-6"
                    hint="Setting this value to 0 disables this feature"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Audit Logs (days):</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.audit_log_prune_days"
                    class="col-6"
                    hint="Setting this value to 0 disables this feature"
                  />
                </q-card-section>
              </q-tab-panel>

              <q-tab-panel name="apikeys">
                <APIKeysTable />
              </q-tab-panel>

              <!-- sso integration -->
              <q-tab-panel name="sso">
                <SSOProvidersTable />
              </q-tab-panel>

              <!-- Open AI -->
              <!-- <q-tab-panel name="openai">
                <div class="text-subtitle2">Open AI</div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-4">API Key:</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.open_ai_token"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Open AI Model:</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.open_ai_model"
                    class="col-6"
                  >
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        icon="info"
                        size="sm"
                        @click="
                          openURL(
                            'https://platform.openai.com/docs/models/overview'
                          )
                        "
                      >
                        <q-tooltip>Click to see available options</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
              </q-tab-panel> -->
            </q-tab-panels>
          </q-scroll-area>
          <q-card-section class="row items-center">
            <q-btn
              v-show="
                tab !== 'customfields' &&
                tab !== 'keystore' &&
                tab !== 'urlactions' &&
                tab !== 'sso'
              "
              label="Save"
              color="primary"
              type="submit"
            />
            <q-btn
              v-show="tab === 'emailalerts'"
              label="Save and Test Email"
              color="primary"
              type="submit"
              class="q-ml-md"
              @click="emailTest = true"
            />
            <q-btn
              v-show="tab === 'smsalerts'"
              label="Save and Test SMS"
              color="primary"
              type="submit"
              class="q-ml-md"
              @click="smsTest = true"
            />
          </q-card-section>
        </q-form>
      </template>
    </q-splitter>
  </q-card>
</template>

<script>
import { openURL } from "quasar";
import mixins from "@/mixins/mixins";
import ResetPatchPolicy from "@/components/modals/coresettings/ResetPatchPolicy.vue";
import CustomFields from "@/components/modals/coresettings/CustomFields.vue";
import KeyStoreTable from "@/components/modals/coresettings/KeyStoreTable.vue";
import URLActionsTable from "@/components/modals/coresettings/URLActionsTable.vue";
import APIKeysTable from "@/components/core/APIKeysTable.vue";
import SSOProvidersTable from "@/ee/sso/components/SSOProvidersTable.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  name: "EditCoreSettings",
  emits: ["close"],
  components: {
    CustomFields,
    KeyStoreTable,
    URLActionsTable,
    APIKeysTable,
    SSOProvidersTable,
    TacticalDropdown,
  },
  mixins: [mixins],
  data() {
    return {
      ready: false,
      policies: [],
      settings: {},
      email: null,
      tab: "general",
      splitterModel: 20,
      isPwd: true,
      allTimezones: [],
      emailTest: false,
      smsTest: false,
      thumbStyle: {
        right: "2px",
        borderRadius: "5px",
        backgroundColor: "#027be3",
        width: "5px",
        opacity: 0.75,
      },
      alertTemplateOptions: [],
      logLevelOptions: [
        { label: "Info", value: "info" },
        { label: "Warning", value: "warning" },
        { label: "Error", value: "error" },
        { label: "Critical", value: "critical" },
      ],
    };
  },
  computed: {
    hosted() {
      return this.$store.state.hosted;
    },
  },
  watch: {
    tab(newTab, oldTab) {
      if (oldTab === "sso") {
        this.getCoreSettings();
      }
    },
  },
  methods: {
    openURL(url) {
      openURL(url);
    },
    getCoreSettings() {
      this.$axios.get("/core/settings/").then((r) => {
        this.settings = r.data;
        this.allTimezones = Object.freeze(r.data.all_timezones);
        this.ready = true;
      });
    },
    getPolicies() {
      this.$q.loading.show();
      this.$axios
        .get("/automation/policies/")
        .then((r) => {
          this.policies = r.data.map((policy) => ({
            label: policy.name,
            value: policy.id,
          }));
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    getAlertTemplates() {
      this.$axios.get("alerts/templates/").then((r) => {
        this.alertTemplateOptions = r.data.map((template) => ({
          label: template.name,
          value: template.id,
        }));
      });
    },
    confirmSyncChange(newValue) {
      this.$q
        .dialog({
          title: "Are you sure?",
          message:
            "This operation may take several minutes to complete in the background and can be very CPU/disk intensive, depending on your hardware and number of agents. Please allow time for the sync to fully complete.",
          ok: { label: "Yes", color: "primary" },
          cancel: { label: "No", color: "negative" },
        })
        .onOk(() => {
          this.settings.sync_mesh_with_trmm = newValue;
        });
    },
    showResetPatchPolicy() {
      this.$q.dialog({
        component: ResetPatchPolicy,
      });
    },
    toggleAddEmail() {
      this.$q
        .dialog({
          title: "Add email",
          prompt: {
            model: "",
            isValid: (val) => this.isValidEmail(val),
            type: "email",
          },
          cancel: true,
          ok: { label: "Add", color: "primary" },
          persistent: false,
        })
        .onOk((data) => {
          this.settings.email_alert_recipients.push(data);
        });
    },
    toggleAddSMSNumber() {
      this.$q
        .dialog({
          title: "Add number",
          message:
            "Use E.164 format: must have the <b>+</b> symbol and <span class='text-red'>country code</span>, followed by the <span class='text-green'>phone number</span> e.g. <b>+<span class='text-red'>1</span><span class='text-green'>2131231234</span></b>",
          prompt: {
            model: "",
          },
          html: true,
          cancel: true,
          ok: { label: "Add", color: "primary" },
          persistent: false,
        })
        .onOk((data) => {
          this.settings.sms_alert_recipients.push(data);
        });
    },
    removeEmail(email) {
      const removed = this.settings.email_alert_recipients.filter(
        (k) => k !== email,
      );
      this.settings.email_alert_recipients = removed;
    },
    removeSMSNumber(num) {
      const removed = this.settings.sms_alert_recipients.filter(
        (k) => k !== num,
      );
      this.settings.sms_alert_recipients = removed;
    },
    editSettings() {
      if (!this.settings.default_time_zone) {
        this.notifyError("Please select a default agent timezone");
        return;
      }
      this.$q.loading.show();
      delete this.settings.all_timezones;
      this.$axios
        .put("/core/settings/", this.settings)
        .then(() => {
          this.$q.loading.hide();
          if (this.emailTest) {
            this.$q.loading.show({ message: "Sending test email..." });
            this.$axios
              .post("/core/emailtest/")
              .then((r) => {
                this.emailTest = false;
                this.$q.loading.hide();
                this.getCoreSettings();
                this.notifySuccess(r.data, 3000);
              })
              .catch(() => {
                this.emailTest = false;
                this.$q.loading.hide();
              });
          } else if (this.smsTest) {
            this.$q.loading.show({ message: "Sending test SMS..." });
            this.$axios
              .post("/core/smstest/")
              .then((r) => {
                this.smsTest = false;
                this.$q.loading.hide();
                this.getCoreSettings();
                this.notifySuccess(r.data, 3000);
              })
              .catch(() => {
                this.smsTest = false;
                this.$q.loading.hide();
              });
          } else {
            this.$emit("close");
            this.$store.dispatch("getDashInfo", false);
            this.notifySuccess("Settings were edited!");
          }
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
  },
  mounted() {
    this.getCoreSettings();
    this.getPolicies();
    this.getAlertTemplates();
  },
};
</script>
