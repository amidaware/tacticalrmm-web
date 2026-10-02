<template>
  <div style="height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; padding: 6px; box-sizing: border-box">
    <q-card flat bordered style="width: 100%; flex: 1; display: flex; flex-direction: column; min-height: 0">
      <q-card-section class="bg-primary text-white row items-center q-py-sm">
        <q-icon name="smart_toy" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1">Pi.dev AI — Ticket Console</div>
        <q-space />
        <q-input
          v-model="filter"
          dense
          dark
          outlined
          debounce="200"
          placeholder="Filter"
          style="max-width: 260px"
          class="q-mr-sm"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-btn dense flat no-caps icon="menu_book" label="Procedures" class="q-mr-sm" @click="openProcedures" />
        <q-btn dense flat round icon="refresh" :loading="loading" @click="load" />
      </q-card-section>
      <q-separator />

      <!-- metrics -->
      <q-card-section class="row q-col-gutter-sm q-py-sm">
        <div v-for="s in stats" :key="s.label" class="col">
          <q-card flat bordered class="text-center q-py-sm" :class="s.bg">
            <div class="text-h6">{{ s.value }}</div>
            <div class="text-caption">{{ s.label }}</div>
          </q-card>
        </div>
      </q-card-section>
      <q-separator />

      <!-- status filter -->
      <div class="row items-center q-px-md q-py-sm">
        <q-btn-toggle
          v-model="statusFilter"
          :options="statusOptions"
          dense
          no-caps
          unelevated
          toggle-color="primary"
          color="grey-3"
          text-color="black"
          size="sm"
        />
        <q-space />
        <div class="text-caption text-grey">{{ displayRows.length }} shown</div>
      </div>
      <q-separator />

      <q-table
        :rows="displayRows"
        :columns="columns"
        row-key="ticket_ref"
        flat
        dense
        style="flex: 1; min-height: 0"
        :loading="loading"
        :filter="filter"
        :pagination="{ rowsPerPage: 25, sortBy: 'updated', descending: true }"
        @row-click="(e, row) => openDetail(row)"
      >
        <template #body-cell-odoo_status="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.odoo_status"
              :color="odooColor(props.row.odoo_status)"
              :label="props.row.odoo_status"
            />
            <span v-else class="text-grey">—</span>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
          </q-td>
        </template>
        <template #body-cell-subject="props">
          <q-td :props="props" style="white-space: normal; word-break: break-word; min-width: 320px">
            {{ props.row.subject }}
          </q-td>
        </template>
        <template #body-cell-assigned_to="props">
          <q-td :props="props">
            <template v-if="!props.row.assigned_to">
              <span class="text-grey">—</span>
            </template>
            <template v-else-if="props.row.assigned_to_bot">
              <q-icon name="smart_toy" size="xs" color="deep-purple" class="q-mr-xs" />Pi (AI)
            </template>
            <template v-else>
              <q-icon name="person" size="xs" color="blue-grey" class="q-mr-xs" />{{ props.row.assigned_to }}
            </template>
          </q-td>
        </template>
        <template #body-cell-classification="props">
          <q-td :props="props">
            <q-icon
              :name="props.row.is_alert ? 'notifications_active' : 'person'"
              size="xs"
              class="q-mr-xs"
              :color="props.row.is_alert ? 'orange' : 'blue-grey'"
            />{{ props.row.classification || "—" }}
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right" @click.stop>
            <q-btn dense flat size="sm" icon="visibility" @click="openDetail(props.row)">
              <q-tooltip>See what the AI did</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.decision_url"
              dense
              flat
              size="sm"
              icon="forum"
              color="primary"
              @click="openConsole(props.row)"
            >
              <q-tooltip>Open the AI chat for this ticket</q-tooltip>
            </q-btn>
            <q-btn
              dense
              flat
              size="sm"
              icon="auto_fix_high"
              color="deep-orange"
              :loading="resolving[props.row.ticket_ref]"
              @click="autoResolve(props.row)"
            >
              <q-tooltip>Ask the AI to attempt an auto-resolve (read-only; writes what it did / what's needed)</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- detail: what the AI did -->
    <q-dialog v-model="detailDialog">
      <q-card style="width: 900px; max-width: 95vw">
        <q-card-section class="row items-center bg-grey-2">
          <q-icon name="smart_toy" color="deep-purple" class="q-mr-sm" />
          <div class="text-subtitle1">{{ detail.ticket_ref }} — {{ detail.subject }}</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="row q-gutter-sm q-mb-sm items-center">
            <q-badge :color="statusColor(detail.status)" :label="statusLabel(detail.status)" />
            <span class="text-caption text-grey">{{ detail.classification }}</span>
            <q-space />
            <q-btn
              v-if="detailRow && detailRow.decision_url"
              dense no-caps size="sm" color="primary" icon="forum" label="Open chat"
              @click="openConsole(detailRow)"
            />
            <q-btn
              dense no-caps size="sm" color="deep-orange" icon="auto_fix_high" label="Auto-resolve"
              :loading="detailRow && resolving[detailRow.ticket_ref]"
              @click="detailRow && autoResolve(detailRow)"
            />
          </div>
          <div v-if="detail.summary" class="q-mb-sm">
            <div class="text-caption text-grey">Summary</div>
            <div>{{ detail.summary }}</div>
          </div>
          <div class="text-caption text-grey q-mb-xs">What the AI did / said</div>
          <div v-if="(detail.messages || []).length === 0" class="text-grey">
            No AI activity recorded yet.
          </div>
          <div
            v-for="(m, i) in detail.messages"
            :key="i"
            class="q-mb-sm q-pa-sm rounded-borders"
            :class="m.role === 'assistant' ? 'bg-deep-purple-1' : 'bg-blue-1'"
          >
            <div class="text-caption text-weight-medium">
              {{ m.role === 'assistant' ? 'Pi' : 'Tech' }}
              <span class="text-grey">{{ m.ts ? " · " + fmt(m.ts) : "" }}</span>
            </div>
            <div style="white-space: pre-wrap">{{ m.content }}</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { getTicketConsole, getTicketConsoleItem, autoResolveTicket } from "@/api/core";
import { notifyError, notifySuccess } from "@/utils/notify";

export default {
  name: "AITicketConsole",
  setup() {
    const rows = ref([]);
    const loading = ref(false);
    const filter = ref("");
    const resolving = ref({});
    const statusFilter = ref("open");
    const TERMINAL = ["cancelled_clean", "cancelled", "closed", "done", "resolved"];
    const statusOptions = [
      { label: "Open", value: "open" },
      { label: "All", value: "all" },
      { label: "Needs input", value: "needs_input" },
      { label: "Actionable", value: "actionable" },
      { label: "Triaged", value: "triaged" },
      { label: "Closed/Cancelled", value: "terminal" },
    ];
    const displayRows = computed(() => {
      const r = rows.value;
      const f = statusFilter.value;
      if (f === "all") return r;
      if (f === "open") return r.filter((x) => !TERMINAL.includes(x.status));
      if (f === "terminal") return r.filter((x) => TERMINAL.includes(x.status));
      if (f === "actionable")
        return r.filter((x) => x.status === "actionable_unassigned" || x.status === "actionable_claimed");
      if (f === "triaged") return r.filter((x) => x.status === "triaged" || x.status === "baseline");
      return r.filter((x) => x.status === f);
    });
    const stats = computed(() => {
      const r = rows.value;
      const c = (fn) => r.filter(fn).length;
      const total = r.length;
      const autoClosed = c((x) => x.status === "cancelled_clean");
      const needsInput = c((x) => x.status === "needs_input");
      const actionable = c((x) => x.status === "actionable_unassigned" || x.status === "actionable_claimed");
      const triaged = c((x) => x.status === "triaged" || x.status === "baseline");
      // Time-saved estimate (minutes). MUST be cumulative/monotonic: the AI triaged &
      // first-passed EVERY tracked ticket, and that work is banked no matter where the
      // ticket later ends up. Crediting only transient states (triaged/actionable/needs-
      // input) made the number DROP as tickets moved to terminal states that credited
      // nothing. Credit every tracked ticket a base triage pass, plus a bonus for the
      // clean alerts the AI fully auto-closed (no human touched them). Both counts only
      // grow, so the estimate never goes backward.
      const mins = total * 4 + autoClosed * 6;
      return [
        { label: "Tracked", value: total, bg: "" },
        { label: "Auto-closed (" + (total ? Math.round((autoClosed * 100) / total) : 0) + "%)", value: autoClosed, bg: "bg-blue-grey-1" },
        { label: "Actionable", value: actionable, bg: "bg-orange-1" },
        { label: "Needs input", value: needsInput, bg: "bg-deep-orange-1" },
        { label: "Triaged", value: triaged, bg: "bg-grey-2" },
        { label: "Est. hrs saved", value: (mins / 60).toFixed(1), bg: "bg-green-1" },
      ];
    });
    const detailDialog = ref(false);
    const detail = ref({});
    const detailRow = ref(null);
    const openProcedures = () =>
      window.open("/ai-procedures", "pi-procedures", "width=1600,height=960,menubar=no,toolbar=no,resizable=yes,scrollbars=yes");

    const columns = [
      { name: "updated", label: "Last worked", field: "updated", align: "left", sortable: true,
        format: (v) => fmt(v) },
      { name: "ticket_ref", label: "Ticket", field: "ticket_ref", align: "left", sortable: true },
      { name: "client", label: "Client", field: "client", align: "left", sortable: true },
      { name: "subject", label: "Subject", field: "subject", align: "left" },
      { name: "assigned_to", label: "Assigned To", field: "assigned_to", align: "left", sortable: true },
      { name: "classification", label: "Type", field: "classification", align: "left", sortable: true },
      { name: "odoo_status", label: "Ticket Status", field: "odoo_status", align: "left", sortable: true },
      { name: "status", label: "AI Status", field: "status", align: "left", sortable: true },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];

    function fmt(v) {
      if (!v) return "";
      try { return new Date(v).toLocaleString(); } catch (e) { return v; }
    }
    function odooColor(s) {
      const k = String(s || "").toLowerCase();
      if (k.includes("cancel")) return "blue-grey";
      if (k.includes("closed")) return "green";
      if (k.includes("progress")) return "teal";
      if (k.includes("new")) return "blue";
      if (k.includes("reopen")) return "deep-orange";
      if (k.includes("hold") || k.includes("wait")) return "orange";
      return "grey";
    }
    function statusColor(s) {
      return {
        cancelled_clean: "blue-grey", cancelled: "blue-grey", closed: "green", done: "green",
        resolved: "green", actionable_claimed: "teal", actionable_unassigned: "orange",
        needs_input: "deep-orange", triaged: "amber", error: "red", baseline: "grey",
      }[s] || "grey";
    }
    function statusLabel(s) {
      return {
        cancelled_clean: "auto-closed (clean alert)", cancelled: "cancelled", closed: "closed",
        done: "done", resolved: "resolved", actionable_claimed: "claimed",
        actionable_unassigned: "actionable", needs_input: "needs input",
        triaged: "triaged", error: "error", baseline: "baseline",
      }[s] || s;
    }

    async function load() {
      loading.value = true;
      try {
        rows.value = await getTicketConsole();
      } catch (e) {
        notifyError("Could not load the ticket console");
      }
      loading.value = false;
    }
    async function openDetail(row) {
      detailRow.value = row;
      detail.value = { ticket_ref: row.ticket_ref, subject: row.subject, status: row.status,
        classification: row.classification, summary: row.summary, messages: [] };
      detailDialog.value = true;
      try {
        detail.value = await getTicketConsoleItem(row.ticket_ref);
      } catch (e) {
        notifyError("Could not load ticket detail");
      }
    }
    function openConsole(row) {
      if (row.decision_url) window.open(row.decision_url, "_blank");
    }
    async function autoResolve(row) {
      resolving.value = { ...resolving.value, [row.ticket_ref]: true };
      try {
        await autoResolveTicket(row.ticket_ref);
        notifySuccess("Auto-resolve started — the AI will post what it did / what's needed. Refresh in a moment.");
      } catch (e) {
        notifyError("Could not start auto-resolve");
      }
      setTimeout(() => {
        resolving.value = { ...resolving.value, [row.ticket_ref]: false };
      }, 20000);
    }

    onMounted(load);
    return {
      rows, loading, filter, columns, resolving,
      statusFilter, statusOptions, displayRows, stats,
      detailDialog, detail, detailRow, openProcedures,
      fmt, odooColor, statusColor, statusLabel, load, openDetail, openConsole, autoResolve,
    };
  },
};
</script>
