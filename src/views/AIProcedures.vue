<template>
  <div style="height: 100vh; display: flex; flex-direction: column; background: #f5f5f5; padding: 6px; box-sizing: border-box">
    <q-card flat bordered style="width: 100%; flex: 1; display: flex; flex-direction: column; min-height: 0">
      <q-card-section class="bg-primary text-white row items-center q-py-sm">
        <q-icon name="menu_book" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1">Pi.dev AI — Procedures</div>
        <q-space />
        <q-input
          v-model="q"
          dense
          dark
          outlined
          debounce="300"
          placeholder="Search symptom / fix / title…"
          style="max-width: 320px"
          class="q-mr-sm"
          @update:model-value="load"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-btn
          dense
          flat
          no-caps
          :icon="live.running ? 'sync' : 'monitor_heart'"
          :label="live.running ? 'Mining\u2026' : 'Live'"
          :color="live.running ? 'yellow-3' : undefined"
          class="q-mr-sm"
          @click="openLive"
        >
          <q-tooltip>Live mining activity</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="add" class="q-mr-xs" @click="openNew">
          <q-tooltip>Add procedure</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="auto_awesome" class="q-mr-xs" :loading="mining" @click="mine">
          <q-tooltip>Mine closed tickets now</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="refresh" :loading="loading" @click="load" />
      </q-card-section>
      <q-separator />

      <div class="row items-center q-px-md q-py-sm q-gutter-sm">
        <q-select
          v-model="category"
          :options="['', ...categories]"
          dense
          outlined
          options-dense
          label="Category"
          style="min-width: 180px"
          emit-value
          map-options
          @update:model-value="load"
        />
        <q-btn-toggle
          v-model="statusFilter"
          dense
          no-caps
          toggle-color="primary"
          :options="[
            { label: 'All', value: '' },
            { label: 'Draft', value: 'draft' },
            { label: 'Approved', value: 'approved' },
            { label: 'Retired', value: 'retired' },
          ]"
          @update:model-value="load"
        />
        <q-space />
        <div class="text-caption text-grey-7">{{ rows.length }} shown / {{ total }} total</div>
      </div>
      <q-separator />

      <div style="flex: 1; min-height: 0; overflow: auto">
        <q-table
          ref="procTable"
          v-model:pagination="pagination"
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          dense
          :loading="loading"
          hide-bottom
          separator="horizontal"
          class="proc-table"
          @row-dblclick="(e, row) => openEdit(row)"
        >
          <template #body-cell-confidence="props">
            <q-td :props="props">
              <q-badge :color="confColor(props.value)" :label="props.value" />
            </q-td>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.value)" :label="props.value" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn dense flat round size="sm" icon="edit" @click="openEdit(props.row)">
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.status !== 'approved'"
                dense
                flat
                round
                size="sm"
                icon="check_circle"
                color="positive"
                @click="setStatus(props.row, 'approved')"
              >
                <q-tooltip>Approve</q-tooltip>
              </q-btn>
              <q-btn dense flat round size="sm" icon="delete" color="negative" @click="remove(props.row)">
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </div>
    </q-card>

    <!-- editor -->
    <q-dialog v-model="editDialog" persistent>
      <q-card style="width: 840px; max-width: 96vw">
        <q-card-section class="row items-center bg-primary text-white q-py-sm">
          <q-icon name="menu_book" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1">
            {{ edit.id ? "Edit procedure" : "New procedure" }}
            <span v-if="edit.code" class="text-weight-bold q-ml-sm">#{{ edit.code }}</span>
          </div>
          <q-space />
          <q-badge v-if="edit.confidence" :color="confColor(edit.confidence)" class="q-mr-xs" :label="edit.confidence" />
          <q-badge v-if="edit.id" color="white" text-color="primary" :label="'seen ' + (edit.occurrence_count || 1) + '×'" />
        </q-card-section>

        <q-card-section class="scroll q-pt-md" style="max-height: 74vh">
          <q-input v-model="edit.title" outlined dense autogrow label="Title" class="q-mb-md" />
          <div class="row q-col-gutter-md q-mb-md">
            <q-select
              v-model="edit.category"
              class="col-12 col-sm-5"
              outlined
              dense
              label="Category"
              :options="allCategories"
              options-dense
            />
            <q-input
              v-model="edit.applies_to"
              class="col-12 col-sm-7"
              outlined
              dense
              autogrow
              label="Applies to (vendor / app / OS keywords)"
            />
          </div>

          <div class="proc-label">Symptom</div>
          <q-input v-model="edit.symptom" type="textarea" outlined autogrow input-style="min-height:56px" class="q-mb-md" />
          <div class="proc-label">Root cause</div>
          <q-input v-model="edit.root_cause" type="textarea" outlined autogrow input-style="min-height:56px" class="q-mb-md" />
          <div class="proc-label">Fix (steps)</div>
          <q-input v-model="edit.fix" type="textarea" outlined autogrow input-style="min-height:120px" class="q-mb-md" />
          <div class="proc-label">Verification</div>
          <q-input v-model="edit.verification" type="textarea" outlined autogrow input-style="min-height:56px" class="q-mb-md" />

          <q-separator class="q-my-sm" />
          <div class="row q-col-gutter-md items-center">
            <q-select
              v-model="edit.status"
              class="col-12 col-sm-4"
              outlined
              dense
              label="Status"
              :options="['draft', 'approved', 'retired']"
            />
            <div class="col-12 col-sm-8 text-caption text-grey-7">
              <span class="q-mr-md">Origin: <b>{{ edit.origin || "human" }}</b></span>
              <span v-if="edit.updated_by">Last edited by <b>{{ edit.updated_by }}</b></span>
            </div>
          </div>
          <div v-if="(edit.source_ticket_refs || []).length" class="q-mt-md">
            <div class="proc-label">Source tickets</div>
            <div class="row q-gutter-xs">
              <q-badge
                v-for="r in edit.source_ticket_refs"
                :key="r"
                color="blue-grey-2"
                text-color="black"
                :label="r"
              />
            </div>
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions class="row items-center q-px-md">
          <q-btn dense flat round icon="chevron_left" :disable="editIndex <= 0" @click="goPrev">
            <q-tooltip>Previous ({{ editIndex + 1 }} / {{ navList.length }})</q-tooltip>
          </q-btn>
          <div class="text-caption text-grey-7">{{ editIndex + 1 }} / {{ navList.length }}</div>
          <q-btn dense flat round icon="chevron_right" :disable="editIndex >= navList.length - 1" @click="goNext">
            <q-tooltip>Next</q-tooltip>
          </q-btn>
          <q-space />
          <q-btn v-if="edit.id" flat color="negative" icon="delete" label="Delete" @click="acceptDelete" />
          <q-btn v-if="edit.id" flat color="positive" icon="check_circle" label="Accept" @click="acceptNext" />
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- live mining activity -->
    <q-dialog v-model="liveDialog" @hide="onLiveHide">
      <q-card style="width: 820px; max-width: 96vw">
        <q-card-section class="row items-center bg-primary text-white q-py-sm">
          <q-icon :name="live.running ? 'sync' : 'monitor_heart'" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1">Live mining activity</div>
          <q-space />
          <q-badge :color="live.running ? 'green' : 'grey'" :label="live.running ? 'RUNNING' : (live.phase || 'idle')" />
        </q-card-section>
        <q-card-section class="row q-col-gutter-sm text-center q-py-sm">
          <div class="col"><div class="text-h6">{{ live.window || 0 }}</div><div class="text-caption">In window</div></div>
          <div class="col"><div class="text-h6">{{ live.to_mine || 0 }}</div><div class="text-caption">To mine</div></div>
          <div class="col"><div class="text-h6">{{ live.done || 0 }}</div><div class="text-caption">Done</div></div>
          <div class="col"><div class="text-h6">{{ live.procedures_found || 0 }}</div><div class="text-caption">Procedures</div></div>
          <div class="col"><div class="text-h6">{{ live.kb_updates || 0 }}</div><div class="text-caption">KB updates</div></div>
        </q-card-section>
        <div class="q-px-md text-caption text-grey-8" style="min-height: 18px">
          <template v-if="live.current_company">Current company: <b>{{ live.current_company }}</b></template>
        </div>
        <q-separator class="q-mt-sm" />
        <q-card-section class="q-pa-none">
          <div ref="logBox" class="mining-log">
            <div v-for="(l, i) in (live.log || [])" :key="i" class="mining-log-line">
              <span class="text-grey-6">{{ l.t ? l.t.slice(11, 19) : "" }}</span> {{ l.line }}
            </div>
            <div v-if="!(live.log || []).length" class="text-grey-6 q-pa-md">No activity yet. Click “Mine closed tickets now” to start.</div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn
            v-if="live.running"
            flat
            color="negative"
            icon="stop_circle"
            label="Stop"
            :loading="stopping"
            @click="stopMine"
          />
          <q-btn v-else flat :loading="mining" color="primary" icon="auto_awesome" label="Mine now" @click="mine" />
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, onBeforeUnmount, nextTick } from "vue";
import { useQuasar } from "quasar";
import {
  getProcedures,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  mineProceduresNow,
  getMiningStatus,
  stopMining,
} from "@/api/core";

