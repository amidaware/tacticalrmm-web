<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" maximized>
    <q-card class="column">
      <q-bar class="bg-primary text-white">
        <q-icon name="smart_toy" />
        <div>Bulk AI Commands</div>
        <q-space />
        <q-btn dense flat icon="add" label="New" no-caps @click="addCmd" />
        <q-btn
          dense
          flat
          icon="dangerous"
          label="Emergency stop"
          no-caps
          color="yellow"
          @click="stopAll"
        >
          <q-tooltip>
            Immediately abort ALL in-flight AI runs (bulk + scheduled) and stop
            token spend. Does not disable schedules.
          </q-tooltip>
        </q-btn>
        <q-btn dense flat icon="refresh" @click="load" />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section class="col q-pa-none scroll">
        <q-table
          :rows="cmds"
          :columns="columns"
          row-key="id"
          dense
          flat
          :pagination="{ rowsPerPage: 0 }"
          hide-bottom
          @row-dblclick="(e, row) => editCmd(row)"
        >
          <template #body-cell-by="props">
            <q-td :props="props">
              {{ props.row.modified_by || props.row.created_by || "—" }}
              <q-tooltip v-if="props.row.created_by || props.row.modified_by">
                Created by {{ props.row.created_by || "unknown" }}<span
                  v-if="props.row.modified_by && props.row.modified_by !== props.row.created_by"
                >
                  &middot; Last edited by {{ props.row.modified_by }}</span
                >
              </q-tooltip>
            </q-td>
          </template>
          <template #body-cell-enabled="props">
            <q-td :props="props">
              <q-icon
                :name="props.row.enabled ? 'check_circle' : 'pause_circle'"
                :color="props.row.enabled ? 'green' : 'grey'"
              />
            </q-td>
          </template>
          <template #body-cell-schedule="props">
            <q-td :props="props">{{ scheduleText(props.row) }}</q-td>
          </template>
          <template #body-cell-last_run="props">
            <q-td :props="props">
              <span v-if="props.row.last_run">
                {{ formatTime(props.row.last_run) }}
                <q-badge color="blue-grey" class="q-ml-xs">
                  {{ props.row.last_run_count }} agents
                </q-badge>
              </span>
              <span v-else class="text-grey">never</span>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn dense flat size="sm" icon="play_arrow" color="primary" @click="runNow(props.row)">
                <q-tooltip>Run now (on all online targets)</q-tooltip>
              </q-btn>
              <q-btn dense flat size="sm" icon="list_alt" color="teal" @click="openResults(props.row)">
                <q-tooltip>View last results per computer</q-tooltip>
              </q-btn>
              <q-btn dense flat size="sm" icon="stop_circle" color="negative" @click="stopCmd(props.row)">
                <q-tooltip>Stop &amp; disable: abort in-flight runs and pause this command</q-tooltip>
              </q-btn>
              <q-btn dense flat size="sm" icon="edit" @click="editCmd(props.row)" />
              <q-btn dense flat size="sm" icon="delete" color="red" @click="removeCmd(props.row)" />
            </q-td>
          </template>
        </q-table>
        <div v-if="cmds.length === 0" class="q-pa-lg text-grey text-center">
          No bulk AI commands yet. Create one to run an AI prompt across many
          devices on a schedule (offline agents are skipped).
        </div>
      </q-card-section>

      <!-- create / edit dialog -->
      <!-- AI prompt-writing assistant -->
      <q-dialog v-model="assistDialog">
        <q-card style="min-width: 760px; max-width: 92vw">
          <q-card-section class="row items-center">
            <div class="text-subtitle1">AI Bulk Command Builder</div>
            <q-space />
            <q-btn dense flat icon="close" v-close-popup />
          </q-card-section>
          <q-separator />
          <q-card-section style="max-height: 55vh; overflow-y: auto">
            <div v-if="assistMessages.length === 0" class="text-grey text-caption q-mb-sm">
              Tell the AI what you want this bulk command to do. It will interview you, then
              draft the per-device <strong>Prompt</strong> and (if you want one) the
              <strong>Combined report</strong> instruction for you to review and apply.
              Click <strong>Send</strong> to start.
            </div>
            <div v-for="(m, i) in assistMessages" :key="i">
              <q-chat-message
                :sent="m.role === 'user'"
                :bg-color="m.role === 'user' ? 'blue-2' : 'grey-3'"
              >
                <div v-if="m.role === 'user'" style="white-space:pre-wrap">{{ m.text }}</div>
                <div v-else class="md-body" v-html="renderMarkdown(m.text)"></div>
              </q-chat-message>
              <div v-if="m.prompt || m.report" class="q-gutter-xs q-mb-md">
                <q-btn
                  v-if="m.prompt"
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  icon="check"
                  label="Apply to Prompt"
                  @click="applyAssistPrompt(m.prompt)"
                />
                <q-btn
                  v-if="m.report"
                  dense
                  no-caps
                  size="sm"
                  color="teal"
                  icon="check"
                  label="Apply to Combined report"
                  @click="applyAssistReport(m.report)"
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

      <q-dialog v-model="dialog">
        <q-card style="width: 720px; max-width: 95vw">
          <q-card-section class="text-subtitle1">
            {{ form.id ? "Edit" : "New" }} Bulk AI Command
          </q-card-section>
          <q-card-section class="q-gutter-sm scroll" style="max-height: 74vh">
            <q-input v-model="form.name" outlined dense label="Name" />
            <div class="row items-center q-mb-xs">
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
                <q-tooltip>Interview me and draft the prompt + combined report</q-tooltip>
              </q-btn>
            </div>
            <q-input
              v-model="form.prompt"
              outlined
              dense
              type="textarea"
              autogrow
              label="Prompt / instructions (runs on each targeted device)"
            />
            <q-input
              v-model="form.report_prompt"
              outlined
              dense
              type="textarea"
              autogrow
              label="Combined report instructions (optional)"
              hint="If set, runs ONCE after all machines finish - given every machine's result - to compile a single report/ticket (e.g. one 'all OK' summary). Leave empty for no combined report."
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

            <!-- targeting (mirrors Bulk Command) -->
            <div class="text-subtitle2 q-mt-sm">Targets</div>
            <q-separator />
            <q-option-group
              v-model="form.target"
              :options="targetOptions"
              inline
              dense
              @update:model-value="previewTargets"
            />
            <q-select
              v-if="form.target === 'client'"
              v-model="form.client"
              :options="clientOptions"
              emit-value
              map-options
              outlined
              dense
              label="Client"
              @update:model-value="previewTargets"
            />
            <q-select
              v-else-if="form.target === 'site'"
              v-model="form.site"
              :options="siteOptions"
              emit-value
              map-options
              outlined
              dense
              label="Site"
              @update:model-value="previewTargets"
            />
            <q-select
              v-else-if="form.target === 'agents'"
              v-model="form.agent_ids"
              :options="filteredAgents"
              emit-value
              map-options
              multiple
              use-chips
              use-input
              input-debounce="0"
              outlined
              dense
              label="Agents (type to filter by name / client / site)"
              @filter="filterAgents"
              @update:model-value="previewTargets"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>
                      {{ scope.opt.label }}
                      <span class="pi-faded"
                        >({{ scope.opt.client }} / {{ scope.opt.site }})</span
                      >
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template #no-option>
                <q-item><q-item-section class="text-grey">No agents</q-item-section></q-item>
              </template>
            </q-select>

            <!-- dynamic filter builder (groups of conditions, AND/OR) -->
            <div v-else-if="form.target === 'filter'">
              <div class="row items-center q-mb-sm">
                <span class="text-caption text-grey q-mr-sm">Match</span>
                <q-select
                  v-model="form.filter_match"
                  :options="matchOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  style="min-width: 160px"
                  @update:model-value="previewTargets"
                />
                <span class="text-caption text-grey q-ml-sm">
                  of the following groups:
                </span>
              </div>

              <div
                v-for="(group, gidx) in form.filters"
                :key="gidx"
                class="pi-filter-group q-pa-sm q-mb-sm"
              >
                <div class="row items-center q-mb-xs">
                  <span class="text-caption text-grey q-mr-sm">Match</span>
                  <q-select
                    v-model="group.match"
                    :options="matchOptions"
                    emit-value
                    map-options
                    dense
                    outlined
                    style="min-width: 160px"
                    @update:model-value="previewTargets"
                  />
                  <span class="text-caption text-grey q-ml-sm">
                    of these conditions:
                  </span>
                  <q-space />
                  <q-btn
                    dense
                    flat
                    round
                    icon="delete"
                    color="red"
                    :disable="form.filters.length <= 1"
                    @click="removeGroup(gidx)"
                  >
                    <q-tooltip>Remove this group</q-tooltip>
                  </q-btn>
                </div>

                <div
                  v-for="(cond, cidx) in group.conditions"
                  :key="cidx"
                  class="row q-col-gutter-xs q-mb-xs items-center"
                >
                  <q-select
                    v-model="cond.field"
                    :options="filterFieldOptions"
                    emit-value
                    map-options
                    outlined
                    dense
                    label="Field"
                    class="col-3"
                    @update:model-value="previewTargets"
                  />
                  <q-select
                    v-model="cond.op"
                    :options="filterOpOptions"
                    emit-value
                    map-options
                    outlined
                    dense
                    label="Is"
                    class="col-3"
                    @update:model-value="previewTargets"
                  />
                  <q-input
                    v-model="cond.value"
                    outlined
                    dense
                    label="Value"
                    class="col"
                    debounce="300"
                    @update:model-value="previewTargets"
                  />
                  <q-btn
                    dense
                    flat
                    round
                    icon="close"
                    color="red"
                    :disable="group.conditions.length <= 1"
                    @click="removeCondition(gidx, cidx)"
                  />
                </div>
                <q-btn
                  dense
                  flat
                  no-caps
                  icon="add"
                  label="Add condition"
                  color="primary"
                  @click="addCondition(gidx)"
                />
              </div>

              <q-btn
                dense
                flat
                no-caps
                icon="add"
                label="Add group (OR/AND section)"
                color="secondary"
                @click="addGroup"
              />
            </div>
            <div
              v-if="['all', 'client', 'site'].includes(form.target)"
              class="row q-col-gutter-sm"
            >
              <q-select
                v-model="form.mon_type"
                :options="monTypeOptions"
                emit-value
                map-options
                outlined
                dense
                label="Type"
                class="col"
                @update:model-value="previewTargets"
              />
              <q-select
                v-model="form.os_type"
                :options="osTypeOptions"
                emit-value
                map-options
                outlined
                dense
                label="OS"
                class="col"
                @update:model-value="previewTargets"
              />
            </div>
            <q-banner
              dense
              :class="preview.over_cap ? 'bg-red-2 text-black' : 'bg-blue-1 text-black'"
            >
              <div class="row items-center">
                <q-icon :name="preview.over_cap ? 'warning' : 'dns'" class="q-mr-xs" />
                Will run on
                <strong class="q-mx-xs">{{ preview.online_count }}</strong>
                online device(s)
                <span v-if="preview.excluded_count" class="q-ml-xs">
                  ({{ preview.excluded_count }} excluded of
                  {{ preview.matched_count }} matched)
                </span>
                <span v-else class="q-ml-xs">(offline are skipped at run time).</span>
                <q-space />
                <q-btn
                  v-if="(preview.agents || []).length"
                  dense
                  flat
                  size="sm"
                  no-caps
                  :label="showMatched ? 'Hide list' : 'Show list'"
                  :icon="showMatched ? 'expand_less' : 'expand_more'"
                  @click="showMatched = !showMatched"
                />
              </div>
              <div
                v-if="showMatched && (preview.agents || []).length"
                class="pi-matched q-mt-xs"
              >
                <div
                  v-for="(m, i) in preview.agents"
                  :key="i"
                  class="pi-matched-row row items-center no-wrap"
                >
                  <q-checkbox
                    dense
                    size="xs"
                    :model-value="!isExcluded(m.agent_id)"
                    class="q-mr-xs"
                    @update:model-value="(v) => setExcluded(m.agent_id, !v)"
                  >
                    <q-tooltip>Untick to exclude this computer from the run</q-tooltip>
                  </q-checkbox>
                  <q-icon name="dns" size="xs" class="q-mr-xs" />
                  <span :class="{ 'pi-excluded': isExcluded(m.agent_id) }">
                    {{ m.hostname }}
                    <span class="pi-faded">({{ m.client }} / {{ m.site }})</span>
                  </span>
                </div>
              </div>
              <div v-if="preview.over_cap" class="text-weight-bold q-mt-xs">
                ⚠ This exceeds the safety cap of {{ preview.cap }} agents. This
                command will be REFUSED at run time to prevent runaway cost.
                Narrow the target/filter (or an admin can raise
                PI_BULK_MAX_AGENTS).
              </div>
            </q-banner>

            <!-- run mode -->
            <div class="text-subtitle2 q-mt-sm">When to run</div>
            <q-separator />
            <q-option-group
              v-model="form.run_mode"
              :options="runModeOptions"
              inline
              dense
            />
            <div v-if="form.run_mode === 'now'" class="text-caption text-grey">
              One-shot: runs on the online targets when you click Run now, then
              disables itself (kept here with its results).
            </div>

            <!-- schedule -->
            <template v-if="form.run_mode === 'schedule'">
            <div class="text-subtitle2 q-mt-sm">Schedule</div>
            <q-separator />
            <q-select
              v-model="form.schedule_type"
              :options="scheduleOptions"
              emit-value
              map-options
              outlined
              dense
              label="Run"
            />
            <q-input
              v-if="form.schedule_type === 'interval'"
              v-model.number="form.interval_hours"
              type="number"
              outlined
              dense
              label="Every N hours"
            />
            <template v-else>
              <q-input
                v-model="form.run_time"
                type="time"
                outlined
                dense
                label="At time (server time)"
              />
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
            </template>

            <!-- options -->
            <q-select
              v-model="form.alert_threshold"
              :options="thresholdOptions"
              emit-value
              map-options
              outlined
              dense
              label="Raise TRMM alert when"
              class="q-mt-sm"
            />
            <q-checkbox
              v-model="form.allow_mutating"
              label="Allow changes (run scripts / kill / reboot) — off = read-only diagnostics"
            />
            <q-checkbox v-model="form.enabled" label="Enabled" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn
              v-if="form.id"
              flat
              color="primary"
              icon="play_arrow"
              label="Save & Run now"
              :disable="preview.over_cap"
              @click="saveAndRun"
            />
            <q-btn
              color="primary"
              label="Save"
              :disable="preview.over_cap"
              @click="saveForm"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- results: computers left, last-run results right -->
      <q-dialog v-model="resultsDialog">
        <q-card class="pi-res-card">
          <q-bar class="bg-primary text-white">
            <q-icon name="list_alt" />
            <div>{{ resultsCmd.name }} — last results per computer</div>
            <q-space />
            <q-btn dense flat icon="refresh" @click="loadResults" />
            <q-btn dense flat icon="close" v-close-popup />
          </q-bar>
          <div class="pi-res-body">
            <div class="pi-res-list">
              <q-list separator>
                <q-item
                  v-for="r in results"
                  :key="r.id"
                  clickable
                  :active="selectedResult && selectedResult.id === r.id"
                  active-class="bg-blue-1 text-black"
                  @click="selectedResult = r"
                >
                  <q-item-section side>
                    <q-spinner v-if="r.status === 'running'" color="primary" size="18px" />
                    <q-badge v-else :color="statusColor(r.status)" :label="r.status" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label lines="1">{{ r.hostname }}</q-item-label>
                    <q-item-label caption lines="1">{{ r.client }} / {{ r.site }}</q-item-label>
                    <q-item-label caption>{{ formatTime(r.started_at) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-if="results.length === 0" class="q-pa-md text-grey">
                No results yet — run this command first.
              </div>
            </div>
            <div class="col pi-res-detail">
              <div v-if="selectedResult">
                <div class="row items-center q-gutter-sm q-mb-xs">
                  <q-icon name="dns" size="sm" />
                  <span class="text-weight-medium">{{ selectedResult.hostname }}</span>
                  <q-badge color="blue-grey" :label="`${selectedResult.client} / ${selectedResult.site}`" />
                  <q-badge :color="statusColor(selectedResult.status)" :label="selectedResult.status" />
                  <div class="text-caption text-grey">
                    {{ formatTime(selectedResult.started_at) }} · {{ selectedResult.triggered_by }}
                  </div>
                </div>
                <div class="row items-center q-mb-sm">
                  <div class="text-weight-medium col">{{ selectedResult.summary }}</div>
                  <q-btn
                    dense
                    flat
                    no-caps
                    color="deep-orange"
                    icon="auto_fix_high"
                    label="AI Resolve"
                    @click="aiResolve(selectedResult)"
                  >
                    <q-tooltip>
                      Open a read-only Pi chat on this computer that proposes fix
                      options for this finding
                    </q-tooltip>
                  </q-btn>
                </div>
                <q-separator class="q-mb-sm" />
                <pre class="pi-transcript">{{ selectedResult.output || "(no transcript)" }}</pre>
              </div>
              <div v-else class="text-grey q-pa-md">
                Select a computer on the left to see its last result.
              </div>
            </div>
          </div>
        </q-card>
      </q-dialog>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, onMounted } from "vue";
import { useDialogPluginComponent, useQuasar } from "quasar";
import {
  fetchBulkAICommands,
  saveBulkAICommand,
  editBulkAICommand,
  deleteBulkAICommand,
  runBulkAICommandNow,
  stopBulkAICommand,
  stopAllAIRuns,
  fetchBulkAICommandResults,
  previewBulkAITargets,
  fetchAIModels,
  aiPromptAssist,
} from "@/api/core";
import { useClientDropdown, useSiteDropdown } from "@/composables/clients";
import { fetchAgents, runPiChat } from "@/api/agents";
import { renderMarkdown } from "@/utils/markdown";
import { notifySuccess, notifyError } from "@/utils/notify";

export default {
  name: "BulkAICommands",
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const $q = useQuasar();
    const { dialogRef, onDialogHide } = useDialogPluginComponent();
    const { clientOptions } = useClientDropdown(true);
    const { siteOptions } = useSiteDropdown(true);
    const allAgents = ref([]); // [{value, label, client, site}]
    const filteredAgents = ref([]);
    async function loadAgents() {
      try {
        const data = await fetchAgents({ detail: false });
        allAgents.value = (data || []).map((a) => ({
          value: a.agent_id,
          label: a.hostname,
          client: a.client,
          site: a.site,
        }));
        filteredAgents.value = allAgents.value;
      } catch (e) {
        allAgents.value = [];
      }
    }
    function filterAgents(val, update) {
      update(() => {
        const needle = (val || "").toLowerCase();
        filteredAgents.value = !needle
          ? allAgents.value
          : allAgents.value.filter(
              (o) =>
                o.label.toLowerCase().includes(needle) ||
                (o.client || "").toLowerCase().includes(needle) ||
                (o.site || "").toLowerCase().includes(needle),
            );
      });
    }

    const cmds = ref([]);
    const modelOptions = ref([]);
    const preview = ref({ online_count: 0, agents: [] });
    const showMatched = ref(false);

    const columns = [
      { name: "name", label: "Name", field: "name", align: "left" },
      { name: "target_summary", label: "Targets", field: "target_summary", align: "left" },
      { name: "schedule", label: "Schedule", field: "schedule", align: "left" },
      { name: "model_display", label: "Model", field: "model_display", align: "left" },
      { name: "alert_threshold", label: "Alert", field: "alert_threshold", align: "left" },
      { name: "by", label: "By", field: (r) => r.modified_by || r.created_by || "", align: "left", sortable: true },
      { name: "last_run", label: "Last run", field: "last_run", align: "left" },
      { name: "enabled", label: "On", field: "enabled", align: "center" },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];
    const targetOptions = [
      { label: "All", value: "all" },
      { label: "Client", value: "client" },
      { label: "Site", value: "site" },
      { label: "Agents", value: "agents" },
      { label: "Filter", value: "filter" },
    ];
    const filterFieldOptions = [
      { label: "Hostname", value: "hostname" },
      { label: "Client", value: "client" },
      { label: "Site", value: "site" },
      { label: "Description", value: "description" },
      { label: "OS", value: "operating_system" },
      { label: "Platform (windows/linux/darwin)", value: "plat" },
      { label: "Monitoring type (server/workstation)", value: "monitoring_type" },
      { label: "Installed software (name)", value: "software" },
    ];
    const filterOpOptions = [
      { label: "contains", value: "contains" },
      { label: "does not contain", value: "not_contains" },
      { label: "equals", value: "equals" },
      { label: "does not equal", value: "not_equals" },
      { label: "starts with", value: "startswith" },
    ];
    const matchOptions = [
      { label: "ALL (AND)", value: "all" },
      { label: "ANY (OR)", value: "any" },
    ];
    function isExcluded(agentId) {
      return (form.value.exclude_agent_ids || []).includes(agentId);
    }
    function setExcluded(agentId, excluded) {
      const list = form.value.exclude_agent_ids || [];
      if (excluded) {
        if (!list.includes(agentId)) list.push(agentId);
      } else {
        const i = list.indexOf(agentId);
        if (i >= 0) list.splice(i, 1);
      }
      form.value.exclude_agent_ids = list;
      previewTargets();
    }
    function newCondition() {
      return { field: "hostname", op: "contains", value: "" };
    }
    function newGroup() {
      return { match: "all", conditions: [newCondition()] };
    }
    // Accept both the new grouped shape and the legacy flat list of conditions.
    function normalizeFilters(raw) {
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length === 0) return [newGroup()];
      const first = arr[0];
      const isLegacyFlat =
        first &&
        typeof first === "object" &&
        !("conditions" in first) &&
        ("field" in first || "op" in first || "value" in first);
      if (isLegacyFlat) {
        return [
          {
            match: "all",
            conditions: arr.map((c) => ({
              field: c.field || "hostname",
              op: c.op || "contains",
              value: c.value || "",
            })),
          },
        ];
      }
      return arr.map((g) => ({
        match: g.match || "all",
        conditions: (g.conditions || []).length
          ? g.conditions.map((c) => ({
              field: c.field || "hostname",
              op: c.op || "contains",
              value: c.value || "",
            }))
          : [newCondition()],
      }));
    }
    function addGroup() {
      form.value.filters.push(newGroup());
    }
    function removeGroup(gidx) {
      form.value.filters.splice(gidx, 1);
      if (form.value.filters.length === 0) form.value.filters.push(newGroup());
      previewTargets();
    }
    function addCondition(gidx) {
      form.value.filters[gidx].conditions.push(newCondition());
    }
    function removeCondition(gidx, cidx) {
      form.value.filters[gidx].conditions.splice(cidx, 1);
      if (form.value.filters[gidx].conditions.length === 0)
        form.value.filters[gidx].conditions.push(newCondition());
      previewTargets();
    }
    const monTypeOptions = [
      { label: "All", value: "all" },
      { label: "Servers", value: "servers" },
      { label: "Workstations", value: "workstations" },
    ];
    const osTypeOptions = [
      { label: "All", value: "all" },
      { label: "Windows", value: "windows" },
      { label: "Linux", value: "linux" },
      { label: "macOS", value: "darwin" },
    ];
    const runModeOptions = [
      { label: "Now (one-shot)", value: "now" },
      { label: "Scheduled", value: "schedule" },
    ];
    const scheduleOptions = [
      { label: "Every N hours", value: "interval" },
      { label: "Daily", value: "daily" },
      { label: "Weekly", value: "weekly" },
      { label: "Monthly", value: "monthly" },
    ];
    const thresholdOptions = [
      { label: "Never raise an alert", value: "never" },
      { label: "Alert on Warning or Alert", value: "warning" },
      { label: "Alert only on Alert", value: "alert" },
    ];
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
      if (row.schedule_type === "interval") return `Every ${row.interval_hours}h`;
      if (row.schedule_type === "daily") return `Daily at ${row.run_time || "?"}`;
      if (row.schedule_type === "weekly")
        return `Weekly ${(row.weekly_days || []).map((d) => weekDays[d].label).join(",")} at ${row.run_time || "?"}`;
      if (row.schedule_type === "monthly")
        return `Monthly day ${row.monthly_day} at ${row.run_time || "?"}`;
      return "";
    }
    function statusColor(s) {
      return (
        { ok: "green", warning: "orange", alert: "red", error: "grey", running: "blue" }[
          s
        ] || "grey"
      );
    }
    // results viewer (computers left, last-run results right)
    const resultsDialog = ref(false);
    const resultsCmd = ref({});
    const results = ref([]);
    const selectedResult = ref(null);
    function aiResolve(r) {
      if (!r || !r.device_id) return;
      runPiChat(r.device_id, { resolve_run: r.run_id });
    }
    function openResults(row) {
      resultsCmd.value = row;
      selectedResult.value = null;
      results.value = [];
      resultsDialog.value = true;
      loadResults();
    }
    async function loadResults() {
      try {
        results.value = await fetchBulkAICommandResults(resultsCmd.value.id);
        if (results.value.length) selectedResult.value = results.value[0];
      } catch (e) {
        results.value = [];
      }
    }
    function formatTime(ts) {
      try {
        return new Date(ts).toLocaleString();
      } catch (e) {
        return ts;
      }
    }

    async function load() {
      try {
        cmds.value = await fetchBulkAICommands();
      } catch (e) {
        cmds.value = [];
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

    const dialog = ref(false);
    const form = ref({});
    function blankForm() {
      return {
        name: "",
        prompt: "",
        report_prompt: "",
        model: null,
        run_mode: "schedule",
        target: "all",
        client: null,
        site: null,
        agent_ids: [],
        mon_type: "all",
        os_type: "all",
        filters: [newGroup()],
        filter_match: "any",
        exclude_agent_ids: [],
        schedule_type: "daily",
        interval_hours: 24,
        run_time: "03:00",
        weekly_days: [],
        monthly_day: 1,
        alert_threshold: "alert",
        allow_mutating: false,
        enabled: true,
      };
    }
    function addCmd() {
      form.value = blankForm();
      preview.value = { online_count: 0 };
      dialog.value = true;
      previewTargets();
    }
    function editCmd(row) {
      form.value = { ...blankForm(), ...row };
      form.value.filters = normalizeFilters(row.filters);
      form.value.filter_match = row.filter_match || "any";
      dialog.value = true;
      previewTargets();
    }

    async function previewTargets() {
      try {
        preview.value = await previewBulkAITargets({
          target: form.value.target,
          client: form.value.client,
          site: form.value.site,
          agent_ids: form.value.agent_ids,
          filters: form.value.filters,
          filter_match: form.value.filter_match,
          exclude_agent_ids: form.value.exclude_agent_ids,
          mon_type: form.value.mon_type,
          os_type: form.value.os_type,
        });
      } catch (e) {
        preview.value = { online_count: 0 };
      }
    }

    async function saveForm() {
      try {
        if (form.value.id) await editBulkAICommand(form.value.id, form.value);
        else await saveBulkAICommand(form.value);
        notifySuccess("Bulk AI command saved");
        dialog.value = false;
        await load();
      } catch (e) {
        notifyError(e?.response?.data || "Failed to save");
      }
    }
    async function saveAndRun() {
      try {
        await editBulkAICommand(form.value.id, form.value);
        await runBulkAICommandNow(form.value.id);
        notifySuccess("Saved and queued to run now");
        dialog.value = false;
        await load();
      } catch (e) {
        notifyError("Failed");
      }
    }
    async function runNow(row) {
      try {
        await runBulkAICommandNow(row.id);
        notifySuccess(`"${row.name}" queued — runs on online targets`);
        setTimeout(load, 1500);
      } catch (e) {
        notifyError("Failed to run");
      }
    }
    async function removeCmd(row) {
      try {
        await deleteBulkAICommand(row.id);
        await load();
      } catch (e) {
        notifyError("Failed to delete");
      }
    }
    function stopCmd(row) {
      $q.dialog({
        title: "Stop bulk AI command",
        message: `Abort any in-flight runs for "${row.name}" and disable it? This halts token spend for this command immediately.`,
        cancel: true,
        ok: { label: "Stop", color: "negative" },
      }).onOk(async () => {
        try {
          const r = await stopBulkAICommand(row.id);
          notifySuccess(r?.detail || "Stopped");
          await load();
        } catch (e) {
          notifyError("Failed to stop");
        }
      });
    }
    function stopAll() {
      $q.dialog({
        title: "Emergency stop ALL AI runs",
        message:
          "Immediately abort every in-flight AI run (bulk and scheduled) and stop token spend now. Schedules are not disabled. Continue?",
        cancel: true,
        ok: { label: "Stop everything", color: "negative" },
      }).onOk(async () => {
        try {
          const r = await stopAllAIRuns();
          notifySuccess(r?.detail || "All AI runs stopped");
          await load();
        } catch (e) {
          notifyError("Failed to stop");
        }
      });
    }

    onMounted(async () => {
      loadModels();
      load();
      await loadAgents();
    });

    // ---- AI prompt-writing assistant ----
    const assistDialog = ref(false);
    const assistMessages = ref([]);
    const assistInput = ref("");
    const assistLoading = ref(false);
    function openAssist() {
      assistDialog.value = true;
    }
    function parseTaskProposal(reply) {
      const extract = (start, end) => {
        const i = reply.indexOf(start);
        if (i < 0) return null;
        const j = reply.indexOf(end, i + start.length);
        if (j < 0) return null;
        return reply.slice(i + start.length, j).trim();
      };
      const prompt = extract("===PROMPT START===", "===PROMPT END===");
      const report = extract("===REPORT START===", "===REPORT END===");
      let text = reply
        .replace(/===PROMPT START===[\s\S]*?===PROMPT END===/g, "")
        .replace(/===REPORT START===[\s\S]*?===REPORT END===/g, "")
        .trim();
      if (!text)
        text = prompt || report ? "(proposed instructions below — review and apply)" : "";
      return { text, prompt, report };
    }
    async function sendAssist() {
      if (assistLoading.value) return;
      const content =
        assistInput.value.trim() ||
        (assistMessages.value.length === 0
          ? "Help me write a bulk AI command. " +
            (form.value.prompt ? "Here is my current draft prompt: " + form.value.prompt : "")
          : "");
      if (!content) return;
      assistMessages.value.push({ role: "user", text: content, raw: content });
      assistInput.value = "";
      assistLoading.value = true;
      try {
        const convo = assistMessages.value.map((m) => ({ role: m.role, content: m.raw || m.text }));
        const { reply } = await aiPromptAssist({
          messages: convo,
          kind: "bulk",
          current_prompt: form.value.prompt || "",
          current_report: form.value.report_prompt || "",
        });
        const parsed = parseTaskProposal(reply || "");
        assistMessages.value.push({
          role: "assistant",
          text: parsed.text || reply || "(no response)",
          raw: reply,
          prompt: parsed.prompt,
          report: parsed.report,
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
    function applyAssistReport(r) {
      form.value.report_prompt = r;
      notifySuccess("Applied to the Combined report field");
    }

    return {
      dialogRef,
      onDialogHide,
      cmds,
      modelOptions,
      renderMarkdown,
      assistDialog,
      assistMessages,
      assistInput,
      assistLoading,
      openAssist,
      sendAssist,
      applyAssistPrompt,
      applyAssistReport,
      preview,
      showMatched,
      clientOptions,
      siteOptions,
      filteredAgents,
      filterAgents,
      columns,
      filterFieldOptions,
      filterOpOptions,
      matchOptions,
      isExcluded,
      setExcluded,
      addGroup,
      removeGroup,
      addCondition,
      removeCondition,
      targetOptions,
      monTypeOptions,
      osTypeOptions,
      runModeOptions,
      scheduleOptions,
      thresholdOptions,
      weekDays,
      scheduleText,
      formatTime,
      load,
      dialog,
      form,
      addCmd,
      editCmd,
      previewTargets,
      saveForm,
      saveAndRun,
      runNow,
      stopCmd,
      stopAll,
      removeCmd,
      statusColor,
      resultsDialog,
      resultsCmd,
      results,
      selectedResult,
      openResults,
      loadResults,
      aiResolve,
    };
  },
};
</script>

<style scoped>
.pi-faded {
  opacity: 0.55;
  font-size: 0.9em;
}
.pi-res-card {
  display: flex;
  flex-direction: column;
  width: 75vw;
  height: 82vh;
  max-width: 95vw;
  max-height: 92vh;
  min-width: 640px;
  min-height: 400px;
  resize: both;
  overflow: hidden;
}
.pi-res-card > .q-bar {
  width: 100%;
}
.pi-res-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.pi-res-list {
  width: 320px;
  min-width: 260px;
  height: 100%;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.pi-res-detail {
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
.pi-filter-group {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
}
.pi-excluded {
  text-decoration: line-through;
  opacity: 0.5;
}
.pi-matched {
  max-height: 220px;
  overflow-y: auto;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 4px;
}
.pi-matched-row {
  font-size: 12px;
  padding: 1px 0;
}
</style>
