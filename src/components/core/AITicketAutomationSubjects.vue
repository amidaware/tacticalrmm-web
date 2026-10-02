<template>
  <!-- TICKET AUTOMATION SUBJECTS: the kinds of ticket the AI may work on its own.
       Procedures say HOW; a subject says WHICH tickets and HOW FAR. Subjects arrive as
       proposals from the daily report (approve/reject by email or here) or are created
       here by hand. -->
  <div class="subjects-root">
    <div class="q-px-md q-pt-sm text-caption text-grey-7">
      Which tickets the AI may work automatically, and how far it may go. Procedures say <i>how</i>;
      a subject says <i>which tickets</i> and <i>how far</i>. The AI never closes a ticket under a
      subject; it replies only on a confident verdict with two or more concrete findings.
    </div>
    <div class="q-pa-sm">
      <div class="row items-center q-mb-sm">
        <q-btn dense no-caps flat icon="add" label="New subject" color="primary" @click="openNew" />
        <q-btn dense flat round icon="refresh" :loading="loading" class="q-ml-xs" @click="load" />
        <q-space />
        <div class="text-caption text-grey-7 modes-legend">
          Modes: <b>Advise</b> = reply from the ticket, no device access at all &middot;
          <b>Investigate</b> = read-only device probes, nothing changed &middot;
          <b>Fix</b> = runs this subject's reviewed actions (disabled until some are attached)
        </div>
      </div>

      <q-banner v-if="proposed.length" dense class="bg-amber-1 text-grey-9 q-mb-sm">
        <template #avatar><q-icon name="mark_email_unread" color="amber-9" /></template>
        {{ proposed.length }} proposal(s) from the daily report are waiting. Approve or reject them below.
      </q-banner>

      <q-table
        :rows="rows"
        :columns="columns"
        :visible-columns="visibleColumns"
        row-key="id"
        dense
        flat
        wrap-cells
        hide-bottom
        :pagination="{ rowsPerPage: 0, sortBy: 'status' }"
        class="subjects-table"
        table-style="table-layout: fixed; width: 100%"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.name }}</div>
            <div class="text-caption text-grey-7 ellipsis">{{ props.row.description }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row)" :label="statusLabel(props.row)" />
          </q-td>
        </template>
        <template #body-cell-mode="props">
          <q-td :props="props">
            <q-badge outline :color="props.row.mode === 'advise' ? 'teal-8' : props.row.mode === 'device_readonly' ? 'blue-8' : 'orange-8'"
              :label="props.row.mode === 'advise' ? 'Advise' : props.row.mode === 'device_readonly' ? 'Investigate' : 'Fix'" />
          </q-td>
        </template>
        <template #body-cell-scope="props">
          <q-td :props="props">
            <span v-if="props.row.all_clients">All clients</span>
            <span v-else class="ellipsis">{{ [...(props.row.clients || []), ...(props.row.domains || [])].join(', ') || '—' }}</span>
          </q-td>
        </template>
        <template #body-cell-stats="props">
          <q-td :props="props" class="subjects-stats">
            {{ props.row.tickets_worked }} worked · {{ props.row.tickets_matched }} matched
            <span v-if="props.row.tickets_deduped"> · {{ props.row.tickets_deduped }} dedup</span>
            <q-tooltip v-if="props.row.last_worked">Last worked {{ new Date(props.row.last_worked).toLocaleString() }}</q-tooltip>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="subjects-actions">
            <template v-if="props.row.status === 'proposed'">
              <q-btn dense no-caps unelevated size="sm" color="positive" label="Approve" class="q-mr-xs" @click="decide(props.row, 'approved')" />
              <q-btn dense no-caps flat size="sm" color="negative" label="Reject" @click="decide(props.row, 'rejected')" />
            </template>
            <template v-else>
              <q-toggle
                v-if="props.row.status === 'approved'"
                :model-value="props.row.enabled"
                dense size="sm"
                @update:model-value="(v) => save(props.row, { enabled: v })"
              >
                <q-tooltip>{{ props.row.enabled ? 'Live - switch off' : 'Off - switch on' }}</q-tooltip>
              </q-toggle>
            </template>
            <q-btn dense flat round size="sm" icon="edit" @click="openEdit(props.row)" />
            <q-btn dense flat round size="sm" icon="delete" color="red" @click="remove(props.row)" />
          </q-td>
        </template>
      </q-table>
      <div v-if="!rows.length && !loading" class="text-grey-6 q-pa-sm">
        No subjects yet. The daily "Ticket Automation Subjects" report proposes them; or add one here.
      </div>
    </div>

    <!-- editor -->
    <q-dialog v-model="dialog">
      <q-card class="subject-card">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ edit.id ? 'Edit subject' : 'New ticket automation subject' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <!-- The header and the Save row stay put; this body scrolls. Fifteen fields of mixed
             heights used to sit in one flat card-section, so a long subject simply grew past the
             window (overlapping, no division, no way to reach Save). -->
        <q-card-section class="subject-body scroll">

          <!-- ── 1. WHAT IT IS ───────────────────────────────────────────── -->
          <div class="sec-title">What this subject is</div>
          <div class="row q-col-gutter-md">
            <q-input class="col-12 col-sm-7" v-model="edit.name" dense outlined label="Name" />
            <q-select class="col-12 col-sm-5" v-model="edit.status" dense outlined emit-value map-options
              :options="statusOptions" label="Status" />
          </div>
          <q-input class="q-mt-md" v-model="edit.description" dense outlined autogrow type="textarea"
            label="What this subject covers (plain language)" />
          <q-select
            class="q-mt-md"
            v-model="edit.agent_group"
            :options="groupOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            clearable
            dense
            outlined
            :display-value="groupDisplay(edit.agent_group)"
            label="Agent group for this subject"
            hint="Blank = the preferred group in Settings > AI. Set = this subject's own group runs the work (its orchestrator thinks, its specialists can be delegated to)."
          />

          <q-separator class="sec-sep" />

          <!-- ── 2. WHEN IT APPLIES ──────────────────────────────────────── -->
          <div class="sec-title">When it applies</div>
          <div class="row q-col-gutter-md items-center">
            <q-toggle class="col-auto" v-model="edit.all_clients" dense label="All clients" />
            <q-input class="col-12 col-sm" v-model="clientsText" dense outlined :disable="edit.all_clients"
              label="Clients (comma-separated names)" />
            <q-input class="col-12 col-sm" v-model="domainsText" dense outlined :disable="edit.all_clients"
              label="Requester domains" />
          </div>
          <q-input class="q-mt-md" v-model="matchText" dense outlined autogrow type="textarea"
            input-style="font-family:monospace;font-size:12px"
            label="Match rules (JSON): subject_regex, body_any, body_all, body_none, sender_regex"
            :error="!!matchError" :error-message="matchError" />

          <q-separator class="sec-sep" />

          <!-- ── 3. WHAT IT WORKS FROM ───────────────────────────────────── -->
          <div class="sec-title">What it works from</div>
          <q-select
            v-model="procSel"
            dense outlined multiple use-chips use-input emit-value map-options
            :options="procFiltered"
            :loading="procLoading"
            option-label="label" option-value="value"
            label="Procedures the AI works from"
            hint="Global how-to for this subject. Type to search by name, id or keyword; a subject with no procedure works from the ticket text and the guidance below."
            @filter="filterProcedures"
            @update:model-value="(v) => (procText = (v || []).join(', '))"
          />
          <!-- The procedures this subject works from, as buttons: an admin deciding whether a rule
               is safe has to be able to READ the procedure it leans on, and doing that must not
               mean abandoning the half-finished subject. So it opens on top of this dialog. -->
          <div v-if="procSel.length" class="row items-center q-gutter-xs q-mt-xs">
            <span class="text-caption text-grey-7">Review:</span>
            <q-chip
              v-for="id in procSel"
              :key="`rev${id}`"
              dense
              clickable
              square
              icon="menu_book"
              class="proc-chip"
              :label="procLabel(id)"
              @click="openProcedure(id)"
            />
          </div>
          <!-- HELP DESK ARTICLES. A search, not a list: nothing appears until a few characters are
               typed and the typing pauses, and then the query IS the filter. An id can still be
               pasted and added directly, because the helpdesk API caps its listing at 100 articles
               and an id is the only way to reach anything beyond that slice. -->
          <q-select
            class="q-mt-md"
            v-model="kbSel"
            dense
            outlined
            multiple
            use-chips
            use-input
            input-debounce="400"
            emit-value
            map-options
            option-label="label"
            option-value="value"
            :options="kbFiltered"
            :loading="kbLoading"
            label="Helpdesk KB articles (the customer's own procedures)"
            :hint="kbHint"
            @filter="filterKb"
            @new-value="onNewKb"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-7">
                  <span v-if="kbQuery.length < 2">Type at least two characters to search.</span>
                  <span v-else>No article matches “{{ kbQuery }}”.</span>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div v-if="kbSel.length" class="row items-center q-gutter-xs q-mt-xs">
            <span class="text-caption text-grey-7">Review:</span>
            <q-chip
              v-for="id in kbSel"
              :key="`kbrev${id}`"
              dense
              clickable
              square
              :icon="kbById[id] && kbById[id].missing ? 'error_outline' : 'article'"
              :class="kbById[id] && kbById[id].missing ? 'kb-chip kb-chip--missing' : 'kb-chip'"
              :label="kbLabel(id)"
              @click="openKbArticle(id)"
            />
          </div>

          <q-separator class="sec-sep" />

          <!-- ── 4. WHAT IT MAY DO ──────────────────────────────────────── -->
          <div class="sec-title">What it may do</div>

          <!-- THE RULE. English IF / THEN / ELSE IF / ELSE, stored as blocks (core/ai_rules.py).
               The first and last lines are not the author's to write: every rule carries the
               approval gate and the stop terminator, and the SERVER writes them into the saved
               data, so no client can produce a rule without its gate. -->
          <!-- MODE DECIDES WHICH HALF OF THIS SECTION EXISTS. Owner, 2026-09-28: "Rules are for
               FIX / Instructions are for Advise / Investigate... both should NEVER show up".
               They are two different things and showing them together only invited an admin to
               write the same intent twice, in one place where it acts and one where it does not. -->
          <q-select v-model="edit.mode" dense outlined emit-value map-options :options="modeOptions" label="Mode" />
          <div class="sec-note q-mt-sm">{{ modeNote }}</div>

          <!-- ────── FIX: THE RULE ────────────────────────────────────────
               Fix means the system may act by itself, so Fix is where a rule lives. The rule is
               the only thing that grants action, it is walked step by step, and the approval gate
               at the top is not the author's to remove. -->
          <template v-if="isFixMode">
            <div v-if="!ruleBlocks.length && !(edit.fix_actions || []).length" class="sec-note sec-note--warn q-mt-md">
              Fix is selected but there is <b>nothing to run</b> yet. Until you add a rule or a
              reviewed action below, this subject can only investigate - the automation will not
              change anything.
            </div>
            <div class="sec-subtitle q-mt-lg">Rule — what it may do on its own</div>
            <div class="text-caption text-grey-7 q-mb-sm">
              What the automation may do on a ticket that matches this subject, as English your team
              can read. Mechanical steps become scripts a person reviews; steps that need judgement
              call the AI each time. Every branch has to end by closing, handing over, or waiting.
            </div>

            <div class="rule-shell">
              <div class="rule-fixed">
                <q-icon name="lock" size="14px" class="q-mr-xs" />IF
                {{ vocab.prelude ? vocab.prelude.text.replace(/^if /i, "") : "approved by a support contact or a technician" }}
                <div class="rule-fixed-note">{{ vocab.prelude ? vocab.prelude.note : "" }}</div>
              </div>

              <AIRuleBlock
                v-for="(b, i) in ruleBlocks"
                :key="`blk${i}`"
                :block="b"
                :vocab="vocab"
                :procedures="procOptions"
                :depth="1"
                :first="true"
                :removable="true"
                @remove="ruleBlocks.splice(i, 1)"
              />
              <div v-if="!ruleBlocks.length" class="rule-empty-block">
                No rule yet. Until there is one, Fix runs from the reviewed actions below.
              </div>

              <div class="q-gutter-xs q-mt-sm">
                <q-btn dense no-caps outline size="sm" color="primary" icon="add" label="if" @click="addRuleBlock" />
                <q-btn dense no-caps unelevated size="sm" color="teal-8" icon="auto_awesome"
                  label="Have an AI help write this" @click="draftOpen = !draftOpen" />
                <q-btn v-if="ruleBlocks.length" dense flat no-caps size="sm" color="negative"
                  label="clear rule" @click="clearRule" />
              </div>

              <!-- THE DRAFTING ASSISTANT. The model decides per step whether the work is mechanical
                   (it writes the finished script, which you then review) or needs judgement (an
                   IF/THEN block that calls the AI at run time). It cannot save anything and cannot
                   skip the approval gate: the draft only fills this form. -->
              <div v-if="draftOpen" class="draft-box q-mt-md">
                <q-input v-model="draftText" dense outlined autogrow type="textarea"
                  label="Describe what you want, in plain English"
                  hint="e.g. if sendplot is down, investigate why and fix it; check it is back up and if so tell the customer and close, otherwise hand it to a human" />
                <div class="row items-center q-gutter-sm q-mt-sm">
                  <q-btn dense unelevated no-caps color="teal-8" label="Write the rule"
                    :loading="draftBusy" :disable="!draftText.trim()" @click="runDraft" />
                  <span class="text-caption text-grey-7">
                    The draft replaces the rule above. Nothing is saved until you press Save.
                  </span>
                </div>
                <div v-if="draftNotes" class="draft-notes q-mt-sm">{{ draftNotes }}</div>
                <div v-if="draftErrors.length" class="draft-errors q-mt-sm">
                  <div v-for="(e, i) in draftErrors" :key="`de${i}`">{{ e }}</div>
                </div>
              </div>

              <div class="rule-fixed rule-fixed--end">
                <q-icon name="lock" size="14px" class="q-mr-xs" />{{ vocab.terminator ? vocab.terminator.text.toUpperCase() : "STOP PROCESSING" }}
                <div class="rule-fixed-note">{{ vocab.terminator ? vocab.terminator.note : "" }}</div>
              </div>
            </div>

            <!-- THE PRE-RULE PATH, STILL THE ONE THAT EXECUTES TODAY. Kept, collapsed, and labelled
                 honestly: server.js still derives the run from mode + these actions until the rule
                 interpreter is switched on, so hiding them would hide what actually runs. -->
            <q-expansion-item
              class="legacy-box q-mt-md"
              dense
              switch-toggle-side
              icon="settings_backup_restore"
              :default-opened="!ruleBlocks.length"
              :label="`Reviewed actions - what executes today (${(edit.fix_actions || []).length})`"
              caption="Until the rule interpreter is on, Fix still runs these by name on the pinned machine. A rule above is not executed yet."
            >
              <div class="q-pa-sm">
                <div class="text-caption text-grey-7">
                  The AI may run <b>one of these by name</b> and nothing else: it cannot edit, combine
                  or invent a command.
                </div>
                <div v-for="(a, i) in edit.fix_actions" :key="`fix${i}`" class="action-card q-mt-md">
                  <div class="row items-center">
                    <div class="text-caption text-grey-6">Action {{ i + 1 }}</div>
                    <q-space />
                    <q-btn dense flat round size="sm" color="negative" icon="delete"
                      @click="edit.fix_actions.splice(i, 1)" />
                  </div>
                  <div class="row q-col-gutter-sm">
                    <q-input class="col-12 col-sm-5" dense outlined v-model="a.name" label="Name the AI picks" />
                    <q-select class="col-6 col-sm-4" dense outlined v-model="a.shell" emit-value map-options
                      :options="shellOptions" label="Shell" />
                    <q-input class="col-6 col-sm-3" dense outlined type="number" v-model.number="a.wait" label="Wait (s)" />
                  </div>
                  <q-input class="q-mt-sm" dense outlined autogrow type="textarea" v-model="a.command"
                    label="Command - exactly what will run" input-style="font-family:monospace;font-size:12px" />
                </div>
                <q-btn class="q-mt-md" dense no-caps outline color="primary" icon="add" label="Add action"
                  @click="edit.fix_actions.push({ name: '', shell: 'powershell', command: '', wait: 5 })" />
                <div class="row q-col-gutter-md q-mt-md">
                  <q-select class="col-12 col-sm-8" dense outlined use-input input-debounce="0" clearable
                    v-model="fixAgent" :options="fixAgentOptions" @filter="filterFixAgents"
                    emit-value map-options label="Machine these run on (pinned by you)"
                    hint="One machine, chosen by a person. 'Restart the plot server' must mean this host, never whichever host the ticket text names." />
                  <q-input class="col-12 col-sm-4" dense outlined type="number" v-model.number="edit.fix_cooldown_minutes"
                    label="Cooldown (min)"
                    hint="After a fix runs, it is withheld this long - a service that keeps dying is a human's problem." />
                </div>
              </div>
            </q-expansion-item>
          </template>

          <!-- ────── ADVISE / INVESTIGATE: INSTRUCTIONS, NO RULE ─────────────
               Nothing acts here, so there is nothing to author as flow. What matters is how the AI
               should judge and what it should say. The rule is deliberately NOT shown: a hidden
               rule that is not being used, next to the text that is, is how the same intent gets
               written twice. If one is saved it is kept (never deleted) and named in a line below. -->
          <template v-else>
            <div class="sec-subtitle q-mt-lg">Instructions / reply template</div>
            <div class="text-caption text-grey-7 q-mb-sm">
              {{ isInvestigateMode
                ? "Read-only probes are allowed, so say what to check and what would prove it."
                : "No device access at all - the reply comes from the ticket text alone." }}
              With no rule, this is how the AI judges the ticket and what it says to the customer.
              Put it as an instruction: no steps, no commands.
            </div>
            <q-input v-model="edit.instructions" dense outlined autogrow type="textarea"
              label="Instructions / reply template"
              hint="If this contains {{findings}} the whole text is used verbatim as the customer reply, with the AI's findings inserted." />
            <div v-if="ruleBlocks.length" class="sec-note q-mt-md">
              This subject also has a saved rule ({{ ruleBlocks.length }} if-block(s)). It is kept, and
              <b>not used</b> while the mode is {{ isInvestigateMode ? "Investigate" : "Advise" }}.
              Switch to Fix to read or change it.
            </div>
            <div v-if="(edit.fix_actions || []).length" class="sec-note q-mt-md">
              It also has {{ edit.fix_actions.length }} reviewed action(s) attached, unused in this mode.
            </div>
          </template>

          <q-separator class="sec-sep" />

          <!-- ── 5. REPORTING ───────────────────────────────────────────── -->
          <div class="sec-title">Reporting</div>
          <q-input dense outlined type="number" v-model.number="edit.baseline_minutes"
            label="Baseline minutes a human takes"
            hint="Used for time-saved reporting. Leave blank rather than inventing a number."
            style="max-width: 320px" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Save" :loading="saving" :disable="!!matchError || !edit.name" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- THE HELP DESK ARTICLE READER. Same reasoning as the procedure reader: the article is what a
         subject leans on for CUSTOMER specifics, so it has to be readable while deciding, and in a
         way that does not lose the form. Read-only - articles are authored in the helpdesk. -->
    <q-dialog v-model="kbDialog">
      <q-card class="proc-card">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="article" class="q-mr-sm" />
          <div class="text-h6">
            <span v-if="kbDetail">#{{ kbDetail.id }} {{ kbDetail.title }}</span>
            <span v-else>Help desk article</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="kbDetailLoading" class="row items-center q-gutter-sm">
          <q-spinner-dots size="22px" />
          <span class="text-caption text-grey-7">Loading the article…</span>
        </q-card-section>

        <q-card-section v-else-if="kbDetail" class="proc-body scroll">
          <div class="row items-center q-gutter-xs q-mb-md">
            <q-badge v-if="kbDetail.company" outline color="teal-8" :label="kbDetail.company" />
            <q-badge v-if="kbDetail.missing" color="negative" label="not found in the helpdesk" />
            <q-btn
              v-if="kbDetail.url"
              dense
              flat
              no-caps
              size="sm"
              color="primary"
              icon="open_in_new"
              label="Open in the helpdesk"
              type="a"
              :href="kbDetail.url"
              target="_blank"
            />
          </div>
          <div v-if="kbDetail.content" class="proc-text">{{ kbDetail.content }}</div>
          <div v-else-if="!kbDetail.missing" class="text-caption text-grey-7">
            This article has no body text.
          </div>
          <div v-else class="text-caption text-grey-7">
            The helpdesk did not return article #{{ kbDetail.id }}. It may have been deleted
            there - remove it from this subject or check the id.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <span class="text-caption text-grey-7 q-mr-auto">Read-only — articles are authored in the helpdesk.</span>
          <q-btn flat no-caps label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog> Deliberately a second dialog stacked on the subject editor: a rule
         leans on a procedure, so the person approving the rule has to be able to read it, and
         losing their place in a half-finished subject to do that is how mistakes get made. It is
         read-only - procedures are edited in the Ticket Console, where their history lives. -->
    <q-dialog v-model="procDialog">
      <q-card class="proc-card">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="menu_book" class="q-mr-sm" />
          <div class="text-h6">
            <span v-if="procDetail">#{{ procDetail.id }} {{ procDetail.title }}</span>
            <span v-else>Procedure</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="procDetailLoading" class="row items-center q-gutter-sm">
          <q-spinner-dots size="22px" />
          <span class="text-caption text-grey-7">Loading the procedure…</span>
        </q-card-section>

        <q-card-section v-else-if="procDetail" class="proc-body scroll">
          <div class="row items-center q-gutter-xs q-mb-md">
            <q-badge :color="procStatusColor" :label="procDetail.status || 'unknown'" />
            <q-badge outline color="grey-7" :label="`${procDetail.occurrence_count || 0} occurrence(s)`" />
            <q-badge outline color="grey-7" :label="`confidence: ${procDetail.confidence || '-'}`" />
            <q-badge outline color="grey-7" :label="procDetail.origin || '-'" />
            <q-badge v-if="procDetail.category" outline color="grey-7" :label="procDetail.category" />
          </div>

          <div v-if="procDetail.applies_to" class="proc-field">
            <div class="proc-label">Applies to</div>
            <div>{{ procDetail.applies_to }}</div>
          </div>
          <div v-if="procDetail.symptom" class="proc-field">
            <div class="proc-label">Symptom</div>
            <div class="proc-text">{{ procDetail.symptom }}</div>
          </div>
          <div v-if="procDetail.root_cause" class="proc-field">
            <div class="proc-label">Root cause</div>
            <div class="proc-text">{{ procDetail.root_cause }}</div>
          </div>
          <div v-if="procDetail.fix" class="proc-field">
            <div class="proc-label">Fix</div>
            <div class="proc-text">{{ procDetail.fix }}</div>
          </div>
          <div v-if="procDetail.verification" class="proc-field">
            <div class="proc-label">Verification</div>
            <div class="proc-text">{{ procDetail.verification }}</div>
          </div>
          <div v-if="procProbe" class="proc-field">
            <div class="proc-label">Read-only probe (what "investigate" runs)</div>
            <pre class="proc-pre">{{ procProbe }}</pre>
          </div>
          <div v-if="(procDetail.source_ticket_refs || []).length" class="proc-field">
            <div class="proc-label">Learned from</div>
            <div>{{ (procDetail.source_ticket_refs || []).join(', ') }}</div>
          </div>
          <div v-if="procDetail.updated_by || procDetail.updated" class="proc-field">
            <div class="proc-label">Last changed</div>
            <div>{{ procDetail.updated_by || 'unknown' }} {{ procDetail.updated ? `· ${procDetail.updated}` : '' }}</div>
          </div>

          <div v-if="!(procDetail.fix || procDetail.symptom || procDetail.root_cause)" class="text-caption text-grey-7">
            This procedure has no written fix yet — it is a recognised condition, not a runbook.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <span class="text-caption text-grey-7 q-mr-auto">Read-only — edit procedures in the Ticket Console.</span>
          <q-btn flat no-caps label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { computed, defineComponent, onMounted, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { fetchAIAgentGroups } from "@/api/core";
import {
  fetchAutomationSubjects,
  createAutomationSubject,
  updateAutomationSubject,
  deleteAutomationSubject,
  getProcedures,
  fetchAIProcedure,
  fetchKbArticles,
  searchKbArticles,
  fetchRuleVocab,
  draftRule,
} from "@/api/core";
import { useAgentDropdown } from "@/composables/agents";
import AIRuleBlock from "@/components/core/AIRuleBlock.vue";
import { notifyError, notifySuccess } from "@/utils/notify";

export default defineComponent({
  name: "AITicketAutomationSubjects",
  components: { AIRuleBlock },
  emits: ["counts"],
  props: {
    // Deep link from the daily report email's "Review & modify" button:
    //   /ai-procedures?tab=subjects&subject=<id>
    // It opens that subject's editor, so a proposal can be adjusted (rules, mode, scope,
    // procedures) before it is approved instead of forcing a yes/no on the email card.
    openSubject: { type: [String, Number], default: "" },
  },
  setup(props, { emit }) {
    const $q = useQuasar();
    const rows = ref([]);
    const groups = ref([]);
    const groupOptions = computed(() =>
      groups.value.map((g) => {
        const orch = (g.members || []).find((m) => m.role === "orchestrator" && m.enabled !== false);
        return { label: `${g.name}${orch ? ` - ${orch.display_name || orch.model_id}` : ""}`, value: g.id };
      }),
    );
    // Same guard as the settings page: never print a raw group id (Quasar does that when the
    // value matches no option), say what is wrong instead.
    function groupDisplay(id) {
      if (id === null || id === undefined || id === "") return "";
      const found = groupOptions.value.find((o) => o.value === id);
      if (found) return found.label;
      return groups.value.length ? `Group #${id} - no longer exists` : `Group #${id} - groups not loaded`;
    }
    async function loadGroups() {
      try {
        const g = await fetchAIAgentGroups();
        groups.value = Array.isArray(g) ? g : (g && g.groups) || [];
      } catch {
        groups.value = [];
      }
    }
    const loading = ref(false);
    const saving = ref(false);
    const dialog = ref(false);
    const edit = ref({});
    const matchText = ref("{}");
    const procText = ref("");
    // The procedure picker. A comma-separated id box was not reviewable: you could not tell
    // what #412 was without leaving the page. Options are the whole library in one call
    // (539 rows, API caps at 1000) and filtered locally, so typing costs nothing.
    // FIX IS ALWAYS SELECTABLE. It used to be disabled until a rule or a reviewed action existed,
    // which deadlocked the editor: the actions editor lives INSIDE the Fix branch, so you could
    // not add the action that would have enabled Fix. (Owner, 2026-09-28: "Fix can't be selected
    // because of the need for an action... action can't be created because i need to select Fix...
    // change that".) Setting the mode is a statement of intent; whether it can actually act is
    // reported in the Fix branch itself, where the fix is one click away.
    const modeOptions = computed(() => {
      const acts = Array.isArray(edit.value.fix_actions) ? edit.value.fix_actions.length : 0;
      const rule = (edit.value.statements && Array.isArray(edit.value.statements.blocks))
        ? edit.value.statements.blocks.length
        : 0;
      const why = rule > 0 ? `${rule} rule if-block(s)` : (acts ? `${acts} reviewed action(s)` : "nothing to run yet");
      return [
        { label: "Advise - reply from the ticket; no device access at all", value: "advise" },
        { label: "Investigate - read-only device probes, then reply", value: "device_readonly" },
        { label: `Fix - let the system act on its own (${why})`, value: "device_fix" },
      ];
    });
    const { agentOptions, getAgentOptions } = useAgentDropdown();
    // The pinned fix target. Stored as {agent_id, hostname}: the bridge hands the ID to the
    // operator and the hostname to the model, which must never be able to choose the machine.
    const fixAgentFilter = ref("");
    const fixAgentOptions = computed(() => {
      const q = fixAgentFilter.value.trim().toLowerCase();
      const all = agentOptions.value || [];
      if (!q) return all;
      return all.filter((o) => String((o && o.label) || "").toLowerCase().includes(q));
    });
    function filterFixAgents(val, update) {
      update(() => { fixAgentFilter.value = val || ""; });
    }
    const fixAgent = computed({
      get: () => (edit.value.fix_target || {}).agent_id || null,
      set: (v) => {
        const found = (agentOptions.value || []).find((o) => o.value === v);
        edit.value.fix_target = v ? { agent_id: v, hostname: found ? found.label : "" } : {};
      },
    });
    const isFixMode = computed(() => edit.value.mode === "device_fix");
    const isInvestigateMode = computed(() => edit.value.mode === "device_readonly");

    // Plain-language statement of the ceiling, shown right under the Mode select, because the
    // difference between these three is the whole safety model and it should not live only in a
    // hint nobody opens.
    const modeNote = computed(() => {
      if (isFixMode.value) {
        return "Fix: the system may act by itself on a matching ticket - it runs this subject's rule " +
               "step by step, after the approval gate. That is the only mode where a rule is used.";
      }
      if (isInvestigateMode.value) {
        return "Investigate: read-only probes on the customer's devices, then a reply. Nothing is " +
               "changed, so there is no rule - what matters is how the AI should judge, below.";
      }
      return "Advise: the AI replies from the ticket alone. No device toolbelt is built, so nothing " +
             "on any machine can be touched, and there is no rule.";
    });
    const statusOptions = [
      { label: "Approved (live)", value: "approved" },
      { label: "Proposed", value: "proposed" },
      { label: "Rejected", value: "rejected" },
      { label: "Retired", value: "retired" },
    ];
    const shellOptions = [
      { label: "PowerShell", value: "powershell" },
      { label: "Command Prompt", value: "cmd" },
      { label: "Bash", value: "bash" },
    ];
    const procSel = ref([]);
    const procOptions = ref([]);
    const procFiltered = ref([]);
    const procLoading = ref(false);
    const procById = new Map();

    async function loadProcedures() {
      if (procLoading.value) return;
      procLoading.value = true;
      try {
        if (!procOptions.value.length) {
          const d = await getProcedures({});
          for (const p of d.procedures || []) {
            // Keep the WHOLE procedure, not just its label: the review dialog opens from this map,
            // so reading a procedure costs no request and works even if the list later narrows.
            const opt = { ...p, label: `#${p.id} ${p.title}`, value: p.id };
            procById.set(p.id, opt);
          }
          procOptions.value = [...procById.values()];
          procFiltered.value = procOptions.value;
        }
      } catch {
        /* the picker degrades to whatever was already selected */
      } finally {
        procLoading.value = false;
      }
    }

    // A subject already attached to a procedure that has since been retired would vanish from
    // the list and look like it was never set - keep it, labelled, so the state is visible.
    function seedProcLabels(titles) {
      for (const t of titles || []) {
        const m = String(t).match(/^(\d+)\s+(.*)$/);
        if (!m) continue;
        const id = Number(m[1]);
        if (!procById.has(id)) procById.set(id, { label: `#${id} ${m[2]}`, value: id });
      }
      procOptions.value = [...procById.values()];
      procFiltered.value = procOptions.value;
    }

    function filterProcedures(val, update) {
      update(() => {
        const needle = String(val || "").toLowerCase();
        procFiltered.value = needle
          ? procOptions.value.filter((o) => o.label.toLowerCase().includes(needle))
          : procOptions.value;
      });
    }

    // ---- READING A PROCEDURE OVER THE FORM --------------------------------------------
    const procDialog = ref(false);
    const procDetail = ref(null);
    const procDetailLoading = ref(false);
    const procProbe = computed(() => {
      const p = procDetail.value && procDetail.value.probe;
      if (!p || !Object.keys(p).length) return "";
      return typeof p === "string" ? p : JSON.stringify(p, null, 2);
    });
    const procStatusColor = computed(() => {
      const s = (procDetail.value || {}).status;
      return s === "approved" ? "teal-8" : s === "retired" ? "grey-7" : "orange-8";
    });
    function procLabel(id) {
      const p = procById.get(Number(id));
      return p ? p.label : `#${id}`;
    }
    async function openProcedure(id) {
      const cached = procById.get(Number(id));
      procDetail.value = cached && cached.title ? cached : null;
      procDialog.value = true;
      if (procDetail.value) return;
      // Seeded from a title only (a procedure that no longer appears in the list): fetch it, so
      // the admin still sees what the subject is leaning on rather than a bare id.
      procDetailLoading.value = true;
      try {
        procDetail.value = await fetchAIProcedure(Number(id));
      } catch {
        notifyError(`Could not load procedure #${id}`);
        procDialog.value = false;
      } finally {
        procDetailLoading.value = false;
      }
    }
    // ---- HELP DESK ARTICLES -----------------------------------------------------------------
    // Stored as ids (`kb_article_ids`), shown as titles. The map is filled lazily: whatever ids a
    // subject already has are resolved when it is opened, and a newly typed id resolves when it is
    // added - so the editor never depends on a list it cannot get (the helpdesk has no
    // cross-customer article search).
    const kbById = ref({});
    const kbLoading = ref(false);
    const kbFiltered = ref([]);
    const kbQuery = ref("");
    const kbCatalogueCapped = ref(false);
    const kbDialog = ref(false);
    const kbDetail = ref(null);
    const kbDetailLoading = ref(false);
    const kbHint = computed(() =>
      kbCatalogueCapped.value
        ? "Search the helpdesk KB by title or company. The helpdesk API returns at most 100 articles, so this searches that slice - to use one beyond it, paste its id and press enter."
        : "Search the helpdesk KB by title or company. Type two or more characters; the search runs when you pause. Or paste an article id and press enter.",
    );
    const kbSel = computed({
      get: () => (edit.value.kb_article_ids || []).map(Number),
      set: (v) => {
        edit.value.kb_article_ids = (v || []).map(Number).filter((n) => !Number.isNaN(n));
      },
    });
    const kbOptions = computed(() => Object.values(kbById.value));
    function kbLabel(id) {
      const a = kbById.value[Number(id)];
      if (!a) return `#${id}`;
      return a.company ? `${a.title} (${a.company})` : a.title;
    }
    // THE TYPING IS THE FILTER. Quasar calls this on every keystroke (debounced by
    // input-debounce="400"), which is the "type a few characters and pause" the owner asked for.
    // Deliberately NOT client-side filtering of a preloaded list: the list cannot be preloaded
    // (the API caps at 100) and a local filter would only ever search what it happened to fetch.
    async function filterKb(val, update, abort) {
      kbQuery.value = String(val || "");
      if (kbQuery.value.length < 2) {
        update(() => { kbFiltered.value = []; });
        return;
      }
      const q = kbQuery.value;
      kbLoading.value = true;
      try {
        const r = await searchKbArticles(q);
        if (kbQuery.value !== q) return abort();  // a newer keystroke won: drop this answer
        const next = { ...kbById.value };
        const opts = (r.articles || []).map((a) => {
          const o = { ...a, label: a.company ? `${a.title} (${a.company})` : a.title, value: a.id };
          next[a.id] = o;
          return o;
        });
        kbCatalogueCapped.value = !!r.catalogue_capped;
        update(() => {
          kbById.value = next;
          kbFiltered.value = opts;
        });
      } catch {
        update(() => { kbFiltered.value = []; });
      } finally {
        kbLoading.value = false;
      }
    }
    // Typing a bare id is the normal way in (an id is what a technician has to hand), so accept
    // digits and multiple ids at once, then resolve them.
    function onNewKb(val, done) {
      const ids = String(val || "").match(/\d+/g);
      if (!ids) return;
      const fresh = ids.map(Number).filter((n) => !kbSel.value.includes(n));
      done(ids.map(Number));
      if (fresh.length) resolveKb(fresh);
    }
    async function resolveKb(ids) {
      const need = (ids || []).map(Number).filter((n) => n && !kbById.value[n]);
      if (!need.length) return;
      kbLoading.value = true;
      try {
        const r = await fetchKbArticles(need);
        const next = { ...kbById.value };
        for (const a of r.articles || []) {
          next[a.id] = { ...a, label: a.company ? `${a.title} (${a.company})` : a.title, value: a.id };
        }
        kbById.value = next;
      } catch {
        notifyError("Could not read those helpdesk articles");
      } finally {
        kbLoading.value = false;
      }
    }
    async function openKbArticle(id) {
      kbDetail.value = kbById.value[Number(id)] || null;
      kbDialog.value = true;
      // The list call only needs titles, so the body is fetched on open - one article at a time.
      if (kbDetail.value && kbDetail.value.content !== undefined && !kbDetail.value.missing) return;
      kbDetailLoading.value = true;
      try {
        const r = await fetchKbArticles([Number(id)]);
        const a = (r.articles || [])[0];
        if (a) {
          kbDetail.value = a;
          kbById.value = { ...kbById.value, [a.id]: { ...a, label: a.company ? `${a.title} (${a.company})` : a.title, value: a.id } };
        }
      } catch {
        notifyError(`Could not load article #${id}`);
      } finally {
        kbDetailLoading.value = false;
      }
    }

    const kbText = ref("");
    const clientsText = ref("");
    const domainsText = ref("");

    const live = computed(() => rows.value.filter((r) => r.status === "approved" && r.enabled));
    const proposed = computed(() => rows.value.filter((r) => r.status === "proposed"));

    const columns = [
      { name: "name", label: "Subject", field: "name", align: "left", style: "width: 34%" },
      { name: "status", label: "Status", field: "status", align: "left", sortable: true, style: "width: 12%" },
      { name: "mode", label: "Mode", field: "mode", align: "left", style: "width: 10%" },
      { name: "scope", label: "Clients", field: "all_clients", align: "left", style: "width: 16%" },
      { name: "stats", label: "Activity", field: "tickets_worked", align: "left", style: "width: 16%" },
      { name: "actions", label: "", field: "id", align: "right", style: "width: 12%" },
    ];

    // Never scroll sideways: shrink the CONTENT, not the window. On a narrow panel drop the
    // least load-bearing columns first - everything hidden here is on the row's own edit
    // dialog, so nothing becomes unreachable.
    const visibleColumns = computed(() => {
      if ($q.screen.lt.sm) return ["name", "status", "actions"];
      if ($q.screen.lt.md) return ["name", "status", "mode", "actions"];
      if ($q.screen.lt.lg) return ["name", "status", "mode", "scope", "actions"];
      return ["name", "status", "mode", "scope", "stats", "actions"];
    });

    const matchError = computed(() => {
      try {
        const v = JSON.parse(matchText.value || "{}");
        if (!v || typeof v !== "object" || Array.isArray(v)) return "must be a JSON object";
        return "";
      } catch (e) {
        return "not valid JSON";
      }
    });

    function statusColor(r) {
      if (r.status === "proposed") return "amber-9";
      if (r.status === "approved") return r.enabled ? "positive" : "grey-6";
      if (r.status === "rejected") return "negative";
      return "grey-6";
    }
    function statusLabel(r) {
      if (r.status === "approved") return r.enabled ? "LIVE" : "off";
      return r.status;
    }

    async function load() {
      loading.value = true;
      try {
        const d = await fetchAutomationSubjects();
        rows.value = d.subjects || [];
        emit("counts", { live: live.value.length, proposed: proposed.value.length });
        openFromLink();
      } catch (e) {
        notifyError("Could not load automation subjects");
      } finally {
        loading.value = false;
      }
    }

    const split = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

    // An empty rule is sent as {} so the subject keeps working its old way (mode + fix_actions),
    // rather than being stored as a rule with no blocks that means nothing to the interpreter.
    function normalizeRule() {
      const s = edit.value.statements;
      if (!s || !Array.isArray(s.blocks) || !s.blocks.length) return {};
      return s;
    }

    function openNew() {
      edit.value = { name: "", description: "", mode: "advise", status: "approved", instructions: "", agent_group: null,
        all_clients: true, clients: [], domains: [], baseline_minutes: null, match: {}, procedures: [], kb_article_ids: [],
        fix_actions: [], fix_target: {}, fix_cooldown_minutes: 60, statements: {} };
      matchText.value = JSON.stringify({ subject_regex: "", body_any: [] }, null, 2);
      kbText.value = "";
      procSel.value = [];
      loadProcedures();
      dialog.value = true;
    }
    function openEdit(r) {
      // A row written before this editor existed has neither field; default them so the form is
      // always editable rather than half-missing.
      edit.value = { fix_actions: [], fix_target: {}, fix_cooldown_minutes: 60, statements: {}, ...r };
      if (!Array.isArray(edit.value.fix_actions)) edit.value.fix_actions = [];
      if (!edit.value.fix_target || typeof edit.value.fix_target !== "object") edit.value.fix_target = {};
      if (!edit.value.statements || typeof edit.value.statements !== "object") edit.value.statements = {};
      if (!Array.isArray(edit.value.statements.blocks)) edit.value.statements.blocks = [];
      matchText.value = JSON.stringify(r.match || {}, null, 2);
      procText.value = (r.procedures || []).join(", ");
      procSel.value = (r.procedures || []).map(Number);
      seedProcLabels(r.procedure_titles);
      loadProcedures();
      kbText.value = "";
      resolveKb(r.kb_article_ids || []);
      clientsText.value = (r.clients || []).join(", ");
      domainsText.value = (r.domains || []).join(", ");
      dialog.value = true;
    }
    // ---- THE RULE ---------------------------------------------------------------------
    // The rule is one object on the subject: {prelude, terminator, blocks:[...]}. The editor
    // mutates it in place (see AIRuleBlock), so `ruleBlocks` is just a live handle on that array
    // - there is no second copy of the rule to keep in step. The prelude and the terminator are
    // NOT editable here on purpose: the server writes them into every saved rule, so no client
    // can produce a rule without its approval gate.
    const vocab = ref({ conditions: [], actions: [], prelude: null, terminator: null, max_depth: 4 });
    const ruleBlocks = computed(() => {
      const s = edit.value.statements;
      if (!s || typeof s !== "object") return [];
      if (!Array.isArray(s.blocks)) s.blocks = [];
      return s.blocks;
    });
    async function loadVocab() {
      if (vocab.value.conditions.length) return;
      try {
        vocab.value = await fetchRuleVocab();
      } catch {
        notifyError("Could not load the rule language - reload the page");
      }
    }
    function addRuleBlock() {
      ruleBlocks.value.push({
        if: { condition: "procedure_cause", args: {} },
        then: [{ action: "investigate", args: {} }],
        else: [{ action: "hand_to_human", args: {} }],
      });
    }
    function clearRule() {
      edit.value.statements = { blocks: [] };
    }

    // ---- "HAVE AN AI HELP WRITE THIS" -------------------------------------------------
    const draftOpen = ref(false);
    const draftText = ref("");
    const draftBusy = ref(false);
    const draftNotes = ref("");
    const draftErrors = ref([]);
    async function runDraft() {
      draftBusy.value = true;
      draftNotes.value = "";
      draftErrors.value = [];
      try {
        const r = await draftRule({ description: draftText.value, subject: edit.value.id || null });
        if (r.error) {
          draftErrors.value = [r.error];
          return;
        }
        if (r.statements && Array.isArray(r.statements.blocks)) {
          edit.value.statements = { blocks: r.statements.blocks };
        }
        draftNotes.value = r.notes || "";
        draftErrors.value = r.errors || [];
        // A draft is a suggestion, so its own validation problems are shown rather than
        // swallowed - they are the parts that need a human to fix them.
        if (!draftErrors.value.length) notifySuccess("Rule drafted - read it, then Save");
      } catch (e) {
        draftErrors.value = [String(e?.response?.data || e?.message || "The AI could not draft a rule")];
      } finally {
        draftBusy.value = false;
      }
    }

    async function submit() {
      // An action with no command is a half-written row; a list with no machine pinned is a fix
      // that cannot run. Refuse both here rather than letting the bridge silently degrade the
      // subject to read-only, which would look like a broken automation instead of a missing one.
      const actions = (edit.value.fix_actions || []).filter((a) => a && (a.name || a.command));
      if (actions.find((a) => !a.name || !a.command)) {
        notifyError("Every reviewed action needs both a name and a command.");
        return;
      }
      if (actions.length && !(edit.value.fix_target || {}).agent_id) {
        notifyError("Pin the machine the reviewed actions run on.");
        return;
      }
      saving.value = true;
      try {
        const payload = {
          ...edit.value,
          fix_actions: actions,
          statements: normalizeRule(),
          match: JSON.parse(matchText.value || "{}"),
          procedures: split(procText.value).map(Number).filter((n) => !Number.isNaN(n)),
          kb_article_ids: kbSel.value,
          clients: split(clientsText.value),
          domains: split(domainsText.value),
        };
        delete payload.procedure_titles; delete payload.mode_display;
        if (payload.id) await updateAutomationSubject(payload.id, payload);
        else await createAutomationSubject(payload);
        notifySuccess("Subject saved");
        dialog.value = false;
        await load();
      } catch (e) {
        notifyError(e?.response?.data || "Save failed");
      } finally {
        saving.value = false;
      }
    }
    async function save(r, patch) {
      try {
        await updateAutomationSubject(r.id, patch);
        await load();
      } catch (e) {
        notifyError("Update failed");
      }
    }
    async function decide(r, status) {
      await save(r, { status, enabled: status === "approved" });
      notifySuccess(status === "approved" ? `${r.name} is live` : `${r.name} rejected`);
    }
    function remove(r) {
      $q.dialog({ title: "Delete subject?", message: `${r.name} — matching tickets will no longer be worked automatically.`, cancel: true, ok: { label: "Delete", color: "negative" } })
        .onOk(async () => { try { await deleteAutomationSubject(r.id); await load(); } catch (e) { notifyError("Delete failed"); } });
    }

    // ---- deep link from the report email ---------------------------------------------
    // One shot, after the first load that actually contains the subject. The link is only
    // useful if it lands ON the row - opening the subjects tab and showing the whole list
    // looks like the link worked while quietly showing you everything.
    let openedFromLink = false;
    function openFromLink() {
      if (openedFromLink) return;
      const id = Number(props.openSubject);
      if (!id) return;
      const row = rows.value.find((r) => Number(r.id) === id);
      if (!row) return; // not there yet (still loading, or since deleted)
      openedFromLink = true;
      openEdit(row);
    }

    watch(() => edit.value.all_clients, () => {});
    onMounted(() => {
      load();
      loadGroups();
      getAgentOptions();
      loadVocab();
    });
    return { rows, groups, groupOptions, loading, saving, dialog, edit, matchText, matchError, procText, kbText, clientsText, domainsText,
      kbById, kbSel, kbOptions, kbFiltered, kbLoading, filterKb, onNewKb, kbLabel, kbDialog, kbDetail, kbDetailLoading, openKbArticle,
      kbQuery, kbHint, kbCatalogueCapped,
      visibleColumns,
      procSel, procFiltered, procLoading, filterProcedures, modeOptions,
      procDialog, procDetail, procDetailLoading, procProbe, procStatusColor, procLabel, openProcedure,
      fixAgent, fixAgentOptions, filterFixAgents, groupDisplay, modeNote, statusOptions, shellOptions,
      vocab, ruleBlocks, addRuleBlock, clearRule, draftOpen, draftText, draftBusy, draftNotes, draftErrors, runDraft,
      isFixMode, isInvestigateMode,
      live, proposed, columns, statusColor, statusLabel, load, openNew, openEdit, submit, save, decide, remove };
  },
});
</script>

<style scoped>
.subjects-root {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Never let the table push the page wider than the panel it lives in.
   table-layout:fixed + width:100% keeps the declared column percentages
   honest; long values ellipsis instead of stretching a column. */
.subjects-table {
  width: 100%;
  max-width: 100%;
}

.subjects-table :deep(table) {
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
}

/* NEVER a horizontal scrollbar here. This was `overflow-x: auto`, which put a sideways
   scrollbar on the subjects table the moment anything exceeded its column by a pixel.
   The page is required to fit: columns are percentages, the layout is fixed, cells wrap,
   and on a narrow window low-value columns are dropped (see visibleColumns) rather than
   squeezed until they overflow. */
.subjects-table :deep(.q-table__middle) {
  max-width: 100%;
  overflow-x: hidden;
}

.subjects-table :deep(th),
.subjects-table :deep(td) {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Subject name/description: wrap rather than run off the edge. */
.subjects-table :deep(td) .text-weight-medium {
  overflow-wrap: anywhere;
}

/* Activity + row buttons: allow a second line instead of forcing width. */
.subjects-stats,
.subjects-actions {
  white-space: normal;
}

/* Legend wraps under the buttons on a narrow panel instead of widening the row. */
.modes-legend {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

/* ---- THE SUBJECT EDITOR ------------------------------------------------------------
   One column of sections with a steady rhythm, and a body that scrolls instead of
   growing past the window. The old layout put fifteen fields of mixed height into a single
   flat card-section, so long content overlapped and Save drifted off-screen. */
/* 75% of the window wide and 90% tall (owner, 2026-09-28: "make the edit subject wider so it's
   easier to edit... slightly taller so it fits 90% height of the window and 75% width").
   The card is a flex column so the HEADER and the SAVE ROW are fixed while only the body
   scrolls - a fixed height with a body that cannot shrink would put Save out of reach again. */
.subject-card {
  width: 75vw;
  max-width: 96vw;
  min-width: 320px;
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.subject-body {
  /* flex:1 + min-height:0 is what lets this child shrink below its content and scroll inside a
     fixed-height card; without min-height:0 a flex item refuses to go smaller than its content. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
}

/* Section heading: small, quiet, unmistakably a divider rather than another field. */
.sec-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #90a4ae;
}

.sec-subtitle {
  font-size: 13px;
  font-weight: 600;
}

/* Space goes ABOVE a separator, never below it: the heading that follows belongs to what
   comes next, so it must sit tight to its own section. */
.sec-sep {
  margin: 22px 0 14px;
}

/* The plain-language ceiling sentence under the Mode select. */
.sec-note {
  font-size: 12px;
  line-height: 1.45;
  padding: 8px 10px;
  border-left: 3px solid #4db6ac;
  background: rgba(77, 182, 172, 0.08);
  border-radius: 0 4px 4px 0;
  overflow-wrap: anywhere;
}

/* One reviewed action, boxed so two of them never read as one long row of inputs. */
.action-card {
  border: 1px solid rgba(144, 164, 174, 0.28);
  border-radius: 6px;
  padding: 10px 12px 12px;
}

/* ---- THE RULE -----------------------------------------------------------------------
   The fixed first and last lines are shown as locked, in the same stack as the editable
   blocks, so it is obvious that they are part of the rule and not something the editor is
   hiding. */
.rule-shell {
  border: 1px solid rgba(144, 164, 174, 0.28);
  border-radius: 6px;
  padding: 10px 12px;
}
.rule-fixed {
  font-family: monospace;
  font-size: 12px;
  color: #80cbc4;
  padding: 4px 0;
}
.rule-fixed--end {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed rgba(144, 164, 174, 0.35);
}
.rule-fixed-note {
  font-family: inherit;
  font-size: 11px;
  line-height: 1.4;
  color: #90a4ae;
  margin-top: 2px;
  margin-left: 18px;
}
.rule-empty-block {
  font-size: 12px;
  color: #78909c;
  font-style: italic;
  padding: 6px 0;
}

/* The procedures this subject leans on, as buttons you can read. */
.proc-chip {
  background: rgba(77, 182, 172, 0.14);
  color: #b2dfdb;
  font-size: 11px;
}

/* Help desk articles: the same treatment, and a missing one is visibly missing rather than
   quietly blank - an id nobody can resolve must not look like a working reference. */
.kb-chip {
  background: rgba(33, 150, 243, 0.16);
  color: #bbdefb;
  font-size: 11px;
}
.kb-chip--missing {
  background: rgba(244, 67, 54, 0.18);
  color: #ffcdd2;
}

/* ---- THE PROCEDURE READER (stacked on the subject editor) ---------------------------- */
.proc-card {
  width: 70vw;
  max-width: 1000px;
  min-width: 320px;
  height: 85vh;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.proc-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.proc-field {
  margin-bottom: 14px;
}
.proc-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #90a4ae;
  margin-bottom: 3px;
}
.proc-text {
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.proc-pre {
  font-family: monospace;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 4px;
  padding: 8px 10px;
  margin: 0;
  max-height: 200px;
  overflow: auto;
}

/* A Fix subject that cannot act yet: stated where the fix is, not hidden in a disabled option. */
.sec-note--warn {
  border-left-color: #ffb74d;
  background: rgba(255, 183, 77, 0.10);
}

/* The pre-rule path: still the thing that executes today, so it stays reachable but out of the
   way of the rule the admin is actually authoring. */
.legacy-box {
  border: 1px solid rgba(144, 164, 174, 0.28);
  border-radius: 6px;
}

/* The drafting assistant's box: set apart from the rule it is about to replace. */
.draft-box {
  border: 1px solid rgba(77, 182, 172, 0.35);
  border-radius: 6px;
  padding: 10px 12px;
  background: rgba(77, 182, 172, 0.04);
}
.draft-notes {
  font-size: 12px;
  line-height: 1.5;
  color: #cfd8dc;
  white-space: pre-wrap;
}
.draft-errors {
  font-size: 12px;
  line-height: 1.5;
  color: #ff8a80;
}
</style>
