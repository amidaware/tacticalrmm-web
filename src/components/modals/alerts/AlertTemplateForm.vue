<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 90vw; max-width: 90vw">
      <q-bar>
        {{
          alertTemplate
            ? $gettext("Edit Alert Template")
            : $gettext("Add Alert Template")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-stepper
        v-model="step"
        ref="stepper"
        alternative-labels
        header-nav
        color="primary"
        animated
      >
        <q-step
          :name="1"
          :error="!template.name && step > 1"
          :title="$gettext('General Settings')"
          icon="settings"
        >
          <q-card flat>
            <q-card-section>
              <q-input
                :label="$pgettext('Alert template configuration', 'Name')"
                class="q-mb-none"
                outlined
                dense
                v-model="template.name"
                :rules="[(val) => !!val || $gettext('*Required')]"
              />
            </q-card-section>

            <q-card-section>
              <q-toggle
                v-model="template.is_active"
                color="green"
                :label="$pgettext('Alert template configuration', 'Enabled')"
                left-label
              />
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              {{ $gettext("Email Settings (Overrides global email settings)") }}
            </div>

            <q-card-section>
              <q-input
                :label="$gettext('Email From address')"
                class="q-mb-sm"
                outlined
                dense
                v-model="template.email_from"
              />
            </q-card-section>

            <q-card-section class="row">
              <div class="col-2 q-mb-sm">
                {{
                  $pgettext("Alert template configuration", "Email recipients")
                }}
              </div>
              <div class="col-4 q-mb-sm">
                <q-list dense v-if="template.email_recipients.length !== 0">
                  <q-item
                    v-for="email in template.email_recipients"
                    :key="email"
                    dense
                  >
                    <q-item-section>
                      <q-item-label>{{ email }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-icon
                        class="cursor-pointer"
                        name="delete"
                        color="red"
                        @click="removeEmail(email)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
                <q-list v-else>
                  <q-item-section>
                    <q-item-label>{{ $gettext("No recipients") }}</q-item-label>
                  </q-item-section>
                </q-list>
              </div>
              <div class="col-3 q-mb-sm"></div>
              <div class="col-3 q-mb-sm">
                <q-btn
                  size="sm"
                  icon="fas fa-plus"
                  color="secondary"
                  :label="$gettext('Add email')"
                  @click="toggleAddEmail"
                />
              </div>
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              {{ $gettext("SMS Settings (Overrides global SMS settings)") }}
            </div>

            <q-card-section class="row">
              <div class="col-2 q-mb-sm">
                {{ $gettext("SMS recipients") }}
              </div>
              <div class="col-4 q-mb-md">
                <q-list dense v-if="template.text_recipients.length !== 0">
                  <q-item
                    v-for="num in template.text_recipients"
                    :key="num"
                    dense
                  >
                    <q-item-section>
                      <q-item-label>{{ num }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-icon
                        class="cursor-pointer"
                        name="delete"
                        color="red"
                        @click="removeSMSNumber(num)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
                <q-list v-else>
                  <q-item-section>
                    <q-item-label>{{ $gettext("No recipients") }}</q-item-label>
                  </q-item-section>
                </q-list>
              </div>
              <div class="col-3 q-mb-sm"></div>
              <div class="col-3 q-mb-sm">
                <q-btn
                  class="cursor-pointer"
                  size="sm"
                  icon="fas fa-plus"
                  color="secondary"
                  :label="$gettext('Add sms number')"
                  @click="toggleAddSMSNumber"
                />
              </div>
            </q-card-section>
          </q-card>
        </q-step>

        <q-step :name="2" :title="$gettext('Alert Actions')" icon="warning">
          <q-card flat>
            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Failure Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "The selected action will run when an alert is triggered.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>

            <q-card-section>
              <q-option-group
                v-model="template.action_type"
                class="q-pb-sm"
                :options="actionTypeOptions"
                dense
                inline
              />

              <tactical-dropdown
                v-if="template.action_type == 'script'"
                class="q-mb-sm"
                :label="$gettext('Failure script')"
                outlined
                clearable
                v-model="template.action"
                :options="scriptOptions"
                mapOptions
                filterable
                :rules="[(val) => !!val || $gettext('*Required')]"
              />

              <tactical-dropdown
                v-else-if="template.action_type == 'server'"
                class="q-mb-sm"
                :label="$gettext('Failure script')"
                outlined
                clearable
                v-model="template.action"
                :options="serverScriptOptions"
                mapOptions
                filterable
              />

              <tactical-dropdown
                v-else
                class="q-mb-sm"
                :label="$gettext('Failure Web Hook')"
                outlined
                clearable
                v-model="template.action_rest"
                :options="restActionOptions"
                mapOptions
                filterable
              />

              <q-select
                v-if="template.action_type !== 'rest'"
                class="q-mb-sm"
                dense
                :label="
                  $gettext(
                    'Failure script arguments (press Enter after typing each argument)',
                  )
                "
                filled
                v-model="template.action_args"
                use-input
                use-chips
                multiple
                hide-dropdown-icon
                input-debounce="0"
                new-value-mode="add"
              />

              <q-select
                v-if="template.action_type !== 'rest'"
                class="q-mb-sm"
                dense
                :label="
                  $gettext(
                    'Failure script environment vars (press Enter after typing each key=value pair)',
                  )
                "
                filled
                v-model="template.action_env_vars"
                use-input
                use-chips
                multiple
                hide-dropdown-icon
                input-debounce="0"
                new-value-mode="add"
              />

              <q-input
                v-if="template.action_type !== 'rest'"
                class="q-mb-sm"
                :label="$gettext('Failure script timeout (seconds)')"
                outlined
                type="number"
                v-model.number="template.action_timeout"
                dense
                :rules="[
                  (val) =>
                    !!val || $gettext('Failure script timeout is required'),
                ]"
              />
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Resolved Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "The selected action will run when an alert is resolved.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>

            <q-card-section>
              <q-option-group
                v-model="template.resolved_action_type"
                class="q-pb-sm"
                :options="actionTypeOptions"
                dense
                inline
              />

              <tactical-dropdown
                v-if="template.resolved_action_type === 'script'"
                class="q-mb-sm"
                :label="$gettext('Resolved Script')"
                outlined
                clearable
                v-model="template.resolved_action"
                :options="scriptOptions"
                mapOptions
                filterable
              />

              <tactical-dropdown
                v-else-if="template.resolved_action_type === 'server'"
                class="q-mb-sm"
                :label="$gettext('Resolved Script')"
                outlined
                clearable
                v-model="template.resolved_action"
                :options="serverScriptOptions"
                mapOptions
                filterable
              />

              <tactical-dropdown
                v-else
                class="q-mb-sm"
                :label="$gettext('Resolved Web Hook')"
                outlined
                clearable
                v-model="template.resolved_action_rest"
                :options="restActionOptions"
                mapOptions
                filterable
              />

              <q-select
                v-if="template.resolved_action_type !== 'rest'"
                class="q-mb-sm"
                dense
                :label="
                  $gettext(
                    'Resolved script arguments (press Enter after typing each argument)',
                  )
                "
                filled
                v-model="template.resolved_action_args"
                use-input
                use-chips
                multiple
                hide-dropdown-icon
                input-debounce="0"
                new-value-mode="add"
              />

              <q-select
                v-if="template.resolved_action_type !== 'rest'"
                class="q-mb-sm"
                dense
                :label="
                  $gettext(
                    'Resolved action environment vars (press Enter after typing each key=value pair)',
                  )
                "
                filled
                v-model="template.resolved_action_env_vars"
                use-input
                use-chips
                multiple
                hide-dropdown-icon
                input-debounce="0"
                new-value-mode="add"
              />

              <q-input
                v-if="template.resolved_action_type !== 'rest'"
                class="q-mb-sm"
                :label="$gettext('Resolved script timeout (seconds)')"
                outlined
                type="number"
                v-model.number="template.resolved_action_timeout"
                dense
                :rules="[
                  (val) =>
                    !!val || $gettext('Resolved script timeout is required'),
                ]"
              />
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Run actions only on") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "The selected action will only run on the following types of alerts",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>

            <q-card-section>
              <q-toggle
                v-model="template.agent_script_actions"
                :label="$pgettext('Alert template configuration', 'Agents')"
                color="green"
                left-label
              />

              <q-toggle
                v-model="template.check_script_actions"
                :label="$pgettext('Alert template configuration', 'Checks')"
                color="green"
                left-label
              />

              <q-toggle
                v-model="template.task_script_actions"
                :label="$gettext('Tasks')"
                color="green"
                left-label
              />
            </q-card-section>
          </q-card>
        </q-step>

        <q-step
          :name="3"
          :title="$gettext('Agent Overdue Settings')"
          icon="devices"
        >
          <q-card flat>
            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Failure Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "Select what notifications should be sent when an agent is overdue. Enabled will override the agent notification settings and always notify. Not configured will use what notification settings are configured on the agent. Disabled will override the agent notification settings and never notify.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>
            <q-card-section>
              <q-toggle
                v-model="template.agent_always_email"
                :label="$pgettext('Email notification channel', 'Email')"
                color="green"
                left-label
                toggle-indeterminate
              />
              <q-toggle
                v-model="template.agent_always_text"
                :label="$pgettext('SMS notification channel', 'Text')"
                color="green"
                left-label
                toggle-indeterminate
              />
              <q-toggle
                v-model="template.agent_always_alert"
                :label="$gettext('Dashboard')"
                color="green"
                left-label
                toggle-indeterminate
              />
            </q-card-section>
            <q-card-section>
              <q-input
                :label="$gettext('Alert again if not resolved after (days)')"
                outlined
                type="number"
                v-model.number="template.agent_periodic_alert_days"
                dense
                :rules="[
                  (val) =>
                    val >= 0 || $gettext('Periodic days must be 0 or greater'),
                ]"
              />
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Resolved Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "Select what notifications should be sent when an overdue agent is back online.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>
            <q-card-section>
              <q-toggle
                v-model="template.agent_email_on_resolved"
                :label="$pgettext('Email notification channel', 'Email')"
                color="green"
                left-label
              />
              <q-toggle
                v-model="template.agent_text_on_resolved"
                :label="$pgettext('SMS notification channel', 'Text')"
                color="green"
                left-label
              />
            </q-card-section>
          </q-card>
        </q-step>

        <q-step
          :name="4"
          :title="$gettext('Check Settings')"
          icon="fas fa-check-double"
        >
          <q-card flat>
            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Failure Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "Select what notifications are sent when a check fails. Enabled will override the check notification settings and always notify. Not configured will use the notification settings configured on the check. Disabled will override the check notification settings and never notify.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>

            <q-card-section>
              <q-toggle
                v-model="template.check_always_email"
                :label="$pgettext('Email notification channel', 'Email')"
                color="green"
                left-label
                toggle-indeterminate
              />
              <q-toggle
                v-model="template.check_always_text"
                :label="$pgettext('SMS notification channel', 'Text')"
                color="green"
                left-label
                toggle-indeterminate
              />
              <q-toggle
                v-model="template.check_always_alert"
                :label="$gettext('Dashboard')"
                color="green"
                left-label
                toggle-indeterminate
              />
            </q-card-section>

            <q-card-section>
              <q-select
                :label="$gettext('Only email on alert severity')"
                :hint="
                  $gettext(
                    'Defaults to \u0027error\u0027 and \u0027warning\u0027',
                  )
                "
                v-model="template.check_email_alert_severity"
                outlined
                dense
                options-dense
                multiple
                use-chips
                emit-value
                map-options
                :options="severityOptions"
              />
            </q-card-section>

            <q-card-section>
              <q-select
                :label="$gettext('Only text on alert severity')"
                :hint="
                  $gettext(
                    'Defaults to \u0027error\u0027 and \u0027warning\u0027',
                  )
                "
                v-model="template.check_text_alert_severity"
                outlined
                dense
                options-dense
                multiple
                use-chips
                emit-value
                map-options
                :options="severityOptions"
              />
            </q-card-section>

            <q-card-section>
              <q-select
                :label="$gettext('Only show dashboard alert on severity')"
                :hint="
                  $gettext(
                    'Defaults to \u0027error\u0027, \u0027warning\u0027, and \u0027info\u0027',
                  )
                "
                v-model="template.check_dashboard_alert_severity"
                outlined
                dense
                options-dense
                multiple
                use-chips
                emit-value
                map-options
                :options="severityOptions"
              />
            </q-card-section>

            <q-card-section>
              <q-input
                :label="$gettext('Alert again if not resolved after (days)')"
                outlined
                type="number"
                v-model.number="template.check_periodic_alert_days"
                dense
                :rules="[
                  (val) =>
                    val >= 0 || $gettext('Periodic days must be 0 or greater'),
                ]"
              />
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Resolved Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "Select what notifications are sent when a failed check is resolved.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>
            <q-card-section>
              <q-toggle
                v-model="template.check_email_on_resolved"
                :label="$pgettext('Email notification channel', 'Email')"
                color="green"
                left-label
              />
              <q-toggle
                v-model="template.check_text_on_resolved"
                :label="$pgettext('SMS notification channel', 'Text')"
                color="green"
                left-label
              />
            </q-card-section>
          </q-card>
        </q-step>

        <q-step
          :name="5"
          :title="$gettext('Automated Task Settings')"
          icon="fas fa-tasks"
        >
          <q-card flat>
            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Failure Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "Select what notifications are sent when an automated task fails. Enabled will override the task notification settings and always notify. Not configured will use the notification settings configured on the task. Disabled will override the task notification settings and never notify.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>

            <q-card-section>
              <q-toggle
                v-model="template.task_always_email"
                :label="$pgettext('Email notification channel', 'Email')"
                color="green"
                left-label
                toggle-indeterminate
              />
              <q-toggle
                v-model="template.task_always_text"
                :label="$pgettext('SMS notification channel', 'Text')"
                color="green"
                left-label
                toggle-indeterminate
              />
              <q-toggle
                v-model="template.task_always_alert"
                :label="$gettext('Dashboard')"
                color="green"
                left-label
                toggle-indeterminate
              />
            </q-card-section>

            <q-card-section>
              <q-select
                :label="$gettext('Only email on alert severity')"
                :hint="
                  $gettext(
                    'Defaults to \u0027error\u0027 and \u0027warning\u0027',
                  )
                "
                v-model="template.task_email_alert_severity"
                outlined
                dense
                options-dense
                multiple
                use-chips
                emit-value
                map-options
                :options="severityOptions"
              />
            </q-card-section>

            <q-card-section>
              <q-select
                :label="$gettext('Only text on alert severity')"
                :hint="
                  $gettext(
                    'Defaults to \u0027error\u0027 and \u0027warning\u0027',
                  )
                "
                v-model="template.task_text_alert_severity"
                outlined
                dense
                options-dense
                multiple
                use-chips
                emit-value
                map-options
                :options="severityOptions"
              />
            </q-card-section>

            <q-card-section>
              <q-select
                :label="$gettext('Only show dashboard alert on severity')"
                :hint="
                  $gettext(
                    'Defaults to \u0027error\u0027, \u0027warning\u0027, and \u0027info\u0027',
                  )
                "
                v-model="template.task_dashboard_alert_severity"
                outlined
                dense
                options-dense
                multiple
                use-chips
                emit-value
                map-options
                :options="severityOptions"
              />
            </q-card-section>

            <q-card-section>
              <q-input
                :label="$gettext('Alert again if not resolved (days)')"
                outlined
                type="number"
                v-model.number="template.task_periodic_alert_days"
                dense
                :rules="[
                  (val) =>
                    val >= 0 || $gettext('Periodic days must be 0 or greater'),
                ]"
              />
            </q-card-section>

            <div class="q-pl-md text-subtitle1">
              <span style="text-decoration: underline; cursor: help"
                >{{ $gettext("Alert Resolved Settings") }}
                <q-tooltip>
                  {{
                    $gettext(
                      "Select what notifications are sent when a failed task is resolved.",
                    )
                  }}
                </q-tooltip>
              </span>
            </div>
            <q-card-section>
              <q-toggle
                v-model="template.task_email_on_resolved"
                :label="$pgettext('Email notification channel', 'Email')"
                color="green"
                left-label
              />
              <q-toggle
                v-model="template.task_text_on_resolved"
                :label="$pgettext('SMS notification channel', 'Text')"
                color="green"
                left-label
              />
            </q-card-section>
          </q-card>
        </q-step>
        <template v-slot:navigation>
          <q-stepper-navigation class="row">
            <q-btn
              v-if="step > 1"
              flat
              color="primary"
              @click="stepper?.previous()"
              :label="$gettext('Back')"
              class="q-mr-xs"
            />
            <q-btn
              v-if="step < 5"
              @click="stepper?.next()"
              color="primary"
              :label="$gettext('Next')"
            />
            <q-space />
            <q-btn
              @click="onSubmit"
              color="primary"
              :label="$gettext('Submit')"
              :loading="loading"
            />
          </q-stepper-navigation>
        </template>
      </q-stepper>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
