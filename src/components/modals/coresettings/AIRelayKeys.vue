<template>
  <div class="q-mt-md">
    <settings-section
      dense
      title="pi Relay Keys"
      tip="Lets pi running on ANY computer use this RMM's agent groups: the RMM's provider keys, group config and spend ledger. Sign-in is the RMM username (or email) plus a relay key. One key = one user + one or more groups, so a technician signs in once and switches with /group. Spend is capped per key, across all its groups. The key is shown once; only a hash is stored. Access stops within 30 seconds when a key is revoked or expires, the user is disabled or loses 'Use AI', or its daily/monthly budget is spent."
    >
      <template #action>
        <q-toggle v-model="showRevoked" dense label="Show revoked" class="q-mr-sm" />
        <q-btn dense flat icon="refresh" no-caps label="Refresh" :loading="loading" @click="load" />
        <q-btn dense flat icon="campaign" no-caps label="Email update" @click="updateDialog = true" />
        <q-btn dense flat icon="vpn_key" no-caps label="New key" @click="openNew" />
      </template>
    </settings-section>
    <!-- Nine columns is more than the settings pane can hold: fold the text and drop the
         secondary columns on a narrower screen rather than making the whole tab scroll sideways. -->
    <q-table
      :rows="visibleKeys"
      :columns="columns"
      :visible-columns="visibleColumns"
      row-key="id"
      dense
      flat
      wrap-cells
      hide-bottom
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="No relay keys to show."
    >
      <!-- WHY IT EXISTS AND WHERE IT IS USED (owner, 2026-09-30): a key with only a label and
           "manage.py" / "127.0.0.1" could not be explained. Kept in the Key cell because the
           Label and Last-used columns are hidden on laptop screens. -->
      <template #body-cell-key="props">
        <q-td :props="props" style="white-space: normal; max-width: 380px">
          <div class="row items-center no-wrap">
            <span class="text-weight-medium">{{ props.row.key_hint }}</span>
            <q-btn flat dense round size="xs" class="q-ml-xs" icon="info_outline" @click="openUses(props.row)">
              <q-tooltip>Notes and where this key has been used</q-tooltip>
            </q-btn>
          </div>
          <div v-if="props.row.label">{{ props.row.label }}</div>
          <!-- Details live in the key's window (owner, 2026-09-30); only a MISSING purpose shows here. -->
          <div v-if="!props.row.purpose" class="text-caption text-warning">no purpose recorded</div>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="props.row.active ? 'positive' : 'grey'" :label="props.row.active ? 'active' : props.row.revoked_at ? 'revoked' : 'expired'" />
          <div v-if="props.row.revoked_at" class="text-caption text-grey">
            {{ new Date(props.row.revoked_at).toLocaleString() }}<span v-if="props.row.revoked_by"> by {{ props.row.revoked_by }}</span>
          </div>
        </q-td>
      </template>
      <template #body-cell-spend="props">
        <q-td :props="props">
          <q-badge v-if="props.row.unlimited" color="orange-8" label="Unlimited" class="q-mb-xs" /><br v-if="props.row.unlimited" />
          ${{ (props.row.spend?.today_usd || 0).toFixed(2) }} / {{ cap(props.row.daily_budget_usd) }} today<br />
          ${{ (props.row.spend?.month_usd || 0).toFixed(2) }} / {{ cap(props.row.monthly_budget_usd) }} month
        </q-td>
      </template>
      <template #body-cell-last="props">
        <q-td :props="props">
          {{ props.row.last_used_at ? new Date(props.row.last_used_at).toLocaleString() : "never" }}
          <div class="text-caption text-grey">{{ props.row.last_used_ip }}<span v-if="props.row.uses && props.row.uses.length"> - {{ props.row.uses[0].where }}</span></div>
        </q-td>
      </template>
      <template #body-cell-sent="props">
        <q-td :props="props">
          <template v-if="props.row.install_sent_at">
            {{ new Date(props.row.install_sent_at).toLocaleString() }}
            <div class="text-caption text-grey">to {{ props.row.install_sent_to }} by {{ props.row.install_sent_by }}</div>
          </template>
          <span v-else class="text-grey">never</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn v-if="!props.row.revoked_at" dense flat size="sm" icon="edit" label="Edit" no-caps @click="openEdit(props.row)" />
          <q-btn
            v-if="!props.row.revoked_at"
            dense
            flat
            size="sm"
            color="primary"
            icon="forward_to_inbox"
            label="Send Pi RMM install"
            no-caps
            :disable="!props.row.email_to"
            @click="openSend(props.row)"
          >
            <q-tooltip v-if="!props.row.email_to">No email address on this RMM user - add one first</q-tooltip>
            <q-tooltip v-else>Emails {{ props.row.email_to }} a new key plus setup instructions</q-tooltip>
          </q-btn>
          <q-btn v-if="props.row.active" dense flat size="sm" color="negative" icon="block" label="Revoke" no-caps @click="revoke(props.row)" />
          <q-btn v-if="props.row.revoked_at" dense flat size="sm" color="negative" icon="delete_forever" label="Delete" no-caps @click="purge(props.row)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="newDialog">
      <q-card style="min-width: 460px">
        <q-card-section class="text-subtitle1">New pi relay key</q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.username" outlined dense label="RMM user (username or email)" hint="Blank = you. Issuing for someone else needs Edit Core Settings." />
          <q-select
            v-model="form.group_ids"
            :options="groupOptions"
            emit-value
            map-options
            multiple
            use-chips
            outlined
            dense
            label="Agent groups"
            hint="The key reaches every group selected here; the user switches with /group"
          />
          <q-input v-model="form.label" outlined dense label="Label" placeholder="e.g. Sean laptop" />
          <q-input
            v-model="form.purpose"
            outlined
            dense
            autogrow
            type="textarea"
            label="Purpose (required)"
            placeholder="Who / which computer / why - e.g. Sean's laptop, pi for ticket work"
            hint="Recorded with the key, so anyone can later tell why it exists."
          />
          <q-toggle v-model="form.unlimited" label="Unlimited spend (admins only - for users who manage their own limits)" color="orange-8" />
          <div class="row q-col-gutter-sm">
            <q-input v-if="!form.unlimited" class="col" v-model.number="form.daily_budget_usd" type="number" min="0" outlined dense label="Daily budget $" hint="resets at midnight" />
            <q-input v-if="!form.unlimited" class="col" v-model.number="form.monthly_budget_usd" type="number" min="0" outlined dense label="Monthly budget $" />
            <q-input class="col" v-model.number="form.expires_days" type="number" min="1" outlined dense label="Expires (days)" hint="blank = never" />
          </div>
          <q-input v-model="form.allowed_ips" outlined dense label="Allowed IPs / CIDRs (optional)" placeholder="203.0.113.7, 10.0.0.0/8" />
          <q-toggle v-model="form.send_email" label="Email the key and setup instructions to the user now" color="primary" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Create key" :loading="saving" @click="create" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="usesDialog">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="text-h6">
          {{ usesRow?.key_hint }}<span v-if="usesRow?.label" class="text-subtitle2 text-grey q-ml-sm">{{ usesRow.label }}</span>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-expansion-item default-opened dense dense-toggle icon="notes" label="Notes" header-class="text-weight-medium q-px-none">
            <div class="q-py-xs" :class="usesRow?.purpose ? '' : 'text-warning'">
              {{ usesRow?.purpose || "No purpose recorded - use Edit to say why this key exists." }}
            </div>
            <div class="text-caption text-grey">
              Created {{ usesRow?.created ? new Date(usesRow.created).toLocaleString() : "?" }} by {{ usesRow?.created_by || "unknown" }}
            </div>
            <div v-if="usesRow?.revoked_at" class="text-caption text-grey">
              Revoked {{ new Date(usesRow.revoked_at).toLocaleString() }}<span v-if="usesRow.revoked_by"> by {{ usesRow.revoked_by }}</span>
            </div>
            <div v-if="usesRow?.allowed_ips" class="text-caption text-grey">Only usable from: {{ usesRow.allowed_ips }}</div>
          </q-expansion-item>
          <div class="text-weight-medium q-mt-md q-mb-xs">Where it has been used</div>
          <div v-if="!(usesRow?.uses || []).length" class="text-grey">Never used.</div>
          <q-markup-table v-else dense flat>
            <thead><tr><th class="text-left">From</th><th class="text-left">Where</th><th class="text-left">Client</th><th class="text-right">Seen</th><th class="text-left">First</th><th class="text-left">Last</th></tr></thead>
            <tbody>
              <tr v-for="u in usesRow?.uses || []" :key="u.ip">
                <td>{{ u.ip }}</td><td>{{ u.where }}</td><td>{{ u.client || "-" }}</td><td class="text-right">{{ u.times }}</td>
                <td>{{ new Date(u.first_seen).toLocaleString() }}</td><td>{{ new Date(u.last_seen).toLocaleString() }}</td>
              </tr>
            </tbody>
          </q-markup-table>
          <div class="text-caption text-grey q-mt-sm">"Seen" counts sign-in checks, not individual requests. History is kept from 2026-09-30 (earlier use backfilled from the relay log).</div>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat label="Close" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="updateDialog">
      <q-card style="min-width: 520px">
        <q-card-section class="text-subtitle1">Email an update notice to every relay user</q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="text-body2">
            Sends every active key holder one email telling them to re-run the installer so their pi
            extension is current (the now-serving client is <b>v{{ clientVersion }}</b>).
          </div>
          <q-banner dense class="bg-blue-1 text-blue-10">
            <template #avatar><q-icon name="info" /></template>
            <b>No keys are changed.</b> Nobody has to sign in again and no new key is issued - this is
            only the <code>/rmm-login</code> extension on their computer. Use <b>Send new key</b> on a
            row if you actually want to rotate one.
          </q-banner>
          <div class="text-caption text-grey">
            One email per person, even if they hold several keys. Anyone who already has the current
            version is told so by the installer and nothing changes for them.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Preview (no email)" :loading="updating" @click="doNotifyUpdate(true)" />
          <q-btn color="primary" label="Send to all" :loading="updating" @click="doNotifyUpdate(false)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="sendDialog">
      <q-card style="min-width: 480px">
        <q-card-section class="text-subtitle1">Email Pi setup instructions</q-card-section>
        <q-card-section>
          <div class="text-body2 q-mb-sm">
            Sends <b>{{ send.row.email_to }}</b> ({{ send.row.email || send.row.username }}) a new relay key for
            <b>{{ groupNames(send.row) }}</b>, plus how to install pi and the RMM extension on Windows, macOS and Linux.
          </div>
          <q-banner dense class="bg-orange-2 text-orange-10 q-mb-sm">
            <template #avatar><q-icon name="warning" /></template>
            <b>This replaces the current key.</b> The old key stops working within 30 seconds, so any computer already
            signed in with it must run <code>/rmm-login</code> again with the new key. Nothing else about the key changes
            (same id, same budgets, same spend history).
          </q-banner>
          <div class="text-caption text-grey">
            The key is not shown here - it only goes to the user's email. The email tells them to delete it once they are signed in.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Send new key" :loading="sending" @click="doSend" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="editDialog">
      <q-card style="min-width: 460px">
        <q-card-section class="text-subtitle1">
          Edit {{ edit.key_hint }}
          <div class="text-caption text-grey">{{ edit.email || edit.username }} · {{ groupNames(edit) }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="edit.label" outlined dense label="Label" />
          <q-input v-model="edit.purpose" outlined dense autogrow type="textarea" label="Purpose" hint="Why this key exists: who / which computer / what for" />
          <q-select
            v-model="edit.group_ids"
            :options="groupOptions"
            emit-value
            map-options
            multiple
            use-chips
            outlined
            dense
            label="Agent groups"
            hint="Changing groups needs Edit Core Settings"
          />
          <q-toggle v-model="edit.unlimited" label="Unlimited spend" color="orange-8" />
          <div class="row q-col-gutter-sm">
            <q-input v-if="!edit.unlimited" class="col" v-model.number="edit.daily_budget_usd" type="number" min="0" outlined dense label="Daily budget $" hint="blank = no daily cap" />
            <q-input v-if="!edit.unlimited" class="col" v-model.number="edit.monthly_budget_usd" type="number" min="0" outlined dense label="Monthly budget $" hint="blank = no monthly cap" />
          </div>
          <div class="text-caption text-grey">
            Spent: ${{ (edit.spend?.today_usd || 0).toFixed(2) }} today, ${{ (edit.spend?.month_usd || 0).toFixed(2) }} this month.
            Budget and expiry changes need Edit Core Settings. Changes apply within 30 seconds.
          </div>
          <div class="row q-col-gutter-sm items-center">
            <q-toggle class="col-auto" v-model="edit.never_expires" label="Never expires" />
            <q-input v-if="!edit.never_expires" class="col" v-model.number="edit.expires_days" type="number" min="1" outlined dense label="Expires in (days from now)"
              :hint="edit.expires_at ? 'currently ' + new Date(edit.expires_at).toLocaleDateString() : ''" />
          </div>
          <q-input v-model="edit.allowed_ips" outlined dense label="Allowed IPs / CIDRs" hint="blank = any address" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" :loading="saving" @click="saveEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="shownDialog" persistent>
      <q-card style="min-width: 560px; max-width: 760px">
        <q-card-section class="text-subtitle1">
          <q-icon name="warning" color="warning" /> Copy this key now - it is never shown again
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input :model-value="shown.key" readonly outlined dense label="Relay key" class="keyinput">
            <template #append><q-btn flat dense icon="content_copy" @click="copy(shown.key)" /></template>
          </q-input>
          <div class="text-body2">
            User <b>{{ shown.username }}</b> · group(s) <b>{{ shown.group }}</b>
          </div>
          <div class="text-caption">
            On the computer running pi (Linux / macOS):
            <pre class="keybox q-pa-sm">curl -fsSL {{ relayUrl }}/client/install.sh | bash</pre>
            <div class="q-mt-xs">Windows (PowerShell):</div>
            <pre class="keybox q-pa-sm">irm {{ relayUrl }}/client/install.ps1 | iex</pre>
            <div class="text-grey q-mt-xs">Windows also needs Git for Windows, and Node.js 22.19+ on every platform.</div>
            Then in pi: <code>/rmm-login</code> (username <b>{{ shown.username }}</b> + this key), then one of
            <code v-for="g in shown.slugs" :key="g">/group {{ g }}</code>.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" label="I have copied it" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useQuasar, copyToClipboard } from "quasar";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import { fetchAIAgentGroups, fetchRelayKeys, createRelayKey, editRelayKey, revokeRelayKey, purgeRelayKey, sendRelayInstallKey, notifyRelayUpdate } from "@/api/core";
import { notifySuccess, notifyError } from "@/utils/notify";

export default {
  name: "AIRelayKeys",
  components: { SettingsSection },
  setup() {
    const $q = useQuasar();
    const keys = ref([]);
    const showRevoked = ref(false);
    const groups = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const newDialog = ref(false);
    const shownDialog = ref(false);
    const shown = ref({ key: "", username: "", group: "", slugs: [] });
    const sendDialog = ref(false);
    const sending = ref(false);
    const send = ref({ row: {} });
    const updateDialog = ref(false);
    const updating = ref(false);
    const clientVersion = ref("latest");
    const editDialog = ref(false);
    const edit = ref({});
    let editOriginal = {};
    const form = ref({});
    const relayUrl = computed(() => {
      const base = (window._env_ && window._env_.PROD_URL) || window.location.origin;
      return `${String(base).replace(/\/+$/, "")}/pi/relay/v1`;
    });
    const groupOptions = computed(() => groups.value.map((g) => ({ label: `${g.name} (${g.slug})`, value: g.id })));
    const columns = [
      { name: "key", label: "Key", field: "key_hint", align: "left" },
      { name: "user", label: "User", field: (r) => r.email || r.username, align: "left" },
      { name: "groups", label: "Groups", field: (r) => (r.groups || []).map((g) => g.slug).join(", "), align: "left" },
      { name: "label", label: "Label", field: "label", align: "left" },
      { name: "spend", label: "Spend / budget", field: "spend", align: "left" },
      { name: "last", label: "Last used", field: "last_used_at", align: "left" },
      { name: "sent", label: "Instructions emailed", field: "install_sent_at", align: "left" },
      { name: "status", label: "Status", field: "active", align: "center" },
      { name: "actions", label: "", field: "id", align: "right" },
    ];
    const cap = (v) => (v == null ? "no cap" : `$${v}`);
    // Live column set: identity + state on a laptop, everything on a wide screen.
    const visibleColumns = computed(() =>
      $q.screen.lt.xl
        ? ["key", "user", "groups", "spend", "status", "actions"]
        : ["key", "user", "groups", "label", "spend", "last", "sent", "status", "actions"],
    );
    const groupNames = (row) => (row && row.groups ? row.groups.map((g) => g.name).join(", ") : "");
    // Revoked keys are kept forever as the record of who had access - hidden unless asked for.
    const visibleKeys = computed(() => (showRevoked.value ? keys.value : keys.value.filter((k) => !k.revoked_at)));

    async function load() {
      loading.value = true;
      try {
        const [k, g] = await Promise.all([fetchRelayKeys(), fetchAIAgentGroups()]);
        keys.value = (k && k.keys) || [];
        if (k && k.client_version) clientVersion.value = k.client_version;
        groups.value = Array.isArray(g) ? g : (g && (g.groups || g.results)) || [];
      } catch (e) {
        notifyError("Could not load relay keys");
      } finally {
        loading.value = false;
      }
    }
    function openNew() {
      form.value = { username: "", group_ids: groupOptions.value.length ? [groupOptions.value[0].value] : [], label: "", purpose: "", unlimited: false, daily_budget_usd: 10, monthly_budget_usd: 100, expires_days: null, allowed_ips: "", send_email: true };
      newDialog.value = true;
    }
    async function create() {
      if (!form.value.group_ids || !form.value.group_ids.length) return notifyError("Pick at least one agent group");
      if (!String(form.value.purpose || "").trim()) return notifyError("Say why this key is needed (Purpose)");
      saving.value = true;
      try {
        const payload = { ...form.value };
        delete payload.group_id;
        if (payload.unlimited) {
          delete payload.daily_budget_usd;
          delete payload.monthly_budget_usd;
        }
        for (const k of ["daily_budget_usd", "monthly_budget_usd", "expires_days"]) if (payload[k] === "" || payload[k] == null) delete payload[k];
        delete payload.never_expires;
        const r = await createRelayKey(payload);
        // The API returns `groups` (a list) - reading `row.group` here threw a TypeError AFTER
        // the key had been created and emailed, so the page said "Failed to create key" while
        // the key was live. Never index a field the API does not send.
        const slugs = (r.row.groups || []).map((g) => g.slug);
        shown.value = { key: r.key, username: r.row.email || r.row.username, group: slugs.join(", "), slugs };
        if (payload.send_email) {
          if (r.email && r.email.ok) notifySuccess(`Key also emailed to ${r.email.sent_to}`);
          else notifyError(`Email not sent: ${(r.email && r.email.message) || "unknown error"}`);
        }
        newDialog.value = false;
        shownDialog.value = true;
        await load();
      } catch (e) {
        notifyError(e?.response?.data || "Failed to create key");
      } finally {
        saving.value = false;
      }
    }
    function openSend(row) {
      send.value = { row };
      sendDialog.value = true;
    }
    async function doSend() {
      sending.value = true;
      try {
        const r = await sendRelayInstallKey(send.value.row.id);
        sendDialog.value = false;
        notifySuccess(`New key emailed to ${r.sent_to}. It is active now.`);
        await load();
      } catch (e) {
        notifyError(e?.response?.data || "Could not send the email");
      } finally {
        sending.value = false;
      }
    }
    // "Email update" - tell everyone to re-run the installer. Keys are never touched here; a
    // rotation is the per-row "Send new key" action, and confusing the two would make users
    // think their working key had been replaced.
    async function doNotifyUpdate(dryRun) {
      updating.value = true;
      try {
        const r = await notifyRelayUpdate(dryRun);
        if (r.client_version) clientVersion.value = r.client_version;
        const names = (r.sent || []).map((x) => x.user).join(", ") || "nobody";
        if (r.failed && r.failed.length) {
          notifyError(`Sent to ${(r.sent || []).length}, failed ${r.failed.length} (${r.failed.map((x) => x.user).join(", ")})`);
        } else if (dryRun) {
          notifySuccess(`Would email: ${names}`);
        } else {
          notifySuccess(`Update notice emailed to ${(r.sent || []).length} user(s): ${names}`);
          await load();
        }
        if (!dryRun && !(r.failed && r.failed.length)) updateDialog.value = false;
      } catch (e) {
        notifyError(e?.response?.data || "Could not send the update email");
      } finally {
        updating.value = false;
      }
    }
    const usesDialog = ref(false);
    const usesRow = ref(null);
    function openUses(row) { usesRow.value = row; usesDialog.value = true; }
    function openEdit(row) {
      edit.value = {
        ...row,
        group_ids: (row.groups || []).map((g) => g.id),
        never_expires: !row.expires_at,
        expires_days: null,
      };
      editOriginal = { ...edit.value };
      editDialog.value = true;
    }
    async function saveEdit() {
      const e = edit.value;
      const payload = {};
      if (e.label !== editOriginal.label) payload.label = e.label;
      if ((e.purpose || "") !== (editOriginal.purpose || "")) payload.purpose = e.purpose || "";
      if ((e.allowed_ips || "") !== (editOriginal.allowed_ips || "")) payload.allowed_ips = e.allowed_ips || "";
      const sameGroups =
        e.group_ids.length === editOriginal.group_ids.length && e.group_ids.every((id) => editOriginal.group_ids.includes(id));
      if (!sameGroups) payload.group_ids = e.group_ids;
      const budgetChanged =
        e.unlimited !== editOriginal.unlimited ||
        (!e.unlimited && (e.daily_budget_usd !== editOriginal.daily_budget_usd || e.monthly_budget_usd !== editOriginal.monthly_budget_usd));
      if (budgetChanged) {
        if (e.unlimited) payload.unlimited = true;
        else {
          payload.daily_budget_usd = e.daily_budget_usd === "" ? null : e.daily_budget_usd;
          payload.monthly_budget_usd = e.monthly_budget_usd === "" ? null : e.monthly_budget_usd;
        }
      }
      if (e.never_expires !== editOriginal.never_expires || (!e.never_expires && e.expires_days)) {
        if (e.never_expires) payload.never_expires = true;
        else if (e.expires_days) payload.expires_days = e.expires_days;
      }
      if (!Object.keys(payload).length) {
        editDialog.value = false;
        return;
      }
      saving.value = true;
      try {
        await editRelayKey(e.id, payload);
        notifySuccess("Key updated");
        editDialog.value = false;
        await load();
      } catch (err) {
        notifyError(err?.response?.data || "Failed to update key");
      } finally {
        saving.value = false;
      }
    }
    function purge(row) {
      $q.dialog({
        title: "Delete this key permanently?",
        message: `${row.key_hint} (${row.email || row.username}) is removed from the database for good. Its spend history stays in the ledger, but the record of the key itself is gone. This cannot be undone.`,
        cancel: true,
        persistent: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        try {
          await purgeRelayKey(row.id);
          notifySuccess("Key deleted");
          await load();
        } catch (e) {
          notifyError(e?.response?.data || "Failed to delete");
        }
      });
    }
    function revoke(row) {
      $q.dialog({
        title: "Revoke relay key?",
        message: `${row.key_hint} (${row.email || row.username}, ${groupNames(row)}) stops working within 30 seconds. This cannot be undone.`,
        cancel: true,
        persistent: true,
        ok: { label: "Revoke", color: "negative" },
      }).onOk(async () => {
        try {
          await revokeRelayKey(row.id);
          notifySuccess("Key revoked");
          await load();
        } catch (e) {
          notifyError(e?.response?.data || "Failed to revoke");
        }
      });
    }
    function copy(text) {
      copyToClipboard(text).then(() => notifySuccess("Copied"));
    }
    onMounted(load);
    return { keys, visibleKeys, showRevoked, groupNames, visibleColumns, loading, saving, newDialog, shownDialog, shown, form, relayUrl, groupOptions, columns, cap, load, openNew, create, revoke, copy, sendDialog, sending, send, openSend, doSend, updateDialog, updating, clientVersion, doNotifyUpdate, editDialog, edit, openEdit, saveEdit, purge, usesDialog, usesRow, openUses };
  },
};
</script>

<style scoped>
/* The key/command boxes must stay readable in BOTH themes: light grey on light, dark on dark. */
.keybox {
  background: #f4f4f4;
  color: #24292f;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, Menlo, monospace;
  font-size: 12px;
}
.body--dark .keybox {
  background: #1d1d1d;
  color: #e6e6e6;
  border-color: #444;
}
</style>
