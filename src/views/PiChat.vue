<template>
  <div class="pichat bg-grey-10 text-white">
    <!-- toolbar -->
    <q-toolbar class="bg-grey-9 text-white q-px-sm">
      <q-icon name="smart_toy" size="sm" class="q-mr-sm" />
      <div class="column">
        <div class="text-subtitle2">
          Pi.dev &mdash; {{ hostname || (isMulti ? "multi-machine" : agentId) }}
        </div>
        <div class="text-caption text-grey-5">
          {{ clientSite }}
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="!isDecision"
        flat
        dense
        no-caps
        icon="lan"
        :label="isMulti ? 'Machines' : 'Multi-machine'"
        class="q-mr-sm"
        @click="openMachinesDialog"
      >
        <q-tooltip>
          Work on several machines in one conversation (e.g. cluster two
          Proxmox nodes, or pair a Proxmox server with its Backup Server)
        </q-tooltip>
      </q-btn>
      <q-select
        v-model="selectedModel"
        :options="modelOptions"
        emit-value
        map-options
        dense
        dark
        options-dense
        outlined
        style="min-width: 200px"
        label="Model"
        class="q-mr-sm"
        @update:model-value="onModelChange"
      />
      <q-toggle
        v-if="autoapproveAllowed"
        v-model="autoApprove"
        dense
        color="orange"
        label="Auto-approve"
        class="q-mr-sm"
        @update:model-value="sendAutoApprove"
      />
      <q-toggle
        v-if="isDecision"
        v-model="allowEmail"
        dense
        color="teal"
        label="Allow customer email"
        class="q-mr-sm"
        @update:model-value="sendAllowEmail"
      >
        <q-tooltip>Let Pi send replies to the customer on this ticket. Off = drafts only.</q-tooltip>
      </q-toggle>
      <q-btn
        v-if="!isDecision"
        flat
        dense
        no-caps
        icon="add"
        label="New chat"
        class="q-mr-sm"
        @click="startNewChat"
      />
      <!-- toggle when the role can write; static badge when it can't -->
      <q-toggle
        v-if="mutateAllowed"
        :model-value="!readOnly"
        dense
        color="deep-orange"
        :label="readOnly ? 'Read-only (devices)' : 'Write mode (devices)'"
        class="q-mr-sm"
        @update:model-value="(v) => setReadonly(!v)"
      >
        <q-tooltip>
          Read-only gathers info and proposes fixes without changing the DEVICES in
          this session. Switch to Write mode to let Pi apply changes on the machines.
          Ticket actions (reply to the customer, internal note, create a ticket, KB)
          do not need Write mode — they are approved per call.
        </q-tooltip>
      </q-toggle>
      <q-badge
        v-else-if="readOnly"
        color="blue-grey"
        label="read-only (devices)"
        class="q-mr-sm"
      >
        <q-tooltip>
          This session can only inspect devices. DEVICE changes require an account
          with AI write (mutate) rights. Ticket actions (reply, note, create, KB) are
          unaffected and still available, with approval.
        </q-tooltip>
      </q-badge>
      <q-badge
        :color="connected ? 'green' : 'red'"
        :label="connected ? 'connected' : 'disconnected'"
      />
    </q-toolbar>

    <!-- messages -->
    <div ref="scrollArea" class="pi-messages q-pa-md">
      <div v-for="(msg, i) in messages" :key="i" class="q-mb-md">
        <!-- user -->
        <div v-if="msg.role === 'user'" class="row justify-end">
          <div class="pi-bubble pi-user">{{ msg.text }}</div>
        </div>
        <!-- assistant -->
        <div v-else-if="msg.role === 'assistant'" class="row justify-start">
          <div class="pi-bubble pi-assistant">
            <div v-if="msg.text" class="pi-text">{{ msg.text }}</div>
            <!-- tool cards -->
            <div
              v-for="(tool, ti) in msg.tools"
              :key="ti"
              class="pi-tool q-mt-sm"
            >
              <div class="row items-center">
                <q-icon
                  :name="tool.isError ? 'error' : tool.done ? 'check_circle' : 'play_circle'"
                  :color="tool.isError ? 'red' : tool.done ? 'green' : 'blue'"
                  size="xs"
                  class="q-mr-xs"
                />
                <span class="text-weight-medium">{{ tool.name }}</span>
              </div>
              <pre v-if="tool.args" class="pi-args">{{ tool.args }}</pre>
              <pre v-if="tool.result" class="pi-result">{{ tool.result }}</pre>
            </div>
          </div>
        </div>
        <!-- system/info -->
        <div v-else class="row justify-center">
          <div class="text-caption text-grey-5">{{ msg.text }}</div>
        </div>
      </div>
      <div v-if="streaming" class="row items-center q-gutter-xs q-mt-xs">
        <q-spinner-dots color="primary" />
        <span class="text-caption" :class="stalled ? 'text-orange' : 'text-grey-5'">
          {{ workingText }}
        </span>
        <q-btn
          v-if="stalled"
          dense
          flat
          size="sm"
          color="negative"
          icon="stop"
          label="Stop"
          no-caps
          @click="abort"
        />
      </div>
    </div>

    <!-- multi-machine setup dialog -->
    <q-dialog v-model="machinesDialog">
      <q-card dark class="bg-grey-9" style="width: 700px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="lan" size="sm" class="q-mr-sm" />
          <div class="text-h6">Multi-machine mode</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-caption text-grey-5 q-mb-md">
            Pick the machines for this session and tell Pi what each one is,
            so it knows which machine each step belongs on &mdash; e.g.
            "primary Proxmox node", "second cluster node", "Proxmox Backup
            Server".
          </div>
          <div
            v-for="(row, i) in machineRows"
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
                dark
                mapOptions
                filterable
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="row.role"
                dense
                dark
                outlined
                label="What is this machine? (its role in the job)"
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
                :disable="machineRows.length <= 1"
                @click="removeMachineRow(i)"
              >
                <q-tooltip>Remove this machine</q-tooltip>
              </q-btn>
            </div>
          </div>
          <q-btn
            flat
            dense
            no-caps
            icon="add"
            label="Add machine"
            color="primary"
            :disable="machineRows.length >= 8"
            @click="addMachineRow"
          />
          <div v-if="machinesError" class="text-caption text-red q-mt-sm">
            {{ machinesError }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            no-caps
            :label="isMulti ? 'Apply machines (new chat)' : 'Start multi-machine chat'"
            @click="launchMulti"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- connection lost banner -->
    <q-banner v-if="connectionLost" class="bg-red-9 text-white">
      <template #avatar><q-icon name="wifi_off" /></template>
      Connection to the assistant was lost.
      <template #action>
        <q-btn flat label="Reconnect" @click="reconnect" />
      </template>
    </q-banner>

    <!-- approval banner (queued: parallel/multi-machine turns can raise several) -->
    <q-banner v-if="pendingApproval" class="bg-orange-9 text-white">
      <template #avatar><q-icon name="warning" /></template>
      <span v-if="approvalQueue.length > 1" class="text-weight-bold q-mr-xs">
        ({{ approvalQueue.length }} pending)
      </span>
      Pi wants to run: <strong>{{ pendingApproval.summary }}</strong>
      <template #action>
        <q-btn
          v-if="approvalQueue.length > 1"
          flat
          label="Approve all"
          @click="respondApprovalAll(true)"
        />
        <q-btn flat label="Deny" @click="respondApproval(false)" />
        <q-btn
          flat
          color="white"
          label="Approve"
          @click="respondApproval(true)"
        />
      </template>
    </q-banner>

    <!-- input -->
    <div class="bg-grey-9 q-pa-sm row items-end">
      <q-input
        v-model="input"
        type="textarea"
        autogrow
        dark
        dense
        outlined
        :placeholder="isMulti
          ? 'Tell Pi what to do across these machines...'
          : 'Ask about this device, or tell Pi what to do...'"
        class="col"
        :disable="!connected"
        @keydown.enter.exact.prevent="send"
      />
      <q-btn
        v-if="!streaming"
        color="primary"
        icon="send"
        class="q-ml-sm"
        :disable="!connected || !input.trim()"
        @click="send"
      />
      <q-btn
        v-else
        color="negative"
        icon="stop"
        label="Stop"
        no-caps
        class="q-ml-sm"
        @click="abort"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getBaseUrl } from "@/boot/axios";
