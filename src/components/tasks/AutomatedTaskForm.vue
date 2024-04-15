<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 65vw; min-width: 65vw">
      <q-bar>
        {{
          task
            ? `Editing Automated Task: ${localTask.name}`
            : "Adding Automated Task"
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section v-if="scriptOptions.length === 0">
        <p>You need to upload a script first</p>
        <p>Settings -> Script Manager</p>
      </q-card-section>
      <q-stepper v-else v-model="step" ref="stepper" color="primary" animated>
        <q-step
          :name="1"
          title="Select Task"
          :done="step > 1"
          :error="!isValidStep1"
        >
          <q-form @submit.prevent ref="taskGeneralForm">
            <q-card-section>
              <q-input
                :rules="[(val) => !!val || '*Required']"
                filled
                dense
                v-model="localTask.name"
                label="Descriptive name of task"
                hide-bottom-space
              />
            </q-card-section>
            <q-card-section v-if="type !== 'server'">
              <q-checkbox
                dense
                label="Collector Task"
                v-model="collector"
                class="q-pb-sm"
                @update:model-value="
                  localTask.custom_field = undefined;
                  localTask.collector_all_output = false;
                "
              />
              <tactical-dropdown
                v-if="collector"
                :rules="[(val: number) => !!val || '*Required']"
                v-model="localTask.custom_field"
                :options="customFieldOptions"
                label="Custom Field to update"
                filled
                mapOptions
                :hint="
                  localTask.collector_all_output
                    ? 'All script output will be saved to custom field selected'
                    : 'The last line of script output will be saved to custom field selected'
                "
                filterable
              />
              <q-checkbox
                v-if="collector"
                dense
                label="Save all output"
                v-model="localTask.collector_all_output"
                class="q-py-sm"
              />
            </q-card-section>
            <q-card-section>
              <tactical-dropdown
                v-model="localTask.alert_severity"
                :options="severityOptions"
                label="Alert Severity"
                filled
                mapOptions
                :rules="[(val: string) => !!val || '*Required']"
              />
            </q-card-section>
          </q-form>
        </q-step>

        <q-step
          :name="2"
          title="Configure Actions"
          :done="step > 2"
          :error="!isValidStep2"
        >
          <div class="scroll" style="max-height: 60vh">
            <q-form @submit.prevent="addAction">
              <div class="row q-pa-sm q-gutter-x-xs items-center">
                <div class="text-subtitle2 col-12">Action Type:</div>
                <q-option-group
                  class="col-12"
                  inline
                  v-model="actionType"
                  :options="[
                    { label: 'Script', value: 'script' },
                    { label: 'Command', value: 'cmd' },
                  ]"
                />

                <tactical-dropdown
                  v-if="actionType === 'script'"
                  class="col-3"
                  label="Select script"
                  v-model="script"
                  :options="filterByPlatformOptions"
                  filled
                  mapOptions
                  filterable
                />

                <q-select
                  v-if="actionType === 'script'"
                  class="col-3"
                  dense
                  label="Script Arguments (press Enter after typing each argument)"
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
                  :label="envVarsLabel"
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
                  label="Timeout (seconds)"
                />

                <q-input
                  v-if="actionType === 'cmd'"
                  label="Command"
                  v-model="command"
                  dense
                  filled
                  class="col-7"
                />
                <q-input
                  v-if="actionType === 'cmd'"
                  class="col-2"
                  filled
                  dense
                  v-model.number="defaultTimeout"
                  type="number"
                  label="Timeout (seconds)"
                />
                <q-option-group
                  v-if="actionType === 'cmd' && type !== 'server'"
                  class="col-2 q-pl-sm"
                  inline
                  v-model="shell"
                  :options="[
                    { label: 'Batch', value: 'cmd' },
                    { label: 'Powershell', value: 'powershell' },
                  ]"
                />
                <q-btn
                  class="col-1"
                  type="submit"
                  style="width: 50px"
                  flat
                  dense
                  icon="add"
                  color="primary"
                />
              </div>
            </q-form>
            <div class="text-subtitle2 q-pa-sm">
              Actions:
              <q-checkbox
                class="float-right"
                label="Continue on Errors"
                v-model="localTask.continue_on_error"
                dense
              >
                <q-tooltip>Continue task if an action fails</q-tooltip>
              </q-checkbox>
            </div>
            <div class="q-pt-sm" style="height: 150px">
              <draggable
                class="q-list"
                handle=".handle"
                ghost-class="ghost"
                v-model="localTask.actions"
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
                        Arguments: {{ element.script_args }}
                      </q-item-label>
                      <q-item-label caption>
                        Env Vars: {{ element.env_vars }}
                      </q-item-label>
                      <q-item-label caption>
                        Timeout: {{ element.timeout }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section v-else>
                      <q-item-label>
                        <q-icon size="sm" name="terminal" color="primary" />
                        &nbsp;
                        <q-icon
                          v-if="type !== 'server'"
                          size="sm"
                          :name="
                            element.shell === 'cmd'
                              ? 'mdi-microsoft-windows'
                              : 'mdi-powershell'
                          "
                          color="primary"
                        />
                        <q-icon
                          v-else
                          size="sm"
                          name="mdi-bash"
                          color="primary"
                        />
                        {{ element.command }}
                      </q-item-label>
                      <q-item-label caption>
                        Timeout: {{ element.timeout }}
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

        <q-step :name="3" title="Choose Schedule" :error="!isValidStep3">
          <div class="scroll" style="height: 60vh; max-height: 60vh">
            <q-form @submit.prevent ref="taskDetailForm">
              <!-- form for server and linux agents -->
              <q-card-section v-if="type === 'server'">
                <q-input
                  v-model="localTask.crontab_schedule"
                  label="Crontab Schedule"
                  dense
                  inline
                  hint="The schedule portion of a crontab entry. i.e. * * * 1 *. Leave blank for manual"
                />
              </q-card-section>
              <!-- form for policy and windows agents-->
              <div v-else>
                <q-card-section>
                  <q-option-group
                    v-model="localTask.task_type"
                    label="Task run type"
                    :options="agentTaskTypeOptions"
                    dense
                    inline
                    @update:model-value="taskDetailForm?.resetValidation()"
                  />
                </q-card-section>

                <!-- task start/expire time fields -->
                <q-card-section
                  v-if="
                    ['runonce', 'daily', 'weekly', 'monthly'].includes(
                      localTask.task_type,
                    )
                  "
                  class="row"
                >
                  <!-- start time input -->
                  <q-input
                    class="col-6 q-pa-sm"
                    type="datetime-local"
                    dense
                    label="Start time"
                    stack-label
                    filled
                    v-model="localTask.run_time_date"
                    hint="Agent timezone will be used"
                    :rules="[(val) => !!val || '*Required']"
                  />

                  <!-- expires on input -->
                  <q-input
                    class="col-6 q-pa-sm"
                    type="datetime-local"
                    dense
                    stack-label
                    label="Expires on"
                    filled
                    v-model="localTask.expire_date"
                    hint="Agent timezone will be used"
                  />
                </q-card-section>

                <q-card-section
                  v-if="
                    localTask.task_type === 'onboarding' ||
                    localTask.task_type === 'runonce'
                  "
                  class="row"
                >
                  <span v-if="localTask.task_type === 'onboarding'"
                    >This task will run as soon as it's created on the
                    agent.</span
                  >
                  <span v-else-if="localTask.task_type === 'runonce'"
                    >Start Time must be in the future for run once tasks.</span
                  >
                </q-card-section>

                <!-- daily options -->
                <q-card-section
                  v-if="localTask.task_type === 'daily'"
                  class="row"
                >
                  <!-- daily interval -->
                  <q-input
                    :rules="[
                      (val) => !!val || '*Required',
                      (val) =>
                        (val > 0 && val < 256) ||
                        'Daily interval must be greater than 0 and less than 3',
                    ]"
                    dense
                    type="number"
                    label="Run every"
                    v-model.number="localTask.daily_interval"
                    filled
                    class="col-6 q-pa-sm"
                  >
                    <template v-slot:append>
                      <span class="text-subtitle2">days</span>
                    </template>
                  </q-input>
                  <div class="col-6 q-pa-sm"></div>
                </q-card-section>

                <!-- weekly options -->
                <q-card-section
                  v-if="localTask.task_type === 'weekly'"
                  class="row"
                >
                  <!-- weekly interval -->
                  <q-input
                    :rules="[
                      (val) => !!val || '*Required',
                      (val) =>
                        (val > 0 && val < 53) ||
                        'Weekly interval must be greater than 0 and less than 3',
                    ]"
                    class="col-6 q-pa-sm"
                    dense
                    label="Run every"
                    v-model="localTask.weekly_interval"
                    filled
                  >
                    <template v-slot:append>
                      <span class="text-subtitle2">weeks</span>
                    </template>
                  </q-input>

                  <div class="col-6 q-pa-sm"></div>

                  <div class="col-12 q-pa-sm">
                    <!-- day of week input -->
                    Run on Days:
                    <q-option-group
                      :rules="[
                        (val: number[]) => val.length > 0 || '*Required',
                      ]"
                      inline
                      dense
                      :options="dayOfWeekOptions"
                      type="checkbox"
                      v-model="localTask.run_time_bit_weekdays"
                    />
                  </div>
                </q-card-section>

                <!-- monthly options -->
                <q-card-section
                  v-if="localTask.task_type === 'monthly'"
                  class="row"
                >
                  <!-- type of monthly schedule -->
                  <q-option-group
                    class="col-12 q-pa-sm"
                    v-model="monthlyType"
                    inline
                    :options="[
                      { label: 'On Days', value: 'days' },
                      { label: 'On Weeks', value: 'weeks' },
                    ]"
                  />

                  <!-- month select input -->
                  <q-select
                    :rules="[(val) => val.length > 0 || '*Required']"
                    class="col-4 q-pa-sm"
                    filled
                    dense
                    options-dense
                    v-model="localTask.monthly_months_of_year"
                    :options="monthOptions"
                    label="Run on Months"
                    multiple
                    emit-value
                    map-options
                  >
                    <template v-slot:before-options>
                      <q-item>
                        <q-item-section>
                          <q-item-label>All months</q-item-label>
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
                          <q-item-label v-html="opt.label" />
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
                    :rules="[(val) => val.length > 0 || '*Required']"
                    class="col-4 q-pa-sm"
                    filled
                    dense
                    options-dense
                    v-model="localTask.monthly_days_of_month"
                    :options="dayOfMonthOptions"
                    label="Run on Days"
                    multiple
                    emit-value
                    map-options
                  >
                    <template v-slot:before-options>
                      <q-item>
                        <q-item-section>
                          <q-item-label>All days</q-item-label>
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
                          <q-item-label v-html="opt.label" />
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
                    :rules="[(val) => val.length > 0 || '*Required']"
                    class="col-4 q-pa-sm"
                    filled
                    dense
                    options-dense
                    v-model="localTask.monthly_weeks_of_month"
                    :options="weekOptions"
                    label="Run on weeks"
                    multiple
                    emit-value
                    map-options
                  >
                    <template
                      v-slot:option="{ itemProps, opt, selected, toggleOption }"
                    >
                      <q-item v-bind="itemProps">
                        <q-item-section>
                          <q-item-label v-html="opt.label" />
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
                    :rules="[(val) => val.length > 0 || '*Required']"
                    class="col-4 q-pa-sm"
                    filled
                    dense
                    options-dense
                    v-model="localTask.run_time_bit_weekdays"
                    :options="dayOfWeekOptions"
                    label="Run on days"
                    multiple
                    emit-value
                    map-options
                  >
                    <template v-slot:before-options>
                      <q-item>
                        <q-item-section>
                          <q-item-label>All days</q-item-label>
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
                          <q-item-label v-html="opt.label" />
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
                    localTask.task_type !== 'checkfailure' &&
                    localTask.task_type !== 'manual' &&
                    localTask.task_type !== 'onboarding'
                  "
                  class="row"
                >
                  <div class="col-12 text-h6">Advanced Settings</div>
                  <q-input
                    class="col-6 q-pa-sm"
                    dense
                    label="Repeat task every"
                    filled
                    v-model="localTask.task_repetition_interval"
                    placeholder="e.g. 30m (30 minutes) or 1h (1 hour)"
                    lazy-rules
                    :rules="[
                      (val) =>
                        !val ||
                        validateTimePeriod(val) ||
                        'Valid values are 1-3 digits followed by (D|d|H|h|M|m|S|s)',
                    ]"
                  />

                  <q-input
                    :disable="!localTask.task_repetition_interval"
                    class="col-6 q-pa-sm"
                    dense
                    label="Task repeat duration"
                    filled
                    v-model="localTask.task_repetition_duration"
                    placeholder="e.g. 6h (6 hours) or 1d (1 day)"
                    lazy-rules
                    :rules="[
                      (val: string) =>
                        validateTimePeriod(val) ||
                        'Valid values are 1-3 digits followed by (D|d|H|h|M|m|S|s)',
                      (val: string) =>
                        localTask.task_repetition_interval ? !!val : true, // field is required if repetition interval is set
                      (val: string) =>
                        convertPeriodToSeconds(val) >=
                          convertPeriodToSeconds(
                            localTask?.task_repetition_interval,
                          ) ||
                        'Repetition duration must be greater than repetition interval',
                    ]"
                  />

                  <q-checkbox
                    :disable="!localTask.task_repetition_interval"
                    class="col-6 q-pa-sm"
                    dense
                    v-model="localTask.stop_task_at_duration_end"
                    label="Stop all tasks at the end of duration"
                  />
                  <div class="col-6"></div>

                  <q-input
                    class="col-6 q-pa-sm"
                    dense
                    label="Random task delay"
                    filled
                    v-model="localTask.random_task_delay"
                    placeholder="e.g. 2m (2 minutes) or 1h (1 hour)"
                    lazy-rules
                    :rules="[
                      (val) =>
                        !val ||
                        validateTimePeriod(val) ||
                        'Valid values are 1-3 digits followed by (D|d|H|h|M|m|S|s)',
                    ]"
                  />
                  <div class="col-6"></div>
                  <q-checkbox
                    :disable="!localTask.expire_date"
                    class="col-6 q-pa-sm"
                    dense
                    v-model="localTask.remove_if_not_scheduled"
                    label="Delete task if not scheduled for 30 days"
                  >
                    <q-tooltip>Must set an expire date</q-tooltip>
                  </q-checkbox>
                  <div class="col-6"></div>
                  <q-checkbox
                    :disable="localTask.task_type === 'runonce'"
                    class="col-6 q-pa-sm"
                    dense
                    v-model="localTask.run_asap_after_missed"
                    label="Run task ASAP after a scheduled start is missed"
                  />

                  <div class="col-6"></div>

                  <tactical-dropdown
                    class="col-6 q-pa-sm"
                    label="Task instance policy"
                    :options="taskInstancePolicyOptions"
                    v-model="localTask.task_instance_policy"
                    filled
                    mapOptions
                  />
                </q-card-section>

                <!-- check failure options -->
                <q-card-section
                  v-else-if="localTask.task_type === 'checkfailure'"
                  class="row"
                >
                  <tactical-dropdown
                    class="col-6 q-pa-sm"
                    :rules="[(val: number) => !!val || '*Required']"
                    v-model="localTask.assigned_check"
                    filled
                    :options="checkOptions"
                    label="Select Check"
                    mapOptions
                    filterable
                  />
                </q-card-section>
              </div>
            </q-form>
          </div>
        </q-step>
      </q-stepper>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          v-if="step > 1"
          label="Back"
          @click="stepper?.previous()"
          color="primary"
          flat
        />
        <q-btn
          v-if="step < 3"
          @click="validateStep(step === 1 ? taskGeneralForm : null, stepper)"
          color="primary"
          label="Next"
          flat
        />
        <q-btn
          v-else
          :label="task ? 'Edit Task' : 'Add Task'"
          color="primary"
          @click="validateStep(taskDetailForm, stepper)"
          :loading="loading"
          flat
          dense
          push
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, watch, onMounted, reactive } from "vue";
import { QForm, QStepper, useDialogPluginComponent } from "quasar";
import draggable from "vuedraggable";
import { saveTask, updateTask } from "@/api/tasks";
import { useScriptDropdown } from "@/composables/scripts";
import { useCheckDropdown } from "@/composables/checks";
import { useCustomFieldDropdown } from "@/composables/core";
import { notifySuccess, notifyError } from "@/utils/notify";
import { validateTimePeriod } from "@/utils/validation";
import { envVarsLabel } from "@/constants/constants";
import {
  convertPeriodToSeconds,
  convertToBitArray,
  convertFromBitArray,
  formatDateInputField,
  copyObjectWithoutKeys,
} from "@/utils/format";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// type
import type {
  AutomatedTask,
  AutomatedTaskAction,
  AutomatedTaskForDB,
  AutomatedTaskCommandActionShellType,
} from "@/types/tasks";
import type { AgentPlatformType } from "@/types/agents";

