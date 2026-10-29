import { createApp, h, nextTick, ref } from "vue";
import {
  Quasar,
  Notify,
  QBtn,
  QCard,
  QCardSection,
  QCheckbox,
  QDialog,
  QForm,
  QInput,
  QSelect,
  QSeparator,
  QSpace,
  QSplitter,
  QTab,
  QTabPanel,
  QTabPanels,
  QTabs,
  QTooltip,
  QTable,
  QTh,
  QMenu,
  QOptionGroup,
  QList,
  QItem,
  QItemSection,
  QItemLabel,
  QIcon,
  QLinearProgress,
  QBadge,
} from "quasar";
import { createPinia, setActivePinia } from "pinia";
import axios from "axios";
import gettextBoot from "@/boot/gettext";
import { gettext } from "@/gettext";
import * as locale from "@/gettext/locale";
import { useAuthStore } from "@/stores/auth";
import UserPreferences from "@/components/modals/coresettings/UserPreferences.vue";
import TacticalTable from "@/components/ui/TacticalTable.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import TransferActions from "@/components/agents/remotebg/FileBrowserTransferQueueActions.vue";
import DownloadProgress from "@/components/agents/remotebg/FileBrowserDownloadProgress.vue";
import DownloadQueue from "@/components/agents/remotebg/FileBrowserDownloadQueue.vue";
import UploadQueue from "@/components/agents/remotebg/FileBrowserUploadQueue.vue";
import type { DownloadQueueItem, UploadQueueItem } from "@/types/filebrowser";

const requests: { method: string; url: string; data: unknown }[] = [];
const baseDashboard = {
  dbl_click_action: "takecontrol",
  url_action: null,
  default_agent_tbl_tab: "server",
  client_tree_sort: "name",
  loading_bar_color: "blue",
  dash_info_color: "blue",
  dash_positive_color: "green",
  dash_negative_color: "red",
  dash_warning_color: "orange",
  clear_search_when_switching: false,
  date_format: "YYYY-MM-DD",
};
const state = { dashboard: { ...baseDashboard } as Record<string, unknown> };
axios.defaults.adapter = async (config) => {
  requests.push({
    method: config.method,
    url: config.url,
    data: config.data ? JSON.parse(config.data) : null,
  });
  const data =
    config.url === "/core/dashinfo/"
      ? state.dashboard
      : config.url?.includes("login") || config.url?.includes("checkcreds")
        ? { token: "test-token", username: "test", name: "Test user" }
        : {};
  return { data, status: 200, statusText: "OK", headers: {}, config };
};

const pinia = createPinia();
setActivePinia(pinia);
const auth = useAuthStore();
const remote = window.location.pathname.includes("remotebg");
const queueMode = ref<"active" | "paused">("active");
const queueEvents: string[] = [];
const messageDownloads: DownloadQueueItem[] = [
  {
    id: "download-own",
    name: "RAW_download",
    sourcePath: "/raw/path",
    status: "paused",
    progress: 0,
    messageCode: "reconnecting",
    errorMessage: "OLD_SNAPSHOT",
  },
  {
    id: "download-legacy",
    name: "RAW_legacy",
    sourcePath: "/raw/legacy",
    status: "paused",
    progress: 0,
    errorMessage: "filebrowser.files",
  },
];
const messageUploads: UploadQueueItem[] = [
  {
    id: "upload-own",
    name: "RAW_upload",
    destinationPath: "/raw/path",
    sizeBytes: 8,
    sizeLabel: "8 B",
    status: "paused",
    progress: 0,
    messageCode: "reconnecting",
    errorMessage: "OLD_SNAPSHOT",
  },
  {
    id: "upload-legacy",
    name: "RAW_legacy",
    destinationPath: "/raw/legacy",
    sizeBytes: 8,
    sizeLabel: "8 B",
    status: "paused",
    progress: 0,
    errorMessage: "filebrowser.files",
  },
];
const app = createApp({
  render() {
    return h("div", [
      h("span", { id: "new" }, gettext.$gettext("Save")),
      remote
        ? null
        : h("section", { id: "download-message-queue" }, [
            h(DownloadQueue, { items: messageDownloads }),
            h("div", { id: "compact-download-progress" }, [
              h(DownloadProgress, {
                fileName: "RAW_compact",
                progress: 0.5,
                status: "downloading",
                messageCode: "reconnecting",
                errorMessage: "OLD_SNAPSHOT",
              }),
            ]),
          ]),
      remote
        ? null
        : h("section", { id: "upload-message-queue" }, [
            h(UploadQueue, {
              items: messageUploads,
              destinationLabel: "/RAW_DESTINATION",
            }),
          ]),
      remote ? null : h(UserPreferences, { ref: "preferences" }),
      remote
        ? null
        : h(TacticalTable, {
            id: "translated-table",
            rows: [{ id: 1 }],
            rowKey: "id",
            columns: [
              { name: "result", label: gettext.$gettext("Save"), field: "id" },
            ],
            columnSelect: true,
          }),
      remote
        ? null
        : h("section", { id: "transfer-actions" }, [
            h(TransferActions, {
              mode: queueMode.value,
              onPause: () => {
                queueEvents.push("pause");
                queueMode.value = "paused";
              },
              onResume: () => {
                queueEvents.push("resume");
                queueMode.value = "active";
              },
              onCancel: () => queueEvents.push("cancel"),
            }),
          ]),
      remote
        ? null
        : h(TacticalDropdown, {
            ref: "dropdown",
            modelValue: "save",
            mapOptions: true,
            filterable: true,
            options: [
              { label: gettext.$gettext("Save"), value: "save" },
              { label: gettext.$gettext("Cancel"), value: "cancel" },
            ],
          }),
      remote
        ? null
        : h("section", { id: "owned-transfer-actions" }, [
            h(TransferActions, {
              mode: "paused",
              ownedByOtherTab: true,
              resumeDisabled: true,
              onResume: () => queueEvents.push("invalid-owned-resume"),
            }),
          ]),
    ]);
  },
});
app.use(pinia);
app.use(Quasar, {
  plugins: { Notify },
  components: {
    QBtn,
    QCard,
    QCardSection,
    QCheckbox,
    QDialog,
    QForm,
    QInput,
    QSelect,
    QSeparator,
    QSpace,
    QSplitter,
    QTab,
    QTabPanel,
    QTabPanels,
    QTabs,
    QTooltip,
    QTable,
    QTh,
    QMenu,
    QOptionGroup,
    QList,
    QItem,
    QItemSection,
    QItemLabel,
    QIcon,
    QLinearProgress,
    QBadge,
  },
});
app.config.globalProperties.$axios = axios;
const dispatches: string[] = [];
app.config.globalProperties.$store = {
  dispatch(name: string) {
    dispatches.push(name);
    return Promise.resolve();
  },
};
const wait = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
};
const ready = (async () => {
  // Execute the actual production boot functions, including initialization before auth.
  await gettextBoot({ app } as never);
  const vm = app.mount("#app");
  await wait();
  return {
    vm,
    auth,
    gettext,
    hasLegacyApi: "$t" in app.config.globalProperties,
    locale,
    requests,
    dispatches,
    queueEvents,
    queueMode,
    wait,
    language: () => vm.$q.lang.isoName,
    setDashboardField(field: string | null) {
      state.dashboard = {
        ...baseDashboard,
        ...(field ? { [field]: "ru" } : {}),
      };
    },
    close() {
      app.unmount();
    },
  };
})();
(
  globalThis as typeof globalThis & { gettextReady: typeof ready }
).gettextReady = ready;