import {
  createPiSession,
  saveAIAutoApprove,
  createPiMultiSession,
  decodePiMachines,
  encodePiMachines,
} from "@/api/agents";
import { fetchAITaskRunLive, createDecisionSession } from "@/api/core";
import { useAgentDropdown } from "@/composables/agents";
import { notifyError } from "@/utils/notify";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  name: "PiChat",
  components: { TacticalDropdown },
  setup() {
    const route = useRoute();
    const router = useRouter();
    // Decision (ticket) chat reuses this exact component; it just mints its session
    // from the decision endpoint instead of an agent.
    const decisionToken = route.params.token || null;
    const isDecision = !!decisionToken;
    const agentId = route.params.agent_id;
    const isMulti = agentId === "multi";

    // machines for a multi session, decoded from the ?m= query param
    let multiMachines = [];
    if (isMulti) {
      try {
        multiMachines = decodePiMachines(route.query.m || "");
      } catch (e) {
        multiMachines = [];
      }
    }

    const hostname = ref("");
    const clientSite = ref("");
    const connected = ref(false);
    const streaming = ref(false);
    const messages = ref([]);
    const input = ref("");
    const modelOptions = ref([]);
    const selectedModel = ref(null);
    const autoApprove = ref(false);
    const autoapproveAllowed = ref(false);
    const readOnly = ref(false);
    const allowEmail = ref(true);
    function sendAllowEmail(val) {
      if (ws && connected.value) ws.send(JSON.stringify({ type: "set_allow_email", value: !!val }));
    }
    const mutateAllowed = ref(false);
    const resolveRun = route.query.resolve_run || null;
    let resolveSeeded = false;
    function setReadonly(val) {
      if (ws && connected.value) {
        ws.send(JSON.stringify({ type: "set_readonly", value: !!val }));
      }
    }
    // For an "AI Resolve" session: once ready, pull the run's finding and send a
    // seed prompt asking for read-only fix OPTIONS.
    async function maybeSeedResolve() {
      if (!resolveRun || resolveSeeded) return;
      resolveSeeded = true;
      let finding = "";
      try {
        const data = await fetchAITaskRunLive(resolveRun);
        const r = data?.run || {};
        finding =
          `Summary: ${r.summary || "(none)"}\n\n` +
          `Details / transcript:\n${(r.output || "").slice(0, 8000)}`;
      } catch (e) {
        finding = "(could not load the original finding)";
      }
      const seed =
        "A scheduled AI check on this device reported an issue. DO NOT change " +
        "anything on the device right now — this is a read-only diagnostic. " +
        "Investigate read-only as needed, then give me a few concrete OPTIONS to " +
        "fix it, each with exact steps and pros/cons, so I can choose. " +
        "If you need to apply a fix, tell me and I'll enable write mode.\n\n" +
        "=== FINDING ===\n" +
        finding;
      if (!connected.value) return;
      messages.value.push({ role: "user", text: seed });
      currentIdx = -1;
      streaming.value = true;
      streamStartAt.value = Date.now();
      markActivity();
      ws.send(JSON.stringify({ type: "prompt", message: seed }));
      scrollToBottom();
    }
    // Queue of approval requests. A single turn (especially multi-machine) can
    // fire several gated tool calls in parallel; the bridge sends one
    // approval_request per call, so we must queue them, not overwrite - else
    // the un-shown ones hang forever waiting on approval.
    const approvalQueue = ref([]);
    const pendingApproval = computed(() => approvalQueue.value[0] || null);
    const scrollArea = ref(null);
    const connectionLost = ref(false);

    let ws = null;
    let currentIdx = -1; // index into messages.value for the streaming assistant msg
    let curSessionId = null;

    // --- working/stall watchdog ---------------------------------------------
    const streamStartAt = ref(0);
    const lastActivityAt = ref(0);
    const nowTick = ref(Date.now());
    let tickTimer = null;
    function markActivity() {
      lastActivityAt.value = Date.now();
    }
    const elapsedSec = computed(() =>
      streaming.value && streamStartAt.value
        ? Math.floor((nowTick.value - streamStartAt.value) / 1000)
        : 0,
    );
    const staleSec = computed(() =>
      streaming.value && lastActivityAt.value
        ? Math.floor((nowTick.value - lastActivityAt.value) / 1000)
        : 0,
    );
    // "stalled" = no events at all for 45s while supposedly working
    const stalled = computed(() => staleSec.value >= 45);
    const workingText = computed(() => {
      if (stalled.value)
        return `No response for ${staleSec.value}s — it may be stuck or the provider/device is slow. You can keep waiting or Stop.`;
      return `working… (${elapsedSec.value}s)`;
    });

    function wsBase() {
      const base = getBaseUrl(); // https://api.example.com
      return base.replace(/^http/, "ws");
    }

    async function scrollToBottom() {
      await nextTick();
      const el = scrollArea.value;
      if (el) el.scrollTop = el.scrollHeight;
    }

    // Always return the reactive proxy element (mutating it triggers re-render).
    function ensureAssistant() {
      if (currentIdx < 0 || messages.value[currentIdx]?.done !== false) {
        messages.value.push({ role: "assistant", text: "", tools: [], done: false });
        currentIdx = messages.value.length - 1;
      }
      return messages.value[currentIdx];
    }

    function handleAgentEvent(e) {
      switch (e.type) {
        case "message_start":
          if (e.message?.role === "assistant") {
            messages.value.push({ role: "assistant", text: "", tools: [], done: false });
            currentIdx = messages.value.length - 1;
          }
          break;
        case "message_update": {
          const ev = e.assistantMessageEvent;
          if (!ev) break;
          if (ev.type === "text_delta") {
            const a = ensureAssistant();
            a.text += ev.delta;
            scrollToBottom();
          }
          break;
        }
        case "tool_execution_start": {
          const a = ensureAssistant();
          a.tools.push({
            id: e.toolCallId,
            name: e.toolName,
            args: e.args ? JSON.stringify(e.args, null, 2) : "",
            result: "",
            done: false,
            isError: false,
          });
          scrollToBottom();
          break;
        }
        case "tool_execution_end": {
          const a = currentIdx >= 0 ? messages.value[currentIdx] : null;
          if (a) {
            const t = a.tools.find((x) => x.id === e.toolCallId);
            if (t) {
              t.done = true;
              t.isError = !!e.isError;
              const txt = (e.result?.content || [])
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("\n");
              t.result = txt.length > 4000 ? txt.slice(0, 4000) + "\n...(truncated)" : txt;
            }
          }
          scrollToBottom();
          break;
        }
        case "agent_end":
          if (currentIdx >= 0 && messages.value[currentIdx]) {
            messages.value[currentIdx].done = true;
          }
          streaming.value = false;
          scrollToBottom();
          break;
        case "agent_start":
          streaming.value = true;
          streamStartAt.value = Date.now();
          markActivity();
          break;
        case "auto_retry_start":
          messages.value.push({
            role: "system",
            text: `Provider was busy; retrying (attempt ${e.attempt}/${e.maxAttempts})…`,
          });
          markActivity();
          scrollToBottom();
          break;
        case "auto_retry_end":
          markActivity();
          break;
      }
    }

    function connect({ model_id, resume } = {}) {
      // close any existing
      if (ws) {
        try { ws.close(); } catch (e) { /* noop */ }
        ws = null;
      }
      const create = isDecision
        ? createDecisionSession(decisionToken, { ...(model_id ? { model_id } : {}) })
        : isMulti
        ? createPiMultiSession({
            machines: multiMachines,
            ...(model_id ? { model_id } : {}),
            ...(resume ? { resume_session: resume } : {}),
          })
        : createPiSession(agentId, {
            ...(model_id ? { model_id } : {}),
            ...(resume ? { resume_session: resume } : {}),
            ...(resolveRun ? { read_only: true } : {}),
          });
      create
        .then((data) => {
          hostname.value = data.hostname;
          clientSite.value = `${data.client} / ${data.site}`;
          modelOptions.value = (data.allowed_models || []).map((m) => ({
            label: m.display_name,
            value: m.model_id,
          }));
          selectedModel.value = data.model_id;
          autoapproveAllowed.value = !!data.autoapprove_allowed;
          // The server remembers the operator's Auto-approve choice; render THAT rather
          // than defaulting to off, or a refresh looks like the setting silently died.
          if (data.auto_approve !== undefined) autoApprove.value = !!data.auto_approve;

          const url = `${wsBase()}/pi/ws/${data.token}/`;
          ws = new WebSocket(url);
          ws.onopen = () => {
            connected.value = true;
            connectionLost.value = false;
          };
          ws.onclose = () => {
            connected.value = false;
            // if we were mid-response, surface it instead of silently stopping
            if (streaming.value) {
              connectionLost.value = true;
              messages.value.push({
                role: "system",
                text: "⚠ Connection lost while the assistant was working. Click Reconnect to resume this conversation.",
              });
            }
            streaming.value = false;
          };
          ws.onerror = () => {
            connected.value = false;
          };
          ws.onmessage = (evt) => {
            let m;
            try { m = JSON.parse(evt.data); } catch (e) { return; }
            markActivity();
            if (m.type === "ready") {
              if (m.auto_approve !== undefined) autoApprove.value = !!m.auto_approve;
              curSessionId = m.session_id || curSessionId;
              readOnly.value = !!m.read_only;
              if (m.allow_email !== undefined) allowEmail.value = !!m.allow_email;
              mutateAllowed.value = !!m.mutate_allowed;
              maybeSeedResolve();
              // hydrate history — reconstruct the full transcript INCLUDING the
              // command window (tool calls + their output), not just the text
              // typed by the user and assistant. toolCall blocks live on the
              // assistant message; their output arrives as separate
              // {role:"toolResult", toolCallId, ...} messages that we match back.
              messages.value = [];
              currentIdx = -1;
              const toolById = {};
              (m.history || []).forEach((hm) => {
                if (hm.role === "user") {
                  const txt = typeof hm.content === "string"
                    ? hm.content
                    : (hm.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
                  if (txt) messages.value.push({ role: "user", text: txt });
                } else if (hm.role === "assistant") {
                  const content = Array.isArray(hm.content) ? hm.content : [];
                  const txt = content.filter((c) => c.type === "text").map((c) => c.text).join("");
                  const tools = content
                    .filter((c) => c.type === "toolCall")
                    .map((c) => {
                      const tool = {
                        id: c.id,
                        name: c.name,
                        args: c.arguments ? JSON.stringify(c.arguments, null, 2) : "",
                        result: "",
                        done: true,
                        isError: false,
                      };
                      toolById[c.id] = tool;
                      return tool;
                    });
                  if (txt || tools.length) {
                    messages.value.push({ role: "assistant", text: txt, tools, done: true });
                  }
                } else if (hm.role === "toolResult") {
                  const tool = toolById[hm.toolCallId];
                  if (tool) {
                    const txt = Array.isArray(hm.content)
                      ? hm.content.filter((c) => c.type === "text").map((c) => c.text).join("\n")
                      : (typeof hm.content === "string" ? hm.content : "");
                    tool.result = txt.length > 4000 ? txt.slice(0, 4000) + "\n...(truncated)" : txt;
                    tool.isError = !!hm.isError;
                  }
                }
              });
              scrollToBottom();
            } else if (m.type === "agent_event") {
              handleAgentEvent(m.event);
            } else if (m.type === "approval_request") {
              approvalQueue.value = [...approvalQueue.value, { id: m.id, summary: m.summary }];
              markActivity();
            } else if (m.type === "autoapprove_state") {
              autoApprove.value = m.value;
            } else if (m.type === "readonly_state") {
              readOnly.value = m.value;
            } else if (m.type === "allow_email_state") {
              allowEmail.value = m.value;
              messages.value.push({
                role: "system",
                text: m.value
                  ? "Switched to READ-ONLY mode."
                  : "Switched to WRITE mode — Pi can now apply changes (with approval).",
              });
              scrollToBottom();
            } else if (m.type === "model_changed") {
              selectedModel.value = m.model_id;
              messages.value.push({
                role: "system",
                text: `Switched model to ${m.display}`,
              });
              scrollToBottom();
            } else if (m.type === "error") {
              notifyError(m.message);
              streaming.value = false;
            }
          };
        })
        .catch((err) => {
          notifyError(
            err?.response?.data?.detail ||
              err?.response?.data ||
              "Failed to start Pi session",
          );
        });
    }

    function reconnect() {
      connectionLost.value = false;
      connect({ resume: curSessionId, model_id: selectedModel.value });
    }

    function send() {
      const text = input.value.trim();
      if (!text || !connected.value) return;
      messages.value.push({ role: "user", text });
      currentIdx = -1;
      streaming.value = true;
      streamStartAt.value = Date.now();
      markActivity();
      ws.send(JSON.stringify({ type: "prompt", message: text }));
      input.value = "";
      scrollToBottom();
    }

    function abort() {
      if (ws) ws.send(JSON.stringify({ type: "abort" }));
      streaming.value = false;
    }

    function respondApproval(ok) {
      const cur = approvalQueue.value[0];
      if (cur && ws) {
        ws.send(
          JSON.stringify({
            type: ok ? "approve" : "deny",
            id: cur.id,
          }),
        );
      }
      // pop the one we just answered; the next (if any) shows automatically
      approvalQueue.value = approvalQueue.value.slice(1);
    }

    // Approve everything currently queued (handy for multi-machine turns).
    function respondApprovalAll(ok) {
      if (ws) {
        for (const a of approvalQueue.value) {
          ws.send(JSON.stringify({ type: ok ? "approve" : "deny", id: a.id }));
        }
      }
      approvalQueue.value = [];
    }

    function sendAutoApprove(val) {
      if (ws) ws.send(JSON.stringify({ type: "set_autoapprove", value: val }));
      // Remember it for next time. Without this the toggle is per-socket, so a refresh or a
      // second window starts over - the "sometimes auto-approve does not work" bug.
      saveAIAutoApprove(!!val).catch(() => {
        notifyError("Auto-approve is on for this window, but could not be saved as your default.");
      });
    }

    function onModelChange(val) {
      // switch model on the SAME session (keeps history); only reconnect if the
      // socket is somehow closed.
      if (ws && connected.value) {
        ws.send(JSON.stringify({ type: "set_model", model_id: val }));
      } else {
        connect({ model_id: val });
      }
    }

    function startNewChat() {
      connect({ model_id: selectedModel.value });
    }

    // --- multi-machine setup dialog ----------------------------------------
    const machinesDialog = ref(false);
    const machineRows = ref([]);
    const machinesError = ref("");
    const { agentOptions, getAgentOptions } = useAgentDropdown();

    function openMachinesDialog() {
      machinesError.value = "";
      if (agentOptions.value.length === 0) getAgentOptions();
      if (isMulti && multiMachines.length) {
        machineRows.value = multiMachines.map((m) => ({ ...m }));
      } else if (machineRows.value.length === 0) {
        // seed with the machine we were opened on, plus an empty row to add
        machineRows.value = [
          { agent_id: isMulti ? null : agentId, role: "" },
          { agent_id: null, role: "" },
        ];
      }
      machinesDialog.value = true;
    }

    function addMachineRow() {
      if (machineRows.value.length < 8)
        machineRows.value.push({ agent_id: null, role: "" });
    }

    function removeMachineRow(i) {
      machineRows.value.splice(i, 1);
    }

    function launchMulti() {
      const rows = machineRows.value.filter((r) => r.agent_id);
      if (rows.length < 2) {
        machinesError.value = "Select at least 2 machines (use + to add more).";
        return;
      }
      const ids = rows.map((r) => r.agent_id);
      if (new Set(ids).size !== ids.length) {
        machinesError.value = "The same machine is selected more than once.";
        return;
      }
      const machines = rows.map((r) => ({
        agent_id: r.agent_id,
        role: (r.role || "").trim(),
      }));
      // reload this popup as a fresh multi-machine chat
      const href = router.resolve({
        path: "/pichat/multi",
        query: { m: encodePiMachines(machines) },
      }).href;
      window.location.assign(href);
    }

    onMounted(() => {
      connect({ resume: route.query.resume, model_id: route.query.model });
      tickTimer = setInterval(() => {
        nowTick.value = Date.now();
      }, 1000);
    });
    onBeforeUnmount(() => {
      if (tickTimer) clearInterval(tickTimer);
      if (ws) try { ws.close(); } catch (e) { /* noop */ }
    });

    return {
      agentId,
      isDecision,
      hostname,
      clientSite,
      connectionLost,
      stalled,
      workingText,
      reconnect,
      connected,
      streaming,
      messages,
      input,
      modelOptions,
      selectedModel,
      autoApprove,
      autoapproveAllowed,
      readOnly,
      allowEmail,
      sendAllowEmail,
      mutateAllowed,
      setReadonly,
      pendingApproval,
      approvalQueue,
      respondApprovalAll,
      scrollArea,
      isMulti,
      machinesDialog,
      machineRows,
      machinesError,
      agentOptions,
      openMachinesDialog,
      addMachineRow,
      removeMachineRow,
      launchMulti,
      send,
      abort,
      respondApproval,
      sendAutoApprove,
      onModelChange,
      startNewChat,
    };
  },
};
</script>

<style scoped>
.pichat {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.pi-messages {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}
.pi-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  word-break: break-word;
}
.pi-user {
  background: #1976d2;
  color: #fff;
}
.pi-assistant {
  background: #37474f;
  color: #fff;
}
.pi-text {
  white-space: pre-wrap;
}
.pi-tool {
  background: #263238;
  border-left: 3px solid #42a5f5;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
}
.pi-args,
.pi-result {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 4px 0 0;
  font-family: monospace;
  font-size: 11px;
  color: #cfd8dc;
  max-height: 320px;
  overflow: auto;
}
</style>
