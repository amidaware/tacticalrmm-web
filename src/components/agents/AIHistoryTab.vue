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
        :style="{ 'max-height': tabHeight }"
        virtual-scroll
        @row-dblclick="onRowDblClick"
      >
        <template #body-cell-machine="props">
          <q-td :props="props">
            <q-icon name="dns" size="xs" class="q-mr-xs" />{{ props.row.machine || "—" }}
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
            <q-btn
              v-if="props.row.source === 'chat'"
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
              v-else
              dense
              flat
              size="sm"
              icon="visibility"
              label="View"
              no-caps
              @click="viewRun(props.row)"
            />
            <q-btn
              v-if="props.row.source === 'chat'"
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
        cols.push({ name: "machine", label: "Machine", field: "machine", align: "left", sortable: true });
      cols.push(
        { name: "source", label: "Source", field: "sourceLabel", align: "left", sortable: true },
        { name: "summary", label: "Summary", field: "summary", align: "left" },
        { name: "user", label: "By", field: "user", align: "left" },
        { name: "when", label: "When", field: "when", align: "left", sortable: true, classes: "no-wrap" },
        { name: "status", label: "Status", field: "status", align: "left" },
        { name: "actions", label: "", field: "actions", align: "right", classes: "no-wrap" },
      );
      return cols;
    });

    function sourceColor(s) {
      return { chat: "primary", task: "teal", bulk: "deep-purple" }[s] || "grey";
    }
    function statusColor(s) {
      return { ok: "green", warning: "orange", alert: "red", error: "grey", running: "blue" }[s] || "grey";
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
        summary: s.last_message || s.name || "Chat",
        user: s.user || "",
        when: s.last_activity || s.started,
        status: "",
        multi: !!s.multi,
        machines: s.machines || null,
      };
    }
    function runRowFrom(r) {
      return {
        key: "run:" + r.id,
        id: r.id,
        run_id: r.run_id,
        agentId: r.device_id || null,
        machine: r.hostname || "",
        source: r.source, // 'task' | 'bulk'
        sourceLabel: r.source === "bulk" ? `Bulk: ${r.source_name}` : `Task: ${r.source_name}`,
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
      if (selectedAgent.value) runPiChat(selectedAgent.value);
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
/* keep rows single-line so the table width is stable and the horizontal
   scrollbar (when needed) is always present and reachable */
.ai-history-table :deep(td) {
  white-space: nowrap;
}
.ai-history-table :deep(tbody tr) {
  cursor: pointer;
}
.ai-history-table :deep(.q-table__middle) {
  overflow: auto;
}
.ai-summary-cell {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
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
