<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-grey-9 text-white">
      <q-banner
        v-if="needRefresh"
        inline-actions
        class="bg-red text-white text-center"
      >
        You are viewing an outdated version of this page.
        <q-btn
          color="dark"
          icon="refresh"
          label="Refresh"
          @click="$store.dispatch('reload')"
        />
      </q-banner>
      <q-banner
        v-if="!hosted && tokenExpired"
        inline-actions
        class="bg-yellow text-black text-center"
      >
        <q-icon size="xl" name="warning" />
        <span
          ><br />Your license is currently inactive, usually due to a payment
          issue.<br /><br />To restore access, please update your payment
          method.<br /><br />
          If you’ve intentionally cancelled your sponsorship, you can remove
          your license key to stop seeing this message.<br /><br />
          If you need help, please contact our support team at
          <a
            href="https://support.amidaware.com"
            target="_blank"
            rel="noopener"
            class="text-primary"
            >https://support.amidaware.com</a
          ><br /><br
        /></span>
        <q-btn
          color="dark"
          icon="refresh"
          label="Refresh"
          @click="$store.dispatch('reload')"
        />
      </q-banner>
      <q-toolbar>
        <q-btn
          dense
          flat
          @click="$store.dispatch('refreshDashboard')"
          icon="refresh"
          v-if="$route.name === 'Dashboard'"
        />
        <q-btn
          v-else
          dense
          flat
          @click="$router.push({ name: 'Dashboard' })"
          icon="dashboard"
        >
          <q-tooltip>Back to Dashboard</q-tooltip>
        </q-btn>
        <q-toolbar-title>
          Tactical RMM<span class="text-overline q-ml-sm"
            >v{{ currentTRMMVersion }}</span
          >
          <!-- update check -->
          <q-chip
            v-if="updateAvailable"
            class="text-overline q-ml-sm"
            :color="dash_warning_color"
            icon="update"
            dense
            ><a :href="latestReleaseURL" target="_blank"
              >v{{ latestTRMMVersion }} available</a
            ></q-chip
          >
          <!-- cert expiring soon check -->
          <q-chip
            v-if="daysUntilCertExpires <= 15"
            dense
            :color="dash_negative_color"
            text-color="black"
            icon="warning"
            >SSL certificate expires in {{ daysUntilCertExpires }} days</q-chip
          >
        </q-toolbar-title>
        <!-- temp dark mode toggle -->
        <q-toggle
          v-model="darkMode"
          class="q-mr-sm"
          checked-icon="nights_stay"
          unchecked-icon="wb_sunny"
        />
        <!-- web terminal button -->
        <q-btn
          v-if="!hosted"
          label=">_"
          dense
          flat
          @click="openWebTerm"
          class="q-mr-sm"
          style="font-size: 16px"
        />
        <!-- Devices Chip -->
        <q-chip class="cursor-pointer">
          <q-avatar size="md" icon="devices" color="primary" />
          <q-tooltip :delay="600" anchor="top middle" self="top middle"
            >Agent Count</q-tooltip
          >
          {{ serverCount + workstationCount }}
          <q-menu>
            <q-list dense>
              <q-item-label header>Servers</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="dns" size="sm" color="primary" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Total: {{ serverCount }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon
                    name="power_off"
                    size="sm"
                    :color="dash_negative_color"
                  />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Offline: {{ serverOfflineCount }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item-label header>Workstations</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="computer" size="sm" color="primary" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>Total: {{ workstationCount }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon
                    name="power_off"
                    size="sm"
                    :color="dash_negative_color"
                  />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label
                    >Offline: {{ workstationOfflineCount }}</q-item-label
                  >
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-chip>

        <AlertsIcon />

        <q-btn-dropdown flat no-caps stretch :label="displayName || ''">
          <q-list>
            <q-item
              clickable
              v-ripple
              @click="showUserPreferences()"
              v-close-popup
            >
              <q-item-section>
                <q-item-label>Preferences</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-ripple
              @click="showUserPreferences('security')"
              v-close-popup
            >
              <q-item-section>
                <q-item-label>Passkeys</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="vpn_key" />
              </q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section>Account</q-item-section>
              <q-item-section side>
                <q-icon name="keyboard_arrow_right" />
              </q-item-section>

              <q-menu anchor="top end" self="top start">
                <q-list>
                  <q-item
                    clickable
                    v-ripple
                    @click="resetPassword"
                    v-close-popup
                  >
                    <q-item-section>
                      <q-item-label>Reset Password</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple @click="resetMFA" v-close-popup>
                    <q-item-section>
                      <q-item-label>Reset MFA</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-item>
            <q-item to="/expired" exact>
              <q-item-section>
                <q-item-label>Logout</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
<script setup lang="ts">
// composition imports
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { useDashboardStore } from "@/stores/dashboard";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { resetTwoFactor } from "@/api/accounts";
import { notifyError, notifySuccess } from "@/utils/notify";
import axios from "axios";

// webtermn
import { checkWebTermPerms, openWebTerminal } from "@/api/core";

// ui imports
import AlertsIcon from "@/components/AlertsIcon.vue";
import UserPreferences from "@/components/modals/coresettings/UserPreferences.vue";
import ResetPass from "@/components/accounts/ResetPass.vue";
import { fetchPasskeys, isWebAuthnSupported } from "@/api/webauthn";

const store = useStore();
const $q = useQuasar();
const auth = useAuthStore();

const {
  serverCount,
  serverOfflineCount,
  workstationCount,
  workstationOfflineCount,
  daysUntilCertExpires,
} = storeToRefs(useDashboardStore());

const { displayName } = storeToRefs(auth);

const darkMode = computed({
  get: () => {
    return $q.dark.isActive;
  },
  set: (value) => {
    axios.patch("/accounts/users/ui/", { dark_mode: value });
    $q.dark.set(value);
  },
});

const currentTRMMVersion = computed(() => store.state.currentTRMMVersion);
const latestTRMMVersion = computed(() => store.state.latestTRMMVersion);
const needRefresh = computed(() => store.state.needrefresh);
const hosted = computed(() => store.state.hosted);
const tokenExpired = computed(() => store.state.tokenExpired);
const dash_warning_color = computed(() => store.state.dash_warning_color);
const dash_negative_color = computed(() => store.state.dash_negative_color);

const latestReleaseURL = computed(() => {
  return latestTRMMVersion.value
    ? `https://github.com/amidaware/tacticalrmm/releases/tag/v${latestTRMMVersion.value}`
    : "";
});

function showUserPreferences(initialTab: "ui" | "security" = "ui") {
  $q.dialog({
    component: UserPreferences,
    componentProps: { initialTab },
  }).onOk(() => store.dispatch("getDashInfo"));
}

function resetPassword() {
  $q.dialog({
    component: ResetPass,
  });
}

function resetMFA() {
  $q.dialog({
    title: "Reset MFA",
    message: "This removes your TOTP secret and enrolled passkeys.",
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const ret = await resetTwoFactor();
      notifySuccess(ret, 3000);
    } catch {}
  });
}

async function maybePromptPasskeyEnrollment() {
  if (!auth.consumePasskeyEnrollmentPrompt() || !isWebAuthnSupported()) return;

  try {
    const passkeys = await fetchPasskeys();
    if (passkeys.length > 0) return;
  } catch {
    return;
  }

  $q.notify({
    type: "info",
    message: "Passkeys are now the preferred sign-in method.",
    caption:
      "You can enroll one now, or any time from Preferences > Security > Passkeys.",
    timeout: 12000,
    multiLine: true,
    actions: [
      {
        label: "Open Security",
        color: "white",
        handler: () => showUserPreferences("security"),
      },
      { label: "Later", color: "white" },
    ],
  });
}

async function openWebTerm() {
  try {
    const { message, status } = await checkWebTermPerms();
    if (status === 412) {
      notifyError(message);
    } else {
      openWebTerminal();
    }
  } catch (e) {
    notifyError(e instanceof Error ? e.message : "Unable to open web terminal");
  }
}

const updateAvailable = computed(() => {
  if (
    latestTRMMVersion.value === "error" ||
    hosted.value ||
    currentTRMMVersion.value?.includes("-dev")
  )
    return false;
  return currentTRMMVersion.value !== latestTRMMVersion.value;
});

const poll = ref(null);

function livePoll() {
  poll.value = setInterval(
    () => {
      store.dispatch("checkVer");
      store.dispatch("getDashInfo", false);
    },
    60 * 4 * 1000,
  );
}

onMounted(() => {
  store.dispatch("getDashInfo");
  store.dispatch("checkVer");
  maybePromptPasskeyEnrollment();
  livePoll();
});

onBeforeUnmount(() => {
  clearInterval(poll.value);
});
</script>