// static data
const severityOptions = [
  { label: "Informational", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Error", value: "error" },
];

const agentTaskTypeOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Run Once", value: "runonce" },
  { label: "On check failure", value: "checkfailure" },
  { label: "Onboarding", value: "onboarding" },
  { label: "Manual", value: "manual" },
];

const dayOfWeekOptions = [
  { label: "Monday", value: 0x2 },
  { label: "Tuesday", value: 0x4 },
  { label: "Wednesday", value: 0x8 },
  { label: "Thursday", value: 0x10 },
  { label: "Friday", value: 0x20 },
  { label: "Saturday", value: 0x40 },
  { label: "Sunday", value: 0x1 },
];

const dayOfMonthOptions = (() => {
  let result = [];
  let day = 0x1;
  for (let i = 1; i <= 31; i++) {
    result.push({ label: `${i}`, value: day });
    day = day << 1;
  }
  result.push({ label: "Last Day", value: 0x80000000 });
  return result;
})();

const monthOptions = [
  { label: "January", value: 0x1 },
  { label: "February", value: 0x2 },
  { label: "March", value: 0x4 },
  { label: "April", value: 0x8 },
  { label: "May", value: 0x10 },
  { label: "June", value: 0x20 },
  { label: "July", value: 0x40 },
  { label: "August", value: 0x80 },
  { label: "September", value: 0x100 },
  { label: "October", value: 0x200 },
  { label: "November", value: 0x400 },
  { label: "December", value: 0x800 },
];

