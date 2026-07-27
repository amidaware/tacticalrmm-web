<template>
  <div>
    <div class="row items-center q-mb-xs">
      <q-space />
      <!-- The "+": reports are data, so any cadence can be added without a code change. -->
      <q-btn
        dense
        round
        color="primary"
        icon="add"
        size="sm"
        @click="openEditor()"
      >
        <q-tooltip>Add a report</q-tooltip>
      </q-btn>
    </div>
    <div class="text-caption text-grey q-mb-sm">
      Each row is one email: what it covers, who receives it, and when it goes out. Daily, weekdays,
      weekly or monthly &mdash; and the window it reports on follows the cadence unless you override it
      (so a weekly email can still cover just the last 24 hours if that is what you want).
    </div>

    <q-table
      dense
      flat
      bordered
      :rows="schedules"
      :columns="columns"
      row-key="id"
      :loading="loading"
      hide-pagination
      :rows-per-page-options="[0]"
      no-data-label="No scheduled reports yet — use + to add one"
    >
      <template v-slot:body="props">
        <q-tr
          :props="props"
          :class="props.row.enabled ? 'cursor-pointer' : 'text-grey cursor-pointer'"
          @click="openEditor(props.row)"
        >
          <q-td auto-width @click.stop>
            <q-toggle
              dense
              :model-value="props.row.enabled"
              @update:model-value="toggle(props.row, $event)"
            />
          </q-td>
          <q-td>
            <b>{{ props.row.name }}</b>
            <div class="text-caption text-grey">{{ props.row.kind_display }}</div>
          </q-td>
          <q-td>
            {{ cadenceText(props.row) }}
            <div class="text-caption text-grey">
              covers last {{ windowText(props.row) }}
            </div>
          </q-td>
          <q-td>
            <span class="text-caption">{{ props.row.recipients || "— no recipients —" }}</span>
          </q-td>
          <q-td>
            <div v-if="props.row.last_run" class="text-caption">
              {{ formatDate(props.row.last_run) }}
              <div class="text-grey" style="max-width: 320px; white-space: normal">
                {{ props.row.last_result }}
              </div>
            </div>
            <span v-else class="text-caption text-grey">never</span>
          </q-td>
          <q-td auto-width @click.stop>
            <q-btn dense flat round icon="send" size="sm" color="primary" @click="runNow(props.row)">
              <q-tooltip>Send it now</q-tooltip>
            </q-btn>
            <q-btn dense flat round icon="edit" size="sm" @click="openEditor(props.row)">
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn dense flat round icon="delete" size="sm" color="negative" @click="remove(props.row)">
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <q-dialog v-model="editing" persistent>
      <q-card style="width: 640px; max-width: 90vw">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">{{ form.id ? "Edit report" : "New report" }}</div>
          <div class="text-caption text-grey">
            One email. What it contains, how much history it covers, who receives it and when.
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-md">
          <div class="text-caption text-weight-medium text-grey-8 q-mb-xs">REPORT</div>
          <div class="row q-col-gutter-sm q-mb-md">
            <q-input class="col-12" dense outlined v-model="form.name" label="Name" autofocus />
            <q-select
              class="col-12"
              dense
              outlined
              v-model="form.kind"
              :options="kindOptions"
              emit-value
              map-options
              label="Type"
            />
            <q-input
              class="col-12"
              dense
              outlined
              v-model="form.recipients"
              label="Recipients"
              hint="Comma separated"
            />
          </div>

          <div class="text-caption text-weight-medium text-grey-8 q-mb-xs">SCHEDULE</div>
          <div class="row q-col-gutter-sm q-mb-md">
            <q-select
              class="col-6"
              dense
              outlined
              v-model="form.cadence"
              :options="cadenceOptions"
              emit-value
              map-options
              label="How often"
            />
            <q-input class="col-3" dense outlined v-model="form.run_at" label="At" mask="##:##" hint="HH:MM" />
            <q-select
              v-if="form.cadence === 'weekly'"
              class="col-3"
              dense
              outlined
              v-model="form.weekday"
              :options="weekdayOptions"
              emit-value
              map-options
              label="Day"
            />
            <q-input
              v-else-if="form.cadence === 'monthly'"
              class="col-3"
              dense
              outlined
              type="number"
              v-model.number="form.day_of_month"
              label="Date"
              hint="1&ndash;28"
            />
          </div>

          <div class="text-caption text-weight-medium text-grey-8 q-mb-xs">DATA RANGE</div>
          <div class="row q-col-gutter-sm q-mb-md">
            <q-select
              class="col-8"
              dense
              outlined
              v-model="windowPreset"
              :options="windowOptions"
              emit-value
              map-options
              label="How much data it covers"
            />
            <q-input
              v-if="windowPreset === -1"
              class="col-4"
              dense
              outlined
              type="number"
              v-model.number="form.window_hours"
              label="Hours"
              hint="e.g. 72"
            />
            <div v-else class="col-4 flex items-center text-caption text-grey">
              {{ windowPreset === null ? defaultWindowText(form.cadence) : "&nbsp;" }}
            </div>
          </div>

          <div class="text-caption text-weight-medium text-grey-8 q-mb-xs">OPTIONS</div>
          <div class="row items-center q-col-gutter-sm q-mb-sm">
            <q-toggle
              v-if="form.kind === 'activity'"
              class="col-6"
              dense
              v-model="optAllTeams"
              label="All teams"
            />
            <q-toggle
              v-if="form.kind === 'open_tickets'"
              class="col-6"
              dense
              v-model="optIncludeAssigned"
              label="Include assigned tickets"
            />
            <q-toggle
              class="col-6"
              dense
              v-model="optAiSummary"
              :label="form.kind === 'activity' ? 'AI executive summary' : 'AI buckets each ticket'"
            />
          </div>
          <div class="text-caption text-grey q-mb-md">
            {{
              form.kind === "activity"
                ? "Figures are always computed in code; the model only interprets them. Off still sends the report."
                : "Facts are always gathered in code; the model only buckets and words them. Off falls back to deterministic rules."
            }}
          </div>

          <q-input
            dense
            outlined
            autogrow
            type="textarea"
            input-style="min-height:88px"
            v-model="optPromptExtra"
            :disable="!optAiSummary"
            label="Extra instructions for this report"
            hint="Added to the standard prompt — e.g. 'also list every ticket with no reply in 48h', or 'call out anything touching backups'."
          />

          <q-expansion-item
            dense
            dense-toggle
            class="q-mt-sm"
            header-class="text-caption text-primary"
            label="Advanced: replace the standard prompt entirely"
          >
            <q-input
              class="q-mt-xs"
              dense
              outlined
              autogrow
              type="textarea"
              input-style="min-height:120px; font-family: monospace; font-size: 12px"
              v-model="optPrompt"
              :disable="!optAiSummary"
              label="Full prompt override"
              hint="Blank uses the built-in default. Only needed if the extra instructions above are not enough — a full override loses future improvements to the default."
            />
          </q-expansion-item>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="q-px-md">
          <q-toggle dense v-model="form.enabled" label="Enabled" />
          <div>
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn color="primary" label="Save" :loading="saving" @click="save" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import { notifySuccess, notifyError } from "@/utils/notify";
import { formatDate } from "@/utils/format";
import {
  fetchAIReportSchedules,
  saveAIReportSchedule,
  deleteAIReportSchedule,
  runAIReportScheduleNow,
} from "@/api/core";

