<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 65vw; min-width: 65vw">
      <q-bar>
        {{
          task
            ? $t("tasks.automatedTaskForm.editingAutomatedTask", {
                name: task.name,
              })
            : $t("tasks.automatedTaskForm.addingAutomatedTask")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("tasks.shared.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section v-if="scriptOptions.length === 0">
        <p>{{ $t("tasks.automatedTaskForm.uploadScriptFirst") }}</p>
        <p>{{ $t("tasks.automatedTaskForm.settingsScriptManager") }}</p>
      </q-card-section>
      <q-stepper v-else v-model="step" ref="stepper" color="primary" animated>
        <q-step
          :name="1"
          :title="$t('tasks.automatedTaskForm.selectTask')"
          :done="step > 1"
          :error="!isValidStep1"
        >
          <q-form @submit.prevent ref="taskGeneralForm">
            <q-card-section>
              <q-input
                :rules="[(val) => !!val || $t('tasks.shared.required')]"
                filled
                dense
                v-model="state.name"
                :label="$t('tasks.automatedTaskForm.descriptiveTaskName')"
                hide-bottom-space
              />
            </q-card-section>
            <q-card-section v-show="!isAgentTask">
              {{ $t("tasks.automatedTaskForm.supportedPlatforms") }}
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
                :label="$t('tasks.automatedTaskForm.collectorTask')"
                v-model="collector"
                class="q-pb-sm"
                @update:model-value="
                  state.custom_field = null;
                  state.collector_all_output = false;
                "
              />
              <tactical-dropdown
                v-if="collector"
                :rules="[(val) => !!val || $t('tasks.shared.required')]"
                v-model="state.custom_field"
                :options="customFieldOptions"
                :label="$t('tasks.automatedTaskForm.customFieldToUpdate')"
                filled
                mapOptions
                :hint="
                  state.collector_all_output
                    ? $t('tasks.automatedTaskForm.collectorAllOutputHint')
                    : $t('tasks.automatedTaskForm.collectorLastLineHint')
                "
                filterable
              />
              <q-checkbox
                v-if="collector"
                dense
                :label="$t('tasks.automatedTaskForm.saveAllOutput')"
                v-model="state.collector_all_output"
                class="q-py-sm"
              />
            </q-card-section>
            <q-card-section>
              <tactical-dropdown
                v-model="state.alert_severity"
                :options="severityOptions"
                :label="$t('tasks.automatedTaskForm.alertSeverity')"
                filled
                mapOptions
                :rules="[(val) => !!val || $t('tasks.shared.required')]"
              />
            </q-card-section>
          </q-form>
        </q-step>

        <q-step
          :name="2"
          :title="$t('tasks.automatedTaskForm.configureActions')"
          :done="step > 2"
          :error="!isValidStep2"
        >
          <div class="scroll" style="max-height: 60vh">
            <q-form @submit.prevent="addAction">
              <div class="row q-pa-sm q-gutter-x-xs items-center">
                <div class="text-subtitle2 col-12">
                  {{ $t("tasks.automatedTaskForm.actionType") }}:
                </div>
                <q-option-group
                  class="col-12"
                  inline
                  v-model="actionType"
                  :options="[
                    {
                      label: $t('tasks.automatedTaskForm.script'),
                      value: 'script',
                    },
                    {
                      label: $t('tasks.automatedTaskForm.command'),
                      value: 'cmd',
                    },
                  ]"
                />

                <tactical-dropdown
                  v-if="actionType === 'script'"
                  class="col-3"
                  :label="$t('tasks.automatedTaskForm.selectScript')"
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
                  :label="$t('tasks.automatedTaskForm.scriptArguments')"
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
                  :label="$t('tasks.automatedTaskForm.environmentVariables')"
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
                  :label="$t('tasks.shared.timeoutSeconds')"
                />

                <q-input
                  v-if="actionType === 'cmd'"
                  :label="$t('tasks.automatedTaskForm.command')"
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
                  :label="$t('tasks.shared.timeoutSeconds')"
                />
                <q-option-group
                  v-if="actionType === 'cmd'"
                  class="col-4 q-pl-sm"
                  inline
                  v-model="shell"
                  :options="[
                    {
                      label: $t('tasks.automatedTaskForm.shellOptions.cmd'),
                      value: 'cmd',
                    },
                    {
                      label: $t(
                        'tasks.automatedTaskForm.shellOptions.powershell',
                      ),
                      value: 'powershell',
                    },
                    {
                      label: $t('tasks.automatedTaskForm.shellOptions.bash'),
                      value: '/bin/bash',
                    },
                    {
                      label: $t('tasks.automatedTaskForm.shellOptions.custom'),
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
                  :label="$t('tasks.shared.add')"
                  color="primary"
                />
              </div>
            </q-form>
            <div v-if="shell === 'custom'" class="col-5">
              <q-input
                v-model="custom_shell"
                outlined
                :label="$t('tasks.automatedTaskForm.customShell')"
                stack-label
                :placeholder="
                  $t('tasks.automatedTaskForm.customShellPlaceholder')
                "
              />
            </div>
            <div class="text-subtitle2 q-pa-sm">
              {{ $t("tasks.automatedTaskForm.actions") }}:
              <q-checkbox
                class="float-right"
                :label="$t('tasks.automatedTaskForm.continueOnErrors')"
                v-model="state.continue_on_error"
                dense
              >
                <q-tooltip>{{
                  $t("tasks.automatedTaskForm.continueOnErrorsHint")
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
                        {{ $t("tasks.automatedTaskForm.arguments") }}:
                        {{ element.script_args }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ $t("tasks.automatedTaskForm.envVars") }}:
                        {{ element.env_vars }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ $t("tasks.shared.timeout") }}: {{ element.timeout }}
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
                        {{ $t("tasks.shared.timeout") }}: {{ element.timeout }}
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
          :title="$t('tasks.automatedTaskForm.chooseSchedule')"
          :error="!isValidStep3"
        >
          <div class="scroll" style="height: 60vh; max-height: 60vh">
            <q-form @submit.prevent ref="taskDetailForm">
              <q-card-section>
                <q-option-group
                  v-model="state.task_type"
                  :label="$t('tasks.automatedTaskForm.taskRunType')"
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
                      ? $t('tasks.automatedTaskForm.runAt')
                      : $t('tasks.automatedTaskForm.startTime')
                  "
                  stack-label
                  filled
                  v-model="state.run_time_date"
                  :hint="
                    isPosix && state.task_type !== 'runonce'
                      ? $t('tasks.automatedTaskForm.agentTimezonePosixHint')
                      : $t('tasks.automatedTaskForm.agentTimezoneUsed')
                  "
                  :rules="[(val) => !!val || $t('tasks.shared.required')]"
                />

                <!-- expires on input -->
                <q-input
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  type="datetime-local"
                  dense
                  stack-label
                  :label="$t('tasks.automatedTaskForm.expiresOn')"
                  filled
                  v-model="state.expire_date"
                  :hint="$t('tasks.automatedTaskForm.agentTimezoneUsed')"
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
                  $t("tasks.automatedTaskForm.onboardingInfo")
                }}</span>
                <span v-else-if="state.task_type === 'runonce'">{{
                  $t("tasks.automatedTaskForm.runOnceFutureInfo")
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
                    (val) => !!val || $t('tasks.shared.required'),
                    (val) =>
                      (val > 0 && val < 256) ||
                      $t('tasks.automatedTaskForm.dailyIntervalError'),
                  ]"
                  dense
                  type="number"
                  :label="$t('tasks.automatedTaskForm.runEvery')"
                  v-model.number="state.daily_interval"
                  filled
                  class="col-6 q-pa-sm"
                >
                  <template v-slot:append>
                    <span class="text-subtitle2">{{
                      $t("tasks.automatedTaskForm.daysLabel")
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
                    (val) => !!val || $t('tasks.shared.required'),
                    (val) =>
                      (val > 0 && val < 53) ||
                      $t('tasks.automatedTaskForm.weeklyIntervalError'),
                  ]"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$t('tasks.automatedTaskForm.runEvery')"
                  v-model="state.weekly_interval"
                  filled
                >
                  <template v-slot:append>
                    <span class="text-subtitle2">{{
                      $t("tasks.automatedTaskForm.weeksLabel")
                    }}</span>
                  </template>
                </q-input>

                <div class="col-6 q-pa-sm"></div>

                <div class="col-12 q-pa-sm">
                  <!-- day of week input -->
                  {{ $t("tasks.automatedTaskForm.runOnDaysTitle") }}:
                  <q-option-group
                    :rules="[
                      (val) => val.length > 0 || $t('tasks.shared.required'),
                    ]"
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
                      label: $t('tasks.automatedTaskForm.onDays'),
                      value: 'days',
                    },
                    {
                      label: $t('tasks.automatedTaskForm.onWeeks'),
                      value: 'weeks',
                    },
                  ]"
                />

                <!-- month select input -->
                <q-select
                  :rules="[
                    (val) => val.length > 0 || $t('tasks.shared.required'),
                  ]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.monthly_months_of_year"
                  :options="monthOptions"
                  :label="$t('tasks.automatedTaskForm.runOnMonths')"
                  multiple
                  emit-value
                  map-options
                >
                  <template v-slot:before-options>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{
                          $t("tasks.automatedTaskForm.allMonths")
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
                  :rules="[
                    (val) => val.length > 0 || $t('tasks.shared.required'),
                  ]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.monthly_days_of_month"
                  :options="dayOfMonthOptions"
                  :label="$t('tasks.automatedTaskForm.runOnDays')"
                  multiple
                  emit-value
                  map-options
                >
                  <template v-slot:before-options>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{
                          $t("tasks.automatedTaskForm.allDays")
                        }}</q-item-label>
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
                  :rules="[
                    (val) => val.length > 0 || $t('tasks.shared.required'),
                  ]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.monthly_weeks_of_month"
                  :options="weekOptions"
                  :label="$t('tasks.automatedTaskForm.runOnWeeks')"
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
                  :rules="[
                    (val) => val.length > 0 || $t('tasks.shared.required'),
                  ]"
                  class="col-4 q-pa-sm"
                  filled
                  dense
                  options-dense
                  v-model="state.run_time_bit_weekdays"
                  :options="dayOfWeekOptions"
                  :label="$t('tasks.automatedTaskForm.runOnDaysLower')"
                  multiple
                  emit-value
                  map-options
                >
                  <template v-slot:before-options>
                    <q-item>
                      <q-item-section>
                        <q-item-label>{{
                          $t("tasks.automatedTaskForm.allDays")
                        }}</q-item-label>
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
                  state.task_type !== 'checkfailure' &&
                  state.task_type !== 'manual' &&
                  state.task_type !== 'onboarding'
                "
                class="row"
              >
                <div v-if="!isPosix" class="col-12 text-h6">
                  {{
                    $t("tasks.automatedTaskForm.advancedSettingsWindowsOnly")
                  }}
                </div>
                <q-input
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$t('tasks.automatedTaskForm.repeatTaskEvery')"
                  filled
                  v-model="state.task_repetition_interval"
                  :placeholder="
                    $t('tasks.automatedTaskForm.timePlaceholderShort')
                  "
                  lazy-rules
                  :rules="[
                    (val) =>
                      !val ||
                      validateTimePeriod(val) ||
                      $t('tasks.automatedTaskForm.validValuesError'),
                  ]"
                />

                <q-input
                  v-if="!isPosix"
                  :disable="!state.task_repetition_interval"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$t('tasks.automatedTaskForm.taskRepeatDuration')"
                  filled
                  v-model="state.task_repetition_duration"
                  :placeholder="
                    $t('tasks.automatedTaskForm.timePlaceholderLong')
                  "
                  lazy-rules
                  :rules="[
                    (val) =>
                      validateTimePeriod(val) ||
                      $t('tasks.automatedTaskForm.validValuesError'),
                    (val) => (state.task_repetition_interval ? !!val : true), // field is required if repetition interval is set
                    (val) =>
                      convertPeriodToSeconds(val) >=
                        convertPeriodToSeconds(
                          state.task_repetition_interval,
                        ) ||
                      $t('tasks.automatedTaskForm.repetitionDurationError'),
                  ]"
                />

                <q-checkbox
                  v-if="!isPosix"
                  :disable="!state.task_repetition_interval"
                  class="col-6 q-pa-sm"
                  dense
                  v-model="state.stop_task_at_duration_end"
                  :label="$t('tasks.automatedTaskForm.stopTasksAtEnd')"
                />
                <div class="col-6"></div>

                <q-input
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  dense
                  :label="$t('tasks.automatedTaskForm.randomTaskDelay')"
                  filled
                  v-model="state.random_task_delay"
                  :placeholder="
                    $t('tasks.automatedTaskForm.timePlaceholderDelay')
                  "
                  lazy-rules
                  :rules="[
                    (val) =>
                      !val ||
                      validateTimePeriod(val) ||
                      $t('tasks.automatedTaskForm.validValuesError'),
                  ]"
                />
                <div class="col-6"></div>
                <q-checkbox
                  v-if="!isPosix"
                  :disable="!state.expire_date"
                  class="col-6 q-pa-sm"
                  dense
                  v-model="state.remove_if_not_scheduled"
                  :label="
                    $t('tasks.automatedTaskForm.deleteTaskIfNotScheduled')
                  "
                >
                  <q-tooltip>{{
                    $t("tasks.automatedTaskForm.mustSetExpireDate")
                  }}</q-tooltip>
                </q-checkbox>
                <div class="col-6"></div>
                <q-checkbox
                  v-if="!isPosix"
                  :disable="state.task_type === 'runonce'"
                  class="col-6 q-pa-sm"
                  dense
                  v-model="state.run_asap_after_missed"
                  :label="$t('tasks.automatedTaskForm.runTaskAsapAfterMissed')"
                />

                <div class="col-6"></div>

                <tactical-dropdown
                  v-if="!isPosix"
                  class="col-6 q-pa-sm"
                  :label="$t('tasks.automatedTaskForm.taskInstancePolicyLabel')"
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
                  :rules="[(val) => !!val || $t('tasks.shared.required')]"
                  v-model="state.assigned_check"
                  filled
                  :options="checkOptions"
                  :label="$t('tasks.automatedTaskForm.selectCheck')"
                  mapOptions
                  filterable
                />
              </q-card-section>
            </q-form>
          </div>
        </q-step>
      </q-stepper>
      <q-card-actions align="right">
        <q-btn flat :label="$t('tasks.shared.cancel')" v-close-popup />
        <q-btn
          v-if="step > 1"
          :label="$t('tasks.shared.back')"
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
          :label="$t('tasks.shared.next')"
          flat
        />
        <q-btn
          v-else
          :label="
            task ? $t('tasks.shared.editTask') : $t('tasks.shared.addTask')
          "
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
import { useI18n } from "vue-i18n";
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
const getSeverityOptions = (t) => [
  { label: t("tasks.automatedTaskForm.severity.informational"), value: "info" },
  { label: t("tasks.automatedTaskForm.severity.warning"), value: "warning" },
  { label: t("tasks.automatedTaskForm.severity.error"), value: "error" },
];