import { computed, ref, reactive, watch, nextTick } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent, type QStepper } from "quasar";
import { useScriptDropdown } from "@/composables/scripts";
import { useURLActionDropdown } from "@/composables/core";
import { notifyError, notifySuccess } from "@/utils/notify";
import { addAlertTemplate, saveAlertTemplate } from "@/api/alerts";
import { isValidEmail } from "@/utils/validation";

// components
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// types
import type { AlertTemplate, AlertSeverity } from "@/types/alerts";

// store
const store = useStore();
const hosted = computed(() => store.state.hosted);
const server_scripts_enabled = computed(
  () => store.state.server_scripts_enabled,
);

// props
const props = defineProps<{
  alertTemplate?: AlertTemplate;
}>();

// emits
defineEmits([...useDialogPluginComponent.emits]);

// setup quasar plugins
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const $q = useQuasar();

const step = ref(1);

// setup script dropdowns
const {
  script: failureAction,
  defaultArgs: failureArgs,
  defaultEnvVars: failureEnvVars,
  defaultTimeout: failureTimeout,
  serverScriptOptions,
  scriptOptions,
} = useScriptDropdown({ script: props.alertTemplate?.action, onMount: true });

const {
  script: resolvedAction,
  defaultArgs: resolvedArgs,
  defaultEnvVars: resolvedEnvVars,
  defaultTimeout: resolvedTimeout,
} = useScriptDropdown({
  script: props.alertTemplate?.resolved_action,
  onMount: true,
});

