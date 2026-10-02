<template>
  <div ref="root" class="pichat bg-grey-10 text-white">
    <!-- toolbar -->
    <q-toolbar class="bg-grey-9 text-white q-px-sm pi-toolbar">
      <!-- On a phone (the installed app, or any narrow screen) there is no window to close:
           this is how you get back to the inbox. -->
      <q-btn
        v-if="isPhone"
        flat
        dense
        round
        icon="arrow_back"
        class="q-mr-xs"
        aria-label="Back to inbox"
        @click="backToInbox"
      />
      <!-- ☰ Options menu. Every switch and session action lives HERE now - the bar keeps
           only what you read at a glance (label, cost, model, alerts, connection). -->
      <q-btn
        flat
        dense
        round
        icon="menu"
        class="q-mr-sm"
        aria-label="Chat options"
        data-test="pi-options-menu"
      >
        <q-tooltip>Options &amp; switches</q-tooltip>
        <q-menu dark>
          <q-list dense dark class="q-py-sm" style="min-width: 320px; max-width: 90vw">
            <q-item-label header class="text-grey-5">Automation</q-item-label>
            <q-item v-if="autoapproveAllowed" tag="label" dense>
              <q-item-section>
                <q-item-label>Auto-approve</q-item-label>
                <q-item-label caption>Run device actions without asking each time</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="autoApprove"
                  dense
                  color="orange"
                  @update:model-value="sendAutoApprove"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="autocredentialAllowed" tag="label" dense>
              <q-item-section>
                <q-item-label>Auto-credential</q-item-label>
                <q-item-label caption>
                  Read ordinary stored logins without asking. Privileged rows still ask;
                  every lookup is audited.
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="autoCredential"
                  dense
                  color="purple"
                  @update:model-value="sendAutoCredential"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="isDecision && autototpAllowed" tag="label" dense>
              <q-item-section>
                <q-item-label>Auto-TOTP</q-item-label>
                <q-item-label caption>
                  Save new TOTP authenticators and use live codes to sign in without asking.
                  The judge still reviews every save.
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="autoTotp"
                  dense
                  color="deep-purple"
                  @update:model-value="sendAutoTotp"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="isDecision" tag="label" dense>
              <q-item-section>
                <q-item-label>Allow customer email</q-item-label>
                <q-item-label caption>Off = Pi drafts replies for you instead of sending</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="allowEmail"
                  dense
                  color="teal"
                  @update:model-value="sendAllowEmail"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="mutateAllowed" tag="label" dense>
              <q-item-section>
                <q-item-label>{{ readOnly ? "Read-only (devices)" : "Write mode (devices)" }}</q-item-label>
                <q-item-label caption>
                  Write mode lets Pi apply changes on the machines; each action still asks
                  unless Auto-approve is on
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  :model-value="!readOnly"
                  dense
                  color="deep-orange"
                  @update:model-value="(v) => setReadonly(!v)"
                />
              </q-item-section>
            </q-item>
            <q-item v-else-if="readOnly" dense>
              <q-item-section>
                <q-item-label class="text-blue-grey-3">Read-only (devices)</q-item-label>
                <q-item-label caption>Your role cannot enable Write mode</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator dark class="q-my-sm" />
            <q-item-label header class="text-grey-5">Session</q-item-label>
            <!-- Mobile only: keep the session running while this phone is in the background
                 (auto-on when the phone drives; this is the manual switch). -->
            <q-item v-if="isPhone" tag="label" dense :disable="!isDriver">
              <q-item-section avatar><q-icon name="push_pin" /></q-item-section>
              <q-item-section>
                <q-item-label>Pin session</q-item-label>
                <q-item-label caption>Keep running while this phone is in the background</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle :model-value="pinned" dense :disable="!isDriver || !connected" @update:model-value="setPin" />
              </q-item-section>
            </q-item>
            <q-item v-if="!isDecision" clickable v-close-popup @click="openMachinesDialog">
              <q-item-section avatar>
                <q-icon name="lan" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ isMulti ? "Machines" : "Multi-machine" }}</q-item-label>
                <q-item-label caption>Work several machines in one conversation</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="!isDecision" clickable v-close-popup @click="startNewChat">
              <q-item-section avatar>
                <q-icon name="add" />
              </q-item-section>
              <q-item-section>
                <q-item-label>New chat</q-item-label>
                <q-item-label caption>Fresh conversation on this machine</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator dark class="q-my-sm" />
            <q-item-label header class="text-grey-5">History &amp; cost</q-item-label>
            <q-item tag="label" dense data-test="pi-auto-summarize">
              <q-item-section avatar><q-icon name="auto_mode" /></q-item-section>
              <q-item-section>
                <q-item-label>Auto-summarize</q-item-label>
                <q-item-label caption>
                  When this window is past the limit, it summarizes before the next task starts
                  (a finished ticket is never summarized).
                  <span v-if="summarizeInherited">Using the agent group's / model's setting ({{ summarizeInheritedK }}k).</span>
                  <span v-else>
                    This window's own setting.
                    <a href="#" class="text-green-4" @click.prevent.stop="resetAutoSummarizeTokens">Use the group default ({{ summarizeInheritedK }}k)</a>
                  </span>
                  Changing it here changes this window only.
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle
                  v-model="autoSummarize"
                  dense
                  color="green"
                  @update:model-value="sendAutoSummarize"
                />
              </q-item-section>
            </q-item>
            <q-item dense>
              <q-item-section avatar />
              <q-item-section>
                <q-input
                  v-model.number="autoSummarizeK"
                  type="number"
                  dense
                  dark
                  outlined
                  :min="20"
                  :max="1000"
                  :disable="!autoSummarize"
                  suffix="k tokens"
                  label="Summarize at"
                  data-test="pi-auto-summarize-tokens"
                  @keydown.enter.prevent="sendAutoSummarizeTokens"
                  @blur="sendAutoSummarizeTokens"
                  @click.stop
                />
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              :disable="streaming || compacting"
              @click="compactWindow"
            >
              <q-item-section avatar>
                <q-icon name="compress" :color="contextPct >= 80 ? 'orange' : undefined" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Summarize (compact)</q-item-label>
                <q-item-label caption>
                  Shrink what the AI re-reads every turn; the transcript above stays readable
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              :disable="streaming || compacting"
              data-test="pi-summarize-clear"
              @click="clearConfirm = true"
            >
              <q-item-section avatar>
                <q-icon name="delete_sweep" color="orange" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Summarize &amp; clear history</q-item-label>
                <q-item-label caption>
                  Same, plus wipe the transcript from this window &mdash; keep working in the
                  same chat without paying for the old history
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
      <div class="column pi-title q-mr-sm">
        <div class="text-subtitle2 ellipsis">
          Pi.dev &mdash; {{ hostname || (isMulti ? "multi-machine" : agentId) }}
          <!-- The ticket's CURRENT helpdesk stage (refreshed after every turn). -->
          <q-badge
            v-if="isDecision && ticketStage"
            :color="stageColor(ticketStage)"
            :label="ticketStage"
            class="q-ml-xs"
            style="vertical-align: middle"
          />
        </div>
        <div class="text-caption text-grey-5 ellipsis">
          {{ clientSite }}
        </div>
      </div>
      <q-space />
      <!-- Summarizing progress. The action lives in the ☰ menu, which closes on click -
           without this chip there is NOTHING on screen saying a billable, minute-long
           LLM call is running. Toolbar chip = visible even when scrolled up. -->
      <q-chip
        v-if="compacting"
        dense
        square
        color="amber-9"
        text-color="white"
        class="q-mr-sm"
      >
        <q-spinner-hourglass size="14px" class="q-mr-xs" />
        Summarizing…
        <q-tooltip>
          The AI is writing a summary of this conversation. Takes up to a minute or two
          on a long chat. The window updates by itself when it finishes.
        </q-tooltip>
      </q-chip>
      <!-- SESSION LABEL. The technician's own name for this conversation, so AI History
           can be searched by what the work WAS. The generated name ("Chat about PBX3")
           and the last-message snippet are enough to find a session from ten minutes ago
           and useless for finding the one from Tuesday. Saved on blur/Enter, not on every
           keystroke, so typing does not chatter over the socket. -->
      <q-input
        v-model="sessionLabel"
        dense
        dark
        outlined
        clearable
        placeholder="Label this chat"
        class="q-mr-sm pi-label-input"
        style="min-width: 140px; max-width: 220px"
        :maxlength="120"
        data-test="ai-session-label"
        @blur="sendLabel"
        @keyup.enter="sendLabel"
        @clear="sendLabel"
      >
        <template #prepend>
          <q-icon name="label" size="xs" />
        </template>
        <q-tooltip>
          Your own name for this conversation (e.g. "ACD clone UI", "Jeremy archive").
          It shows in the AI History tab and in this window's title, so you can find
          this chat later. Saved when you press Enter or click away; clear it to go
          back to the generated name.
        </q-tooltip>
      </q-input>
      <!-- Running cost meter. Rendered only when the role carries can_view_ai_cost
           (or superuser); the server withholds the data entirely otherwise. -->
      <q-chip
        v-if="costVisible"
        dense
        square
        :color="costColor"
        text-color="white"
        icon="payments"
        class="q-mr-sm"
        data-test="ai-cost-meter"
      >
        <span v-if="pricingKnown">{{ fmtMoney(sessionCost) }}</span>
        <span v-else>&mdash;</span>
        <span v-if="contextWindow" class="q-ml-xs text-caption">
          &middot; {{ contextPct }}%
        </span>
        <q-tooltip anchor="bottom middle" self="top middle" max-width="420px">
          <div class="text-weight-bold q-mb-xs">This conversation</div>
          <div v-if="!pricingKnown" class="text-orange-4 q-mb-xs">
            One of the models in use has no published pricing, so cost cannot be
            calculated. Totals below are incomplete.
          </div>
          <div>
            Total: <b>{{ fmtMoney(sessionCost) }}</b>
            &middot; {{ costTurns }} turns
            &middot; <b>{{ fmtMoney(costPerTurn) }}/turn</b>
          </div>
          <div>Last turn: {{ fmtMoney(lastTurnCost) }}</div>
          <!-- DESKTOP WORK. Driving the Operator desktop has no separate line on a provider
               bill: its cost IS the turns it consumed (every desktop action is a model call
               that re-reads the whole conversation, and a flaky one retries). So it is shown
               as a subset of the total, not as an extra charge. -->
          <div v-if="costDesktop && costDesktop.calls" class="q-mt-xs">
            <q-icon name="desktop_windows" size="14px" />
            Desktop actions: <b>{{ costDesktop.calls }}</b>
            &middot; {{ fmtMoney(costDesktop.cost) }}
            <div class="text-grey-4" style="font-size: 11px">
              {{ costDesktop.turns }} turn{{ costDesktop.turns === 1 ? "" : "s" }} driving the screen.
              A desktop action costs nothing by itself — it costs the conversation turn that
              requests it, and every later turn re-reads the result.
            </div>
          </div>

          <!-- The meter above is THIS conversation only: a new chat starts at $0.00 even
               on a device that has spent hundreds. The lifetime figure is what billing
               cares about, so it is kept here rather than dropped. -->
          <div v-if="windowCost !== null" class="text-grey-4 q-mt-xs">
            {{ windowScope === "ticket" ? "This ticket" : "This device" }}, all chats:
            <b>{{ fmtMoney(windowCost) }}</b>
            &middot; {{ windowTurns }} turns
          </div>

          <!-- Where the money went. cacheWrite/cacheRead usually dominate, which is
               invisible in a single total. -->
          <template v-if="costSpend">
            <div class="text-weight-bold q-mt-sm">Where it went</div>
            <div>Cache write: {{ fmtMoney(costSpend.cacheWrite) }}</div>
            <div>Cache read: {{ fmtMoney(costSpend.cacheRead) }}</div>
            <div>Output: {{ fmtMoney(costSpend.output) }}</div>
            <div>Input: {{ fmtMoney(costSpend.input) }}</div>
          </template>

          <template v-if="costByRole.length">
            <div class="text-weight-bold q-mt-sm">By role (since this window opened)</div>
            <div v-for="br in costByRole" :key="br.role + br.model">
              {{ br.role }} &middot; {{ String(br.model).split("/").pop() }} &middot;
              {{ br.turns }} turn{{ br.turns === 1 ? "" : "s" }} &middot; {{ fmtMoney(br.cost) }}
            </div>
          </template>
          <template v-if="costByModel.length > 1">
            <div class="text-weight-bold q-mt-sm">By model</div>
            <div v-for="bm in costByModel" :key="bm.model">
              {{ bm.model }} &middot; {{ bm.turns }} turns &middot;
              {{ fmtMoney(bm.cost) }} ({{ fmtMoney(bm.cost_per_turn) }}/turn)
            </div>
            <div v-if="modelSwitches > 0" class="text-orange-4 q-mt-xs">
              {{ modelSwitches }} model switch{{ modelSwitches === 1 ? "" : "es" }} &mdash;
              {{ fmtMoney(switchSpend) }} of that was re-caching this conversation into
              another model. Prefer a new chat over switching mid-conversation.
            </div>
          </template>

          <div class="text-weight-bold q-mt-sm">Tokens</div>
          <div>
            in {{ fmtTokens(costTokens.input) }} &middot; out
            {{ fmtTokens(costTokens.output) }} &middot; cache-read
            {{ fmtTokens(costTokens.cacheRead) }} &middot; cache-write
            {{ fmtTokens(costTokens.cacheWrite) }}
          </div>
          <div v-if="contextWindow">
            Context: {{ fmtTokens(contextTokens) }} / {{ fmtTokens(contextWindow) }}
            ({{ contextPct }}%)
          </div>
          <div v-if="contextPct >= 80" class="text-orange-4 q-mt-xs">
            Context is nearly full &mdash; Compact to keep working in this chat.
          </div>
        </q-tooltip>
      </q-chip>
      <q-select
        v-model="selectedTarget"
        :options="targetOptions"
        emit-value
        map-options
        dense
        dark
        options-dense
        outlined
        hide-bottom-space
        label="Model / group"
        class="q-mr-sm pi-target-select"
        @update:model-value="onTargetChange"
      >
        <q-tooltip>
          Pick a team (orchestrator + cheap specialists) or a single model. Not both.
        </q-tooltip>
      </q-select>
      <q-btn
        flat
        round
        dense
        :icon="soundEnabled || desktopEnabled ? 'notifications_active' : 'notifications_off'"
        class="q-mr-sm"
        aria-label="AI completion alerts"
        @click="primeCompletionAudio"
      >
        <q-tooltip>AI sound &amp; desktop alerts</q-tooltip>
        <q-menu dark>
          <div class="q-pa-md" style="width: 320px; max-width: 90vw">
            <div class="text-subtitle2 q-mb-sm">AI sound &amp; desktop alerts</div>
            <q-toggle
              :model-value="soundEnabled"
              color="primary"
              label="Sounds: ding when done, bong when approval needed"
              @update:model-value="setSoundAlert"
            />
            <q-toggle
              :model-value="desktopEnabled"
              :disable="!notificationSupported || notificationPermission === 'denied'"
              color="primary"
              label="Show a desktop notification"
              @update:model-value="setDesktopNotifications"
            />
            <q-toggle
              v-model="onlyWhenUnfocused"
              :disable="!desktopEnabled"
              color="primary"
              label="Desktop notification only when unfocused"
            />
            <div class="text-caption text-grey-5 q-mt-xs">
              {{ desktopStatus }}
            </div>
            <q-separator dark class="q-my-sm" />
            <q-btn
              outline
              dense
              no-caps
              icon="notifications"
              label="Test alerts"
              @click="testCompletionAlerts"
            />
          </div>
        </q-menu>
      </q-btn>
      <!-- PROMPT QUEUE toggle. The panel itself (right of the chat, or over it on a narrow
           window) holds every queue control; this button only opens and closes it. -->
      <q-btn
        flat
        dense
        no-caps
        :color="queueOpen ? 'primary' : 'white'"
        icon="playlist_add_check"
        label="Queue"
        class="q-mr-sm"
        data-test="pi-queue-toggle"
        @click="queueOpen ? queueClose() : (queueOpen = true)"
      >
        <q-badge
          v-if="queuePending > 0"
          floating
          :color="queuePaused ? 'orange-8' : queueAuto ? 'green-8' : 'blue-grey-7'"
          :label="queuePending"
        />
        <q-tooltip>
          Prompt queue: write down what to do next; with Auto-Next on each one is sent as
          soon as the assistant finishes.
        </q-tooltip>
      </q-btn>
      <q-badge
        :color="connected ? 'green' : 'red'"
        :label="connected ? 'connected' : 'disconnected'"
      />
    </q-toolbar>

    <!-- body: the chat column, plus the queue panel to its right (over it when narrow) -->
    <div class="pi-body">
    <div class="pi-main">
    <!-- messages -->
    <!-- SEAT BANNER. Only shown when it says something: someone else driving, or
         someone asking for the seat. -->
    <q-banner v-if="seatTaken" dense class="bg-blue-grey-9 text-grey-3 q-px-md">
      <template #avatar><q-icon name="visibility" color="amber-6" /></template>
      Read-only &mdash; <b>{{ presence.owner.display }}</b> is driving this session{{ presence.owner_connected ? '' : ' (disconnected; seat held)' }}.
      <span v-if="presence.viewers && presence.viewers.length > 1" class="text-grey-5">
        &middot; {{ presence.viewers.length }} watching
      </span>
      <template #action>
        <q-btn dense flat no-caps size="sm" icon="group" label="Access" @click="accessDialog = true" />
      </template>
    </q-banner>
    <q-banner v-else-if="presence && presence.viewers && presence.viewers.length > 1" dense class="bg-grey-9 text-grey-4 q-px-md">
      <template #avatar><q-icon name="groups" color="light-green-6" /></template>
      You are driving &middot; {{ presence.viewers.length - 1 }} other{{ presence.viewers.length > 2 ? 's' : '' }} watching read-only.
      <span v-if="grantCount" class="text-amber-6">&middot; {{ grantCount }} waiting for the seat</span>
      <template #action>
        <q-btn dense flat no-caps size="sm" icon="group" :label="`Access (${roster.people.length})`" @click="accessDialog = true" />
      </template>
    </q-banner>
    <!-- WHAT THIS AUTOMATION IS ABOUT TO DO, BEFORE IT DOES IT.

         Owner's shape (2026-09-28): "when the tech get's take to the area where it works on things...
         it will be told what its about to do first... that way the tech can review before you say
         go." The plan is the subject's RULE read out for THIS ticket, with the machine and script
         names filled in - not prose a model wrote - so what the technician approves is exactly what
         would run. Approving the rule alone would be a blank cheque; this is the cheque. -->
    <q-card v-if="isDecision && approval && approval.state !== 'none'" flat bordered class="automation-card q-mx-md q-mt-sm">
      <q-card-section class="q-py-sm">
        <div class="row items-center">
          <q-icon name="smart_toy" size="18px" class="q-mr-sm" />
          <div class="text-subtitle2">
            {{ approval.state === 'awaiting_review' ? 'This automation wants to work this ticket'
               : approval.state === 'approved' ? 'Approved to work this ticket'
               : approval.state === 'declined' ? 'Declined' : `Automation approval: ${approval.state}` }}
          </div>
          <q-space />
          <div v-if="approval.subject && approval.subject.name" class="text-caption text-grey-7">
            subject: {{ approval.subject.name }}
          </div>
        </div>

        <div v-if="approval.state === 'awaiting_review' || approval.state === 'approved'" class="q-mt-sm">
          <div class="text-caption text-grey-7">On this ticket it would:</div>
          <div class="plan-list">
            <div v-for="(s, i) in approval.plan && approval.plan.steps || []" :key="`st${i}`"
                 class="plan-step" :class="{ 'plan-step--mutates': s.mutating }"
                 :style="{ marginLeft: `${(s.depth || 0) * 14}px` }">
              <span class="plan-step-text">{{ s.step }}</span>
              <span v-if="s.detail" class="text-grey-7"> · {{ s.detail }}</span>
              <span v-if="s.needs_ai" class="text-amber-8"> · the AI decides this</span>
              <q-badge v-if="s.mutating" dense color="orange-9" label="changes something" class="q-ml-xs" />
            </div>
          </div>
          <div v-if="approval.plan && approval.plan.host" class="text-caption text-grey-7 q-mt-xs">
            Machine: {{ approval.plan.host }}
          </div>

          <div v-if="approval.state === 'approved'" class="plan-approved q-mt-sm">
            Approved by {{ approval.approved_by || 'someone' }}
            ({{ approval.approver_capacity === 'support_contact' ? 'support contact' : 'technician' }})
            <span v-if="approval.approved_at"> at {{ whenAgo(approval.approved_at) }}</span>.
            <span v-if="approval.expires_at"> Valid until {{ whenAgo(approval.expires_at) }} from now.</span>
            The AI works below - watch the commands and their output run live.
          </div>

          <div v-if="!approval.rule_still_matches" class="plan-warn q-mt-sm">
            The rule has been edited since this plan was written, so the approval no longer applies.
            Ask for a new plan before letting it run.
          </div>

          <div class="row items-center q-gutter-sm q-mt-sm">
            <q-btn v-if="approval.state === 'awaiting_review'" dense unelevated no-caps color="teal-8"
                   icon="play_arrow" label="Go - approve this plan" :loading="approvalBusy"
                   @click="decideApproval('approve')" />
            <q-btn v-if="approval.state === 'awaiting_review'" dense flat no-caps color="negative"
                   label="Decline" :disable="approvalBusy" @click="decideApproval('decline')" />
            <q-btn v-if="approval.state === 'approved'" dense flat no-caps color="grey-6"
                   label="Withdraw the approval" :disable="approvalBusy" @click="decideApproval('decline')" />
            <q-btn dense flat no-caps size="sm" color="grey-6" label="re-read" :loading="approvalBusy"
                   @click="loadApproval()" />
          </div>
        </div>

        <div v-else class="text-caption text-grey-7 q-mt-sm">
          {{ approval.declined_by ? `Declined by ${approval.declined_by}. ` : '' }}
          {{ approval.decline_reason || 'The automation will not act on this ticket until a new plan is approved.' }}
          <q-btn dense flat no-caps size="sm" color="primary" label="ask for a new plan"
                 :loading="approvalBusy" @click="requestApprovalPlan" />
        </div>

        <div v-if="approvalError" class="text-caption text-negative q-mt-sm">{{ approvalError }}</div>
      </q-card-section>
    </q-card>

    <q-banner v-if="takeoverAsk" dense class="bg-amber-9 text-black q-px-md">
      <template #avatar><q-icon name="sports_esports" /></template>
      <b>{{ takeoverAsk.from.display }}</b> is asking to take over this session. No answer in {{ takeoverAsk.timeout_s }}s means no.
      <template #action>
        <q-btn flat dense no-caps label="Hand over" @click="answerTakeover(true)" />
        <q-btn flat dense no-caps label="Keep it" @click="answerTakeover(false)" />
      </template>
    </q-banner>
    <!-- ACCESS. Who holds the seat, who is watching, and everyone who has had access to this
         session - so the driver can hand control BACK to someone they took it from (a demoted
         user otherwise has no route back: taking over needs can_take_over_ai_session, and an
         admin driver's seat needs their consent). -->
    <q-dialog v-model="accessDialog">
      <q-card style="min-width: 460px; max-width: 620px">
        <q-card-section class="text-subtitle1">Who has access to this session</q-card-section>
        <q-card-section class="q-pt-none q-gutter-sm">
          <div v-if="!roster.people.length" class="text-grey">Nobody has joined this session yet.</div>
          <q-list dense bordered separator>
            <q-item v-for="p in roster.people" :key="p.username">
              <q-item-section avatar>
                <q-icon :name="p.driving ? 'sports_esports' : p.connected ? 'visibility' : 'history'"
                        :color="p.driving ? 'amber-8' : p.connected ? 'light-green-6' : 'grey-6'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <b>{{ p.display }}</b>
                  <span v-if="p.username === myUsername" class="text-grey-6"> (you)</span>
                </q-item-label>
                <q-item-label caption>
                  {{ p.driving ? "driving now" : p.connected ? "watching read-only" : "not connected" }}
                  <span v-if="p.drives"> &middot; has driven {{ p.drives }}&times;</span>
                  <span v-if="!p.connected && p.last_seen"> &middot; last seen {{ whenAgo(p.last_seen) }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn v-if="isDriver && !p.driving" dense flat no-caps size="sm" color="primary"
                       icon="sports_esports" label="Give control" :loading="grantPending === p.username"
                       @click="giveControl(p.username)">
                  <q-tooltip>Hand the seat to {{ p.display }}. They drive at once if connected, otherwise the moment they return.</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-if="roster.grants && roster.grants.length">
            <div class="text-caption text-amber-8 q-mb-xs">Waiting to drive (seat granted, not used yet)</div>
            <q-list dense bordered separator>
              <q-item v-for="g in roster.grants" :key="g.username">
                <q-item-section avatar><q-icon name="pending" color="amber-8" /></q-item-section>
                <q-item-section>
                  <q-item-label><b>{{ g.display }}</b></q-item-label>
                  <q-item-label caption>given by {{ g.by }}{{ g.connected ? " - connected, will take the seat" : " - when they next connect" }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn v-if="isDriver" dense flat no-caps size="sm" color="negative" label="Undo" @click="cancelGrant(g.username)" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div class="text-caption text-grey-7">
            Giving control does not change anyone's RMM permissions - it only moves the seat of
            this live session. The person keeps watching read-only until you hand it over.
          </div>

          <!-- CAPABILITIES FOR THIS SESSION. The technician who needs the switch is right here
               in the roster, so turning it on belongs here - not in Global Settings, and not in
               their own hamburger (which only lists switches their role already allows). The
               server writes `can_grant_caps` into the session, and refuses anyone else anyway. -->
          <template v-if="canGrantCaps && capScopeRef">
            <q-separator class="q-my-sm" />
            <div class="text-caption text-amber-8 q-mb-xs">Capabilities in this session</div>
            <div class="text-caption text-grey-7 q-mb-sm">
              Adds a switch for one technician <b>on top of their role</b>, for this
              {{ isDecision ? "ticket" : "device" }} only. Their role is untouched, and the
              exception lapses on its own.
            </div>
            <div class="row q-col-gutter-sm q-mb-sm">
              <q-select
                class="col-12 col-sm-6"
                dense
                outlined
                v-model="capUsername"
                :options="capPeopleOptions"
                emit-value
                map-options
                label="Technician"
                :hint="capPeopleHint"
              />
              <q-select
                class="col-12 col-sm-6"
                dense
                outlined
                v-model="capMinutes"
                :options="capDurations"
                emit-value
                map-options
                label="For how long"
              />
            </div>
            <div class="q-mb-sm">
              <div v-for="c in capCatalog" :key="c.id" class="row items-start no-wrap">
                <q-checkbox dense v-model="capPicked" :val="c.id" class="q-mr-xs q-mt-xs" />
                <div class="cap-opt">
                  <div class="text-body2">{{ c.label }}</div>
                  <div class="text-caption text-grey-7">{{ c.hint }}</div>
                  <div v-if="capExisting.includes(c.id)" class="text-caption text-teal-8">
                    already granted in this scope - granting again only extends it
                  </div>
                  <div v-else-if="capRoleAllowed[c.id]" class="text-caption text-grey-6">
                    their role already allows this
                  </div>
                </div>
              </div>
            </div>
            <div class="row items-center q-gutter-sm">
              <q-btn
                dense
                unelevated
                no-caps
                color="primary"
                label="Grant and switch on"
                :loading="capSaving"
                :disable="!capPicked.length || !capUsername"
                @click="grantCapabilities"
              />
              <q-btn
                v-if="capExisting.length"
                dense
                flat
                no-caps
                color="negative"
                label="Withdraw all"
                :loading="capSaving"
                @click="withdrawCapabilities"
              />
              <span v-if="capMessage" class="text-caption text-grey-7">{{ capMessage }}</span>
            </div>
          </template>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- SCROLL PAUSE. `@scroll` decides, on every scroll, whether this transcript is
         still "at the bottom" (within 1% of the scrollable height). While it is not,
         nothing auto-scrolls: what you are reading, selecting or copying stays exactly
         where it is, however much the AI writes underneath. See onTranscriptScroll(). -->
    <div ref="scrollArea" class="pi-messages q-pa-md" @scroll.passive="onTranscriptScroll">
      <div v-for="(msg, i) in messages" :key="i" class="q-mb-md">
        <!-- user -->
        <div v-if="msg.role === 'user'" class="pi-user-row">
          <!-- pi-text carries `white-space: pre-wrap`. Without it the browser collapses every
               run of whitespace and drops newlines, so anything pasted in - a log extract, a
               command, a list, an indented block - rendered as one unreadable paragraph the
               instant it was sent, even though it looked right in the textarea. The assistant
               bubble always had it; the user's own message did not. -->
          <div class="pi-user-wrap">
            <!-- Where it was typed matters when two surfaces drive one session: a message
                 that arrived from a phone should not read as if the person at the desk
                 sent it. -->
            <div v-if="msg.via" class="text-caption text-grey-5 text-right q-mb-xs">
              <q-icon name="person" size="14px" /> {{ msg.via }}
            </div>
            <div v-else-if="msg.steered" class="text-caption text-grey-5 text-right q-mb-xs">
              <q-icon name="alt_route" size="14px" /> steered into the running turn
            </div>
            <div v-else-if="msg.queued" class="text-caption text-grey-5 text-right q-mb-xs">
              <q-icon name="playlist_play" size="14px" /> {{ msg.queuedReply ? "answered in the queue" : "from the queue" }}
            </div>
            <!-- Attachments that went with this message. Thumbnails for images (click to
                 open full size) and a chip per text file - the file body itself is in the
                 model's copy of the turn, not in the bubble. -->
            <div v-if="msg.files && msg.files.length" class="pi-attach-row row justify-end q-gutter-xs q-mb-xs">
              <template v-for="(f, fi) in msg.files" :key="fi">
                <img
                  v-if="f.preview"
                  :src="f.preview"
                  class="pi-attach-thumb"
                  :title="`${f.name} (${humanSize(f.size)}) - click to open`"
                  @click="openPreview(f)"
                />
                <q-chip v-else dense square color="blue-grey-8" text-color="white" icon="description">
                  {{ f.name }}
                  <span class="text-grey-4 q-ml-xs">{{ humanSize(f.size) }}</span>
                </q-chip>
              </template>
            </div>
            <div v-if="msg.text" class="pi-bubble pi-user pi-text">{{ msg.text }}</div>
          </div>
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
                <!-- A readable title, not the raw tool id: "Running a command on the device:
                     docker ps", with the raw name kept in the tooltip for diagnosis. -->
                <span class="text-weight-medium" :title="tool.name">{{ tool.label || tool.name }}</span>
                <span v-if="tool.detail" class="text-caption text-grey-5 q-ml-sm pi-tool-detail">
                  {{ tool.detail }}
                </span>
              </div>
              <pre v-if="tool.args" class="pi-args">{{ tool.args }}</pre>
              <pre v-if="tool.result" class="pi-result">{{ tool.result }}</pre>
            </div>
          </div>
        </div>
        <!-- system/info -->
        <!-- What this run cost: under the answer it paid for, left-aligned with it. -->
        <div v-else-if="msg.cost" class="row justify-start" data-test="pi-run-cost">
          <div class="text-caption text-green-4 pi-text pi-run-cost">{{ msg.text }}</div>
        </div>
        <div v-else class="row justify-center">
          <div class="text-caption text-grey-5 pi-text">{{ msg.text }}</div>
        </div>
      </div>
      <!-- Compacting indicator in the transcript flow, where eyes already are. Separate
           from the streaming row because compaction is not a turn - no stall watchdog,
           no Stop button, just an honest "this is running". -->
      <div v-if="streaming" class="row items-center q-gutter-xs q-mt-xs">
        <q-spinner-dots color="primary" />
        <span
          class="text-caption pi-working"
          :class="stalled ? 'text-orange' : 'text-grey-4'"
          data-test="pi-working-on"
        >
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
      <!-- HELD - shown only while the view is paused above the bottom. Sticky INSIDE the
           scroller, so it sits over the newest text without being part of the flow (and
           without needing a wrapper that would change the layout). It says what is being
           held back, because a paused transcript with no explanation reads as a stuck one. -->
      <div v-if="!pinnedToBottom" class="pi-scroll-held">
        <q-btn
          dense
          no-caps
          unelevated
          color="blue-grey-8"
          text-color="white"
          icon="arrow_downward"
          :label="heldLabel"
          data-test="pi-jump-latest"
          @click="jumpToLatest"
        >
          <q-tooltip max-width="320px">
            You have scrolled up, so the view is held here while you read or copy.
            Click (or scroll to the bottom) to follow the conversation live again.
          </q-tooltip>
        </q-btn>
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

    <!-- Summarize & clear history: confirm before wiping the window. -->
    <q-dialog v-model="clearConfirm">
      <q-card dark style="min-width: 480px; max-width: 90vw">
        <q-card-section class="text-subtitle1">Summarize &amp; clear history?</q-card-section>
        <q-card-section class="text-grey-4 q-pt-none">
          Pi writes a short summary of everything so far, keeps working from it in this
          same window, and clears the transcript above. Following turns stop paying to
          re-read the old history. The full record stays on disk (AI History / the
          ticket), so nothing is lost for audit.
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="clearNote"
            type="textarea"
            outlined
            dark
            autogrow
            autofocus
            :input-style="{ minHeight: '88px' }"
            label="Note for the summary (optional)"
            hint="e.g. done with the extension edit UI — next is the dialplan. What to keep, what this chapter was."
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps label="Cancel" />
          <q-btn
            v-close-popup
            unelevated
            no-caps
            color="primary"
            label="Summarize &amp; clear"
            data-test="pi-summarize-clear-confirm"
            @click="summarizeClear"
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
        <!-- WHO ANSWERS: only the technician driving the session. The bridge enforces this, so
             showing a viewer buttons they cannot use would just produce a refusal; they get the
             reason instead. An admin who wants to approve presses Take over first. -->
        <template v-if="isDriver">
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
        <span v-else class="text-white">
          <b>{{ presence && presence.owner ? presence.owner.display : "The driver" }}</b> must answer this.
          Press <b>Take over</b> to decide it yourself.
        </span>
      </template>
    </q-banner>

    <!-- input -->
    <div
      class="pi-composer bg-grey-9 q-pa-sm relative-position"
      :class="{ 'pi-drop-active': dragOver }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Drop target feedback. Covers the composer only: dropping a file on the
           transcript should not silently do nothing, so the whole composer lights up
           and says what will happen. -->
      <div v-if="dragOver" class="pi-drop-overlay column flex-center">
        <q-icon name="upload_file" size="28px" />
        <div class="text-caption q-mt-xs">Drop to attach</div>
      </div>

      <!-- Files staged for the NEXT message. Nothing is uploaded until Send. -->
      <div v-if="pendingFiles.length" class="row items-center q-gutter-xs q-mb-xs">
        <q-chip
          v-for="f in pendingFiles"
          :key="f.id"
          dense
          square
          removable
          color="blue-grey-7"
          text-color="white"
          :icon="fileIcon(f)"
          @remove="removeFile(f.id)"
        >
          <q-avatar v-if="f.preview" square>
            <img :src="f.preview" />
          </q-avatar>
          {{ f.name }}
          <span class="text-grey-4 q-ml-xs">{{ humanSize(f.size) }}</span>
        </q-chip>
        <q-btn flat dense no-caps size="sm" color="grey-5" label="Clear" @click="clearFiles" />
        <div class="text-caption text-grey-6">
          {{ humanSize(pendingBytes) }} of {{ humanSize(attachMax.totalBytes) }}
        </div>
      </div>

      <div class="row items-end relative-position">
      <!-- SLASH COMMANDS. The list comes from the bridge (`ready.commands`), never from
           here, so it can only offer what this role may actually use. A switch the role
           does not carry is still listed, greyed, with the reason - hiding it makes a
           permission look like a missing feature, and the tech asks the wrong question. -->
      <div v-if="cmdMatches.length" class="pi-cmd-menu bg-grey-10">
        <div
          v-for="(c, i) in cmdMatches"
          :key="c.name"
          class="pi-cmd-item"
          :class="{ 'pi-cmd-active': i === cmdIndex }"
          @mousedown.prevent="applyCommand(c)"
          @mouseover="cmdIndex = i"
        >
          <div class="row items-center no-wrap">
            <span :class="c.allowed ? 'text-white' : 'text-grey-6'">{{ c.usage }}</span>
            <q-badge
              v-if="cmdState(c)"
              class="q-ml-sm"
              :color="cmdState(c) === 'ON' ? 'light-green-8' : 'blue-grey-7'"
              :label="cmdState(c)"
            />
            <q-icon v-if="!c.allowed" name="lock" size="14px" class="q-ml-sm text-grey-6" />
          </div>
          <div class="text-caption" :class="c.allowed ? 'text-grey-5' : 'text-orange-8'">
            {{ c.allowed ? c.desc : c.denied }}
          </div>
        </div>
        <div class="text-caption text-grey-6 q-px-sm q-py-xs">
          Tab or Enter completes &mdash; Esc dismisses
        </div>
      </div>
      <!-- Attach. Hidden native input; the button and drag-and-drop both drive it. -->
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        :accept="imagesSupported ? undefined : '.txt,.log,.csv,.json,.xml,.md,.ps1,.reg,.ini,.conf,.yaml,.yml,.html,.sql,text/*'"
        @change="onFilePicked"
      />
      <q-btn
        v-if="attachEnabled"
        flat
        dense
        round
        icon="attach_file"
        color="grey-4"
        class="q-mr-xs"
        :disable="!connected"
        @click="pickFiles"
      >
        <q-tooltip>
          Attach a screenshot or log file &mdash; or drag one here, or paste an image.
          <template v-if="!imagesSupported">
            <br />This model reads text files only.
          </template>
        </q-tooltip>
      </q-btn>
      <q-input
        v-model="input"
        type="textarea"
        autogrow
        dark
        dense
        outlined
        :placeholder="seatTaken
          ? `Read-only - ${presence.owner.display} is driving this session`
          : isMulti
            ? 'Tell Pi what to do across these machines...'
            : 'Ask about this device, or type / for commands...'"
        class="col"
        :disable="!connected || seatTaken"
        @paste="onPaste"
        @keydown.enter.exact.prevent="onEnter"
        @keydown.tab="onCmdTab"
        @keydown.down="onCmdArrow(1, $event)"
        @keydown.up="onCmdArrow(-1, $event)"
        @keydown.esc="cmdDismissed = true"
      />
      <!-- A viewer gets Take over where the driver gets Send. -->
      <q-btn
        v-if="seatTaken"
        color="amber-8"
        icon="sports_esports"
        label="Take over"
        no-caps
        class="q-ml-sm"
        :disable="!connected || !canTakeOver"
        :loading="takeoverPending"
        @click="requestTakeover"
      >
        <q-tooltip>
          <template v-if="canTakeOver">
            {{ presence.you.needs_consent ? `Ask ${presence.owner.display} to hand this session to you` : `Take the seat from ${presence.owner.display} (they keep watching)` }}
          </template>
          <template v-else>Your role cannot take over a session someone else is driving</template>
        </q-tooltip>
      </q-btn>
      <q-btn
        v-else-if="!streaming"
        color="primary"
        icon="send"
        class="q-ml-sm"
        :disable="!connected || (!input.trim() && !pendingFiles.length)"
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
      </div><!-- /composer row -->
    </div>

    <!-- Full-size look at an attached image, from the transcript's own copy. -->
    <q-dialog v-model="previewOpen">
      <q-card dark class="bg-grey-10">
        <q-card-section class="row items-center q-py-sm">
          <div class="text-subtitle2">{{ previewFile.name }}</div>
          <q-space />
          <q-btn v-close-popup flat dense round icon="close" />
        </q-card-section>
        <q-card-section class="q-pt-none">
          <img :src="previewFile.preview" style="max-width: 84vw; max-height: 78vh" />
        </q-card-section>
      </q-card>
    </q-dialog>
    </div><!-- /pi-main -->

    <!-- PROMPT QUEUE PANEL. Per conversation: it survives refresh, reconnect and
         "Continue", and a new chat starts with an empty one. The bridge owns the state
         (queue_state frames); everything here is a request to it. -->
    <aside
      v-if="queueOpen"
      class="pi-queue bg-grey-9"
      :class="{ 'pi-queue--overlay': queueOverlay, 'pi-queue--resizing': queueResizing, 'pi-queue--live': compacting }"
      :style="{ width: queueWidth + 'px', flexBasis: queueWidth + 'px' }"
      data-test="pi-queue-panel"
    >
      <!-- Drag the left edge to make the panel wider or narrower. Double-click resets. -->
      <div
        class="pi-queue-grip"
        title="Drag to resize - double-click to reset"
        @pointerdown="queueResizeStart"
        @dblclick="queueResizeReset"
      />
      <!-- header: title, count, overflow menu (the destructive things live here, at a
           readable size, instead of as tiny red text in a crowded row), close -->
      <div class="row items-center no-wrap q-px-sm q-py-xs pi-queue-head">
        <q-icon name="playlist_add_check" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1">Queue</div>
        <span v-if="queueItems.length" class="text-caption text-grey-5 q-ml-sm">
          {{ queuePending }} pending<template v-if="queueItems.length !== queuePending"> &middot; {{ queueItems.length }} total</template>
        </span>
        <q-space />
        <q-btn
          flat dense no-caps icon="history"
          :label="queueHistoryCount ? `History (${queueHistoryCount})` : 'History'"
          :disable="!queueHistoryCount"
          data-test="pi-queue-history"
          @click="openQueueHistory"
        >
          <q-tooltip>
            Every prompt this conversation has been given &mdash; typed, queued or from a
            phone &mdash; and everything the queue did. For you only: never sent to the AI.
          </q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="more_vert" :disable="!connected" data-test="pi-queue-menu">
          <q-tooltip>More</q-tooltip>
          <q-menu dark>
            <q-list dense dark style="min-width: 220px">
              <q-item clickable v-close-popup :disable="!queueItems.some(i => i.status !== 'pending' && i.status !== 'running' && i.status !== 'waiting')" @click="queueClearDone">
                <q-item-section avatar><q-icon name="done_all" /></q-item-section>
                <q-item-section>Clear finished</q-item-section>
              </q-item>
              <q-item clickable v-close-popup :disable="!queueItems.length" class="text-red-4" @click="queueClearAll">
                <q-item-section avatar><q-icon name="delete_sweep" color="red-4" /></q-item-section>
                <q-item-section>Clear everything&hellip;</q-item-section>
              </q-item>
              <q-separator dark />
              <q-item clickable v-close-popup @click="queueResizeReset">
                <q-item-section avatar><q-icon name="width_normal" /></q-item-section>
                <q-item-section>Reset panel width</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn flat round dense icon="close" @click="queueClose" />
      </div>

      <!-- EVERYTHING BELOW THE HEADER SCROLLS (owner, 2026-09-30: "no scroll... I can't use the
           queue"). The status strips, the prompt box and the buttons used to be fixed-height parts
           of a fixed-height column, so on a short window they ate all the height, the list got
           0px and nothing could be reached. The list keeps a floor and this body scrolls. -->
      <div class="pi-queue-body" data-test="pi-queue-body">
      <!-- switches: one row, short labels; the detail is in tooltips -->
      <div class="row items-center no-wrap q-px-sm q-pt-xs pi-queue-switches">
        <q-toggle
          :model-value="queueAuto"
          color="green"
          label="Auto-Next"
          :disable="!connected"
          data-test="pi-queue-auto"
          @update:model-value="queueSetAuto"
        >
          <q-tooltip max-width="300px">
            Send the next prompt as soon as the assistant finishes. Stops by itself when the
            assistant asks you something, a turn fails, or you press Stop.
          </q-tooltip>
        </q-toggle>
        <q-toggle
          :model-value="queueAutoClear"
          color="blue-grey-4"
          label="Auto-clear"
          :disable="!connected"
          data-test="pi-queue-auto-clear"
          @update:model-value="queueSetAutoClear"
        >
          <q-tooltip max-width="300px">
            Drop each prompt from the list once it has run. Anything that failed, was
            skipped, or asked you a question stays. On by default; turn it off and this
            chat window remembers that.
          </q-tooltip>
        </q-toggle>
      </div>

      <!-- QUESTIONS - what the assistant is waiting on you for. One card each, answered
           right here. A question raised while a queued item ran says which item; one
           raised in ordinary chat stands alone. -->
      <div v-if="queueQuestions.length" class="pi-queue-questions q-mx-sm q-mt-xs">
        <div class="row items-center no-wrap q-mb-xs">
          <q-icon name="help" color="orange-4" size="20px" class="q-mr-sm" />
          <div class="text-subtitle2 text-orange-3">
            {{ queueQuestions.length === 1 ? "The assistant asked" : `${queueQuestions.length} questions from the assistant` }}
          </div>
          <q-space />
          <q-btn v-if="queuePaused" flat dense no-caps size="sm" color="orange-4" icon="play_arrow" label="Resume without answering" @click="queueResume">
            <q-tooltip>Let the queue carry on; the questions stay here until answered or dismissed.</q-tooltip>
          </q-btn>
        </div>
        <div v-for="q in queueQuestions" :key="q.id" class="pi-queue-question q-pa-sm q-mb-xs" data-test="pi-queue-question">
          <div class="row items-start no-wrap">
            <div class="col pi-text text-body2" style="min-width: 0">
              <div
                class="pi-clamp"
                :class="{ 'pi-clamp--open': queueTextOpen['q' + q.id] }"
                :title="queueTextOpen['q' + q.id] ? 'Click to collapse' : 'Click to show the whole question'"
                @click="queueTextToggle('q' + q.id)"
              >{{ q.text }}</div>
            </div>
            <q-btn flat round dense size="sm" icon="close" class="q-ml-xs" @click="queueDismissQuestion(q)">
              <q-tooltip>Dismiss without answering</q-tooltip>
            </q-btn>
          </div>
          <div
            v-if="queueItemText(q.item_id) || (queueRunningItem && queueRunningItem.text)"
            class="text-caption text-grey-5 q-mt-xs pi-clamp"
            style="--pi-clamp-lines: 2"
            :class="{ 'pi-clamp--open': queueTextOpen['about' + q.id] }"
            :title="queueTextOpen['about' + q.id] ? 'Click to collapse' : 'Click to show the whole prompt'"
            @click="queueTextToggle('about' + q.id)"
          >
            <q-icon name="subdirectory_arrow_right" size="12px" />
            about: {{ queueItemText(q.item_id) || queueRunningItem.text }}
          </div>
          <div class="row items-end no-wrap q-mt-sm">
            <q-input
              v-model="queueAnswerText[q.id]"
              type="textarea"
              autogrow
              dark
              dense
              outlined
              color="orange-5"
              class="col"
              placeholder="Your answer&hellip;  (Enter sends)"
              :disable="!connected || streaming"
              data-test="pi-queue-reply"
              @keydown.enter.exact.prevent="queueAnswer(q)"
            />
            <q-btn
              round
              unelevated
              color="orange-8"
              icon="send"
              class="q-ml-xs"
              :disable="!connected || streaming || !(queueAnswerText[q.id] || '').trim()"
              data-test="pi-queue-answer"
              @click="queueAnswer(q)"
            >
              <q-tooltip>Send this answer and continue</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>
      <!-- status strip: one line about what the queue is doing -->
      <div v-else-if="queuePaused" class="pi-queue-paused q-mx-sm q-mt-xs q-pa-sm">
        <div class="row items-center no-wrap">
          <q-icon name="pause_circle" color="orange-4" size="20px" class="q-mr-sm" />
          <div class="col" style="min-width: 0">
            <div class="text-subtitle2 text-orange-3">Paused</div>
            <div
              class="pi-text text-body2 pi-clamp"
              style="--pi-clamp-lines: 4"
              :class="{ 'pi-clamp--open': queueTextOpen['paused'] }"
              :title="queueTextOpen['paused'] ? 'Click to collapse' : 'Click to show the whole reason'"
              @click="queueTextToggle('paused')"
            >{{ queuePaused.reason }}</div>
            <!-- Waiting for an answer does NOT mean the queue is empty: name the prompt the
                 pause landed on, in the same strip, so nobody has to guess or scroll the list.
                 "paused during" is exact - the item stays `running` while it waits (queue.js
                 pause() does not clear it), but the model has stopped to ask, so it is not
                 still being worked on. -->
            <div
              v-if="queueRunningItem"
              class="text-caption text-green-4 q-mt-xs pi-text pi-clamp"
              style="--pi-clamp-lines: 3"
              :class="{ 'pi-clamp--open': queueTextOpen['pausedDuring'] }"
              data-test="pi-queue-still-running"
              :title="queueTextOpen['pausedDuring'] ? 'Click to collapse' : 'Click to show the whole prompt'"
              @click="queueTextToggle('pausedDuring')"
            >
              <q-icon name="subdirectory_arrow_right" size="12px" class="q-mr-xs" />
              paused during: {{ promptWords(queueRunningItem.text) }}
            </div>
          </div>
          <q-btn dense no-caps outline color="orange-4" icon="play_arrow" label="Resume" class="q-ml-sm" @click="queueResume" />
        </div>
      </div>
      <!-- NAME WHAT IS BEING WORKED ON, whichever way it arrived (owner, 2026-09-27). "Running a
           queued prompt" said that something was running without saying what, and a prompt typed
           in the chat is not a queue item at all, so nothing was shown for it. -->
      <!-- The WHOLE prompt, not one ellipsized line (owner, 2026-09-30: "full summary of what it
           is working on"). Starts at 6 lines, click for all of it; the box scrolls past 40vh. -->
      <div
        v-else-if="queueRunningItem || queueWorkingOn"
        class="pi-queue-working q-mx-sm q-mt-xs q-pa-sm"
        data-test="pi-queue-working-on"
      >
        <div class="row items-center no-wrap text-green-4 text-subtitle2">
          <q-spinner-dots size="16px" class="q-mr-sm" />
          Working on
          <q-space />
          <span class="text-caption text-grey-5 cursor-pointer" @click="queueTextToggle('working')">
            {{ queueTextOpen['working'] ? "show less" : "show all" }}
          </span>
        </div>
        <div
          class="pi-text text-body2 text-green-2 pi-clamp q-mt-xs"
          style="--pi-clamp-lines: 6"
          :class="{ 'pi-clamp--open': queueTextOpen['working'] }"
          :title="queueTextOpen['working'] ? 'Click to collapse' : 'Click to show the whole prompt'"
          @click="queueTextToggle('working')"
        >{{ promptWords((queueRunningItem && queueRunningItem.text) || (queueWorkingOn && queueWorkingOn.text) || "") }}</div>
      </div>
      <div v-else-if="queueAuto && queuePending" class="pi-queue-status text-green-4 q-mx-sm q-mt-xs">
        <q-icon name="bolt" size="16px" class="q-mr-sm" /> Next prompt goes when the assistant is free
      </div>

      <!-- add -->
      <div class="q-px-sm q-pt-sm q-pb-xs">
        <div class="row items-end no-wrap">
          <q-input
            v-model="queueNew"
            type="textarea"
            autogrow
            dark
            dense
            outlined
            class="col"
            placeholder="Next prompt&hellip;  (Enter adds, Shift+Enter for a new line)"
            :input-style="{ maxHeight: '30vh' }"
            :disable="!connected"
            data-test="pi-queue-new"
            @keydown.enter.exact.prevent="queueAdd"
          />
          <!-- Attach to the QUEUED prompt. Same pipeline as the composer (same caps, same
               downscale, same refusals) - the files travel with the item and are handed to
               the model when that item runs, which may be an hour later. -->
          <input
            ref="queueFileInput"
            type="file"
            multiple
            class="hidden"
            :accept="imagesSupported ? undefined : '.txt,.log,.csv,.json,.xml,.md,.ps1,.reg,.ini,.conf,.yaml,.yml,.html,.sql,text/*'"
            @change="onQueueFilePicked"
          />
          <q-btn
            v-if="attachEnabled"
            flat
            dense
            round
            icon="attach_file"
            :color="queueFiles.length ? 'primary' : 'grey-4'"
            class="q-ml-xs"
            :disable="!connected"
            data-test="pi-queue-attach"
            @click="pickQueueFiles"
          >
            <q-badge v-if="queueFiles.length" floating color="primary">{{ queueFiles.length }}</q-badge>
            <q-tooltip>
              Attach a screenshot or log file to this queued prompt &mdash; it is sent with it when it runs.
              <br />Type what you want done with it too: a file on its own is evidence, not an instruction.
              <template v-if="!imagesSupported"><br />This model reads text files only.</template>
            </q-tooltip>
          </q-btn>
          <q-btn
            round
            unelevated
            color="primary"
            icon="add"
            class="q-ml-xs"
            :disable="!connected || !queueNew.trim()"
            data-test="pi-queue-add"
            @click="queueAdd"
          >
            <q-tooltip>Add to the queue</q-tooltip>
          </q-btn>
        </div>
        <!-- What is attached to the prompt being composed, removable before it is added. -->
        <div v-if="queueFiles.length" class="row items-center q-gutter-xs q-mt-xs">
          <q-chip
            v-for="f in queueFiles"
            :key="f.id"
            dense
            removable
            color="blue-grey-8"
            text-color="white"
            :icon="f.preview ? 'image' : 'description'"
            @remove="removeQueueFile(f.id)"
          >
            <img v-if="f.preview" :src="f.preview" class="pi-queue-thumb q-mr-xs" />
            {{ f.name }} <span class="text-grey-4 q-ml-xs">{{ humanSize(f.size) }}</span>
          </q-chip>
        </div>
        <q-checkbox v-model="queueNewCompact" dense size="sm" label="Compact first" class="q-mt-xs" :disable="!connected">
          <q-tooltip max-width="300px">
            Summarise and clear the history before this one runs, so it starts from a short
            summary instead of the whole transcript.
          </q-tooltip>
        </q-checkbox>
      </div>

      <!-- run controls: two real buttons, readable -->
      <div class="row no-wrap q-px-sm q-pb-sm q-gutter-x-sm">
        <q-btn
          class="col"
          dense
          no-caps
          outline
          color="grey-4"
          icon="skip_next"
          label="Run next"
          :disable="!connected || streaming || !queuePending"
          @click="queueRunNext"
        >
          <q-tooltip>Send the first pending prompt now, once, whatever Auto-Next is set to.</q-tooltip>
        </q-btn>
        <q-btn
          v-if="!queuePaused"
          class="col"
          dense
          no-caps
          outline
          color="grey-4"
          icon="pause"
          label="Pause"
          :disable="!connected"
          @click="queuePause"
        />
        <q-btn
          v-else
          class="col"
          dense
          no-caps
          unelevated
          color="orange-8"
          icon="play_arrow"
          label="Resume"
          :disable="!connected"
          @click="queueResume"
        />
        <!-- Interrupted work is usually resumed with a TWEAK ("...and skip the bit that
             failed"), so the edit is offered right next to Resume rather than hidden
             behind a per-item menu further down the panel. -->
        <q-btn
          v-if="queuePaused && queueHeadPending"
          dense
          no-caps
          outline
          color="blue-4"
          icon="edit"
          label="Edit"
          :disable="!connected"
          @click="queueStartEdit(queueHeadPending)"
        >
          <q-tooltip>Change the prompt before you resume it</q-tooltip>
        </q-btn>
      </div>

      <!-- list -->
      <div class="pi-queue-list q-px-sm q-pb-sm">
        <div v-if="!queueItems.length" class="text-body2 text-grey-6 q-pa-md text-center">
          Nothing queued yet.
        </div>
        <div
          v-for="(it, idx) in queueItems"
          :key="it.id"
          class="pi-queue-item q-pa-sm q-mb-xs"
          :class="`pi-queue-item--${it.status}`"
        >
          <div class="row items-start no-wrap">
            <q-icon
              :name="queueStatusIcon(it)"
              :color="queueStatusColor(it)"
              size="20px"
              class="q-mr-sm pi-queue-status-icon"
            >
              <q-tooltip>{{ queueStatusLabel(it) }}</q-tooltip>
            </q-icon>

            <div class="col" style="min-width: 0">
              <q-input
                v-if="queueEditId === it.id"
                v-model="queueEditText"
                type="textarea"
                autogrow
                dark
                dense
                outlined
                autofocus
                @keydown.enter.ctrl.prevent="queueSaveEdit(it)"
                @keydown.esc="queueEditId = null"
              />
              <div
                v-else
                class="pi-text text-body2 pi-queue-text"
                :class="{ 'text-grey-5': it.status === 'done' || it.status === 'skipped' }"
                @dblclick="queueStartEdit(it)"
              >{{ promptWords(it.text) }}</div>

              <!-- Files queued WITH this prompt; they go to the model when it runs. -->
              <div v-if="it.attachments && it.attachments.length" class="q-mt-xs">
                <q-chip
                  v-for="(a, ai) in it.attachments"
                  :key="ai"
                  dense
                  size="sm"
                  color="blue-grey-8"
                  text-color="white"
                  :icon="a.kind === 'image' ? 'image' : 'description'"
                >
                  {{ a.name }}<span v-if="a.bytes" class="text-grey-4 q-ml-xs">{{ humanSize(a.bytes) }}</span>
                </q-chip>
              </div>
              <div v-if="it.compact_first || it.note" class="text-caption text-grey-5 q-mt-xs">
                <span v-if="it.compact_first" class="q-mr-sm"><q-icon name="compress" size="12px" /> compact first</span>
                <span v-if="it.note" :class="it.status === 'failed' ? 'text-red-4' : ''">{{ it.note }}</span>
              </div>

              <div v-if="it.status === 'waiting'" class="text-caption text-orange-4 q-mt-xs">
                <q-icon name="arrow_upward" size="12px" /> waiting for your answer above
              </div>
              <!-- The questions and answers this item went through, folded away by default. -->
              <div v-if="it.thread && it.thread.length" class="q-mt-xs">
                <a class="text-caption text-grey-5 cursor-pointer" @click="queueToggleThread(it)">
                  {{ queueThreadOpen[it.id] ? "hide" : "show" }} {{ Math.ceil(it.thread.length / 2) }} Q&amp;A
                </a>
                <div v-if="queueThreadOpen[it.id]" class="pi-queue-thread q-mt-xs">
                  <div
                    v-for="(t, ti) in it.thread"
                    :key="ti"
                    class="pi-queue-turn pi-text"
                    :class="t.role === 'assistant' ? 'pi-queue-turn--q' : 'pi-queue-turn--a'"
                  >
                    <!-- Named, not "You": in a shared session the answer above yours may
                         be a colleague's, and reading it as your own is how two people end
                         up thinking the question is still open. -->
                    <span class="pi-queue-turn-who">{{ t.role === "assistant" ? "Asked" : queueThreadWho(t) }}<template v-if="t.via === 'chat'"> (in chat)</template></span>
                    {{ t.text }}
                  </div>
                </div>
              </div>
            </div>

            <!-- per-item tools: move, and everything else behind one menu -->
            <div class="column items-center no-wrap pi-queue-tools q-ml-xs">
              <template v-if="queueEditId === it.id">
                <q-btn flat round dense size="sm" icon="check" color="green-4" @click="queueSaveEdit(it)"><q-tooltip>Save (Ctrl+Enter)</q-tooltip></q-btn>
                <q-btn flat round dense size="sm" icon="close" @click="queueEditId = null"><q-tooltip>Cancel (Esc)</q-tooltip></q-btn>
              </template>
              <template v-else>
                <q-btn flat round dense size="sm" icon="edit" color="blue-4" :disable="it.status === 'running'" @click="queueStartEdit(it)"><q-tooltip>Edit this prompt before it runs</q-tooltip></q-btn>
                <q-btn flat round dense size="sm" icon="expand_less" :disable="idx === 0 || it.status === 'running'" @click="queueMove(it, -1)"><q-tooltip>Move up</q-tooltip></q-btn>
                <q-btn flat round dense size="sm" icon="expand_more" :disable="idx === queueItems.length - 1 || it.status === 'running'" @click="queueMove(it, 1)"><q-tooltip>Move down</q-tooltip></q-btn>
                <q-btn flat round dense size="sm" icon="more_horiz" :disable="it.status === 'running'">
                  <q-menu dark>
                    <q-list dense dark style="min-width: 200px">
                      <q-item clickable v-close-popup @click="queueStartEdit(it)">
                        <q-item-section avatar><q-icon name="edit" /></q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="queueToggleCompact(it)">
                        <q-item-section avatar><q-icon :name="it.compact_first ? 'check_box' : 'check_box_outline_blank'" /></q-item-section>
                        <q-item-section>Compact first</q-item-section>
                      </q-item>
                      <q-item v-if="it.status === 'pending'" clickable v-close-popup @click="queueSetStatus(it, 'skipped')">
                        <q-item-section avatar><q-icon name="remove_done" /></q-item-section>
                        <q-item-section>Skip</q-item-section>
                      </q-item>
                      <q-item v-else-if="it.status !== 'waiting'" clickable v-close-popup @click="queueSetStatus(it, 'pending')">
                        <q-item-section avatar><q-icon name="replay" /></q-item-section>
                        <q-item-section>Queue again</q-item-section>
                      </q-item>
                      <q-separator dark />
                      <q-item clickable v-close-popup class="text-red-4" @click="queueRemove(it)">
                        <q-item-section avatar><q-icon name="delete" color="red-4" /></q-item-section>
                        <q-item-section>Remove</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </template>
            </div>
          </div>
        </div>
      </div>
      </div><!-- /pi-queue-body -->
      <!-- HISTORY - the human's record of what this queue did. Newest first. It lives in
           the queue file and in queue_state frames only; the model never sees it. -->
      <q-dialog v-model="queueHistoryOpen">
        <q-card dark class="bg-grey-9" style="width: 760px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column">
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="history" size="sm" class="q-mr-sm" />
            <div class="text-h6">Queue history</div>
            <span class="text-caption text-grey-5 q-ml-sm">
              {{ queueHistoryCount }} entries &middot; every prompt in this conversation,
              and who sent it &middot; not shared with the AI
            </span>
            <q-spinner v-if="queueHistoryLoading" size="16px" class="q-ml-sm" />
            <q-btn flat dense round icon="refresh" size="sm" class="q-ml-xs" @click="openQueueHistory">
              <q-tooltip>Reload from the server</q-tooltip>
            </q-btn>
            <q-space />
            <!-- WHO. A shared session has several people in it (driver, watchers who took
                 over, a paired phone), so "show me only Dan's prompts" is the question an
                 admin actually asks of this list. Hidden when only one person appears:
                 a filter with one choice is furniture. -->
            <q-select
              v-if="queueHistPeople.length > 1"
              v-model="queueHistFilter"
              :options="queueHistPeople"
              dark
              dense
              options-dense
              emit-value
              map-options
              borderless
              class="q-mr-sm pi-queue-hist-who-filter"
              data-test="pi-queue-history-who"
            >
              <template #prepend><q-icon name="person_search" size="18px" /></template>
              <q-tooltip>Show only what one person sent</q-tooltip>
            </q-select>
            <q-btn flat dense no-caps icon="delete_sweep" label="Clear history" color="red-4" :disable="!connected || !queueHistory.length" @click="queueClearHistory" />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section class="pi-queue-history-list">
            <div v-for="(e, i) in queueHistoryView" :key="i" class="pi-queue-hist-row">
              <div class="pi-queue-hist-when text-grey-5">{{ queueHistWhen(e.at) }}</div>
              <q-icon :name="queueHistIcon(e.event)" :color="queueHistColor(e.event)" size="18px" class="q-mr-sm" />
              <!-- WHO SENT IT. Its own column so the list reads down the names, which is
                   how an admin scans it. Blank for the AI's own rows (it asked a
                   question, a turn failed) and for rows written before the bridge kept
                   names - those say "unknown" rather than being attributed to a guess. -->
              <div class="pi-queue-hist-who" :class="queueHistWhoMine(e) ? 'text-teal-3' : (queueHistWho(e) ? 'text-blue-3' : 'text-grey-7')">
                <template v-if="queueHistWho(e)">
                  {{ queueHistWho(e) }}
                  <q-tooltip v-if="e.user" :delay="300">
                    {{ e.by || e.user }} &middot; login <code>{{ e.user }}</code>
                  </q-tooltip>
                </template>
                <template v-else-if="queueHistIsHuman(e.event)">
                  unknown
                  <q-tooltip :delay="300" max-width="320px">
                    Sent before this conversation recorded names, so who sent it is not
                    known. Everything from now on is named.
                  </q-tooltip>
                </template>
                <template v-else>&mdash;</template>
              </div>
              <div class="col" style="min-width: 0">
                <div>
                  <!-- The gap between the label and the prompt is CSS, not a literal
                       space: Vue's compiler condenses whitespace at the start of an
                       element, so " {{ e.text }}" rendered as "You askedwrite up an
                       email...". -->
                  <span class="pi-queue-hist-event" :class="`text-${queueHistColor(e.event)}`">{{ queueHistLabel(e) }}</span>
                  <span v-if="e.text" class="pi-queue-hist-sep text-grey-6">&mdash;</span>
                  <span v-if="e.text" class="pi-text">{{ promptWords(e.text) }}</span>
                  <!-- Recovered prompts: an icon, not a sentence repeated under every
                       row. On a conversation with forty of them the caption said the
                       same eight words forty times and buried the prompts themselves. -->
                  <q-icon
                    v-if="e.detail === RECOVERED_NOTE"
                    name="restore"
                    size="14px"
                    class="q-ml-xs text-grey-6"
                  >
                    <q-tooltip>
                      Recovered from this conversation&rsquo;s transcript &mdash; it was
                      sent before the history recorded every prompt.
                    </q-tooltip>
                  </q-icon>
                </div>
                <div v-if="e.detail && e.detail !== RECOVERED_NOTE" class="text-caption text-grey-4 pi-text q-mt-xs">
                  <template v-if="e.event === 'answered' || e.event === 'answered_in_chat'">&#8617; </template>{{ e.detail }}
                </div>
              </div>
            </div>
            <div v-if="queueHistoryLoading && !queueHistory.length" class="text-grey-6 q-pa-md text-center">
              Loading&hellip;
            </div>
            <div v-else-if="!queueHistory.length" class="text-grey-6 q-pa-md text-center">Nothing yet.</div>
          </q-card-section>
        </q-card>
      </q-dialog>
    </aside>
    </div><!-- /pi-body -->
    <!-- Summarizing: a blocking overlay in the middle of the window. Compaction rewrites
         what the AI works from, so nothing may be sent or switched until it is done. -->
    <div
      v-if="compacting"
      class="pi-compact-overlay"
      data-test="pi-compact-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      @click.stop.prevent
      @keydown.stop.prevent
    >
      <div class="pi-compact-card column items-center text-center">
        <q-spinner-hourglass color="amber" size="72px" />
        <div class="text-h6 q-mt-md">
          {{ compactInfo.clear ? "Summarizing and clearing this conversation" : "Summarizing this conversation" }}
        </div>
        <div v-if="compactInfo.auto" class="text-body2 text-grey-4 q-mt-sm">
          Automatic: this window is past its {{ autoSummarizeK }}k-token limit, so it is summarized
          before your next task runs. Your prompt runs as soon as this is done.
        </div>
        <div class="text-body2 text-grey-4 q-mt-sm">
          Shrinking about {{ fmtTokens(compactInfo.tokens || contextTokens) }} tokens of history into a
          summary the AI will work from.
        </div>
        <div class="text-body2 text-amber-3 q-mt-sm">
          <template v-if="queueOpen">You can keep adding to the queue on the right - nothing runs until the summary is done.</template>
          <template v-else>
            You can still queue prompts:
            <a href="#" class="text-amber-3" @click.prevent.stop="queueOpen = true">open the queue</a>
            - nothing runs until the summary is done.
          </template>
          {{ compactInfo.clear ? "The window will show only the summary." : "Everything above stays readable." }}
        </div>
        <div class="text-subtitle2 text-amber-4 q-mt-md">
          Please wait. You can't send messages or change anything in this window until this
          finishes.
        </div>
        <div class="text-caption text-grey-5 q-mt-sm">
          {{ compactElapsed }} elapsed &middot; usually under a minute or two on a long chat
        </div>
        <!-- CANCEL (owner, 2026-09-30): a summary stuck on a slow model locked this window with
             no way out. Stopping it changes nothing - the harness only writes the summary back
             when it completes - and the bridge also stops it by itself after 5 minutes. -->
        <q-btn
          class="q-mt-md"
          outline
          no-caps
          color="amber-4"
          icon="close"
          label="Cancel summary"
          :loading="compactCancelling"
          :disable="!connected"
          data-test="pi-compact-cancel"
          @click.stop="cancelCompact"
        >
          <q-tooltip max-width="320px">
            Stop summarizing. Nothing is lost: the conversation stays exactly as it was, and
            your next message runs with the full history.
          </q-tooltip>
        </q-btn>
        <div class="text-caption text-grey-6 q-mt-xs">It also stops by itself after 5 minutes.</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import { getBaseUrl } from "@/boot/axios";
import { isFollowingBottom } from "@/utils/scrollFollow";
import {
  createPiSession,
  saveAIAutoApprove,
  saveAIAutoCredential,
  createPiMultiSession,
  decodePiMachines,
  encodePiMachines,
} from "@/api/agents";
import { fetchAITaskRunLive, createDecisionSession, fetchSessionCaps, grantSessionCaps, revokeSessionCaps, fetchAutomationApproval, automationApproval } from "@/api/core";
import { useAgentDropdown } from "@/composables/agents";
import { useAICompletionAlerts } from "@/composables/aiCompletionAlerts";
import { useQRCode } from "@vueuse/integrations/useQRCode";
import { notifyError, notifySuccess } from "@/utils/notify";
import { fetchUsers } from "@/api/accounts.js";
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
    // ONE WINDOW = ONE TICKET (2026-09-30). The token/agent above are read once, at setup -
    // but Vue Router REUSES this component when only the param changes (/ai-decision/A ->
    // /ai-decision/B from the inbox, a notification, back/forward). The URL then named one
    // ticket while the socket, transcript and composer still belonged to the other, and a
    // prompt typed "into" ticket B ran on ticket A (TICKET/61934 got a local-LLM request
    // meant elsewhere). A different target is a different chat: load it fresh.
    watch(
      () => [route.params.token || null, route.params.agent_id || null],
      ([tok, ag]) => {
        if (tok !== decisionToken || ag !== (agentId || null)) window.location.reload();
      },
    );

    function targetStorageKey() {
      if (isDecision) return `pi-target:decision:${decisionToken}`;
      if (isMulti) return "pi-target:multi";
      return `pi-target:agent:${agentId}`;
    }
    function loadSavedTarget() {
      try {
        const raw = JSON.parse(localStorage.getItem(targetStorageKey()) || "null");
        return raw && typeof raw === "object" ? raw : null;
      } catch {
        return null;
      }
    }
    function saveTarget(groupId, modelId) {
      try {
        localStorage.setItem(
          targetStorageKey(),
          JSON.stringify({ group_id: groupId ?? null, model_id: modelId || null }),
        );
      } catch {
        /* preference only */
      }
    }
    const {
      soundEnabled,
      desktopEnabled,
      onlyWhenUnfocused,
      notificationSupported,
      notificationPermission,
      desktopStatus,
      primeAudio: primeCompletionAudio,
      setDesktopEnabled,
      finished: announceCompletion,
      needsApproval: announceApprovalNeeded,
      test: testCompletionAlerts,
    } = useAICompletionAlerts();

    function setSoundAlert(value) {
      soundEnabled.value = !!value;
      if (soundEnabled.value) primeCompletionAudio();
    }

    async function setDesktopNotifications(value) {
      const enabled = await setDesktopEnabled(value);
      if (value && !enabled) {
        notifyError(
          "Desktop notifications could not be enabled. Check this site's browser notification permission.",
          5000,
        );
      }
    }

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
    // What the BRIDGE last said about the technician's turn (run_state / ready). A turn can
    // span several model runs (recovery, auto-continue, the authorizer's follow-up) with
    // system notes in between; those must not hide Stop while the bridge is still working.
    let serverRunning = false;
    const messages = ref([]);
    const input = ref("");

    // PHONE? The installed app (standalone display mode) or any narrow screen. Drives the
    // back button and the compact toolbar; nothing else changes - the session is the same.
    const isPhone = ref(false);
    const checkPhone = () => {
      isPhone.value =
        (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
        window.innerWidth < 720;
    };
    checkPhone();
    window.addEventListener("resize", checkPhone);
    function backToInbox() {
      // History back keeps a fresh-installed app inside itself; fall back to the inbox route.
      if (window.history.length > 1) router.back();
      else router.push("/m");
    }

    // ---- who is driving --------------------------------------------------------
    // The session runs on the server; this window is a view. `presence` says who holds the
    // seat. A viewer's composer is read-only (and the bridge refuses their frames anyway).
    // Helpdesk stage of the ticket this window is about (decision chats only).
    const ticketStage = ref("");
    function stageColor(st) {
      const s = String(st || "").toLowerCase();
      if (/closed|done|solved|resolved/.test(s)) return "green-8";
      if (/cancel/.test(s)) return "grey-7";
      if (/progress|working|assigned/.test(s)) return "blue-8";
      if (/wait|hold|pending|customer/.test(s)) return "orange-8";
      if (/new/.test(s)) return "teal-8";
      return "blue-grey-7";
    }
    const presence = ref(null);          // { owner, owner_connected, viewers, you, pending_from }
    const isDriver = computed(() => !!presence.value?.you && presence.value.you.role === "owner");
    const seatTaken = computed(() => !!presence.value?.owner && !isDriver.value);
    const canTakeOver = computed(() => !!presence.value?.you?.can_take_over);
    const takeoverAsk = ref(null);       // admin owner: { from, timeout_s } while someone asks
    const takeoverPending = ref(false);
    // PIN: keep the session alive with no viewer connected at all. The phone app pins
    // automatically whenever it is driving - a phone in the background drops its socket in
    // seconds, and the AI's work must not stop with it. Desktop users can pin by hand.
    const pinned = ref(false);
    const pinnedBy = ref("");
    function setPin(v) {
      if (!ws || !connected.value) return;
      ws.send(JSON.stringify({ type: "pin", value: !!v }));
    }
    // Auto-pin on the phone: whenever THIS window becomes the driver.
    watch(isDriver, (drv) => { if (drv && isPhone.value && !pinned.value) setPin(true); });
    // ---- access / seat hand-over -------------------------------------------
    const accessDialog = ref(false);
    const grantPending = ref("");
    const roster = computed(() => (presence.value && presence.value.roster) || { people: [], grants: [] });
    const grantCount = computed(() => (roster.value.grants || []).length);
    function whenAgo(ts) {
      const s = Math.max(1, Math.round((Date.now() - Number(ts)) / 1000));
      if (s < 90) return `${s}s ago`;
      if (s < 5400) return `${Math.round(s / 60)}m ago`;
      return `${Math.round(s / 3600)}h ago`;
    }
    // ---- admin capability grants (per ticket / per device) -----------------
    // The hamburger switches are gated by the user's ROLE. An admin adds one for a single
    // session from here; the RMM stores it (audited, expiring) and pushes it to the live window.
    function giveControl(username) {
      if (!ws || !connected.value || !username) return;
      grantPending.value = username;
      ws.send(JSON.stringify({ type: "grant_drive", username }));
    }
    function cancelGrant(username) {
      if (!ws || !connected.value) return;
      ws.send(JSON.stringify({ type: "revoke_grant", username }));
    }
    function requestTakeover() {
      if (!ws || !connected.value) return;
      takeoverPending.value = true;
      ws.send(JSON.stringify({ type: "takeover" }));
    }
    function answerTakeover(approve) {
      if (!ws) return;
      ws.send(JSON.stringify({ type: "takeover_response", approve: !!approve }));
      takeoverAsk.value = null;
    }

    // ---- attachments ------------------------------------------------------
    // Screenshots and log files, attached from the composer (paperclip, drag-and-drop,
    // or Ctrl+V of a clipboard image). They are held here, base64-encoded, until the
    // message is actually sent - so the tech can add, review and remove them first,
    // and so an attachment never travels without the sentence explaining it.
    //
    // Limits mirror the bridge's (ATTACH_LIMITS) and are refreshed from the `ready`
    // frame; enforcing them here too means an oversized file is refused instantly
    // instead of after a 20 MB upload that the bridge then rejects.
    const attachEnabled = ref(true);
    const imagesSupported = ref(false);
    const attachMax = ref({ files: 5, fileBytes: 8 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 });
    const pendingFiles = ref([]); // [{ id, name, mime, size, data(base64), preview }]
    const dragOver = ref(false);
    const fileInput = ref(null);
    let dragDepth = 0; // dragenter/dragleave fire per child element; count them

    // Images are re-encoded to at most this on the long edge before they are sent.
    // A 4K screenshot is ~8 MB and ~2500 image tokens; at 1600px it is legible for
    // reading error dialogs and costs a fraction of that, on EVERY later turn.
    const IMG_MAX_EDGE = 1600;

    function humanSize(n) {
      if (n < 1024) return `${n} B`;
      if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
      return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }

    function fileIcon(f) {
      return (f.mime || "").startsWith("image/") ? "image" : "description";
    }

    const pendingBytes = computed(() =>
      pendingFiles.value.reduce((sum, f) => sum + (f.size || 0), 0),
    );

    function attachNote(text) {
      messages.value.push({ role: "system", text });
      scrollToBottom();
    }

    function readAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error("could not be read"));
        fr.onload = () => resolve(String(fr.result || ""));
        fr.readAsDataURL(file);
      });
    }

    // Downscale big images in the browser. Falls back to the original bytes on any
    // failure - a shrink that goes wrong must not lose the attachment.
    async function shrinkImage(file, dataUrl) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("decode failed"));
          img.src = dataUrl;
        });
        const edge = Math.max(img.width, img.height);
        if (edge <= IMG_MAX_EDGE && file.size <= 1.5 * 1024 * 1024) return dataUrl;
        const scale = Math.min(1, IMG_MAX_EDGE / edge);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // PNG keeps text crisp (screenshots of dialogs/logs are the common case);
        // photos of a screen are rare here and JPEG artefacts eat small text.
        const out = canvas.toDataURL("image/png");
        return out.length < dataUrl.length ? out : dataUrl;
      } catch {
        return dataUrl;
      }
    }

    async function addFiles(fileList) {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      for (const file of files) {
        if (pendingFiles.value.length >= attachMax.value.files) {
          attachNote(
            `\u{1F4CE} ${file.name} not attached \u2014 ${attachMax.value.files} files is the limit for one message.`,
          );
          continue;
        }
        if (file.size > attachMax.value.fileBytes) {
          attachNote(
            `\u{1F4CE} ${file.name} not attached \u2014 ${humanSize(file.size)} is over the ${humanSize(attachMax.value.fileBytes)} limit.`,
          );
          continue;
        }
        const isImage = (file.type || "").startsWith("image/");
        if (isImage && !imagesSupported.value) {
          attachNote(
            `\u{1F4CE} ${file.name} not attached \u2014 the selected model cannot read images. Switch to a vision model, or paste the text.`,
          );
          continue;
        }
        let dataUrl;
        try {
          dataUrl = await readAsDataUrl(file);
        } catch {
          attachNote(`\u{1F4CE} ${file.name} could not be read from disk.`);
          continue;
        }
        if (isImage) dataUrl = await shrinkImage(file, dataUrl);
        const comma = dataUrl.indexOf(",");
        const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        const bytes = Math.round((b64.length * 3) / 4);
        if (pendingBytes.value + bytes > attachMax.value.totalBytes) {
          attachNote(
            `\u{1F4CE} ${file.name} not attached \u2014 it would take this message over ${humanSize(attachMax.value.totalBytes)}.`,
          );
          continue;
        }
        pendingFiles.value.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name || (isImage ? "screenshot.png" : "file.txt"),
          mime: file.type || "application/octet-stream",
          size: bytes,
          data: b64,
          preview: isImage ? dataUrl : "",
        });
      }
    }

    // The bridge inlines attached text files into the prompt between sentinels. On
    // reload the transcript comes back with those bodies in it; re-rendering a 200 KB
    // log inside a chat bubble is unreadable, so pull them back out into chips. The
    // model's copy is untouched - this is display only.
    const ATTACH_BLOCK_RE = /\[\[pi-attachment:([^\]|]*)\|(\d+)\]\]\n?[\s\S]*?\[\[\/pi-attachment\]\]/g;
    function splitAttachments(raw) {
      const text = String(raw || "");
      if (!text.includes("[[pi-attachment:")) return { text: text.trim(), files: [] };
      const files = [];
      let stripped = text.replace(ATTACH_BLOCK_RE, (_m, name, bytes) => {
        files.push({ name, size: Number(bytes) || 0, mime: "text/plain", preview: "" });
        return "";
      });
      // Drop the bridge's "The technician attached N file(s)..." preamble too - the
      // chips say it better and shorter.
      stripped = stripped
        .replace(/The technician attached \d+ file\(s\)\. Their full contents follow[^\n]*\n?/g, "")
        .trim();
      return { text: stripped, files };
    }

    function removeFile(id) {
      pendingFiles.value = pendingFiles.value.filter((f) => f.id !== id);
    }
    function clearFiles() {
      pendingFiles.value = [];
    }
    function pickFiles() {
      if (fileInput.value) fileInput.value.click();
    }

    const previewOpen = ref(false);
    const previewFile = ref({ name: "", preview: "" });
    function openPreview(f) {
      if (!f?.preview) return;
      previewFile.value = f;
      previewOpen.value = true;
    }
    async function onFilePicked(ev) {
      await addFiles(ev.target.files);
      ev.target.value = ""; // so the same file can be picked twice in a row
    }
    function onDragEnter(ev) {
      if (!attachEnabled.value) return;
      if (!Array.from(ev.dataTransfer?.types || []).includes("Files")) return;
      dragDepth++;
      dragOver.value = true;
    }
    function onDragLeave() {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) dragOver.value = false;
    }
    async function onDrop(ev) {
      dragDepth = 0;
      dragOver.value = false;
      if (!attachEnabled.value) return;
      await addFiles(ev.dataTransfer?.files);
    }
    // Ctrl+V of a screenshot: the clipboard carries an image blob with no filename.
    async function onPaste(ev) {
      if (!attachEnabled.value) return;
      const items = Array.from(ev.clipboardData?.items || []);
      const imgs = items.filter((i) => i.kind === "file" && i.type.startsWith("image/"));
      if (!imgs.length) return; // plain text paste - leave the textarea alone
      ev.preventDefault();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const files = imgs
        .map((i, n) => {
          const blob = i.getAsFile();
          if (!blob) return null;
          const ext = (i.type.split("/")[1] || "png").replace("jpeg", "jpg");
          return new File([blob], `pasted-${stamp}${n ? `-${n + 1}` : ""}.${ext}`, { type: i.type });
        })
        .filter(Boolean);
      await addFiles(files);
    }

    const modelOptions = ref([]);
    const selectedModel = ref(null);
    const selectedGroup = ref(null);
    const selectedTarget = ref(null);
    const targetOptions = ref([]);

    function targetValue(groupId, modelId) {
      if (groupId != null) return `group:${groupId}`;
      if (modelId) return `model:${modelId}`;
      return null;
    }

    function buildTargetOptions(groups, models, activeGroup, activeModel) {
      const opts = [];
      if (groups.length) {
        opts.push({ label: "Agent groups", value: "_hdr_groups", disable: true });
        for (const g of groups) {
          opts.push({
            label: g.is_default ? `${g.name} (default)` : g.name,
            value: `group:${g.id}`,
          });
        }
      }
      if (models.length) {
        opts.push({ label: "Single models", value: "_hdr_models", disable: true });
        for (const m of models) {
          opts.push({
            label: m.display_name || m.model_id,
            value: `model:${m.model_id}`,
          });
        }
      }
      const sel = targetValue(activeGroup?.id ?? null, activeGroup ? null : activeModel);
      if (sel && !opts.some((o) => o.value === sel)) {
        opts.push({
          label: activeGroup?.name || activeModel || sel,
          value: sel,
        });
      }
      targetOptions.value = opts;
      selectedTarget.value = sel;
    }
    const autoApprove = ref(false);
    const autoapproveAllowed = ref(false);
    // --- slash commands ------------------------------------------------------
    // The toolbar switches, typed. The point of them is the phone: the Remote Pi app
    // renders a chat and nothing else, so "/write on" is the only way to reach Write
    // mode from a car park. The browser gets the same commands with autocomplete, and
    // the list is whatever the BRIDGE said this role may use - see `ready.commands`.
    const commands = ref([]);
    const cmdIndex = ref(0);
    const cmdDismissed = ref(false);

    /** Live state for the badge, so the list never shows a stale ON/OFF. */
    function cmdState(c) {
      if (!c.allowed) return "";
      if (c.name === "write") return readOnly.value ? "OFF" : "ON";
      if (c.name === "approve") return autoApprove.value ? "ON" : "OFF";
      if (c.name === "credentials") return autoCredential.value ? "ON" : "OFF";
      if (c.name === "totp") return autoTotp.value ? "ON" : "OFF";
      if (c.name === "email") return allowEmail.value ? "ON" : "OFF";
      return "";
    }

    /** Matches only while the NAME is still being typed - a space means args now. */
    const cmdMatches = computed(() => {
      if (cmdDismissed.value || !commands.value.length) return [];
      const m = /^\/([A-Za-z?][A-Za-z0-9?_-]*)?$/.exec(input.value);
      if (!m) return [];
      const q = (m[1] || "").toLowerCase();
      return commands.value
        .filter((c) => !q || c.name.startsWith(q) || (c.aliases || []).some((a) => a.startsWith(q)))
        .slice(0, 8);
    });

    watch(input, () => { cmdDismissed.value = false; cmdIndex.value = 0; });

    function applyCommand(c) {
      input.value = `/${c.name} `;
      cmdIndex.value = 0;
    }

    function onEnter() {
      const list = cmdMatches.value;
      if (list.length) { applyCommand(list[Math.min(cmdIndex.value, list.length - 1)]); return; }
      send();
    }

    function onCmdTab(e) {
      const list = cmdMatches.value;
      if (!list.length) return;
      e.preventDefault();
      applyCommand(list[Math.min(cmdIndex.value, list.length - 1)]);
    }

    function onCmdArrow(dir, e) {
      const list = cmdMatches.value;
      if (!list.length) return;
      e.preventDefault();
      cmdIndex.value = (cmdIndex.value + dir + list.length) % list.length;
    }

    /** A window command answers instantly; it must not raise the streaming spinner. */
    function looksLikeCommand(text) {
      const m = /^\/([A-Za-z?][A-Za-z0-9?_-]*)/.exec(text.trim());
      if (!m) return false;
      const w = m[1].toLowerCase();
      return commands.value.some((c) => c.name === w || (c.aliases || []).includes(w));
    }
    // --- live cost meter -----------------------------------------------------
    // Only populated when the server says this operator's role may see spend
    // (can_view_ai_cost, or superuser). The bridge sends nothing otherwise, so an
    // unprivileged operator cannot infer cost from traffic either.
    // --- Remote (mobile) -----------------------------------------------------
    // Pair a phone to THIS window and carry on the same conversation from it. The server
    // is authoritative on every one of these: `remoteAllowed` comes from the minted
    // session blob (role + global switch + a configured relay), and every state change
    // arrives as a `remote_state` frame rather than being assumed locally - so the button
    // can never claim the conversation is on a phone when it is not.
    const remoteAllowed = ref(false);
    const remoteEnabled = ref(false);
    const remoteState = ref("off");
    const remoteDevice = ref("");
    const remoteDevices = ref([]);
    const remoteBusy = ref(false);
    const remoteDialog = ref(false);
    const remotePairingUri = ref("");
    const remoteQr = useQRCode(remotePairingUri, { width: 240, margin: 1 });
    const remoteLabel = computed(() => {
      if (remoteState.value === "paired") return `Remote: ${remoteDevice.value || "paired"}`;
      if (remoteEnabled.value) return "Remote: waiting";
      return "Remote";
    });

    // --- PROMPT QUEUE ---------------------------------------------------------
    // The bridge owns the queue (queue.js): everything below mirrors its `queue_state`
    // frames and sends requests back. Per CONVERSATION - it survives refresh/reconnect/
    // Continue and a new chat starts empty. The panel's open/closed state is the only
    // thing kept in this browser.
    const $q = useQuasar();
    const queueOpen = ref(localStorage.getItem("pi.queue.open") === "1");
    watch(queueOpen, (v) => localStorage.setItem("pi.queue.open", v ? "1" : "0"));
    // Panel width, dragged from its left edge. Kept in this browser like open/closed.
    const QUEUE_W_DEFAULT = 400;
    const QUEUE_W_MIN = 300;
    const queueWidth = ref(Number(localStorage.getItem("pi.queue.width")) || QUEUE_W_DEFAULT);
    const queueResizing = ref(false);
    let queueDrag = null;
    function queueMaxWidth() {
      // Leave the chat at least 360px unless the panel is floating over it anyway.
      return Math.max(QUEUE_W_MIN, window.innerWidth - (queueOverlay.value ? 0 : 360));
    }
    function queueResizeStart(e) {
      if (e.button !== undefined && e.button !== 0) return;
      queueDrag = { x: e.clientX, w: queueWidth.value };
      queueResizing.value = true;
      const move = (ev) => {
        if (!queueDrag) return;
        // The grip is on the LEFT edge: dragging left (smaller x) makes the panel wider.
        const w = queueDrag.w + (queueDrag.x - ev.clientX);
        queueWidth.value = Math.round(Math.min(queueMaxWidth(), Math.max(QUEUE_W_MIN, w)));
      };
      const stop = () => {
        queueDrag = null;
        queueResizing.value = false;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        localStorage.setItem("pi.queue.width", String(queueWidth.value));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      e.preventDefault();
    }
    function queueResizeReset() {
      queueWidth.value = QUEUE_W_DEFAULT;
      localStorage.setItem("pi.queue.width", String(QUEUE_W_DEFAULT));
    }
    // Narrow window: the panel floats over the chat instead of squeezing it.
    const queueOverlay = computed(() => $q.screen.lt.md);
    const queueItems = ref([]);
    const queueAuto = ref(false);
    // ON is the default (the server decides, per window - see queue.js), so the toggle
    // must not sit at off for the moment before the first queue_state frame arrives.
    const queueAutoClear = ref(true);
    const queuePaused = ref(null);
    const queueRunningId = ref(null);
    const queueWorkingOn = ref(null);
    const queuePending = ref(0);
    const queueNew = ref("");
    const queueNewCompact = ref(false);
    const queueEditId = ref(null);
    const queueEditText = ref("");
    const queueQuestions = ref([]);
    const queueHistory = ref([]);
    const queueHistoryCount = ref(0);
    const queueHistoryLoading = ref(false);
    const queueHistoryOpen = ref(false);
    // "Show me only Dan's prompts" - see queueHistPeople / queueHistoryView below.
    const queueHistFilter = ref("");
    // Always ask the bridge for the list at the moment it is opened. A copy that rode in
    // on an earlier frame is exactly how this panel came to show a conversation's first
    // few events and nothing since.
    function openQueueHistory() {
      queueHistoryOpen.value = true;
      queueHistFilter.value = "";   // a stale filter hiding the newest rows is a bug report
      queueHistoryLoading.value = true;
      queueSend({ type: "queue_history" });
    }
    // Newest first, and only the chosen person when the "who" filter is set. The filter
    // compares logins, not display names: two technicians with the same first name must
    // not merge into one line of the audit.
    const queueHistoryView = computed(() => {
      const want = queueHistFilter.value;
      const rows = want
        ? queueHistory.value.filter((e) => {
            if (!queueHistIsHuman(e.event)) return false;
            const key = String(e.user || e.by || "").toLowerCase();
            return want === "\u0000unknown" ? !key : key === want;
          })
        : queueHistory.value;
      return [...rows].reverse();
    });
    const queueAnswerText = ref({});   // question id -> draft answer
    // WHICH LONG TEXTS THE OPERATOR HAS EXPANDED. The queue panel is a fixed-height column
    // (header, switches, questions/paused, the "Next prompt" box, Run controls, then the
    // scrolling list). A question can be 700+ characters, and with two of them the box you
    // type the NEXT prompt into was pushed off the bottom of the panel - so the text starts
    // clamped to a few lines and expands on click. Keyed by a string: 'q<id>', 'about<id>',
    // 'paused'.
    const queueTextOpen = ref({});
    function queueTextToggle(key) {
      queueTextOpen.value = { ...queueTextOpen.value, [key]: !queueTextOpen.value[key] };
    }
    const queueThreadOpen = ref({});   // item id -> Q&A unfolded
    // Auto-open: the panel opens by itself when a chat comes up with anything queued, and
    // whenever a question arrives. Closing it by hand sticks for this page load.
    let queueUserClosed = false;
    let queueFirstState = true;
    let queueLastPausedAt = null;

    const costVisible = ref(false);
    const sessionCost = ref(0);
    const costDesktop = ref(null);
    // Capabilities an ADMIN granted for this session (not from the user's role) - shown next to
    // the switch so it is obvious where the permission came from.
    const grantedCaps = ref([]);
    const canGrantCaps = ref(false);
    const decisionRef = ref("");

    // ---- CAPABILITIES FOR THIS SESSION (owner, 2026-09-28) ---------------------------
    // The switches themselves live in the technician's hamburger and are gated by their ROLE.
    // When an admin is in the session and a technician needs one anyway, the admin turns it on
    // from here: one person, this ticket/device, on top of their role, expiring on its own.
    // `can_grant_caps` comes from the server (superuser or can_edit_core_settings) and is the
    // same test the API applies, so the block cannot appear for someone who would be refused.
    const capScopeKind = computed(() => (isDecision ? "ticket" : "device"));
    // What the grant attaches to. The bridge keys a live window as decision:<ticket> or the
    // agent id; the RMM stores the same ref on the row so it re-applies when the window reopens.
    const capScopeRef = computed(() => (isDecision ? String(decisionRef.value || "") : String(agentId || "")));
    const capCatalog = ref([]);
    const capPicked = ref([]);
    const capExisting = ref([]);       // already granted to this person in this scope
    const capRoleAllowed = ref({});    // cap id -> their role covers it anyway
    const capPeople = ref([]);
    const capUsername = ref("");
    const capMinutes = ref(1440);
    const capSaving = ref(false);
    const capMessage = ref("");
    const capDurations = [
      { label: "1 hour", value: 60 },
      { label: "4 hours", value: 240 },
      { label: "Today (24 hours)", value: 1440 },
      { label: "Until withdrawn", value: 0 },
    ];
    const capPeopleOptions = computed(() => capPeople.value);
    const capPeopleHint = computed(() =>
      capInRoster.value
        ? "Everyone who has joined this session."
        : "Nobody has joined yet - this is the full user list.",
    );
    const capInRoster = computed(() => (roster.value.people || []).length > 0);

    async function loadCapabilities() {
      if (!canGrantCaps.value || !capScopeRef.value) return;
      try {
        const d = await fetchSessionCaps({ list: 1 });
        capCatalog.value = d.catalog || [];
      } catch {
        return;      // the API is the authority on who may grant; say nothing if it refuses
      }
      if (!capPeople.value.length) {
        // Prefer the people actually in the session. Falling back to every active user keeps
        // the pre-grant case working (a technician who has not opened the ticket yet).
        const here = (roster.value.people || []).map((p) => ({
          label: p.display && p.display !== p.username ? `${p.display} (${p.username})` : p.username,
          value: p.username,
        }));
        if (here.length) {
          capPeople.value = here;
        } else {
          try {
            const u = await fetchUsers();
            const all = Array.isArray(u) ? u : (u && (u.users || u.results)) || [];
            capPeople.value = all
              .filter((x) => x.is_active !== false)
              .map((x) => ({ label: x.email ? `${x.username} (${x.email})` : x.username, value: x.username }));
          } catch {
            capPeople.value = [];
          }
        }
      }
      if (!capUsername.value && capPeople.value.length) {
        // Default to whoever is driving: that is who an admin joined the session to help.
        const driver = (roster.value.people || []).find((p) => p.driving);
        capUsername.value = (driver && driver.username) || capPeople.value[0].value;
      }
      await loadCapsForUser();
    }

    async function loadCapsForUser() {
      capExisting.value = [];
      capRoleAllowed.value = {};
      if (!capUsername.value || !capScopeRef.value) return;
      try {
        const d = await fetchSessionCaps({
          username: capUsername.value,
          scope_kind: capScopeKind.value,
          scope_ref: capScopeRef.value,
        });
        capCatalog.value = d.catalog || capCatalog.value;
        capExisting.value = d.caps || [];
        capRoleAllowed.value = d.role_allowed || {};
      } catch {
        /* leave both unknown rather than claim a capability they may not have */
      }
    }

    async function grantCapabilities() {
      capSaving.value = true;
      capMessage.value = "";
      try {
        const r = await grantSessionCaps({
          username: capUsername.value,
          scope_kind: capScopeKind.value,
          scope_ref: capScopeRef.value,
          caps: capPicked.value,
          minutes: capMinutes.value || null,
          enable: true,
          note: `granted from the ${capScopeKind.value} session`,
        });
        capMessage.value = r.bridge_notified
          ? "Granted and switched on in their window."
          : "Granted. It applies the next time they open this chat.";
        notifySuccess(capMessage.value);
        capPicked.value = [];
        await loadCapsForUser();
      } catch (e) {
        notifyError(e?.response?.data || "Could not grant the capability");
      } finally {
        capSaving.value = false;
      }
    }

    // Withdraw everything this person holds in THIS scope. The Settings table that used to do
    // this is gone, so without it a grant made "until withdrawn" could never be taken back.
    async function withdrawCapabilities() {
      capSaving.value = true;
      capMessage.value = "";
      try {
        const r = await revokeSessionCaps({
          username: capUsername.value,
          scope_kind: capScopeKind.value,
          scope_ref: capScopeRef.value,
        });
        notifySuccess(r && r.removed ? `Withdrew ${r.removed} grant(s).` : "Nothing to withdraw.");
        capPicked.value = [];
        await loadCapsForUser();
      } catch (e) {
        notifyError(e?.response?.data || "Could not withdraw the capability");
      } finally {
        capSaving.value = false;
      }
    }

    // ---- WHAT THE AUTOMATION IS ABOUT TO DO (approval for this ticket) ----------------
    // Shown before anything runs, so a technician reviews the plan and says go. The plan comes
    // from the subject's RULE, rendered for this ticket by the server - never from model prose.
    const approval = ref(null);
    const approvalBusy = ref(false);
    const approvalError = ref("");

    async function loadApproval() {
      if (!isDecision || !decisionRef.value) return;
      approvalError.value = "";
      try {
        approval.value = await fetchAutomationApproval(String(decisionRef.value));
      } catch {
        approval.value = null;   // no plan for this ticket is a normal state, not an error
      }
    }

    async function requestApprovalPlan() {
      approvalBusy.value = true;
      approvalError.value = "";
      try {
        const r = await automationApproval({ action: "propose", ticket_ref: String(decisionRef.value) });
        if (r.error) approvalError.value = r.error;
        else approval.value = r;
      } catch (e) {
        approvalError.value = String(e?.response?.data?.error || e?.response?.data || "could not write a plan");
      } finally {
        approvalBusy.value = false;
      }
    }

    async function decideApproval(action) {
      approvalBusy.value = true;
      approvalError.value = "";
      try {
        const r = await automationApproval({ action, ticket_ref: String(decisionRef.value) });
        if (r.error) approvalError.value = r.error;
        else if (r.state) approval.value = r;
        else approval.value = { ...(approval.value || {}), state: action === "approve" ? "approved" : "declined" };
        if (action === "approve") notifySuccess("Approved - the automation may work this ticket");
      } catch (e) {
        // A 409 here is the gate doing its job: the plan changed since it was displayed.
        approvalError.value = String(e?.response?.data?.error || e?.response?.data || "could not record that");
      } finally {
        approvalBusy.value = false;
      }
    }

    // Read the catalogue (and who may grant) when the dialog opens, and re-read what the
    // chosen technician already has whenever the choice changes.
    watch(accessDialog, (open) => { if (open) loadCapabilities(); });
    // The decision window is the place a technician decides - so ask what the automation intends
    // as soon as we know which ticket this is.
    watch(decisionRef, () => { loadApproval(); }, { immediate: true });
    watch(capUsername, loadCapsForUser);
    const lastTurnCost = ref(0);
    const costTurns = ref(0);
    // Lifetime spend of the wider window (this device, or this ticket) that the
    // conversation sits inside. Display only - the chip itself meters THIS chat, which
    // is what an operator can actually act on. `null` = the server could not read the
    // ledger, so we say nothing rather than showing a wrong $0.00.
    const windowCost = ref(null);
    const windowTurns = ref(0);
    const windowScope = ref("agent");
    const contextTokens = ref(0);
    const contextWindow = ref(0);
    const costTokens = ref({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 });
    // Dollar split per token class + per model. This is what explains a bill: one real
    // session spent $2.25 on cacheWrite and $1.73 on cacheRead to deliver $0.61 of output.
    const costSpend = ref(null);
    const costPerTurn = ref(0);
    const costByModel = ref([]);
    const costByRole = ref([]);
    const modelSwitches = ref(0);
    const switchSpend = ref(0);
    const pricingKnown = ref(true);
    const compacting = ref(false);
    const compactCancelling = ref(false);
    // What the overlay says: why it is running and how big the chat was.
    const compactInfo = ref({ auto: false, tokens: 0, clear: false });
    const compactStartedAt = ref(0);
    let compactBackstop = null;
    watch(compacting, (on) => {
      if (compactBackstop) { clearTimeout(compactBackstop); compactBackstop = null; }
      if (on) {
        compactStartedAt.value = Date.now();
        // Take focus off the composer so typing does not look like it will go anywhere.
        try { document.activeElement?.blur?.(); } catch (e) { /* noop */ }
        // A dropped `compacted`/`error` frame must not lock the window for good.
        // Just past the bridge's own 5-minute limit, so its "stopped" message lands first.
        compactBackstop = setTimeout(() => { compacting.value = false; }, 330000);
      } else {
        compactCancelling.value = false;
        compactInfo.value = { auto: false, tokens: 0, clear: false };
      }
    });
    const contextPct = computed(() =>
      contextWindow.value > 0
        ? Math.min(100, Math.round((contextTokens.value / contextWindow.value) * 100))
        : 0,
    );
    // Green while cheap, amber past $1, red past $5 - matches the bridge's warn bands.
    const costColor = computed(() =>
      sessionCost.value >= 5 ? "red-5" : sessionCost.value >= 1 ? "orange-5" : "green-5",
    );
    const fmtMoney = (n) =>
      `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtTokens = (n) => {
      const v = Number(n || 0);
      if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
      if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
      return String(v);
    };
    const readOnly = ref(false);
    const allowEmail = ref(true);
    function sendAllowEmail(val) {
      if (ws && connected.value) ws.send(JSON.stringify({ type: "set_allow_email", value: !!val }));
    }
    // Auto-credential: shown only when the role carries the permission, and re-checked
    // server-side on every toggle and every credential read.
    const autocredentialAllowed = ref(false);
    const autoCredential = ref(false);
    // Auto-TOTP (ticket windows): the bridge owns the value and remembers it per window.
    const autototpAllowed = ref(false);
    const autoTotp = ref(false);
    // Auto-summarize: per window, on at 100k by default. The bridge owns the value and
    // remembers a change for this window only; the box shows thousands.
    const autoSummarize = ref(true);
    const autoSummarizeK = ref(100);
    let sentSummarizeK = 100;
    function sendAutoSummarize(val) {
      if (ws && connected.value) ws.send(JSON.stringify({ type: "set_auto_summarize", value: !!val }));
    }
    function sendAutoSummarizeTokens() {
      const k = Math.round(Number(autoSummarizeK.value));
      if (!Number.isFinite(k) || k <= 0) { autoSummarizeK.value = sentSummarizeK; return; }
      const clamped = Math.min(1000, Math.max(20, k));
      autoSummarizeK.value = clamped;
      if (clamped === sentSummarizeK) return;
      sentSummarizeK = clamped;
      if (ws && connected.value) {
        ws.send(JSON.stringify({ type: "set_auto_summarize_tokens", value: clamped * 1000 }));
      }
    }
    // Where the threshold came from: the agent group / model (inherited) or this window.
    const summarizeInherited = ref(true);
    const summarizeInheritedK = ref(100);
    function resetAutoSummarizeTokens() {
      if (ws && connected.value) ws.send(JSON.stringify({ type: "set_auto_summarize_tokens", value: "default" }));
    }
    function applySummarizeState(enabled, tokens, inherited, inheritedTokens) {
      if (inherited !== undefined) summarizeInherited.value = !!inherited;
      if (inheritedTokens !== undefined && Number(inheritedTokens) > 0) summarizeInheritedK.value = Math.round(Number(inheritedTokens) / 1000);
      if (enabled !== undefined) autoSummarize.value = !!enabled;
      if (tokens !== undefined && Number(tokens) > 0) {
        autoSummarizeK.value = Math.round(Number(tokens) / 1000);
        sentSummarizeK = autoSummarizeK.value;
      }
    }
    // Technician's own name for this conversation. Mirrored into the window title so a
    // desktop full of Pi popups is navigable, and into AI History so it is findable later.
    const sessionLabel = ref("");
    let lastSentLabel = "";
    function sendLabel() {
      const val = (sessionLabel.value || "").replace(/\s+/g, " ").trim().slice(0, 120);
      sessionLabel.value = val;
      // Only talk to the server when it actually changed: blur fires on every click away.
      if (val === lastSentLabel) return;
      lastSentLabel = val;
      if (ws && connected.value) ws.send(JSON.stringify({ type: "set_label", value: val }));
      applyWindowTitle();
    }
    function applyWindowTitle() {
      const who = hostname.value || (isMulti ? "multi-machine" : agentId || "");
      const base = `Pi.dev - ${who}`;
      try {
        document.title = sessionLabel.value ? `${sessionLabel.value} - ${base}` : base;
      } catch (e) { /* title is a nicety, never a failure */ }
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
    // `hasHistory` = this window reopened onto a conversation that already exists
    // (a refresh now RESUMES instead of starting over). The seed prompt describes the
    // finding once; re-sending it on every reload would ask the same question again.
    async function maybeSeedResolve(hasHistory) {
      if (!resolveRun || resolveSeeded) return;
      resolveSeeded = true;
      if (hasHistory) return;
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
      scrollToBottom(true);
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
    const compactElapsed = computed(() => {
      if (!compactStartedAt.value) return "0s";
      const s = Math.max(0, Math.floor((nowTick.value - compactStartedAt.value) / 1000));
      return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
    });
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
    // WHAT IT IS DOING RIGHT NOW, IN WORDS.
    //
    // While a turn runs, the only thing the window said was "working… (12s)" - and the raw
    // tool call (name + a wall of JSON args) only appears once the transcript repaints. So a
    // turn that is five tool calls deep looked identical to one that had not started, and the
    // owner could not tell what the AI was working on. Every step now publishes a plain-English
    // line, which the streaming row shows next to the elapsed time and the tool card title uses.
    const currentActivity = ref(null);   // { label, detail } | null
    const TOOL_VERBS = {
      run_device_command: "Running a command on the device",
      run_command_on_device: "Running a command on the device",
      run_device_command_with_credential: "Running a command with a stored credential",
      get_device_hardware: "Reading the device's hardware",
      helpdesk_call: "Working the ticket",
      delegate: "Delegating to a specialist",
      pause_queue: "Asking you a question",
      read: "Reading a file",
      write: "Writing a file",
      edit: "Editing a file",
      grep: "Searching files",
      find: "Looking for files",
      ls: "Listing a directory",
      bash: "Running a command",
      web_fetch: "Fetching a web page",
      web_search: "Searching the web",
      save_device_note: "Saving a note on the device",
      attach_capture: "Attaching a captured file",
      operator_desktop_open_url: "Opening a window on the operator's desktop",
      get_ticket: "Reading the ticket",
      update_ticket: "Updating the ticket",
      resolve_ticket: "Closing the ticket",
    };
    /** { label, detail } for one tool call - the detail is the single most useful field. */
    function toolActivity(name, args) {
      const n = String(name || "a tool");
      const a = args && typeof args === "object" ? args : {};
      const label = TOOL_VERBS[n] || n.replace(/_/g, " ");
      const oneLine = (v) => String(v == null ? "" : v).split("\n")[0].trim().slice(0, 130);
      let detail = "";
      if (a.command) detail = oneLine(a.command);
      else if (a.question) detail = oneLine(a.question);
      else if (a.task) detail = oneLine(a.task);
      else if (a.operation) detail = oneLine(a.operation);
      else if (a.path) detail = oneLine(a.path);
      else if (a.pattern) detail = oneLine(a.pattern);
      else if (a.url) detail = oneLine(a.url);
      else if (a.role) detail = oneLine(a.role);
      else if (a.subject) detail = oneLine(a.subject);
      return { label, detail };
    }
    const workingText = computed(() => {
      if (stalled.value)
        return `No response for ${staleSec.value}s — it may be stuck or the provider/device is slow. You can keep waiting or Stop.`;
      const act = currentActivity.value;
      if (act) return `${act.label}${act.detail ? `: ${act.detail}` : ""} — ${elapsedSec.value}s`;
      return `Thinking — no tool running yet (${elapsedSec.value}s)`;
    });

    function wsBase() {
      const base = getBaseUrl(); // https://api.example.com
      return base.replace(/^http/, "ws");
    }

    // ------------------------------------------------------------------ SCROLL PAUSE
    //
    // Asked for (owner, 2026-09-22): "when i scroll up in any of the AI windows... i need
    // it to PAUSE where I am when new info shows up at the bottom of the screen.. i am
    // usually reviewing or trying to copy / paste ... it should only keep updating with the
    // most recent data when i am at the bottom of the screen within 1% of the entire
    // scrolled area".
    //
    // Before this, EVERY frame called scrollToBottom() unconditionally - a streaming answer
    // does that many times a second - so reading anything above the fold was impossible and
    // a drag-selection was yanked out from under the mouse mid-copy.
    //
    // The rule is exactly as specified: follow the conversation only while the view is
    // within 1% of the scrollable height of the bottom. `scrollHeight` is the ENTIRE
    // scrolled area, so on a long transcript 1% is a comfortable band and on a short one it
    // is a few pixels - hence the small floor, or a transcript one line taller than its
    // window would unpin itself on a single wheel click.
    // The rule itself lives in one place for every streaming window - see
    // utils/scrollFollow.js for why 1% of the WHOLE scrolled area, and why there is a floor.
    const pinnedToBottom = ref(true);
    // How much arrived while held, so the button can say what you are missing rather than
    // just "jump". Counted in messages, which is what a person sees.
    const heldCount = ref(0);
    const heldLabel = computed(() =>
      heldCount.value > 0
        ? `Paused \u2014 ${heldCount.value} new below`
        : "Paused \u2014 jump to latest",
    );

    /** Every scroll of the transcript re-decides whether we are following it. */
    function onTranscriptScroll() {
      const el = scrollArea.value;
      if (!el) return;
      const at = isFollowingBottom(el);
      if (at === pinnedToBottom.value) return;
      pinnedToBottom.value = at;
      // Coming back to the bottom means "follow again", and there is nothing held.
      if (at) heldCount.value = 0;
    }

    // Message count when the view was last at the bottom: the baseline for "N new below".
    let heldFromCount = 0;

    /**
     * Keep the newest content in view - but ONLY while the reader is at the bottom.
     *
     * Called from every frame handler, so this one guard is what makes the whole window
     * behave. `force` is for the deliberate cases: the operator pressing the button, their
     * own message being sent, opening the window.
     */
    async function scrollToBottom(force = false) {
      await nextTick();
      const el = scrollArea.value;
      if (!el) return;
      if (!force && !pinnedToBottom.value) {
        heldCount.value = messages.value.length - heldFromCount;
        if (heldCount.value < 0) heldCount.value = 0;
        return;
      }
      el.scrollTop = el.scrollHeight;
      pinnedToBottom.value = true;
      heldCount.value = 0;
      heldFromCount = messages.value.length;
    }

    /** The button, and anything that means "take me back to live". */
    function jumpToLatest() {
      pinnedToBottom.value = true;
      heldCount.value = 0;
      scrollToBottom(true);
    }

    // --- Mobile viewport -----------------------------------------------------
    // `100vh` on a phone is the height of the viewport with the browser chrome
    // RETRACTED - taller than what you can actually see. This column is sized
    // from the top, so the overflow lands at the BOTTOM: the composer, and the
    // last message above it, end up under the address bar and cannot be read.
    // `100dvh` (in the stylesheet) tracks that chrome, but NEITHER unit reacts
    // to the software keyboard - only the *visual* viewport shrinks when it
    // opens. So where the API exists we measure it and drive the height here.
    const root = ref(null);
    let vvRaf = 0;

    function applyViewportHeight() {
      const el = root.value;
      const vv = window.visualViewport;
      if (!el || !vv) return;
      // Pinch-zoom shrinks the visual viewport too. Resizing the chat to fit a
      // zoomed-in rectangle would be wrong, so hand back to the CSS (dvh).
      if (vv.scale > 1.01) {
        el.classList.remove("pichat--measured");
        return;
      }
      // Was the transcript pinned to the bottom before we resized it? If so it
      // has to stay pinned - keeping the newest message visible is the point.
      // Was the transcript following the conversation before we resized it? If it was, it
      // has to stay pinned; if the reader had scrolled up, the keyboard opening must not
      // throw them back to the bottom (the same rule as everywhere else - isAtBottom()).
      const wasAtBottom = pinnedToBottom.value && isFollowingBottom(scrollArea.value);

      el.style.setProperty("--pichat-h", `${Math.round(vv.height)}px`);
      el.classList.add("pichat--measured");
      if (wasAtBottom) scrollToBottom(true);
    }

    function onViewportChange() {
      // These fire in bursts while the keyboard animates in; coalesce them.
      if (vvRaf) cancelAnimationFrame(vvRaf);
      vvRaf = requestAnimationFrame(applyViewportHeight);
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
          const act = toolActivity(e.toolName, e.args);
          // The same readable description feeds the live "what is it doing" line and the
          // tool card's title, so the card header stops being `run_device_command`.
          currentActivity.value = act;
          a.tools.push({
            id: e.toolCallId,
            name: e.toolName,
            label: act.label,
            detail: act.detail,
            args: e.args ? JSON.stringify(e.args, null, 2) : "",
            result: "",
            done: false,
            isError: false,
          });
          scrollToBottom();
          break;
        }
        case "tool_execution_end": {
          currentActivity.value = null;
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
        case "agent_end": {
          // Only announce a turn that was genuinely in progress. This suppresses
          // reconnect/history hydration, duplicate agent_end events, and an
          // agent_end that arrives after the operator pressed Stop.
          if (currentIdx >= 0 && messages.value[currentIdx]) {
            messages.value[currentIdx].done = true;
          }
          // Never leave "Running a command…" hanging after the turn that was running it.
          currentActivity.value = null;
          streaming.value = false;
          // If the bridge's turn continues (recovery, auto-continue, authorizer follow-up),
          // its run_state frame right after this puts Stop back.
          serverRunning = false;
          scrollToBottom();
          // THE SOUND DOES NOT GO HERE (owner, 2026-09-27: "it dinged like it was done and kept
          // on working"). A run ending is not the turn ending - the bridge continues it with
          // recovery re-runs, stall-continue, the authorizer, or a queued prompt. The ding moved
          // to the bridge's `turn_settled` frame, which is only sent when nothing is left to run.
          break;
        }
        case "turn_settled":
          currentActivity.value = null;
          // The bridge has checked: nothing more will run automatically for this turn.
          if (messages.value[currentIdx >= 0 ? currentIdx : messages.value.length - 1]) {
            messages.value[currentIdx >= 0 ? currentIdx : messages.value.length - 1].done = true;
          }
          announceCompletion({
            kind: isDecision ? "decision" : "chat",
            hostname: hostname.value,
            key: `${curSessionId || "session"}:${streamStartAt.value}`,
            needsYou: !!m.waiting_for_you,   // a question, not "done": the bong, not the ding
          });
          break;
        case "agent_start":
          serverRunning = true;
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

    // AUTO-RECONNECT. The bridge closes a socket it considers idle (code 1000 "idle"),
    // and networks drop them for reasons of their own. Neither should cost the tech a
    // page refresh: the server-side session survives the socket, so simply reopening
    // (resume = current session) puts the same conversation back on screen. Only a close
    // WE asked for (switching model/group, leaving the page) is left alone.
    let intentionalClose = false;
    let unmounted = false;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const RECONNECT_MAX_ATTEMPTS = 6;
    function scheduleReconnect(code) {
      if (unmounted || reconnectTimer) return;
      if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        connectionLost.value = true;
        return;
      }
      // The server's own idle close is not a fault - come straight back. Anything else
      // backs off: 1s, 2s, 4s ... capped at 30s.
      const idle = code === 1000;
      const delay = idle ? 250 : Math.min(30000, 1000 * 2 ** reconnectAttempts);
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (unmounted) return;
        connect({
          resume: curSessionId,
          model_id: selectedModel.value,
          group_id: selectedGroup.value,
        });
      }, delay);
    }

    // Write the live session id into the address bar as ?resume=<id>. THIS is what makes
    // a refresh (or a restored tab, or a link someone pasted to themselves) come back to
    // the SAME conversation: the bridge only ever resumes when it is handed a session id,
    // so a window that never published its own id was guaranteed to start over. Done with
    // replace(), not push(), so the back button still leaves the chat instead of walking
    // back through identical URLs.
    function stampResumeInUrl(sid) {
      // A ticket/decision window is minted from its own token and has no resumable id
      // in this sense - leave its URL alone.
      if (!sid || isDecision) return;
      if (route.query.resume === sid) return;
      const q = { ...route.query, resume: sid };
      // "start new NOW" has already happened by the time we know the id; keeping the flag
      // would re-fire on the next reload and throw this conversation away.
      delete q.new;
      router.replace({ path: route.path, query: q }).catch(() => { /* navigation noop */ });
    }

    // `fresh: true` = deliberately start a NEW conversation (New chat, AI Resolve). Without
    // it the window reopens the session named in ?resume= - which is what a refresh, a
    // reconnect and a model switch all want.
    function connect({ model_id, resume, group_id, fresh } = {}) {
      // close any existing
      if (ws) {
        intentionalClose = true;
        try { ws.close(); } catch (e) { /* noop */ }
        ws = null;
      }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      let sendGroup = group_id;
      let sendModel = model_id;
      // A refresh / new window must reopen on what THIS person last picked, not the
      // global default — as long as they still have access (server re-checks).
      if (group_id === undefined && model_id === undefined && !resume) {
        const saved = loadSavedTarget();
        if (saved && saved.group_id != null) {
          sendGroup = saved.group_id;
        } else if (saved && Object.prototype.hasOwnProperty.call(saved, "group_id") && saved.model_id) {
          sendGroup = null;
          sendModel = saved.model_id;
        } else if (selectedGroup.value != null) {
          sendGroup = selectedGroup.value;
        }
      } else if (group_id === undefined && selectedGroup.value != null) {
        sendGroup = selectedGroup.value;
      }
      const groupPayload = sendGroup !== undefined ? { group_id: sendGroup } : {};
      const create = isDecision
        ? createDecisionSession(decisionToken, { ...(sendModel ? { model_id: sendModel } : {}), ...groupPayload })
        : isMulti
        ? createPiMultiSession({
            machines: multiMachines,
            ...(sendModel ? { model_id: sendModel } : {}),
            ...(resume ? { resume_session: resume } : {}),
            ...(fresh ? { new_session: true } : {}),
            ...groupPayload,
          })
        : createPiSession(agentId, {
            ...(sendModel ? { model_id: sendModel } : {}),
            ...(resume ? { resume_session: resume } : {}),
            // An AI Resolve window seeds its own diagnostic prompt about one finding, so
            // it starts clean rather than inheriting whatever was last discussed here.
            ...(fresh || resolveRun ? { new_session: true } : {}),
            ...(resolveRun ? { read_only: true } : {}),
            ...groupPayload,
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
          selectedGroup.value = data.agent_group?.id ?? null;
          buildTargetOptions(
            data.agent_groups || [],
            data.allowed_models || [],
            data.agent_group,
            data.agent_group ? null : data.model_id,
          );
          saveTarget(
            data.agent_group?.id ?? null,
            data.agent_group ? null : data.model_id,
          );
          autoapproveAllowed.value = !!data.autoapprove_allowed;
          // Which ticket this decision window is about, and whether the viewer may hand out
          // capabilities - both needed by the admin panel below.
          decisionRef.value = String(data.subject_ref || data.ticket_ref || "");
          canGrantCaps.value = !!data.can_grant_caps;
          grantedCaps.value = Array.isArray(data.caps_granted) ? data.caps_granted : [];
          // The server remembers the operator's Auto-approve choice; render THAT rather
          // than defaulting to off, or a refresh looks like the setting silently died.
          if (data.auto_approve !== undefined) autoApprove.value = !!data.auto_approve;
          autocredentialAllowed.value = !!data.autocredential_allowed;
          if (data.auto_credential !== undefined) autoCredential.value = !!data.auto_credential;
          remoteAllowed.value = !!data.remote_allowed;

          const url = `${wsBase()}/pi/ws/${data.token}/`;
          ws = new WebSocket(url);
          const sock = ws;
          intentionalClose = false;
          ws.onopen = () => {
            connected.value = true;
            connectionLost.value = false;
            reconnectAttempts = 0;
            queueFirstState = true;
          };
          ws.onclose = (evt) => {
            // A socket we already replaced has nothing to say about the current one.
            if (sock !== ws) return;
            connected.value = false;
            const wasStreaming = streaming.value;
            streaming.value = false;
            serverRunning = false;
            if (intentionalClose || unmounted) return;
            // Not asked for: reopen the same session. If we were mid-response, say so
            // once - the reconnect hydrates the transcript, so nothing is lost.
            if (wasStreaming && reconnectAttempts === 0) {
              messages.value.push({
                role: "system",
                text: "⚠ Connection dropped while the assistant was working — reconnecting…",
              });
            }
            scheduleReconnect(evt && evt.code);
          };
          ws.onerror = () => {
            connected.value = false;
          };
          ws.onmessage = (evt) => {
            let m;
            try { m = JSON.parse(evt.data); } catch (e) { return; }
            markActivity();
            if (m.type === "ready") {
              // Notes about how this window opened. COLLECTED, not pushed: hydrating the
              // transcript below replaces messages[] wholesale, so anything pushed before
              // it was silently thrown away - which is why "Resumed on <model>" was never
              // actually seen. They go in after the history, where they read as a header
              // for what happens next.
              const notes = [];
              if (m.auto_approve !== undefined) autoApprove.value = !!m.auto_approve;
              curSessionId = m.session_id || curSessionId;
              // Publish it immediately: from here on a reload lands back in this chat.
              stampResumeInUrl(curSessionId);
              readOnly.value = !!m.read_only;
              if (m.allow_email !== undefined) allowEmail.value = !!m.allow_email;
              if (m.autocredential_allowed !== undefined) autocredentialAllowed.value = !!m.autocredential_allowed;
              if (m.auto_credential !== undefined) autoCredential.value = !!m.auto_credential;
              if (m.autototp_allowed !== undefined) autototpAllowed.value = !!m.autototp_allowed;
              if (m.auto_totp !== undefined) autoTotp.value = !!m.auto_totp;
              applySummarizeState(m.auto_summarize, m.auto_summarize_tokens, m.auto_summarize_inherited, m.auto_summarize_inherited_tokens);
              // A resumed chat keeps the label it was given, so "Continue" from AI History
              // lands in a window that still knows what it is.
              if (m.label !== undefined) {
                sessionLabel.value = String(m.label || "");
                lastSentLabel = sessionLabel.value;
              }
              applyWindowTitle();
              // The bridge decides which model this window actually opens on: it reopens
              // on whatever the conversation was last using, which is NOT necessarily the
              // global default the session endpoint handed us. Without this the picker
              // would sit on the default while the session ran on something else.
              if (m.model?.model_id) selectedModel.value = m.model.model_id;
              if (m.agent_group?.id) selectedGroup.value = m.agent_group.id;
              selectedTarget.value = targetValue(
                selectedGroup.value,
                selectedGroup.value ? null : selectedModel.value,
              );
              // What this window remembered from last time, and what it could not give
              // back. Both are stated: a technician who believes Write mode is still on
              // will not understand the refusals they start getting.
              if (m.model_source === "remembered") {
                notes.push({
                  role: "system",
                  text: `Resumed on ${m.model.display} \u2014 the model this chat was last using.`,
                });
              } else if (m.model_remembered_denied) {
                notes.push({
                  role: "system",
                  text:
                    `This chat was last using ${m.model_remembered_denied}, which is not available ` +
                    `to your role \u2014 opened on ${m.model.display} instead.`,
                });
              }
              if (m.switches_restored?.length) {
                notes.push({
                  role: "system",
                  text: `Restored from last time: ${m.switches_restored.join(", ")}.`,
                });
              }
              if (m.switches_denied?.length) {
                notes.push({
                  role: "system",
                  text:
                    `${m.switches_denied.join(", ")} was on when this window was last used, but ` +
                    `your role does not carry it \u2014 opened without it.`,
                });
              }
              mutateAllowed.value = !!m.mutate_allowed;
              costVisible.value = !!m.cost_visible;
              if (m.presence) presence.value = m.presence;
              if (m.ticket_stage !== undefined) ticketStage.value = m.ticket_stage || "";
              // The SERVER decides whether a turn is running. This used to only ever set
              // the flag TRUE, so a turn interrupted by a restart (no agent_end ever
              // arrived) left the window stuck "thinking" forever - composer disabled,
              // Run next disabled, nothing to do but reload. On every ready frame the
              // server's answer wins, in both directions.
              streaming.value = !!m.streaming;
              serverRunning = !!m.streaming;
              if (m.streaming) streamStartAt.value = Date.now();
              pinned.value = !!m.pinned; pinnedBy.value = m.pinned_by || "";
              if (isPhone.value && m.presence?.you?.role === "owner" && !m.pinned) setPin(true);
              // Attachment caps and vision support come from the bridge, so the composer
              // can never offer something the server will refuse.
              if (m.attachments) {
                attachEnabled.value = m.attachments.enabled !== false;
                imagesSupported.value = !!m.attachments.images_supported;
                attachMax.value = {
                  files: Number(m.attachments.max_files || 5),
                  fileBytes: Number(m.attachments.max_file_bytes || 8 * 1024 * 1024),
                  totalBytes: Number(m.attachments.max_total_bytes || 20 * 1024 * 1024),
                };
              }
              // Autocomplete is whatever the bridge says this role may use. Nothing is
              // inferred here, so the list cannot drift from what the server enforces.
              commands.value = Array.isArray(m.commands) ? m.commands : [];
              if (m.remote_allowed !== undefined) remoteAllowed.value = !!m.remote_allowed;
              contextWindow.value = Number(m.context_window || 0);
              // Desktop Operator availability is deliberately NOT announced here.
              // It was pushed as a system note on every session open, so it repeated in
              // every chat window for people who already know the capability exists.
              // The capability is unchanged — only the banner is gone. Other open-time
              // notes (model resume, restored/denied switches) still appear.
              maybeSeedResolve(Array.isArray(m.history) && m.history.length > 0);
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
                  const blocks = typeof hm.content === "string" ? [] : (hm.content || []);
                  const txt = typeof hm.content === "string"
                    ? hm.content
                    : blocks.filter((c) => c.type === "text").map((c) => c.text).join("");
                  const split = splitAttachments(txt);
                  // Images were sent as ImageContent blocks; show them again, from the
                  // transcript's own copy, so a reloaded window looks like the live one.
                  // An older image comes back with `data` emptied by the bridge (bytes
                  // are not re-sent forever). It still belongs in the transcript, as a
                  // chip - dropping it would rewrite what the technician actually sent.
                  const imgs = blocks
                    .filter((c) => c.type === "image")
                    .map((c, n) => ({
                      name: c.data ? `image-${n + 1}` : `image-${n + 1} (not kept for display)`,
                      size: Math.round((String(c.data || "").length * 3) / 4),
                      mime: c.mimeType || "image/png",
                      preview: c.data ? `data:${c.mimeType || "image/png"};base64,${c.data}` : "",
                    }));
                  const files = [...imgs, ...split.files];
                  if (split.text || files.length) {
                    messages.value.push({ role: "user", text: split.text, files });
                  }
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
                } else if (hm.role === "system") {
                  // e.g. the "earlier turns were summarised" divider the bridge inserts
                  // at a compaction point, so a resumed chat explains its own gap.
                  const txt = typeof hm.content === "string"
                    ? hm.content
                    : (hm.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
                  if (txt) messages.value.push({ role: "system", text: txt, cost: txt.startsWith("\u{1F4B2} This run:") || txt.startsWith("\u{1F4B2} Summary cost:") });
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
              // The window picked the conversation up by itself (refresh, reconnect,
              // model switch). Say so once: unannounced history is as unsettling as
              // history that vanished, and it names the way out.
              if (m.resumed === "auto" && messages.value.length) {
                notes.push({
                  role: "system",
                  text:
                    "Continuing the last conversation about this machine \u2014 the assistant still " +
                    "has this context. Menu \u203a New chat starts a fresh one.",
                });
              }
              if (notes.length) messages.value.push(...notes);
              scrollToBottom();
            } else if (m.type === "agent_event") {
              handleAgentEvent(m.event);
            } else if (m.type === "approval_request") {
              approvalQueue.value = [...approvalQueue.value, { id: m.id, summary: m.summary }];
              markActivity();
              // Low bong — distinct from the bright "finished" ding — so techs notice
              // a pending Approve without staring at the orange banner.
              announceApprovalNeeded({
                summary: m.summary,
                kind: isDecision ? "decision" : "chat",
                hostname: hostname.value,
                key: `${curSessionId || "session"}:approval:${m.id}`,
              });
            } else if (m.type === "autoapprove_state") {
              autoApprove.value = m.value;
            } else if (m.type === "label_state") {
              sessionLabel.value = String(m.value || "");
              lastSentLabel = sessionLabel.value;
              applyWindowTitle();
            } else if (m.type === "auto_summarize_state") {
              applySummarizeState(m.enabled, m.tokens, m.inherited, m.inherited_tokens);
            } else if (m.type === "autototp_state") {
              autoTotp.value = !!m.value;
            } else if (m.type === "autocredential_state") {
              // The server is authoritative: if the role does not carry the permission it
              // comes back false, and the switch snaps back rather than lying to the tech.
              // The transcript line comes from the bridge as a `system_note` (one place,
              // so the phone reads the same sentence) - don't write a second one here.
              autoCredential.value = !!m.value;
            } else if (m.type === "remote_state") {
              // The server decides. If it says not allowed, the button goes back to off
              // and the technician is told why, rather than being left with a control
              // that looks armed.
              remoteBusy.value = false;
              remoteAllowed.value = m.allowed !== undefined ? !!m.allowed : remoteAllowed.value;
              remoteEnabled.value = !!m.enabled;
              remoteState.value = m.state || (m.enabled ? "waiting" : "off");
              const wasPaired = remoteDevice.value;
              remoteDevice.value = m.device || "";
              remoteDevices.value = m.devices || [];
              if (m.error) {
                remoteDialog.value = false;
                notifyError(m.error);
              }
              if (!m.enabled) {
                remotePairingUri.value = "";
                remoteDialog.value = false;
              }
              if (remoteState.value === "paired" && remoteDevice.value !== wasPaired) {
                // Pairing succeeded - close the QR and put it in the transcript, because
                // "who else can drive this session" belongs in the record.
                remoteDialog.value = false;
                remotePairingUri.value = "";
                messages.value.push({
                  role: "system",
                  text: `\u{1F4F1} ${remoteDevice.value} paired \u2014 this conversation is now live on that phone. It closes when you close this window.`,
                });
                scrollToBottom();
              }
            } else if (m.type === "remote_pairing") {
              remoteBusy.value = false;
              remotePairingUri.value = m.uri || "";
              remoteDialog.value = true;
            } else if (m.type === "remote_user_message") {
              // Typed on the phone. It has to appear here too, or two people end up
              // giving the same machine contradictory instructions.
              messages.value.push({
                role: "user",
                text: m.text,
                via: m.device || "phone",
              });
              scrollToBottom();
            } else if (m.type === "approval_resolved") {
              // Answered from the phone - drop it from the on-screen queue so the banner
              // does not sit there asking for a decision that has already been made.
              approvalQueue.value = approvalQueue.value.filter((a) => a.id !== m.id);
              messages.value.push({
                role: "system",
                text: `\u{1F4F1} ${m.approved ? "Approved" : "Denied"} from the paired phone.`,
              });
              scrollToBottom();
            } else if (m.type === "run_cost") {
              // The bridge sends this once the run is over, so it lands under the final
              // answer. Only sent to roles that may see cost.
              if (m.text) {
                messages.value.push({ role: "system", text: m.text, cost: true });
                scrollToBottom();
              }
            } else if (m.type === "compacted") {
              // Put the result in the transcript: it is a real, billable event and the
              // technician should be able to see later why the context suddenly shrank.
              compacting.value = false;
              // "Summarize & clear": the bridge kept the summary and marked the durable
              // cut; wipe the window so the technician gets the clean screen they asked for.
              if (m.cleared) messages.value = [];
              messages.value.push({ role: "system", text: `\u{1F5DC} ${m.message}` });
              // Show the summary itself - after a clear it is the only bearings left on
              // screen, and after a plain compact it tells you what the AI now works from.
              if (m.summary) {
                messages.value.push({
                  role: "assistant",
                  text: `\u{1F4CB} Where we are (summary):\n\n${m.summary}`,
                });
              }
              // What producing the summary cost - same visibility rule as the run cost.
              if (costVisible.value && m.summary_cost != null && Number.isFinite(Number(m.summary_cost))) {
                const c = Number(m.summary_cost);
                const tin = Number(m.summary_tokens_in || 0);
                const tout = Number(m.summary_tokens_out || 0);
                messages.value.push({
                  role: "system",
                  cost: true,
                  text: `\u{1F4B2} Summary cost: $${c < 0.01 ? c.toFixed(4) : c.toFixed(2)}`
                    + (m.summarizer ? ` \u00b7 ${m.summarizer}` : "")
                    + (tin || tout ? ` \u00b7 ${tin.toLocaleString("en-US")} tokens in / ${tout.toLocaleString("en-US")} out` : ""),
                });
              }
              scrollToBottom();
            } else if (m.type === "working" && m.note) {
              if (/compact/i.test(m.note)) {
                compactInfo.value = {
                  auto: !!m.compact_auto,
                  tokens: Number(m.compact_tokens || 0),
                  clear: !!m.compact_clear,
                };
              }
              compacting.value = /compact/i.test(m.note);
            } else if (m.type === "readonly_state") {
              readOnly.value = m.value;
            } else if (m.type === "allow_email_state") {
              // Same as above: the bridge narrates it once, for both surfaces.
              allowEmail.value = m.value;
            } else if (m.type === "run_state") {
              // The bridge's word on whether the technician's turn is still in progress.
              serverRunning = !!m.streaming;
              if (m.streaming && !streaming.value) streamStartAt.value = Date.now();
              streaming.value = !!m.streaming;
            } else if (m.type === "system_note") {
              // A window command answered - possibly typed on the paired phone. It goes
              // in the transcript because "who turned Write mode on" belongs on record.
              // Notes also arrive MID-TURN now (judge, authorizer, auto-continue): only a
              // note outside a running turn may clear the spinner.
              if (!serverRunning) streaming.value = false;
              messages.value.push({ role: "system", text: m.text });
              scrollToBottom();
            } else if (m.type === "queue_history") {
              queueHistory.value = Array.isArray(m.history) ? m.history : [];
              queueHistoryCount.value = Number(m.count || queueHistory.value.length);
              queueHistoryLoading.value = false;
            } else if (m.type === "user_message") {
              // The driver's question, as seen by a viewer (the driver's own window already
              // has it). Shown with who asked, so two people never think they both asked.
              // Same as queue_started: never render an inlined file body in the bubble.
              const vsplit = splitAttachments(m.text);
              messages.value.push({
                role: "user",
                text: vsplit.text + (m.attachments ? ` \u{1F4CE} (${m.attachments} attachment${m.attachments > 1 ? "s" : ""})` : ""),
                files: vsplit.files,
                via: m.by,
              });
              if (!m.steer) { streaming.value = true; streamStartAt.value = Date.now(); }
              scrollToBottom();
            } else if (m.type === "ticket_stage") {
              ticketStage.value = m.stage || "";
            } else if (m.type === "pin_state") {
              pinned.value = !!m.pinned; pinnedBy.value = m.by || "";
            } else if (m.type === "presence") {
              // SEAT HANDED TO ME? Say so - the input box silently turning editable is not
              // enough to notice when you were reading.
              const wasViewer = !presence.value || !presence.value.you || presence.value.you.role !== "owner";
              const before = presence.value && presence.value.owner ? presence.value.owner : null;
              presence.value = m;
              if (wasViewer && m.you && m.you.role === "owner" && before && before.username !== m.you.username) {
                messages.value.push({ role: "system", text: `\u{1F3AE} ${before.display} handed you control of this session.` });
                scrollToBottom();
              }
            } else if (m.type === "grant_result") {
              grantPending.value = "";
              if (!m.ok) {
                messages.value.push({ role: "system", text: `\u{1F512} ${m.reason || "Could not change access"}` });
                scrollToBottom();
              } else if (m.promoted) {
                messages.value.push({ role: "system", text: `\u{1F3AE} ${m.display || m.username} is driving this session now - you still see everything.` });
                scrollToBottom();
              } else {
                messages.value.push({ role: "system", text: `\u{1F3AE} The seat is reserved for ${m.display || m.username}: they drive the moment they connect.` });
                scrollToBottom();
              }
            } else if (m.type === "approval_refused") {
              messages.value.push({ role: "system", text: `\u{1F512} ${m.message}` });
              // Do not leave a dead prompt on screen for someone who cannot answer it.
              scrollToBottom();
            } else if (m.type === "readonly_refused") {
              messages.value.push({ role: "system", text: `\u{1F512} ${m.message}` });
              scrollToBottom();
            } else if (m.type === "takeover_request") {
              takeoverAsk.value = { from: m.from, timeout_s: m.timeout_s };
            } else if (m.type === "takeover_result") {
              takeoverPending.value = false;
              if (m.result !== "granted") {
                messages.value.push({ role: "system", text: `\u{1F3AE} Take over ${m.result}${m.reason ? ": " + m.reason : ""}` });
                scrollToBottom();
              }
            } else if (m.type === "attachments_rejected") {
              // Never silent: an attachment the model did not receive must be visible in
              // the transcript, next to the message it was supposed to belong to.
              messages.value.push({
                role: "system",
                text: `\u{1F4CE} ${m.message || "Some attachments were not sent to the AI."}`,
              });
              scrollToBottom();
            } else if (m.type === "attachments_accepted") {
              // Nothing to draw (the bubble already shows the chips) - kept as an
              // explicit no-op so an unknown-frame warning is never logged for it.
            } else if (m.type === "model_changed") {
              selectedModel.value = m.model_id;
              if (m.images_supported !== undefined) imagesSupported.value = !!m.images_supported;
              if (!imagesSupported.value && pendingFiles.value.some((f) => (f.mime || "").startsWith("image/"))) {
                pendingFiles.value = pendingFiles.value.filter((f) => !(f.mime || "").startsWith("image/"));
                messages.value.push({
                  role: "system",
                  text: `\u{1F4CE} Attached images were removed \u2014 ${m.display} cannot read images.`,
                });
              }
              if (selectedGroup.value == null) {
                selectedTarget.value = targetValue(null, m.model_id);
                saveTarget(null, m.model_id);
              }
              messages.value.push({
                role: "system",
                text: `Switched model to ${m.display}`,
              });
              scrollToBottom();
            } else if (m.type === "group_changed") {
              selectedGroup.value = m.group_id ?? null;
              if (m.model_id) selectedModel.value = m.model_id;
              selectedTarget.value = targetValue(m.group_id ?? null, m.group_id ? null : m.model_id);
              saveTarget(m.group_id ?? null, m.group_id ? null : m.model_id);
              if (m.group_id) {
                messages.value.push({
                  role: "system",
                  text: `Switched to agent group ${m.display || m.name}. Orchestrator is ${m.model_display || m.model_id}.`,
                });
                scrollToBottom();
              }
            } else if (m.type === "queued_instead") {
              // The bridge queued a message this window sent as a live prompt, because the
              // assistant was still busy (its own busy flag covered a window ours did not).
              // Re-label the bubble we added optimistically, so the transcript does not
              // claim it reached the model when it is waiting its turn on the queue.
              // Remove it rather than re-label it: queue_started draws it again when it
              // runs, in the right place in the conversation.
              const qt = String(m.text || "");
              for (let i = messages.value.length - 1; i >= 0; i--) {
                const mm = messages.value[i];
                if (mm.role === "user" && !mm.queued && (!qt || mm.text === qt)) {
                  messages.value.splice(i, 1);
                  break;
                }
              }
              scrollToBottom();
            } else if (m.type === "queue_state") {
              queueItems.value = Array.isArray(m.items) ? m.items : [];
              // The run in flight when no QUEUE item owns it (a prompt typed in the chat).
              queueWorkingOn.value = m.working_on || null;
              queueAuto.value = !!m.auto_next;
              queueAutoClear.value = !!m.auto_clear_done;
              queueRunningId.value = m.running_id || null;
              queuePending.value = Number(m.pending || 0);
              queuePaused.value = m.paused || null;
              const prevQ = queueQuestions.value.map((q) => q.id);
              queueQuestions.value = Array.isArray(m.questions) ? m.questions : [];
              // The list itself is no longer pushed with every state frame (it now holds
              // every prompt of the conversation, which would be hundreds of KB on the
              // socket per queue change). We keep the count and fetch the list when the
              // operator opens it - so what they read is always current.
              queueHistoryCount.value = Number(
                m.history_count != null ? m.history_count : (m.history || []).length,
              );
              if (Array.isArray(m.history)) queueHistory.value = m.history;
              const newQuestion = queueQuestions.value.some((q) => !prevQ.includes(q.id));
              if (newQuestion) { queueOpen.value = true; queueUserClosed = false; }
              if (queueFirstState) {
                queueFirstState = false;
                if (queueItems.value.length || queueQuestions.value.length) queueOpen.value = true;
              } else if (!queueUserClosed && (queueItems.value.length || queueQuestions.value.length) && !queueOpen.value) {
                queueOpen.value = true;
              }
              // A NEW pause goes on the record in the transcript (once), so "why did it
              // stop" is answered where the tech is looking - and so the alert fires.
              if (m.paused && m.paused.at !== queueLastPausedAt) {
                queueLastPausedAt = m.paused.at;
                messages.value.push({
                  role: "system",
                  text: m.paused.by === "assistant"
                    ? `\u23F8 Queue paused \u2014 the assistant needs your answer: ${m.paused.reason}`
                    : `\u23F8 Queue paused \u2014 ${m.paused.reason}`,
                });
                scrollToBottom();
                if (m.paused.by === "assistant") { queueOpen.value = true; queueUserClosed = false; }
              }
              if (!m.paused) queueLastPausedAt = null;
            } else if (m.type === "queue_started") {
              // A queued prompt is going to the model now: show it as the user's own
              // bubble (it is their words), tagged so the transcript is honest.
              //
              // The text arrives with any attached FILE BODIES inlined between
              // [[pi-attachment:...]] markers - that is what the model reads. Rendering it
              // raw dumped a whole file into the bubble (a saved HTML error page came out
              // as a wall of base64 on TICKET/61431). Pull the bodies back out into chips,
              // exactly as the transcript re-hydration does: same words, file shown as a
              // chip, and the model's copy untouched.
              const qsplit = splitAttachments(m.text);
              messages.value.push({ role: "user", text: qsplit.text, files: qsplit.files,
                queued: true, queuedReply: !!m.reply });
              currentIdx = -1;
              streaming.value = true;
              streamStartAt.value = Date.now();
              markActivity();
              scrollToBottom();
            } else if (m.type === "perms") {
              // An admin granted (or revoked) a capability for this window while it is open.
              if (m.mutate_allowed !== undefined) mutateAllowed.value = !!m.mutate_allowed;
              if (m.autoapprove_allowed !== undefined) autoapproveAllowed.value = !!m.autoapprove_allowed;
              if (m.autocredential_allowed !== undefined) autocredentialAllowed.value = !!m.autocredential_allowed;
              if (m.autototp_allowed !== undefined) autototpAllowed.value = !!m.autototp_allowed;
              grantedCaps.value = Array.isArray(m.caps_granted) ? m.caps_granted : [];
              const names = grantedCaps.value.join(", ");
              messages.value.push({
                role: "system",
                text: names
                  ? `\u{1F511} An admin enabled ${names} for this session.`
                  : "\u{1F511} The extra permissions for this session were withdrawn.",
              });
              scrollToBottom();
            } else if (m.type === "cost_update") {
              // Running spend for this conversation (server is the only source of
              // truth; we never compute cost in the browser).
              sessionCost.value = Number(m.session_cost || 0);
              lastTurnCost.value = Number(m.turn_cost || 0);
              costTurns.value = Number(m.turns || 0);
              contextTokens.value = Number(m.context_tokens || 0);
              if (m.context_window) contextWindow.value = Number(m.context_window);
              if (m.tokens) costTokens.value = m.tokens;
              costSpend.value = m.spend || null;
              costPerTurn.value = Number(m.cost_per_turn || 0);
              costByModel.value = Array.isArray(m.by_model) ? m.by_model : [];
              costByRole.value = Array.isArray(m.by_role) ? m.by_role : [];
              costDesktop.value = m.desktop && Number(m.desktop.calls || 0) ? m.desktop : null;
              modelSwitches.value = Number(m.model_switches || 0);
              switchSpend.value = Number(m.switch_spend || 0);
              pricingKnown.value = m.pricing_known !== false;
              windowCost.value =
                m.window_cost === null || m.window_cost === undefined
                  ? null
                  : Number(m.window_cost);
              windowTurns.value = Number(m.window_turns || 0);
              if (m.window_scope) windowScope.value = String(m.window_scope);
            } else if (m.type === "cost_warning") {
              // An expensive turn / filling context: show it in the transcript so it
              // is on the record, not just a toast that disappears.
              messages.value.push({ role: "system", text: `\u26a0 ${m.message}` });
              scrollToBottom();
            } else if (m.type === "error") {
              notifyError(m.message);
              messages.value.push({ role: "system", text: `\u26a0 ${m.message}` });
              scrollToBottom();
              // An error mid-turn (a recovered provider hiccup, an unreadable image) does not
              // end the turn; the bridge's run_state does.
              if (!serverRunning) streaming.value = false;
              // A refused or failed compaction arrives as an error; clear the button too,
              // or it spins until the backstop timeout for something already finished.
              compacting.value = false;
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

    // A phone returning from the background usually has a dead socket and no close event
    // yet. Reconnect the moment the page is visible again, onto the same live session.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || unmounted) return;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) reconnect();
    };
    document.addEventListener("visibilitychange", onVisible);
    onBeforeUnmount(() => document.removeEventListener("visibilitychange", onVisible));

    function reconnect() {
      connectionLost.value = false;
      reconnectAttempts = 0;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      connect({
        resume: curSessionId,
        model_id: selectedModel.value,
        group_id: selectedGroup.value,
      });
    }

    // Compacting is a session instruction, not a question for the model, so it goes as
    // its own frame. The bridge also accepts "/compact" typed into the box, which is what
    // works in a window that has not been reloaded since this shipped.
    // Stop the running summary; the bridge answers with an `error` frame that clears the overlay.
    function cancelCompact() {
      if (!ws || !connected.value || !compacting.value) return;
      compactCancelling.value = true;
      ws.send(JSON.stringify({ type: "compact_cancel" }));
    }

    function compactWindow() {
      if (!ws || !connected.value || streaming.value || compacting.value) return;
      compactInfo.value = { auto: false, tokens: contextTokens.value, clear: false };
      compacting.value = true;
      ws.send(JSON.stringify({ type: "compact" }));
      // The bridge answers with `compacted` or an `error`; both clear the flag. The watch
      // on `compacting` holds a backstop so a dropped frame cannot lock the window.
    }

    // Summarize & clear history: same compaction, plus the bridge marks a durable cut so
    // this window (and any reload of it) starts clean. Confirmed via dialog first - it
    // is not destructive on disk, but an unexpected blank screen looks destructive.
    const clearConfirm = ref(false);
    const clearNote = ref("");
    function summarizeClear() {
      if (!ws || !connected.value || streaming.value || compacting.value) return;
      compactInfo.value = { auto: false, tokens: contextTokens.value, clear: true };
      compacting.value = true;
      const note = String(clearNote.value || "").trim();
      clearNote.value = "";
      // /compact <note> is the same path as typing it: the bridge treats the rest of
      // the line as steer for the summary ("done with X, moving to Y").
      ws.send(JSON.stringify({
        type: "compact",
        clear: true,
        message: note ? `/compact ${note}` : "",
        instructions: note || undefined,
      }));
    }

    function send() {
      const text = input.value.trim();
      // A window command ("/write on") is answered by the bridge and never reaches the
      // model, so attachments cannot ride with it. Keep them staged - silently dropping
      // the file the tech just picked is worse than making them press Send twice.
      if (pendingFiles.value.length && looksLikeCommand(text)) {
        attachNote(
          `\u{1F4CE} ${pendingFiles.value.length} file(s) stay attached \u2014 a / command is handled by this window, ` +
            "so nothing is sent to the AI with it. Run the command, then send your message.",
        );
      }
      const files = pendingFiles.value.length && looksLikeCommand(text) ? [] : pendingFiles.value;
      // An attachment on its own is a legitimate message ("look at this"), so the send
      // gate is text OR files - but the model is told which is which.
      if ((!text && !files.length) || !connected.value) return;
      // Summarizing rewrites what the AI works from; nothing goes in until it is done.
      if (compacting.value) return;
      // Prime Web Audio while this click/keypress still counts as a user gesture.
      // Managed Chromium browsers otherwise may block the later completion ding.
      primeCompletionAudio();
      // TYPED WHILE IT IS WORKING = A STEER (owner, 2026-09-30). The message goes into the
      // turn that is running, and the assistant takes it into account at its next step -
      // a correction or extra instruction, not a separate job. (Typed while idle it is a
      // new prompt, below.) If the bridge finds the assistant between runs, where a steer
      // cannot land, it queues the message as "next" and says so (queued_instead).
      // A / window command is answered by the bridge instantly, so it is never a steer.
      if (streaming.value && !looksLikeCommand(text)) {
        const outgoingS = text || "(see attached file)";
        messages.value.push({
          role: "user",
          text: outgoingS,
          files: files.map((f) => ({ name: f.name, size: f.size, mime: f.mime, preview: f.preview })),
          steered: true,
        });
        currentIdx = -1;
        markActivity();
        ws.send(JSON.stringify({
          type: "steer",
          message: outgoingS,
          attachments: files.length
            ? files.map((f) => ({ name: f.name, mime: f.mime, data: f.data }))
            : undefined,
        }));
        if (files.length) clearFiles();
        input.value = "";
        scrollToBottom(true);
        return;
      }
      // The bridge needs a sentence to answer; "here, look at this" is what the tech
      // meant by attaching a file with no words, and the bubble must say the same thing
      // the model was sent - a reload reads it back from the transcript.
      const outgoing = text || "(see attached file)";
      messages.value.push({
        role: "user",
        text: outgoing,
        files: files.map((f) => ({ name: f.name, size: f.size, mime: f.mime, preview: f.preview })),
      });
      currentIdx = -1;
      // A window command ("/write on") is answered by the bridge in a millisecond and
      // never reaches the model, so raising the streaming spinner for it would leave a
      // "working" state with nothing working.
      if (!looksLikeCommand(text)) {
        streaming.value = true;
        streamStartAt.value = Date.now();
      }
      markActivity();
      ws.send(
        JSON.stringify({
          type: "prompt",
          message: outgoing,
          attachments: files.length
            ? files.map((f) => ({ name: f.name, mime: f.mime, data: f.data }))
            : undefined,
        }),
      );
      if (files.length) clearFiles();
      input.value = "";
      // Sending is a deliberate act: it always takes you back to the live bottom, even if
      // you were reading further up.
      scrollToBottom(true);
    }

    // Queue actions - each is a request to the bridge; the reply is a queue_state frame.
    function queueSend(frame) {
      if (!ws || !connected.value) return;
      ws.send(JSON.stringify(frame));
    }
    // FILES FOR THE NEXT QUEUED PROMPT. Kept separate from the composer's own pending
    // list so attaching a screenshot to a queued item cannot hijack what you are typing
    // now (and vice versa). Everything else - caps, image downscaling, refusal notes - is
    // the shared addFiles pipeline, so the two behave identically.
    const queueFiles = ref([]);
    const queueFileInput = ref(null);
    function pickQueueFiles() { if (queueFileInput.value) queueFileInput.value.click(); }
    function removeQueueFile(id) { queueFiles.value = queueFiles.value.filter((f) => f.id !== id); }
    async function onQueueFilePicked(ev) {
      const before = pendingFiles.value;
      pendingFiles.value = [...queueFiles.value];       // reuse the shared rules...
      await addFiles(ev.target.files);
      queueFiles.value = pendingFiles.value;            // ...then take the result back
      pendingFiles.value = before;
      ev.target.value = "";
    }
    function queueAdd() {
      const text = queueNew.value.trim();
      const files = queueFiles.value;
      if (!text && !files.length) return;
      queueSend({
        type: "queue_add",
        text,
        compact_first: queueNewCompact.value,
        attachments: files.map((f) => ({ name: f.name, mime: f.mime, data: f.data })),
      });
      queueNew.value = "";
      queueNewCompact.value = false;
      queueFiles.value = [];
    }
    function queueSetAuto(v) { queueSend({ type: "queue_set_auto", value: !!v }); }
    function queueSetAutoClear(v) { queueSend({ type: "queue_set_auto_clear", value: !!v }); }
    function queuePause() { queueSend({ type: "queue_pause" }); }
    // The item Resume would run next - the one an operator wants to edit first.
    const queueHeadPending = computed(() => queueItems.value.find((i) => i.status === "pending") || null);
    /**
     * THE PROMPT BEING WORKED ON RIGHT NOW (owner, 2026-09-27). `running_id` is a separate value
     * from the items, and the status strip below is an if/else-if chain: "Paused" (the assistant
     * asked a question) used to REPLACE "Running a queued prompt", so the technician could no
     * longer see that a prompt was still in flight - or which one. The id is authoritative; the
     * status is the fallback for a frame that arrived without it.
     */
    const queueRunningItem = computed(() =>
      queueItems.value.find((i) => i.id === queueRunningId.value)
      || queueItems.value.find((i) => i.status === "running")
      || null,
    );
    function queueResume() { queueSend({ type: "queue_resume" }); }
    function queueRunNext() { queueSend({ type: "queue_run_next" }); }
    function queueClearDone() { queueSend({ type: "queue_clear_done" }); }
    function queueClearAll() {
      $q.dialog({
        dark: true,
        title: "Clear the queue?",
        message: "Every queued prompt for this conversation is removed. The chat itself is untouched.",
        cancel: true,
        ok: { label: "Clear", color: "negative", flat: true },
      }).onOk(() => queueSend({ type: "queue_clear" }));
    }
    function queueRemove(it) { queueSend({ type: "queue_remove", id: it.id }); }
    function queueAnswer(q) {
      const text = String(queueAnswerText.value[q.id] || "").trim();
      if (!text || streaming.value) return;
      queueSend({ type: "queue_answer", id: q.id, text });
      queueAnswerText.value[q.id] = "";
    }
    function queueDismissQuestion(q) { queueSend({ type: "queue_dismiss_question", id: q.id }); }
    function queueItemText(id) {
      const it = queueItems.value.find((i) => i.id === id);
      return it ? (it.text.length > 90 ? it.text.slice(0, 90) + "…" : it.text) : "";
    }
    function queueToggleThread(it) { queueThreadOpen.value[it.id] = !queueThreadOpen.value[it.id]; }
    function queueClose() { queueUserClosed = true; queueOpen.value = false; }
    function queueClearHistory() {
      $q.dialog({
        dark: true,
        title: "Clear the queue history?",
        message: "The record of what this queue did is deleted. The chat transcript is untouched.",
        cancel: true,
        ok: { label: "Clear", color: "negative", flat: true },
      }).onOk(() => queueSend({ type: "queue_clear_history" }));
    }
    // Written by queue.js backfillPrompts(). Matched exactly so only THAT note collapses
    // to an icon; every other detail (an answer, a failure reason) still reads in full.
    const RECOVERED_NOTE = "recovered from the transcript";
    // The labels say WHAT happened; the row's own "who" column says who did it, so they
    // are deliberately person-neutral ("Asked", not "You asked" - in a shared session most
    // rows are not yours). The fourth field marks rows a PERSON is responsible for: those
    // are the ones whose attribution must be shown, or shown as unknown.
    const QUEUE_HIST = {
      // Prompts. These are the bulk of the history now: what the model was actually asked.
      prompt:           ["Asked",              "chat",            "indigo-3", true],
      prompt_phone:     ["Asked from phone",   "smartphone",      "indigo-3", true],
      steer:            ["Steered",            "alt_route",       "amber-4",  true],
      added:            ["Added",              "add",             "grey-4",   true],
      edited:           ["Edited",             "edit",            "grey-4",   true],
      requeued:         ["Queued again",       "replay",          "grey-4",   true],
      skipped:          ["Skipped",            "remove_done",     "grey-5",   true],
      removed:          ["Removed",            "delete",          "grey-5",   true],
      started:          ["Sent to the AI",     "play_arrow",      "blue-3",   true],
      done:             ["Done",               "check_circle",    "green-4"],
      failed:           ["Failed",             "error",           "red-4"],
      stopped:          ["Stopped",            "stop_circle",     "red-4",    true],
      // The bridge's own rows: the session stopped under a running item, a turn was
      // carried over. Attributed to the item's owner when it has one, never to a person
      // as an action they took.
      interrupted:      ["Interrupted",        "warning",         "orange-4"],
      auto_cleared:     ["Auto-cleared",       "done_all",        "grey-5"],
      asked:            ["AI asked",           "help",            "orange-4"],
      answered:         ["Answered",           "reply",           "orange-3", true],
      answered_in_chat: ["Answered in chat",   "reply",           "orange-3", true],
      answer_sent:      ["Answer sent to the AI", "send",         "blue-3",   true],
      dismissed:        ["Question dismissed", "close",           "grey-5",   true],
      paused:           ["Paused",             "pause_circle",    "orange-4"],
      resumed:          ["Resumed",            "play_circle",     "green-4"],
      auto_next:        ["Auto-Next",          "bolt",            "grey-4",   true],
      auto_clear:       ["Auto-clear",         "done_all",        "grey-4",   true],
      cleared_finished: ["Cleared finished",   "done_all",        "grey-5",   true],
      cleared_all:      ["Cleared everything", "delete_sweep",    "red-4",    true],
      cleared_history:  ["Cleared the history", "delete_sweep",   "red-4",    true],
    };
    // Accepts the entry (or a bare event name, for older call sites).
    function queueHistLabel(e) {
      const ev = typeof e === "string" ? e : e?.event;
      return (QUEUE_HIST[ev] || [ev])[0];
    }
    function queueHistIcon(ev) { return (QUEUE_HIST[ev] || [, "circle"])[1] || "circle"; }
    function queueHistColor(ev) { return (QUEUE_HIST[ev] || [, , "grey-4"])[2] || "grey-4"; }
    /** Is a PERSON answerable for this row (as opposed to the AI or the bridge)? */
    function queueHistIsHuman(ev) { return !!(QUEUE_HIST[ev] || [])[3]; }
    /** My own login, from presence - so my rows read "You" instead of my own name. */
    const myUsername = computed(() =>
      String(presence.value?.you?.username || "").toLowerCase(),
    );
    function queueHistWhoMine(e) {
      const u = String(e?.user || "").toLowerCase();
      return !!u && !!myUsername.value && u === myUsername.value;
    }
    /** The name to show for a row: "You" for mine, their display name for everyone
     *  else, "" when the row is not a person's (or predates named history). */
    function queueHistWho(e) {
      if (queueHistWhoMine(e)) return "You";
      return String(e?.by || e?.user || "");
    }
    /** Same, for an answer in a queued item's thread (which carries only a name). */
    function queueThreadWho(t) {
      const name = String(t?.by || "");
      if (!name) return "You";   // older threads, and your own single-person conversations
      return name;
    }
    // WHO FILTER. Built from the history itself (keyed on the login, which is stable even
    // when two people share a display name), newest-activity order aside - alphabetical
    // reads better in a list you are scanning for a name. "Everyone" is always first.
    const queueHistPeople = computed(() => {
      const seen = new Map();   // key -> { label, count }
      for (const e of queueHistory.value) {
        if (!queueHistIsHuman(e.event)) continue;
        const key = String(e.user || e.by || "").toLowerCase();
        const label = queueHistWhoMine(e) ? "You" : (e.by || e.user || "unknown");
        const k = key || "\u0000unknown";
        const cur = seen.get(k) || { label, count: 0 };
        cur.count += 1;
        seen.set(k, cur);
      }
      const people = [...seen.entries()]
        .sort((a, b) => a[1].label.localeCompare(b[1].label))
        .map(([value, v]) => ({ value, label: `${v.label} (${v.count})` }));
      return [{ value: "", label: `Everyone (${queueHistory.value.length})` }, ...people];
    });
    function queueHistWhen(at) {
      if (!at) return "";
      const d = new Date(at);
      const today = new Date().toDateString() === d.toDateString();
      return today
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    function queueSetStatus(it, status) { queueSend({ type: "queue_update", id: it.id, status }); }
    function queueToggleCompact(it) { queueSend({ type: "queue_update", id: it.id, compact_first: !it.compact_first }); }
    /** A prompt as a human should read it: the typed words, with any inlined file bodies
     *  taken back out. Display only - the model's copy keeps the files. */
    function promptWords(raw) {
      const t = String(raw || "");
      if (!t.includes("[[pi-attachment:")) return t;
      const split = splitAttachments(t);
      const names = split.files.map((f) => f.name).filter(Boolean);
      return split.text + (names.length ? `  \u{1F4CE} ${names.join(", ")}` : "");
    }
    // EDITING A QUEUED PROMPT THAT CARRIES FILES.
    //
    // item.text holds the typed words AND any inlined file bodies (that is what the model
    // reads). Editing that raw string means staring at 170 KB of someone's HTML; stripping
    // it for the editor and saving the result would DELETE the attachment. So the words are
    // edited and the inlined tail is held aside and put back on save - what you see is what
    // you wrote, and the evidence survives the edit.
    const queueEditTail = ref("");
    const ATTACH_TAIL_RE = /\n*The technician attached \d+ file\(s\)\.[\s\S]*$/;
    function queueStartEdit(it) {
      if (it.status === "running") return;
      queueEditId.value = it.id;
      const raw = String(it.text || "");
      const tail = raw.match(ATTACH_TAIL_RE);
      queueEditTail.value = tail ? tail[0] : "";
      queueEditText.value = tail ? raw.slice(0, tail.index) : raw;
    }
    function queueSaveEdit(it) {
      const words = queueEditText.value.trim();
      // Put the inlined file bodies back, so editing the words never drops the evidence.
      const text = words + (queueEditTail.value || "");
      if (words && text !== it.text) queueSend({ type: "queue_update", id: it.id, text });
      queueEditId.value = null;
      queueEditTail.value = "";
    }
    function queueMove(it, dir) {
      const ids = queueItems.value.map((i) => i.id);
      const i = ids.indexOf(it.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      queueSend({ type: "queue_reorder", ids });
    }
    function queueStatusIcon(it) {
      return {
        pending: "radio_button_unchecked",
        running: "play_circle",
        waiting: "help",
        done: "check_circle",
        failed: "error",
        skipped: "remove_done",
      }[it.status] || "help";
    }
    function queueStatusLabel(it) {
      const base = {
        pending: "Waiting its turn", running: "Running now", waiting: "Needs your answer",
        done: "Done", failed: "Failed", skipped: "Skipped",
      }[it.status] || it.status;
      return it.note ? `${base} - ${it.note}` : base;
    }
    function queueStatusColor(it) {
      return {
        pending: "grey-5", running: "green-4", waiting: "orange-5", done: "green-6", failed: "red-4", skipped: "grey-6",
      }[it.status] || "grey-5";
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

    function sendAutoTotp(val) {
      if (ws) ws.send(JSON.stringify({ type: "set_autototp", value: !!val }));
    }

    function sendAutoCredential(val) {
      if (ws) ws.send(JSON.stringify({ type: "set_autocredential", value: !!val }));
      saveAIAutoCredential(!!val).catch(() => {
        notifyError("Auto-credential is set for this window, but could not be saved as your default.");
      });
    }

    // Remote is a three-state button rather than a toggle, because "on" and "a phone is
    // actually attached" are different facts and conflating them is how someone walks
    // away believing they are reachable when nothing is listening.
    function toggleRemote() {
      if (!ws) return;
      if (remoteEnabled.value) {
        // Already on: show the code again rather than tearing it down. Turning it off is
        // a deliberate act inside the dialog, so a mis-click can't drop a live phone.
        remoteDialog.value = true;
        ws.send(JSON.stringify({ type: "remote_pair" }));
        return;
      }
      remoteBusy.value = true;
      remotePairingUri.value = "";
      remoteDialog.value = true;
      ws.send(JSON.stringify({ type: "set_remote", value: true }));
    }

    function disableRemote() {
      remoteDialog.value = false;
      remotePairingUri.value = "";
      if (ws) ws.send(JSON.stringify({ type: "set_remote", value: false }));
    }

    async function copyPairingUri() {
      try {
        await navigator.clipboard.writeText(remotePairingUri.value);
        notifySuccess("Pairing link copied");
      } catch {
        notifyError("Could not copy the pairing link");
      }
    }

    function sendAutoApprove(val) {
      if (ws) ws.send(JSON.stringify({ type: "set_autoapprove", value: val }));
      // Remember it for next time. Without this the toggle is per-socket, so a refresh or a
      // second window starts over - the "sometimes auto-approve does not work" bug.
      saveAIAutoApprove(!!val).catch(() => {
        notifyError("Auto-approve is on for this window, but could not be saved as your default.");
      });
    }

    function applyTarget(val) {
      if (!val || String(val).startsWith("_hdr_")) return;
      if (String(val).startsWith("group:")) {
        const id = Number(String(val).slice(6));
        selectedGroup.value = id;
        saveTarget(id, null);
        if (ws && connected.value) {
          ws.send(JSON.stringify({ type: "set_group", group_id: id }));
        } else {
          connect({ group_id: id });
        }
        return;
      }
      if (String(val).startsWith("model:")) {
        const mid = String(val).slice(6);
        selectedGroup.value = null;
        selectedModel.value = mid;
        saveTarget(null, mid);
        if (ws && connected.value) {
          // Drop the team first, then switch the single model. Two frames, one intent.
          ws.send(JSON.stringify({ type: "set_group", group_id: null }));
          ws.send(JSON.stringify({ type: "set_model", model_id: mid }));
        } else {
          connect({ model_id: mid, group_id: null });
        }
      }
    }

    function onTargetChange(val) {
      applyTarget(val);
    }

    function startNewChat() {
      if (selectedGroup.value != null) connect({ group_id: selectedGroup.value, fresh: true });
      else connect({ model_id: selectedModel.value, group_id: null, fresh: true });
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
      // ?new=1 (agent menu "Pi.dev", AI History "New chat", mobile inbox "New chat")
      // starts a fresh conversation instead of carrying on.
      const startFresh = route.query.new === "1";
      // ?new=1 beats a stale ?resume= in the same URL (the agent menu can hand us both
      // when it reuses an existing chat window): asking for a new chat must not quietly
      // reopen the old one. The real session id is written back by stampResumeInUrl as
      // soon as the bridge says `ready`.
      connect({
        resume: startFresh ? null : route.query.resume,
        model_id: route.query.model,
        fresh: startFresh,
      });
      // ...and drop the flag from the URL straight away: it means "start new NOW", not
      // "start new on every reload". Leaving it in would make a refresh (or a restored
      // window) abandon the conversation just started and open yet another empty one.
      if (startFresh) {
        const q = { ...route.query };
        delete q.new;
        delete q.resume;
        router.replace({ path: route.path, query: q }).catch(() => { /* navigation noop */ });
      }
      tickTimer = setInterval(() => {
        nowTick.value = Date.now();
      }, 1000);
      const vv = window.visualViewport;
      if (vv) {
        applyViewportHeight();
        vv.addEventListener("resize", onViewportChange);
        vv.addEventListener("scroll", onViewportChange);
      }
    });
    onBeforeUnmount(() => {
      unmounted = true;
      intentionalClose = true;
      const vv = window.visualViewport;
      if (vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
      if (vvRaf) cancelAnimationFrame(vvRaf);
      if (tickTimer) clearInterval(tickTimer);
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (ws) try { ws.close(); } catch (e) { /* noop */ }
    });

    return {
      root,
      agentId,
      isDecision,
      hostname,
      clientSite,
      costVisible,
      sessionCost,
      costDesktop,
      grantedCaps, canGrantCaps, decisionRef,
      capScopeKind, capScopeRef, capCatalog, capPicked, capExisting, capRoleAllowed,
      capPeopleOptions, capPeopleHint, capUsername, capMinutes, capDurations, capSaving,
      capMessage, grantCapabilities, withdrawCapabilities,
      approval, approvalBusy, approvalError, loadApproval, requestApprovalPlan, decideApproval,
      lastTurnCost,
      costTurns,
      contextTokens,
      compacting,
      compactCancelling,
      cancelCompact,
      compactInfo,
      compactElapsed,
      compactWindow,
      clearConfirm,
      clearNote,
      summarizeClear,
      contextWindow,
      costTokens,
      costSpend,
      costPerTurn,
      costByRole,
      costByModel,
      modelSwitches,
      switchSpend,
      pricingKnown,
      contextPct,
      costColor,
      windowCost,
      windowTurns,
      windowScope,
      // prompt queue
      queueOpen,
      queueOverlay,
      queueWidth,
      queueResizing,
      queueResizeStart,
      queueResizeReset,
      queueItems,
      queueAuto,
      queueAutoClear,
      queuePaused,
      queueRunningId,
      queuePending,
      queueNew,
      queueNewCompact,
      queueEditId,
      queueEditText,
      queueQuestions,
      queueAnswerText,
      queueTextOpen,
      queueTextToggle,
      queueAnswer,
      queueDismissQuestion,
      queueItemText,
      queueThreadOpen,
      queueToggleThread,
      queueClose,
      RECOVERED_NOTE,
      queueHistory,
      queueHistoryCount,
      queueHistoryLoading,
      openQueueHistory,
      queueHistoryOpen,
      queueHistoryView,
      queueClearHistory,
      queueHistLabel,
      queueHistIcon,
      queueHistColor,
      queueHistWhen,
      queueHistWho,
      queueThreadWho,
      queueHistWhoMine,
      queueHistIsHuman,
      queueHistFilter,
      queueHistPeople,
      queueAdd,
      queueSetAuto,
      queueSetAutoClear,
      queuePause,
      queueResume,
      queueHeadPending, queueRunningItem, queueWorkingOn,
      currentActivity, toolActivity,
      promptWords,
      queueFiles,
      queueFileInput,
      pickQueueFiles,
      removeQueueFile,
      onQueueFilePicked,
      queueRunNext,
      queueClearDone,
      queueClearAll,
      queueRemove,
      queueSetStatus,
      queueToggleCompact,
      queueStartEdit,
      queueSaveEdit,
      queueMove,
      queueStatusIcon,
      queueStatusLabel,
      queueStatusColor,
      fmtMoney,
      fmtTokens,
      connectionLost,
      stalled,
      workingText,
      reconnect,
      connected,
      streaming,
      soundEnabled,
      desktopEnabled,
      onlyWhenUnfocused,
      notificationSupported,
      notificationPermission,
      desktopStatus,
      primeCompletionAudio,
      setSoundAlert,
      setDesktopNotifications,
      testCompletionAlerts,
      messages,
      input,
      isPhone,
      backToInbox,
      ticketStage,
      stageColor,
      pinned,
      pinnedBy,
      setPin,
      presence,
      isDriver,
      seatTaken,
      canTakeOver,
      takeoverAsk,
      takeoverPending,
      accessDialog, roster, grantCount, myUsername, grantPending, whenAgo, giveControl, cancelGrant,
      requestTakeover,
      answerTakeover,
      // attachments
      attachEnabled,
      imagesSupported,
      attachMax,
      pendingFiles,
      pendingBytes,
      dragOver,
      fileInput,
      humanSize,
      fileIcon,
      pickFiles,
      onFilePicked,
      removeFile,
      clearFiles,
      onDragEnter,
      onDragLeave,
      onDrop,
      onPaste,
      previewOpen,
      previewFile,
      openPreview,
      targetOptions,
      selectedTarget,
      onTargetChange,
      autoApprove,
      autoapproveAllowed,
      readOnly,
      allowEmail,
      sendAllowEmail,
      autocredentialAllowed,
      autoCredential,
      autototpAllowed,
      autoTotp,
      sendAutoTotp,
      autoSummarize,
      autoSummarizeK,
      summarizeInherited,
      summarizeInheritedK,
      resetAutoSummarizeTokens,
      sendAutoSummarize,
      sendAutoSummarizeTokens,
      sendAutoCredential,
      remoteAllowed,
      remoteEnabled,
      remoteState,
      remoteDevice,
      remoteDevices,
      remoteBusy,
      remoteLabel,
      remoteDialog,
      remotePairingUri,
      remoteQr,
      toggleRemote,
      disableRemote,
      copyPairingUri,
      sessionLabel,
      sendLabel,
      mutateAllowed,
      setReadonly,
      pendingApproval,
      approvalQueue,
      respondApprovalAll,
      scrollArea,
      onTranscriptScroll,
      pinnedToBottom,
      heldLabel,
      jumpToLatest,
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
      startNewChat,
      // slash commands
      cmdMatches,
      cmdIndex,
      cmdDismissed,
      cmdState,
      applyCommand,
      onEnter,
      onCmdTab,
      onCmdArrow,
    };
  },
};
</script>

<style scoped>
/* PHONE (installed app or any screen under 720px). The toolbar carries eleven things; on a
   desktop they sit in one row, on a phone that row was clipped with no way to reach the
   rest. So: the bar WRAPS onto as many rows as it needs, every item stays readable at its
   normal size, the model picker stretches to the full width on its own row, and the whole
   bar can still be swiped sideways if a single item is wider than the screen. Nothing is
   hidden - the owner's rule is "resize so we can read everything", not "remove". */
@media (max-width: 720px) {
  .pi-toolbar {
    flex-wrap: wrap;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    row-gap: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .pi-toolbar .pi-title {
    flex: 1 1 60%;
    min-width: 0;
  }
  .pi-toolbar .q-space {
    display: none;
  }
  .pi-toolbar .pi-target-select {
    flex: 1 1 100%;
    width: 100%;
    max-width: 100%;
    order: 10;
  }
  .pi-toolbar .q-chip {
    height: 26px;
    font-size: 12px;
  }
  .pi-composer {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
  .pi-messages {
    padding-left: 10px;
    padding-right: 10px;
  }
}
.pi-run-cost {
  margin-top: -10px;
  padding-left: 4px;
  opacity: 0.9;
}
.pi-compact-overlay {
  position: fixed;
  inset: 0;
  z-index: 7000; /* above menus and dialogs: nothing may be clicked while it runs */
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  cursor: wait;
}
.pi-compact-card {
  background: #1d1d1d;
  border: 1px solid rgba(255, 193, 7, 0.45);
  border-radius: 12px;
  padding: 32px 28px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}
.pichat {
  height: 100vh; /* fallback: browsers without dvh */
  height: 100dvh; /* follows the mobile browser chrome as it slides away */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* the transcript scrolls; the shell itself never does */
}
/* Set by applyViewportHeight() once the visual viewport is measurable - it is
   the only measurement that follows the software keyboard. */
.pichat--measured {
  height: var(--pichat-h);
}
/* Notched phones: keep the send button clear of the home indicator. */
.pichat .pi-composer {
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}
@media (max-width: 600px) {
  /* iOS zooms the page in when a focused field is under 16px, and that zoom is
     itself what shoves the composer off the bottom of the screen. */
  .pi-composer :deep(textarea),
  .pi-composer :deep(input) {
    font-size: 16px;
  }
}
.pichat :deep(.q-toolbar) {
  flex-wrap: nowrap;
}
.pi-title {
  min-width: 0;
  flex: 1 1 160px;
  overflow: hidden;
}
.pi-label-input {
  flex: 0 1 200px;
}
.pi-target-select {
  flex: 0 0 200px;
  width: 200px;
  max-width: 200px;
}
.pi-target-select :deep(.q-field__native),
.pi-target-select :deep(.q-field__label),
.pi-target-select :deep(.q-field__control) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pi-body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: row;
  position: relative;
}
.pi-main {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pi-messages {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain; /* don't chain the scroll to the page behind */
  -webkit-overflow-scrolling: touch;
}
/* Prompt queue panel: a column to the right of the chat ... */
.pi-queue {
  flex: 0 0 400px;           /* width is set inline from queueWidth */
  min-width: 300px;
  max-width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  border-left: 1px solid #3a3a3a;
}
/* ... or, when the window is too narrow to share, floating over it. */
/* While a summary runs the rest of the window is behind the blocking overlay, but the
   queue stays usable (owner, 2026-09-26): prompts added now run when the summary is done -
   the bridge treats a running summary as busy. */
.pi-queue.pi-queue--live {
  z-index: 7001;
}
.pi-queue--overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.5);
}
/* The resize grip: a thin strip on the left edge, wider hit area than it looks. */
.pi-queue-grip {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  width: 9px;
  cursor: col-resize;
  z-index: 6;
  touch-action: none;
}
.pi-queue-grip::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 4px;
  width: 1px;
  background: #3a3a3a;
  transition: background 0.15s, width 0.15s;
}
.pi-queue-grip:hover::after,
.pi-queue--resizing .pi-queue-grip::after {
  background: #1976d2;
  width: 3px;
  left: 3px;
}
.pi-queue--resizing,
.pi-queue--resizing * {
  user-select: none;
}
.pi-queue-head {
  border-bottom: 1px solid #3a3a3a;
}
.pi-queue-switches :deep(.q-toggle) {
  margin-right: 12px;
}
.pi-queue-switches :deep(.q-toggle__label) {
  font-size: 13.5px;
}
.pi-queue-status {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 4px 2px;
}
.pi-queue-paused {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.45);
  border-radius: 6px;
}
.pi-queue-questions {
  background: rgba(255, 152, 0, 0.08);
  border: 1px solid rgba(255, 152, 0, 0.45);
  border-radius: 6px;
  padding: 8px;
}
/* THE PANEL IS A FIXED-HEIGHT COLUMN, so every part of it must know its own size.
   The questions/paused block used to be unbounded: a single 700-character question (the
   assistant's pause_queue text) - and two of them - grew tall enough to push the
   "Next prompt" box and the Run/Resume buttons off the bottom of the panel, which read as
   "I can't add anything to the queue any more". Cap it and let THIS region scroll; the
   prompt box below it then never moves. */
.pi-queue-questions,
.pi-queue-paused {
  max-height: 32vh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
/* Long text starts short and expands on click (see queueTextOpen in the script). */
.pi-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pi-clamp-lines, 5);
  overflow: hidden;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.pi-clamp--open {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}
/* One-line status strips: never wrap, ellipsize, and the tooltip carries the whole text. */
.pi-oneline {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-queue-question {
  background: #2a2420;
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 6px;
}
.pi-queue-history-list {
  overflow-y: auto;
  min-height: 0;
}
.pi-queue-hist-row {
  display: flex;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid #333;
  font-size: 13.5px;
  line-height: 1.4;
}
/* "Paused - N new below". Sticky at the bottom of the SCROLLER, so it floats over the
   newest text while you read further up and needs no extra wrapper (which would have
   changed the flex layout of the whole window). pointer-events on the button only, so the
   strip never eats a click meant for the transcript underneath. */
.pi-scroll-held {
  position: sticky;
  bottom: 4px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 3;
  margin-top: 4px;
}
.pi-scroll-held > * {
  pointer-events: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
  opacity: 0.94;
}
.pi-queue-hist-when {
  flex: 0 0 64px;
  font-size: 12px;
  padding-top: 2px;
}
/* WHO. A fixed column so the names line up and the list can be read down rather than
   hunted through; long names ellipsize (the tooltip carries the login in full). */
.pi-queue-hist-who {
  flex: 0 0 104px;
  font-size: 12px;
  font-weight: 600;
  padding-top: 2px;
  padding-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-queue-hist-who-filter {
  min-width: 150px;
  font-size: 13px;
}
.pi-queue-hist-event {
  font-weight: 600;
}
/* "You asked — what they asked". The gap and the dash are CSS/markup rather than a
   literal " - " in the template: Vue's compiler condenses whitespace at the start of an
   element, which is why the label ran straight into the prompt ("You askedwrite up..."). */
.pi-queue-hist-event,
.pi-queue-hist-sep {
  margin-right: 6px;
}
.pi-queue-hist-sep {
  margin-left: 0;
}
/* Everything under the header: scrolls as a whole when the window is too short for it. */
.pi-queue-body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
}
/* Nothing but the list may be squashed: a shrunk status box would hide its own text. */
.pi-queue-body > :not(.pi-queue-list) {
  flex-shrink: 0;
}
.pi-queue-working {
  background: rgba(76, 175, 80, 0.08);
  border: 1px solid rgba(76, 175, 80, 0.4);
  border-radius: 6px;
  flex: 0 0 auto;
  max-height: 40vh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
/* The list fills what is left and scrolls itself, but never collapses below a usable floor -
   below that the body above scrolls instead. */
.pi-queue-list {
  flex: 1 1 0;
  min-height: 200px;
  overflow-y: auto;
}
/* The live "what it is doing" line: one line, ellipsized, tooltip carries the whole thing. */
.pi-working {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-tool-detail {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60ch;
}
.pi-queue-thumb {
  width: 18px;
  height: 18px;
  object-fit: cover;
  border-radius: 2px;
}
.pi-queue-item {
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  background: #262626;
}
.pi-queue-item--running {
  border-color: #4caf50;
}
.pi-queue-item--failed {
  border-color: #e53935;
}
.pi-queue-item--waiting {
  border-color: #fb8c00;
  background: rgba(251, 140, 0, 0.08);
}
.pi-queue-thread {
  border-left: 2px solid #555;
  padding-left: 6px;
}
.pi-queue-turn {
  font-size: 13px;
  line-height: 1.35;
  margin-bottom: 4px;
}
.pi-queue-turn-who {
  display: inline-block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-right: 6px;
  opacity: 0.8;
}
.pi-queue-turn--q {
  color: #ffcc80;
}
.pi-queue-turn--a {
  color: #e0e0e0;
}
.pi-queue-text {
  cursor: text;
  word-break: break-word;
  line-height: 1.35;
}
.pi-queue-status-icon {
  margin-top: 1px;
}
.pi-queue-tools {
  opacity: 0.6;
}
.pi-queue-item:hover .pi-queue-tools {
  opacity: 1;
}
.pi-user-row {
  display: flex;
  justify-content: flex-end;
}
.pi-user-wrap {
  max-width: min(85%, 56rem);
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
/* ---- attachments ---- */
.pi-attach-thumb {
  max-width: 180px;
  max-height: 140px;
  border-radius: 6px;
  border: 1px solid #455a64;
  cursor: zoom-in;
  object-fit: cover;
}
.pi-drop-active {
  outline: 2px dashed #42a5f5;
  outline-offset: -4px;
}
.pi-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(21, 101, 192, 0.35);
  color: #e3f2fd;
  pointer-events: none;
}
.pi-bubble {
  max-width: min(85%, 56rem);
  width: fit-content;
  padding: 8px 12px;
  border-radius: 10px;
  overflow-wrap: break-word;
  word-break: normal;
}
.pi-user-wrap .pi-bubble {
  max-width: 100%;
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
.pi-cmd-menu {
  position: absolute;
  bottom: 100%;
  left: 8px;
  right: 8px;
  max-height: 320px;
  overflow: auto;
  border: 1px solid #455a64;
  border-radius: 4px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
  z-index: 10;
}
.pi-cmd-item {
  padding: 6px 10px;
  cursor: pointer;
  border-bottom: 1px solid #263238;
}
.pi-cmd-item:last-of-type {
  border-bottom: none;
}
.pi-cmd-active {
  background: #37474f;
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

/* ---- THE APPROVAL CARD: what the automation is about to do ---------------------------- */
.automation-card {
  border-left: 3px solid #4db6ac;
}
.plan-list {
  margin-top: 4px;
  max-height: 40vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.plan-step {
  font-family: monospace;
  font-size: 11.5px;
  line-height: 1.5;
  padding: 1px 0;
  overflow-wrap: anywhere;
}
/* A step that changes something is called out: those are the lines a technician is actually
   approving, and they must not read like the read-only ones. */
.plan-step--mutates .plan-step-text {
  color: #ffcc80;
  font-weight: 600;
}
.plan-approved {
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 10px;
  border-left: 3px solid #26a69a;
  background: rgba(38, 166, 154, 0.10);
  border-radius: 0 4px 4px 0;
}
.plan-warn {
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 10px;
  border-left: 3px solid #ffb74d;
  background: rgba(255, 183, 77, 0.10);
  border-radius: 0 4px 4px 0;
}

/* A capability's label + hint inside the Access dialog. min-width:0 is what stops a long
   hint from widening the dialog (flex items default to min-width:auto). */
.cap-opt {
  min-width: 0;
}
</style>
