<template>
  <div>
    <settings-section
      dense
      title="Agent Groups"
      tip="A group is a team of specialist models for one chat. The orchestrator is what the technician talks to; cheap roles (scout, grep, summarizer) are delegated to so a long ticket does not keep re-sending millions of tokens through the expensive model. The starred group is the default for new chats and outranks the starred Models default. Technicians can switch groups even if they only have access to the default model. Role models can be ANY model the provider currently serves — they do not have to be in the Models table."
    >
      <template #action>
        <q-btn
          dense
          flat
          icon="auto_fix_high"
          label="Create Coding, Coding+ &amp; IT"
          no-caps
          :loading="seeding"
          @click="seedGroups"
        />
        <q-btn dense flat icon="add" label="Add group" no-caps @click="addGroup" />
      </template>
    </settings-section>
    <q-table
      :rows="groups"
      :visible-columns="visibleColumns"
      wrap-cells
      :columns="columns"
      row-key="id"
      dense
      flat
      hide-bottom
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="No agent groups yet. Use Create Coding, Coding+ & IT to seed the recommended teams."
    >
      <template #body-cell-enabled="props">
        <q-td :props="props">
          <q-icon
            :name="props.row.enabled ? 'check_circle' : 'cancel'"
            :color="props.row.enabled ? 'green' : 'grey'"
          />
        </q-td>
      </template>
      <template #body-cell-is_default="props">
        <q-td :props="props">
          <q-icon v-if="props.row.is_default" name="star" color="amber">
            <q-tooltip>Default group — new chats start here, ahead of the Models default</q-tooltip>
          </q-icon>
        </q-td>
      </template>
      <template #body-cell-members="props">
        <q-td :props="props">
          <span class="text-caption">{{ memberSummary(props.row) }}</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat size="sm" icon="edit" @click="editGroup(props.row)" />
          <q-btn
            dense
            flat
            size="sm"
            icon="delete"
            color="red"
            @click="removeGroup(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 720px; max-width: 92vw">
        <q-card-section class="text-subtitle1">
          {{ form.id ? "Edit" : "Add" }} agent group
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-6">
              <q-input v-model="form.name" outlined dense label="Name" />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.kind"
                :options="kindOptions"
                emit-value
                map-options
                outlined
                dense
                label="Kind"
              />
            </div>
          </div>
          <q-input
            v-model="form.description"
            outlined
            dense
            type="textarea"
            autogrow
            label="Description"
          />
          <q-input
            v-model="form.workspace"
            outlined
            dense
            label="Workspace path (optional)"
            hint="Server-side directory. When set, file / grep / coder subagents run there. Leave empty for ticket/IT chats."
          />
          <q-input
            v-model.number="form.auto_summarize_k"
            type="number"
            outlined
            dense
            :min="20"
            :max="1000"
            suffix="k tokens"
            label="Auto-summarize at"
            hint="Chats in this group summarize once their context passes this and the AI has finished. A window's own setting still wins. Default 100k; cheap-to-re-read orchestrators (Luna) can go higher."
            style="max-width: 360px"
          />
          <div class="row q-gutter-md">
            <q-checkbox v-model="form.enabled" label="Enabled" />
            <q-checkbox v-model="form.is_default" label="Default group (outranks Models default)" />
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2">Roles</div>
            <q-space />
            <q-btn dense flat no-caps icon="add" label="Add role" @click="addRole()" />
          </div>
          <div class="text-caption text-grey q-mb-sm">
            Orchestrator is the model the technician talks to. Every other role is yours to
            name — add, rename, or delete freely. Models listed here are everything the
            provider currently serves, not just the Models table.
          </div>
          <div class="q-mb-md">
            <q-chip
              v-for="s in suggestedRoles"
              :key="s.id"
              dense
              clickable
              outline
              size="sm"
              class="q-mr-xs q-mb-xs"
              @click="addRole(s.id)"
            >
              + {{ s.label }}
            </q-chip>
          </div>
          <div
            v-for="(m, idx) in form.members"
            :key="idx"
            class="row items-start q-col-gutter-sm q-mb-sm"
          >
            <div class="col-12 col-md-3">
              <q-input
                v-model="m.role"
                outlined
                dense
                :label="m.role === 'orchestrator' ? 'Role (required)' : 'Role name'"
                :readonly="m.role === 'orchestrator'"
                :hint="m.role === 'orchestrator' ? 'The face of the chat' : ''"
              />
            </div>
            <div class="col-12 col-md-5">
              <q-select
                :model-value="memberModelValue(m)"
                :options="availableOptions"
                emit-value
                map-options
                outlined
                dense
                use-input
                input-debounce="0"
                label="Model"
                :loading="loadingAvailable"
                @filter="filterAvailable"
                @update:model-value="setMemberModel(m, $event)"
              >
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">No model matches</q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="col-10 col-md-3">
              <q-select
                v-model="m.thinking_level"
                :options="thinkingOptionsFor(m)"
                outlined
                dense
                label="Thinking"
                :hint="thinkingHintFor(m)"
              />
            </div>
            <!-- BACKUP MODEL (owner, 2026-09-27): the model this role switches to when its
                 provider refuses outright - quota, billing, auth, a retired model. Retrying the
                 same provider is pointless, so the bridge switches and carries on. Blank = off. -->
            <div class="col-12 col-md-7 q-mt-xs">
              <q-select
                :model-value="fallbackModelValue(m)"
                :options="availableOptions"
                emit-value
                map-options
                outlined
                dense
                clearable
                use-input
                input-debounce="0"
                label="Backup model if the provider refuses (optional)"
                :loading="loadingAvailable"
                @filter="filterAvailable"
                @update:model-value="setFallbackModel(m, $event)"
              >
                <template #no-option>
                  <q-item><q-item-section class="text-grey">No model matches</q-item-section></q-item>
                </template>
                <q-tooltip>
                  Used only for provider refusals (quota, billing, auth, model retired) - a different
                  provider is required, so pick one that is not the model above.
                </q-tooltip>
              </q-select>
            </div>
            <div class="col-2 col-md-1 row no-wrap items-center justify-end">
              <q-btn
                dense
                flat
                round
                :icon="(m.definition || '').trim() ? 'description' : 'note_add'"
                :color="(m.definition || '').trim() ? 'primary' : 'orange'"
                @click="openDefinition(m)"
              >
                <q-tooltip>{{ (m.definition || '').trim() ? 'Edit definition' : 'Definition required' }}</q-tooltip>
              </q-btn>
              <q-btn
                v-if="m.role !== 'orchestrator'"
                dense
                flat
                round
                icon="close"
                color="red"
                @click="removeRole(idx)"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" :loading="saving" @click="saveForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="defDialog">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="text-subtitle1">
          Definition: {{ defMember?.role || "role" }}
        </q-card-section>
        <q-card-section>
          <div class="text-caption text-grey q-mb-sm">
            This is the job description the specialist (and the orchestrator) actually get.
            Say what it does, what it must not do, and what a good answer looks like.
            Custom roles cannot be saved without this.
          </div>
          <q-input
            v-if="defMember"
            v-model="defMember.definition"
            type="textarea"
            outlined
            autogrow
            :input-style="{ minHeight: '180px' }"
            label="What this role does"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" label="Done" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import {
  fetchAIAgentGroups,
  saveAIAgentGroup,
  editAIAgentGroup,
  deleteAIAgentGroup,
  seedAIAgentGroups,
  fetchAvailableAIModels,
} from "@/api/core";
import { notifySuccess, notifyError } from "@/utils/notify";
import SettingsSection from "@/components/ui/SettingsSection.vue";

