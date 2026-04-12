<template>
  <q-card style="min-width: 60vw">
    <q-splitter v-model="splitterModel">
      <template v-slot:before>
        <q-tabs dense v-model="tab" vertical class="text-primary">
          <q-tab
            name="general"
            :label="$t('settings.editCoreSettings.tabs.general')"
          />
          <q-tab
            name="emailalerts"
            :label="$t('settings.editCoreSettings.tabs.emailAlerts')"
          />
          <q-tab
            name="smsalerts"
            :label="$t('settings.editCoreSettings.tabs.smsAlerts')"
          />
          <q-tab
            name="meshcentral"
            :label="$t('settings.editCoreSettings.tabs.meshCentral')"
          />
          <q-tab
            name="customfields"
            :label="$t('settings.editCoreSettings.tabs.customFields')"
          />
          <q-tab
            name="keystore"
            :label="$t('settings.editCoreSettings.tabs.keyStore')"
          />
          <q-tab
            name="urlactions"
            :label="$t('settings.editCoreSettings.tabs.urlActions')"
          />
          <q-tab
            name="webhooks"
            :label="$t('settings.editCoreSettings.tabs.webHooks')"
          />
          <q-tab
            name="retention"
            :label="$t('settings.editCoreSettings.tabs.retention')"
          />
          <q-tab
            name="apikeys"
            :label="$t('settings.editCoreSettings.tabs.apiKeys')"
          />
          <q-tab name="sso" :label="$t('settings.editCoreSettings.tabs.sso')" />
          <q-tab
            name="schedules"
            :label="$t('settings.editCoreSettings.tabs.schedules')"
          />
          <!-- <q-tab name="openai" label="Open AI" /> -->
        </q-tabs>
      </template>
      <template v-slot:after>
        <q-form @submit.prevent="editSettings">
          <q-card-section class="row items-center">
            <div class="text-h6">
              {{ $t("settings.editCoreSettings.title") }}
            </div>
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
                <div class="text-subtitle2">
                  {{ $t("settings.editCoreSettings.tabs.general") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <q-checkbox
                    v-model="settings.agent_auto_update"
                    :label="
                      $t(
                        'settings.editCoreSettings.general.enableAgentAutoUpdate',
                      )
                    "
                  >
                    <q-tooltip>
                      {{
                        $t(
                          "settings.editCoreSettings.general.enableAgentAutoUpdateTooltip",
                        )
                      }}
                    </q-tooltip>
                  </q-checkbox>
                </q-card-section>
                <q-card-section v-if="!hosted" class="row">
                  <q-checkbox
                    v-model="settings.enable_server_scripts"
                    :label="
                      $t(
                        'settings.editCoreSettings.general.enableServerSideScripts',
                      )
                    "
                  >
                    <q-tooltip>{{
                      $t(
                        "settings.editCoreSettings.general.enableServerSideScriptsTooltip",
                      )
                    }}</q-tooltip>
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
                    :label="
                      $t('settings.editCoreSettings.general.enableWebTerminal')
                    "
                  >
                    <q-tooltip>{{
                      $t(
                        "settings.editCoreSettings.general.enableWebTerminalTooltip",
                      )
                    }}</q-tooltip>
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
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.general.defaultAgentTimezone",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <tactical-dropdown
                    filterable
                    outlined
                    dense
                    options-dense
                    v-model="settings.default_time_zone"
                    :options="allTimezones"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t("settings.editCoreSettings.general.defaultDateFormat")
                    }}:
                  </div>
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
                        <q-tooltip>{{
                          $t(
                            "settings.editCoreSettings.general.clickFormattingOptions",
                          )
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.general.defaultServerPolicy",
                      )
                    }}:
                  </div>
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
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.general.defaultWorkstationPolicy",
                      )
                    }}:
                  </div>
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
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.general.defaultAlertTemplate",
                      )
                    }}:
                  </div>
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
                    {{
                      $t(
                        "settings.editCoreSettings.general.receiveNotificationsOn",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-checkbox
                    dense
                    v-model="settings.notify_on_info_alerts"
                    class="col-3"
                    :label="
                      $t(
                        'settings.editCoreSettings.general.informationalAlerts',
                      )
                    "
                  />
                  <q-checkbox
                    dense
                    v-model="settings.notify_on_warning_alerts"
                    class="col-3"
                    :label="
                      $t('settings.editCoreSettings.general.warningAlerts')
                    "
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t("settings.editCoreSettings.general.agentDebugLevel")
                    }}:
                  </div>
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
                    {{
                      $t(
                        "settings.editCoreSettings.general.clearFaultsAfterDays",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
                    outlined
                    dense
                    v-model.number="settings.clear_faults_days"
                    class="col-6"
                    :rules="[
                      (val) =>
                        val >= 0 ||
                        $t('settings.editCoreSettings.minimumIsZero'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.general.resetPatchPolicyOnAgents",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-btn
                    color="negative"
                    :label="$t('settings.common.reset')"
                    @click="showResetPatchPolicy"
                  />
                </q-card-section>
              </q-tab-panel>
              <!-- email alerts -->
              <q-tab-panel name="emailalerts">
                <div class="text-subtitle2 row">
                  <div>
                    {{
                      $t("settings.editCoreSettings.email.emailAlertRouting")
                    }}
                  </div>
                  <q-space />
                  <div>
                    <q-btn
                      size="sm"
                      color="grey-5"
                      icon="fas fa-plus"
                      text-color="black"
                      :label="$t('settings.editCoreSettings.email.addEmails')"
                      @click="toggleAddEmail"
                    />
                  </div>
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">
                    {{ $t("settings.editCoreSettings.email.recipients") }}
                  </div>
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
                        <q-item-label>{{
                          $t("settings.editCoreSettings.email.noRecipients")
                        }}</q-item-label>
                      </q-item-section>
                    </q-list>
                  </div>
                </q-card-section>
                <!-- smtp -->
                <div class="text-subtitle2">
                  {{ $t("settings.editCoreSettings.email.smtpSettings") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.editCoreSettings.email.fromEmail") }}:
                  </div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_from_email"
                    class="col-6 q-pa-none"
                    :rules="[
                      (val) =>
                        isValidEmail(val) ||
                        $t('settings.editCoreSettings.email.invalidEmail'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.editCoreSettings.email.fromName") }}:
                  </div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_from_name"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.editCoreSettings.email.host") }}:
                  </div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_host"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.editCoreSettings.email.port") }}:
                  </div>
                  <div class="col-4"></div>
                  <q-input
                    dense
                    v-model.number="settings.smtp_port"
                    type="number"
                    filled
                    class="q-pa-none"
                    :rules="[
                      (val) =>
                        (val > 0 && val <= 65535) ||
                        $t('settings.editCoreSettings.email.invalidPort'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <q-checkbox
                    v-model="settings.smtp_requires_auth"
                    :label="
                      $t('settings.editCoreSettings.email.serverRequiresAuth')
                    "
                    class="q-pa-none"
                  />
                </q-card-section>
                <q-card-section
                  class="row"
                  v-show="settings.smtp_requires_auth"
                >
                  <div class="col-2">{{ $t("settings.common.username") }}:</div>
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
                  <div class="col-2">{{ $t("settings.common.password") }}:</div>
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
                  <div>
                    {{ $t("settings.editCoreSettings.sms.smsAlertRouting") }}
                  </div>
                  <q-space />
                  <div>
                    <q-btn
                      size="sm"
                      color="grey-5"
                      icon="fas fa-plus"
                      text-color="black"
                      :label="$t('settings.editCoreSettings.sms.addNumbers')"
                      @click="toggleAddSMSNumber"
                    />
                  </div>
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">
                    {{ $t("settings.editCoreSettings.sms.recipients") }}
                  </div>
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
                        <q-item-label>{{
                          $t("settings.editCoreSettings.sms.noRecipients")
                        }}</q-item-label>
                      </q-item-section>
                    </q-list>
                  </div>
                </q-card-section>
                <!-- smtp -->
                <div class="text-subtitle2">
                  {{ $t("settings.editCoreSettings.sms.twilioSettings") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">
                    {{ $t("settings.editCoreSettings.sms.twilioNumber") }}:
                  </div>
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
                  <div class="col-3">
                    {{ $t("settings.editCoreSettings.sms.twilioAccountSid") }}:
                  </div>
                  <div class="col-3"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.twilio_account_sid"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-3">
                    {{ $t("settings.editCoreSettings.sms.twilioAuthToken") }}:
                  </div>
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
                <div class="text-subtitle2">
                  {{ $t("settings.editCoreSettings.mesh.title") }}
                </div>
                <q-separator />
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">{{ $t("settings.common.username") }}:</div>
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
                        $t('settings.editCoreSettings.mesh.usernameLowercase'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">
                    {{ $t("settings.editCoreSettings.mesh.meshSite") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_site"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">
                    {{ $t("settings.editCoreSettings.mesh.meshToken") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_token"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">
                    {{
                      $t("settings.editCoreSettings.mesh.meshDeviceGroupName")
                    }}:
                  </div>
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
                    {{
                      $t("settings.editCoreSettings.mesh.syncPermsWithTrmm")
                    }}:
                    <q-icon
                      right
                      name="ion-information-circle-outline"
                      size="sm"
                      class="cursor-pointer"
                    >
                      <q-tooltip class="text-caption">
                        {{
                          $t("settings.editCoreSettings.mesh.syncPermsTooltip")
                        }}
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
                    {{ $t("settings.editCoreSettings.mesh.companyName") }}:
                    <q-icon
                      name="ion-information-circle-outline"
                      size="sm"
                      class="q-ml-sm cursor-pointer"
                    >
                      <q-tooltip class="text-caption">
                        {{
                          $t(
                            "settings.editCoreSettings.mesh.companyNameTooltip",
                          )
                        }}
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
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.retention.checkHistoryDays",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.check_history_prune_days"
                    class="col-6"
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.retention.resolvedAlertsDays",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.resolved_alerts_prune_days"
                    class="col-6"
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.retention.agentHistoryDays",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.agent_history_prune_days"
                    class="col-6"
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t("settings.editCoreSettings.retention.debugLogsDays")
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.debug_log_prune_days"
                    class="col-6"
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t("settings.editCoreSettings.retention.auditLogsDays")
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.audit_log_prune_days"
                    class="col-6"
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{
                      $t(
                        "settings.editCoreSettings.retention.reportHistoryDays",
                      )
                    }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.report_history_prune_days"
                    class="col-6"
                    :hint="$t('settings.editCoreSettings.hintSetZeroToDisable')"
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

              <!-- schedules -->
              <q-tab-panel name="schedules">
                <ScheduleTable />
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
                tab === 'general' ||
                tab === 'emailalerts' ||
                tab === 'smsalerts' ||
                tab === 'meshcentral' ||
                tab === 'retention'
              "
              :label="$t('settings.common.save')"
              color="primary"
              type="submit"
            />
            <q-btn
              v-show="tab === 'emailalerts'"
              :label="$t('settings.editCoreSettings.saveAndTestEmail')"
              color="primary"
              type="submit"
              class="q-ml-md"
              @click="emailTest = true"
            />
            <q-btn
              v-show="tab === 'smsalerts'"
              :label="$t('settings.editCoreSettings.saveAndTestSms')"
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
import ScheduleTable from "@/core/settings/components/ScheduleTable.vue";

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
    ScheduleTable,
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
        {
          label: this.$t("settings.editCoreSettings.logLevel.info"),
          value: "info",
        },
        {
          label: this.$t("settings.editCoreSettings.logLevel.warning"),
          value: "warning",
        },
        {
          label: this.$t("settings.editCoreSettings.logLevel.error"),
          value: "error",
        },
        {
          label: this.$t("settings.editCoreSettings.logLevel.critical"),
          value: "critical",
        },
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
          title: this.$t("settings.editCoreSettings.confirmSync.title"),
          message: this.$t("settings.editCoreSettings.confirmSync.message"),
          ok: { label: this.$t("settings.common.yes"), color: "primary" },
          cancel: { label: this.$t("settings.common.no"), color: "negative" },
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
          title: this.$t("settings.editCoreSettings.email.addEmailTitle"),
          prompt: {
            model: "",
            isValid: (val) => this.isValidEmail(val),
            type: "email",
          },
          cancel: true,
          ok: { label: this.$t("settings.common.add"), color: "primary" },
          persistent: false,
        })
        .onOk((data) => {
          this.settings.email_alert_recipients.push(data);
        });
    },
    toggleAddSMSNumber() {
      this.$q
        .dialog({
          title: this.$t("settings.editCoreSettings.sms.addNumberTitle"),
          message: this.$t("settings.editCoreSettings.sms.addNumberMessage"),
          prompt: {
            model: "",
          },
          html: true,
          cancel: true,
          ok: { label: this.$t("settings.common.add"), color: "primary" },
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
      this.$q.loading.show();
      delete this.settings.all_timezones;
      this.$axios
        .put("/core/settings/", this.settings)
        .then(() => {
          this.$q.loading.hide();
          if (this.emailTest) {
            this.$q.loading.show({
              message: this.$t(
                "settings.editCoreSettings.email.sendingTestEmail",
              ),
            });
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
            this.$q.loading.show({
              message: this.$t("settings.editCoreSettings.sms.sendingTestSms"),
            });
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
            this.notifySuccess(
              this.$t("settings.editCoreSettings.notify.saved"),
            );
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