const getTaskTypeOptions = (t) => [
  { label: t("tasks.automatedTaskForm.taskTypes.daily"), value: "daily" },
  { label: t("tasks.automatedTaskForm.taskTypes.weekly"), value: "weekly" },
  { label: t("tasks.automatedTaskForm.taskTypes.monthly"), value: "monthly" },
  { label: t("tasks.automatedTaskForm.taskTypes.runOnce"), value: "runonce" },
  {
    label: t("tasks.automatedTaskForm.taskTypes.onCheckFailure"),
    value: "checkfailure",
  },
  {
    label: t("tasks.automatedTaskForm.taskTypes.onboarding"),
    value: "onboarding",
  },
  { label: t("tasks.automatedTaskForm.taskTypes.manual"), value: "manual" },
];

const getDayOfWeekOptions = (t) => [
  { label: t("tasks.automatedTaskForm.days.monday"), value: 0x2 },
  { label: t("tasks.automatedTaskForm.days.tuesday"), value: 0x4 },
  { label: t("tasks.automatedTaskForm.days.wednesday"), value: 0x8 },
  { label: t("tasks.automatedTaskForm.days.thursday"), value: 0x10 },
  { label: t("tasks.automatedTaskForm.days.friday"), value: 0x20 },
  { label: t("tasks.automatedTaskForm.days.saturday"), value: 0x40 },
  { label: t("tasks.automatedTaskForm.days.sunday"), value: 0x1 },
];

