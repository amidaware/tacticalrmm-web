<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense icon="arrow_back" to="/" title="Back to dashboard" />
        <q-icon name="support_agent" size="26px" class="q-ml-sm" />
        <q-toolbar-title>Quick Support queue</q-toolbar-title>
        <div class="text-caption q-mr-md" v-if="state === 'ready'">
          <q-icon
            name="circle"
            size="10px"
            :color="stale ? 'orange' : 'light-green-5'"
          />
          {{ stale ? "Reconnecting..." : `Live - updated ${agoText}` }}
        </div>
        <q-btn
          flat
          dense
          round
          :icon="sound ? 'volume_up' : 'volume_off'"
          :title="sound ? 'Sound on' : 'Sound off'"
          @click="toggleSound"
        />
        <q-btn
          flat
          dense
          round
          :icon="
            notifyState === 'granted' && notify
              ? 'notifications_active'
              : 'notifications_off'
          "
          :title="notifyTitle"
          @click="toggleNotify"
        />
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          label="Open in MeshCentral"
          icon-right="open_in_new"
          class="q-ml-sm"
          @click="openMesh"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page padding>
        <div v-if="state === 'loading'" class="text-center q-mt-xl">
          <q-spinner size="40px" color="primary" />
          <div class="text-grey-7 q-mt-sm">Loading the Quick Support queue...</div>
        </div>

        <q-banner
          v-else-if="state === 'error'"
          rounded
          class="bg-red-1 text-red-10 q-mx-auto"
          style="max-width: 640px"
        >
          <template #avatar><q-icon name="lock" color="negative" /></template>
          {{ error }}
          <template #action>
            <q-btn flat label="Try again" @click="load" />
            <q-btn flat label="Dashboard" to="/" />
          </template>
        </q-banner>

        <template v-else>
          <div class="row items-center q-mb-md q-gutter-sm">
            <q-chip
              :color="waiting ? 'orange' : 'grey-4'"
              :text-color="waiting ? 'white' : 'grey-8'"
              icon="hourglass_top"
            >
              {{ waiting }} waiting
            </q-chip>
            <q-chip color="green-1" text-color="green-9" icon="headset_mic">
              {{ helping }} being helped
            </q-chip>
            <q-space />
            <q-toggle v-model="showLeft" label="Show people who left" dense />
          </div>

          <div
            v-if="!visible.length"
            class="text-center text-grey-6 q-pa-xl"
            style="border: 1px dashed #ccc; border-radius: 8px"
          >
            <q-icon name="check_circle" size="48px" color="positive" />
            <div class="text-h6 q-mt-sm">Nobody is waiting</div>
            <div>
              When a customer opens BlueCloud Quick Support, they appear here
              within a few seconds.
            </div>
          </div>

          <q-markup-table v-else flat bordered separator="horizontal">
            <thead>
              <tr>
                <th class="text-left" style="width: 170px">Status</th>
                <th class="text-left">Customer / request</th>
                <th class="text-left" style="width: 240px">Computer</th>
                <th class="text-left" style="width: 110px">Waiting</th>
                <th class="text-right" style="width: 210px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in visible"
                :key="e.id"
                :class="rowClass(e)"
                :ref="(el) => (e.id === highlight ? (highlightEl = el) : null)"
              >
                <td>
                  <q-badge
                    :color="statusColor(e)"
                    class="q-pa-xs text-weight-medium"
                    style="font-size: 12px"
                  >
                    <q-icon :name="statusIcon(e)" size="14px" class="q-mr-xs" />
                    {{ statusText(e) }}
                  </q-badge>
                  <div
                    v-if="e.connected.length"
                    class="text-caption text-grey-7 q-mt-xs"
                  >
                    Connected: {{ e.connected.join(", ") }}
                  </div>
                </td>
                <td style="white-space: normal">
                  <div v-if="e.help_text" class="text-body1">
                    "{{ e.help_text }}"
                  </div>
                  <div v-else class="text-grey-6 text-italic">
                    {{
                      e.status === "left"
                        ? "Closed Quick Support"
                        : "Opened Quick Support (no message)"
                    }}
                  </div>
                </td>
                <td>
                  <div class="text-weight-medium">{{ e.name }}</div>
                  <div class="text-caption text-grey-7">
                    {{ winUser(e) }}<span v-if="e.os"> &middot; {{ e.os }}</span>
                  </div>
                  <div v-if="e.ip" class="text-caption text-grey-7">{{ e.ip }}</div>
                </td>
                <td>
                  <span v-if="e.since && e.status !== 'left'">{{
                    duration(e.since)
                  }}</span>
                </td>
                <td class="text-right">
                  <template v-if="e.online">
                    <q-btn
                      unelevated
                      dense
                      no-caps
                      :color="takenByOther(e) ? 'grey-7' : 'primary'"
                      :label="takenByOther(e) ? 'Join' : 'Take Control'"
                      icon="desktop_windows"
                      class="q-px-sm"
                      @click="connect(e, 'desktop')"
                    />
                    <q-btn flat dense round icon="more_vert" class="q-ml-xs">
                      <q-menu auto-close>
                        <q-list dense style="min-width: 170px">
                          <q-item clickable @click="connect(e, 'terminal')">
                            <q-item-section avatar><q-icon name="terminal" /></q-item-section>
                            <q-item-section>Terminal</q-item-section>
                          </q-item>
                          <q-item clickable @click="connect(e, 'files')">
                            <q-item-section avatar><q-icon name="folder" /></q-item-section>
                            <q-item-section>Files</q-item-section>
                          </q-item>
                          <q-item clickable @click="copyDetails(e)">
                            <q-item-section avatar><q-icon name="content_copy" /></q-item-section>
                            <q-item-section>Copy details</q-item-section>
                          </q-item>
                          <q-item
                            v-if="e.claimed_by === me"
                            clickable
                            @click="release(e)"
                          >
                            <q-item-section avatar><q-icon name="logout" /></q-item-section>
                            <q-item-section>Release (I'm done)</q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </template>
                </td>
              </tr>
            </tbody>
          </q-markup-table>
          <div class="text-caption text-grey-6 q-mt-sm">
            Opening a session claims it for you, so other techs see you are
            helping. The customer is not asked to accept: they see a notice and a
            bar with <b>Disconnect</b> while you are connected.
          </div>
        </template>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
// BlueCloud Quick Support queue (TICKET/63164). Techs arrive from the "Tech Login" link on
// erp.blueuc.com/support, the top-bar Quick Support button, or a Teams card.
// API: /core/quick-support/* (core/quick_support.py) - gated on MeshCentral "Support Techs".
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useMeta, useQuasar, copyToClipboard } from "quasar";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import {
  fetchQuickSupportQueue,
  releaseQuickSupport,
} from "@/api/quickSupport";
import {
  alertNewRequests,
  soundEnabled,
  setSoundEnabled,
  chime,
  enableNotifications,
  disableNotifications,
  notifyEnabled,
  notifyPermission,
} from "@/composables/quickSupportAlerts";

