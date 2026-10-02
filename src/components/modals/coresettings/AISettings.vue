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

    <settings-section
      dense
      title="AI outbound email From"
      tip="When a technician tells Pi to send mail (send_email), the server can send AS that tech so replies land in their inbox. Only applies when the tech's account email is on one of these domains. Unattended/scheduled jobs still use a unique pi-*@ address. Domain list is checked server-side — the model cannot spoof arbitrary From addresses."
    />
    <q-card-section>
      <q-select
        :model-value="settings.ai_mail_tech_from_domains || []"
        use-input
        use-chips
        multiple
        hide-dropdown-icon
        input-debounce="0"
        new-value-mode="add-unique"
        dense
        outlined
        label="Send as the technician when their email is on these domains"
        hint="Type a domain and press Enter (e.g. blueuc.com). Empty = always use randomized pi-*@ From."
        @update:model-value="update('ai_mail_tech_from_domains', $event)"
      />
    </q-card-section>

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
    <!-- Wide tables are what made Global Settings scroll sideways: a fixed set of columns in a
         narrow splitter pane. `wrap-cells` lets the text fold, and the secondary columns drop away
         below `md` instead of pushing the table past the edge of the window. -->
    <q-table
      :rows="providers"
      :columns="providerColumns"
      :visible-columns="providerVisible"
      row-key="id"
      dense
      flat
      wrap-cells
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
      :visible-columns="modelVisible"
      row-key="id"
      dense
      flat
      wrap-cells
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

    <AIAgentGroups />
    <AIRelayKeys />

    <!-- WHICH AGENT GROUP RUNS EACH AUTOMATED JOB. One table, one idea: every row says what
         thinks for that job, and the top row is the default the others inherit. There used to be
         a separate "preferred agent group" select sitting next to a "routing per rule" table,
         which was two names for the same decision. -->
    <settings-section
      title="Which agent group runs each automated job"
      tip="The jobs the AI runs with nobody watching - ticket triage, autowork, the procedure miner, auto-resolve, scheduled actions and the reports. Each job uses the group in its row: the group's orchestrator thinks, it can hand work to the group's specialists, and the group's provider keys pay for it. A blank row uses the row above it. A single automation can still name its own group in Ticket Automation Subjects, and that wins over everything here."
    />
    <q-card-section class="q-gutter-md">
      <!-- A select with no options is indistinguishable from a select that ignores you: it opens,
           shows nothing, and looks broken. So the count is stated, and a failed load says so
           instead of silently refusing to be set. -->
      <div class="text-caption" :class="groups.length ? 'text-grey-7' : 'text-negative'">
        <template v-if="groups.length">{{ groups.length }} agent group(s) available.</template>
        <template v-else>
          Agent groups could not be loaded, so this table cannot be set. Reload the page
          (Ctrl-Shift-R) and check Settings &gt; Pi.dev AI &gt; Agent Groups still lists them.
        </template>
      </div>
      <div class="agent-routing">
        <div v-for="row in routingRows" :key="row.key" class="routing-row">
          <div class="routing-label">
            <div class="text-body2">{{ row.label }}</div>
            <div class="text-caption text-grey-7">{{ row.hint }}</div>
          </div>
          <q-select
            class="routing-select"
            :model-value="row.value"
            :options="agentGroupOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            clearable
            outlined
            dense
            :display-value="agentGroupDisplay(row.value)"
            :placeholder="row.placeholder"
            @update:model-value="setRouting(row.key, $event)"
          />
        </div>
      </div>
      <div class="text-caption text-grey-7">
        A blank row uses the default at the top. Their own automation can name a group in
        <b>Ticket Automation Subjects</b> — that choice wins over this table.
      </div>
    </q-card-section>

    <!-- standalone desktop / browser execution policy -->
    <settings-section
      title="Pi AI Operator — Desktop Access"
      tip="Controls which RMM workstations Pi Chat and AI Decision may operate through the separate Pi AI Operator service. The desktop model is used only when you open Pi Chat on an Operator workstation; normal device chats and AI Decision keep the global default model. Users may still switch models in the picker."
    />
    <q-card-section class="q-gutter-md">
      <q-checkbox
        :model-value="settings.ai_operator_enabled"
        label="Enable desktop access in Pi Chat and AI Decision"
        @update:model-value="update('ai_operator_enabled', $event)"
      />
      <q-select
        :model-value="settings.ai_operator_default_model"
        :options="operatorModelOptions"
        emit-value
        map-options
        outlined
        dense
        label="Default AI model for desktop access"
        hint="Only auto-selected when Pi Chat is opened on an Allowed Operator workstation. All other chats use the global default model (e.g. Sonnet 5). You can still switch models manually."
        :disable="!settings.ai_operator_enabled"
        :rules="settings.ai_operator_enabled ? [val => !!val || 'Choose a desktop model'] : []"
        @update:model-value="update('ai_operator_default_model', $event)"
      />
      <q-select
        :model-value="settings.ai_operator_allowed_agent_ids || []"
        :options="operatorAgentOptions"
        emit-value
        map-options
        multiple
        use-chips
        use-input
        input-debounce="0"
        outlined
        dense
        label="Allowed Operator workstations"
        hint="Type a computer name, customer or site to search - e.g. 'dev25' or 'farmerboy'"
        :disable="!settings.ai_operator_enabled"
        @filter="filterOperatorAgents"
        @update:model-value="update('ai_operator_allowed_agent_ids', $event)"
      >
        <!-- Show WHICH machine this is. Hostnames repeat across customers, so a bare
             list of them cannot be picked from safely. -->
        <template #option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section>
              <q-item-label>{{ scope.opt.hostname }}</q-item-label>
              <q-item-label caption>
                {{ scope.opt.client }}<span v-if="scope.opt.site"> &mdash; {{ scope.opt.site }}</span>
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
        <!-- Chips resolve from the FULL agent map, not the filtered options: while a
             search is narrowing the list, map-options can no longer resolve an
             already-selected value and the chip would fall back to the raw agent_id. -->
        <template #selected-item="scope">
          <q-chip
            removable
            dense
            :tabindex="scope.tabindex"
            class="q-ma-xs"
            @remove="scope.removeAtIndex(scope.index)"
          >
            {{ operatorAgentLabel(scope.opt) }}
          </q-chip>
        </template>
        <template #no-option>
          <q-item>
            <q-item-section class="text-grey">
              No workstation matches that name, customer or site
            </q-item-section>
          </q-item>
        </template>
      </q-select>
      <div class="text-caption text-grey">
        Desktop tools never reach machines outside this list. Save Global Settings to apply changes.
      </div>
    </q-card-section>

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

    <q-expansion-item
      dense
      icon="description"
      label="Helpdesk Ticket Policy (prompt)"
      caption="When/how the AI should ticket — injected into every session"
      header-class="text-primary"
      class="q-mb-sm"
    >
      <q-input
        :model-value="settings.ai_helpdesk_prompt"
        type="textarea"
        outlined
        autogrow
        input-style="min-height: 140px"
        class="q-pa-sm"
        label="When/how the AI should ticket, and which operations to call"
        @update:model-value="update('ai_helpdesk_prompt', $event)"
      />
      <div class="text-caption text-grey q-px-sm q-pb-sm">
        Natural-language policy: <em>when</em> to open tickets and <em>which operations</em>
        (defined by the code below) to call. Injected into every AI session and scheduled run.
        Saved with the main <strong>Save</strong> button.
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense
      icon="code"
      label="Helpdesk Integration Code (helpdesk.js)"
      caption="exports.operations for your ticketing system"
      header-class="text-primary"
      class="q-mb-sm"
    >
      <q-input
        :model-value="settings.ai_helpdesk_code"
        type="textarea"
        outlined
        input-style="min-height: 220px; font-family: monospace; font-size: 12px;"
        class="q-pa-sm"
        label="JavaScript defining exports.operations for your ticketing system"
        @update:model-value="update('ai_helpdesk_code', $event)"
      />
      <div class="text-caption text-grey q-px-sm q-pb-sm">
        Deterministic integration for <strong>any</strong> helpdesk/ERP. Define
        <code>exports.operations</code> (e.g. create_ticket, reply_to_ticket, add_note,
        submit_report, resolve_customer), plus optional <code>exports.meta</code> and
        <code>exports.mutating</code>. In scope: <code>helpdesk.baseUrl</code>,
        <code>helpdesk.apiKey</code>, <code>fetch</code>. The API key stays server-side and is
        scrubbed from anything the AI sees. The example targets Odoo/Softhealer &mdash; edit it
        for Zendesk / Freshdesk / etc. Saved with the main <strong>Save</strong> button.
      </div>
    </q-expansion-item>

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

    <q-separator class="q-my-md" />
    <settings-section
      dense
      title="pi.dev AI Sales Integration"
      tip="Optional ERP quotations. Reuses Helpdesk API credentials. AI creates DRAFT quotes only when a tech explicitly asks."
    />
    <q-card-section class="q-gutter-sm q-px-none">
      <q-checkbox
        :model-value="settings.ai_sales_enabled"
        label="Enable Sales / ERP quotations (sales_call in decision chat)"
        @update:model-value="update('ai_sales_enabled', $event)"
      />
      <q-expansion-item dense icon="description" label="Sales policy prompt" caption="When the AI may create ERP quotes" header-class="text-primary">
        <q-input :model-value="settings.ai_sales_prompt" type="textarea" outlined autogrow input-style="min-height: 120px" class="q-pa-sm" label="Sales policy" @update:model-value="update('ai_sales_prompt', $event)" />
      </q-expansion-item>
      <q-expansion-item dense icon="code" label="Sales integration code (sales.js)" caption="exports.operations for your ERP" header-class="text-primary">
        <q-input :model-value="settings.ai_sales_code" type="textarea" outlined input-style="min-height: 220px; font-family: monospace; font-size: 12px;" class="q-pa-sm" label="sales.js" @update:model-value="update('ai_sales_code', $event)" />
      </q-expansion-item>
    </q-card-section>

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
    <!-- How often the safety-net poll runs. Tickets are triaged on arrival by the
         helpdesk's own webhook, so this is only the net for missed/re-opened work. -->
    <div class="row items-center q-mb-sm">
      <q-input
        :model-value="settings.ai_ticket_poll_minutes"
        type="number"
        dense
        outlined
        min="0"
        max="1440"
        style="max-width: 110px"
        label="Re-triage poll (min)"
        @update:model-value="update('ai_ticket_poll_minutes', Number($event) || 0)"
      />
      <info-tip
        text="New tickets are triaged the moment they enter New (the helpdesk calls us directly), so this poll is
              the safety net: it catches tickets missed while we were down, tickets someone re-opened, and replies
              on existing tickets that need another look. 10 minutes is the recommended value. 0 turns the poll off
              entirely and relies on the webhook alone. Takes effect immediately - no restart."
      />
    </div>
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

    <q-expansion-item
      dense
      icon="description"
      label="Ticket Triage Policy (prompt)"
      caption="How to classify alerts vs actionable tickets"
      header-class="text-primary"
      class="q-mb-sm"
    >
      <q-input
        :model-value="settings.ai_ticket_triage_prompt"
        type="textarea"
        outlined
        autogrow
        input-style="min-height: 120px"
        class="q-pa-sm"
        label="How to classify YOUR tickets: what's a clean alert vs actionable, what to draft"
        @update:model-value="update('ai_ticket_triage_prompt', $event)"
      />
      <div class="text-caption text-grey q-px-sm q-pb-sm">
        Deployment-specific triage rules (stages, alert patterns, examples). A prompt &mdash;
        adjust it on the fly for any ticketing system.
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense
      icon="description"
      label="Decision-Chat Policy (prompt)"
      caption="How the AI behaves in the ticket chat with a technician"
      header-class="text-primary"
      class="q-mb-md"
    >
      <q-input
        :model-value="settings.ai_ticket_decision_prompt"
        type="textarea"
        outlined
        autogrow
        input-style="min-height: 160px"
        class="q-pa-sm"
        label="How the AI behaves in the 'Johnny 5 Need Input!' decision chat (routing, completion, device-fix/email rules)"
        @update:model-value="update('ai_ticket_decision_prompt', $event)"
      />
      <div class="text-caption text-grey q-px-sm q-pb-sm">
        Governs the ticket <strong>chat</strong> where a tech works a ticket with the AI: closing/
        routing rules, the completion policy (review + customer reply), device-fix and email guidance.
        The dynamic bits (ticket, resolved context, per-turn approvals) are added automatically.
        Leave blank to use the built-in default.
      </div>
    </q-expansion-item>

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
      title="Live chat sessions — the AI runs on the server"
      tip="A Pi Chat or AI Decision session runs on the bridge; every browser tab and the phone app are views onto it. Dropping your connection does not stop the AI. One person drives; everyone else sees it read-only. Taking over needs the role permission 'Take over an AI session' (superusers always can)."
    />
    <div class="row items-center q-gutter-md q-mb-md">
      <q-input
        class="col-3"
        type="number"
        min="0"
        dense
        outlined
        :model-value="settings.ai_chat_detach_grace_minutes"
        label="Stop after nobody is watching for (minutes)"
        hint="0 = never stop on its own"
        @update:model-value="update('ai_chat_detach_grace_minutes', Number($event))"
      />
      <div class="col text-caption text-grey">
        When the <b>last</b> viewer disconnects, the session &mdash; including a turn in flight &mdash;
        keeps running for this long. Reconnect within it (same person, another tab, or the phone
        app) and you pick the session straight back up, mid-stream. Set 0 to keep sessions alive
        until someone explicitly starts a new chat.
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

    <q-expansion-item
      dense
      icon="code"
      label="Verifier Rules (verifiers.js)"
      caption="exports.verifiers = [ ... ] — code that proves alerts before AI"
      header-class="text-primary"
      class="q-mb-sm"
      :disable="!settings.ai_verifiers_enabled"
    >
      <q-input
        :model-value="settings.ai_verifier_code"
        type="textarea"
        outlined
        input-style="min-height: 220px; font-family: monospace; font-size: 12px;"
        class="q-pa-sm"
        label="JavaScript defining exports.verifiers = [ ... ]"
        :disable="!settings.ai_verifiers_enabled"
        @update:model-value="update('ai_verifier_code', $event)"
      />
      <div class="text-caption text-grey q-px-sm q-pb-sm">
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
    </q-expansion-item>

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
    <!-- AUTO-APPROVAL. Two gates, BOTH required: a well-written fix seen once is a guess;
         a fix seen fifty times that the reviewer rated 40 is fifty tickets of something we
         do not understand. Applied by the miner as counts grow and by the consolidation. -->
    <div class="text-subtitle2 q-mt-sm">Auto-approve procedures</div>
    <div class="text-caption text-grey-7 q-mb-xs">
      A procedure is approved without a human only when <b>both</b> are met. Approved procedures
      are what Ticket Automation Subjects work from, so this is the bar for unattended work.
    </div>
    <div class="row q-col-gutter-md q-mb-md">
      <q-input
        class="col-6"
        type="number"
        min="0"
        max="100"
        dense
        outlined
        :model-value="settings.ai_procedure_auto_approve_score"
        label="Confidence score at least (0-100)"
        hint="The AI's rating that the procedure is correct, complete and general. Capped by evidence: seen once maxes at 70, twice 80, 3-4 at 90."
        :disable="!settings.ai_procedures_enabled"
        @update:model-value="update('ai_procedure_auto_approve_score', Number($event))"
      />
      <q-input
        class="col-6"
        type="number"
        min="1"
        dense
        outlined
        :model-value="settings.ai_procedure_auto_approve_seen"
        label="Times seen at least"
        hint="How many real tickets the procedure has been distilled from."
        :disable="!settings.ai_procedures_enabled"
        @update:model-value="update('ai_procedure_auto_approve_seen', Number($event))"
      />
    </div>
    <q-expansion-item
      dense
      icon="description"
      label="Procedure Mining Policy (prompt)"
      caption="What counts as a reusable procedure vs a one-off"
      header-class="text-primary"
      class="q-mb-md"
      :disable="!settings.ai_procedures_enabled"
    >
      <q-input
        :model-value="settings.ai_procedures_mining_prompt"
        type="textarea"
        outlined
        autogrow
        input-style="min-height: 120px"
        class="q-pa-sm"
        label="How to distill closed tickets into reusable procedures (leave blank for the built-in default)"
        @update:model-value="update('ai_procedures_mining_prompt', $event)"
      />
      <div class="text-caption text-grey q-px-sm q-pb-sm">
        Controls what counts as a reusable procedure vs a one-off/client-specific fact. The miner
        only runs when both toggles are on; the interval sets the real cadence.
      </div>
    </q-expansion-item>

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
            :options="filteredProviderOptions"
            emit-value
            map-options
            outlined
            dense
            use-input
            input-debounce="0"
            @filter="filterProviderOptions"
            :loading="loadingNativeProviders"
            label="Provider"
            :hint="providerHint"
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
            label="Base URL (optional)"
            :placeholder="selectedNativeProvider?.base_url || ''"
            :hint="selectedNativeProvider?.base_url_required ? 'Required for this provider' : 'Leave blank to use pi\'s built-in endpoint'"
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
          <!-- Bound to providerHasModels (does this key expose ANY models) and NOT to the
               filtered list. Keying it off the filtered list meant that typing a search term
               matching nothing emptied the list, which unmounted this select mid-search and
               swapped in the manual input below - and because the filter string survived the
               unmount, the computed stayed empty and the select could never come back. One
               bad search killed model search until the dialog was reopened. -->
          <q-select
            v-if="providerHasModels"
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
                  {{
                    availableFilter
                      ? `No model matches "${availableFilter}" - clear the box to see all ${providerModelCount} available`
                      : "No models found for this key"
                  }}
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
            :options="thinkingOptions"
            outlined
            dense
            label="Thinking level"
            :hint="thinkingHint"
          />
          <q-input
            v-model.number="modelForm.auto_summarize_k"
            type="number"
            outlined
            dense
            :min="20"
            :max="1000"
            suffix="k tokens"
            label="Auto-summarize at"
            hint="For chats on this model that are NOT in an agent group (a group's own setting applies there). A window's own setting still wins. Default 100k."
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
import AIAgentGroups from "@/components/modals/coresettings/AIAgentGroups.vue";
import AIRelayKeys from "@/components/modals/coresettings/AIRelayKeys.vue";
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
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
  fetchNativeAIProviders,
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
import { useAgentDropdown } from "@/composables/agents";
import { fetchAgents } from "@/api/agents";