// setup custom field dropdown
const { restActionOptions } = useURLActionDropdown({ onMount: true });

// alert template form logic
const template: AlertTemplate = props.alertTemplate
  ? reactive(Object.assign({}, { ...props.alertTemplate }))
  : reactive({
      id: 0,
      name: "",
      is_active: true,
      action_type: "script",
      action: failureAction,
      action_rest: undefined,
      action_args: failureArgs,
      action_env_vars: failureEnvVars,
      action_timeout: failureTimeout,
      resolved_action_type: "script",
      resolved_action: resolvedAction,
      resolved_action_rest: undefined,
      resolved_action_args: resolvedArgs,
      resolved_action_env_vars: resolvedEnvVars,
      resolved_action_timeout: resolvedTimeout,
      email_recipients: [] as string[],
      email_from: "",
      text_recipients: [] as string[],
      agent_email_on_resolved: false,
      agent_text_on_resolved: false,
      agent_always_email: null,
      agent_always_text: null,
      agent_always_alert: null,
      agent_periodic_alert_days: 0,
      agent_script_actions: true,
      check_email_alert_severity: [] as AlertSeverity[],
      check_text_alert_severity: [] as AlertSeverity[],
      check_dashboard_alert_severity: [] as AlertSeverity[],
      check_email_on_resolved: false,
      check_text_on_resolved: false,
      check_always_email: null,
      check_always_text: null,
      check_always_alert: null,
      check_periodic_alert_days: 0,
      check_script_actions: true,
      task_email_alert_severity: [] as AlertSeverity[],
      task_text_alert_severity: [] as AlertSeverity[],
      task_dashboard_alert_severity: [] as AlertSeverity[],
      task_email_on_resolved: false,
      task_text_on_resolved: false,
      task_always_email: null,
      task_always_text: null,
      task_always_alert: null,
      task_periodic_alert_days: 0,
      task_script_actions: true,
    });

