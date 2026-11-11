<template>
  <q-card style="min-width: 60vw">
    <q-splitter v-model="splitterModel">
      <template v-slot:before>
        <q-tabs dense v-model="tab" vertical class="text-primary">
          <q-tab name="general" :label="$t('settings.core.tabs.general')" />
          <q-tab
            name="emailalerts"
            :label="$t('settings.core.tabs.emailAlerts')"
          />
          <q-tab name="smsalerts" :label="$t('settings.core.tabs.smsAlerts')" />
          <q-tab name="meshcentral" label="MeshCentral" />
          <q-tab
            name="customfields"
            :label="$t('settings.core.tabs.customFields')"
          />
          <q-tab name="keystore" :label="$t('settings.core.tabs.keyStore')" />
          <q-tab
            name="urlactions"
            :label="$t('settings.core.tabs.urlActions')"
          />
          <q-tab name="webhooks" :label="$t('settings.core.tabs.webhooks')" />
          <q-tab name="retention" :label="$t('settings.core.tabs.retention')" />
          <q-tab name="apikeys" :label="$t('settings.core.tabs.apiKeys')" />
          <q-tab name="sso" :label="$t('settings.core.tabs.sso')" />
          <q-tab name="schedules" :label="$t('settings.core.tabs.schedules')" />
          <!-- <q-tab name="openai" label="Open AI" /> -->
        </q-tabs>
      </template>
      <template v-slot:after>
        <q-form @submit.prevent="editSettings">
          <q-card-section class="row items-center">
            <div class="text-h6">{{ $t("settings.core.title") }}</div>
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
                  {{ $t("settings.core.tabs.general") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <q-checkbox
                    v-model="settings.agent_auto_update"
                    :label="$t('settings.core.general.agentAutoUpdate')"
                  >
                    <q-tooltip>{{
                      $t("settings.core.general.agentAutoUpdateTooltip")
                    }}</q-tooltip>
                  </q-checkbox>
                </q-card-section>
                <q-card-section v-if="!hosted" class="row">
                  <q-checkbox
                    v-model="settings.enable_server_scripts"
                    :label="$t('settings.core.general.serverScripts')"
                  >
                    <q-tooltip>{{
                      $t("settings.core.general.serverScriptsTooltip")
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
                    :label="$t('settings.core.general.webTerminal')"
                  >
                    <q-tooltip>{{
                      $t("settings.core.general.webTerminalTooltip")
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
                    {{ $t("settings.core.general.defaultTimezone") }}
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
                    {{ $t("settings.core.general.defaultDateFormat") }}
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
                          $t("settings.core.general.dateFormatTooltip")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.general.defaultServerPolicy") }}
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
                    {{ $t("settings.core.general.defaultWorkstationPolicy") }}
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
                    {{ $t("settings.core.general.defaultAlertTemplate") }}
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
                    {{ $t("settings.core.general.receiveNotificationsOn") }}
                  </div>
                  <div class="col-2"></div>
                  <q-checkbox
                    dense
                    v-model="settings.notify_on_info_alerts"
                    class="col-3"
                    :label="$t('settings.core.general.infoAlerts')"
                  />
                  <q-checkbox
                    dense
                    v-model="settings.notify_on_warning_alerts"
                    class="col-3"
                    :label="$t('settings.core.general.warningAlerts')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.general.agentDebugLevel") }}
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
                    {{ $t("settings.core.general.clearFaultsDays") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    :hint="$t('settings.core.zeroDisables')"
                    outlined
                    dense
                    v-model.number="settings.clear_faults_days"
                    class="col-6"
                    :rules="[
                      (val) =>
                        val >= 0 || $t('settings.core.general.minimumZero'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row items-start content-between">
                  <div class="col-6">
                    {{ $t("settings.core.general.terminalExperience") }}
                  </div>
                  <div class="col-6">
                    <q-option-group
                      class="q-gutter-lg"
                      v-model="settings.terminal_mode"
                      :options="terminalModeOptions"
                      type="radio"
                      inline
                      dense
                    />
                  </div>
                </q-card-section>
                <q-card-section class="row items-start content-between">
                  <div class="col-6">
                    {{ $t("settings.core.general.fileBrowserExperience") }}
                  </div>
                  <div class="col-6">
                    <q-option-group
                      class="q-gutter-lg"
                      v-model="settings.file_browser_mode"
                      :options="fileBrowserModeOptions"
                      type="radio"
                      inline
                      dense
                    />
                  </div>
                </q-card-section>
                <q-card-section class="row items-start content-between">
                  <div class="col-6">
                    {{ $t("settings.core.general.windowsDefaultTerminal") }}
                  </div>
                  <div class="col-6">
                    <q-option-group
                      class="q-gutter-lg"
                      v-model="settings.default_shell_windows"
                      :options="windowsShellOptions"
                      type="radio"
                      inline
                      dense
                    />
                    <q-input
                      v-if="settings.default_shell_windows === 'custom'"
                      v-model="settings.default_shell_windows_custom"
                      class="q-mt-md"
                      dense
                      outlined
                      :placeholder="$t('settings.core.general.customShellPath')"
                      bottom-slots
                    >
                      <template v-slot:hint>
                        <span style="font-size: 1.2em">
                          {{
                            $t("settings.core.general.customShellPathExample", {
                              example:
                                "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
                            })
                          }}
                        </span>
                      </template>
                    </q-input>
                  </div>
                </q-card-section>
                <q-card-section class="row items-start content-between">
                  <div class="col-6">
                    {{ $t("settings.core.general.linuxDefaultTerminal") }}
                  </div>
                  <div class="col-6">
                    <q-option-group
                      class="q-gutter-lg"
                      v-model="settings.default_shell_linux"
                      :options="linuxShellOptions"
                      type="radio"
                      inline
                      dense
                    />
                    <q-input
                      v-if="settings.default_shell_linux === 'custom'"
                      v-model="settings.default_shell_linux_custom"
                      class="q-mt-md"
                      dense
                      outlined
                      :placeholder="
                        $t('settings.core.general.customShellPathExample', {
                          example: '/usr/bin/fish',
                        })
                      "
                    />
                  </div>
                </q-card-section>
                <q-card-section class="row items-start content-between">
                  <div class="col-6">
                    {{ $t("settings.core.general.macosDefaultTerminal") }}
                  </div>
                  <div class="col-6">
                    <q-option-group
                      class="q-gutter-lg"
                      v-model="settings.default_shell_darwin"
                      :options="darwinShellOptions"
                      type="radio"
                      inline
                      dense
                    />
                    <q-input
                      v-if="settings.default_shell_darwin === 'custom'"
                      v-model="settings.default_shell_darwin_custom"
                      class="q-mt-md"
                      dense
                      outlined
                      :placeholder="
                        $t('settings.core.general.customShellPathExample', {
                          example: '/bin/zsh',
                        })
                      "
                    />
                  </div>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.general.resetPatchPolicy") }}
                  </div>
                  <div class="col-2"></div>
                  <q-btn
                    color="negative"
                    :label="$t('common.reset')"
                    @click="showResetPatchPolicy"
                  />
                </q-card-section>
              </q-tab-panel>
              <!-- email alerts -->
              <q-tab-panel name="emailalerts">
                <div class="text-subtitle2 row">
                  <div>{{ $t("settings.core.email.routing") }}</div>
                  <q-space />
                  <div>
                    <q-btn
                      size="sm"
                      color="grey-5"
                      icon="fas fa-plus"
                      text-color="black"
                      :label="$t('settings.core.email.addEmails')"
                      @click="toggleAddEmail"
                    />
                  </div>
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">{{ $t("settings.core.recipients") }}</div>
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
                          $t("settings.core.noRecipients")
                        }}</q-item-label>
                      </q-item-section>
                    </q-list>
                  </div>
                </q-card-section>
                <!-- smtp -->
                <div class="text-subtitle2">
                  {{ $t("settings.core.email.smtpSettings") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.core.email.fromEmail") }}
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
                        $t('settings.core.email.invalidEmail'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.core.email.fromName") }}
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
                  <div class="col-2">{{ $t("settings.core.email.host") }}</div>
                  <div class="col-4"></div>
                  <q-input
                    outlined
                    dense
                    v-model="settings.smtp_host"
                    class="col-6 q-pa-none"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">{{ $t("settings.core.email.port") }}</div>
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
                        $t('settings.core.email.invalidPort'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <q-checkbox
                    v-model="settings.smtp_requires_auth"
                    :label="$t('settings.core.email.requiresAuth')"
                    class="q-pa-none"
                  />
                </q-card-section>
                <q-card-section
                  class="row"
                  v-show="settings.smtp_requires_auth"
                >
                  <div class="col-2">
                    {{ $t("settings.core.usernameLabel") }}
                  </div>
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
                  <div class="col-2">
                    {{ $t("settings.core.passwordLabel") }}
                  </div>
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
                  <div>{{ $t("settings.core.sms.routing") }}</div>
                  <q-space />
                  <div>
                    <q-btn
                      size="sm"
                      color="grey-5"
                      icon="fas fa-plus"
                      text-color="black"
                      :label="$t('settings.core.sms.addNumbers')"
                      @click="toggleAddSMSNumber"
                    />
                  </div>
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">{{ $t("settings.core.recipients") }}</div>
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
                          $t("settings.core.noRecipients")
                        }}</q-item-label>
                      </q-item-section>
                    </q-list>
                  </div>
                </q-card-section>
                <!-- smtp -->
                <div class="text-subtitle2">
                  {{ $t("settings.core.sms.twilioSettings") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-3">
                    {{ $t("settings.core.sms.twilioNumber") }}
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
                    {{ $t("settings.core.sms.twilioAccountSid") }}
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
                    {{ $t("settings.core.sms.twilioAuthToken") }}
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
                  {{ $t("settings.core.mesh.title") }}
                </div>
                <q-separator />
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">
                    {{ $t("settings.core.usernameLabel") }}
                  </div>
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
                        $t('settings.core.mesh.usernameLowercase'),
                    ]"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">{{ $t("settings.core.mesh.site") }}</div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.mesh_site"
                    class="col-6"
                  />
                </q-card-section>
                <q-card-section class="row" v-if="!hosted">
                  <div class="col-4">{{ $t("settings.core.mesh.token") }}</div>
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
                    {{ $t("settings.core.mesh.deviceGroup") }}
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
                    {{ $t("settings.core.mesh.syncPerms") }}
                    <q-icon
                      right
                      name="ion-information-circle-outline"
                      size="sm"
                      class="cursor-pointer"
                    >
                      <q-tooltip class="text-caption">
                        {{ $t("settings.core.mesh.syncPermsTooltip") }}
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
                    {{ $t("settings.core.mesh.companyName") }}
                    <q-icon
                      name="ion-information-circle-outline"
                      size="sm"
                      class="q-ml-sm cursor-pointer"
                    >
                      <q-tooltip class="text-caption">
                        {{ $t("settings.core.mesh.companyNameTooltip") }}
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
                    {{ $t("settings.core.retention.checkHistory") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.check_history_prune_days"
                    class="col-6"
                    :hint="$t('settings.core.zeroDisables')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.retention.resolvedAlerts") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.resolved_alerts_prune_days"
                    class="col-6"
                    :hint="$t('settings.core.zeroDisables')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.retention.agentHistory") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.agent_history_prune_days"
                    class="col-6"
                    :hint="$t('settings.core.zeroDisables')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.retention.debugLogs") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.debug_log_prune_days"
                    class="col-6"
                    :hint="$t('settings.core.zeroDisables')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.retention.auditLogs") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.audit_log_prune_days"
                    class="col-6"
                    :hint="$t('settings.core.zeroDisables')"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">
                    {{ $t("settings.core.retention.reportHistory") }}
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    dense
                    outlined
                    v-model="settings.report_history_prune_days"
                    class="col-6"
                    :hint="$t('settings.core.zeroDisables')"
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
              :label="$t('common.save')"
              color="primary"
              type="submit"
            />
            <q-btn
              v-show="tab === 'emailalerts'"
              :label="$t('settings.core.email.saveAndTest')"
              color="primary"
              type="submit"
              class="q-ml-md"
              @click="emailTest = true"
            />
            <q-btn
              v-show="tab === 'smsalerts'"
              :label="$t('settings.core.sms.saveAndTest')"
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
        { label: this.$t("settings.core.logLevels.info"), value: "info" },
        { label: this.$t("settings.core.logLevels.warning"), value: "warning" },
        { label: this.$t("settings.core.logLevels.error"), value: "error" },
        {
          label: this.$t("settings.core.logLevels.critical"),
          value: "critical",
        },
      ],
    };
  },
  computed: {
    hosted() {
      return this.$store.state.hosted;
    },
    terminalModeOptions() {
      return [
        {
          label: this.$t("settings.core.general.useNewTerminal"),
          value: "new",
        },
        {
          label: this.$t("settings.core.general.useLegacyTerminal"),
          value: "legacy",
        },
      ];
    },
    fileBrowserModeOptions() {
      return [
        {
          label: this.$t("settings.core.general.useNewFileBrowser"),
          value: "new",
        },
        {
          label: this.$t("settings.core.general.useLegacyFileBrowser"),
          value: "legacy",
        },
      ];
    },
    windowsShellOptions() {
      return [
        { label: "CMD", value: "cmd" },
        { label: "PowerShell", value: "powershell" },
        { label: this.$t("settings.core.general.custom"), value: "custom" },
      ];
    },
    linuxShellOptions() {
      return [
        { label: "Bash", value: "bash" },
        { label: this.$t("settings.core.general.custom"), value: "custom" },
      ];
    },
    darwinShellOptions() {
      return [
        { label: "Bash", value: "bash" },
        { label: this.$t("settings.core.general.custom"), value: "custom" },
      ];
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
          title: this.$t("common.areYouSure"),
          message: this.$t("settings.core.mesh.syncConfirm"),
          ok: { label: this.$t("common.yes"), color: "primary" },
          cancel: { label: this.$t("common.no"), color: "negative" },
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
          title: this.$t("settings.core.email.addEmail"),
          prompt: {
            model: "",
            isValid: (val) => this.isValidEmail(val),
            type: "email",
          },
          cancel: true,
          ok: { label: this.$t("common.add"), color: "primary" },
          persistent: false,
        })
        .onOk((data) => {
          this.settings.email_alert_recipients.push(data);
        });
    },
    toggleAddSMSNumber() {
      this.$q
        .dialog({
          title: this.$t("settings.core.sms.addNumber"),
          message: this.$t("settings.core.sms.e164Help"),
          prompt: {
            model: "",
          },
          html: true,
          cancel: true,
          ok: { label: this.$t("common.add"), color: "primary" },
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
              message: this.$t("settings.core.email.sendingTest"),
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
              message: this.$t("settings.core.sms.sendingTest"),
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
            this.notifySuccess(this.$t("settings.core.notify.edited"));
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