export default {
  name: "AISettings",
  components: { SettingsSection, InfoTip, AIReportSchedules, AIAgentGroups, AIRelayKeys },
  props: {
    settings: { type: Object, required: true },
  },
  emits: ["update"],
  setup(props, { emit }) {
    const $q = useQuasar();
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
    const { agentOptions, getAgentOptions } = useAgentDropdown();

    // WORKSTATION PICKER.
    //
    // This select had `use-input` but no `@filter`, and in Quasar that combination does
    // nothing: typing narrowed nothing, so finding a machine meant scrolling every agent
    // in the estate. It also offered hostnames only, which is not enough to pick with -
    // hostnames repeat across customers, and people look for "that dev box at FarmerBoy"
    // rather than for a bare name. So options carry client and site, and the search runs
    // over all three.
    const operatorAgents = ref([]);          // {value, label, hostname, client, site}
    const operatorAgentFilter = ref("");

    async function loadOperatorAgents() {
      try {
        const rows = await fetchAgents({ detail: false });
        // The two agent serializers name these differently: detail=false
        // (AgentHostnameSerializer) returns `client`/`site`, while the table serializer
        // returns `client_name`/`site_name`. Read both, or searching by customer silently
        // matches nothing and every caption renders blank.
        operatorAgents.value = (rows || [])
          .filter((a) => a && a.agent_id)
          .map((a) => {
            const client = a.client || a.client_name || "";
            const site = a.site || a.site_name || "";
            return {
              value: a.agent_id,
              hostname: a.hostname || a.agent_id,
              client,
              site,
              // `label` is what map-options falls back to and what a plain-text search of
              // the chip would see; keep the whole identity in it.
              label: [a.hostname, client, site].filter(Boolean).join(" - "),
            };
          })
          .sort((x, y) =>
            (x.client || "").localeCompare(y.client || "") ||
            (x.hostname || "").localeCompare(y.hostname || ""),
          );
      } catch (e) {
        // Fall back to the shared dropdown rather than leaving the field unusable.
        operatorAgents.value = (agentOptions.value || [])
          .filter((o) => o && o.value)
          .map((o) => ({ value: o.value, hostname: o.label, client: "", site: "", label: o.label }));
      }
    }

    // Every whitespace-separated word must match somewhere, so "dev25 farmer" finds
    // dev25-1 at FarmerBoy AG without needing the words in a particular order.
    const operatorAgentOptions = computed(() => {
      const q = operatorAgentFilter.value.trim().toLowerCase();
      if (!q) return operatorAgents.value;
      const terms = q.split(/\s+/);
      return operatorAgents.value.filter((o) => {
        const hay = `${o.hostname} ${o.client} ${o.site}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    });

    function filterOperatorAgents(val, update) {
      update(() => {
        operatorAgentFilter.value = val || "";
      });
    }

    // Resolve a chip's text from the full list. `scope.opt` is the raw agent_id once the
    // options array has been narrowed by a search, which is when a chip would otherwise
    // show a uuid instead of a hostname.
    function operatorAgentLabel(opt) {
      const id = opt && typeof opt === "object" ? opt.value : opt;
      const found = operatorAgents.value.find((o) => o.value === id);
      if (!found) return opt && opt.label ? opt.label : String(id);
      return found.client ? `${found.hostname} (${found.client})` : found.hostname;
    }
    const agentGroupOptions = computed(() =>
      groups.value.map((g) => {
        const orch = (g.members || []).find((m) => m.role === "orchestrator" && m.enabled !== false);
        return {
          label: `${g.name}${orch ? ` - ${orch.display_name || orch.model_id}` : " (no orchestrator)"}`,
          value: g.id,
        };
      }),
    );
    // One row per job, in the order AGENT_SURFACES declares them, with the default on top: a
    // blank row inherits the row above it, so the first row is what "blank" means everywhere
    // else. `__default__` is not a surface - it writes ai_preferred_agent_group, which is the
    // resolver's fallback for any surface without an entry of its own.
    const routingRows = computed(() => {
      const preferred = props.settings.ai_preferred_agent_group;
      const inherit = preferredGroupLabel.value;
      return [
        {
          key: "__default__",
          label: "Default — every automated job",
          hint: "Every job below uses this group unless its own row says otherwise. Blank = the starred default model, with no specialists.",
          value: preferred ?? null,
          placeholder: "Starred default model (no specialists)",
        },
        ...(surfaces.value || []).map((s) => ({
          key: s.key,
          label: s.label,
          hint: s.hint,
          value: (props.settings.ai_agent_routing || {})[s.key] ?? null,
          placeholder: inherit,
        })),
      ];
    });
    // NEVER RENDER A BARE ID. Quasar falls back to printing the raw model value whenever it
    // cannot match it to an option, which is how a stored group id (2) ends up on screen as "2"
    // - indistinguishable from a broken setting. Resolving the label here means either the real
    // name is shown, or a sentence that says what is actually wrong.
    function agentGroupDisplay(id) {
      if (id === null || id === undefined || id === "") return "";
      const found = agentGroupOptions.value.find((o) => o.value === id);
      if (found) return found.label;
      return groups.value.length
        ? `Group #${id} - no longer exists`
        : `Group #${id} - agent groups have not loaded`;
    }
    // "Use default (IT)" - names the group so a blank row is self-explanatory.
    const preferredGroupLabel = computed(() => {
      const id = props.settings.ai_preferred_agent_group;
      const found = agentGroupOptions.value.find((o) => o.value === id);
      if (!found) return "Use the default";
      return `Use default (${String(found.label).split(" - ")[0]})`;
    });
    const operatorModelOptions = computed(() =>
      models.value
        .filter((model) => model.enabled)
        .map((model) => ({
          label: `${model.display_name} (${model.provider_name}/${model.model_id})`,
          value: model.id,
        })),
    );

    // Column sets per screen size. On a laptop the settings pane is roughly half the window, so
    // the useful columns are the identity and the state; everything else is available on a wide
    // screen. `$q.screen` is reactive, so resizing swaps them live.
    const providerVisible = computed(() =>
      $q.screen.lt.md
        ? ["name", "api_key_set", "enabled", "actions"]
        : ["name", "base_url", "api_key_set", "enabled", "actions"],
    );
    const modelVisible = computed(() =>
      $q.screen.lt.xl
        ? ["display_name", "provider_name", "enabled", "is_default", "actions"]
        : ["display_name", "provider_name", "model_id", "thinking_level", "auto_summarize_tokens", "enabled", "is_default", "actions"],
    );
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
      {
        name: "auto_summarize_tokens",
        label: "Summarize at",
        field: "auto_summarize_tokens",
        align: "right",
        format: (v) => `${Math.round(Number(v || 100000) / 1000)}k`,
      },
      { name: "enabled", label: "Enabled", field: "enabled", align: "center" },
      { name: "is_default", label: "Default", field: "is_default", align: "center" },
      { name: "actions", label: "", field: "actions", align: "right" },
    ];

    // Providers the installed pi supports NATIVELY (from the bridge via /core/ai/native-providers/),
    // so a provider added by a pi upgrade appears here with no code change (2026-09-27). The
    // static list is only shown until that answers (or if it cannot).
    const providerNameOptions = ref([
      { label: "Anthropic", value: "anthropic" },
      { label: "OpenAI", value: "openai" },
      { label: "Google", value: "google" },
      { label: "xAI", value: "xai" },
      { label: "OpenRouter", value: "openrouter" },
      { label: "DeepSeek", value: "deepseek" },
    ]);
    const nativeProviders = ref([]);
    const loadingNativeProviders = ref(false);
    const providerFilter = ref("");
    async function loadNativeProviders() {
      if (nativeProviders.value.length) return;
      loadingNativeProviders.value = true;
      try {
        const data = await fetchNativeAIProviders();
        const rows = (data && data.providers) || [];
        if (rows.length && data.source === "pi") {
          nativeProviders.value = rows;
          providerNameOptions.value = rows.map((p) => ({
            label: `${p.name} (${p.id})` + (p.api_key ? "" : " - OAuth only, not supported here"),
            value: p.id,
            disable: !p.api_key,
          }));
        }
      } catch (e) {
        /* keep the static list */
      } finally {
        loadingNativeProviders.value = false;
      }
    }
    const filteredProviderOptions = computed(() => {
      const f = providerFilter.value.toLowerCase();
      return f ? providerNameOptions.value.filter((o) => o.label.toLowerCase().includes(f)) : providerNameOptions.value;
    });
    function filterProviderOptions(val, update) {
      update(() => {
        providerFilter.value = val || "";
      });
    }
    const selectedNativeProvider = computed(() =>
      nativeProviders.value.find((p) => p.id === (providerForm.value && providerForm.value.name)),
    );
    const providerHint = computed(() => {
      const p = selectedNativeProvider.value;
      return p ? `Native pi connector - ${p.model_count} models known` : "";
    });

    const providerOptions = ref([]);
    const groups = ref([]);
    const surfaces = ref([]);

    // available models (from bridge, for configured keys)
    const availableModels = ref([]);
    const loadingAvailable = ref(false);
    const availableFilter = ref("");

    function providerNameById(id) {
      const p = providers.value.find((x) => x.id === id);
      return p ? p.name : null;
    }

    // Everything this provider's key exposes, BEFORE the type-ahead filter. The select's
    // existence must depend on this, never on the filtered result - see the template.
    const providerModelsAll = computed(() => {
      const pname = providerNameById(modelForm.value.provider);
      return availableModels.value.filter((m) => m.provider === pname);
    });
    const providerHasModels = computed(() => providerModelsAll.value.length > 0);
    const providerModelCount = computed(() => providerModelsAll.value.length);

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
      // A filter left over from the previous provider would hide that provider's models.
      availableFilter.value = "";
    }

    // What the runtime will actually honour for the model being edited. xhigh/max are
    // absent unless that model's thinkingLevelMap names them — offering them otherwise
    // is a lie, the bridge clamps them away before the request is sent.
    const BASE_THINKING = ["off", "minimal", "low", "medium", "high"];
    function levelsFor(providerName, modelId) {
      const found = availableModels.value.find(
        (m) => m.provider === providerName && m.model_id === modelId,
      );
      return found?.thinking_levels?.length ? found.thinking_levels : null;
    }
    function clampThinking(level, levels) {
      if (!levels?.length) return level || "medium";
      if (levels.includes(level)) return level;
      if (levels.includes("medium")) return "medium";
      if (levels.includes("high")) return "high";
      return levels[levels.length - 1];
    }
    const thinkingOptions = computed(() => {
      const pname = providerNameById(modelForm.value.provider);
      const levels = levelsFor(pname, modelForm.value.model_id);
      const opts = levels ? [...levels] : [...BASE_THINKING];
      const cur = modelForm.value.thinking_level;
      if (cur && !opts.includes(cur)) opts.push(cur);
      return opts;
    });
    const thinkingHint = computed(() => {
      const pname = providerNameById(modelForm.value.provider);
      const levels = levelsFor(pname, modelForm.value.model_id);
      if (!levels) return "Pick a model to see the levels it accepts. xhigh is only offered when the model supports it.";
      return levels.includes("xhigh")
        ? "This model accepts xhigh."
        : "This model does not accept xhigh — it is not offered.";
    });

    function onModelPick(val) {
      const pname = providerNameById(modelForm.value.provider);
      const found = availableModels.value.find(
        (m) => m.provider === pname && m.model_id === val,
      );
      if (found && !modelForm.value.display_name) {
        modelForm.value.display_name = found.display_name;
      }
      modelForm.value.thinking_level = clampThinking(
        modelForm.value.thinking_level,
        found?.thinking_levels,
      );
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
      // EACH CALL STANDS ALONE. This used to be three awaits in a row with only the last one
      // guarded, so a single failing endpoint (a 403 on models, a 500 on providers) aborted the
      // whole function and the agent groups were never fetched - which is precisely how a group
      // row ends up displaying a raw id like "2" instead of the group's name.
      try {
        providers.value = await fetchAIProviders();
      } catch {
        providers.value = [];
      }
      try {
        models.value = await fetchAIModels();
      } catch {
        models.value = [];
      }
      try {
        const g = await fetchAIAgentGroups();
        groups.value = Array.isArray(g) ? g : (g && g.groups) || [];
        // The headless rules the API will accept a group for. Served from
        // AGENT_SURFACES, so the UI can never offer a surface the resolver doesn't know.
        surfaces.value = Array.isArray(g) ? [] : (g && g.surfaces) || [];
      } catch {
        groups.value = [];
        surfaces.value = [];
      }
      providerOptions.value = (providers.value || []).map((p) => ({
        label: p.name,
        value: p.id,
      }));
      loadAvailable();
    }

    function update(key, val) {
      emit("update", { key, val });
    }

    // The top row is not a surface: it IS the preferred group, so it writes that column rather
    // than an ai_agent_routing entry. A cleared row means "inherit", so it is REMOVED from the
    // object instead of stored as null - the serializer drops empty values too, and the resolver
    // treats a missing key exactly like an unset one.
    function setRouting(key, val) {
      if (key === "__default__") {
        update("ai_preferred_agent_group", val === "" ? null : val);
        return;
      }
      const next = { ...(props.settings.ai_agent_routing || {}) };
      if (val === null || val === undefined || val === "") delete next[key];
      else next[key] = val;
      update("ai_agent_routing", next);
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
      loadNativeProviders();
    }
    function editProvider(row) {
      providerForm.value = { id: row.id, name: row.name, api_key: "", base_url: row.base_url, enabled: row.enabled };
      providerDialog.value = true;
      loadNativeProviders();
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
    function removeProvider(row) {
      $q.dialog({
        title: "Delete provider?",
        message: `Delete ${row.name}? Its API key and every model attached to it will be removed. This cannot be undone.`,
        cancel: true,
        persistent: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        try {
          await deleteAIProvider(row.id);
          await loadAll();
        } catch (e) {
          notifyError("Failed to delete provider");
        }
      });
    }

    // model dialog
    const modelDialog = ref(false);
    const modelForm = ref({});
    function addModel() {
      availableFilter.value = "";
      modelForm.value = {
        provider: providerOptions.value[0]?.value,
        model_id: "",
        display_name: "",
        thinking_level: "medium",
        enabled: true,
        is_default: false,
        auto_summarize_k: 100,
      };
      modelDialog.value = true;
    }
    function editModel(row) {
      modelForm.value = { ...row, auto_summarize_k: Math.round(Number(row.auto_summarize_tokens || 100000) / 1000) };
      modelDialog.value = true;
    }
    async function saveModelForm() {
      try {
        const { auto_summarize_k, ...rest } = modelForm.value;
        const k = Math.round(Number(auto_summarize_k ?? 100));
        if (!Number.isFinite(k) || k < 20 || k > 1000) {
          notifyError("Auto-summarize must be between 20k and 1000k tokens");
          return;
        }
        const f = { ...rest, auto_summarize_tokens: k * 1000 };
        if (f.id) await editAIModel(f.id, f);
        else await saveAIModel(f);
        notifySuccess("Model saved");
        modelDialog.value = false;
        await loadAll();
      } catch (e) {
        notifyError(e?.response?.data || "Failed to save model");
      }
    }
    function removeModel(row) {
      $q.dialog({
        title: "Delete model?",
        message: `Delete ${row.display_name || row.model_id}? Chats using it will fall back to the default model.`,
        cancel: true,
        persistent: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        try {
          await deleteAIModel(row.id);
          await loadAll();
        } catch (e) {
          notifyError("Failed to delete model");
        }
      });
    }

    onMounted(loadAll);
    onMounted(getAgentOptions);
    onMounted(loadOperatorAgents);
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
      operatorAgentOptions,
      operatorModelOptions,
      agentGroupOptions,
      surfaces,
      routingRows,
      preferredGroupLabel,
      setRouting, agentGroupDisplay,
      filterOperatorAgents,
      operatorAgentLabel,
      providerColumns,
      modelColumns,
      providerNameOptions,
      providerVisible,
      modelVisible,
      filteredProviderOptions,
      filterProviderOptions,
      loadingNativeProviders,
      selectedNativeProvider,
      providerHint,
      providerOptions,
      availableForProvider,
      providerHasModels,
      providerModelCount,
      availableFilter,
      loadingAvailable,
      filterAvailable,
      onProviderChange,
      onModelPick,
      thinkingOptions,
      thinkingHint,
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

<style scoped>
/* Never scroll sideways (owner's rule). Each row is a label plus a select that may shrink;
   under ~560px they stack rather than pushing the dialog wide. min-width:0 on both is what
   actually prevents the overflow - flex items default to min-width:auto. */
.routing-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 0;
}
.routing-label {
  flex: 1 1 300px;
  min-width: 0;
}
.routing-select {
  flex: 0 1 320px;
  min-width: 160px;
}
</style>