const weekOptions = [
  { label: "First Week", value: 0x1 },
  { label: "Second Week", value: 0x2 },
  { label: "Third Week", value: 0x4 },
  { label: "Fourth Week", value: 0x8 },
  { label: "Last Week", value: 0x10 },
];

const taskInstancePolicyOptions = [
  { label: "Run in Parallel", value: 0 },
  { label: "Queue Task", value: 1 },
  { label: "Ignore", value: 2 },
  { label: "Stop Existing", value: 3 },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  parent?: number | string; // parent policy or agent for task
  type: "agent" | "policy" | "server";
  task?: AutomatedTaskForDB; // only for editing
  plat?: AgentPlatformType; // filters scripts options base on plat
}>();

// setup quasar dialog
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// setup dropdowns
const {
  script,
  scriptOptions,
  plat,
  filterByPlatformOptions,
  defaultTimeout,
  defaultArgs,
  defaultEnvVars,
  scriptName,
} = useScriptDropdown({
  onMount: true,
});

// set plat
plat.value =
  props.type === "policy"
    ? undefined // get all scripts
    : props.type === "server"
      ? "linux" // get only linux scripts for server
      : props.plat; // filter scripts based on supported plat

// set defaultTimeout to 30
defaultTimeout.value = 30;

const { checkOptions, getCheckOptions } = useCheckDropdown();
const { customFieldOptions } = useCustomFieldDropdown({ onMount: true });