const BLANK = {
  id: null,
  name: "",
  kind: "activity",
  enabled: true,
  cadence: "daily",
  run_at: "08:00",
  weekday: 0,
  day_of_month: 1,
  window_hours: null,
  recipients: "",
  options: {},
};

export default {
  name: "AIReportSchedules",
  setup() {
    const $q = useQuasar();
    const schedules = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const editing = ref(false);
    const form = ref({ ...BLANK });

    const kindOptions = [
      { label: "Activity report — what happened", value: "activity" },
      { label: "Open-ticket review — what could be done", value: "open_tickets" },
    ];
    const cadenceOptions = [
      { label: "Every day", value: "daily" },
      { label: "Weekdays only (Mon–Fri)", value: "weekdays" },
      { label: "Once a week", value: "weekly" },
      { label: "Once a month", value: "monthly" },
    ];
    const weekdayOptions = [
      { label: "Monday", value: 0 }, { label: "Tuesday", value: 1 },
      { label: "Wednesday", value: 2 }, { label: "Thursday", value: 3 },
      { label: "Friday", value: 4 }, { label: "Saturday", value: 5 },
      { label: "Sunday", value: 6 },
    ];
    const columns = [
      { name: "on", label: "", field: "enabled" },
      { name: "name", label: "Report", field: "name", align: "left" },
      { name: "when", label: "When", field: "cadence", align: "left" },
      { name: "to", label: "To", field: "recipients", align: "left" },
      { name: "last", label: "Last run", field: "last_run", align: "left" },
      { name: "act", label: "", field: "id" },
    ];

    const optAllTeams = computed({
      get: () => form.value.options?.all_teams !== false,
      set: (v) => { form.value.options = { ...(form.value.options || {}), all_teams: v }; },
    });
    const optIncludeAssigned = computed({
      get: () => form.value.options?.include_assigned !== false,
      set: (v) => { form.value.options = { ...(form.value.options || {}), include_assigned: v }; },
    });
    const optAiSummary = computed({
      get: () => form.value.options?.ai_summary !== false,
      set: (v) => { form.value.options = { ...(form.value.options || {}), ai_summary: v }; },
    });
    const optPromptExtra = computed({
      get: () => form.value.options?.prompt_extra || "",
      set: (v) => { form.value.options = { ...(form.value.options || {}), prompt_extra: v }; },
    });
    const optPrompt = computed({
      get: () => form.value.options?.prompt || "",
      set: (v) => { form.value.options = { ...(form.value.options || {}), prompt: v }; },
    });

    // Presets for the usual windows, plus "custom" for anything else (72 hours, say).
    const windowOptions = [
      { label: "Follow the cadence", value: null },
      { label: "Last 24 hours", value: 24 },
      { label: "Last 48 hours", value: 48 },
      { label: "Last 72 hours", value: 72 },
      { label: "Last 7 days", value: 168 },
      { label: "Last 14 days", value: 336 },
      { label: "Last 30 days", value: 720 },
      { label: "Custom (hours)…", value: -1 },
    ];
    const windowPreset = computed({
      get: () => {
        const w = form.value.window_hours;
        if (!w) return null;
        return windowOptions.some((o) => o.value === w) ? w : -1;
      },
      set: (v) => {
        if (v === null) form.value.window_hours = null;
        else if (v === -1) form.value.window_hours = form.value.window_hours || 72;
        else form.value.window_hours = v;
      },
    });

    function defaultWindowText(c) {
      return { daily: "the last 24 hours", weekdays: "the last 24 hours",
               weekly: "the last 7 days", monthly: "the last 30 days" }[c] || "the last 24 hours";
    }
    function windowText(row) {
      const h = row.window_hours_effective || 24;
      return h % 24 === 0 ? `${h / 24} day(s)` : `${h} hour(s)`;
    }
    function cadenceText(row) {
      if (row.cadence === "weekly") {
        return `${weekdayOptions[row.weekday]?.label || "Monday"}s at ${row.run_at}`;
      }
      if (row.cadence === "monthly") return `Day ${row.day_of_month} at ${row.run_at}`;
      if (row.cadence === "weekdays") return `Mon–Fri at ${row.run_at}`;
      return `Daily at ${row.run_at}`;
    }

    async function load() {
      loading.value = true;
      try {
        schedules.value = await fetchAIReportSchedules();
      } catch (e) {
        notifyError("Could not load scheduled reports");
      } finally {
        loading.value = false;
      }
    }

    function openEditor(row) {
      form.value = row ? { ...row, options: { ...(row.options || {}) } } : { ...BLANK };
      editing.value = true;
    }

    async function save() {
      if (!form.value.name?.trim()) return notifyError("Give the report a name");
      if (!form.value.recipients?.trim()) return notifyError("Add at least one recipient");
      saving.value = true;
      try {
        await saveAIReportSchedule(form.value);
        notifySuccess("Saved");
        editing.value = false;
        await load();
      } catch (e) {
        notifyError(e?.response?.data?.detail || "Could not save");
      } finally {
        saving.value = false;
      }
    }

    async function toggle(row, val) {
      try {
        await saveAIReportSchedule({ ...row, enabled: val });
        await load();
      } catch (e) {
        notifyError("Could not change that");
      }
    }

    function remove(row) {
      $q.dialog({
        title: "Delete report",
        message: `Delete "${row.name}"? Reports already sent are unaffected.`,
        cancel: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        try {
          await deleteAIReportSchedule(row.id);
          notifySuccess("Deleted");
          await load();
        } catch (e) {
          notifyError("Could not delete");
        }
      });
    }

    async function runNow(row) {
      try {
        notifySuccess(`Sending "${row.name}"…`);
        const res = await runAIReportScheduleNow(row.id);
        notifySuccess(String(res).slice(0, 160));
        await load();
      } catch (e) {
        notifyError(e?.response?.data?.detail || "Could not send it");
      }
    }

    onMounted(load);

    return {
      schedules, loading, saving, editing, form, columns,
      kindOptions, cadenceOptions, weekdayOptions,
      optAllTeams, optIncludeAssigned, optAiSummary, optPrompt, optPromptExtra,
      windowOptions, windowPreset,
      openEditor, save, toggle, remove, runNow,
      cadenceText, windowText, defaultWindowText, formatDate,
    };
  },
};
</script>