export default {
  name: "AIAgentGroups",
  components: { SettingsSection },
  setup() {
    const $q = useQuasar();
    const groups = ref([]);
    const roles = ref([]);
    const dialog = ref(false);
    const defDialog = ref(false);
    const defMember = ref(null);
    const saving = ref(false);
    const seeding = ref(false);
    const loadingAvailable = ref(false);
    const availableAll = ref([]);
    const availableFilter = ref("");

    const kindOptions = [
      { label: "Coding", value: "coding" },
      { label: "IT / tickets", value: "it" },
      { label: "Custom", value: "custom" },
    ];

    const emptyForm = () => ({
      id: null,
      name: "",
      description: "",
      kind: "custom",
      workspace: "",
      enabled: true,
      is_default: false,
      auto_summarize_k: 100,
      members: [],
    });
    const form = ref(emptyForm());

    // A laptop's settings pane cannot hold six columns plus a members list; fold the text and
    // drop the optional columns below `lg` so the tab never scrolls sideways.
    const visibleColumns = computed(() =>
      $q.screen.lt.xl
        ? ["name", "kind", "is_default", "enabled", "actions"]
        : ["name", "kind", "members", "auto_summarize_tokens", "is_default", "enabled", "actions"],
    );
    const columns = [
      { name: "name", label: "Name", field: "name", align: "left" },
      { name: "kind", label: "Kind", field: "kind", align: "left" },
      { name: "members", label: "Team", field: "members", align: "left" },
      {
        name: "auto_summarize_tokens",
        label: "Summarize at",
        field: "auto_summarize_tokens",
        align: "right",
        format: (v) => `${Math.round(Number(v || 100000) / 1000)}k`,
      },
      { name: "is_default", label: "Default", field: "is_default", align: "center" },
      { name: "enabled", label: "On", field: "enabled", align: "center" },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];

    const suggestedRoles = computed(() => {
      const have = new Set((form.value.members || []).map((m) => String(m.role || "").toLowerCase()));
      return (roles.value || []).filter((r) => r.id !== "orchestrator" && !have.has(r.id));
    });

    const availableOptions = computed(() => {
      const q = (availableFilter.value || "").toLowerCase();
      return availableAll.value.filter((m) => !q || m.label.toLowerCase().includes(q));
    });

    function memberSummary(row) {
      const ms = row.members || [];
      if (!ms.length) return "—";
      const orch = ms.find((m) => m.role === "orchestrator");
      const rest = ms.filter((m) => m.role !== "orchestrator").map((m) => m.role);
      const head = orch
        ? `${orch.display_name || orch.model_id}`
        : "no orchestrator";
      return rest.length ? `${head} + ${rest.join(", ")}` : head;
    }

    function catalogDefinition(roleId) {
      const hit = (roles.value || []).find((r) => r.id === roleId);
      return (hit && (hit.description || "")) || "";
    }

    function blankMember(role) {
      const name = role || "";
      return {
        role: name,
        provider: "",
        model_id: "",
        display_name: "",
        thinking_level: "medium",
        definition: name ? catalogDefinition(name) : "",
        enabled: true,
      };
    }

    function addRole(preset) {
      const name = String(preset || "").trim();
      if (name && form.value.members.some((m) => m.role === name)) return;
      const row = blankMember(name);
      form.value.members.push(row);
      if (!name || !row.definition) openDefinition(row);
    }

    function openDefinition(m) {
      defMember.value = m;
      defDialog.value = true;
    }

    function removeRole(idx) {
      if (form.value.members[idx]?.role === "orchestrator") return;
      form.value.members.splice(idx, 1);
    }

    function memberModelValue(m) {
      return m.provider && m.model_id ? `${m.provider}/${m.model_id}` : null;
    }

    function fallbackModelValue(m) {
      return m.fallback_provider && m.fallback_model_id ? `${m.fallback_provider}/${m.fallback_model_id}` : null;
    }

    function setFallbackModel(m, value) {
      if (!value) {
        m.fallback_provider = "";
        m.fallback_model_id = "";
        return;
      }
      const hit = availableAll.value.find((x) => x.value === value);
      if (hit) {
        m.fallback_provider = hit.provider;
        m.fallback_model_id = hit.model_id;
      } else {
        const [provider, ...rest] = String(value).split("/");
        m.fallback_provider = provider;
        m.fallback_model_id = rest.join("/");
      }
      // Same thinking level as the primary unless someone sets one deliberately.
      m.fallback_thinking_level = m.fallback_thinking_level || m.thinking_level || "";
    }

    function setMemberModel(m, value) {
      if (!value) {
        m.provider = "";
        m.model_id = "";
        m.display_name = "";
        return;
      }
      const hit = availableAll.value.find((x) => x.value === value);
      if (hit) {
        m.provider = hit.provider;
        m.model_id = hit.model_id;
        m.display_name = hit.display_name || hit.model_id;
      } else {
        const [provider, ...rest] = String(value).split("/");
        m.provider = provider;
        m.model_id = rest.join("/");
        m.display_name = m.model_id;
      }
      m.enabled = true;
      const levels = thinkingLevelsOf(m);
      if (levels && !levels.includes(m.thinking_level)) {
        m.thinking_level = levels.includes("medium") ? "medium" : levels[levels.length - 1];
      }
    }

    const BASE_THINKING = ["off", "minimal", "low", "medium", "high"];
    function thinkingLevelsOf(m) {
      const hit = availableAll.value.find(
        (x) => x.provider === m.provider && x.model_id === m.model_id,
      );
      return hit?.thinking_levels?.length ? hit.thinking_levels : null;
    }
    function thinkingOptionsFor(m) {
      const levels = thinkingLevelsOf(m);
      const opts = levels ? [...levels] : [...BASE_THINKING];
      if (m.thinking_level && !opts.includes(m.thinking_level)) opts.push(m.thinking_level);
      return opts;
    }
    function thinkingHintFor(m) {
      const levels = thinkingLevelsOf(m);
      if (!levels) return "";
      return levels.includes("xhigh") ? "accepts xhigh" : "no xhigh";
    }

    function filterAvailable(val, update) {
      update(() => {
        availableFilter.value = val || "";
      });
    }

    async function loadAvailable() {
      loadingAvailable.value = true;
      try {
        const data = await fetchAvailableAIModels();
        availableAll.value = (data.models || []).map((m) => ({
          value: `${m.provider}/${m.model_id}`,
          label: `${m.display_name || m.model_id}  (${m.provider}/${m.model_id})`,
          provider: m.provider,
          model_id: m.model_id,
          display_name: m.display_name || m.model_id,
          thinking_levels: m.thinking_levels || null,
        }));
      } catch (e) {
        availableAll.value = [];
      }
      loadingAvailable.value = false;
    }

    async function load() {
      try {
        const data = await fetchAIAgentGroups();
        groups.value = data.groups || [];
        roles.value = data.roles || [];
      } catch (e) {
        notifyError(e?.response?.data?.error || String(e));
      }
    }

    function addGroup() {
      form.value = emptyForm();
      form.value.members = [
        {
          role: "orchestrator",
          provider: "",
          model_id: "",
          display_name: "",
          thinking_level: "medium",
          enabled: true,
        },
      ];
      dialog.value = true;
      loadAvailable();
    }

    function editGroup(row) {
      form.value = {
        id: row.id,
        name: row.name,
        description: row.description || "",
        kind: row.kind || "custom",
        workspace: row.workspace || "",
        enabled: row.enabled !== false,
        is_default: !!row.is_default,
        auto_summarize_k: Math.round(Number(row.auto_summarize_tokens || 100000) / 1000),
        members: (row.members || []).map((m) => ({ ...m })),
      };
      dialog.value = true;
      loadAvailable();
    }

    async function saveForm() {
      if (!form.value.name.trim()) {
        notifyError("Name is required");
        return;
      }
      const orch = form.value.members.find((m) => m.role === "orchestrator");
      if (!orch || !orch.provider || !orch.model_id) {
        notifyError("Orchestrator needs a model");
        return;
      }
      const known = new Set((roles.value || []).map((r) => r.id));
      const missingDef = form.value.members.find(
        (m) => m.role && m.role !== "orchestrator" && !known.has(m.role) && !(m.definition || "").trim(),
      );
      if (missingDef) {
        notifyError(`Role '${missingDef.role}' needs a definition. Click the document icon on that row.`);
        openDefinition(missingDef);
        return;
      }
      const k = Math.round(Number(form.value.auto_summarize_k));
      if (!Number.isFinite(k) || k < 20 || k > 1000) {
        notifyError("Auto-summarize must be between 20k and 1000k tokens");
        return;
      }
      saving.value = true;
      const payload = {
        auto_summarize_tokens: k * 1000,
        name: form.value.name.trim(),
        description: form.value.description,
        kind: form.value.kind,
        workspace: form.value.workspace,
        enabled: form.value.enabled,
        is_default: form.value.is_default,
        members: form.value.members.filter((m) => m.role && m.provider && m.model_id),
      };
      try {
        if (form.value.id) await editAIAgentGroup(form.value.id, payload);
        else await saveAIAgentGroup(payload);
        notifySuccess("Agent group saved");
        dialog.value = false;
        await load();
      } catch (e) {
        const err = e?.response?.data;
        notifyError(
          err?.members?.[0] ||
            err?.detail ||
            err?.error ||
            (typeof err === "string" ? err : JSON.stringify(err || e)),
        );
      }
      saving.value = false;
    }

    function removeGroup(row) {
      $q.dialog({
        title: "Delete agent group?",
        message: `Delete "${row.name}"? Chats using it will no longer have that team. This cannot be undone.`,
        cancel: true,
        persistent: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        try {
          await deleteAIAgentGroup(row.id);
          notifySuccess("Agent group deleted");
          await load();
        } catch (e) {
          notifyError(e?.response?.data?.error || String(e));
        }
      });
    }

    async function seedGroups() {
      seeding.value = true;
      try {
        const r = await seedAIAgentGroups(true);
        groups.value = r.groups || [];
        const skip = (r.skipped || []).length
          ? ` (skipped ${r.skipped.length} role(s) — provider key missing)`
          : "";
        notifySuccess(`Coding, Coding+ & IT groups ready${skip}`);
      } catch (e) {
        notifyError(e?.response?.data?.error || String(e));
      }
      seeding.value = false;
    }

    onMounted(load);

    return {
      groups,
      roles,
      dialog,
      defDialog,
      defMember,
      openDefinition,
      form,
      columns,
      visibleColumns,
      kindOptions,
      suggestedRoles,
      availableOptions,
      loadingAvailable,
      saving,
      seeding,
      memberSummary,
      addRole,
      removeRole,
      memberModelValue, fallbackModelValue, setFallbackModel,
      setMemberModel,
      thinkingOptionsFor,
      thinkingHintFor,
      filterAvailable,
      addGroup,
      editGroup,
      saveForm,
      removeGroup,
      seedGroups,
    };
  },
};
</script>