// add task logic
const localTask: AutomatedTask = props.task
  ? reactive(Object.assign({}, processTaskDatafromDB(props.task)))
  : (reactive({
      id: 0,
      policy: props.type === "policy" ? props.parent : undefined,
      agent: props.type === "agent" ? props.parent : undefined,
      server_task: props.type === "server",
      crontab_schedule: "",
      actions: [] as AutomatedTaskAction[],
      assigned_check: undefined,
      custom_field: undefined,
      name: "",
      expire_date: undefined,
      run_time_date: formatDateInputField(Date.now()),
      run_time_bit_weekdays: [] as number[],
      weekly_interval: 1,
      daily_interval: 1,
      monthly_months_of_year: [] as number[],
      monthly_days_of_month: [] as number[],
      monthly_weeks_of_month: [] as number[],
      task_instance_policy: 0,
      task_repetition_interval: undefined,
      task_repetition_duration: undefined,
      stop_task_at_duration_end: false,
      random_task_delay: undefined,
      remove_if_not_scheduled: false,
      run_asap_after_missed: true,
      task_type: "daily",
      alert_severity: "info",
      collector_all_output: false,
      continue_on_error: true,
    }) as AutomatedTask);

const actionType = ref("script");
const command = ref("");
const shell = ref<AutomatedTaskCommandActionShellType>(
  props.type !== "server" ? "cmd" : "bash",
);
const monthlyType = ref("days");
const collector = ref(false);
const loading = ref(false);