export default defineComponent({
  name: "AIProcedures",
  setup() {
    const $q = useQuasar();
    const rows = ref([]);
    const categories = ref([]);
    const allCategories = ref([]);
    const total = ref(0);
    const loading = ref(false);
    const mining = ref(false);
    const saving = ref(false);
    const q = ref("");
    const category = ref("");
    const statusFilter = ref("");
    const editDialog = ref(false);
    const edit = ref({});
    const editIndex = ref(-1);
    const navList = ref([]);
    const procTable = ref(null);
    const pagination = ref({ rowsPerPage: 0, sortBy: "updated", descending: true });
    const liveDialog = ref(false);
    const live = ref({ running: false, phase: "idle", log: [] });
    const logBox = ref(null);
    const stopping = ref(false);
    let pollTimer = null;
    let headTimer = null;

    const columns = [
      { name: "code", label: "ID", field: "code", align: "left", sortable: true },
      { name: "title", label: "Title", field: "title", align: "left", sortable: true },
      { name: "category", label: "Category", field: "category", align: "left", sortable: true },
      { name: "applies_to", label: "Applies to", field: "applies_to", align: "left" },
      { name: "occurrence_count", label: "Seen", field: "occurrence_count", align: "center", sortable: true },
      { name: "confidence", label: "Confidence", field: "confidence", align: "center", sortable: true },
      { name: "status", label: "Status", field: "status", align: "center", sortable: true },
      { name: "updated", label: "Updated", field: "updated", align: "left", sortable: true,
        format: (v) => (v ? new Date(v).toLocaleString() : "") },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];

    const confColor = (c) => ({ high: "green", medium: "orange", low: "grey" }[c] || "grey");
    const statusColor = (s) => ({ approved: "green", draft: "blue-grey", retired: "grey" }[s] || "grey");

    async function load() {
      loading.value = true;
      try {
        const data = await getProcedures({ q: q.value, category: category.value, status: statusFilter.value });
        rows.value = data.procedures;
        categories.value = data.categories;
        allCategories.value = data.all_categories || data.categories;
        total.value = data.total;
      } catch (e) {
        $q.notify({ type: "negative", message: "Failed to load procedures" });
      } finally {
        loading.value = false;
      }
    }

    // the list in the SAME order the table is currently showing (respects sort + filter)
    function orderedRows() {
      const t = procTable.value;
      return t && t.filteredSortedRows && t.filteredSortedRows.length ? t.filteredSortedRows : rows.value;
    }
    function openNew() {
      edit.value = { title: "", category: "", applies_to: "", symptom: "", root_cause: "", fix: "", verification: "", status: "draft", origin: "human" };
      editIndex.value = -1;
      navList.value = [];
      editDialog.value = true;
    }
    function openEdit(row) {
      navList.value = orderedRows().slice(); // snapshot the on-screen order
      editIndex.value = navList.value.findIndex((r) => r.id === row.id);
      edit.value = { ...row };
      editDialog.value = true;
    }
    function loadAt(i) {
      if (i < 0 || i >= navList.value.length) return;
      editIndex.value = i;
      edit.value = { ...navList.value[i] };
    }
    const goPrev = () => loadAt(editIndex.value - 1);
    const goNext = () => loadAt(editIndex.value + 1);
    const mergeInto = (arr, saved) => { const j = arr.findIndex((r) => r.id === saved.id); if (j >= 0) arr[j] = { ...arr[j], ...saved }; };

    // Accept = approve current, then advance to the next in the displayed order.
    async function acceptNext() {
      const i = editIndex.value;
      try {
        const saved = await updateProcedure(edit.value.id, { ...edit.value, status: "approved" });
        mergeInto(rows.value, saved); mergeInto(navList.value, saved);
      } catch (e) {
        $q.notify({ type: "negative", message: "Approve failed" });
        return;
      }
      if (i < navList.value.length - 1) loadAt(i + 1);
      else editDialog.value = false;
    }
    // Delete = remove current, load whatever now sits at this index (the next one).
    async function acceptDelete() {
      const i = editIndex.value;
      const id = edit.value.id;
      try {
        await deleteProcedure(id);
      } catch (e) {
        $q.notify({ type: "negative", message: "Delete failed" });
        return;
      }
      const rj = rows.value.findIndex((r) => r.id === id);
      if (rj >= 0) rows.value.splice(rj, 1);
      navList.value.splice(i, 1);
      total.value = Math.max(0, total.value - 1);
      if (!navList.value.length) editDialog.value = false;
      else loadAt(Math.min(i, navList.value.length - 1));
    }

    // scroll=true only auto-scrolls the log if you're already near the bottom, so it
    // never yanks the view while you're reading higher up.
    async function pollLive(scroll) {
      try {
        live.value = await getMiningStatus();
        if (scroll) {
          await nextTick();
          const el = logBox.value;
          if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight;
        }
      } catch (e) { /* ignore */ }
    }
    // background heartbeat (button state) - stops while the dialog is open so the two
    // timers never fight each other.
    function startHead() {
      clearInterval(headTimer);
      headTimer = setInterval(() => pollLive(false), 5000);
    }
    async function openLive() {
      liveDialog.value = true;
      clearInterval(headTimer);
      clearInterval(pollTimer);
      await pollLive(false);
      await nextTick();
      if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight; // jump to bottom once on open
      pollTimer = setInterval(() => pollLive(true), 2000);
    }
    function onLiveHide() {
      clearInterval(pollTimer);
      startHead();
    }
    async function stopMine() {
      stopping.value = true;
      try {
        await stopMining();
        $q.notify({ type: "info", message: "Stop requested \u2014 it will finish the current ticket and exit." });
      } finally {
        stopping.value = false;
      }
    }
    // keep the header button's running-state fresh even when the dialog is closed
    pollLive(false);
    startHead();
    onBeforeUnmount(() => { clearInterval(pollTimer); clearInterval(headTimer); });

    async function save() {
      saving.value = true;
      try {
        if (edit.value.id) await updateProcedure(edit.value.id, edit.value);
        else await createProcedure(edit.value);
        editDialog.value = false;
        await load();
        $q.notify({ type: "positive", message: "Saved" });
      } catch (e) {
        $q.notify({ type: "negative", message: "Save failed" });
      } finally {
        saving.value = false;
      }
    }

    async function setStatus(row, status) {
      await updateProcedure(row.id, { ...row, status });
      await load();
    }

    function remove(row) {
      $q.dialog({
        title: "Delete procedure",
        message: `Delete "${row.title}"?`,
        cancel: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        await deleteProcedure(row.id);
        await load();
      });
    }

    async function mine() {
      mining.value = true;
      try {
        await mineProceduresNow();
        $q.notify({ type: "info", message: "Mining started — new procedures will appear shortly. Refresh in a minute." });
      } finally {
        mining.value = false;
      }
    }

    load();
    return {
      rows, categories, allCategories, total, loading, mining, saving, q, category, statusFilter,
      editDialog, edit, editIndex, navList, procTable, pagination, columns, confColor, statusColor,
      liveDialog, live, logBox, openLive, onLiveHide, stopping, stopMine,
      load, openNew, openEdit, goPrev, goNext, acceptNext, acceptDelete, save, setStatus, remove, mine,
    };
  },
});
</script>

<style scoped>
/* readable, aligned labels above each multi-line field */
.proc-label {
  font-size: 12px;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 4px;
}
/* larger, easier-to-read text in the editor's textareas */
:deep(.q-textarea .q-field__native) {
  font-size: 13.5px;
  line-height: 1.5;
}
/* rows are double-clickable to open */
.proc-table :deep(tbody tr) {
  cursor: pointer;
}
/* live mining log */
.mining-log {
  height: 320px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 12px;
}
.mining-log-line {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