const getDayOfMonthOptions = (t) => {
  let result = [];
  let day = 0x1;
  for (let i = 1; i <= 31; i++) {
    result.push({ label: `${i}`, value: day });
    day = day << 1;
  }
  result.push({
    label: t("tasks.automatedTaskForm.lastDay"),
    value: 0x80000000,
  });
  return result;
};

const getMonthOptions = (t) => [
  { label: t("tasks.automatedTaskForm.months.january"), value: 0x1 },
  { label: t("tasks.automatedTaskForm.months.february"), value: 0x2 },
  { label: t("tasks.automatedTaskForm.months.march"), value: 0x4 },
  { label: t("tasks.automatedTaskForm.months.april"), value: 0x8 },
  { label: t("tasks.automatedTaskForm.months.may"), value: 0x10 },
  { label: t("tasks.automatedTaskForm.months.june"), value: 0x20 },
  { label: t("tasks.automatedTaskForm.months.july"), value: 0x40 },
  { label: t("tasks.automatedTaskForm.months.august"), value: 0x80 },
  { label: t("tasks.automatedTaskForm.months.september"), value: 0x100 },
  { label: t("tasks.automatedTaskForm.months.october"), value: 0x200 },
  { label: t("tasks.automatedTaskForm.months.november"), value: 0x400 },
  { label: t("tasks.automatedTaskForm.months.december"), value: 0x800 },
];