// before-options check boxes that will select all options

// if all months is selected or cleared it will either clear the monthly_months_of_year array or add all options to it.
const allMonthsCheckbox = ref(false);
function toggleMonths() {
  localTask.monthly_months_of_year = allMonthsCheckbox.value
    ? monthOptions.map((month) => month.value)
    : [];
}

const allMonthDaysCheckbox = ref(false);
function toggleMonthDays() {
  localTask.monthly_days_of_month = allMonthDaysCheckbox.value
    ? dayOfMonthOptions.map((day) => day.value)
    : [];
}

const allWeekDaysCheckbox = ref(false);
function toggleWeekDays() {
  localTask.run_time_bit_weekdays = allWeekDaysCheckbox.value
    ? dayOfWeekOptions.map((day) => day.value)
    : [];
}

// function for adding script and commands to be run from task
function addAction() {
  if (
    actionType.value === "script" &&
    (!script.value || !defaultTimeout.value)
  ) {
    notifyError("Script and timeout must be set");
    return;
  } else if (
    actionType.value === "cmd" &&
    (!command.value || !defaultTimeout.value)
  ) {
    notifyError("A command and timeout must be set");
    return;
  }

  if (actionType.value === "script") {
    if (script.value)
      localTask.actions.push({
        type: "script",
        name: scriptName.value,
        script: script.value,
        timeout: defaultTimeout.value,
        script_args: defaultArgs.value,
        env_vars: defaultEnvVars.value,
      });
  } else if (actionType.value === "cmd") {
    localTask.actions.push({
      type: "cmd",
      command: command.value,
      shell: shell.value,
      timeout: defaultTimeout.value,
    });
  }

  // clear fields after add
  script.value = undefined;
  defaultArgs.value = [];
  defaultEnvVars.value = [];
  defaultTimeout.value = 30;
  command.value = "";
}

