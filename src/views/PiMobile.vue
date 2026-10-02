<template>
  <!-- PI.DEV MOBILE INBOX (the installed app's home screen).
       The RMM shell sets body { overflow-y: hidden } (App.vue), so nothing may rely on the
       window scrolling: this page is its own fixed-height column and the LIST scrolls. -->
  <div
    class="pim bg-grey-10 text-grey-2"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <div class="pim-head bg-primary text-white">
      <div class="row items-center no-wrap q-px-sm" style="height: 52px">
        <q-avatar square size="30px" class="q-mr-sm"><img src="/icons/pi-192.png" /></q-avatar>
        <div class="text-subtitle1 text-weight-medium">Pi.dev</div>
        <q-space />
        <q-btn v-if="installEvent" flat dense no-caps icon="install_mobile" label="Install" class="q-mr-xs" @click="install" />
        <q-btn v-else-if="!isStandalone" flat dense round icon="install_mobile" @click="installHelp = true">
          <q-tooltip>Install as an app</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="add_comment" @click="newChatOpen = true" />
        <!-- The ONLY automatic refresh is the one you ask for: this button or a pull from
             the very top. The list used to reload itself every 20s, which re-sorted rows
             under your thumb mid-read. Instead we show how old the list is. -->
        <q-btn flat dense round icon="refresh" :loading="loading" @click="load">
          <q-tooltip>Refresh · {{ loadedAgo }}</q-tooltip>
        </q-btn>
      </div>
      <q-tabs v-model="tab" dense align="justify" active-color="white" indicator-color="amber-6" narrow-indicator class="text-grey-4">
        <q-tab name="recent" no-caps :label="`Recent · ${recentCount}`" />
        <q-tab name="decisions" no-caps :label="`Tickets · ${visibleDecisions}`" />
        <q-tab name="chats" no-caps :label="`Devices · ${chats.length}`" />
      </q-tabs>
      <!-- FILTER BAR. Always visible: the search box and "My tickets". Behind the arrow:
           the field the search applies to, and "Hide closed" (on by default, remembered). -->
      <div class="pim-filter-bar bg-grey-9 q-px-sm q-py-xs">
        <div class="row items-center no-wrap q-gutter-x-xs">
          <q-btn
            flat dense round size="sm"
            :icon="filtersOpen ? 'expand_less' : 'expand_more'"
            :color="filtersActive ? 'amber-5' : 'grey-4'"
            @click="filtersOpen = !filtersOpen"
          >
            <q-tooltip>Filters</q-tooltip>
          </q-btn>
          <q-input v-model="filter" dense dark borderless debounce="150" :placeholder="`Search ${filterFieldLabel}…`" class="col">
            <template #prepend><q-icon name="search" size="xs" /></template>
            <template v-if="filter" #append><q-icon name="close" size="xs" class="cursor-pointer" @click="filter = ''" /></template>
          </q-input>
          <q-btn
            dense no-caps unelevated size="sm"
            :color="onlyMine ? 'amber-8' : 'grey-8'"
            :text-color="onlyMine ? 'black' : 'grey-3'"
            icon="person"
            label="My tickets"
            @click="onlyMine = !onlyMine"
          >
            <q-tooltip>Only tickets assigned to you, being worked by you now, or last worked by you</q-tooltip>
          </q-btn>
        </div>
        <q-slide-transition>
          <div v-show="filtersOpen" class="q-pt-xs">
            <div class="row items-center no-wrap q-gutter-x-sm">
              <q-select
                v-model="filterField"
                :options="filterFields"
                dark dense outlined options-dense emit-value map-options
                label="Search in"
                class="col"
              />
              <q-toggle
                v-model="hideClosed"
                dense dark
                label="Hide closed"
                color="amber-8"
                class="col-auto"
              >
                <q-tooltip>Hides Closed / Cancelled / Done tickets. Remembered on this device.</q-tooltip>
              </q-toggle>
            </div>
          </div>
        </q-slide-transition>
      </div>
    </div>

    <!-- Pull-to-refresh indicator (only armed by a deliberate pull - see onTouch*). -->
    <div v-if="pullDist > 0" class="pim-pull text-grey-4" :style="{ height: Math.min(pullDist, 64) + 'px' }">
      <q-icon :name="pullDist >= PULL_TRIGGER ? 'refresh' : 'arrow_downward'" :class="{ 'text-amber-5': pullDist >= PULL_TRIGGER }" />
      <span class="q-ml-xs text-caption">{{ pullDist >= PULL_TRIGGER ? 'Release to refresh' : 'Pull to refresh' }}</span>
    </div>
    <!-- THE ONLY THING THAT SCROLLS -->
    <div ref="scroller" class="pim-scroll">
      <div v-if="error" class="q-pa-md text-negative">{{ error }}</div>
      <q-list separator dark>
        <q-item
          v-for="r in rows"
          :key="r.kind + ':' + (r.token || r.session_id)"
          clickable
          v-ripple
          class="pim-row"
          @click="open(r)"
        >
          <q-item-section avatar>
            <q-avatar :color="r.live ? (r.streaming ? 'light-green-8' : 'amber-8') : 'grey-8'" text-color="white" size="40px"
              :icon="r.kind === 'decision' ? 'confirmation_number' : 'dns'" />
          </q-item-section>
          <q-item-section>
            <q-item-label lines="1" class="text-body1">
              <q-badge v-if="yours(r)" color="amber-8" text-color="black" label="YOU" class="q-mr-xs" />
              <b>{{ r.kind === 'decision' ? r.ticket_ref : r.hostname }}</b>
              <span v-if="r.client" class="text-grey-5"> · {{ r.client }}</span>
            </q-item-label>
            <q-item-label lines="1" class="text-grey-3">
              {{ r.kind === 'decision' ? (r.subject || r.summary || '(no subject)') : (r.label || r.name) }}
            </q-item-label>
            <q-item-label lines="2" caption class="text-grey-5">{{ r.summary }}</q-item-label>
            <q-item-label v-if="r.kind === 'decision' && (r.assignee || r.last_worked_by || r.requester)" caption class="text-grey-6">
              <span v-if="r.assignee">Assigned: <b :class="{ 'text-amber-4': r.assigned_to_me }">{{ r.assignee }}</b></span>
              <span v-if="r.last_worked_by"> · Last worked: <b>{{ r.last_worked_by }}</b></span>
              <span v-if="r.requester"> · From: {{ r.requester }}</span>
            </q-item-label>
            <div v-if="r.live" class="text-caption q-mt-xs" :class="r.streaming ? 'text-light-green-4' : 'text-amber-4'">
              <q-icon :name="r.streaming ? 'bolt' : 'radio_button_checked'" size="14px" />
              {{ r.streaming ? 'AI working now' : 'Live' }}<span v-if="r.driver"> · {{ r.driver }} driving</span>
            </div>
          </q-item-section>
          <q-item-section side top class="text-caption">
            <q-badge v-if="tab === 'recent'" :color="r.kind === 'decision' ? 'blue-grey-8' : 'teal-9'"
              :label="r.kind === 'decision' ? 'TICKET' : 'DEVICE'" class="q-mb-xs" />
            <q-badge v-if="r.subject_kind === 'crm'" color="purple-7" label="OPP" class="q-mb-xs" />
            <q-badge v-if="r.kind === 'decision' && r.stage" :color="stageColor(r.stage)" :label="r.stage" class="q-mb-xs" />
            <span class="text-grey-6">{{ when(yoursAt(r) || r.updated) }}</span>
          </q-item-section>
        </q-item>
      </q-list>
      <div v-if="!rows.length && !loading" class="text-grey-6 q-pa-xl text-center">
        <q-icon name="inbox" size="40px" class="q-mb-sm" /><br />Nothing here yet.
      </div>
      <div v-if="rows.length" class="q-pt-sm text-caption text-grey-7 text-center">
        Updated {{ loadedAgo }} · pull down from the top row to refresh
      </div>
      <div class="q-pa-md text-caption text-grey-6 text-center">
        The AI runs on the server. Closing this app does not stop it — reopen a chat to pick
        it straight back up. If someone else is driving you watch read-only until you take over.
      </div>
    </div>

    <q-dialog v-model="newChatOpen" position="bottom">
      <q-card dark class="bg-grey-9" style="width: 100%; max-width: 600px">
        <q-card-section class="text-h6 q-pb-xs">New device chat</q-card-section>
        <q-card-section>
          <q-select v-model="newAgent" :options="agentOptions" dark dense outlined use-input input-debounce="0" emit-value map-options
            label="Device" @filter="filterAgents" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Start" :disable="!newAgent" @click="startNew" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="installHelp">
      <q-card dark class="bg-grey-9" style="max-width: 420px">
        <q-card-section class="text-h6">Install Pi.dev as an app</q-card-section>
        <q-card-section class="text-body2">
          <p><b>Android (Chrome):</b> tap the <b>⋮</b> menu → <b>Install app</b> (or <b>Add to Home screen</b>).
          Once installed, links from erp.blueuc.com open here instead of the browser.</p>
          <p><b>iPhone (Safari):</b> tap <b>Share</b> → <b>Add to Home Screen</b>.</p>
          <p class="text-grey-5">If Chrome shows no Install option yet, close this tab, reopen
          <b>rmm.blueuc.com/m</b> and try again — Chrome offers it after the page has fully loaded once.</p>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Close" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { fetchMobileInbox } from "@/api/core";

export default defineComponent({
  name: "PiMobile",
  setup() {
    const router = useRouter();
    // The tab you were last on is where you left off; coming back to "Tickets" every time
    // hid whatever you were actually working on. "Recent" (both kinds, your work first)
    // is the default for a first run.
    const TAB_KEY = "pi.mobile.tab";
    const tab = ref(localStorage.getItem(TAB_KEY) || "recent");
    watch(tab, (v) => localStorage.setItem(TAB_KEY, v));
    const loading = ref(false);
    const error = ref("");
    const filter = ref("");
    const filterField = ref("any");
    const onlyMine = ref(false);
    const filtersOpen = ref(false);
    // "Hide closed" is ON unless this device has said otherwise. Remembered in localStorage:
    // a filter that reset every time the app opened would be nagging, not a preference.
    const HIDE_KEY = "pi.mobile.hideClosed";
    const stored = localStorage.getItem(HIDE_KEY);
    const hideClosed = ref(stored === null ? true : stored === "1");
    watch(hideClosed, (v) => localStorage.setItem(HIDE_KEY, v ? "1" : "0"));
    // "Is this finished?" is answered by the SERVER, from the helpdesk stage id
    // (Closed / Done / Billing / Cancelled / AI Closed). It used to be a regex on the
    // stage NAME here, which got both ends wrong: "Tier - 3" is an open escalation and
    // "Done / Billing" is finished, and no word match reads those correctly.
    const isClosed = (r) => (r.closed !== undefined ? !!r.closed : /closed|cancel/i.test(r.stage || ""));
    const visibleDecisions = computed(() => {
      let src = decisions.value;
      if (onlyMine.value) src = src.filter((r) => r.mine);
      if (hideClosed.value) src = src.filter((r) => !isClosed(r));
      return src.length;
    });
    const filtersActive = computed(() => filterField.value !== "any" || !hideClosed.value);
    const filterFields = [
      { label: "Anything", value: "any" },
      { label: "Ticket #", value: "ticket_ref" },
      { label: "Client", value: "client" },
      { label: "Subject", value: "subject" },
      { label: "Summary", value: "summary" },
      { label: "Requester", value: "requester" },
      { label: "Assigned to", value: "assignee" },
      { label: "Last worked by", value: "last_worked_by" },
      { label: "Stage", value: "stage" },
      { label: "Device", value: "hostname" },
    ];
    const filterFieldLabel = computed(() => (filterFields.find((f) => f.value === filterField.value) || {}).label?.toLowerCase() || "anything");

    // PULL TO REFRESH, strictly. The stock widget fired on any downward drag of a short
    // list (a list that fits the screen is always "at the top"), so scrolling refreshed.
    // A refresh now needs a DELIBERATE pull: the touch must start in the header or on the
    // FIRST row of the list (with the list already at the top) and travel PULL_TRIGGER px
    // straight down. A drag that starts on any other row - or that leans sideways - is a
    // scroll and never refreshes. (The handlers live on the page root, not the scroller,
    // so a pull that starts on the header bar counts too.)
    const scroller = ref(null);
    const pullDist = ref(0);
    const PULL_TRIGGER = 90;
    let pullStartY = null;
    let pullStartX = 0;
    function onTouchStart(e) {
      const t = e.touches && e.touches[0];
      if (!t) return;
      pullDist.value = 0;
      pullStartY = null;
      const el = e.target;
      const closest = (sel) => (el && el.closest ? el.closest(sel) : null);
      const inHeader = !!closest(".pim-head");
      const atTop = scroller.value ? scroller.value.scrollTop <= 0 : false;
      const firstRow = scroller.value ? scroller.value.querySelector(".pim-row") : null;
      const onFirstRow = !!(firstRow && closest(".pim-row") === firstRow);
      // No rows at all? Then the empty state is the top of the list and may be pulled.
      const onEmptyTop = !firstRow && !!closest(".pim-scroll");
      if (inHeader || (atTop && (onFirstRow || onEmptyTop))) {
        pullStartY = t.clientY;
        pullStartX = t.clientX;
      }
    }
    function onTouchMove(e) {
      if (pullStartY === null) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      // Once the list has scrolled at all, this is a scroll, not a pull.
      if (scroller.value && scroller.value.scrollTop > 0) { pullStartY = null; pullDist.value = 0; return; }
      const dy = t.clientY - pullStartY;
      const dx = Math.abs(t.clientX - pullStartX);
      // Sideways (tab swipe, text selection) or upward: not a pull.
      if (dx > Math.abs(dy) || dy < 0) { pullStartY = null; pullDist.value = 0; return; }
      pullDist.value = Math.max(0, dy);
    }
    async function onTouchEnd() {
      const fire = pullStartY !== null && pullDist.value >= PULL_TRIGGER;
      pullStartY = null; pullDist.value = 0;
      if (fire) await load();
    }
    const decisions = ref([]);
    const chats = ref([]);
    const agents = ref([]);
    const newChatOpen = ref(false);
    const newAgent = ref(null);
    const agentOptions = ref([]);
    const installHelp = ref(false);
    // Chrome hands us its install prompt through this event; holding it lets us show a
    // real Install button instead of hoping the user finds the browser menu.
    const installEvent = ref(null);
    const isStandalone = ref(!!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
    const onBip = (e) => { e.preventDefault(); installEvent.value = e; };
    window.addEventListener("beforeinstallprompt", onBip);
    async function install() {
      const ev = installEvent.value;
      if (!ev) { installHelp.value = true; return; }
      ev.prompt();
      try { await ev.userChoice; } catch (e) { /* dismissed */ }
      installEvent.value = null;
    }

    // WHAT WAS I WORKING ON? Server `updated` alone answered the wrong question: ticket
    // rows are touched by automation all day, so the list was ordered by what the BOT did
    // last, not by what YOU did last. Three signals decide "mine, recently", newest wins:
    //   1. this device opened it (recorded on tap, survives reinstalling nothing else),
    //   2. the bridge says you were the last person in that conversation,
    //   3. you are driving it live right now.
    const RECENT_KEY = "pi.mobile.recent";
    const recentMap = ref({});
    try { recentMap.value = JSON.parse(localStorage.getItem(RECENT_KEY) || "{}") || {}; } catch (e) { recentMap.value = {}; }
    // Keyed on the THING, not the session: resuming a chat mints a new session id, so
    // keying on it would forget the device you were just in.
    const rowKey = (r) => (r.kind === "decision" ? `decision:${r.ticket_ref}` : `chat:${r.agent_id}`);
    function markOpened(r) {
      const m = { ...recentMap.value, [rowKey(r)]: new Date().toISOString() };
      // Keep the map small: the 200 most recent are more than anyone revisits.
      const keys = Object.keys(m).sort((a, b) => String(m[b]).localeCompare(String(m[a]))).slice(0, 200);
      recentMap.value = Object.fromEntries(keys.map((k) => [k, m[k]]));
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentMap.value)); } catch (e) { /* private mode */ }
    }
    const me = ref({});
    const isMe = (name) => {
      const n = String(name || "").trim().toLowerCase();
      if (!n) return false;
      const mine = [me.value.username, me.value.display]
        .map((x) => String(x || "").trim().toLowerCase())
        .filter((x) => x.length > 2);
      return mine.some((x) => x === n || x.includes(n) || n.includes(x));
    };
    // Timestamps come from three sources (Django isoformat, the bridge's toISOString, and
    // ours); compare them as numbers, never as strings.
    const ts = (v) => (v ? Date.parse(v) || 0 : 0);
    function yoursAt(r) {
      if (!r) return 0;
      let best = ts(recentMap.value[rowKey(r)]);
      if (r.live && isMe(r.driver)) best = Math.max(best, Date.now());
      if (r.kind === "decision") {
        if (isMe(r.last_worked_by)) best = Math.max(best, ts(r.last_worked_at));
      } else if (isMe(r.user)) {
        best = Math.max(best, ts(r.updated));
      }
      return best;
    }
    const yours = (r) => yoursAt(r) > 0;

    function applyFilters(src, kindIsDecision) {
      let out = src;
      if (onlyMine.value) out = out.filter((r) => r.mine);
      if (hideClosed.value && kindIsDecision) out = out.filter((r) => !isClosed(r));
      const f = filter.value.trim().toLowerCase();
      if (!f) return out;
      const field = filterField.value;
      return out.filter((r) => {
        if (field === "any") return JSON.stringify(r).toLowerCase().includes(f);
        return String(r[field] || "").toLowerCase().includes(f);
      });
    }

    // Your work first, newest at the very top; everything else below it in the old order
    // (live conversations, then most recently updated).
    function byRecency(a, b) {
      const am = yoursAt(a);
      const bm = yoursAt(b);
      if (am || bm) return bm - am;
      return (Number(b.live) - Number(a.live)) || (ts(b.updated) - ts(a.updated));
    }

    const rows = computed(() => {
      const list = tab.value === "recent"
        ? [...applyFilters(decisions.value, true), ...applyFilters(chats.value, false)]
        : [...applyFilters(tab.value === "decisions" ? decisions.value : chats.value, tab.value === "decisions")];
      return list.sort(byRecency);
    });
    const recentCount = computed(
      () => decisions.value.filter(yours).length + chats.value.filter(yours).length,
    );

    const label = (a) => `${a.hostname} · ${a.client}${a.online ? "" : " (offline)"}`;
    async function load() {
      loading.value = true;
      error.value = "";
      try {
        const d = await fetchMobileInbox();
        me.value = d.me || {};
        loadedAt.value = Date.now();
        decisions.value = d.decisions || [];
        chats.value = d.chats || [];
        agents.value = d.agents || [];
        agentOptions.value = agents.value.map((a) => ({ label: label(a), value: a.agent_id }));
      } catch (e) {
        error.value = "Could not load your inbox.";
      } finally {
        loading.value = false;
      }
    }
    function filterAgents(val, update) {
      update(() => {
        const needle = String(val || "").toLowerCase();
        agentOptions.value = agents.value
          .filter((a) => !needle || `${a.hostname} ${a.client}`.toLowerCase().includes(needle))
          .map((a) => ({ label: label(a), value: a.agent_id }));
      });
    }
    function open(r) { markOpened(r); router.push(r.url); }
    function startNew() { newChatOpen.value = false; router.push(`/pichat/${newAgent.value}?new=1`); }
    function stageColor(st) {
      const s = String(st || "").toLowerCase();
      if (/closed|done|solved|resolved/.test(s)) return "green-8";
      if (/cancel/.test(s)) return "grey-7";
      if (/progress|working|assigned/.test(s)) return "blue-8";
      if (/wait|hold|pending|customer/.test(s)) return "orange-8";
      if (/new/.test(s)) return "teal-8";
      return "blue-grey-7";
    }
    function when(ts) {
      if (!ts) return "";
      const d = new Date(ts);
      return d.toDateString() === new Date().toDateString()
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    // How stale is what you are looking at? Shown instead of reloading behind your back.
    const loadedAt = ref(0);
    const nowTick = ref(Date.now());
    const loadedAgo = computed(() => {
      if (!loadedAt.value) return "not loaded yet";
      const s = Math.max(0, Math.round((nowTick.value - loadedAt.value) / 1000));
      if (s < 60) return "just now";
      const m = Math.round(s / 60);
      if (m < 60) return `${m}m ago`;
      return `${Math.round(m / 60)}h ago`;
    });
    let timer = null;
    onMounted(() => {
      load();
      // Ticks the "updated Nm ago" label only - it never fetches. The inbox reloads when
      // YOU ask: the refresh button, or a pull down from the top row.
      timer = setInterval(() => { nowTick.value = Date.now(); }, 30000);
    });
    onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener("beforeinstallprompt", onBip); });
    return { tab, loading, error, filter, filterField, filterFields, filterFieldLabel, onlyMine,
      filtersOpen, filtersActive, hideClosed, visibleDecisions, recentCount, yours, yoursAt,
      loadedAgo,
      decisions, chats, rows, newChatOpen, newAgent, agentOptions,
      scroller, pullDist, PULL_TRIGGER, onTouchStart, onTouchMove, onTouchEnd,
      installHelp, installEvent, isStandalone, install, load, filterAgents, open, startNew, when, stageColor };
  },
});
</script>

<style scoped>
.pim {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pim-head {
  flex: 0 0 auto;
  padding-top: env(safe-area-inset-top);
}
.pim-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom);
}
.pim-row {
  min-height: 72px;
}
.pim-filter-bar :deep(.q-field__control) {
  min-height: 34px;
}
.pim-pull {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 80ms linear;
}
</style>
