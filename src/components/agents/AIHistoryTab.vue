<template>
  <div>
    <div v-if="mode === 'none'" class="q-pa-sm text-grey">
      Select an agent, client, or site to see its AI history.
    </div>
    <div v-else>
      <div class="row items-center q-pa-sm">
        <div class="text-subtitle2">AI History{{ scopeTitle }}</div>
        <q-space />
        <q-btn
          v-if="mode === 'agent'"
          dense
          flat
          icon="add"
          label="New chat"
          no-caps
          color="primary"
          @click="newChat"
        />
        <q-btn dense flat icon="refresh" :loading="loading" @click="load" />
      </div>
      <q-separator />
      <q-expansion-item
        v-if="mode === 'agent'"
        icon="psychology"
        label="Device Memory (AI notes)"
        caption="Durable facts Pi remembers about this device across runs"
        dense
        header-class="text-primary"
      >
        <div class="q-pa-sm">
          <q-input
            v-model="deviceNotes"
            type="textarea"
            outlined
            autogrow
            dense
            :loading="notesLoading"
            input-style="min-height:80px; font-family:monospace; font-size:12px"
            placeholder="No notes yet. Pi saves durable facts here automatically as it works; you can also edit or clear them."
          />
          <div class="row items-center q-mt-xs">
            <div class="text-caption text-grey">Injected into Pi's context on every run on this device.</div>
            <q-space />
            <q-btn dense flat no-caps icon="refresh" label="Reload" @click="loadNotes" />
            <q-btn
              dense
              unelevated
              no-caps
              color="primary"
              icon="save"
              label="Save notes"
              :loading="notesSaving"
              class="q-ml-sm"
              @click="saveNotes"
            />
          </div>
        </div>
      </q-expansion-item>
      <q-separator v-if="mode === 'agent'" />
      <q-table
        class="ai-history-table"
        :rows="rows"
        :columns="columns"
        row-key="key"
        dense
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 0, sortBy: 'when', descending: true }"
        hide-bottom
        :style="{ 'max-height': tabHeight, width: '100%' }"
        virtual-scroll
        table-style="table-layout: fixed; width: 100%"
        @row-dblclick="onRowDblClick"
      >
        <template #body-cell-machine="props">
          <q-td :props="props">
            <q-icon name="dns" size="xs" class="q-mr-xs" />{{ props.row.machine || "—" }}
          </q-td>
        </template>
        <template #body-cell-label="props">
          <q-td :props="props">
            <template v-if="props.row.label">
              <q-icon name="label" size="xs" class="q-mr-xs text-primary" />{{ props.row.label }}
              <q-tooltip v-if="props.row.label.length > 22" max-width="420px" :delay="300">
                {{ props.row.label }}
              </q-tooltip>
            </template>
            <span v-else class="text-grey-6">&mdash;</span>
          </q-td>
        </template>
        <template #body-cell-summary="props">
          <q-td :props="props" class="ai-summary-cell">
            {{ props.row.summary }}
            <q-tooltip
              v-if="(props.row.summary || '').length > 60"
              max-width="500px"
              :delay="300"
            >
              {{ props.row.summary }}
            </q-tooltip>
          </q-td>
        </template>
        <template #body-cell-source="props">
          <q-td :props="props">
            <q-badge :color="sourceColor(props.row.source)" :label="props.row.sourceLabel" />
          </q-td>
        </template>
        <template #body-cell-cost="props">
          <q-td :props="props" class="no-wrap">
            <span v-if="props.row.costTurns" :class="props.row.costRecovered ? 'text-grey-6' : ''">
              {{ money(props.row.cost) }}
              <q-tooltip :delay="300" max-width="360px">
                {{ props.row.costTurns }} billed turn(s)
                <template v-if="props.row.costModels && props.row.costModels.length">
                  &middot; {{ props.row.costModels.join(", ") }}
                </template>
                <br />
                <template v-if="props.row.costRecovered">
                  Recovered from the session transcript, so it is attributed only as
                  well as that file allowed.
                </template>
                <template v-else>Recorded live, as each turn was billed.</template>
              </q-tooltip>
            </span>
            <span v-else class="text-grey-6">&mdash;</span>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.status"
              :color="statusColor(props.row.status)"
              :label="props.row.status"
            />
            <span v-else>—</span>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <!-- Nothing to continue or delete once the transcript is gone: the row is
                 here for the money, which the ledger keeps forever. -->
            <q-badge
              v-if="props.row.deleted"
              color="blue-grey-7"
              label="transcript deleted"
            />
            <q-btn
              v-else-if="props.row.source === 'chat'"
              dense
              flat
              size="sm"
              icon="chat"
              color="primary"
              label="Continue"
              no-caps
              @click="continueChat(props.row)"
            />
            <q-btn
              v-else-if="props.row.source !== 'chat'"
              dense
              flat
              size="sm"
              icon="visibility"
              label="View"
              no-caps
              @click="viewRun(props.row)"
            />
            <q-btn
              v-if="props.row.source === 'chat' && !props.row.deleted"
              dense
              flat
              size="sm"
              icon="delete"
              color="red"
              @click="removeChat(props.row)"
            />
          </q-td>
        </template>
      </q-table>
      <div v-if="rows.length === 0 && !loading" class="q-pa-md text-grey">
        No AI activity yet. Start a chat (Pi.dev), or it will appear here when a
        scheduled task or Bulk AI Command runs.
      </div>
    </div>

    <!-- run transcript dialog -->
    <q-dialog v-model="runDialog">
      <q-card class="pi-run-card">
        <q-bar class="bg-primary text-white">
          <q-icon name="smart_toy" />
          <div>{{ runRow.sourceLabel }}</div>
          <q-space />
          <q-badge v-if="runRow.status" :color="statusColor(runRow.status)" :label="runRow.status" />
          <q-btn
            v-if="runRow.agentId"
            dense
            flat
            no-caps
            icon="auto_fix_high"
            label="AI Resolve"
            class="q-ml-sm"
            @click="aiResolve(runRow)"
          >
            <q-tooltip>
              Open a read-only Pi chat that gathers info and proposes fix options
              for this finding (change nothing until you enable write mode)
            </q-tooltip>
          </q-btn>
          <q-btn dense flat icon="close" v-close-popup class="q-ml-sm" />
        </q-bar>
        <q-card-section class="pi-run-body">
          <div class="text-caption text-grey">
            {{ runRow.machine ? runRow.machine + " · " : "" }}{{ formatTime(runRow.when) }}
          </div>
          <div class="text-weight-medium q-mt-xs pi-run-summary">{{ runRow.summary }}</div>
          <q-separator class="q-my-sm" />
          <pre class="pi-transcript">{{ runRow.output || "(no transcript)" }}</pre>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import {
  fetchPiHistory,
  deletePiHistory,
  runPiChat,
  runPiMultiChat,
} from "@/api/agents";
import {
  fetchAIRunsByAgent,
  fetchAIRunsByScope,
  fetchAIHistoryScope,
  getDeviceNotes,
  saveDeviceNotes,
} from "@/api/core";
import { notifyError, notifySuccess } from "@/utils/notify";