// reset selected script if action type is changed
watch(
  () => template.action_type,
  () => {
    template.action_rest = undefined;
    template.action = undefined;
    template.action_args = [];
    template.action_env_vars = [];
    template.action_timeout = 30;
  },
);

watch(
  () => template.resolved_action_type,
  () => {
    template.resolved_action_rest = undefined;
    template.resolved_action = undefined;
    template.resolved_action_args = [];
    template.resolved_action_env_vars = [];
    template.resolved_action_timeout = 30;
  },
);

// sync selected script to scriptdropdown
// only add watchers if editting template
if (props.alertTemplate) {
  watch(
    () => template.action,
    (newValue) => {
      if (newValue) {
        failureAction.value = newValue;

        // wait for the script change to happen
        nextTick(() => {
          template.action_args = failureArgs.value;
          template.action_env_vars = failureEnvVars.value;
          template.action_timeout = failureTimeout.value;
        });
      }
    },
  );

  watch(
    () => template.resolved_action,
    (newValue) => {
      if (newValue) {
        resolvedAction.value = newValue;

        // wait for the script change to happen
        nextTick(() => {
          template.resolved_action_args = resolvedArgs.value;
          template.resolved_action_env_vars = resolvedEnvVars.value;
          template.resolved_action_timeout = resolvedTimeout.value;
        });
      }
    },
  );
}