const POLL_MS = 5000;

export default {
  name: "QuickSupport",
  setup() {
    useMeta({ title: "Quick Support" });
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();

    const state = ref("loading");
    const error = ref("");
    const entries = ref([]);
    const me = ref("");
    const lastOk = ref(0);
    const clock = ref(Date.now());
    const skew = ref(0); // server now - browser now (seconds)
    const showLeft = ref(false);
    const highlight = ref(route.query.device || null);
    const highlightEl = ref(null);
    const sound = ref(soundEnabled());
    const notify = ref(notifyEnabled());
    const notifyState = ref(notifyPermission());

    let pollTimer = null;
    let clockTimer = null;
    let scrolled = false;

    async function load() {
      try {
        const data = await fetchQuickSupportQueue();
        entries.value = data.entries;
        me.value = data.me;
        skew.value = data.now - Date.now() / 1000;
        lastOk.value = Date.now();
        state.value = "ready";
        alertNewRequests(data.entries, router);
        if (highlight.value && !scrolled) {
          await nextTick();
          if (highlightEl.value) {
            highlightEl.value.scrollIntoView({ block: "center" });
            scrolled = true;
          }
        }
      } catch (e) {
        const status = e.response && e.response.status;
        if (status === 403 || status === 401 || state.value !== "ready") {
          error.value =
            (e.response && e.response.data && e.response.data.detail) ||
            "The Quick Support queue could not be loaded.";
          state.value = "error";
          if (status === 403) return; // not a Support Tech - stop polling
        }
      }
      pollTimer = setTimeout(load, POLL_MS);
    }

    const visible = computed(() =>
      entries.value.filter(
        (e) => showLeft.value || e.status !== "left" || e.id === highlight.value,
      ),
    );
    const waiting = computed(
      () => entries.value.filter((e) => e.status === "waiting").length,
    );
    const helping = computed(
      () => entries.value.filter((e) => e.status === "helping").length,
    );
    const stale = computed(() => clock.value - lastOk.value > POLL_MS * 3);
    const agoText = computed(() => {
      const s = Math.max(0, Math.round((clock.value - lastOk.value) / 1000));
      return s < 2 ? "just now" : `${s}s ago`;
    });
    const notifyTitle = computed(() => {
      if (notifyState.value === "unsupported")
        return "This browser does not support notifications";
      if (notifyState.value === "denied")
        return "Notifications are blocked for this site in your browser settings";
      return notify.value
        ? "Desktop notifications on"
        : "Desktop notifications off - click to enable";
    });

    function duration(since) {
      const s = Math.max(
        0,
        Math.floor(clock.value / 1000 + skew.value - since),
      );
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ${s % 60}s`;
      return `${Math.floor(m / 60)}h ${m % 60}m`;
    }

    function takenByOther(e) {
      const other = (e.claimed_by && e.claimed_by !== me.value) ||
        e.connected.some((u) => u !== me.value);
      return !!other;
    }
    function helper(e) {
      return e.claimed_by || e.connected[0] || "someone";
    }
    function statusText(e) {
      switch (e.status) {
        case "waiting":
          return "Waiting";
        case "helping":
          return helper(e) === me.value ? "You are helping" : `${helper(e)} is helping`;
        default:
          return "Left";
      }
    }
    function statusColor(e) {
      return { waiting: "orange", helping: "positive", idle: "blue-grey-4", left: "grey-5" }[
        e.status
      ];
    }
    function statusIcon(e) {
      return { waiting: "hourglass_top", helping: "headset_mic", idle: "pause_circle", left: "logout" }[
        e.status
      ];
    }
    function rowClass(e) {
      const c = [];
      if (e.status === "left") c.push("text-grey-6");
      if (e.id === highlight.value)
        c.push($q.dark.isActive ? "bg-blue-grey-9" : "bg-blue-1");
      return c;
    }
    function winUser(e) {
      return e.help_user || (e.users && e.users.join(", ")) || "unknown user";
    }

    function openSession(e, mode) {
      const href = router.resolve({
        name: "QuickSupportSession",
        params: { node: e.id },
        query: { mode },
      }).href;
      window.open(href, `qs-${e.id}-${mode}`);
      // optimistic: show the claim right away (the session page makes it real)
      e.claimed_by = me.value;
      if (e.status === "waiting") e.status = "helping";
    }

    function connect(e, mode) {
      if (takenByOther(e)) {
        $q.dialog({
          title: "Someone is already helping",
          message: `${helper(e)} is already on ${e.name}. Join anyway? You will become the tech listed for this session.`,
          cancel: true,
          ok: { label: "Join", color: "primary" },
        }).onOk(() => openSession(e, mode));
      } else openSession(e, mode);
    }

    async function release(e) {
      try {
        await releaseQuickSupport(e.id);
        $q.notify({ type: "positive", message: `Released ${e.name}` });
        clearTimeout(pollTimer);
        load();
      } catch {
        $q.notify({ type: "negative", message: "Could not release the claim" });
      }
    }

    function copyDetails(e) {
      const text = [
        `Quick Support - ${e.name}`,
        `Customer says: ${e.help_text || "-"}`,
        `Windows user: ${winUser(e)}`,
        e.ip ? `Public IP: ${e.ip}` : null,
        e.os ? `OS: ${e.os}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      copyToClipboard(text).then(() =>
        $q.notify({ type: "positive", message: "Copied", timeout: 1200 }),
      );
    }

    function toggleSound() {
      sound.value = !sound.value;
      setSoundEnabled(sound.value);
      if (sound.value) chime(); // also unlocks audio for this tab
    }

    async function toggleNotify() {
      if (notify.value) {
        disableNotifications();
        notify.value = false;
        return;
      }
      notifyState.value = await enableNotifications();
      notify.value = notifyEnabled();
      if (notifyState.value === "denied")
        $q.notify({
          type: "warning",
          message:
            "Notifications are blocked for rmm.blueuc.com - allow them in the browser's site settings.",
        });
    }

    async function openMesh() {
      try {
        const { data } = await axios.get("/core/quick-support/");
        window.open(data.url, "_blank");
      } catch (e) {
        $q.notify({
          type: "negative",
          message:
            (e.response && e.response.data && e.response.data.detail) ||
            "Could not open MeshCentral",
        });
      }
    }

    onMounted(() => {
      load();
      clockTimer = setInterval(() => (clock.value = Date.now()), 1000);
    });
    onBeforeUnmount(() => {
      clearTimeout(pollTimer);
      clearInterval(clockTimer);
    });

    return {
      state, error, entries, visible, waiting, helping, me, stale, agoText, showLeft,
      highlight, highlightEl, sound, notify, notifyState, notifyTitle,
      load, duration, takenByOther, statusText, statusColor, statusIcon, rowClass, winUser,
      connect, release, copyDetails, toggleSound, toggleNotify, openMesh,
    };
  },
};
</script>
