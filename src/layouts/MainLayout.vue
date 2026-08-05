<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-grey-9 text-white">
      <q-banner
        v-if="needRefresh"
        inline-actions
        class="bg-red text-white text-center"
      >
        {{ t("navigation.banner.outdated") }}
        <q-btn
          color="dark"
          icon="refresh"
          :label="t('common.actions.refresh')"
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
          ><br />{{ t("navigation.banner.license.line1") }}<br /><br />
          {{ t("navigation.banner.license.line2") }}<br /><br />
          {{ t("navigation.banner.license.line3") }}<br /><br />
          {{ t("navigation.banner.license.line4") }}
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
          :label="t('common.actions.refresh')"
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
          <q-tooltip>{{ t("navigation.tooltip.backToDashboard") }}</q-tooltip>
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
            ><a :href="latestReleaseURL" target="_blank">{{
              t("navigation.release.available", {
                version: latestTRMMVersion,
              })
            }}</a></q-chip
          >
          <!-- cert expiring soon check -->
          <q-chip
            v-if="daysUntilCertExpires <= 15"
            dense
            :color="dash_negative_color"
            text-color="black"
            icon="warning"
            >{{
              t("navigation.certificate.expiresInDays", {
                days: daysUntilCertExpires,
              })
            }}</q-chip
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
          <q-tooltip :delay="600" anchor="top middle" self="top middle">{{
            t("navigation.tooltip.agentCount")
          }}</q-tooltip>
          {{ serverCount + workstationCount }}
          <q-menu>
            <q-list dense>
              <q-item-label header>{{
                t("navigation.counts.servers")
              }}</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="dns" size="sm" color="primary" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>
                    {{ t("navigation.counts.total", { count: serverCount }) }}
                  </q-item-label>
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
                  <q-item-label>
                    {{
                      t("navigation.counts.offline", {
                        count: serverOfflineCount,
                      })
                    }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item-label header>{{
                t("navigation.counts.workstations")
              }}</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="computer" size="sm" color="primary" />
                </q-item-section>

                <q-item-section no-wrap>
                  <q-item-label>
                    {{
                      t("navigation.counts.total", {
                        count: workstationCount,
                      })
                    }}
                  </q-item-label>
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
                  <q-item-label>
                    {{
                      t("navigation.counts.offline", {
                        count: workstationOfflineCount,
                      })
                    }}
                  </q-item-label>
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
              @click="showUserPreferences"
              v-close-popup
            >
              <q-item-section>
                <q-item-label>{{
                  t("navigation.menu.preferences")
                }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section>{{
                t("navigation.menu.account")
              }}</q-item-section>
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
                      <q-item-label>{{
                        t("navigation.menu.resetPassword")
                      }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-ripple @click="reset2FA" v-close-popup>
                    <q-item-section>
                      <q-item-label>{{
                        t("navigation.menu.reset2fa")
                      }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-item>
            <q-item to="/expired" exact>
              <q-item-section>
                <q-item-label>{{ t("navigation.menu.logout") }}</q-item-label>
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
import { useI18n } from "vue-i18n";
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

const store = useStore();
const $q = useQuasar();
const { t } = useI18n();

const {
  serverCount,
  serverOfflineCount,
  workstationCount,
  workstationOfflineCount,
  daysUntilCertExpires,
} = storeToRefs(useDashboardStore());

const { displayName } = storeToRefs(useAuthStore());

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

function showUserPreferences() {
  $q.dialog({
    component: UserPreferences,
  }).onOk(() => store.dispatch("getDashInfo"));
}

function resetPassword() {
  $q.dialog({
    component: ResetPass,
  });
}

function reset2FA() {
  $q.dialog({
    title: t("navigation.dialog.reset2faTitle"),
    message: t("navigation.dialog.reset2faMessage"),
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const ret = await resetTwoFactor();
      notifySuccess(ret, 3000);
    } catch {}
  });
}

async function openWebTerm() {
  try {
    const { message, status } = await checkWebTermPerms();
    if (status === 412) {
      const backendMessage = typeof message === "string" ? message.trim() : "";
      notifyError(
        backendMessage || t("navigation.webTerminal.featureDisabled"),
      );
    } else {
      openWebTerminal();
    }
  } catch (e) {
    console.error(e);
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
  livePoll();
});

onBeforeUnmount(() => {
  clearInterval(poll.value);
});
</script>