export default {
  name: "AIHistoryTab",
  setup() {
    const store = useStore();
    const selectedAgent = computed(() => store.state.selectedRow);
    const selectedTree = computed(() => store.state.selectedTree || "");
    const tabHeight = computed(() => store.state.tabHeight);
    const rows = ref([]);
    const loading = ref(false);
    const deviceNotes = ref("");
    const notesLoading = ref(false);
    const notesSaving = ref(false);

    async function loadNotes() {
      if (mode.value !== "agent" || !selectedAgent.value) {
        deviceNotes.value = "";
        return;
      }
      notesLoading.value = true;
      try {
        const d = await getDeviceNotes(selectedAgent.value);
        deviceNotes.value = d.notes || "";
      } catch (e) {
        /* non-fatal: leave notes empty */
      }
      notesLoading.value = false;
    }
    async function saveNotes() {
      if (!selectedAgent.value) return;
      notesSaving.value = true;
      try {
        const d = await saveDeviceNotes(selectedAgent.value, deviceNotes.value || "");
        deviceNotes.value = d.notes || "";
        notifySuccess("Device notes saved");
      } catch (e) {
        notifyError("Failed to save device notes");
      }
      notesSaving.value = false;
    }

    // client/site scope derived from the dashboard tree selection
    const scope = computed(() => {
      const t = selectedTree.value;
      if (t.startsWith("Client|")) return { client: t.split("|")[1] };
      if (t.startsWith("Site|")) return { site: t.split("|")[1] };
      return null;
    });
    // agent takes precedence (selecting a tree node clears the selected agent)
    const mode = computed(() =>
      selectedAgent.value ? "agent" : scope.value ? "scope" : "none",
    );
    const scopeTitle = computed(() => {
      if (mode.value !== "scope") return "";
      return scope.value.client ? " — client overview" : " — site overview";
    });

    const columns = computed(() => {
      const cols = [];
      if (mode.value === "scope")
        cols.push({
          name: "machine", label: "Machine", field: "machine", align: "left", sortable: true,
          style: "width: 140px; max-width: 140px", headerStyle: "width: 140px; max-width: 140px",
          classes: "ellipsis",
        });
      cols.push(
        {
          name: "source", label: "Source", field: "sourceLabel", align: "left", sortable: true,
          style: "width: 130px; max-width: 130px", headerStyle: "width: 130px; max-width: 130px",
        },
        {
          // The technician's own name for the chat, set in the Pi window. Sortable and
          // ahead of Summary because it is the column you actually scan when hunting for
          // "that ACD job from Tuesday" - the last-message snippet rarely says.
          name: "label", label: "Label", field: "label", align: "left", sortable: true,
          style: "width: 170px; max-width: 170px", headerStyle: "width: 170px; max-width: 170px",
          classes: "ellipsis",
        },
        {
          // Flexible filler column — must ellipsize so the table never grows wider than the pane
          name: "summary", label: "Summary", field: "summary", align: "left",
          style: "width: auto; max-width: 0", // max-width:0 + table-layout:fixed forces ellipsis
          headerStyle: "width: auto",
          classes: "ai-summary-col",
        },
        {
          name: "user", label: "By", field: "user", align: "left",
          style: "width: 110px; max-width: 110px", headerStyle: "width: 110px; max-width: 110px",
          classes: "ellipsis",
        },
        {
          name: "cost", label: "Cost", field: "cost", align: "right", sortable: true,
          style: "width: 90px; max-width: 90px", headerStyle: "width: 90px; max-width: 90px",
          classes: "no-wrap",
        },
        {
          name: "when", label: "When", field: "when", align: "left", sortable: true,
          style: "width: 150px; max-width: 150px", headerStyle: "width: 150px; max-width: 150px",
          classes: "no-wrap",
        },
        {
          name: "status", label: "Status", field: "status", align: "left",
          style: "width: 90px; max-width: 90px", headerStyle: "width: 90px; max-width: 90px",
        },
        {
          name: "actions", label: "", field: "actions", align: "right",
          style: "width: 160px; max-width: 160px", headerStyle: "width: 160px; max-width: 160px",
          classes: "no-wrap",
        },
      );
      return cols;
    });

    function sourceColor(s) {
      return { chat: "primary", task: "teal", bulk: "deep-purple" }[s] || "grey";
    }
    function statusColor(s) {
      return { ok: "green", warning: "orange", alert: "red", error: "grey", running: "blue" }[s] || "grey";
    }
    // Sub-cent chats are the common case, and rounding them all to "$0.00" makes a
    // column of real money look like a column of nothing.
    function money(v) {
      const n = Number(v || 0);
      if (!n) return "$0.00";
      if (n < 0.01) return `$${n.toFixed(4)}`;
      return `$${n.toFixed(2)}`;
    }

    function formatTime(ts) {
      try {
        return ts ? new Date(ts).toLocaleString() : "";
      } catch (e) {
        return ts;
      }
    }

    function chatRow(s, agentId, machine) {
      return {
        key: "chat:" + s.session_id,
        id: s.session_id,
        agentId,
        machine,
        source: "chat",
        sourceLabel: s.multi ? "Chat (multi)" : "Chat",
        label: s.label || "",
        summary: s.transcript_deleted
          ? "Transcript deleted \u2014 spend kept"
          : s.last_message || s.name || "Chat",
        user: s.user || "",
        when: s.last_activity || s.started,
        status: "",
        multi: !!s.multi,
        machines: s.machines || null,
        // Money comes from the append-only ledger (AISpendEntry), never from the
        // transcript: the transcript is deletable and the bill is not. A conversation
        // whose transcript is gone still appears here with what it cost.
        cost: Number(s.cost || 0),
        costTurns: Number(s.cost_turns || 0),
        costModels: s.cost_models || [],
        costRecovered: !!s.cost_recovered,
        deleted: !!s.transcript_deleted,
      };
    }
    function runRowFrom(r) {
      return {
        key: "run:" + r.id,
        id: r.id,
        run_id: r.run_id,
        agentId: r.device_id || null,
        machine: r.hostname || "",
        source: r.source, // 'task' | 'bulk' | 'scheduled'
        sourceLabel:
          r.source === "bulk" ? `Bulk: ${r.source_name}`
          : r.source === "scheduled" ? `Scheduled: ${r.source_name}`
          : `Task: ${r.source_name}`,
        // Task/bulk/scheduled runs are not interactive, so there is nobody to type a
        // label. Keep the key present so the column renders a dash rather than blank.
        label: "",
        summary: r.summary || "(running…)",
        user: r.triggered_by || "",
        when: r.started_at,
        status: r.status,
        output: r.output,
      };
    }

    async function load() {
      const m = mode.value;
      if (m === "none") {
        rows.value = [];
        return;
      }
      loading.value = true;
      const merged = [];
      try {
        if (m === "agent") {
          const data = await fetchPiHistory(selectedAgent.value);
          (data.sessions || []).forEach((s) => merged.push(chatRow(s, selectedAgent.value, "")));
          const runs = await fetchAIRunsByAgent(selectedAgent.value);
          runs.forEach((r) => merged.push(runRowFrom(r)));
        } else {
          // scope: client/site — aggregate across every machine
          const data = await fetchAIHistoryScope(scope.value);
          (data.sessions || []).forEach((s) =>
            merged.push(chatRow(s, s.agent_id, s.hostname || s.agent_id || "")),
          );
          const runs = await fetchAIRunsByScope(scope.value);
          runs.forEach((r) => merged.push(runRowFrom(r)));
        }
      } catch (e) {
        notifyError("Failed to load AI history");
      }
      merged.sort((a, b) => (b.when || "").localeCompare(a.when || ""));
      rows.value = merged;
      loading.value = false;
      loadNotes();
    }

    function continueChat(row) {
      const agentId = row.agentId || selectedAgent.value;
      if (row.multi && Array.isArray(row.machines) && row.machines.length > 1) {
        runPiMultiChat(
          row.machines.map((m) => ({ agent_id: m.agent_id, role: m.role || "" })),
          { resume: row.id },
        );
      } else if (agentId) {
        runPiChat(agentId, { resume: row.id });
      }
    }
    function newChat() {
      // Explicitly fresh - "New chat" must never carry on the last conversation.
      if (selectedAgent.value) runPiChat(selectedAgent.value, { new: "1" });
    }
    async function removeChat(row) {
      const agentId = row.agentId || selectedAgent.value;
      try {
        await deletePiHistory(agentId, row.id);
        await load();
      } catch (e) {
        notifyError("Failed to delete conversation");
      }
    }

    const runDialog = ref(false);
    const runRow = ref({});
    function viewRun(row) {
      runRow.value = row;
      runDialog.value = true;
    }
    function aiResolve(row) {
      const agentId = row.agentId || selectedAgent.value;
      if (agentId) runPiChat(agentId, { resolve_run: row.run_id });
    }

    function onRowDblClick(_evt, row) {
      if (row.source === "chat") continueChat(row);
      else viewRun(row);
    }

    watch([selectedAgent, selectedTree], () => load());
    onMounted(() => load());

    return {
      mode,
      scopeTitle,
      selectedAgent,
      tabHeight,
      rows,
      loading,
      deviceNotes,
      notesLoading,
      notesSaving,
      loadNotes,
      saveNotes,
      columns,
      sourceColor,
      statusColor,
      money,
      formatTime,
      load,
      continueChat,
      newChat,
      removeChat,
      runDialog,
      runRow,
      viewRun,
      aiResolve,
      onRowDblClick,
    };
  },
};
</script>

<style scoped>
/* Fit the pane: never force horizontal scroll. Fixed layout + ellipsis on Summary. */
.ai-history-table {
  width: 100%;
  max-width: 100%;
}
.ai-history-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}
.ai-history-table :deep(td),
.ai-history-table :deep(th) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-history-table :deep(tbody tr) {
  cursor: pointer;
}
.ai-history-table :deep(.q-table__middle) {
  /* vertical scroll only — horizontal scroll is never wanted here */
  overflow-x: hidden;
  overflow-y: auto;
}
.ai-summary-cell,
.ai-history-table :deep(td.ai-summary-col),
.ai-history-table :deep(.ai-summary-col) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-run-card {
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pi-run-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.pi-run-summary {
  white-space: pre-wrap;
  word-break: break-word;
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
</style>