const getWeekOptions = (t) => [
  { label: t("tasks.automatedTaskForm.weeks.firstWeek"), value: 0x1 },
  { label: t("tasks.automatedTaskForm.weeks.secondWeek"), value: 0x2 },
  { label: t("tasks.automatedTaskForm.weeks.thirdWeek"), value: 0x4 },
  { label: t("tasks.automatedTaskForm.weeks.fourthWeek"), value: 0x8 },
  { label: t("tasks.automatedTaskForm.weeks.lastWeek"), value: 0x10 },
];

const getTaskInstancePolicyOptions = (t) => [
  {
    label: t("tasks.automatedTaskForm.taskInstancePolicy.runInParallel"),
    value: 0,
  },
  {
    label: t("tasks.automatedTaskForm.taskInstancePolicy.queueTask"),
    value: 1,
  },
  { label: t("tasks.automatedTaskForm.taskInstancePolicy.ignore"), value: 2 },
  {
    label: t("tasks.automatedTaskForm.taskInstancePolicy.stopExisting"),
    value: 3,
  },
];

const getPlatformOptions = (t) => [
  { label: t("tasks.automatedTaskForm.platforms.windows"), value: "windows" },
  { label: t("tasks.automatedTaskForm.platforms.linux"), value: "linux" },
  { label: t("tasks.automatedTaskForm.platforms.macos"), value: "darwin" },
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
    const { t } = useI18n();
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
    const severityOptions = getSeverityOptions(t);
    const dayOfWeekOptions = getDayOfWeekOptions(t);
    const dayOfMonthOptions = getDayOfMonthOptions(t);
    const monthOptions = getMonthOptions(t);
    const weekOptions = getWeekOptions(t);
    const taskTypeOptions = getTaskTypeOptions(t);
    const taskInstancePolicyOptions = getTaskInstancePolicyOptions(t);
    const plat_options = getPlatformOptions(t);

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
        notifyError(
          t("tasks.automatedTaskForm.errors.scriptAndTimeoutRequired"),
        );
        return;
      } else if (
        actionType.value === "cmd" &&
        (!command.value || !defaultTimeout.value)
      ) {
        notifyError(
          t("tasks.automatedTaskForm.errors.commandAndTimeoutRequired"),
        );
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
        notifyError(t("tasks.automatedTaskForm.errors.atLeastOnePlatform"));
        return;
      }

      if (step.value === 2) {
        if (localTask.actions.length > 0) {
          isValidStep2.value = true;
          stepper.next();
          return;
        } else {
          notifyError(t("tasks.automatedTaskForm.errors.atLeastOneAction"));
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