const severityOptions = computed(() => [
  {
    label: gettext.$pgettext("Alert template configuration", "Error"),
    value: "error",
  },
  {
    label: gettext.$pgettext("Alert template configuration", "Warning"),
    value: "warning",
  },
  {
    label: gettext.$pgettext("Alert template configuration", "Informational"),
    value: "info",
  },
]);

const staticActionTypeOptions = computed(() => [
  { label: gettext.$gettext("Send a Web Hook"), value: "rest" },
  { label: gettext.$gettext("Run script on Agent"), value: "script" },
  { label: gettext.$gettext("Run script on TRMM Server"), value: "server" },
]);

const actionTypeOptions = computed(() => {
  // don't show for hosted at all
  if (hosted.value) {
    return staticActionTypeOptions.value.filter(
      (option) => option.value !== "server",
    );
  }
  // disable the server script radio button if feature is disabled globally
  const modifiedOptions = staticActionTypeOptions.value.map((option) => {
    if (!server_scripts_enabled.value && option.value === "server") {
      return { ...option, disable: true };
    }
    return option;
  });

  return modifiedOptions;
});

const stepper = ref<QStepper | null>(null);
function toggleAddEmail() {
  $q.dialog({
    prompt: {
      model: "",
      isValid: (val) => isValidEmail(val),
      type: "email",
    },
    cancel: true,
    title: gettext.$gettext("Add email"),
    ok: { label: gettext.$gettext("Add"), color: "primary" },
    persistent: false,
  }).onOk((data) => {
    template.email_recipients.push(data);
  });
}