function removeAction(index: number) {
  localTask.actions.splice(index, 1);
}

// runs whenever task data is saved
function processTaskDataforDB(taskData: AutomatedTask): AutomatedTaskForDB {
  // converts fields from arrays to integers
  const run_time_bit_weekdays =
    taskData.run_time_bit_weekdays.length > 0
      ? convertFromBitArray(taskData.run_time_bit_weekdays)
      : undefined;

  const monthly_months_of_year =
    taskData.monthly_months_of_year.length > 0
      ? convertFromBitArray(taskData.monthly_months_of_year)
      : undefined;

  const monthly_days_of_month =
    taskData.monthly_days_of_month.length > 0
      ? convertFromBitArray(taskData.monthly_days_of_month)
      : undefined;

  const monthly_weeks_of_month =
    taskData.monthly_weeks_of_month.length > 0
      ? convertFromBitArray(taskData.monthly_weeks_of_month)
      : undefined;

  let data = {
    ...taskData,
    ...{
      run_time_bit_weekdays,
      monthly_months_of_year,
      monthly_days_of_month,
      monthly_weeks_of_month,
    },
  } as AutomatedTaskForDB;
  // Add Z back to run_time_date and expires_date
  if (!taskData.server_task) data.run_time_date += "Z";

  if (taskData.expire_date) data.expire_date += "Z";

  // change task type if monthly day of week is set
  if (taskData.task_type === "monthly" && monthlyType.value === "weeks") {
    data.task_type = "monthlydow";
  }

  return data;
}

