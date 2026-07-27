<template>
  <div>
    <settings-section
      first
      title="Pi.dev AI Assistant"
      tip="Master switches for the AI module. These four toggles take effect only after you press Save at the bottom of this dialog; the Providers and Models tables below save immediately."
    />

    <!-- global toggles -->
    <q-card-section class="row q-gutter-md">
      <q-checkbox
        :model-value="settings.ai_module_enabled"
        label="Enable Pi.dev module"
        @update:model-value="update('ai_module_enabled', $event)"
      />
      <q-checkbox
        :model-value="settings.ai_require_approval"
        label="Require approval for device actions"
        @update:model-value="update('ai_require_approval', $event)"
      />
      <q-checkbox
        :model-value="settings.ai_persist_history"
        label="Persist chat history per device"
        @update:model-value="update('ai_persist_history', $event)"
      />
      <q-checkbox
        :model-value="settings.ai_alerts_only_on_ticket_error"
        label="Only raise RMM alerts when a ticket can't be filed"
        @update:model-value="update('ai_alerts_only_on_ticket_error', $event)"
      >
        <q-tooltip max-width="360px">
          When on, scheduled AI tasks &amp; bulk AI commands do NOT raise a Tactical RMM
          alert on warning/alert findings (tickets are the notification channel). An RMM
          alert is raised ONLY if the AI failed to file its ticket, or the run errored.
        </q-tooltip>
      </q-checkbox>
    </q-card-section>
    <div class="text-caption text-grey q-mb-md">
      Remember to click <strong>Save</strong> below after changing these toggles.
      Providers and models are saved immediately.
    </div>

    <!-- providers -->
    <settings-section
      dense
      title="Providers"
      tip="The AI vendors this server may call, and where each API key is stored. Keys are held server-side and are never sent to the browser. Adding a provider does not enable any model on its own — add the models below."
    >
      <template #action>
        <q-btn dense flat icon="add" label="Add provider" no-caps @click="addProvider" />
      </template>
    </settings-section>
    <q-table
      :rows="providers"
      :columns="providerColumns"
      row-key="id"
      dense
      flat
      hide-bottom
      :pagination="{ rowsPerPage: 0 }"
    >
      <template #body-cell-api_key_set="props">
        <q-td :props="props">
          <q-icon
            :name="props.row.api_key_set ? 'check_circle' : 'cancel'"
            :color="props.row.api_key_set ? 'green' : 'grey'"
          />
        </q-td>
      </template>
      <template #body-cell-enabled="props">
        <q-td :props="props">
          <q-icon
            :name="props.row.enabled ? 'check_circle' : 'cancel'"
            :color="props.row.enabled ? 'green' : 'grey'"
          />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat size="sm" icon="edit" @click="editProvider(props.row)" />
          <q-btn dense flat size="sm" icon="delete" color="red" @click="removeProvider(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- models -->
    <settings-section
      dense
      title="Models"
      tip="The specific models a user can pick. The starred model is the default. Which roles may use which model is set per role in Accounts → Roles → Pi.dev AI."
    >
      <template #action>
        <q-btn
          dense
          flat
          icon="add"
          label="Add model"
          no-caps
          :disable="providers.length === 0"
          @click="addModel"
        />
      </template>
    </settings-section>
    <q-table
      :rows="models"
      :columns="modelColumns"
      row-key="id"
      dense
      flat
      hide-bottom
      :pagination="{ rowsPerPage: 0 }"
    >
      <template #body-cell-enabled="props">
        <q-td :props="props">
          <q-icon :name="props.row.enabled ? 'check_circle' : 'cancel'" :color="props.row.enabled ? 'green' : 'grey'" />
        </q-td>
      </template>
      <template #body-cell-is_default="props">
        <q-td :props="props">
          <q-icon v-if="props.row.is_default" name="star" color="amber" />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat size="sm" icon="edit" @click="editModel(props.row)" />
          <q-btn dense flat size="sm" icon="delete" color="red" @click="removeModel(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- helpdesk / ticketing integration (below providers + models) -->
    <settings-section
      title="Helpdesk / Ticketing Integration"
      tip="How this server talks to your ticketing system: the API endpoint, the plain-English policy for when to ticket, and the JavaScript that performs the operations. Any helpdesk works, because the operations are defined here rather than in the product."
    >
      <template #action>
        <q-btn
          dense
          no-caps
          color="primary"
          icon="smart_toy"
          label="Use AI to Help Create These"
          @click="openAssist"
        />
      </template>
    </settings-section>
    <div class="row q-col-gutter-sm q-mb-sm">
      <div class="col-7">
        <q-input
          :model-value="settings.ai_helpdesk_api_base_url"
          outlined
          dense
          label="Ticketing API base URL (e.g. https://erp.example.com)"
          @update:model-value="update('ai_helpdesk_api_base_url', $event)"
        />
      </div>
      <div class="col-5">
        <q-input
          :model-value="settings.ai_helpdesk_api_key"
          outlined
          dense
          type="password"
          label="Ticketing API key"
          @update:model-value="update('ai_helpdesk_api_key', $event)"
        />
      </div>
    </div>

    <div class="row items-center no-wrap q-mt-sm">
      <div class="text-caption text-weight-medium">Helpdesk Ticket Policy (prompt)</div>
      <info-tip
        text="A prompt, not code — plain English, no syntax to get right. It is injected into every AI session and scheduled run, so an edit here changes behaviour everywhere at once. Saved with the Save button below."
      />
    </div>
    <q-input
      :model-value="settings.ai_helpdesk_prompt"
      type="textarea"
      outlined
      autogrow
      input-style="min-height: 140px"
      label="When/how the AI should ticket, and which operations to call"
      @update:model-value="update('ai_helpdesk_prompt', $event)"
    />
    <div class="text-caption text-grey q-mb-md">
      Natural-language policy: <em>when</em> to open tickets and <em>which operations</em>
      (defined by the code below) to call. Injected into every AI session and scheduled run.
    </div>

    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium">Helpdesk Integration Code (helpdesk.js)</div>
      <info-tip
        text="Real JavaScript, executed server-side on the bridge — the same trust level as the script library, so only users who can edit core settings may change it. This is the deterministic half: the model may only call the operations defined here."
      />
    </div>
    <q-input
      :model-value="settings.ai_helpdesk_code"
      type="textarea"
      outlined
      input-style="min-height: 220px; font-family: monospace; font-size: 12px;"
      label="JavaScript defining exports.operations for your ticketing system"
      @update:model-value="update('ai_helpdesk_code', $event)"
    />
    <div class="text-caption text-grey q-mb-md">
      Deterministic integration for <strong>any</strong> helpdesk/ERP. Define
      <code>exports.operations</code> (e.g. create_ticket, reply_to_ticket, add_note,
      submit_report, resolve_customer), plus optional <code>exports.meta</code> and
      <code>exports.mutating</code>. In scope: <code>helpdesk.baseUrl</code>,
      <code>helpdesk.apiKey</code>, <code>fetch</code>. The API key stays server-side and is
      scrubbed from anything the AI sees. The example targets Odoo/Softhealer &mdash; edit it
      for Zendesk / Freshdesk / etc. Saved with the main <strong>Save</strong> button.
    </div>

    <div class="row items-center q-gutter-sm q-mb-sm">
      <q-btn
        dense
        no-caps
        outline
        color="primary"
        icon="verified_user"
        label="Check capabilities"
        :loading="capsLoading"
        @click="checkCaps"
      />
      <div v-if="caps" class="text-caption">
        <span :class="caps.mode === 'enforce' ? 'text-green' : 'text-orange'">
          {{ caps.mode === "enforce" ? "enforcing" : "warn only" }}</span
        >
        &mdash; {{ caps.total }} operation(s)
      </div>
    </div>
    <q-banner v-if="capsError" dense class="bg-red-1 text-red-9 q-mb-md">
      {{ capsError }}
    </q-banner>
    <q-banner v-else-if="caps && caps.warning" dense class="bg-orange-1 text-orange-9 q-mb-md">
      <template #avatar><q-icon name="warning" /></template>
      {{ caps.warning }}
      <div class="text-caption q-mt-xs">
        Add them to <code>exports.opClasses</code> in the code above, e.g.
        <code>exports.opClasses = { my_op: "create" }</code>. Valid classes: read, create,
        note, knowledge, customer, close, routing.
      </div>
    </q-banner>
    <div v-if="caps && caps.ops && caps.ops.length" class="q-mb-md">
      <div class="text-caption text-grey q-mb-xs">
        What each operation is allowed to do, and where that came from.
        <strong>declared</strong> = tagged in your code (preferred);
        <strong>name-guess</strong> = matched a conventional name in product code;
        <strong>unclassified</strong> = will be denied once enforcing.
      </div>
      <div class="row q-gutter-xs">
        <q-chip
          v-for="o in caps.ops"
          :key="o.op"
          dense
          size="sm"
          :color="!o.class ? 'red-2' : o.source === 'declared' ? 'green-2' : 'amber-2'"
          :title="
            (o.class || 'unclassified') +
            ' \u2014 ' +
            o.source +
            (o.mutating ? ' \u2014 declared mutating' : '')
          "
        >
          {{ o.op }}<span class="text-grey-8">&nbsp;&middot;&nbsp;{{ o.class || "?" }}</span>
        </q-chip>
      </div>
      <div v-if="caps.surfaces" class="text-caption text-grey q-mt-sm">
        Visible per surface:
        <span v-for="(ops, s) in caps.surfaces" :key="s" class="q-mr-sm">
          {{ s }} <strong>{{ ops.length }}</strong>
        </span>
      </div>
    </div>

    <settings-section
      title="Ticket Automation (pilot)"
      tip="Autonomous triage of open tickets. Two separate scopes govern it: what the AI may READ (triage and comment on) and what it may ACT on. Anything outside the act-on lists is look-only."
    >
      <template #action>
        <q-toggle
          :model-value="settings.ai_ticket_automation_enabled"
          label="Enabled (master switch)"
          left-label
          @update:model-value="update('ai_ticket_automation_enabled', $event)"
        />
      </template>
    </settings-section>
    <div class="row items-center q-mb-xs">
      <q-toggle
        :model-value="settings.ai_ticket_act_on_alerts"
        label="Act on alerts (cancel non-actionable, claim actionable)"
        color="deep-orange"
        @update:model-value="update('ai_ticket_act_on_alerts', $event)"
      />
      <info-tip
        text="Applies to alert tickets only, and only for clients listed under 3 below. Off = alerts are triaged and noted but never cancelled or claimed."
      />
    </div>
    <div class="text-caption text-grey q-mb-sm">
      Autonomous ticket triage. The poller lists open tickets via the
      <code>list_open_tickets</code> operation in the integration code above (works with any
      helpdesk), applies the scope limiter, and triages each new in-scope ticket.
      <strong>Phase 1 = shadow mode:</strong> the AI only classifies and posts a staff-only
      internal note of what it <em>would</em> do &mdash; it never closes, replies, or touches devices.
    </div>

    <!-- Granular, no-JSON scope controls (these read/write ai_ticket_scope under the hood) -->
    <div class="row items-center no-wrap q-mt-xs">
      <div class="text-caption text-weight-medium text-primary">1 &middot; What the AI READS (triage scope)</div>
      <info-tip
        text="Reading is triage only: the AI classifies the ticket and posts an internal note with a chat link. Widening this is low-risk — it never changes a device or emails a customer on the strength of reading alone."
      />
    </div>
    <q-toggle
      :model-value="scopeBool('look_at_all_unassigned', false)"
      label="Read &amp; triage EVERY open, unassigned / bot-owned ticket"
      @update:model-value="setScopeBool('look_at_all_unassigned', $event)"
    />
    <q-select
      v-if="!scopeBool('look_at_all_unassigned', false)"
      :model-value="scopeList('work_regular_ticket_if_requester_domain_in')"
      multiple
      use-input
      use-chips
      hide-dropdown-icon
      new-value-mode="add-unique"
      outlined
      dense
      class="q-mb-xs"
      label="…otherwise only read tickets from these requester email domains (type + Enter)"
      @update:model-value="setScopeList('work_regular_ticket_if_requester_domain_in', $event)"
    />
    <q-toggle
      :model-value="scopeBool('always_look_at_alerts', true)"
      label="Always read alert tickets (regardless of the domain list)"
      @update:model-value="setScopeBool('always_look_at_alerts', $event)"
    />
    <div class="text-caption text-grey q-mb-sm">
      <strong>Reading</strong> = triage only: the AI classifies the ticket and posts an internal note
      plus a chat link. It never changes a device or emails a customer just from reading.
    </div>

    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium text-primary">2 &middot; How the AI RECOGNIZES an alert ticket</div>
      <info-tip
        text="How a machine-generated alert is told apart from a human ticket — by subject prefix or sending domain. This only classifies; what may be done with an alert is set by the act-on lists in 3 and by the Act-on-alerts toggle above."
      />
    </div>
    <q-select
      :model-value="alertList('subject_starts_with')"
      multiple
      use-input
      use-chips
      hide-dropdown-icon
      new-value-mode="add-unique"
      outlined
      dense
      class="q-mb-xs"
      label="Alert subject prefixes (e.g. [Alert]) — type + Enter"
      @update:model-value="setAlertList('subject_starts_with', $event)"
    />
    <q-select
      :model-value="alertList('from_email_domains')"
      multiple
      use-input
      use-chips
      hide-dropdown-icon
      new-value-mode="add-unique"
      outlined
      dense
      class="q-mb-sm"
      label="Alert sender email domains (monitoring / backup senders)"
      @update:model-value="setAlertList('from_email_domains', $event)"
    />

    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium text-primary">3 &middot; What the AI may ACT on (auto-manage)</div>
      <info-tip
        text="The consequential list: cancelling, claiming, touching a device, emailing a customer. Everything not named here stays look-only. Start with one or two trusted clients and widen once you have read the notes it leaves."
      />
    </div>
    <q-select
      :model-value="scopeList('auto_action_domains')"
      multiple
      use-input
      use-chips
      hide-dropdown-icon
      new-value-mode="add-unique"
      outlined
      dense
      class="q-mb-xs"
      label="Auto-action requester email domains (cancel / claim / fix / reply)"
      @update:model-value="setScopeList('auto_action_domains', $event)"
    />
    <q-select
      :model-value="scopeList('auto_action_clients')"
      multiple
      use-input
      use-chips
      hide-dropdown-icon
      new-value-mode="add-unique"
      outlined
      dense
      label="Auto-action client names (covers infra / monitoring alerts with no requester)"
      @update:model-value="setScopeList('auto_action_clients', $event)"
    />
    <div class="text-caption text-grey q-mb-sm">
      Anything NOT listed here is <strong>look-only</strong>: the AI triages it and leaves a note + a
      chat link for a human, but never auto-cancels, touches a device, or emails the customer.
      Start with one or two trusted clients. Enter <code>*</code> in either field to mean
      <strong>EVERYONE / everything</strong> (auto-manage all clients &mdash; use only when you're ready).
    </div>

    <q-expansion-item dense dense-toggle icon="code" label="Advanced: raw scope JSON" class="q-mb-md">
      <q-input
        :model-value="settings.ai_ticket_scope"
        type="textarea"
        outlined
        autogrow
        input-style="min-height: 90px; font-family: monospace; font-size: 12px;"
        @update:model-value="update('ai_ticket_scope', $event)"
      />
    </q-expansion-item>

    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium">Ticket Triage Policy (prompt)</div>
      <info-tip
        text="Deployment-specific classification rules: your stages, your alert patterns, worked examples. A prompt, so it can be adjusted for any ticketing system without a code change."
      />
    </div>
    <q-input
      :model-value="settings.ai_ticket_triage_prompt"
      type="textarea"
      outlined
      autogrow
      input-style="min-height: 120px"
      label="How to classify YOUR tickets: what's a clean alert vs actionable, what to draft"
      @update:model-value="update('ai_ticket_triage_prompt', $event)"
    />
    <div class="text-caption text-grey q-mb-md">
      Deployment-specific triage rules (stages, alert patterns, examples). Like the policy
      above, this is a prompt &mdash; adjust it on the fly for any ticketing system.
    </div>

    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium">Decision-Chat Policy (prompt)</div>
      <info-tip
        text="Governs the ticket chat where a technician works a ticket alongside the AI. The dynamic parts — the ticket itself, resolved context, per-turn approvals — are added automatically. Blank uses the built-in default."
      />
    </div>
    <q-input
      :model-value="settings.ai_ticket_decision_prompt"
      type="textarea"
      outlined
      autogrow
      input-style="min-height: 160px"
      label="How the AI behaves in the 'Johnny 5 Need Input!' decision chat (routing, completion, device-fix/email rules)"
      @update:model-value="update('ai_ticket_decision_prompt', $event)"
    />
    <div class="text-caption text-grey q-mb-md">
      Governs the ticket <strong>chat</strong> where a tech works a ticket with the AI: closing/
      routing rules, the completion policy (review + customer reply), device‑fix and email guidance.
      The dynamic bits (ticket, resolved context, per‑turn approvals) are added automatically.
      Edit freely &mdash; leave blank to use the built‑in default.
    </div>

    <settings-section
      title="Model Catalog Watch"
      tip="Re-reads what each enabled provider actually offers and compares it with last time, so a model retired upstream raises a ticket instead of failing silently on the next scheduled run."
    >
      <template #action>
        <q-toggle
          :model-value="settings.ai_model_catalog_enabled"
          label="Enabled"
          @update:model-value="update('ai_model_catalog_enabled', $event)"
        />
      </template>
    </settings-section>
    <div class="text-caption text-grey q-mb-sm">
      Providers add and retire models without notice. On a schedule this re-reads what each
      enabled provider actually offers and compares it with what it saw last time. Newly
      available models are reported so you can attach them; a model you have
      <strong>configured</strong> that has disappeared upstream raises a ticket, because every
      task pointed at it will start failing. The ticket itself is produced by
      <code>report_model_changes</code> in your helpdesk code &mdash; wording and routing are
      yours to change without touching the product.
    </div>
    <div class="row q-col-gutter-md items-center q-mb-sm">
      <q-input
        class="col-4"
        type="number"
        dense
        outlined
        :model-value="settings.ai_model_catalog_interval_hours"
        label="Check every (hours)"
        :disable="!settings.ai_model_catalog_enabled"
        @update:model-value="update('ai_model_catalog_interval_hours', Number($event))"
      />
      <div class="col-auto">
        <q-btn
          outline
          color="primary"
          icon="sync"
          label="Check now"
          :loading="catalogChecking"
          @click="runCatalogRefresh"
        />
      </div>
      <div class="col text-caption text-grey">
        <span v-if="settings.ai_model_catalog_checked">
          Last checked {{ new Date(settings.ai_model_catalog_checked).toLocaleString() }}
        </span>
        <span v-else>Never checked &mdash; the first run records a baseline only.</span>
      </div>
    </div>

    <div class="row q-col-gutter-md items-center q-mb-sm">
      <q-toggle
        class="col-auto"
        :model-value="settings.ai_model_autoregister"
        label="Make newly released models usable automatically"
        @update:model-value="update('ai_model_autoregister', $event)"
      />
      <div class="col text-caption text-grey">
        When a provider starts offering a model the installed AI runtime does not know yet, it
        is registered with the runtime so it can be selected the same day &mdash; instead of
        waiting for a runtime upgrade. The model id is verified with the provider first.
      </div>
    </div>

    <settings-section
      title="Scheduled Reports"
      tip="Reports are data, not code: add as many as you want, at any cadence — daily, weekdays, weekly or monthly — each with its own window, recipients and options. Use + to add one, the send icon to fire it immediately, and the toggle to park one without deleting it."
    />
    <AIReportSchedules />

    <settings-section
      title="AI Runtime Updates"
      tip="Upgrading the AI runtime restarts the bridge, which would drop live chats. So it runs only inside the window you set here and only once nothing is in flight, and it rolls back automatically if the new version fails its compatibility probe."
    >
      <template #action>
        <q-toggle
          :model-value="settings.ai_runtime_update_enabled"
          label="Enabled"
          @update:model-value="update('ai_runtime_update_enabled', $event)"
        />
      </template>
    </settings-section>
    <div class="text-caption text-grey q-mb-sm">
      Updating the AI runtime restarts the bridge, which would drop live chats and in-flight
      background work. So it only runs (1) inside the window you choose here, and (2) once
      nothing is running &mdash; if the system is busy it keeps waiting and re-checks until the
      window closes. The new version is checked for compatibility with this deployment before
      the restart, and is <b>rolled back automatically</b> if it fails that check or if the
      bridge does not come back healthy.
    </div>
    <div class="row q-col-gutter-md items-start q-mb-sm">
      <q-input
        class="col-2"
        dense
        outlined
        mask="##:##"
        hint="Start time (server time)"
        :model-value="settings.ai_runtime_update_time"
        label="Window start"
        :disable="!settings.ai_runtime_update_enabled"
        @update:model-value="update('ai_runtime_update_time', $event)"
      />
      <q-input
        class="col-2"
        type="number"
        dense
        outlined
        hint="Keep waiting for idle for this long"
        :model-value="settings.ai_runtime_update_max_wait_minutes"
        label="Window length (min)"
        :disable="!settings.ai_runtime_update_enabled"
        @update:model-value="update('ai_runtime_update_max_wait_minutes', Number($event))"
      />
      <q-input
        class="col-3"
        dense
        outlined
        hint="Blank = every day. Else weekdays, Mon=0 (e.g. 0,3)"
        :model-value="settings.ai_runtime_update_days"
        label="Days"
        :disable="!settings.ai_runtime_update_enabled"
        @update:model-value="update('ai_runtime_update_days', $event)"
      />
      <q-input
        class="col-3"
        dense
        outlined
        hint="'latest', or pin a version e.g. 0.82.1"
        :model-value="settings.ai_runtime_update_target"
        label="Target version"
        :disable="!settings.ai_runtime_update_enabled"
        @update:model-value="update('ai_runtime_update_target', $event)"
      />
    </div>
    <div class="row q-col-gutter-md items-center q-mb-sm">
      <div class="col-auto">
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Check version"
          :loading="runtimeLoading"
          @click="loadRuntimeStatus"
        />
      </div>
      <div class="col-auto">
        <q-btn
          outline
          color="warning"
          icon="system_update"
          label="Update now"
          :loading="runtimeUpdating"
          :disable="!runtime?.update_available"
          @click="runRuntimeUpdate"
        />
        <q-tooltip>
          Ignores the time window. Still refuses while work is in flight, still probes
          compatibility, still rolls back on failure.
        </q-tooltip>
      </div>
      <div class="col text-caption">
        <div v-if="runtime">
          <span class="text-grey">Installed</span>
          <b>&nbsp;{{ runtime.installed || "unknown" }}</b>
          <span class="text-grey">&nbsp;&middot; available&nbsp;</span>
          <b>{{ runtime.latest || "?" }}</b>
          <q-badge v-if="runtime.update_available" color="orange" class="q-ml-sm">
            update available
          </q-badge>
          <q-badge v-else color="green" class="q-ml-sm">up to date</q-badge>
          <q-badge v-if="runtime.busy" color="blue-grey" class="q-ml-sm">
            busy &mdash; would wait
          </q-badge>
          <div v-if="runtime.busy && busyReason" class="text-grey">
            In flight now: {{ busyReason }}
          </div>
          <div v-if="runtime.last_run" class="text-grey">
            Last attempt {{ new Date(runtime.last_run).toLocaleString() }} &mdash;
            {{ runtime.last_result }}
          </div>
          <div v-if="runtime.latest_error" class="text-negative">
            Could not reach the package registry: {{ runtime.latest_error }}
          </div>
        </div>
        <span v-else class="text-grey">Version status unavailable (is the bridge running?)</span>
      </div>
    </div>

    <settings-section
      title="Alert Verifiers (prove it before acting)"
      tip="Runs before the model is ever called: a verifier gathers read-only evidence from the device and rules on the alert in code, not by AI. A proven-harmless alert is closed without costing an AI call; a proven-real one is pinned open so nothing later dismisses it."
    >
      <template #action>
        <q-toggle
          :model-value="settings.ai_verifiers_enabled"
          label="Enabled"
          @update:model-value="update('ai_verifiers_enabled', $event)"
        />
      </template>
    </settings-section>
    <div class="text-caption text-grey q-mb-sm">
      Machine-generated alerts often describe a non-problem &mdash; and just as often hide a real
      one. Deciding from the alert <em>text</em> is guesswork, so a verifier goes and looks at the
      device instead: it gathers read-only evidence and rules on it in <strong>code</strong>, never
      by AI. This runs <em>before</em> the model, so a proven-harmless alert is closed without
      costing an AI call, and a proven-real one is pinned open so nothing can dismiss it later.
    </div>
    <q-toggle
      :model-value="settings.ai_verifiers_dry_run"
      label="Dry run (report what it would do, change nothing)"
      :disable="!settings.ai_verifiers_enabled"
      @update:model-value="update('ai_verifiers_dry_run', $event)"
    />
    <div class="text-caption text-grey q-mb-sm">
      Leave this <strong>on</strong> for any new rule. It still inspects the device and posts an
      internal note saying what it <em>would</em> decide, so a rule can be proven safe on real
      tickets before it is allowed to close anything.
    </div>

    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium">Verifier Rules (verifiers.js)</div>
      <info-tip
        text="Real JavaScript, run before the model. Adding a new alert type is a rule here, not a code change. Use Check rules to validate them and Dry-run test to try one against a live ticket without changing it."
      />
    </div>
    <q-input
      :model-value="settings.ai_verifier_code"
      type="textarea"
      outlined
      input-style="min-height: 220px; font-family: monospace; font-size: 12px;"
      label="JavaScript defining exports.verifiers = [ ... ]"
      :disable="!settings.ai_verifiers_enabled"
      @update:model-value="update('ai_verifier_code', $event)"
    />
    <div class="text-caption text-grey q-mb-sm">
      Each rule declares: <code>name</code>, <code>match(ticket)</code> (which alerts it owns),
      <code>host(ticket)</code> (which machine holds the truth), <code>script</code> (read-only
      evidence to gather), and <code>verdict(evidence)</code> returning
      <code>noise</code> / <code>actionable</code> / <code>human</code>. Optional:
      <code>enabled:false</code> to park a rule, <code>shell</code>
      (<code>/bin/bash</code>&nbsp;|&nbsp;<code>powershell</code>&nbsp;|&nbsp;<code>cmd</code>),
      <code>identity</code> (how that kind of box states its own FQDN), <code>timeout</code>.
      Adding a new alert type is a rule here &mdash; no code change. Saved with
      <strong>Save</strong>.
    </div>

    <div class="row q-col-gutter-sm items-start q-mb-sm">
      <div class="col-auto">
        <q-btn
          outline
          color="primary"
          icon="rule"
          label="Check rules"
          :loading="verifierLinting"
          :disable="!settings.ai_verifiers_enabled"
          @click="checkVerifiers"
        />
      </div>
      <div class="col">
        <q-input
          v-model="verifierTestRef"
          dense
          outlined
          label="Test on a real ticket (e.g. TICKET/12345)"
          :disable="!settings.ai_verifiers_enabled"
          @keyup.enter="runVerifierTest"
        />
      </div>
      <div class="col-auto">
        <q-btn
          outline
          color="secondary"
          icon="biotech"
          label="Dry-run test"
          :loading="verifierTesting"
          :disable="!settings.ai_verifiers_enabled"
          @click="runVerifierTest"
        />
        <q-tooltip>
          Inspects the device read-only and shows the verdict. Always a dry run &mdash; a test can
          never change a ticket.
        </q-tooltip>
      </div>
    </div>

    <q-banner v-if="verifierLintError" dense class="bg-orange-1 text-orange-10 q-mb-sm">
      <template #avatar><q-icon name="warning" /></template>
      {{ verifierLintError }}
    </q-banner>

    <q-markup-table v-if="verifierRules.length" flat bordered dense class="q-mb-sm">
      <thead>
        <tr>
          <th class="text-left">Rule</th>
          <th class="text-left">State</th>
          <th class="text-left">Shell</th>
          <th class="text-left">Evidence</th>
          <th class="text-left">Problems</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in verifierRules" :key="r.index">
          <td class="text-left">{{ r.name }}</td>
          <td class="text-left">
            <q-badge :color="r.enabled ? 'positive' : 'grey-6'">
              {{ r.enabled ? "in service" : "parked" }}
            </q-badge>
          </td>
          <td class="text-left"><code>{{ r.shell }}</code></td>
          <td class="text-left">{{ r.script_lines }} lines, {{ r.timeout }}s</td>
          <td class="text-left">
            <span v-if="!r.problems.length" class="text-positive">&mdash;</span>
            <span v-else class="text-negative">{{ r.problems.join("; ") }}</span>
          </td>
        </tr>
      </tbody>
    </q-markup-table>

    <q-card v-if="verifierTestResult" flat bordered class="q-mb-md">
      <q-card-section class="q-pb-xs">
        <div v-if="verifierTestResult.error" class="text-negative">
          {{ verifierTestResult.error }}
        </div>
        <div v-else-if="!verifierTestResult.matched" class="text-grey-8">
          No rule claimed this ticket &mdash; it would go through normal triage untouched.
        </div>
        <div v-else>
          <div class="row items-center q-gutter-sm">
            <q-badge :color="verdictColor(verifierTestResult.action)">
              {{ verdictText(verifierTestResult.action) }}
            </q-badge>
            <span class="text-caption text-grey-8">{{ verifierTestResult.verifier }}</span>
            <q-badge outline color="grey-7">dry run &mdash; nothing changed</q-badge>
          </div>
          <div class="text-caption q-mt-sm">
            <div v-if="verifierTestResult.host">
              <b>Host inspected:</b> <code>{{ verifierTestResult.host }}</code>
              <span v-if="verifierTestResult.agent_client">
                &mdash; proven to belong to <b>{{ verifierTestResult.agent_client }}</b>
              </span>
              <q-badge
                v-if="verifierTestResult.identified_by === 'fqdn_probe'"
                outline
                color="primary"
                class="q-ml-xs"
              >
                identified by asking the box its own FQDN
              </q-badge>
            </div>
            <div v-if="verifierTestResult.reason" class="q-mt-xs">
              <b>Why:</b> {{ verifierTestResult.reason }}
            </div>
          </div>
          <pre
            v-if="verifierTestResult.detail"
            class="q-mt-sm q-pa-sm bg-grey-2"
            style="white-space: pre-wrap; font-size: 11px; max-height: 260px; overflow: auto"
            >{{ verifierTestResult.detail }}</pre
          >
        </div>
      </q-card-section>
    </q-card>

    <settings-section
      title="AI Procedures (knowledge mining)"
      tip="A library of reusable, helpdesk-agnostic procedures (symptom → cause → fix → verify) distilled from how tickets actually get closed, then matched back into later runs. Browse, edit and approve them under Tools → AI Procedures."
    />
    <div class="text-caption text-grey q-mb-sm">
      Learns reusable, helpdesk-agnostic procedures (symptom &rarr; cause &rarr; fix &rarr; verify) from how
      tickets get closed &mdash; a backfill on first run, then incremental. View/edit them in
      Tools &rarr; <strong>AI Procedures</strong>.
    </div>
    <q-toggle
      :model-value="settings.ai_procedures_enabled"
      label="Enable AI Procedures library"
      @update:model-value="update('ai_procedures_enabled', $event)"
    />
    <q-toggle
      :model-value="settings.ai_procedures_mining_enabled"
      label="Enable automatic mining (scheduled)"
      :disable="!settings.ai_procedures_enabled"
      @update:model-value="update('ai_procedures_mining_enabled', $event)"
    />
    <div class="row q-col-gutter-md q-mt-xs q-mb-sm">
      <q-input
        class="col-6"
        type="number"
        dense
        outlined
        :model-value="settings.ai_procedures_interval_hours"
        label="Run every (hours)"
        :disable="!settings.ai_procedures_enabled"
        @update:model-value="update('ai_procedures_interval_hours', Number($event))"
      />
      <q-input
        class="col-6"
        type="number"
        dense
        outlined
        :model-value="settings.ai_procedures_backfill_days"
        label="First-run backfill (days)"
        :disable="!settings.ai_procedures_enabled"
        @update:model-value="update('ai_procedures_backfill_days', Number($event))"
      />
    </div>
    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-medium">Procedure Mining Policy (prompt)</div>
      <info-tip
        text="Controls what counts as a reusable procedure versus a one-off or client-specific fact. Mining only runs when both toggles above are on; the interval sets the real cadence. Blank uses the built-in default."
      />
    </div>
    <q-input
      :model-value="settings.ai_procedures_mining_prompt"
      type="textarea"
      outlined
      autogrow
      input-style="min-height: 120px"
      label="How to distill closed tickets into reusable procedures (leave blank for the built-in default)"
      @update:model-value="update('ai_procedures_mining_prompt', $event)"
    />
    <div class="text-caption text-grey q-mb-md">
      Controls what counts as a reusable procedure vs a one-off/client-specific fact. The miner
      only runs when both toggles are on; the interval sets the real cadence.
    </div>

    <!-- AI helpdesk-setup assistant -->
    <q-dialog v-model="assistDialog">
      <q-card style="min-width: 760px; max-width: 92vw">
        <q-card-section class="row items-center">
          <div class="text-subtitle1">AI Helpdesk Integration Builder</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section style="max-height: 55vh; overflow-y: auto">
          <div v-if="assistMessages.length === 0" class="text-grey text-caption q-mb-sm">
            The AI will interview you about your helpdesk/ticketing system, then draft the
            Policy and helpdesk.js for you to review and apply. Click <strong>Send</strong>
            to start, or type what system you use.
          </div>
          <div v-for="(m, i) in assistMessages" :key="i">
            <q-chat-message
              :sent="m.role === 'user'"
              :bg-color="m.role === 'user' ? 'blue-2' : 'grey-3'"
            >
              <div v-if="m.role === 'user'" style="white-space:pre-wrap">{{ m.text }}</div>
              <div v-else class="md-body" v-html="renderMarkdown(m.text)"></div>
            </q-chat-message>
            <div v-if="m.policy || m.code" class="q-gutter-xs q-mb-md">
              <q-btn
                v-if="m.policy"
                dense
                no-caps
                size="sm"
                color="teal"
                icon="check"
                label="Apply to Policy box"
                @click="applyPolicy(m.policy)"
              />
              <q-btn
                v-if="m.code"
                dense
                no-caps
                size="sm"
                color="deep-purple"
                icon="check"
                label="Apply to Code box"
                @click="applyCode(m.code)"
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
            placeholder="Answer the AI, or describe your helpdesk… (Enter to send)"
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

    <!-- provider dialog -->
    <q-dialog v-model="providerDialog">
      <q-card style="min-width: 400px">
        <q-card-section class="text-subtitle1">
          {{ providerForm.id ? "Edit" : "Add" }} provider
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select
            v-model="providerForm.name"
            :options="providerNameOptions"
            emit-value
            map-options
            outlined
            dense
            label="Provider"
            :disable="!!providerForm.id"
          />
          <q-input
            v-model="providerForm.api_key"
            outlined
            dense
            label="API Key"
            :placeholder="providerForm.id ? '(leave blank to keep existing)' : ''"
            type="password"
          />
          <q-input
            v-model="providerForm.base_url"
            outlined
            dense
            label="Base URL (optional, for custom/self-hosted)"
          />
          <q-checkbox v-model="providerForm.enabled" label="Enabled" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" @click="saveProviderForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- model dialog -->
    <q-dialog v-model="modelDialog">
      <q-card style="min-width: 400px">
        <q-card-section class="text-subtitle1">
          {{ modelForm.id ? "Edit" : "Add" }} model
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select
            v-model="modelForm.provider"
            :options="providerOptions"
            emit-value
            map-options
            outlined
            dense
            label="Provider"
            @update:model-value="onProviderChange"
          />
          <q-select
            v-if="availableForProvider.length > 0"
            v-model="modelForm.model_id"
            :options="availableForProvider"
            emit-value
            map-options
            outlined
            dense
            use-input
            input-debounce="0"
            label="Model"
            :loading="loadingAvailable"
            @filter="filterAvailable"
            @update:model-value="onModelPick"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  No models found for this key
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-input
            v-else
            v-model="modelForm.model_id"
            outlined
            dense
            :loading="loadingAvailable"
            label="Model ID (no key detected — type manually, e.g. gpt-4o)"
          />
          <q-input v-model="modelForm.display_name" outlined dense label="Display name" />
          <q-select
            v-model="modelForm.thinking_level"
            :options="['off', 'minimal', 'low', 'medium', 'high']"
            outlined
            dense
            label="Thinking level"
          />
          <q-checkbox v-model="modelForm.enabled" label="Enabled" />
          <q-checkbox v-model="modelForm.is_default" label="Default model" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" @click="saveModelForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import AIReportSchedules from "@/components/modals/coresettings/AIReportSchedules.vue";
import { ref, computed, onMounted } from "vue";
import {
  fetchAIProviders,
  saveAIProvider,
  editAIProvider,
  deleteAIProvider,
  fetchAIModels,
  saveAIModel,
  editAIModel,
  deleteAIModel,
  fetchAvailableAIModels,
  helpdeskAssist,
  helpdeskCaps,
  lintVerifiers,
  testVerifier,
  refreshModelCatalog,
  getRuntimeStatus,
  updateRuntimeNow,
} from "@/api/core";
import { notifySuccess, notifyError } from "@/utils/notify";
import { renderMarkdown } from "@/utils/markdown";
// Presentational only: a consistent section heading + divider, and the blue
// hover-for-explanation icon. Neither touches settings or emits anything.
import SettingsSection from "@/components/ui/SettingsSection.vue";
import InfoTip from "@/components/ui/InfoTip.vue";

export default {
  name: "AISettings",
  components: { SettingsSection, InfoTip, AIReportSchedules },
  props: {
    settings: { type: Object, required: true },
  },
  emits: ["update"],
  setup(props, { emit }) {
    const apiKeyPlaceholder = "{{HELPDESK_API_KEY}}";
    const providers = ref([]);

    // ---- Model catalog watch ----
    // Providers add and retire models without warning. A retired model we still have
    // configured is an outage in waiting, so it is worth a ticket rather than a surprise.
    const catalogChecking = ref(false);
    async function runCatalogRefresh() {
      catalogChecking.value = true;
      try {
        const r = await refreshModelCatalog();
        // The run stamps a new "last checked" time server-side; without applying it here
        // the caption keeps showing whatever was loaded when this dialog opened, which
        // reads exactly like "Check now does nothing".
        if (r.checked) update("ai_model_catalog_checked", r.checked);
        notifySuccess(r.result || "checked");
      } catch (e) {
        notifyError(e?.response?.data?.error || String(e));
      }
      catalogChecking.value = false;
    }

    // ---- AI runtime updates (scheduled, only when idle) ----
    const runtime = ref(null);
    const runtimeLoading = ref(false);
    const runtimeUpdating = ref(false);
    async function loadRuntimeStatus() {
      runtimeLoading.value = true;
      try {
        runtime.value = await getRuntimeStatus();
      } catch (e) {
        runtime.value = null;
      }
      runtimeLoading.value = false;
    }
    async function runRuntimeUpdate() {
      runtimeUpdating.value = true;
      try {
        const r = await updateRuntimeNow();
        notifySuccess(r.result || "done", 8000);
        await loadRuntimeStatus();
      } catch (e) {
        notifyError(e?.response?.data?.error || String(e));
      }
      runtimeUpdating.value = false;
    }
    const busyReason = computed(() => {
      const d = runtime.value?.busy_detail || {};
      const parts = [];
      if (d.active_sessions) parts.push(`${d.active_sessions} live chat(s)`);
      if (d.active_runs) parts.push(`${d.active_runs} background run(s)`);
      if (d.running_task_runs) parts.push(`${d.running_task_runs} task run(s)`);
      if (d.triaging_tickets) parts.push(`${d.triaging_tickets} ticket(s) being triaged`);
      if (d.mining) parts.push("knowledge mining");
      if (d.bridge) parts.push(d.bridge);
      return parts.join(", ");
    });

    // ---- Alert verifiers: author rules safely from here ----
    // Rules decide, in code, whether a machine-generated alert is real - by reading the
    // device. Authoring blind is the thing that makes a code box unusable, so the UI can
    // (a) validate a rule set without running it and (b) dry-run it against a real ticket.
    const verifierRules = ref([]);
    const verifierLintError = ref("");
    const verifierLinting = ref(false);
    const verifierTestRef = ref("");
    const verifierTestResult = ref(null);
    const verifierTesting = ref(false);

    // Capability tags. An operation the integration declares mutating but leaves
    // unclassified is DENIED once enforcement is on; this shows that before it bites.
    const caps = ref(null);
    const capsError = ref("");
    const capsLoading = ref(false);

    async function checkCaps() {
      capsLoading.value = true;
      capsError.value = "";
      try {
        const r = await helpdeskCaps(props.settings.ai_helpdesk_code || "");
        if (!r.ok) {
          caps.value = null;
          capsError.value = r.error || "could not read capability tags";
        } else {
          caps.value = r;
          if (r.warning) notifyError(r.warning);
          else notifySuccess(`${r.total} operation(s) classified, none unclassified`);
        }
      } catch (e) {
        capsError.value = e?.response?.data?.error || String(e);
      }
      capsLoading.value = false;
    }

    async function checkVerifiers() {
      verifierLinting.value = true;
      verifierLintError.value = "";
      try {
        const r = await lintVerifiers(props.settings.ai_verifier_code || "");
        verifierRules.value = r.rules || [];
        if (!r.ok) verifierLintError.value = r.error || "rule set is not valid";
        else if (!verifierRules.value.length) verifierLintError.value = r.note || "No rules defined.";
        else notifySuccess(`${r.live} of ${r.total} rule(s) in service`);
      } catch (e) {
        verifierLintError.value = e?.response?.data?.error || String(e);
      }
      verifierLinting.value = false;
    }

    async function runVerifierTest() {
      const ref_ = (verifierTestRef.value || "").trim();
      if (!ref_) {
        notifyError("Enter a ticket reference to test against");
        return;
      }
      verifierTesting.value = true;
      verifierTestResult.value = null;
      try {
        // Server hard-forces dry-run, so a test can never change the ticket.
        verifierTestResult.value = await testVerifier(ref_, props.settings.ai_verifier_code || "");
      } catch (e) {
        verifierTestResult.value = { matched: false, error: e?.response?.data?.error || String(e) };
      }
      verifierTesting.value = false;
    }

    const verdictColor = (a) =>
      ({ noise: "positive", actionable: "warning", human: "grey-7" })[a] || "grey-7";
    const verdictText = (a) =>
      ({
        noise: "No action needed (proven)",
        actionable: "Real problem (proven)",
        human: "Needs a human",
      })[a] || a;

    // ---- AI helpdesk-setup assistant ----
    const assistDialog = ref(false);
    const assistMessages = ref([]);
    const assistInput = ref("");
    const assistLoading = ref(false);
    function openAssist() {
      assistDialog.value = true;
    }
    function parseProposal(reply) {
      const extract = (start, end) => {
        const i = reply.indexOf(start);
        if (i < 0) return null;
        const j = reply.indexOf(end, i + start.length);
        if (j < 0) return null;
        return reply.slice(i + start.length, j).trim();
      };
      const policy = extract("===POLICY START===", "===POLICY END===");
      const code = extract("===CODE START===", "===CODE END===");
      let text = reply
        .replace(/===POLICY START===[\s\S]*?===POLICY END===/g, "")
        .replace(/===CODE START===[\s\S]*?===CODE END===/g, "")
        .trim();
      if (!text) text = policy || code ? "(proposed updates below — review and apply)" : "";
      return { text, policy, code };
    }
    async function sendAssist() {
      if (assistLoading.value) return;
      const content =
        assistInput.value.trim() ||
        (assistMessages.value.length === 0 ? "Help me set up my helpdesk integration." : "");
      if (!content) return;
      assistMessages.value.push({ role: "user", text: content, raw: content });
      assistInput.value = "";
      assistLoading.value = true;
      try {
        const convo = assistMessages.value.map((m) => ({
          role: m.role,
          content: m.raw || m.text,
        }));
        const { reply } = await helpdeskAssist(convo);
        const parsed = parseProposal(reply || "");
        assistMessages.value.push({
          role: "assistant",
          text: parsed.text || reply || "(no response)",
          raw: reply,
          policy: parsed.policy,
          code: parsed.code,
        });
      } catch (e) {
        notifyError("Assistant request failed");
      } finally {
        assistLoading.value = false;
      }
    }
    function applyPolicy(p) {
      emit("update", { key: "ai_helpdesk_prompt", val: p });
      notifySuccess("Applied to Policy box — click Save to persist");
    }
    function applyCode(c) {
      emit("update", { key: "ai_helpdesk_code", val: c });
      notifySuccess("Applied to Code box — click Save to persist");
    }
    const models = ref([]);

    const providerColumns = [
      { name: "name", label: "Provider", field: "name", align: "left" },
      { name: "base_url", label: "Base URL", field: "base_url", align: "left" },
      { name: "api_key_set", label: "Key set", field: "api_key_set", align: "center" },
      { name: "enabled", label: "Enabled", field: "enabled", align: "center" },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];
    const modelColumns = [
      { name: "display_name", label: "Name", field: "display_name", align: "left" },
      { name: "provider_name", label: "Provider", field: "provider_name", align: "left" },
      { name: "model_id", label: "Model ID", field: "model_id", align: "left" },
      { name: "thinking_level", label: "Thinking", field: "thinking_level", align: "left" },
      { name: "enabled", label: "Enabled", field: "enabled", align: "center" },
      { name: "is_default", label: "Default", field: "is_default", align: "center" },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];

    const providerNameOptions = [
      { label: "Anthropic", value: "anthropic" },
      { label: "OpenAI", value: "openai" },
      { label: "Google", value: "google" },
      { label: "xAI", value: "xai" },
      { label: "OpenRouter", value: "openrouter" },
      { label: "Custom (OpenAI-compatible)", value: "custom" },
    ];

    const providerOptions = ref([]);

    // available models (from bridge, for configured keys)
    const availableModels = ref([]);
    const loadingAvailable = ref(false);
    const availableFilter = ref("");

    function providerNameById(id) {
      const p = providers.value.find((x) => x.id === id);
      return p ? p.name : null;
    }

    const availableForProvider = computed(() => {
      const pname = providerNameById(modelForm.value.provider);
      let list = availableModels.value.filter((m) => m.provider === pname);
      if (availableFilter.value) {
        const f = availableFilter.value.toLowerCase();
        list = list.filter(
          (m) =>
            m.model_id.toLowerCase().includes(f) ||
            (m.display_name || "").toLowerCase().includes(f),
        );
      }
      return list.map((m) => ({
        label: `${m.display_name} (${m.model_id})`,
        value: m.model_id,
      }));
    });

    function filterAvailable(val, update) {
      update(() => {
        availableFilter.value = val;
      });
    }

    function onProviderChange() {
      modelForm.value.model_id = "";
    }

    function onModelPick(val) {
      const pname = providerNameById(modelForm.value.provider);
      const found = availableModels.value.find(
        (m) => m.provider === pname && m.model_id === val,
      );
      if (found && !modelForm.value.display_name) {
        modelForm.value.display_name = found.display_name;
      }
    }

    async function loadAvailable() {
      loadingAvailable.value = true;
      try {
        const data = await fetchAvailableAIModels();
        availableModels.value = data.models || [];
      } catch (e) {
        availableModels.value = [];
      } finally {
        loadingAvailable.value = false;
      }
    }

    async function loadAll() {
      providers.value = await fetchAIProviders();
      models.value = await fetchAIModels();
      providerOptions.value = providers.value.map((p) => ({
        label: p.name,
        value: p.id,
      }));
      loadAvailable();
    }

    function update(key, val) {
      emit("update", { key, val });
    }

    // ---- Friendly ticket-scope controls (read/write the ai_ticket_scope JSON) ----
    function parseScope() {
      try {
        return JSON.parse(props.settings.ai_ticket_scope || "{}") || {};
      } catch {
        return {};
      }
    }
    function writeScope(obj) {
      update("ai_ticket_scope", JSON.stringify(obj, null, 2));
    }
    function cleanList(v) {
      return (v || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    }
    function scopeBool(key, dflt) {
      const v = parseScope()[key];
      return v === undefined ? dflt : !!v;
    }
    function setScopeBool(key, val) {
      const o = parseScope();
      o[key] = !!val;
      writeScope(o);
    }
    function scopeList(key) {
      const v = parseScope()[key];
      return Array.isArray(v) ? v : [];
    }
    function setScopeList(key, val) {
      const o = parseScope();
      o[key] = key === "auto_action_clients" ? (val || []).map((s) => String(s).trim()).filter(Boolean) : cleanList(val);
      writeScope(o);
    }
    function alertList(sub) {
      const m = parseScope().alert_ticket_match || {};
      return Array.isArray(m[sub]) ? m[sub] : [];
    }
    function setAlertList(sub, val) {
      const o = parseScope();
      o.alert_ticket_match = o.alert_ticket_match || {};
      o.alert_ticket_match[sub] = sub === "subject_starts_with"
        ? (val || []).map((s) => String(s).trim()).filter(Boolean)
        : cleanList(val);
      writeScope(o);
    }

    // provider dialog
    const providerDialog = ref(false);
    const providerForm = ref({});
    function addProvider() {
      providerForm.value = { name: "anthropic", api_key: "", base_url: "", enabled: true };
      providerDialog.value = true;
    }
    function editProvider(row) {
      providerForm.value = { id: row.id, name: row.name, api_key: "", base_url: row.base_url, enabled: row.enabled };
      providerDialog.value = true;
    }
    async function saveProviderForm() {
      try {
        const f = providerForm.value;
        if (f.id) await editAIProvider(f.id, f);
        else await saveAIProvider(f);
        notifySuccess("Provider saved");
        providerDialog.value = false;
        await loadAll();
      } catch (e) {
        notifyError(e?.response?.data || "Failed to save provider");
      }
    }
    async function removeProvider(row) {
      try {
        await deleteAIProvider(row.id);
        await loadAll();
      } catch (e) {
        notifyError("Failed to delete provider");
      }
    }

    // model dialog
    const modelDialog = ref(false);
    const modelForm = ref({});
    function addModel() {
      modelForm.value = {
        provider: providerOptions.value[0]?.value,
        model_id: "",
        display_name: "",
        thinking_level: "medium",
        enabled: true,
        is_default: false,
      };
      modelDialog.value = true;
    }
    function editModel(row) {
      modelForm.value = { ...row };
      modelDialog.value = true;
    }
    async function saveModelForm() {
      try {
        const f = modelForm.value;
        if (f.id) await editAIModel(f.id, f);
        else await saveAIModel(f);
        notifySuccess("Model saved");
        modelDialog.value = false;
        await loadAll();
      } catch (e) {
        notifyError(e?.response?.data || "Failed to save model");
      }
    }
    async function removeModel(row) {
      try {
        await deleteAIModel(row.id);
        await loadAll();
      } catch (e) {
        notifyError("Failed to delete model");
      }
    }

    onMounted(loadAll);
    onMounted(loadRuntimeStatus);

    return {
      apiKeyPlaceholder,
      renderMarkdown,
      catalogChecking,
      runCatalogRefresh,
      runtime,
      runtimeLoading,
      runtimeUpdating,
      loadRuntimeStatus,
      runRuntimeUpdate,
      busyReason,
      caps,
      capsError,
      capsLoading,
      checkCaps,
      verifierRules,
      verifierLintError,
      verifierLinting,
      verifierTestRef,
      verifierTestResult,
      verifierTesting,
      checkVerifiers,
      runVerifierTest,
      verdictColor,
      verdictText,
      assistDialog,
      assistMessages,
      assistInput,
      assistLoading,
      openAssist,
      sendAssist,
      applyPolicy,
      applyCode,
      providers,
      models,
      providerColumns,
      modelColumns,
      providerNameOptions,
      providerOptions,
      availableForProvider,
      loadingAvailable,
      filterAvailable,
      onProviderChange,
      onModelPick,
      update,
      scopeBool,
      setScopeBool,
      scopeList,
      setScopeList,
      alertList,
      setAlertList,
      providerDialog,
      providerForm,
      addProvider,
      editProvider,
      saveProviderForm,
      removeProvider,
      modelDialog,
      modelForm,
      addModel,
      editModel,
      saveModelForm,
      removeModel,
    };
  },
};
</script>