function toggleAddSMSNumber() {
  $q.dialog({
    title: gettext.$gettext("Add number"),
    message: gettext.$pgettext(
      "Alert template configuration",
      "Use E.164 format: must have the <b>+</b> symbol and <span class='text-red'>country code</span>, followed by the <span class='text-green'>phone number</span> e.g. <b>+<span class='text-red'>1</span><span class='text-green'>2131231234</span></b>",
    ),
    prompt: {
      model: "",
    },
    html: true,
    cancel: true,
    ok: { label: gettext.$gettext("Add"), color: "primary" },
    persistent: false,
  }).onOk((data: string) => {
    template.text_recipients.push(data);
  });
}

function removeEmail(email: string) {
  const removed = template.email_recipients.filter((k) => k !== email);
  template.email_recipients = removed;
}

function removeSMSNumber(num: string) {
  const removed = template.text_recipients.filter((k) => k !== num);
  template.text_recipients = removed;
}

const loading = ref(false);

async function onSubmit() {
  // TODO rework this ghetto form validation
  if (!template.name) {
    notifyError(gettext.$gettext("Name needs to be set"));
    return;
  }

  loading.value = true;

  if (props.alertTemplate) {
    try {
      await saveAlertTemplate(template.id, template);
      notifySuccess(gettext.$gettext("Alert Template edited!"));
      onDialogOK();
    } catch {
    } finally {
      loading.value = false;
    }
  } else {
    try {
      await addAlertTemplate(template);
      notifySuccess(gettext.$gettext("Alert Template created!"));
      onDialogOK();
    } catch {
    } finally {
      loading.value = false;
    }
  }
}
</script>
