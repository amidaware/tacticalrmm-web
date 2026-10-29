<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 65vw; min-width: 65vw">
      <q-bar>
        {{
          task
            ? $gettext("Editing Automated Task: %{name}", {
                name: task.name,
              })
            : $gettext("Adding Automated Task")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section v-if="scriptOptions.length === 0">
        <p>
          {{
            $pgettext(
              "Automated task configuration",
              "You need to upload a script first",
            )
          }}
        </p>
        <p>{{ $gettext("Settings -> Script Manager") }}</p>
      </q-card-section>
      <q-stepper v-else v-model="step" ref="stepper" color="primary" animated>
        <q-step
          :name="1"
          :title="$gettext('Select Task')"
          :done="step > 1"
          :error="!isValidStep1"
        >
          <q-form @submit.prevent ref="taskGeneralForm">
            <q-card-section>
              <q-input
                :rules="[(val) => !!val || $gettext('*Required')]"
                filled
                dense
                v-model="state.name"
                :label="$gettext('Descriptive name of task')"
                hide-bottom-space
              />
            </q-card-section>
            <q-card-section v-show="!isAgentTask">
              {{ $gettext("Supported Platforms") }}
              <q-option-group
                v-model="state.task_supported_platforms"
                :options="plat_options"
                type="checkbox"
                inline
              />
            </q-card-section>
            <q-card-section>
              <q-checkbox
                dense
                :label="$gettext('Collector Task')"
                v-model="collector"
                class="q-pb-sm"
                @update:model-value="
                  state.custom_field = null;
                  state.collector_all_output = false;
                "
              />
              <tactical-dropdown
                v-if="collector"
                :rules="[(val) => !!val || $gettext('*Required')]"
                v-model="state.custom_field"
                :options="customFieldOptions"
                :label="$gettext('Custom Field to update')"
                filled
                mapOptions
                :hint="
                  state.collector_all_output
                    ? $gettext(
                        'All script output will be saved to custom field selected',
                      )
                    : $gettext(
                        'The last line of script output will be saved to custom field selected',
                      )
                "
                filterable
              />
              <q-checkbox
                v-if="collector"
                dense
                :label="$gettext('Save all output')"
                v-model="state.collector_all_output"
                class="q-py-sm"
              />
            </q-card-section>
            <q-card-section>
              <tactical-dropdown
                v-model="state.alert_severity"
                :options="severityOptions"
                :label="
                  $pgettext('Automated task configuration', 'Alert Severity')
                "
                filled
                mapOptions
                :rules="[(val) => !!val || $gettext('*Required')]"
              />
            </q-card-section>
          </q-form>
        </q-step>

        <q-step
          :name="2"
          :title="$gettext('Configure Actions')"
          :done="step > 2"
          :error="!isValidStep2"
        >
          <div class="scroll" style="max-height: 60vh">
            <q-form @submit.prevent="addAction">
              <div class="row q-pa-sm q-gutter-x-xs items-center">
                <div class="text-subtitle2 col-12">
                  {{ $gettext("Action Type") }}:
                </div>
                <q-option-group
                  class="col-12"
                  inline
                  v-model="actionType"
                  :options="[
                    {
                      label: $pgettext(
                        'Automated task configuration',
                        'Script',
                      ),
                      value: 'script',
                    },
                    {
                      label: $gettext('Command'),
                      value: 'cmd',
                    },
                  ]"
                />

                <tactical-dropdown
                  v-if="actionType === 'script'"
                  class="col-3"
                  :label="$gettext('Select script')"
                  v-model="script"
                  :options="scriptOptions"
                  filled
                  mapOptions
                  filterable
                />

                <q-select
                  v-if="actionType === 'script'"
                  class="col-3"
                  dense
                  :label="
                    $pgettext(
                      'Automated task configuration',
                      'Script Arguments (press Enter after typing each argument)',
                    )
                  "
                  filled
                  v-model="defaultArgs"
                  use-input
                  use-chips
                  multiple
                  hide-dropdown-icon
                  input-debounce="0"
                  new-value-mode="add"
                />

                <q-select
                  v-if="actionType === 'script'"
                  class="col-3"
                  dense
                  :label="$gettext('Environment Variables')"
                  filled
                  v-model="defaultEnvVars"
                  use-input
                  use-chips
                  multiple
                  hide-dropdown-icon
                  input-debounce="0"
                  new-value-mode="add"
                />

                <q-input
                  v-if="actionType === 'script'"
                  class="col-2"
                  filled
                  dense
                  v-model.number="defaultTimeout"
                  type="number"
                  :label="$gettext('Timeout (seconds)')"
                />

                <q-input
                  v-if="actionType === 'cmd'"
                  :label="$gettext('Command')"
                  v-model="command"
                  dense
                  filled
                  class="col-5"
                />
                <q-input
                  v-if="actionType === 'cmd'"
                  class="col-2"
                  filled
                  dense
                  v-model.number="defaultTimeout"
                  type="number"
                  :label="$gettext('Timeout (seconds)')"
                />
                <q-option-group
                  v-if="actionType === 'cmd'"
                  class="col-4 q-pl-sm"
                  inline
                  v-model="shell"
                  :options="[
                    {
                      label: $gettext('CMD'),
                      value: 'cmd',
                    },
                    {
                      label: $gettext('Powershell'),
                      value: 'powershell',
                    },
                    {
                      label: $gettext('Bash'),
                      value: '/bin/bash',
                    },
                    {
                      label: $pgettext(
                        'Automated task configuration',
                        'Custom',
                      ),
                      value: 'custom',
                    },
                  ]"
                />
                <q-btn
                  class="col-1"
                  type="submit"
                  style="width: 50px"
                  flat
                  dense
                  icon="add"
                  :label="$gettext('Add')"
                  color="primary"
                />
              </div>
            </q-form>
            <div v-if="shell === 'custom'" class="col-5">
              <q-input
                v-model="custom_shell"
                outlined
                :label="$gettext('Custom shell')"
                stack-label
                :placeholder="$gettext('/usr/bin/python3')"
              />
            </div>
            <div class="text-subtitle2 q-pa-sm">
              {{ $pgettext("Automated task configuration", "Actions") }}:
              <q-checkbox
                class="float-right"
                :label="$gettext('Continue on Errors')"
                v-model="state.continue_on_error"
                dense
              >
                <q-tooltip>{{
                  $gettext("Continue task if an action fails")
                }}</q-tooltip>
              </q-checkbox>
            </div>
            <div class="q-pt-sm" style="height: 150px">
              <draggable
                class="q-list"
                handle=".handle"
                ghost-class="ghost"
                v-model="state.actions"
                item-key="index"
              >
                <template v-slot:item="{ index, element }">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon
                        class="handle"
                        style="cursor: move"
                        name="drag_handle"
                      />
                    </q-item-section>
                    <q-item-section v-if="element.type === 'script'">
                      <q-item-label>
                        <q-icon size="sm" name="description" color="primary" />
                        &nbsp; {{ element.name }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ $gettext("Arguments") }}:
                        {{ element.script_args }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ $gettext("Env Vars") }}:
                        {{ element.env_vars }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ $gettext("Timeout") }}: {{ element.timeout }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section v-else>
                      <q-item-label>
                        <q-icon size="sm" name="terminal" color="primary" />
                        &nbsp;
                        <q-icon
                          size="sm"
                          :name="
                            element.shell === 'cmd'
                              ? 'mdi-microsoft-windows'
                              : 'mdi-powershell'
                          "
                          color="primary"
                        />
                        {{ element.command }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ $gettext("Timeout") }}: {{ element.timeout }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-icon
                        class="cursor-pointer"
                        color="negative"
                        name="close"
                        @click="removeAction(index)"
                      />
                    </q-item-section>
                  </q-item>
                </template>
              </draggable>
            </div>
          </div>
        </q-step>

        <q-step
          :name="3"
          :title="$gettext('Choose Schedule')"
          :error="!isValidStep3"
        >
          <div class="scroll" style="height: 60vh; max-height: 60vh">
            <q-form @submit.prevent ref="taskDetailForm">
              <q-card-section>
                <q-option-group
                  v-model="state.task_type"
                  :label="$gettext('Task run type')"
                  :options="taskTypeOptions"
                  dense
                  inline
                  @update:model-value="$refs.taskDetailForm.resetValidation()"
                />
              </q-card-section>

              <!-- task start/expire time fields -->
              <q-card-section
                v-if="
                  ['runonce', 'daily', 'weekly', 'monthly'].includes(
                    state.task_type,
                  )
                "
                class="row"
              >
                <!-- start time input -->
                <q-input
                  class="col-6 q-pa-sm"
                  type="datetime-local"
                  dense
                  :label="
                    isPosix && state.task_type !== 'runonce'
                      ? $gettext('Run at')
                      : $gettext('Start time')
                  "
                  stack-label
                  filled
                  v-model="state.run_time_date"
                  :hint="
                    isPosix && state.task_type !== 'runonce'
                      ? $gettext(
                          'Agent timezone will be used. On Linux and macOS, the selected date is ignored - only the hour and minute are used.',
                        )
                      : $gettext('Agent timezone will be used')
                  "
                  :rules="[(val) => !!val || $gettext('*Required')]"
                />

                <!-- expires on input -->
                <q-input
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  type="datetime-local"
                  dense
                  stack-label
                  :label="$gettext('Expires on')"
                  filled
                  v-model="state.expire_date"
                  :hint="$gettext('Agent timezone will be used')"
                />
              </q-card-section>

              <q-card-section
                v-if="
                  state.task_type === 'onboarding' ||
                  state.task_type === 'runonce'
                "
                class="row"
              >
                <span v-if="state.task_type === 'onboarding'">{{
                  $gettext(
                    "This task will run as soon as it\u0027s created on the agent.",
                  )
                }}</span>
                <span v-else-if="state.task_type === 'runonce'">{{
                  $gettext(
                    "Start Time must be in the future for run once tasks.",
                  )
                }}</span>
              </q-card-section>

              <!-- daily options -->
              <q-card-section
                v-if="!isPosix && state.task_type === 'daily'"
                class="row"
              >
                <!-- daily interval -->
                <q-input
                  :rules="[
                    (val) => !!val || $gettext('*Required'),
                    (val) =>
                      (val > 0 && val < 256) ||
                      $gettext(
                        'Daily interval must be greater than 0 and less than 256',
                      ),
                  ]"
                  dense
                  type="number"
                  :label="$pgettext('Task repetition interval', 'Interval')"
                  v-model.number="state.daily_interval"
                  filled
                  class="col-6 q-pa-sm"
                >
                  <template v-slot:append>
                    <span class="text-subtitle2">{{
                      $pgettext("duration unit", "d")
                    }}</span>
                  </template>
                </q-input>
                <div class="col-6 q-pa-sm"></div>
              </q-card-section>

              <!-- weekly options -->
              <q-card-section v-if="state.task_type === 'weekly'" class="row">
                <!-- weekly interval -->
                <q-input
                  v-if="!isPosix"
                  :rules="[
                    (val) => !!val || $gettext('*Required'),
                    (val) =>
                      (val > 0 && val < 53) ||
                      $gettext(
                        'Weekly interval must be greater than 0 and less than 53',
                      ),
                  ]"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$pgettext('Task repetition interval', 'Interval')"
                  v-model="state.weekly_interval"
                  filled
                >
                  <template v-slot:append>
                    <span class="text-subtitle2">{{
                      $pgettext("duration unit", "wk")
                    }}</span>
                  </template>
                </q-input>

                <div class="col-6 q-pa-sm"></div>

                <div class="col-12 q-pa-sm">
                  <!-- day of week input -->
                  {{
                    $pgettext("Automated task configuration", "Run on Days")
                  }}:
                  <q-option-group
                    :rules="[(val) => val.length > 0 || $gettext('*Required')]"
                    inline
                    dense
                    :options="dayOfWeekOptions"
                    type="checkbox"
                    v-model="state.run_time_bit_weekdays"
                  />
                </div>
              </q-card-section>

              <!-- monthly options -->
              <q-card-section v-if="state.task_type === 'monthly'" class="row">
                <!-- type of monthly schedule -->
                <q-option-group
                  class="col-12 q-pa-sm"
                  v-model="monthlyType"
                  inline
                  :options="[
                    {
                      label: $gettext('On Days'),
                      value: 'days',
                    },
                    {
                      label: $gettext('On Weeks'),
                      value: 'weeks',
                    },
                  ]"
                />

                <!-- month select input -->
                <q-select
                  :rules="[(val) => val.length > 0 || $gettext('*Required')]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.monthly_months_of_year"
                  :options="monthOptions"
                  :label="
                    $pgettext('Automated task configuration', 'Run on Months')
                  "
                  multiple
                  emit-value
                  map-options
                >
                  <template v-slot:before-options>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{
                          $gettext("All months")
                        }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          v-model="allMonthsCheckbox"
                          @update:model-value="toggleMonths"
                        />
                      </q-item-section>
                    </q-item>
                  </template>

                  <template
                    v-slot:option="{ itemProps, opt, selected, toggleOption }"
                  >
                    <q-item v-bind="itemProps">
                      <q-item-section>
                        <q-item-label>{{ opt.label }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          :model-value="selected"
                          @update:model-value="
                            toggleOption(opt);
                            allMonthsCheckbox = false;
                          "
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <!-- days of month select input -->
                <q-select
                  v-if="monthlyType === 'days'"
                  :rules="[(val) => val.length > 0 || $gettext('*Required')]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.monthly_days_of_month"
                  :options="dayOfMonthOptions"
                  :label="
                    $pgettext('Automated task configuration', 'Run on Days')
                  "
                  multiple
                  emit-value
                  map-options
                >
                  <template v-slot:before-options>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{ $gettext("All days") }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          v-model="allMonthDaysCheckbox"
                          @update:model-value="toggleMonthDays"
                        />
                      </q-item-section>
                    </q-item>
                  </template>

                  <template
                    v-slot:option="{ itemProps, opt, selected, toggleOption }"
                  >
                    <q-item v-bind="itemProps">
                      <q-item-section>
                        <q-item-label>{{ opt.label }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          :model-value="selected"
                          @update:model-value="
                            toggleOption(opt);
                            allMonthDaysCheckbox = false;
                          "
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <div v-if="monthlyType === 'days'" class="col-4"></div>

                <!-- week of month select input -->
                <q-select
                  v-if="monthlyType === 'weeks'"
                  :rules="[(val) => val.length > 0 || $gettext('*Required')]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.monthly_weeks_of_month"
                  :options="weekOptions"
                  :label="
                    $pgettext('Automated task configuration', 'Run on weeks')
                  "
                  multiple
                  emit-value
                  map-options
                >
                  <template
                    v-slot:option="{ itemProps, opt, selected, toggleOption }"
                  >
                    <q-item v-bind="itemProps">
                      <q-item-section>
                        <q-item-label>{{ opt.label }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          :model-value="selected"
                          @update:model-value="toggleOption(opt)"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <!-- day of week select input -->
                <q-select
                  v-if="monthlyType === 'weeks'"
                  :rules="[(val) => val.length > 0 || $gettext('*Required')]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.run_time_bit_weekdays"
                  :options="dayOfWeekOptions"
                  :label="$gettext('Run on days')"
                  multiple
                  emit-value
                  map-options
                >
                  <template v-slot:before-options>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{ $gettext("All days") }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          v-model="allWeekDaysCheckbox"
                          @update:model-value="toggleWeekDays"
                        />
                      </q-item-section>
                    </q-item>
                  </template>

                  <template
                    v-slot:option="{ itemProps, opt, selected, toggleOption }"
                  >
                    <q-item v-bind="itemProps">
                      <q-item-section>
                        <q-item-label>{{ opt.label }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          dense
                          :model-value="selected"
                          @update:model-value="
                            toggleOption(opt);
                            allWeekDaysCheckbox = false;
                          "
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </q-card-section>

              <q-card-section
                v-if="
                  state.task_type !== 'checkfailure' &&
                  state.task_type !== 'manual' &&
                  state.task_type !== 'onboarding'
                "
                class="row"
              >
                <div v-if="!isPosix" class="col-12 text-h6">
                  {{ $gettext("Advanced Settings (Windows only)") }}
                </div>
                <q-input
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$gettext('Repeat task every')"
                  filled
                  v-model="state.task_repetition_interval"
                  :placeholder="
                    $gettext('e.g. 30m (30 minutes) or 1h (1 hour)')
                  "
                  lazy-rules
                  :rules="[
                    (val) =>
                      !val ||
                      validateTimePeriod(val) ||
                      $gettext(
                        'Valid values are 1-3 digits followed by (D|d|H|h|M|m|S|s)',
                      ),
                  ]"
                />

                <q-input
                  v-if="!isPosix"
                  :disable="!state.task_repetition_interval"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$gettext('Task repeat duration')"
                  filled
                  v-model="state.task_repetition_duration"
                  :placeholder="$gettext('e.g. 6h (6 hours) or 1d (1 day)')"
                  lazy-rules
                  :rules="[
                    (val) =>
                      validateTimePeriod(val) ||
                      $gettext(
                        'Valid values are 1-3 digits followed by (D|d|H|h|M|m|S|s)',
                      ),
                    (val) => (state.task_repetition_interval ? !!val : true), // field is required if repetition interval is set
                    (val) =>
                      convertPeriodToSeconds(val) >=
                        convertPeriodToSeconds(
                          state.task_repetition_interval,
                        ) ||
                      $gettext(
                        'Repetition duration must be greater than repetition interval',
                      ),
                  ]"
                />

                <q-checkbox
                  v-if="!isPosix"
                  :disable="!state.task_repetition_interval"
                  class="col-6 q-pa-sm"
                  dense
                  v-model="state.stop_task_at_duration_end"
                  :label="$gettext('Stop all tasks at the end of duration')"
                />
                <div class="col-6"></div>

                <q-input
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$gettext('Random task delay')"
                  filled
                  v-model="state.random_task_delay"
                  :placeholder="$gettext('e.g. 2m (2 minutes) or 1h (1 hour)')"
                  lazy-rules
                  :rules="[
                    (val) =>
                      !val ||
                      validateTimePeriod(val) ||
                      $gettext(
                        'Valid values are 1-3 digits followed by (D|d|H|h|M|m|S|s)',
                      ),
                  ]"
                />
                <div class="col-6"></div>
                <q-checkbox
                  v-if="!isPosix"
                  :disable="!state.expire_date"
                  class="col-6 q-pa-sm"
                  dense
                  v-model="state.remove_if_not_scheduled"
                  :label="$gettext('Delete task if not scheduled for 30 days')"
                >
                  <q-tooltip>{{
                    $gettext("Must set an expire date")
                  }}</q-tooltip>
                </q-checkbox>
                <div class="col-6"></div>
                <q-checkbox
                  v-if="!isPosix"
                  :disable="state.task_type === 'runonce'"
                  class="col-6 q-pa-sm"
                  dense
                  v-model="state.run_asap_after_missed"
                  :label="
                    $gettext('Run task ASAP after a scheduled start is missed')
                  "
                />

                <div class="col-6"></div>

                <tactical-dropdown
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  :label="$gettext('Task instance policy')"
                  :options="taskInstancePolicyOptions"
                  v-model="state.task_instance_policy"
                  filled
                  mapOptions
                />
              </q-card-section>

              <!-- check failure options -->
              <q-card-section
                v-else-if="state.task_type === 'checkfailure'"
                class="row"
              >
                <tactical-dropdown
                  class="col-6 q-pa-sm"
                  :rules="[(val) => !!val || $gettext('*Required')]"
                  v-model="state.assigned_check"
                  filled
                  :options="checkOptions"
                  :label="$gettext('Select Check')"
                  mapOptions
                  filterable
                />
              </q-card-section>
            </q-form>
          </div>
        </q-step>
      </q-stepper>
      <q-card-actions align="right">
        <q-btn flat :label="$gettext('Cancel')" v-close-popup />
        <q-btn
          v-if="step > 1"
          :label="$gettext('Back')"
          @click="$refs.stepper.previous()"
          color="primary"
          flat
        />
        <q-btn
          v-if="step < 3"
          @click="
            validateStep(
              step === 1 ? $refs.taskGeneralForm : undefined,
              $refs.stepper,
            )
          "
          color="primary"
          :label="$gettext('Next')"
          flat
        />
        <q-btn
          v-else
          :label="task ? $gettext('Edit Task') : $gettext('Add Task')"
          color="primary"
          @click="validateStep($refs.taskDetailForm, $refs.stepper)"
          :loading="loading"
          flat
          dense
          push
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { gettext } from "@/gettext";
// composition imports
import {
  computed,
  reactive,
  ref,
  watch,
  onMounted,
  defineComponent,
} from "vue";
import { useDialogPluginComponent, extend } from "quasar";
import draggable from "vuedraggable";
import { saveTask, updateTask } from "@/api/tasks";
import { useScriptDropdown } from "@/composables/scripts";
import { useCheckDropdown } from "@/composables/checks";
import { useCustomFieldDropdown } from "@/composables/core";
import { notifySuccess, notifyError } from "@/utils/notify";
import { validateTimePeriod } from "@/utils/validation";
import {
  convertPeriodToSeconds,
  convertToBitArray,
  convertFromBitArray,
  formatDateInputField,
} from "@/utils/format";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// static data
const getSeverityOptions = () => [
  {
    label: gettext.$pgettext("Automated task configuration", "Informational"),
    value: "info",
  },
  {
    label: gettext.$pgettext("Automated task configuration", "Warning"),
    value: "warning",
  },
  {
    label: gettext.$pgettext("Automated task configuration", "Error"),
    value: "error",
  },
];

const getTaskTypeOptions = () => [
  { label: gettext.$gettext("Daily"), value: "daily" },
  { label: gettext.$gettext("Weekly"), value: "weekly" },
  { label: gettext.$gettext("Monthly"), value: "monthly" },
  { label: gettext.$gettext("Run Once"), value: "runonce" },
  {
    label: gettext.$gettext("On check failure"),
    value: "checkfailure",
  },
  {
    label: gettext.$gettext("Onboarding"),
    value: "onboarding",
  },
  { label: gettext.$gettext("Manual"), value: "manual" },
];

const getDayOfWeekOptions = () => [
  { label: gettext.$gettext("Monday"), value: 0x2 },
  { label: gettext.$gettext("Tuesday"), value: 0x4 },
  { label: gettext.$gettext("Wednesday"), value: 0x8 },
  { label: gettext.$gettext("Thursday"), value: 0x10 },
  { label: gettext.$gettext("Friday"), value: 0x20 },
  { label: gettext.$gettext("Saturday"), value: 0x40 },
  { label: gettext.$gettext("Sunday"), value: 0x1 },
];

const getDayOfMonthOptions = () => {
  let result = [];
  let day = 0x1;
  for (let i = 1; i <= 31; i++) {
    result.push({ label: `${i}`, value: day });
    day = day << 1;
  }
  result.push({
    label: gettext.$gettext("Last Day"),
    value: 0x80000000,
  });
  return result;
};

const getMonthOptions = () => [
  { label: gettext.$gettext("January"), value: 0x1 },
  { label: gettext.$gettext("February"), value: 0x2 },
  { label: gettext.$gettext("March"), value: 0x4 },
  { label: gettext.$gettext("April"), value: 0x8 },
  { label: gettext.$gettext("May"), value: 0x10 },
  { label: gettext.$gettext("June"), value: 0x20 },
  { label: gettext.$gettext("July"), value: 0x40 },
  { label: gettext.$gettext("August"), value: 0x80 },
  { label: gettext.$gettext("September"), value: 0x100 },
  { label: gettext.$gettext("October"), value: 0x200 },
  { label: gettext.$gettext("November"), value: 0x400 },
  { label: gettext.$gettext("December"), value: 0x800 },
];

const getWeekOptions = () => [
  { label: gettext.$gettext("First Week"), value: 0x1 },
  { label: gettext.$gettext("Second Week"), value: 0x2 },
  { label: gettext.$gettext("Third Week"), value: 0x4 },
  { label: gettext.$gettext("Fourth Week"), value: 0x8 },
  { label: gettext.$gettext("Last Week"), value: 0x10 },
];

const getTaskInstancePolicyOptions = () => [
  {
    label: gettext.$gettext("Run in Parallel"),
    value: 0,
  },
  {
    label: gettext.$gettext("Queue Task"),
    value: 1,
  },
  {
    label: gettext.$pgettext("Automated task configuration", "Ignore"),
    value: 2,
  },
  {
    label: gettext.$gettext("Stop Existing"),
    value: 3,
  },
];

const getPlatformOptions = () => [
  { label: gettext.$gettext("Windows"), value: "windows" },
  { label: gettext.$gettext("Linux"), value: "linux" },
  { label: gettext.$gettext("macOS"), value: "darwin" },
];

export default defineComponent({
  components: { TacticalDropdown, draggable },
  name: "AddAutomatedTask",
  emits: [...useDialogPluginComponent.emits],
  props: {
    parent: Object, // parent policy or agent for task
    task: Object, // only for editing
    plat: String,
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // setup dropdowns
    const {
      script,
      scriptName,
      scriptOptions,
      defaultTimeout,
      defaultArgs,
      defaultEnvVars,
    } = useScriptDropdown({
      onMount: true,
    });

    // set defaultTimeout to 30
    defaultTimeout.value = 30;

    const { checkOptions, getCheckOptions } = useCheckDropdown(props.parent);
    const { customFieldOptions } = useCustomFieldDropdown({ onMount: true });
    const severityOptions = computed(() => getSeverityOptions());
    const dayOfWeekOptions = computed(() => getDayOfWeekOptions());
    const dayOfMonthOptions = computed(() => getDayOfMonthOptions());
    const monthOptions = computed(() => getMonthOptions());
    const weekOptions = computed(() => getWeekOptions());
    const taskTypeOptions = computed(() => getTaskTypeOptions());
    const taskInstancePolicyOptions = computed(() =>
      getTaskInstancePolicyOptions(),
    );
    const plat_options = computed(() => getPlatformOptions());

    const isAgentTask = computed(() => {
      return !!props.plat;
    });

    // add task logic
    const localTask = props.task
      ? reactive(extend(true, {}, props.task))
      : reactive({
          ...props.parent,
          actions: [],
          assigned_check: null,
          custom_field: null,
          name: null,
          expire_date: null,
          run_time_date: formatDateInputField(Date.now()),
          run_time_bit_weekdays: [],
          weekly_interval: 1,
          daily_interval: 1,
          monthly_months_of_year: [],
          monthly_days_of_month: [],
          monthly_weeks_of_month: [],
          task_instance_policy: 0,
          task_repetition_interval: null,
          task_repetition_duration: null,
          stop_task_at_duration_end: false,
          random_task_delay: null,
          remove_if_not_scheduled: false,
          run_asap_after_missed: true,
          task_type: "daily",
          alert_severity: "info",
          collector_all_output: false,
          continue_on_error: true,
          task_supported_platforms: [],
        });

    const isPosix = computed(() => {
      return (
        (!!props.plat && props.plat !== "windows") ||
        localTask.task_supported_platforms?.includes("linux") ||
        localTask.task_supported_platforms?.includes("darwin")
      );
    });

    const task_supported_platforms = computed(() => {
      // if editing, keep value from api
      if (props.task) {
        return props.task.task_supported_platforms;
      }
      // default for new tasks (policy tasks only)
      if (!props.plat || !isPosix.value) {
        return ["windows"];
      } else if (props.plat === "linux") {
        return ["linux"];
      } else if (props.plat === "darwin") {
        return ["darwin"];
      }
      return [];
    });

    // set the default, have to do it this way to avoid circular dependency issue
    localTask.task_supported_platforms = task_supported_platforms.value;

    const actionType = ref("script");
    const command = ref("");
    const shell = ref("cmd");
    const custom_shell = ref("");
    const monthlyType = ref("days");
    const collector = ref(false);
    const loading = ref(false);

    // before-options check boxes that will select all options

    // if all months is selected or cleared it will either clear the monthly_months_of_year array or add all options to it.
    const allMonthsCheckbox = ref(false);
    function toggleMonths() {
      localTask.monthly_months_of_year = allMonthsCheckbox.value
        ? monthOptions.value.map((month) => month.value)
        : [];
    }

    const allMonthDaysCheckbox = ref(false);
    function toggleMonthDays() {
      localTask.monthly_days_of_month = allMonthDaysCheckbox.value
        ? dayOfMonthOptions.value.map((day) => day.value)
        : [];
    }

    const allWeekDaysCheckbox = ref(false);
    function toggleWeekDays() {
      localTask.run_time_bit_weekdays = allWeekDaysCheckbox.value
        ? dayOfWeekOptions.value.map((day) => day.value)
        : [];
    }

    // function for adding script and commands to be run from task
    function addAction() {
      if (
        actionType.value === "script" &&
        (!script.value || !defaultTimeout.value)
      ) {
        notifyError(gettext.$gettext("Script and timeout must be set"));
        return;
      } else if (
        actionType.value === "cmd" &&
        (!command.value || !defaultTimeout.value)
      ) {
        notifyError(gettext.$gettext("A command and timeout must be set"));
        return;
      }

      if (actionType.value === "script") {
        localTask.actions.push({
          type: "script",
          name: scriptName.value,
          script: script.value,
          timeout: defaultTimeout.value,
          script_args: defaultArgs.value,
          env_vars: defaultEnvVars.value,
        });
      } else if (actionType.value === "cmd") {
        let tempShell = shell.value;
        if (shell.value === "custom" && !!custom_shell.value) {
          tempShell = custom_shell.value;
        } else {
          tempShell = shell.value;
        }
        localTask.actions.push({
          type: "cmd",
          command: command.value,
          shell: tempShell,
          timeout: defaultTimeout.value,
        });
      }

      // clear fields after add
      script.value = null;
      defaultArgs.value = [];
      defaultEnvVars.value = [];
      defaultTimeout.value = 30;
      command.value = "";
    }

    function removeAction(index) {
      localTask.actions.splice(index, 1);
    }

    // runs whenever task data is saved
    function processTaskDataforDB(taskData) {
      // copy data
      let data = Object.assign({}, taskData);

      // converts fields from arrays to integers
      data.run_time_bit_weekdays =
        taskData.run_time_bit_weekdays.length > 0
          ? convertFromBitArray(taskData.run_time_bit_weekdays)
          : null;

      data.monthly_months_of_year =
        taskData.monthly_months_of_year.length > 0
          ? convertFromBitArray(taskData.monthly_months_of_year)
          : null;

      data.monthly_days_of_month =
        taskData.monthly_days_of_month.length > 0
          ? convertFromBitArray(taskData.monthly_days_of_month)
          : null;

      data.monthly_weeks_of_month =
        taskData.monthly_weeks_of_month.length > 0
          ? convertFromBitArray(taskData.monthly_weeks_of_month)
          : null;

      // Add Z back to run_time_date and expires_date
      data.run_time_date += "Z";

      if (taskData.expire_date) data.expire_date += "Z";

      // change task type if monthly day of week is set
      if (localTask.task_type === "monthly" && monthlyType.value === "weeks") {
        data.task_type = "monthlydow";
      }

      return data;
    }

    // runs when editing a task to convert values to be compatible with quasar
    function processTaskDatafromDB() {
      // converts fields from integers to arrays
      localTask.run_time_bit_weekdays = localTask.run_time_bit_weekdays
        ? convertToBitArray(localTask.run_time_bit_weekdays)
        : [];
      localTask.monthly_months_of_year = localTask.monthly_months_of_year
        ? convertToBitArray(localTask.monthly_months_of_year)
        : [];
      localTask.monthly_days_of_month = localTask.monthly_days_of_month
        ? convertToBitArray(localTask.monthly_days_of_month)
        : [];
      localTask.monthly_weeks_of_month = localTask.monthly_weeks_of_month
        ? convertToBitArray(localTask.monthly_weeks_of_month)
        : [];

      // remove milliseconds and Z to work with native date input
      localTask.run_time_date = formatDateInputField(
        localTask.run_time_date,
        true,
      );

      if (localTask.expire_date)
        localTask.expire_date = formatDateInputField(
          localTask.expire_date,
          true,
        );

      // set task type if monthlydow is being used
      if (localTask.task_type === "monthlydow") {
        localTask.task_type = "monthly";
        monthlyType.value = "weeks";
      }
    }

    async function submit() {
      loading.value = true;
      try {
        const result = props.task
          ? await updateTask(localTask.id, processTaskDataforDB(localTask))
          : await saveTask(processTaskDataforDB(localTask));
        notifySuccess(result);
        onDialogOK();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    // format task data to match what quasar expects if editing
    if (props.task) processTaskDatafromDB();

    watch(
      () => localTask.task_type,
      () => {
        localTask.assigned_check = null;
        localTask.run_time_bit_weekdays = [];
        localTask.remove_if_not_scheduled = false;
        localTask.task_repetition_interval = null;
        localTask.task_repetition_duration = null;
        localTask.stop_task_at_duration_end = false;
        localTask.random_task_delay = null;
        localTask.weekly_interval = 1;
        localTask.daily_interval = 1;
        localTask.monthly_months_of_year = [];
        localTask.monthly_days_of_month = [];
        localTask.monthly_weeks_of_month = [];
        localTask.task_instance_policy = 0;
        localTask.expire_date = null;
      },
    );

    // check the collector box when editing task and custom field is set
    if (props.task && props.task.custom_field) collector.value = true;

    // stepper logic
    const step = ref(1);
    const isValidStep1 = ref(true);
    const isValidStep2 = ref(true);
    const isValidStep3 = ref(true);

    function validateStep(form, stepper) {
      if (step.value === 1 && localTask.task_supported_platforms.length === 0) {
        notifyError(
          gettext.$gettext("There must be at least one supported platform"),
        );
        return;
      }

      if (step.value === 2) {
        if (localTask.actions.length > 0) {
          isValidStep2.value = true;
          stepper.next();
          return;
        } else {
          notifyError(gettext.$gettext("There must be at least one action"));
        }

        // steps 1 or 3
      } else {
        form.validate().then((result) => {
          if (step.value === 1) {
            isValidStep1.value = result;
            if (result) stepper.next();
          } else if (step.value === 3) {
            isValidStep3.value = result;
            if (result) submit();
          }
        });
      }
    }

    onMounted(() => {
      getCheckOptions(props.parent);
    });

    return {
      // reactive data
      state: localTask,
      script,
      defaultTimeout,
      defaultArgs,
      defaultEnvVars,
      actionType,
      command,
      shell,
      custom_shell,
      allMonthsCheckbox,
      allMonthDaysCheckbox,
      allWeekDaysCheckbox,
      collector,
      monthlyType,
      loading,
      step,
      isValidStep1,
      isValidStep2,
      isValidStep3,
      scriptOptions,
      checkOptions,
      customFieldOptions,
      isPosix,
      isAgentTask,

      // non-reactive data
      validateTimePeriod,
      convertPeriodToSeconds,
      severityOptions,
      dayOfWeekOptions,
      dayOfMonthOptions,
      weekOptions,
      monthOptions,
      taskTypeOptions,
      taskInstancePolicyOptions,
      plat_options,

      // methods
      submit,
      validateStep,
      addAction,
      removeAction,
      toggleMonths,
      toggleMonthDays,
      toggleWeekDays,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
});
</script>

<style scoped>
.ghost {
  opacity: 0.5;
}
</style>