// runs when editing a task to convert values to be compatible with quasar
function processTaskDatafromDB(task: AutomatedTaskForDB) {
  const convertedTask = copyObjectWithoutKeys(task, [
    "run_time_bit_weekdays",
    "monthly_months_of_year",
    "monthly_days_of_month",
    "monthly_weeks_of_month",
  ]) as AutomatedTask;

  // converts fields from integers to arrays
  convertedTask.run_time_bit_weekdays = task.run_time_bit_weekdays
    ? convertToBitArray(task.run_time_bit_weekdays)
    : [];
  convertedTask.monthly_months_of_year = task.monthly_months_of_year
    ? convertToBitArray(task.monthly_months_of_year)
    : [];
  convertedTask.monthly_days_of_month = task.monthly_days_of_month
    ? convertToBitArray(task.monthly_days_of_month)
    : [];
  convertedTask.monthly_weeks_of_month = task.monthly_weeks_of_month
    ? convertToBitArray(task.monthly_weeks_of_month)
    : [];

  // remove milliseconds and Z to work with native date input
  if (!task.server_task)
    convertedTask.run_time_date = formatDateInputField(
      convertedTask.run_time_date,
      true,
    );

  if (convertedTask.expire_date)
    convertedTask.expire_date = formatDateInputField(
      convertedTask.expire_date,
      true,
    );

  // set task type if monthlydow is being used
  if (task.task_type === "monthlydow") {
    convertedTask.task_type = "monthly";
    monthlyType.value = "weeks";
  }

  return convertedTask;
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

watch(
  () => localTask.task_type,
  () => {
    localTask.assigned_check = undefined;
    localTask.run_time_bit_weekdays = [];
    localTask.remove_if_not_scheduled = false;
    localTask.task_repetition_interval = undefined;
    localTask.task_repetition_duration = undefined;
    localTask.stop_task_at_duration_end = false;
    localTask.random_task_delay = undefined;
    localTask.weekly_interval = 1;
    localTask.daily_interval = 1;
    localTask.monthly_months_of_year = [];
    localTask.monthly_days_of_month = [];
    localTask.monthly_weeks_of_month = [];
    localTask.task_instance_policy = 0;
    localTask.expire_date = undefined;
  },
);

// check the collector box when editing task and custom field is set
if (props.task && props.task.custom_field) collector.value = true;

// stepper logic
const taskGeneralForm = ref<InstanceType<typeof QForm> | null>(null);
const taskDetailForm = ref<InstanceType<typeof QForm> | null>(null);
const stepper = ref<InstanceType<typeof QStepper> | null>(null);
const step = ref(1);
const isValidStep1 = ref(true);
const isValidStep2 = ref(true);
const isValidStep3 = ref(true);

function validateStep(form: QForm | null, stepper: QStepper | null) {
  if (!stepper) return;

  if (step.value === 2) {
    if (localTask.actions.length > 0) {
      isValidStep2.value = true;
      stepper.next();
      return;
    } else {
      notifyError("There must be at least one action");
    }

    // steps 1 or 3
  } else {
    form?.validate().then((result: boolean) => {
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
  if (props.type !== "server") getCheckOptions({ [props.type]: props.parent });
});
</script>

<style scoped>
.ghost {
  opacity: 0.5;
}
</style>
