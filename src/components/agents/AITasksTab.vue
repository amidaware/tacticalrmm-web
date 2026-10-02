<template>
  <div>
    <div v-if="mode === 'none'" class="q-pa-sm text-grey">
      Select an agent, site, or client to view AI tasks.
    </div>
    <div v-else>
      <div class="row items-center q-pa-sm">
        <div class="text-subtitle2">{{ headerText }}</div>
        <q-space />
        <!-- aggregate status chips (scope mode) -->
        <template v-if="mode === 'scope'">
          <q-chip dense square color="green" text-color="white">{{ counts.ok }} OK</q-chip>
          <q-chip dense square color="orange" text-color="white">{{ counts.warning }} Warn</q-chip>
          <q-chip dense square color="red" text-color="white">{{ counts.alert }} Alert</q-chip>
          <q-chip dense square color="grey" text-color="white">{{ counts.error }} Err</q-chip>
          <q-chip dense square color="blue-grey" text-color="white">{{ counts.never }} New</q-chip>
          <q-separator vertical spaced />
        </template>
        <q-btn
          v-if="mode === 'agent'"
          dense
          flat
          icon="add"
          label="New task"
          no-caps
          color="primary"
          @click="addTask"
        />
        <!-- WHOSE CLOCK. Times in this table are meaningless without a named zone -
             "03:00" was previously shown bare while the scheduler used UTC. Default is
             the device's own timezone (what an MSP means by "the client's time"); pick
             any zone to see when a task lands there instead. -->
        <q-select
          v-model="viewTz"
          :options="tzOptions"
          emit-value
          map-options
          use-input
          fill-input
          hide-selected
          input-debounce="0"
          dense
          outlined
          options-dense
          style="min-width: 230px"
          class="q-mr-sm"
          label="Times shown in"
          @filter="filterTz"
        >
          <template #prepend><q-icon name="schedule" size="xs" /></template>
          <q-tooltip max-width="380px">
            Every time in this table is shown in this zone. &ldquo;Device timezone&rdquo;
            uses each machine&rsquo;s own zone
            <template v-if="deviceTzLabel"> ({{ deviceTzLabel }})</template>, which is
            what a maintenance window agreed with a customer is in.
            <template v-if="tzIsInherited">
              <br /><b>Note:</b> no timezone is set on
              <template v-if="mode === 'agent'">this device</template>
              <template v-else>these devices</template>, so this is the global default
              from Global Settings &mdash; set it per device (Agent &rarr; Edit &rarr;
              Timezone) for it to mean the customer&rsquo;s own clock.
            </template>
          </q-tooltip>
        </q-select>
        <q-btn dense flat icon="refresh" @click="load" />
      </div>
      <q-separator />
      <q-input
        v-if="mode === 'scope'"
        v-model="filter"
        dense
        outlined
        debounce="200"
        placeholder="Filter by host or task"
        class="q-ma-sm"
        style="max-width: 360px"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-table
        :rows="mergedRows"
        :columns="columns"
        row-key="id"
        dense
        flat
        :pagination="{ rowsPerPage: 0, sortBy: mode === 'scope' ? 'last_status_rank' : 'name' }"
        hide-bottom
        :filter="filter"
        :style="{ height: tableHeight }"
        virtual-scroll
      >
        <template #body-cell-hostname="props">
          <q-td :props="props">
            <q-icon name="dns" size="xs" class="q-mr-xs" />{{ props.row.hostname }}
          </q-td>
        </template>
        <template #body-cell-name="props">
          <q-td :props="props">
            <template v-if="props.row._kind === 'created'">
              <q-icon name="smart_toy" size="xs" color="deep-purple" class="q-mr-xs" />
              <a class="pi-created-link" @click="viewCreated(props.row)">{{ truncate(props.row.name, 60) }}</a>
              <q-badge color="deep-purple" outline class="q-ml-xs" label="AI" />
              <q-tooltip>{{ props.row.name }}</q-tooltip>
            </template>
            <template v-else>{{ props.row.name }}</template>
          </q-td>
        </template>
        <template #body-cell-by="props">
          <q-td :props="props">
            <template v-if="props.row._kind === 'created'">Pi (AI)</template>
            <template v-else>
              {{ props.row.modified_by || props.row.created_by || "—" }}
              <q-tooltip v-if="props.row.created_by || props.row.modified_by">
                Created by {{ props.row.created_by || "unknown" }}<span
                  v-if="props.row.modified_by && props.row.modified_by !== props.row.created_by"
                >
                  &middot; Last edited by {{ props.row.modified_by }}</span
                >
              </q-tooltip>
            </template>
          </q-td>
        </template>
        <template #body-cell-enabled="props">
          <q-td :props="props">
            <q-icon
              v-if="props.row._kind !== 'created'"
              :name="props.row.enabled ? 'check_circle' : 'pause_circle'"
              :color="props.row.enabled ? 'green' : 'grey'"
            />
            <span v-else class="text-grey">—</span>
          </q-td>
        </template>
        <template #body-cell-schedule="props">
          <q-td :props="props">
            <template v-if="props.row._kind === 'created'">
              Once &middot; {{ fmtIn(props.row.run_at, rowTz(props.row)) }}
            </template>
            <template v-else>
              {{ scheduleText(props.row) }}
              <!-- The zone a wall-clock schedule is AUTHORED in is part of the schedule,
                   not decoration: "daily 03:00" fires at a different moment in each one. -->
              <q-badge
                v-if="scheduleHasClock(props.row)"
                class="q-ml-xs"
                :color="props.row.schedule_timezone ? 'blue-grey-7' : 'teal-8'"
                :label="shortTz(props.row.effective_timezone)"
              />
              <q-tooltip v-if="scheduleHasClock(props.row)" max-width="420px">
                Runs at {{ props.row.run_time }} in
                <b>{{ props.row.effective_timezone }}</b>
                <template v-if="props.row.schedule_timezone">
                  (pinned to that zone on the task)
                </template>
                <template v-else>
                  (the device&rsquo;s own timezone &mdash; follows the machine)
                </template>
                <template v-if="props.row.next_run">
                  <br />Next: {{ fmtIn(props.row.next_run, props.row.effective_timezone) }}
                  <template v-if="rowTz(props.row) !== props.row.effective_timezone">
                    = {{ fmtIn(props.row.next_run, rowTz(props.row)) }}
                  </template>
                </template>
              </q-tooltip>
            </template>
          </q-td>
        </template>
        <template #body-cell-next_run="props">
          <q-td :props="props" class="no-wrap">
            <template v-if="props.row._kind === 'created'">
              <span :class="props.row.status === 'scheduled' ? '' : 'text-grey-6'">
                {{ fmtIn(props.row.run_at, rowTz(props.row)) || "\u2014" }}
              </span>
            </template>
            <template v-else-if="props.row.enabled && props.row.next_run">
              {{ fmtIn(props.row.next_run, rowTz(props.row)) }}
              <q-tooltip max-width="380px">
                {{ fmtIn(props.row.next_run, rowTz(props.row), true) }}
                <br />Device time ({{ props.row.agent_timezone }}):
                {{ fmtIn(props.row.next_run, props.row.agent_timezone) }}
                <br />UTC: {{ fmtIn(props.row.next_run, "UTC") }}
              </q-tooltip>
            </template>
            <span v-else class="text-grey-6">&mdash;</span>
          </q-td>
        </template>
        <template #body-cell-last_run="props">
          <q-td :props="props" class="no-wrap">
            <template v-if="props.row.last_run">
              {{ fmtIn(props.row.last_run, rowTz(props.row)) }}
              <q-tooltip>{{ fmtIn(props.row.last_run, rowTz(props.row), true) }}</q-tooltip>
            </template>
            <span v-else class="text-grey-6">never</span>
          </q-td>
        </template>
        <template #body-cell-last_status="props">
          <q-td :props="props">
            <q-spinner
              v-if="runningTasks[props.row.id]"
              color="primary"
              size="16px"
              class="q-mr-xs"
            />
            <q-badge
              v-if="props.row.last_status"
              :color="statusColor(props.row.last_status)"
              :label="props.row.last_status"
            />
            <span v-else class="text-grey">never run</span>
            <q-tooltip v-if="props.row.last_summary">{{
              props.row.last_summary
            }}</q-tooltip>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <template v-if="props.row._kind === 'created'">
              <q-btn dense flat size="sm" icon="open_in_full" @click="viewCreated(props.row)">
                <q-tooltip>View details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.status === 'scheduled'"
                dense flat size="sm" icon="delete" color="red"
                @click="cancelAiCreated(props.row)"
              >
                <q-tooltip>Cancel this AI-scheduled action</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              <q-btn dense flat size="sm" icon="play_arrow" color="primary" @click="runNow(props.row)">
                <q-tooltip>Run now</q-tooltip>
              </q-btn>
              <q-btn
                v-if="runningTasks[props.row.id]"
                dense flat size="sm" icon="sensors" color="red" class="pi-live-pulse"
                @click="openLive(runningTasks[props.row.id])"
              >
                <q-tooltip>Live — trace what it's doing now</q-tooltip>
              </q-btn>
              <q-btn dense flat size="sm" icon="history" @click="openHistory(props.row)">
                <q-tooltip>View run history</q-tooltip>
              </q-btn>
              <q-btn v-if="mode === 'agent'" dense flat size="sm" icon="edit" @click="editTask(props.row)" />
              <q-btn v-if="mode === 'agent'" dense flat size="sm" icon="delete" color="red" @click="remove(props.row)" />
            </template>
          </q-td>
        </template>
      </q-table>
      <div v-if="mergedRows.length === 0" class="q-pa-md text-grey">
        <template v-if="mode === 'agent'">
          No AI tasks yet. Create one to have Pi periodically check this device — or Pi
          will add its own scheduled actions here while working this device's tickets.
        </template>
        <template v-else>
          No AI tasks or AI-scheduled actions for any device in this {{ scope.kind }}.
        </template>
      </div>
    </div>

    <!-- AI-created scheduled action: details -->
    <q-dialog v-model="createdDialog">
      <q-card style="min-width: 520px; max-width: 92vw">
        <q-card-section class="row items-center">
          <q-icon name="smart_toy" color="deep-purple" class="q-mr-sm" />
          <div class="text-subtitle1">AI-created scheduled action</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <div><span class="text-grey">Ticket:</span> {{ createdDetail.ticket_ref || "—" }}</div>
          <div><span class="text-grey">Runs:</span> once · {{ formatTime(createdDetail.run_at) }}</div>
          <div class="row items-center">
            <span class="text-grey q-mr-sm">Status:</span>
            <q-badge :color="statusColor(createdDetail.status)" :label="createdDetail.status" />
          </div>
          <div><span class="text-grey">Makes changes:</span> {{ createdDetail.allow_mutating ? "Yes" : "No (read-only)" }}</div>
          <div class="text-grey q-mt-sm">Action</div>
          <div class="pi-created-action">{{ createdDetail.action }}</div>
          <template v-if="createdDetail.result">
            <div class="text-grey q-mt-sm">Result</div>
            <div class="pi-created-action">{{ createdDetail.result }}</div>
          </template>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-if="createdDetail.status === 'scheduled'"
            flat color="red" icon="delete" label="Cancel action"
            @click="cancelAiCreated(createdDetail)"
          />
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- edit dialog -->
    <q-dialog v-model="dialog">
      <q-card style="min-width: 560px">
        <q-card-section class="text-subtitle1">
          {{ form.id ? "Edit" : "New" }} AI Task
        </q-card-section>
        <q-card-section class="q-gutter-sm scroll" style="max-height: 70vh">
          <q-input v-model="form.name" outlined dense label="Task name" />
          <div class="row items-center">
            <q-space />
            <q-btn
              dense
              no-caps
              size="sm"
              color="deep-purple"
              icon="auto_awesome"
              label="Help me write this with AI"
              @click="openAssist"
            >
              <q-tooltip>Interview me and draft the prompt</q-tooltip>
            </q-btn>
          </div>
          <q-input
            v-model="form.prompt"
            outlined
            dense
            type="textarea"
            autogrow
            label="Prompt / instructions"
            hint="e.g. Check SQL Server performance. Alert on high wait times or latency over 1s, warn over 500ms."
          />

          <q-dialog v-model="assistDialog">
            <q-card style="min-width: 720px; max-width: 92vw">
              <q-card-section class="row items-center">
                <div class="text-subtitle1">AI Task Prompt Builder</div>
                <q-space />
                <q-btn dense flat icon="close" v-close-popup />
              </q-card-section>
              <q-separator />
              <q-card-section style="max-height: 55vh; overflow-y: auto">
                <div
                  v-if="assistMessages.length === 0"
                  class="text-grey text-caption q-mb-sm"
                >
                  Tell the AI what you want this task to check or do on the device. It will
                  interview you, then draft the <strong>Prompt</strong> for you to review and
                  apply. Click <strong>Send</strong> to start.
                </div>
                <div v-for="(m, i) in assistMessages" :key="i">
                  <q-chat-message
                    :sent="m.role === 'user'"
                    :bg-color="m.role === 'user' ? 'blue-2' : 'grey-3'"
                  >
                    <div v-if="m.role === 'user'" style="white-space:pre-wrap">{{ m.text }}</div>
                    <div v-else class="md-body" v-html="renderMarkdown(m.text)"></div>
                  </q-chat-message>
                  <div v-if="m.prompt" class="q-gutter-xs q-mb-md">
                    <q-btn
                      dense
                      no-caps
                      size="sm"
                      color="primary"
                      icon="check"
                      label="Apply to Prompt"
                      @click="applyAssistPrompt(m.prompt)"
                    />
                  </div>
                </div>
                <div v-if="assistLoading" class="text-grey text-caption">
                  <q-spinner-dots size="1.5em" /> thinking…
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section class="row q-gutter-sm items-center">
                <q-input
                  v-model="assistInput"
                  outlined
                  dense
                  autogrow
                  class="col"
                  type="textarea"
                  input-style="max-height: 120px"
                  placeholder="Answer the AI, or describe what you want… (Enter to send)"
                  @keydown.enter.exact.prevent="sendAssist"
                />
                <q-btn
                  color="primary"
                  icon="send"
                  :loading="assistLoading"
                  :disable="assistLoading"
                  @click="sendAssist"
                />
              </q-card-section>
            </q-card>
          </q-dialog>
          <q-separator class="q-my-sm" />
          <div class="text-subtitle2">Machines</div>
          <div class="text-caption text-grey q-mb-xs">
            The PRIMARY machine is <b>{{ selectedAgentHostname }}</b> &mdash; the device
            this tab is open on. Add more machines below only if this task needs to
            reason across them TOGETHER in one run (e.g. decide something on one, then
            act on another) &mdash; for running the exact same independent check on many
            machines, use a Bulk AI Command instead.
          </div>
          <q-input
            v-model="form.primary_role"
            outlined
            dense
            label="Primary machine's role (optional, e.g. 'cert host')"
            maxlength="400"
            class="q-mb-sm"
          />
          <div
            v-for="(row, i) in form.machines"
            :key="i"
            class="row q-col-gutter-sm items-start q-mb-sm"
          >
            <div class="col-5">
              <tactical-dropdown
                v-model="row.agent_id"
                :options="agentOptions"
                label="Machine"
                outlined
                dense
                mapOptions
                filterable
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="row.role"
                dense
                outlined
                label="Role (e.g. 'RD Gateway')"
                maxlength="400"
              />
            </div>
            <div class="col-1 row justify-center">
              <q-btn
                flat
                dense
                round
                icon="remove"
                color="red"
                @click="removeMachineRow(i)"
              >
                <q-tooltip>Remove this machine</q-tooltip>
              </q-btn>
            </div>
          </div>
          <q-btn
            dense
            flat
            no-caps
            icon="add"
            label="Add machine"
            :disable="(form.machines || []).length >= 7"
            @click="addMachineRow"
          />
          <q-select
            v-model="form.model"
            :options="modelOptions"
            emit-value
            map-options
            outlined
            dense
            clearable
            label="Model (blank = global default)"
          />
          <!-- when to run -->
          <q-option-group
            v-model="form.run_mode"
            :options="[
              { label: 'Now (one-shot)', value: 'now' },
              { label: 'Scheduled', value: 'schedule' },
            ]"
            inline
            dense
          />
          <div v-if="form.run_mode === 'now'" class="text-caption text-grey">
            One-shot: runs when you click Run now, then disables itself (kept
            here with its results).
          </div>

          <template v-if="form.run_mode === 'schedule'">
            <div class="row q-col-gutter-sm">
              <q-select
                v-model="form.schedule_type"
                :options="[
                  { label: 'Every N minutes', value: 'interval' },
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                ]"
                emit-value
                map-options
                outlined
                dense
                label="Schedule"
                class="col"
              />
              <q-input
                v-if="form.schedule_type === 'interval'"
                v-model.number="form.interval_minutes"
                type="number"
                outlined
                dense
                label="Interval (minutes)"
                class="col"
              />
              <q-input
                v-else
                v-model="form.run_time"
                type="time"
                outlined
                dense
                label="At time"
                class="col"
              />
            </div>
            <!-- WHICH CLOCK the time above is on. Blank = the device's, so a task moves
                 with the machine; pin a zone for work tied to a business process instead
                 of to a location. -->
            <q-select
              v-if="form.schedule_type !== 'interval'"
              v-model="form.schedule_timezone"
              :options="scheduleTzOptions"
              emit-value
              map-options
              use-input
              fill-input
              hide-selected
              input-debounce="0"
              outlined
              dense
              options-dense
              label="That time is in"
              @filter="filterScheduleTz"
            >
              <template #hint>
                <span v-if="!form.schedule_timezone">
                  Follows the device&rsquo;s timezone
                  <template v-if="deviceTzLabel">({{ deviceTzLabel }})</template>
                  &mdash; if the machine moves, so does the window.
                </span>
                <span v-else>Always {{ form.run_time }} in {{ form.schedule_timezone }}.</span>
              </template>
            </q-select>
            <div v-if="form.schedule_type === 'weekly'">
              <div class="text-caption q-mb-xs">Days of week</div>
              <div class="row q-gutter-sm">
                <q-checkbox
                  v-for="d in weekDays"
                  :key="d.value"
                  v-model="form.weekly_days"
                  :val="d.value"
                  :label="d.label"
                  dense
                />
              </div>
            </div>
            <q-input
              v-if="form.schedule_type === 'monthly'"
              v-model.number="form.monthly_day"
              type="number"
              min="1"
              max="31"
              outlined
              dense
              label="Day of month (1-31)"
            />
          </template>
          <q-select
            v-model="form.alert_threshold"
            :options="[
              { label: 'Never raise an alert', value: 'never' },
              { label: 'Alert on Warning or Alert', value: 'warning' },
              { label: 'Alert only on Alert', value: 'alert' },
            ]"
            emit-value
            map-options
            outlined
            dense
            label="Raise TRMM alert when"
          />
          <q-checkbox
            v-model="form.allow_mutating"
            label="Allow this task to make changes (run scripts, kill processes, reboot)"
          />
          <div class="text-caption text-grey">
            Off = read-only diagnostics (recommended). It can still run shell
            commands you describe in the prompt, but destructive actions are
            blocked.
          </div>
          <q-checkbox v-model="form.enabled" label="Enabled" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" @click="saveForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- history dialog (master-detail) -->
    <q-dialog v-model="historyDialog">
      <q-card class="pi-hist-card">
        <q-bar class="bg-primary text-white">
          <q-icon name="history" />
          <div>Run history — {{ historyTask.hostname ? historyTask.hostname + " · " : "" }}{{ historyTask.name }}</div>
          <q-space />
          <q-btn dense flat icon="refresh" @click="loadHistory" />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>
        <div class="pi-hist-body">
          <div class="pi-hist-list">
            <q-list separator>
              <q-item
                v-for="r in runs"
                :key="r.id"
                clickable
                :active="selectedRun && selectedRun.id === r.id"
                active-class="bg-blue-1 text-black"
                @click="selectRun(r)"
              >
                <q-item-section side>
                  <q-spinner v-if="r.status === 'running'" color="primary" size="18px" />
                  <q-badge v-else :color="statusColor(r.status)" :label="r.status" />
                </q-item-section>
                <q-item-section>
                  <q-item-label lines="2">{{ r.summary || "(running…)" }}</q-item-label>
                  <q-item-label caption>
                    {{ formatTime(r.started_at) }} · {{ r.triggered_by }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side v-if="r.status === 'running'">
                  <q-btn
                    dense
                    flat
                    size="sm"
                    icon="sensors"
                    color="red"
                    @click.stop="openLive(r.run_id)"
                  >
                    <q-tooltip>Watch live</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-if="runs.length === 0" class="q-pa-md text-grey">No runs yet.</div>
          </div>
          <div class="col pi-hist-detail">
            <div v-if="selectedRun">
              <div class="row items-center q-gutter-sm q-mb-sm">
                <q-badge :color="statusColor(selectedRun.status)" :label="selectedRun.status" />
                <div class="text-caption text-grey">
                  {{ formatTime(selectedRun.started_at) }} · {{ selectedRun.triggered_by }}
                </div>
                <q-space />
                <q-btn
                  dense
                  flat
                  no-caps
                  color="deep-orange"
                  icon="auto_fix_high"
                  label="AI Resolve"
                  @click="aiResolve(selectedRun)"
                >
                  <q-tooltip>
                    Open a read-only Pi chat on this device that proposes fix
                    options for this finding
                  </q-tooltip>
                </q-btn>
              </div>
              <div class="text-weight-medium q-mb-sm">{{ selectedRun.summary }}</div>
              <q-separator class="q-mb-sm" />
              <pre class="pi-transcript">{{ selectedRun.output || "(no transcript)" }}</pre>
            </div>
            <div v-else class="text-grey q-pa-md">
              Select a run on the left to see everything it did.
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <!-- live dialog -->
    <q-dialog v-model="liveDialog" @hide="stopLivePoll">
      <q-card style="min-width: 720px; max-width: 90vw">
        <q-card-section class="row items-center">
          <q-spinner v-if="liveState.status === 'running'" color="primary" class="q-mr-sm" />
          <q-icon
            v-else
            :name="liveState.status === 'ok' ? 'check_circle' : 'warning'"
            :color="statusColor(liveState.status)"
            class="q-mr-sm"
          />
          <div class="text-subtitle1">Live trace — {{ liveState.status || "running" }}</div>
          <q-space />
          <q-badge color="red" label="LIVE" v-if="liveState.status === 'running'" />
        </q-card-section>
        <q-card-section class="pi-live" style="max-height: 55vh; overflow: auto">
          <div v-for="(ev, i) in liveState.events" :key="i" class="pi-live-ev q-mb-xs">
            <template v-if="ev.type === 'tool_start'">
              <q-icon name="play_circle" color="blue" size="xs" />
              <span class="text-weight-medium"> {{ ev.tool }}</span>
              <pre class="pi-args">{{ ev.args }}</pre>
            </template>
            <template v-else-if="ev.type === 'tool_end'">
              <q-icon
                :name="ev.isError ? 'error' : 'check_circle'"
                :color="ev.isError ? 'red' : 'green'"
                size="xs"
              />
              <span> {{ ev.tool }} result</span>
              <pre class="pi-args">{{ ev.result }}</pre>
            </template>
            <template v-else-if="ev.type === 'text'">
              <q-icon name="chat" color="grey" size="xs" />
              <span class="pi-say"> {{ ev.text }}</span>
            </template>
            <template v-else-if="ev.type === 'done'">
              <q-icon name="flag" color="green" size="xs" />
              <span class="text-weight-medium"> Verdict: {{ ev.text }}</span>
            </template>
            <template v-else>
              <q-icon name="info" color="grey" size="xs" />
              <span> {{ ev.text }}</span>
            </template>
          </div>
          <div v-if="liveState.events.length === 0" class="text-grey">
            Waiting for the task to start…
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useStore } from "vuex";
import {
  fetchAITasks,
  fetchAITasksByScope,
  saveAITask,
  editAITask,
  deleteAITask,
  runAITaskNow,
  fetchAIModels,
  fetchAITaskRuns,
  fetchAITaskRunLive,
  aiPromptAssist,
  getScheduledActions,
  deleteScheduledAction,
} from "@/api/core";
import { runPiChat } from "@/api/agents";
import { useAgentDropdown } from "@/composables/agents";
import { renderMarkdown } from "@/utils/markdown";
import { notifySuccess, notifyError } from "@/utils/notify";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  name: "AITasksTab",
  components: { TacticalDropdown },
  setup() {
    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const selectedTree = computed(() => store.state.selectedTree);
    const tabHeight = computed(() => store.state.tabHeight);
    const tasks = ref([]);
    // AI-created scheduled actions (queued by Pi in ticket chats) for this device.
    const aiCreated = ref([]);
    async function cancelAiCreated(row) {
      try {
        await deleteScheduledAction(row._actionId || row.id);
        notifySuccess("Scheduled action cancelled");
        createdDialog.value = false;
        await load();
      } catch (e) {
        notifyError("Failed to cancel");
      }
    }
    const modelOptions = ref([]);
    const runningTasks = ref({});
    const filter = ref("");

    // multi-machine roster (agent, not counting the primary machine this tab is open
    // on). Same dropdown data source as PiChat's multi-machine dialog.
    const { agentOptions, getAgentOptions } = useAgentDropdown();
    const selectedAgentHostname = computed(() => {
      const opt = agentOptions.value.find((o) => o.value === selectedAgent.value);
      return (opt && opt.label) || "this device";
    });
    function addMachineRow() {
      if (!Array.isArray(form.value.machines)) form.value.machines = [];
      if (form.value.machines.length < 7)
        form.value.machines.push({ agent_id: null, role: "" });
    }
    function removeMachineRow(i) {
      form.value.machines.splice(i, 1);
    }

    // scope derived from the tree selection (Client|id / Site|id)
    const scope = computed(() => {
      const t = selectedTree.value || "";
      if (t.includes("Client"))
        return { client: t.split("|")[1], site: null, kind: "client" };
      if (t.includes("Site"))
        return { client: null, site: t.split("|")[1], kind: "site" };
      return { client: null, site: null, kind: null };
    });

    const mode = computed(() => {
      if (selectedAgent.value) return "agent";
      if (scope.value.kind) return "scope";
      return "none";
    });

    const headerText = computed(() =>
      mode.value === "scope"
        ? `Scheduled Pi AI Tasks — all devices in this ${scope.value.kind}`
        : "Scheduled Pi AI Tasks",
    );

    const tableHeight = computed(() => {
      const base = parseInt(tabHeight.value) || 300;
      return `${mode.value === "scope" ? base - 60 : base}px`;
    });
    // AI-created scheduled actions are merged INTO the tasks table as rows (tagged _kind).
    const mergedRows = computed(() => {
      const created = aiCreated.value.map((r) => ({
        ...r,
        _kind: "created",
        id: "ai-" + r.id,
        _actionId: r.id,
        // hostname column is shown in client/site scope mode
        hostname: r.agent || r.hostname || "",
        name: r.action,
        last_status: r.status,
        last_status_rank: 5,
        // RAW instant, not a pre-formatted string: the table renders it in whichever
        // timezone the operator has selected, and a baked string cannot be re-zoned.
        last_run: r.run_at,
      }));
      return [...tasks.value, ...created];
    });
    const createdDialog = ref(false);
    const createdDetail = ref({});
    function viewCreated(row) {
      createdDetail.value = row;
      createdDialog.value = true;
    }
    function truncate(s, n) {
      s = s || "";
      return s.length > n ? s.slice(0, n) + "\u2026" : s;
    }

    const columns = computed(() => {
      const cols = [];
      if (mode.value === "scope")
        cols.push({ name: "hostname", label: "Hostname", field: "hostname", align: "left", sortable: true });
      cols.push(
        { name: "name", label: "Task", field: "name", align: "left", sortable: true },
        { name: "schedule", label: "Schedule", field: "schedule", align: "left" },
        { name: "model_display", label: "Model", field: "model_display", align: "left" },
        { name: "alert_threshold", label: "Alert", field: "alert_threshold", align: "left" },
        { name: "by", label: "By", field: (r) => r.modified_by || r.created_by || "", align: "left", sortable: true },
        { name: "next_run", label: "Next run", field: "next_run", align: "left", sortable: true },
        { name: "last_run", label: "Last run", field: "last_run", align: "left", sortable: true },
        { name: "last_status", label: "Status", field: "last_status_rank", align: "left", sortable: true },
        { name: "enabled", label: "On", field: "enabled", align: "center" },
        { name: "actions", label: "", field: "actions", align: "right" },
      );
      return cols;
    });

    const rank = { alert: 0, error: 1, warning: 2, running: 3, ok: 4 };
    const counts = computed(() => {
      const c = { ok: 0, warning: 0, alert: 0, error: 0, never: 0 };
      for (const t of tasks.value) {
        if (!t.last_status) c.never++;
        else if (c[t.last_status] !== undefined) c[t.last_status]++;
      }
      return c;
    });

    const weekDays = [
      { label: "Mon", value: 0 },
      { label: "Tue", value: 1 },
      { label: "Wed", value: 2 },
      { label: "Thu", value: 3 },
      { label: "Fri", value: 4 },
      { label: "Sat", value: 5 },
      { label: "Sun", value: 6 },
    ];
    function scheduleText(row) {
      if (row.run_mode === "now") return "Now (one-shot)";
      const at = hhmm(row.run_time);
      if (row.schedule_type === "once") return `Once at ${at}`;
      if (row.schedule_type === "daily") return `Daily at ${at}`;
      if (row.schedule_type === "weekly")
        return `Weekly ${(row.weekly_days || []).map((d) => weekDays[d].label).join(",")} at ${at}`;
      if (row.schedule_type === "monthly")
        return `Monthly day ${row.monthly_day} at ${at}`;
      return `Every ${row.interval_minutes} min`;
    }
    // "03:00:00" -> "03:00". The seconds are always zero and only cost width.
    function hhmm(t) {
      const v = String(t || "");
      return v ? v.slice(0, 5) : "?";
    }
    // Does this schedule have a wall clock in it? An interval ("every 60 min") does not,
    // so naming a timezone for it would be noise.
    function scheduleHasClock(row) {
      return row.run_mode !== "now" && row.schedule_type !== "interval";
    }
    function statusColor(s) {
      return {
        ok: "green", warning: "orange", alert: "red", error: "grey", running: "blue",
        scheduled: "blue-grey", done: "green", cancelled: "grey",
      }[s] || "grey";
    }
    // ---- timezones ---------------------------------------------------------
    //
    // Every absolute time in this table (next run, last run, one-shot run_at) is a real
    // instant, so it can be shown correctly in ANY zone. The default is the device's own
    // - "the client's timezone" - because that is the clock a customer's maintenance
    // window was agreed on, and it is the one the scheduler now uses when a task's
    // schedule_timezone is blank.
    const TZ_DEVICE = "";                      // sentinel: follow each row's device
    const viewTz = ref(TZ_DEVICE);
    const browserTz = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch (e) {
        return "UTC";
      }
    })();

    /** Which zone THIS row is rendered in. */
    function rowTz(row) {
      if (viewTz.value) return viewTz.value;
      // AI-created scheduled actions carry no agent record, so they borrow the table's
      // device zone when there is exactly one - showing a customer's overnight action in
      // the technician's own timezone is the confusion this whole change is about.
      const dev = deviceTzLabel.value;
      const single = dev && (dev.includes("/") || dev === "UTC") ? dev : "";
      return row?.agent_timezone || row?.effective_timezone || single || browserTz;
    }

    /** Format an ISO instant in a named zone. `long` adds the date in full + zone name. */
    function fmtIn(ts, tz, long = false) {
      if (!ts) return "";
      const zone = tz || browserTz;
      try {
        return new Intl.DateTimeFormat(undefined, {
          timeZone: zone,
          ...(long
            ? { dateStyle: "full", timeStyle: "long" }
            : {
                day: "2-digit", month: "short",
                hour: "2-digit", minute: "2-digit", hour12: false,
                timeZoneName: "short",
              }),
        }).format(new Date(ts));
      } catch (e) {
        // An unknown zone must degrade to a readable time, not to an empty cell.
        try {
          return new Date(ts).toLocaleString();
        } catch (e2) {
          return String(ts);
        }
      }
    }
    // Kept for the places that just want "a time, in this row's zone" (AI-created rows
    // are built before the row object exists, so they pass no row).
    function formatTime(ts) {
      return fmtIn(ts, viewTz.value || browserTz);
    }
    /** "Europe/London" -> "London"; UTC stays UTC. Enough for a badge. */
    function shortTz(tz) {
      const v = String(tz || "");
      if (!v) return "";
      const tail = v.includes("/") ? v.split("/").pop() : v;
      return tail.replace(/_/g, " ");
    }

    // The device timezone(s) behind the current table, for labelling the "Device
    // timezone" option. One machine names it; a mixed scope says how many.
    // True when every device zone behind this table is inherited from Global Settings
    // rather than set on the machine - i.e. "the client's timezone" is a guess.
    const tzIsInherited = computed(() => {
      const rows = tasks.value.filter((t) => t.agent_timezone_source);
      return rows.length > 0 && rows.every((t) => t.agent_timezone_source === "global");
    });

    const deviceTzLabel = computed(() => {
      const zones = [
        ...new Set(
          tasks.value.map((t) => t.agent_timezone).filter(Boolean),
        ),
      ];
      if (zones.length === 1) return zones[0];
      if (zones.length > 1) return `${zones.length} zones`;
      return "";
    });

    // The full IANA list where the browser can supply it (Chrome/Firefox/Safari all can
    // now); otherwise a short practical list. Zones actually in use here are pinned to
    // the top so the common choice is never a search away.
    const ALL_TZ = (() => {
      let list = [];
      try {
        list = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [];
      } catch (e) {
        list = [];
      }
      if (!list.length) {
        list = [
          "UTC", "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin",
          "Europe/Madrid", "Europe/Warsaw", "Europe/Athens", "America/New_York",
          "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto",
          "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
          "Australia/Sydney", "Pacific/Auckland",
        ];
      }
      return list;
    })();

    function tzChoices() {
      const inUse = [
        ...new Set(tasks.value.map((t) => t.agent_timezone).filter(Boolean)),
      ];
      const head = [
        { label: deviceTzLabel.value
            ? `Device timezone (${deviceTzLabel.value})`
            : "Device timezone", value: TZ_DEVICE },
        ...inUse.map((z) => ({ label: z, value: z })),
        { label: `My browser (${browserTz})`, value: browserTz },
        { label: "UTC", value: "UTC" },
      ];
      const seen = new Set(head.map((h) => h.value));
      return [
        ...head,
        ...ALL_TZ.filter((z) => !seen.has(z)).map((z) => ({ label: z, value: z })),
      ];
    }
    const tzOptions = ref([]);
    function filterTz(val, update) {
      update(() => {
        const all = tzChoices();
        const needle = String(val || "").toLowerCase();
        tzOptions.value = needle
          ? all.filter((o) => o.label.toLowerCase().includes(needle))
          : all;
      });
    }

    // The editor's own list: blank means "follow the device", which is the default for a
    // new task and the only option that keeps working if the machine is moved.
    const scheduleTzOptions = ref([]);
    function scheduleTzChoices() {
      const dev = form.value?.agent_timezone || deviceTzLabel.value;
      return [
        { label: dev ? `Device timezone (${dev})` : "Device timezone", value: "" },
        ...(dev ? [] : []),
        { label: `My browser (${browserTz})`, value: browserTz },
        { label: "UTC", value: "UTC" },
        ...ALL_TZ.filter((z) => z !== browserTz && z !== "UTC").map((z) => ({
          label: z, value: z,
        })),
      ];
    }
    function filterScheduleTz(val, update) {
      update(() => {
        const all = scheduleTzChoices();
        const needle = String(val || "").toLowerCase();
        scheduleTzOptions.value = needle
          ? all.filter((o) => o.label.toLowerCase().includes(needle))
          : all;
      });
    }

    // eslint-disable-next-line no-use-before-define
    async function load() {
      try {
        let data = [];
        if (mode.value === "agent") data = await fetchAITasks(selectedAgent.value);
        else if (mode.value === "scope") data = await fetchAITasksByScope(scope.value);
        tasks.value = data.map((t) => ({
          ...t,
          last_status_rank: rank[t.last_status] ?? 9,
        }));
      } catch (e) {
        tasks.value = [];
      }
      // AI-created scheduled actions (purple "AI" rows). Shown on the device AND at
      // client/site scope so company-wide AI-queued work is visible without drilling
      // into each computer. Backend filters by agent/client/site the same way /ai/tasks/ does.
      try {
        if (mode.value === "agent") {
          aiCreated.value = await getScheduledActions({ agent_id: selectedAgent.value });
        } else if (mode.value === "scope") {
          aiCreated.value = await getScheduledActions({
            client: scope.value.client,
            site: scope.value.site,
          });
        } else {
          aiCreated.value = [];
        }
      } catch (e) {
        aiCreated.value = [];
      }
    }
    async function loadModels() {
      try {
        const m = await fetchAIModels();
        modelOptions.value = m
          .filter((x) => x.enabled)
          .map((x) => ({ label: x.display_name, value: x.id }));
      } catch (e) {
        modelOptions.value = [];
      }
    }

    // ---- edit (agent mode only) ----
    const dialog = ref(false);
    const form = ref({});
    function addTask() {
      form.value = {
        name: "",
        prompt: "",
        model: null,
        run_mode: "schedule",
        schedule_type: "daily",
        interval_minutes: 60,
        run_time: "03:00",
        // Blank = the device's own timezone. A new maintenance window belongs to the
        // customer's clock, not to whatever the server happens to run on.
        schedule_timezone: "",
        agent_timezone: deviceTzLabel.value,
        weekly_days: [],
        monthly_day: 1,
        alert_threshold: "alert",
        allow_mutating: false,
        enabled: true,
        primary_role: "",
        machines: [],
      };
      dialog.value = true;
    }
    function editTask(row) {
      const f = {
        run_mode: "schedule",
        weekly_days: [],
        schedule_timezone: "",
        primary_role: "",
        // deep-copy so editing rows doesn't mutate the table row until Save
        machines: JSON.parse(JSON.stringify(row.machines || [])),
        monthly_day: 1,
        run_time: "03:00",
        ...row,
      };
      // legacy one-time tasks map onto the Now run mode
      if (f.schedule_type === "once") {
        f.run_mode = "now";
        f.schedule_type = "daily";
      }
      if (!Array.isArray(f.weekly_days)) f.weekly_days = [];
      form.value = f;
      dialog.value = true;
    }
    async function saveForm() {
      try {
        const f = { ...form.value, agent_id: selectedAgent.value };
        if (f.id) await editAITask(f.id, f);
        else await saveAITask(f);
        notifySuccess("Task saved");
        dialog.value = false;
        await load();
      } catch (e) {
        notifyError(e?.response?.data || "Failed to save task");
      }
    }
    async function remove(row) {
      try {
        await deleteAITask(row.id);
        await load();
      } catch (e) {
        notifyError("Failed to delete");
      }
    }

    // ---- run now -> live ----
    async function runNow(row) {
      try {
        await runAITaskNow(row.id);
        notifySuccess("Task started");
        setTimeout(() => findAndTrack(row.id, true), 800);
      } catch (e) {
        notifyError("Failed to run");
      }
    }
    async function findAndTrack(taskId, openLiveView) {
      try {
        const runs = await fetchAITaskRuns(taskId);
        const running = runs.find((r) => r.status === "running") || runs[0];
        if (running && running.status === "running") {
          runningTasks.value = { ...runningTasks.value, [taskId]: running.run_id };
          if (openLiveView) openLive(running.run_id);
        }
      } catch (e) {
        /* noop */
      }
    }

    // ---- history ----
    const historyDialog = ref(false);
    const historyTask = ref({});
    const runs = ref([]);
    const selectedRun = ref(null);
    function openHistory(row) {
      historyTask.value = row;
      selectedRun.value = null;
      historyDialog.value = true;
      loadHistory();
    }
    async function loadHistory() {
      try {
        runs.value = await fetchAITaskRuns(historyTask.value.id);
        if (!selectedRun.value && runs.value.length) selectRun(runs.value[0]);
      } catch (e) {
        runs.value = [];
      }
    }
    function selectRun(r) {
      selectedRun.value = r;
    }
    function aiResolve(r) {
      if (!r || !r.device_id) return;
      runPiChat(r.device_id, { resolve_run: r.run_id });
    }

    // ---- live ----
    const liveDialog = ref(false);
    const liveState = ref({ status: "running", events: [] });
    let livePoll = null;
    let liveRunId = null;
    function openLive(runId) {
      liveRunId = runId;
      liveState.value = { status: "running", events: [] };
      liveDialog.value = true;
      pollLive();
      livePoll = setInterval(pollLive, 1500);
    }
    async function pollLive() {
      if (!liveRunId) return;
      try {
        const data = await fetchAITaskRunLive(liveRunId);
        if (data.live) liveState.value = data.live;
        else if (data.run)
          liveState.value = {
            status: data.run.status,
            events: [{ type: "done", text: data.run.summary }],
            summary: data.run.summary,
          };
        if (liveState.value.status && liveState.value.status !== "running") {
          stopLivePoll();
          load();
          const t = { ...runningTasks.value };
          for (const k of Object.keys(t)) if (t[k] === liveRunId) delete t[k];
          runningTasks.value = t;
        }
      } catch (e) {
        /* keep polling */
      }
    }
    function stopLivePoll() {
      if (livePoll) {
        clearInterval(livePoll);
        livePoll = null;
      }
    }

    async function detectRunning() {
      for (const t of tasks.value) {
        if (t.last_status === "running") findAndTrack(t.id, false);
      }
    }

    watch([selectedAgent, selectedTree], () => load());
    watch(tasks, () => detectRunning());
    onMounted(() => {
      loadModels();
      load();
      getAgentOptions();
      // Seed both zone pickers so they are usable before anyone types in them.
      tzOptions.value = tzChoices();
      scheduleTzOptions.value = scheduleTzChoices();
    });
    onBeforeUnmount(stopLivePoll);

    // ---- AI prompt-writing assistant ----
    const assistDialog = ref(false);
    const assistMessages = ref([]);
    const assistInput = ref("");
    const assistLoading = ref(false);
    function openAssist() {
      assistDialog.value = true;
    }
    function parseTaskProposal(reply) {
      const i = reply.indexOf("===PROMPT START===");
      let prompt = null;
      if (i >= 0) {
        const j = reply.indexOf("===PROMPT END===", i);
        if (j >= 0) prompt = reply.slice(i + "===PROMPT START===".length, j).trim();
      }
      let text = reply.replace(/===PROMPT START===[\s\S]*?===PROMPT END===/g, "").trim();
      if (!text) text = prompt ? "(proposed prompt below — review and apply)" : "";
      return { text, prompt };
    }
    async function sendAssist() {
      if (assistLoading.value) return;
      const content =
        assistInput.value.trim() ||
        (assistMessages.value.length === 0
          ? "Help me write an AI task. " +
            (form.value.prompt ? "Here is my current draft: " + form.value.prompt : "")
          : "");
      if (!content) return;
      assistMessages.value.push({ role: "user", text: content, raw: content });
      assistInput.value = "";
      assistLoading.value = true;
      try {
        const convo = assistMessages.value.map((m) => ({ role: m.role, content: m.raw || m.text }));
        const hasMachines = (form.value.machines || []).some((m) => m.agent_id);
        const { reply } = await aiPromptAssist({
          messages: convo,
          kind: hasMachines ? "multi" : "single",
          current_prompt: form.value.prompt || "",
          machine_roles: hasMachines
            ? [form.value.primary_role, ...form.value.machines.map((m) => m.role)].filter(Boolean)
            : [],
        });
        const parsed = parseTaskProposal(reply || "");
        assistMessages.value.push({
          role: "assistant",
          text: parsed.text || reply || "(no response)",
          raw: reply,
          prompt: parsed.prompt,
        });
      } catch (e) {
        notifyError("Assistant request failed");
      } finally {
        assistLoading.value = false;
      }
    }
    function applyAssistPrompt(p) {
      form.value.prompt = p;
      notifySuccess("Applied to the Prompt field");
    }

    return {
      renderMarkdown,
      assistDialog,
      assistMessages,
      assistInput,
      assistLoading,
      openAssist,
      sendAssist,
      applyAssistPrompt,
      mode,
      scope,
      headerText,
      tableHeight,
      tabHeight,
      tasks,
      mergedRows,
      cancelAiCreated,
      createdDialog,
      createdDetail,
      viewCreated,
      truncate,
      modelOptions,
      runningTasks,
      filter,
      columns,
      counts,
      weekDays,
      scheduleText,
      scheduleHasClock,
      viewTz,
      tzOptions,
      filterTz,
      scheduleTzOptions,
      filterScheduleTz,
      deviceTzLabel,
      tzIsInherited,
      rowTz,
      fmtIn,
      shortTz,
      statusColor,
      formatTime,
      load,
      dialog,
      form,
      addTask,
      editTask,
      saveForm,
      remove,
      runNow,
      historyDialog,
      historyTask,
      runs,
      selectedRun,
      openHistory,
      loadHistory,
      aiResolve,
      selectRun,
      liveDialog,
      liveState,
      openLive,
      stopLivePoll,
      agentOptions,
      selectedAgentHostname,
      addMachineRow,
      removeMachineRow,
    };
  },
};
</script>

<style scoped>
.pi-hist-card {
  display: flex;
  flex-direction: column;
  width: 70vw;
  height: 80vh;
  max-width: 95vw;
  max-height: 92vh;
  min-width: 600px;
  min-height: 400px;
  resize: both;
  overflow: hidden;
}
.pi-hist-card > .q-bar {
  width: 100%;
}
.pi-hist-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.pi-hist-list {
  width: 340px;
  min-width: 300px;
  height: 100%;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.pi-hist-detail {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px;
  min-height: 0;
}
.pi-transcript {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 11px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
}
.pi-args {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 11px;
  margin: 2px 0 0 18px;
  color: #607d8b;
}
.pi-say {
  white-space: pre-wrap;
}
.pi-created-link {
  color: #7e57c2;
  cursor: pointer;
  text-decoration: underline;
}
.pi-created-action {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
}
.pi-live-ev {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 4px;
}
.pi-live-pulse {
  animation: pi-pulse 1.2s infinite;
}
@keyframes pi-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.35; }
  100% { opacity: 1; }
}
</style>
