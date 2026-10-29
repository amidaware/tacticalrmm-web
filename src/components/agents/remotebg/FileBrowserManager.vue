<template>
  <div
    ref="rootRef"
    class="file-browser column no-wrap q-pa-sm"
    :class="{ 'file-browser--dark': $q.dark.isActive }"
    tabindex="-1"
    @dragover="onBrowserDragOver"
    @drop="onBrowserDrop"
  >
    <FileBrowserPathBar
      :current-path="currentPath"
      :can-go-back="canGoBack"
      :can-go-forward="canGoForward"
      :agent-platform="agentPlatform"
      @back="goBack"
      @forward="goForward"
      @navigate="setPath"
    />

    <input
      ref="fileInputRef"
      type="file"
      class="hidden-file-input"
      multiple
      @change="onFileInputChange"
    />
    <input
      ref="resumeUploadFileInputRef"
      type="file"
      class="hidden-file-input"
      @change="onResumeUploadFileSelected"
    />

    <FileBrowserToolbar
      ref="toolbarRef"
      :has-upload-path="hasUploadPath"
      :selected-count="selectedRows.length"
      :search="search"
      :filter-match-count="filterLoadedCount"
      :filter-total-count="filterTotalCount"
      :listing-loading="listingBusy"
      :filter-searching="filterSearching"
      :show-transfers="showTransfersIndicator"
      :can-extract="selectedRows.length === 1 && isZipFileItem(selectedRows[0])"
      :transfers-label="transfersIndicatorLabel"
      :paused-count="pausedTransferCount"
      @upload="openFilePicker"
      @new-folder="openNewFolderDialog"
      @download="downloadSelectedItems"
      @delete="openDeleteDialog"
      @rename="openRenameDialog()"
      @properties="showPropertiesFromToolbar"
      @copy-path="copySelectedPathsToClipboard"
      @extract="openExtractDialog()"
      @refresh="refresh"
      @open-transfers="revealTransfers"
      @update:search="search = $event"
    />

    <FileBrowserUploadQueue
      v-if="visibleUploadQueueItems.length"
      :items="visibleUploadQueueItems"
      :destination-label="uploadDestinationLabel"
      :limits-caption="uploadLimitsCaption"
      @clear-finished="clearFinishedUploads"
      @hide-all="hideAllUploadItems"
      @dismiss="dismissUploadItem"
      @pause="pauseUploadItem"
      @resume="resumeUploadItem"
      @select-file="selectFileToResumeUpload"
      @cancel="cancelUploadItem"
      @hide="hideUploadItem"
    />

    <FileBrowserDownloadProgress
      v-if="showCompactSingleDownload && visibleSingleDownloadItem"
      :file-name="visibleSingleDownloadItem.name"
      :progress="visibleSingleDownloadItem.progress"
      :status="singleDownloadProgressStatus"
      :error-message="transferItemMessage(visibleSingleDownloadItem)"
      :message-code="visibleSingleDownloadItem.messageCode"
      :building-archive="
        visibleSingleDownloadItem.kind === 'archive' &&
        visibleSingleDownloadItem.status === 'initializing'
      "
      :owned-by-other-tab="!!visibleSingleDownloadItem.ownedByOtherTab"
      @pause="pauseDownloadItem(visibleSingleDownloadItem.id)"
      @resume="resumeDownloadItem(visibleSingleDownloadItem.id)"
      @cancel="cancelDownloadItem(visibleSingleDownloadItem.id)"
      @hide="hideDownloadItem(visibleSingleDownloadItem.id)"
      @dismiss="dismissDownloadItem(visibleSingleDownloadItem.id)"
    />

    <FileBrowserDownloadQueue
      v-if="showDownloadQueuePanel"
      :items="visibleDownloadQueueItems"
      :summary-caption="downloadQueueSummary ?? undefined"
      @clear-finished="clearFinishedDownloads"
      @hide-all="hideAllDownloadItems"
      @pause-all="pauseAllDownloads"
      @dismiss="dismissDownloadItem"
      @pause="pauseDownloadItem"
      @resume="resumeDownloadItem"
      @cancel="cancelDownloadItem"
      @hide="hideDownloadItem"
    />

    <FileBrowserExtractProgress
      v-if="extractJobs.length"
      :jobs="extractJobs"
      @cancel="cancelExtractJob"
    />

    <FileBrowserTable
      v-model:selected="selectedRows"
      :rows="filteredRows"
      :loading="loading || mutationSaving"
      :no-data-label="tableNoDataLabel"
      :empty-is-error="!!listError"
      :drop-enabled="hasUploadPath"
      :current-path="currentPath"
      :queue-room="uploadQueueRoom"
      :max-files-per-selection="MAX_UPLOAD_FILES_PER_SELECTION"
      :max-file-size-bytes="maxUploadFileSizeBytes"
      :filter-query="activeFilterQuery"
      :folder-item-count="rows.length"
      :list-total="listTotal"
      :has-more="listHasMore"
      :loading-more="loadingMore"
      :filter-active="!!committedFilter"
      @row-dblclick="onRowDoubleClick"
      @open-folder="openFolder"
      @download="downloadFromContext"
      @extract="openExtractDialog"
      @rename="openRenameDialog"
      @delete="openDeleteDialogFromContext"
      @properties="showProperties"
      @copy-path="copyPathFromContext"
      @files-dropped="onFilesDropped"
      @drop-rejected="onDropRejected"
      @clear-filter="clearFilterFromEmptyState"
      @load-more="loadMoreRows"
    />

    <FileBrowserPropertiesDialog
      v-model="propertiesDialog"
      :item="selectedPropertyItem"
      :loading="propertiesLoading"
      :error="propertiesError"
    />

    <FileBrowserNewFolderModal
      v-model="newFolderDialog"
      :existing-names="rowNames"
      :saving="mutationSaving"
      :platform="agentPlatform"
      @save="confirmNewFolder"
    />

    <FileBrowserExtractDialog
      v-model="extractDialog"
      :item="extractItem"
      :folder="currentPath"
      :saving="extractStarting"
      :platform="agentPlatform"
      @save="confirmExtract"
      @hide="extractItem = null"
    />

    <FileBrowserRenameModal
      v-model="renameDialog"
      :item="renameTargetItem"
      :existing-names="rowNames"
      :saving="mutationSaving"
      :platform="agentPlatform"
      @save="confirmRename"
      @hide="renameTargetItem = null"
    />

    <ConfirmDialog
      v-model="deleteDialog"
      :title="deleteConfirmTitle"
      :message="deleteConfirmBody"
      type="confirm"
      icon="warning"
      icon-color="orange"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import {
  setTransferMessage,
  setTransferFailureMessage,
  transferItemMessage,
} from "@/services/fileTransfer/queueMessages";
import { gettext } from "@/gettext";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toRef,
  watch,
} from "vue";
import { useQuasar } from "quasar";
import { useTimeoutFn } from "@vueuse/core";
import { isAxiosError } from "axios";

import {
  createAgentFileFolder,
  deleteAgentFiles,
  fetchAgentFileProperties,
  fetchAgentFiles,
  FILE_BROWSER_DEFAULT_PAGE_SIZE,
  renameAgentFile,
} from "@/api/agents";
import {
  cancelAgentFileDownload,
  cancelAgentFileExtract,
  cancelAgentFileUpload,
  checkAgentExistingNames,
  getAgentFileExtractStatus,
  initAgentFileExtract,
  listAgentFileTransfers,
} from "@/api/filebrowser";
import FileBrowserDownloadProgress from "@/components/agents/remotebg/FileBrowserDownloadProgress.vue";
import FileBrowserDownloadQueue from "@/components/agents/remotebg/FileBrowserDownloadQueue.vue";
import FileBrowserExtractDialog from "@/components/agents/remotebg/FileBrowserExtractDialog.vue";
import FileBrowserExtractProgress from "@/components/agents/remotebg/FileBrowserExtractProgress.vue";
import FileBrowserNewFolderModal from "@/components/agents/remotebg/FileBrowserNewFolderModal.vue";
import FileBrowserPathBar from "@/components/agents/remotebg/FileBrowserPathBar.vue";
import FileBrowserPropertiesDialog from "@/components/agents/remotebg/FileBrowserPropertiesDialog.vue";
import FileBrowserRenameModal from "@/components/agents/remotebg/FileBrowserRenameModal.vue";
import FileBrowserTable from "@/components/agents/remotebg/FileBrowserTable.vue";
import FileBrowserToolbar from "@/components/agents/remotebg/FileBrowserToolbar.vue";
import FileBrowserUploadConflictDialog from "@/components/agents/remotebg/FileBrowserUploadConflictDialog.vue";
import FileBrowserUploadQueue from "@/components/agents/remotebg/FileBrowserUploadQueue.vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import { useFileBrowser } from "@/composables/filebrowser";
import {
  MAX_ARCHIVE_PATHS,
  MAX_DELETE_PATHS_PER_REQUEST,
  MAX_DOWNLOAD_QUEUE_ITEMS,
  MAX_SEQUENTIAL_DOWNLOAD_FILES,
  MAX_UPLOAD_FILES_PER_SELECTION,
  MAX_UPLOAD_QUEUE_ITEMS,
  FILE_BROWSER_MAX_LOADED_ITEMS,
  FILE_BROWSER_LOAD_MORE_THRESHOLD,
  FILE_BROWSER_FILTER_DEBOUNCE_MS,
} from "@/constants/filebrowser";
import {
  FILE_TRANSFER_AUTO_RESUME_ATTEMPTS,
  FILE_TRANSFER_AUTO_RESUME_DELAY_MS,
  FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
} from "@/constants/fileTransfer";
import type {
  DownloadQueueItem,
  ExtractJob,
  FileBrowserDeleteResult,
  FileBrowserItem,
  UploadQueueItem,
} from "@/types/filebrowser";
import type {
  FileExtractStatusResponse,
  ResumableFileTransfer,
} from "@/types/fileTransfer";
import {
  isAbortError as isDownloadAbortError,
  runArchiveDownloadTransfer,
  runFileDownloadTransfer,
} from "@/services/fileTransfer/download";
import {
  isAbortError as isUploadAbortError,
  runFileUploadTransfer,
} from "@/services/fileTransfer/upload";
import {
  claimKeyForTransfer,
  itemMatchesTransferClaimKey,
  rekeyOrClaimTransferSession,
  releaseTransferClaim,
  setTransferAbortMode,
} from "@/services/fileTransfer/transferQueueHelpers";
import {
  archiveDownloadHandleIdbKey,
  archiveDownloadResumeKey,
  canPickDownloadSaveFile,
  canPickExistingDownloadFile,
  clearDownloadResume,
  clearDownloadResumeBySessionId,
  clearUploadResume,
  clearUploadResumeBySessionId,
  downloadBytesPathKey,
  downloadBytesSessionKey,
  downloadHandleIdbKey,
  downloadSessionHandleIdbKey,
  idbDeleteDownloadBytes,
  isAbortError,
  loadDownloadResume,
  loadUploadResume,
  persistDownloadFileHandle,
  pickDownloadSaveHandle,
  pickExistingDownloadHandle,
  queryFileHandlePermission,
  removeFileSystemFileHandle,
} from "@/services/fileTransfer/resume";
import {
  clearTransferPersistence,
  deleteLocalPausedEntry,
  matchesUploadFileIdentity,
  persistDownloadQueueMeta,
  persistUploadQueueMeta,
  reconcileResumableTransfers,
  hasStoredDownloadHandle,
  requestStoredDownloadHandle,
} from "@/services/fileTransfer/transferQueuePersist";
import {
  TransferStalledError,
  isRetryableTransferError,
} from "@/services/fileTransfer/sessionLimit";
import {
  createTransferTabSync,
  isTerminalTransferRelease,
  transferClaimKey,
  type TransferReleaseReason,
  type TransferTabSync,
  type TransferTabSyncEvent,
} from "@/services/fileTransfer/transferTabSync";
import { bytes2Human } from "@/utils/format";
import {
  dropRejectToastMessage,
  fileListToArray,
  classifyDownloadSelection,
  deriveArchiveDownloadName,
  fileBrowserDeleteErrorMessage,
  getFileBrowserErrorMessage,
  isDuplicateNameError,
  isLikelyProtectedDeletePath,
  getListFilesErrorMessage,
  normalizeFileBrowserFilterQuery,
  isListFilesAgentOfflineError,
  isListFilesPermissionError,
  isDownloadQueueItemActive,
  isDownloadQueueItemTerminal,
  isUploadQueueItemActive,
  isUploadQueueItemTerminal,
  isZipFileItem,
  listUploadNameConflicts,
  filesMatchingExistingNames,
  nameSegmentBaseRule,
  mapApiItemToFileBrowserItem,
  mapApiItemsToFileBrowserItems,
  normalizeAgentListPath,
  type DropOverlayRejectReason,
  type UploadConflictAction,
} from "@/utils/filebrowser";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "@/utils/notify";
import { copyOutput } from "@/utils/helpers";

const props = withDefaults(
  defineProps<{
    agent_id: string;
    agentPlatform?: string;
    maxUploadFileSizeBytes?: number;
  }>(),
  {
    agentPlatform: "windows",
    maxUploadFileSizeBytes: 0,
  },
);

const agentPlatform = toRef(props, "agentPlatform");

const $q = useQuasar();
const { normalizeNavPath, pathKeyForCompare, pathSeparator, pathsEqual } =
  useFileBrowser(agentPlatform);

const loading = ref(false);
const listError = ref<string | null>(null);
const currentPath = ref("");
const search = ref("");
const committedFilter = ref("");
const selectedRows = ref<FileBrowserItem[]>([]);
const toolbarRef = ref<{ focusSearch: () => void } | null>(null);
const rootRef = ref<HTMLElement | null>(null);

const history = ref<string[]>([]);
const historyIndex = ref(0);

const canGoBack = computed(() => historyIndex.value > 0);
const canGoForward = computed(
  () => historyIndex.value < history.value.length - 1,
);

const propertiesDialog = ref(false);
const selectedPropertyItem = ref<FileBrowserItem | null>(null);
const propertiesLoading = ref(false);
const propertiesError = ref<string | null>(null);

const newFolderDialog = ref(false);
const renameDialog = ref(false);
const renameTargetItem = ref<FileBrowserItem | null>(null);

const deleteDialog = ref(false);
const deletePendingItems = ref<FileBrowserItem[]>([]);

const fileInputRef = ref<HTMLInputElement | null>(null);
const resumeUploadFileInputRef = ref<HTMLInputElement | null>(null);
let resumeUploadTargetId: string | null = null;

const uploadQueue = ref<UploadQueueItem[]>([]);
const uploadAbortControllers = new Map<string, AbortController>();
const uploadAbortIntents = new Map<string, TransferAbortIntent>();
let uploadProcessorRunning = false;
let uploadListingNeedsRefresh = false;
let uploadIdSeq = 0;
let uploadNotifyBatchIds: Set<string> | null = null;

const downloadQueue = ref<DownloadQueueItem[]>([]);
type DownloadBatchResult = {
  succeeded: number;
  failed: number;
  paused: number;
  cancelled: number;
};
const downloadBatchResult = ref<DownloadBatchResult | null>(null);
const downloadQueueSummary = computed(() =>
  downloadBatchResult.value
    ? formatDownloadBatchSummary(downloadBatchResult.value)
    : null,
);
const downloadBatchIsSingle = ref(false);
const downloadAbortControllers = new Map<string, AbortController>();
const downloadAbortIntents = new Map<string, TransferAbortIntent>();
let downloadProcessorRunning = false;
let downloadIdSeq = 0;
let downloadStopAllRequested = false;
let loadSeq = 0;
let restoreSeq = 0;
const uploadClaimKeys = new Map<string, string>();
const downloadClaimKeys = new Map<string, string>();
let tabSyncHandler: ((event: TransferTabSyncEvent) => void) | null = null;
let tabSync: TransferTabSync | null = null;
let ownershipRefreshTimer: ReturnType<typeof setInterval> | null = null;

function getTabSync(): TransferTabSync {
  if (!tabSync) {
    tabSync = createTransferTabSync((event) => {
      tabSyncHandler?.(event);
    });
  }
  return tabSync;
}

const mutationSaving = ref(false);
const loadingMore = ref(false);
const listPage = ref(1);
const listHasMore = ref(false);
const listTotal = ref<number | null>(null);
const listSoftCapped = ref(false);

const visibleUploadQueueItems = computed(() =>
  uploadQueue.value.filter((item) => !item.hidden),
);

const hasUploadPath = computed(() => currentPath.value.trim().length > 0);

const uploadQueueRoom = computed(
  () => MAX_UPLOAD_QUEUE_ITEMS - uploadQueue.value.length,
);

const singleDownloadEntry = computed(() => {
  if (!downloadBatchIsSingle.value || downloadQueue.value.length !== 1) {
    return null;
  }
  return downloadQueue.value[0];
});

const visibleSingleDownloadItem = computed(() => {
  const item = singleDownloadEntry.value;
  if (!item || item.hidden) return null;
  return item;
});

const visibleDownloadQueueItems = computed(() =>
  downloadQueue.value.filter((item) => !item.hidden),
);

const showCompactSingleDownload = computed(
  () => !!visibleSingleDownloadItem.value,
);

const showDownloadQueuePanel = computed(
  () =>
    visibleDownloadQueueItems.value.length > 0 &&
    !showCompactSingleDownload.value,
);

const singleDownloadProgressStatus = computed((): DownloadTransferStatus => {
  const item = visibleSingleDownloadItem.value;
  if (!item) return "idle";
  if (item.status === "queued") return "initializing";
  return item.status as DownloadTransferStatus;
});

const pausedTransferCount = computed(() => {
  const pausedDownloads = downloadQueue.value.filter(
    (item) => item.status === "paused",
  ).length;
  const pausedUploads = uploadQueue.value.filter(
    (item) => item.status === "paused",
  ).length;
  return pausedDownloads + pausedUploads;
});

const activeTransferCount = computed(() => {
  const activeDownloads = downloadQueue.value.filter((item) =>
    isDownloadQueueItemActive(item.status),
  ).length;
  const activeUploads = uploadQueue.value.filter((item) =>
    isUploadQueueItemActive(item.status),
  ).length;
  return activeDownloads + activeUploads + extractJobs.value.length;
});

const showTransfersIndicator = computed(
  () => activeTransferCount.value > 0 || pausedTransferCount.value > 0,
);

const transfersIndicatorLabel = computed(() => {
  if (pausedTransferCount.value > 0) {
    return pausedTransferCount.value === 1
      ? gettext.$gettext("Transfers · 1 paused")
      : gettext.$gettext("Transfers · %{count} paused", {
          count: pausedTransferCount.value,
        });
  }
  return gettext.$gettext("Transfers");
});

// Replaced wholesale on every load; shallow so thousands of rows are not
// made deeply reactive.
const rows = shallowRef<FileBrowserItem[]>([]);

const rowNames = computed(() => rows.value.map((r) => r.name));

const uploadDestinationLabel = computed(() => {
  const visible = visibleUploadQueueItems.value;
  if (!visible.length) return "";
  const first = visible[0].destinationPath;
  const allSame = visible.every((i) => i.destinationPath === first);
  return allSame ? first : gettext.$gettext("Multiple folders");
});

const uploadLimitsCaption = computed(() => {
  const sizeLimit =
    props.maxUploadFileSizeBytes > 0
      ? gettext.$gettext("Up to %{sizeLimit} per file", {
          sizeLimit: bytes2Human(props.maxUploadFileSizeBytes),
        })
      : gettext.$gettext("No file size limit");
  return gettext.$ngettext(
    "%{sizeCaption} · Up to %{fileLimit} file per selection",
    "%{sizeCaption} · Up to %{fileLimit} files per selection",
    MAX_UPLOAD_FILES_PER_SELECTION,
    {
      sizeCaption: sizeLimit,
      fileLimit: MAX_UPLOAD_FILES_PER_SELECTION,
    },
  );
});

const filteredRows = computed(() => rows.value);

const activeFilterQuery = computed(() =>
  normalizeFileBrowserFilterQuery(search.value),
);

const filterSearching = computed(() => {
  const pending = normalizeFileBrowserFilterQuery(search.value);
  return pending !== committedFilter.value;
});

const listingBusy = computed(
  () => loading.value || (filterSearching.value && !!activeFilterQuery.value),
);

const filterLoadedCount = computed(() => rows.value.length);

const filterTotalCount = computed(() => {
  if (listTotal.value != null && listTotal.value >= 0) {
    return listTotal.value;
  }
  return rows.value.length;
});

const tableNoDataLabel = computed(() => {
  if (loading.value || filterSearching.value) return "";
  if (listError.value) return listError.value;
  if (committedFilter.value) {
    return gettext.$gettext("No files or folders match “%{query}”", {
      query: committedFilter.value,
    });
  }
  return gettext.$gettext("Folder is empty");
});

function clearFolderFilter() {
  cancelFilterDebounce();
  search.value = "";
  committedFilter.value = "";
}

function clearFilterFromEmptyState() {
  cancelFilterDebounce();
  if (search.value !== "") {
    search.value = "";
    return;
  }
  if (committedFilter.value !== "") {
    applyCommittedFilter("");
  }
}

function applyCommittedFilter(nextRaw: string) {
  const next = normalizeFileBrowserFilterQuery(nextRaw);
  if (next === committedFilter.value) return;
  committedFilter.value = next;
  selectedRows.value = [];
  void refresh();
}

const { start: scheduleFilterDebounce, stop: cancelFilterDebounce } =
  useTimeoutFn(
    () => {
      applyCommittedFilter(normalizeFileBrowserFilterQuery(search.value));
    },
    FILE_BROWSER_FILTER_DEBOUNCE_MS,
    { immediate: false },
  );

function resetListPagingState() {
  listPage.value = 1;
  listHasMore.value = false;
  listTotal.value = null;
  listSoftCapped.value = false;
  loadingMore.value = false;
}

function applyListPageMeta(data: {
  has_more?: boolean;
  page?: number;
  total?: number;
}) {
  listPage.value = Number(data.page) > 0 ? Number(data.page) : listPage.value;
  listHasMore.value = !!data.has_more && !listSoftCapped.value;
  if (typeof data.total === "number" && data.total >= 0) {
    listTotal.value = data.total;
  }
}

function appendUniqueRows(incoming: FileBrowserItem[]) {
  if (!incoming.length) return;
  if (!rows.value.length) {
    rows.value = incoming;
    return;
  }
  const existing = new Set(rows.value.map((r) => r.id));
  const added = incoming.filter((r) => !existing.has(r.id));
  if (added.length) {
    rows.value = rows.value.concat(added);
  }
}

function resetNavigationHistory(path: string) {
  history.value = [path];
  historyIndex.value = 0;
}

function initializeRootPath() {
  currentPath.value = "";
  history.value = [];
  historyIndex.value = 0;
}

async function refresh(opts?: { preserveSelection?: boolean }) {
  const path = normalizeNavPath(currentPath.value.trim());
  const preserveSelection = opts?.preserveSelection === true;
  const keptIds = preserveSelection
    ? new Set(selectedRows.value.map((row) => row.id))
    : null;

  const previousPath = currentPath.value;
  const requestingDefault = !path;
  const pathChanged =
    !previousPath ||
    !pathsEqual(previousPath, path) ||
    rows.value.length === 0 ||
    requestingDefault;

  if (path) {
    currentPath.value = path;
  }

  const seq = ++loadSeq;
  loading.value = true;
  loadingMore.value = false;
  listError.value = null;
  if (!preserveSelection) {
    selectedRows.value = [];
  }
  resetListPagingState();

  // Only clear rows when the folder actually changes.
  if (pathChanged) {
    rows.value = [];
  }

  try {
    const data = await fetchAgentFiles(
      props.agent_id,
      path,
      1,
      FILE_BROWSER_DEFAULT_PAGE_SIZE,
      agentPlatform.value,
      committedFilter.value,
    );
    if (seq !== loadSeq) return;

    const resolvedPath = (data.path || path || "").trim();
    if (!resolvedPath) {
      throw new Error(
        gettext.$gettext("Agent did not return a browsable path"),
      );
    }

    currentPath.value = resolvedPath;
    if (requestingDefault || history.value.length === 0) {
      resetNavigationHistory(resolvedPath);
    }

    rows.value = mapApiItemsToFileBrowserItems(
      data.items ?? [],
      agentPlatform.value,
    );
    applyListPageMeta(data);
    listError.value = null;
    if (keptIds && keptIds.size) {
      selectedRows.value = rows.value.filter((row) => keptIds.has(row.id));
    }
  } catch (err: unknown) {
    if (seq !== loadSeq) return;

    rows.value = [];
    selectedRows.value = [];
    resetListPagingState();
    const message = getListFilesErrorMessage(err);
    listError.value = message;

    if (isListFilesPermissionError(err)) {
      notifyError(message);
    } else if (isListFilesAgentOfflineError(err)) {
      notifyWarning(message);
    }
  } finally {
    if (seq === loadSeq) {
      loading.value = false;
    }
  }
}

async function loadMoreRows() {
  if (
    loading.value ||
    loadingMore.value ||
    !listHasMore.value ||
    listSoftCapped.value
  ) {
    return;
  }

  if (rows.value.length >= FILE_BROWSER_MAX_LOADED_ITEMS) {
    listSoftCapped.value = true;
    listHasMore.value = false;
    notifyInfo(
      committedFilter.value
        ? gettext.$ngettext(
            "Showing the first %{count} match in this folder.",
            "Showing the first %{count} matches in this folder.",
            FILE_BROWSER_MAX_LOADED_ITEMS,
            {
              count: FILE_BROWSER_MAX_LOADED_ITEMS.toLocaleString(),
            },
          )
        : gettext.$ngettext(
            "Showing the first %{count} item in this folder.",
            "Showing the first %{count} items in this folder.",
            FILE_BROWSER_MAX_LOADED_ITEMS,
            {
              count: FILE_BROWSER_MAX_LOADED_ITEMS.toLocaleString(),
            },
          ),
    );
    return;
  }

  const path = normalizeNavPath(currentPath.value.trim());
  if (!path) return;

  const seq = loadSeq;
  const nextPage = listPage.value + 1;
  loadingMore.value = true;

  try {
    const data = await fetchAgentFiles(
      props.agent_id,
      path,
      nextPage,
      FILE_BROWSER_DEFAULT_PAGE_SIZE,
      agentPlatform.value,
      committedFilter.value,
    );
    if (seq !== loadSeq) return;

    const mapped = mapApiItemsToFileBrowserItems(
      data.items ?? [],
      agentPlatform.value,
    );
    appendUniqueRows(mapped);
    applyListPageMeta(data);

    if (
      rows.value.length >= FILE_BROWSER_MAX_LOADED_ITEMS &&
      listHasMore.value
    ) {
      listSoftCapped.value = true;
      listHasMore.value = false;
      notifyInfo(
        committedFilter.value
          ? gettext.$ngettext(
              "Showing the first %{count} match in this folder.",
              "Showing the first %{count} matches in this folder.",
              FILE_BROWSER_MAX_LOADED_ITEMS,
              {
                count: FILE_BROWSER_MAX_LOADED_ITEMS.toLocaleString(),
              },
            )
          : gettext.$ngettext(
              "Showing the first %{count} item in this folder.",
              "Showing the first %{count} items in this folder.",
              FILE_BROWSER_MAX_LOADED_ITEMS,
              {
                count: FILE_BROWSER_MAX_LOADED_ITEMS.toLocaleString(),
              },
            ),
      );
    }
  } catch (err: unknown) {
    if (seq !== loadSeq) return;
    const message = getListFilesErrorMessage(err);
    notifyWarning(
      message ||
        gettext.$gettext("Unable to load more items. Scroll again to retry."),
    );
  } finally {
    if (seq === loadSeq) {
      loadingMore.value = false;
    }
  }
}

function startOwnershipRefreshTimer(): void {
  if (ownershipRefreshTimer) return;
  ownershipRefreshTimer = setInterval(() => {
    applyRemoteOwnershipFlags();
  }, 5_000);
}

function stopOwnershipRefreshTimer(): void {
  if (!ownershipRefreshTimer) return;
  clearInterval(ownershipRefreshTimer);
  ownershipRefreshTimer = null;
}

function persistQueuesAsPaused(agentId: string = props.agent_id): void {
  for (const item of downloadQueue.value) {
    if (isDownloadQueueItemTerminal(item.status)) continue;
    void persistDownloadQueueMeta(agentId, item);
  }
  for (const item of uploadQueue.value) {
    if (isUploadQueueItemTerminal(item.status)) continue;
    void persistUploadQueueMeta(agentId, item);
  }
}

// Resume stalled transfers automatically. Gives up after a few attempts
// without progress and leaves it to the user.
const autoResumeState = new Map<string, { attempts: number; offset: number }>();
const autoResumeTimers = new Set<ReturnType<typeof setTimeout>>();

function scheduleAutoResume(
  item: DownloadQueueItem | UploadQueueItem,
  err: unknown,
  resume: (id: string) => unknown,
): boolean {
  const state = autoResumeState.get(item.id);
  if (!(err instanceof TransferStalledError) && !state) return false;
  const offset = item.committedOffset ?? 0;
  const attempts = state && offset <= state.offset ? state.attempts : 0;
  if (attempts >= FILE_TRANSFER_AUTO_RESUME_ATTEMPTS) {
    autoResumeState.delete(item.id);
    return false;
  }
  autoResumeState.set(item.id, { attempts: attempts + 1, offset });
  const timer = setTimeout(() => {
    autoResumeTimers.delete(timer);
    const current =
      findDownloadItem(item.id) ?? findUploadItem(item.id) ?? undefined;
    if (
      current?.status === "paused" &&
      current.messageCode === "reconnecting"
    ) {
      void resume(item.id);
    }
  }, FILE_TRANSFER_AUTO_RESUME_DELAY_MS);
  autoResumeTimers.add(timer);
  return true;
}

function clearAutoResumeTimers(): void {
  for (const timer of autoResumeTimers) clearTimeout(timer);
  autoResumeTimers.clear();
  autoResumeState.clear();
}

function pauseInFlightTransfersForUnload(
  agentId: string = props.agent_id,
): void {
  pauseAllDownloads();
  pauseAllUploads();
  persistQueuesAsPaused(agentId);
}

function onPageHidePause(): void {
  pauseInFlightTransfersForUnload();
  stopExtractPolling();
}

function onPageShow(e: PageTransitionEvent): void {
  // back from the bfcache: pagehide stopped the extract polls
  if (!e.persisted) return;
  for (const job of extractJobs.value) scheduleExtractPoll(job.sessionId, 0);
}

let findShortcutAttached = false;

function attachFindShortcut(): void {
  if (findShortcutAttached) return;
  window.addEventListener("keydown", onGlobalFindShortcut);
  findShortcutAttached = true;
}

function detachFindShortcut(): void {
  if (!findShortcutAttached) return;
  window.removeEventListener("keydown", onGlobalFindShortcut);
  findShortcutAttached = false;
}

onMounted(() => {
  tabSyncHandler = onTransferTabSyncEvent;
  tabSync?.close();
  tabSync = createTransferTabSync((event) => {
    tabSyncHandler?.(event);
  });
  initializeRootPath();
  void refresh();
  const seq = ++restoreSeq;
  void restoreResumableTransfers(seq);
  getTabSync().query();
  startOwnershipRefreshTimer();
  attachFindShortcut();
  window.addEventListener("pagehide", onPageHidePause);
  window.addEventListener("pageshow", onPageShow);
});

onBeforeUnmount(() => {
  clearAutoResumeTimers();
  pauseInFlightTransfersForUnload();
  cancelFilterDebounce();
  detachFindShortcut();
  window.removeEventListener("pagehide", onPageHidePause);
  window.removeEventListener("pageshow", onPageShow);
  stopExtractPolling();
  stopOwnershipRefreshTimer();
  tabSyncHandler = null;
  tabSync?.close();
  tabSync = null;
});

watch(
  () => [props.agent_id, props.agentPlatform] as const,
  (_next, [previousAgentId]) => {
    // The queues still belong to the previous agent; save them under its id.
    pauseInFlightTransfersForUnload(previousAgentId);
    const seq = ++restoreSeq;
    clearFolderFilter();
    initializeRootPath();
    void refresh();
    releaseAllLocalClaims("unmount");
    uploadQueue.value = [];
    downloadQueue.value = [];
    downloadBatchResult.value = null;
    stopExtractPolling();
    extractJobs.value = [];
    void restoreResumableTransfers(seq);
    getTabSync().query();
  },
);

watch(search, (value) => {
  const next = normalizeFileBrowserFilterQuery(value);
  if (!next) {
    cancelFilterDebounce();
    if (committedFilter.value !== "") {
      applyCommittedFilter("");
    }
    return;
  }
  scheduleFilterDebounce();
});

watch(
  filteredRows,
  (visible) => {
    if (!selectedRows.value.length) return;
    const ids = new Set(visible.map((r) => r.id));
    const next = selectedRows.value.filter((s) => ids.has(s.id));
    if (next.length !== selectedRows.value.length) {
      selectedRows.value = next;
    }
  },
  { flush: "post" },
);

watch(
  [loadingMore, listHasMore, filteredRows, loading, committedFilter],
  () => {
    if (committedFilter.value) return;
    if (loading.value || loadingMore.value || !listHasMore.value) return;
    if (filteredRows.value.length > FILE_BROWSER_LOAD_MORE_THRESHOLD) return;
    window.setTimeout(() => {
      if (committedFilter.value) return;
      if (loading.value || loadingMore.value || !listHasMore.value) return;
      if (filteredRows.value.length > FILE_BROWSER_LOAD_MORE_THRESHOLD) return;
      void loadMoreRows();
    }, 50);
  },
  { flush: "post" },
);

const deleteConfirmTitle = computed(() => {
  const pending = deletePendingItems.value;
  if (pending.length === 0) return "";
  if (pending.length === 1)
    return gettext.$gettext('Delete "%{name}" ?', { name: pending[0].name });
  return gettext.$ngettext(
    "Delete %{count} item?",
    "Delete %{count} items ?",
    pending.length,
    { count: pending.length },
  );
});

const pendingDeleteLooksProtected = computed(() =>
  deletePendingItems.value.some((item) =>
    isLikelyProtectedDeletePath(item.path, agentPlatform.value),
  ),
);

const deleteConfirmBody = computed(() => {
  const n = deletePendingItems.value.length;
  if (n === 0) return "";
  if (pendingDeleteLooksProtected.value) {
    return n === 1
      ? gettext.$gettext(
          "This looks like a protected system folder. The agent will refuse to delete it.",
        )
      : gettext.$gettext(
          "One or more items look like protected system folders. The agent will refuse to delete those paths.",
        );
  }
  if (n === 1)
    return gettext.$gettext("This item will be permanently deleted.");
  return gettext.$gettext("These items will be permanently deleted.");
});

function openNewFolderDialog() {
  if (!hasUploadPath.value) {
    notifyWarning(
      gettext.$gettext("Select a folder path before creating a folder."),
    );
    return;
  }
  newFolderDialog.value = true;
}

async function confirmNewFolder(name: string) {
  if (mutationSaving.value) return;

  const parentPath = normalizeNavPath(currentPath.value.trim());
  if (!parentPath) {
    notifyWarning(
      gettext.$gettext("Select a folder path before creating a folder."),
    );
    return;
  }

  mutationSaving.value = true;
  try {
    await createAgentFileFolder(
      props.agent_id,
      parentPath,
      name,
      agentPlatform.value,
    );
    newFolderDialog.value = false;
    notifySuccess(gettext.$gettext("Folder created"));
    await refresh();
  } catch (err: unknown) {
    const message = getFileBrowserErrorMessage(
      err,
      gettext.$gettext("Unable to create folder."),
    );
    notifyError(message);
    if (isDuplicateNameError(err)) {
      void refresh();
    }
  } finally {
    mutationSaving.value = false;
  }
}

function openRenameDialog(row?: FileBrowserItem) {
  const item = row ?? selectedRows.value[0];
  if (!item) {
    notifyWarning(gettext.$gettext("Select a single item to rename."));
    return;
  }
  renameTargetItem.value = item;
  renameDialog.value = true;
}

async function confirmRename(newName: string) {
  if (mutationSaving.value) return;

  const target = renameTargetItem.value;
  if (!target) return;

  mutationSaving.value = true;
  try {
    await renameAgentFile(
      props.agent_id,
      normalizeNavPath(target.path),
      newName,
      agentPlatform.value,
    );
    renameDialog.value = false;
    renameTargetItem.value = null;
    notifySuccess(gettext.$gettext("Renamed"));
    await refresh();
  } catch (err: unknown) {
    const message = getFileBrowserErrorMessage(
      err,
      gettext.$gettext("Unable to rename item."),
    );
    notifyError(message);
    if (isDuplicateNameError(err)) {
      void refresh();
    }
  } finally {
    mutationSaving.value = false;
  }
}

function openDeleteDialog() {
  if (selectedRows.value.length === 0) {
    notifyWarning(gettext.$gettext("Select one or more items to delete."));
    return;
  }
  if (selectedRows.value.length > MAX_DELETE_PATHS_PER_REQUEST) {
    notifyWarning(
      gettext.$ngettext(
        "Select at most %{limit} item to delete at once.",
        "Select at most %{limit} items to delete at once.",
        MAX_DELETE_PATHS_PER_REQUEST,
        {
          limit: MAX_DELETE_PATHS_PER_REQUEST,
        },
      ),
    );
    return;
  }
  deletePendingItems.value = [...selectedRows.value];
  deleteDialog.value = true;
}

function openDeleteDialogFromContext(row: FileBrowserItem) {
  const selected = selectedRows.value;
  const inSelection = selected.some((s) => s.id === row.id);
  const pending = inSelection && selected.length > 0 ? [...selected] : [row];
  if (pending.length > MAX_DELETE_PATHS_PER_REQUEST) {
    notifyWarning(
      gettext.$ngettext(
        "Select at most %{limit} item to delete at once.",
        "Select at most %{limit} items to delete at once.",
        MAX_DELETE_PATHS_PER_REQUEST,
        {
          limit: MAX_DELETE_PATHS_PER_REQUEST,
        },
      ),
    );
    return;
  }
  deletePendingItems.value = pending;
  deleteDialog.value = true;
}

function pendingItemName(
  pending: FileBrowserItem[],
  resultPath: string,
): string {
  const match = pending.find((item) => pathsEqual(item.path, resultPath));
  return match?.name ?? resultPath.split(/[/\\]/).pop() ?? resultPath;
}

function isDeleteAlreadyGone(error?: string): boolean {
  return /path not found/i.test((error ?? "").trim());
}

function notifyDeleteResults(
  pending: FileBrowserItem[],
  results: FileBrowserDeleteResult[],
) {
  const succeeded = results.filter((result) => result.success);
  const alreadyGone = results.filter(
    (result) => !result.success && isDeleteAlreadyGone(result.error),
  );
  const failed = results.filter(
    (result) => !result.success && !isDeleteAlreadyGone(result.error),
  );

  if (failed.length === 0) {
    if (succeeded.length === 1 && alreadyGone.length === 0) {
      notifySuccess(
        gettext.$gettext('Deleted "%{name}".', {
          name: pendingItemName(pending, succeeded[0].path),
        }),
      );
    } else if (succeeded.length > 1 && alreadyGone.length === 0) {
      notifySuccess(
        gettext.$ngettext(
          "Deleted %{count} item.",
          "Deleted %{count} items.",
          succeeded.length,
          {
            count: succeeded.length,
          },
        ),
      );
    } else if (succeeded.length > 0 && alreadyGone.length > 0) {
      notifySuccess(
        succeeded.length === 1
          ? gettext.$gettext('Deleted "%{name}".', {
              name: pendingItemName(pending, succeeded[0].path),
            })
          : gettext.$ngettext(
              "Deleted %{count} item.",
              "Deleted %{count} items.",
              succeeded.length,
              {
                count: succeeded.length,
              },
            ),
      );
    }

    if (alreadyGone.length === 1) {
      notifyInfo(
        gettext.$gettext(
          '"%{name}" was already gone on the agent. The list has been updated.',
          {
            name: pendingItemName(pending, alreadyGone[0].path),
          },
        ),
      );
    } else if (alreadyGone.length > 1) {
      notifyInfo(
        gettext.$ngettext(
          "%{count} item was already gone on the agent. The list has been updated.",
          "%{count} items were already gone on the agent. The list has been updated.",
          alreadyGone.length,
          {
            count: alreadyGone.length,
          },
        ),
      );
    }
    return;
  }

  if (succeeded.length === 0 && alreadyGone.length === 0) {
    const detail = failed
      .map((result) => {
        const name = pendingItemName(pending, result.path);
        return result.error
          ? `${name}: ${fileBrowserDeleteErrorMessage(result.error)}`
          : name;
      })
      .join("; ");
    notifyError(detail || gettext.$gettext("Unable to delete items."));
    return;
  }

  const removed = succeeded.length + alreadyGone.length;
  notifyWarning(
    gettext.$ngettext(
      "Removed %{removed} of %{total} item. %{failed} failed.",
      "Removed %{removed} of %{total} items. %{failed} failed.",
      results.length,
      {
        removed: removed,
        total: results.length,
        failed: failed.length,
      },
    ),
  );
}

async function confirmDelete() {
  if (mutationSaving.value) return;

  const pending = [...deletePendingItems.value];
  if (!pending.length) return;

  mutationSaving.value = true;
  try {
    const data = await deleteAgentFiles(
      props.agent_id,
      pending.map((item) => item.path),
      agentPlatform.value,
    );
    selectedRows.value = [];
    deletePendingItems.value = [];
    notifyDeleteResults(pending, data.results ?? []);
    await refresh();
  } catch (err: unknown) {
    notifyError(
      getFileBrowserErrorMessage(
        err,
        gettext.$gettext("Unable to delete items."),
      ),
    );
  } finally {
    mutationSaving.value = false;
  }
}

function resetDownloadUiState() {
  downloadQueue.value = [];
  downloadBatchResult.value = null;
  downloadBatchIsSingle.value = false;
}

const EXTRACT_POLL_MS = 1000;
const EXTRACT_POLL_HIDDEN_MS = 3000;
const EXTRACT_TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

const extractDialog = ref(false);
const extractItem = ref<FileBrowserItem | null>(null);
const extractStarting = ref(false);
const extractJobs = ref<ExtractJob[]>([]);
const extractPollTimers = new Map<string, number>();
const extractPollAborts = new Map<string, AbortController>();
// Bumped to drop polls that belong to a previous agent or an unloaded page.
let extractPollSeq = 0;

function openExtractDialog(item?: FileBrowserItem) {
  const target = item ?? selectedRows.value[0];
  if (selectedRows.value.length > 1 && !item) {
    notifyWarning(gettext.$gettext("Select a single .zip file to extract."));
    return;
  }
  if (!isZipFileItem(target)) {
    notifyWarning(gettext.$gettext("Select a single .zip file to extract."));
    return;
  }
  extractItem.value = target;
  extractDialog.value = true;
}

async function confirmExtract(value: {
  destination: string;
  conflictPolicy: "skip" | "replace";
}) {
  const item = extractItem.value;
  if (!item) return;
  extractStarting.value = true;
  try {
    const data = await initAgentFileExtract(props.agent_id, {
      source_path: item.path,
      destination_path: value.destination,
      conflict_policy: value.conflictPolicy,
    });
    extractDialog.value = false;
    trackExtractJob({
      sessionId: data.session_id,
      name: item.name,
      destination: value.destination,
      status: data.status,
      written: 0,
      total: 0,
      filesDone: 0,
      filesTotal: 0,
    });
  } catch (err: unknown) {
    notifyError(
      getFileBrowserErrorMessage(
        err,
        gettext.$gettext("Unable to start the extraction."),
      ),
    );
  } finally {
    extractStarting.value = false;
  }
}

function extractJobFromTransfer(transfer: ResumableFileTransfer): ExtractJob {
  return {
    sessionId: transfer.session_id,
    name: transfer.filename,
    destination: transfer.destination_path,
    status: transfer.status,
    written: transfer.committed_offset,
    total: transfer.total_size,
    filesDone: transfer.files_done ?? 0,
    filesTotal: transfer.files_total ?? 0,
  };
}

function trackExtractJob(job: ExtractJob) {
  if (extractJobs.value.some((j) => j.sessionId === job.sessionId)) return;
  extractJobs.value.push(job);
  scheduleExtractPoll(job.sessionId, 0);
}

function scheduleExtractPoll(sessionId: string, delay: number) {
  window.clearTimeout(extractPollTimers.get(sessionId));
  const seq = extractPollSeq;
  extractPollTimers.set(
    sessionId,
    window.setTimeout(() => void pollExtract(sessionId, seq), delay),
  );
}

function stopExtractPolling() {
  extractPollSeq++;
  for (const timer of extractPollTimers.values()) window.clearTimeout(timer);
  extractPollTimers.clear();
  for (const controller of extractPollAborts.values()) controller.abort();
  extractPollAborts.clear();
}

async function pollExtract(sessionId: string, seq: number) {
  extractPollTimers.delete(sessionId);
  if (seq !== extractPollSeq) return;
  const controller = new AbortController();
  extractPollAborts.set(sessionId, controller);
  let data: FileExtractStatusResponse;
  try {
    data = await getAgentFileExtractStatus(
      props.agent_id,
      sessionId,
      controller.signal,
    );
  } catch (err: unknown) {
    if (seq !== extractPollSeq || controller.signal.aborted) return;
    const code = isAxiosError(err) ? err.response?.status : undefined;
    // a 4xx won't fix itself (e.g. the permission was removed); stop polling
    if (code && code >= 400 && code < 500 && code !== 408 && code !== 429) {
      removeExtractJob(sessionId);
      if (code !== 404) {
        notifyError(
          getFileBrowserErrorMessage(
            err,
            gettext.$gettext("Unable to check the extraction."),
          ),
        );
      }
      return;
    }
    // e.g. a server restart: keep trying, the agent keeps extracting
    scheduleExtractPoll(sessionId, EXTRACT_POLL_HIDDEN_MS);
    return;
  } finally {
    extractPollAborts.delete(sessionId);
  }
  if (seq !== extractPollSeq) return;

  const job = extractJobs.value.find((j) => j.sessionId === sessionId);
  if (!job) return;
  Object.assign(job, {
    status: data.status,
    written: data.committed_offset,
    total: data.total_size,
    filesDone: data.files_done,
    filesTotal: data.files_total,
  });
  if (EXTRACT_TERMINAL_STATUSES.has(data.status)) {
    finishExtractJob(job, data);
    return;
  }
  scheduleExtractPoll(
    sessionId,
    document.hidden ? EXTRACT_POLL_HIDDEN_MS : EXTRACT_POLL_MS,
  );
}

function removeExtractJob(sessionId: string) {
  window.clearTimeout(extractPollTimers.get(sessionId));
  extractPollTimers.delete(sessionId);
  extractJobs.value = extractJobs.value.filter(
    (j) => j.sessionId !== sessionId,
  );
}

function fileCountLabel(n: number): string {
  return gettext.$ngettext("%{count} file", "%{count} files", n, { count: n });
}

function finishExtractJob(job: ExtractJob, data: FileExtractStatusResponse) {
  removeExtractJob(job.sessionId);
  const files = fileCountLabel(data.files_done);
  if (data.status === "completed") {
    let message = gettext.$gettext('Extracted %{count} from "%{archiveName}"', {
      count: files,
      archiveName: job.name,
    });
    if (data.files_skipped > 0) {
      message += gettext.$gettext(" · %{count} skipped (already existed)", {
        count: data.files_skipped.toLocaleString(),
      });
    }
    const warnings = data.warnings ?? [];
    if (warnings.length > 0) {
      const shown = warnings.slice(0, 5).join("; ");
      const extra =
        warnings.length > 5
          ? gettext.$gettext(" (+%{count} more)", {
              count: warnings.length - 5,
            })
          : "";
      notifyWarning(
        gettext.$gettext(
          "%{summary}. Some items were not extracted: %{errors}%{remainingWarnings}",
          {
            summary: message,
            errors: shown,
            remainingWarnings: extra,
          },
        ),
      );
    } else {
      notifySuccess(message);
    }
  } else if (data.status === "cancelled") {
    notifyInfo(
      gettext.$gettext(
        "Extraction cancelled. %{count} extracted before cancel.",
        {
          count: files,
        },
      ),
    );
  } else {
    const kept =
      data.files_done > 0
        ? gettext.$gettext(" %{count} extracted before it stopped.", {
            count: files,
          })
        : "";
    notifyError(
      gettext.$gettext(
        'Extracting "%{archiveName}" failed: %{error}%{progress}',
        {
          archiveName: job.name,
          error: data.error || gettext.$gettext("unknown error"),
          progress: kept,
        },
      ),
    );
  }
  if (extractAffectsListing(job.destination)) {
    void refresh({ preserveSelection: true });
  }
}

function isPathInside(child: string, parent: string): boolean {
  const c = pathKeyForCompare(child);
  const p = pathKeyForCompare(parent);
  const prefix = p.endsWith(pathSeparator.value) ? p : p + pathSeparator.value;
  return c !== p && c.startsWith(prefix);
}

// The destination is this folder, inside it, or one of its parents.
function extractAffectsListing(destination: string): boolean {
  const current = currentPath.value;
  if (!current) return false;
  return (
    pathsEqual(destination, current) ||
    isPathInside(destination, current) ||
    isPathInside(current, destination)
  );
}

async function cancelExtractJob(sessionId: string) {
  const job = extractJobs.value.find((j) => j.sessionId === sessionId);
  if (!job || job.cancelling) return;
  job.cancelling = true;
  try {
    await cancelAgentFileExtract(props.agent_id, sessionId);
    // the next poll reports the final status and counts
    scheduleExtractPoll(sessionId, 0);
  } catch (err: unknown) {
    job.cancelling = false;
    notifyError(
      getFileBrowserErrorMessage(
        err,
        gettext.$gettext("Unable to cancel the extraction."),
      ),
    );
  }
}

function revealTransfers() {
  for (const item of downloadQueue.value) {
    if (
      item.hidden &&
      (item.status === "paused" ||
        isDownloadQueueItemActive(item.status) ||
        item.status === "queued")
    ) {
      item.hidden = false;
      if (item.status === "paused") {
        void persistDownloadQueueMeta(props.agent_id, item);
      }
    }
  }
  for (const item of uploadQueue.value) {
    if (
      item.hidden &&
      (item.status === "paused" ||
        isUploadQueueItemActive(item.status) ||
        item.status === "queued")
    ) {
      item.hidden = false;
      if (item.status === "paused") {
        void persistUploadQueueMeta(props.agent_id, item);
      }
    }
  }
}

function claimKeyForUpload(item: UploadQueueItem): string {
  return claimKeyForTransfer(props.agent_id, item);
}

function claimKeyForDownload(item: DownloadQueueItem): string {
  return claimKeyForTransfer(props.agent_id, item);
}

function itemMatchesClaimKey(
  item: { id: string; sessionId?: string },
  key: string,
): boolean {
  return itemMatchesTransferClaimKey(props.agent_id, item, key);
}

function applyRemoteOwnershipFlags(): void {
  for (const item of uploadQueue.value) {
    if (isUploadQueueItemTerminal(item.status)) {
      item.ownedByOtherTab = false;
      continue;
    }
    const held = uploadClaimKeys.get(item.id);
    item.ownedByOtherTab =
      !held && getTabSync().isRemotelyOwned(claimKeyForUpload(item));
  }
  for (const item of downloadQueue.value) {
    if (isDownloadQueueItemTerminal(item.status)) {
      item.ownedByOtherTab = false;
      continue;
    }
    const held = downloadClaimKeys.get(item.id);
    item.ownedByOtherTab =
      !held && getTabSync().isRemotelyOwned(claimKeyForDownload(item));
  }
}

function releaseUploadClaim(
  itemId: string,
  reason: TransferReleaseReason,
): void {
  releaseTransferClaim(uploadClaimKeys, itemId, reason, getTabSync());
}

function releaseDownloadClaim(
  itemId: string,
  reason: TransferReleaseReason,
): void {
  releaseTransferClaim(downloadClaimKeys, itemId, reason, getTabSync());
}

function releaseAllLocalClaims(reason: TransferReleaseReason): void {
  uploadClaimKeys.clear();
  downloadClaimKeys.clear();
  getTabSync().releaseAll(reason);
}

function broadcastCancelForItem(item: {
  id: string;
  sessionId?: string;
}): void {
  const sessionKey = transferClaimKey(props.agent_id, {
    sessionId: item.sessionId,
    queueId: item.id,
  });
  const localKey = transferClaimKey(props.agent_id, { queueId: item.id });
  getTabSync().release(sessionKey, "cancel");
  if (localKey !== sessionKey) {
    getTabSync().release(localKey, "cancel");
  }
}

function yieldLocalTransferForClaimKey(key: string): void {
  for (const item of uploadQueue.value) {
    if (!itemMatchesClaimKey(item, key)) continue;
    if (isUploadQueueItemTerminal(item.status)) continue;
    uploadClaimKeys.delete(item.id);
    if (item.status === "queued") {
      item.status = "paused";
      continue;
    }
    if (isUploadQueueItemActive(item.status)) {
      setTransferAbortMode(
        uploadAbortIntents,
        uploadAbortControllers,
        item.id,
        "pause",
      );
    }
  }
  for (const item of downloadQueue.value) {
    if (!itemMatchesClaimKey(item, key)) continue;
    if (isDownloadQueueItemTerminal(item.status)) continue;
    downloadClaimKeys.delete(item.id);
    if (item.status === "queued") {
      item.status = "paused";
      continue;
    }
    if (isDownloadQueueItemActive(item.status)) {
      setTransferAbortMode(
        downloadAbortIntents,
        downloadAbortControllers,
        item.id,
        "pause",
      );
    }
  }
}

function abortLocalTransferForClaimKey(key: string): void {
  for (const item of uploadQueue.value) {
    if (!itemMatchesClaimKey(item, key)) continue;

    if (item.status === "paused") {
      item.status = "cancelled";
      item.hidden = false;
      setTransferMessage(item);
      item.ownedByOtherTab = false;
      item.sessionId = undefined;
      releaseUploadClaim(item.id, "cancel");
      deleteLocalPausedEntry(props.agent_id, item.id);
      if (item.file) {
        clearUploadResume(props.agent_id, item.file, item.destinationPath);
      }
      continue;
    }

    if (
      item.status === "uploading" ||
      item.status === "queued" ||
      isUploadQueueItemActive(item.status)
    ) {
      setTransferAbortMode(
        uploadAbortIntents,
        uploadAbortControllers,
        item.id,
        "cancel",
      );
      if (item.status === "queued") {
        item.status = "cancelled";
        item.ownedByOtherTab = false;
        releaseUploadClaim(item.id, "cancel");
        deleteLocalPausedEntry(props.agent_id, item.id);
      }
    }
  }
  for (const item of downloadQueue.value) {
    if (!itemMatchesClaimKey(item, key)) continue;

    if (item.status === "paused") {
      const resumeScopeKey =
        item.kind === "archive" && item.archivePaths?.length
          ? archiveDownloadResumeKey(props.agent_id, item.archivePaths)
          : item.sourcePath;
      const handleKey =
        item.kind === "archive" && item.archivePaths?.length
          ? archiveDownloadHandleIdbKey(props.agent_id, item.archivePaths)
          : downloadHandleIdbKey(props.agent_id, item.sourcePath);
      const sid = item.sessionId;

      item.status = "cancelled";
      item.hidden = false;
      setTransferMessage(item);
      item.ownedByOtherTab = false;
      item.sessionId = undefined;
      releaseDownloadClaim(item.id, "cancel");
      deleteLocalPausedEntry(props.agent_id, item.id);
      if (sid) {
        clearDownloadResumeBySessionId(sid);
      }
      clearDownloadResume(props.agent_id, resumeScopeKey);
      void clearTransferPersistence(props.agent_id, sid, {
        handleKey,
        localQueueId: item.id,
      });
      continue;
    }

    if (item.status === "queued" || isDownloadQueueItemActive(item.status)) {
      setTransferAbortMode(
        downloadAbortIntents,
        downloadAbortControllers,
        item.id,
        "cancel",
      );
      if (item.status === "queued") {
        item.status = "cancelled";
        item.ownedByOtherTab = false;
        releaseDownloadClaim(item.id, "cancel");
        deleteLocalPausedEntry(props.agent_id, item.id);
      }
    }
  }
}

function dropLocalTransfersForRemoteTerminal(key: string): void {
  const dropDownloads = downloadQueue.value.filter((item) =>
    itemMatchesClaimKey(item, key),
  );
  for (const item of dropDownloads) {
    if (isDownloadQueueItemActive(item.status)) {
      setTransferAbortMode(
        downloadAbortIntents,
        downloadAbortControllers,
        item.id,
        "pause",
      );
    }
    downloadClaimKeys.delete(item.id);
    deleteLocalPausedEntry(props.agent_id, item.id);
  }
  if (dropDownloads.length) {
    const dropIds = new Set(dropDownloads.map((item) => item.id));
    downloadQueue.value = downloadQueue.value.filter(
      (item) => !dropIds.has(item.id),
    );
    if (!downloadQueue.value.length) {
      resetDownloadUiState();
    }
  }

  const dropUploads = uploadQueue.value.filter((item) =>
    itemMatchesClaimKey(item, key),
  );
  for (const item of dropUploads) {
    if (isUploadQueueItemActive(item.status)) {
      setTransferAbortMode(
        uploadAbortIntents,
        uploadAbortControllers,
        item.id,
        "pause",
      );
    }
    uploadClaimKeys.delete(item.id);
    deleteLocalPausedEntry(props.agent_id, item.id);
  }
  if (dropUploads.length) {
    const dropIds = new Set(dropUploads.map((item) => item.id));
    uploadQueue.value = uploadQueue.value.filter(
      (item) => !dropIds.has(item.id),
    );
  }
}

function onTransferTabSyncEvent(event: TransferTabSyncEvent): void {
  if (event.type === "remote_release" && event.reason === "cancel") {
    abortLocalTransferForClaimKey(event.key);
  }
  if (
    event.type === "remote_release" &&
    isTerminalTransferRelease(event.reason)
  ) {
    dropLocalTransfersForRemoteTerminal(event.key);
  }
  if (event.type === "remote_claim") {
    yieldLocalTransferForClaimKey(event.key);
  }
  if (
    event.type === "remote_change" ||
    event.type === "remote_claim" ||
    event.type === "remote_release"
  ) {
    applyRemoteOwnershipFlags();
  }
}

async function restoreResumableTransfers(seq: number): Promise<void> {
  try {
    const data = await listAgentFileTransfers(props.agent_id);
    if (seq !== restoreSeq) return;

    const transfers = data.transfers ?? [];
    for (const transfer of transfers) {
      if (transfer.operation === "extract") {
        trackExtractJob(extractJobFromTransfer(transfer));
      }
    }
    const { uploads, downloads } = await reconcileResumableTransfers(
      props.agent_id,
      transfers.filter((t) => t.operation !== "extract"),
    );
    if (seq !== restoreSeq) return;

    const liveUploadIds = new Set(
      uploadQueue.value
        .filter(
          (i) =>
            i.status === "uploading" ||
            i.status === "queued" ||
            isUploadQueueItemTerminal(i.status),
        )
        .map((i) => i.id),
    );
    const liveUploadSessions = new Set(
      uploadQueue.value
        .map((i) => i.sessionId)
        .filter((id): id is string => !!id),
    );
    for (const restored of uploads) {
      if (seq !== restoreSeq) return;
      if (liveUploadIds.has(restored.id)) continue;
      if (restored.sessionId && liveUploadSessions.has(restored.sessionId)) {
        continue;
      }
      restored.ownedByOtherTab = getTabSync().isRemotelyOwned(
        claimKeyForUpload(restored),
      );
      const existingIdx = uploadQueue.value.findIndex(
        (i) =>
          i.id === restored.id ||
          (restored.sessionId && i.sessionId === restored.sessionId),
      );
      if (existingIdx >= 0) {
        if (uploadQueue.value[existingIdx].status === "paused") {
          uploadQueue.value[existingIdx] = {
            ...uploadQueue.value[existingIdx],
            ...restored,
            file: uploadQueue.value[existingIdx].file,
          };
        }
        continue;
      }
      uploadQueue.value.push(restored);
    }

    const liveDownloadIds = new Set(
      downloadQueue.value
        .filter(
          (i) =>
            isDownloadQueueItemActive(i.status) ||
            i.status === "queued" ||
            isDownloadQueueItemTerminal(i.status),
        )
        .map((i) => i.id),
    );
    const liveDownloadSessions = new Set(
      downloadQueue.value
        .map((i) => i.sessionId)
        .filter((id): id is string => !!id),
    );
    for (const restored of downloads) {
      if (seq !== restoreSeq) return;
      if (liveDownloadIds.has(restored.id)) continue;
      if (restored.sessionId && liveDownloadSessions.has(restored.sessionId)) {
        continue;
      }
      restored.ownedByOtherTab = getTabSync().isRemotelyOwned(
        claimKeyForDownload(restored),
      );
      const existingIdx = downloadQueue.value.findIndex(
        (i) =>
          i.id === restored.id ||
          (restored.sessionId && i.sessionId === restored.sessionId),
      );
      if (existingIdx >= 0) {
        if (downloadQueue.value[existingIdx].status === "paused") {
          downloadQueue.value[existingIdx] = {
            ...downloadQueue.value[existingIdx],
            ...restored,
          };
        }
        continue;
      }
      downloadQueue.value.push(restored);
    }
  } catch (err: unknown) {
    if (seq !== restoreSeq) return;
    console.warn("Failed to restore resumable transfers", err);
  }
}

function pruneFinishedDownloadsBeforeNewBatch() {
  if (isDownloadProcessorBusy()) return;

  downloadQueue.value = downloadQueue.value.filter(
    (item) =>
      item.status === "queued" ||
      item.status === "paused" ||
      isDownloadQueueItemActive(item.status),
  );
  if (!downloadQueue.value.length) {
    downloadBatchResult.value = null;
    downloadBatchIsSingle.value = false;
  }
}

function scheduleSingleDownloadAutoDismiss(itemId: string) {
  window.setTimeout(() => {
    if (
      downloadBatchIsSingle.value &&
      downloadQueue.value.length === 1 &&
      downloadQueue.value[0]?.id === itemId &&
      downloadQueue.value[0]?.status === "completed" &&
      !downloadQueue.value[0]?.hidden
    ) {
      dismissDownloadItem(itemId);
    }
  }, 4000);
}

function isDownloadProcessorBusy(): boolean {
  return (
    downloadProcessorRunning ||
    downloadQueue.value.some((item) => isDownloadQueueItemActive(item.status))
  );
}

function findDownloadItem(itemId: string): DownloadQueueItem | undefined {
  return downloadQueue.value.find((item) => item.id === itemId);
}

function offerZipDownloadDialog(selection: {
  folderCount: number;
  fileCount: number;
}): Promise<boolean> {
  const parts: string[] = [];
  if (selection.folderCount > 0) {
    parts.push(
      gettext.$ngettext(
        "%{count} folder",
        "%{count} folders",
        selection.folderCount,
        { count: selection.folderCount },
      ),
    );
  }
  if (selection.fileCount > 0) {
    parts.push(
      gettext.$ngettext(
        "%{count} file",
        "%{count} files",
        selection.fileCount,
        { count: selection.fileCount },
      ),
    );
  }
  const summary =
    parts.length === 2
      ? gettext.$gettext("%{folders} and %{files}", {
          folders: parts[0],
          files: parts[1],
        })
      : parts[0];
  const reason =
    selection.folderCount > 0 &&
    selection.fileCount > MAX_SEQUENTIAL_DOWNLOAD_FILES
      ? gettext.$gettext(
          "Folders and large multi-file selections are downloaded as a single ZIP archive.",
        )
      : selection.folderCount > 0
        ? gettext.$gettext("Folders are downloaded as a single ZIP archive.")
        : gettext.$ngettext(
            "More than %{limit} file is downloaded as a single ZIP archive.",
            "More than %{limit} files are downloaded as a single ZIP archive.",
            MAX_SEQUENTIAL_DOWNLOAD_FILES,
            {
              limit: MAX_SEQUENTIAL_DOWNLOAD_FILES,
            },
          );

  return new Promise((resolve) => {
    $q.dialog({
      title: gettext.$gettext("Download as ZIP?"),
      message: gettext.$gettext("%{summary} selected. %{reason}", {
        summary,
        reason,
      }),
      persistent: true,
      ok: { label: gettext.$gettext("Download ZIP"), color: "primary" },
      cancel: {
        label: gettext.$gettext("Cancel"),
        flat: true,
        color: "primary",
      },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
}

function startZipDownload(items: FileBrowserItem[]) {
  void enqueueZipDownload(items);
}

async function enqueueZipDownload(items: FileBrowserItem[]) {
  if (!items.length) {
    notifyWarning(gettext.$gettext("Select one or more items to download."));
    return;
  }

  if (items.length > MAX_ARCHIVE_PATHS) {
    notifyWarning(
      gettext.$ngettext(
        "Select at most %{limit} item for archive download.",
        "Select at most %{limit} items for archive download.",
        MAX_ARCHIVE_PATHS,
        {
          limit: MAX_ARCHIVE_PATHS,
        },
      ),
    );
    return;
  }

  if (isDownloadProcessorBusy()) {
    notifyWarning(gettext.$gettext("Downloads are already in progress."));
    return;
  }

  pruneFinishedDownloadsBeforeNewBatch();

  const archiveName = deriveArchiveDownloadName(items);
  let saveHandle: FileSystemFileHandle | undefined;
  if (canPickDownloadSaveFile()) {
    try {
      saveHandle = await pickDownloadSaveHandle(archiveName);
    } catch (err) {
      if (isAbortError(err)) return;
      notifyError(gettext.$gettext("Could not choose a save location."));
      return;
    }
  }

  const handleKey = archiveDownloadHandleIdbKey(
    props.agent_id,
    items.map((item) => item.path),
  );
  if (saveHandle) {
    await persistDownloadFileHandle([handleKey], saveHandle).catch(() => {});
  }

  downloadBatchResult.value = null;
  downloadStopAllRequested = false;
  downloadBatchIsSingle.value = true;

  const id = `dl-${Date.now()}-${downloadIdSeq++}`;
  downloadQueue.value.push({
    id,
    name: archiveName,
    sourcePath: items[0].path,
    kind: "archive",
    archivePaths: items.map((item) => item.path),
    status: "queued",
    progress: 0,
    handleKey,
    resumeFileHandle: saveHandle,
  });

  void processDownloadQueue();
}

async function confirmContinueAfterDownloadFailure(
  item: DownloadQueueItem,
): Promise<boolean> {
  const remaining = downloadQueue.value.filter(
    (entry) => entry.status === "queued",
  ).length;
  if (remaining === 0) return false;

  const detail = transferItemMessage(item)
    ? `"${item.name}": ${transferItemMessage(item)}`
    : gettext.$gettext('"%{name}" failed.', { name: item.name });

  return new Promise((resolve) => {
    $q.dialog({
      title: gettext.$gettext("Download failed"),
      message: gettext.$ngettext(
        "%{error}\n\nContinue with the remaining %{count} file?",
        "%{error}\n\nContinue with the remaining %{count} files?",
        remaining,
        {
          error: detail,
          count: remaining,
        },
      ),
      persistent: true,
      ok: { label: gettext.$gettext("Continue"), color: "primary" },
      cancel: {
        label: gettext.$gettext("Pause remaining"),
        flat: true,
        color: "negative",
      },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
}

function cancelRemainingDownloads() {
  downloadStopAllRequested = true;
  for (const item of downloadQueue.value) {
    if (item.status === "queued") {
      item.status = "paused";
      void persistDownloadQueueMeta(props.agent_id, item);
    }
  }
}

function formatDownloadBatchSummary({
  succeeded,
  failed,
  paused,
  cancelled,
}: DownloadBatchResult): string | null {
  if (succeeded + failed + paused + cancelled === 0) return null;
  if (failed === 0 && paused === 0 && cancelled === 0)
    return succeeded === 1
      ? gettext.$gettext("All downloads finished successfully.")
      : gettext.$ngettext(
          "%{count} download finished successfully.",
          "All %{count} downloads finished successfully.",
          succeeded,
          {
            count: succeeded,
          },
        );
  if (succeeded === 0 && failed > 0 && paused === 0 && cancelled === 0)
    return failed === 1
      ? gettext.$gettext("Download failed.")
      : gettext.$ngettext(
          "%{count} download failed.",
          "All %{count} downloads failed.",
          failed,
          { count: failed },
        );
  const parts: string[] = [];
  if (succeeded > 0)
    parts.push(gettext.$gettext("%{count} succeeded", { count: succeeded }));
  if (failed > 0)
    parts.push(gettext.$gettext("%{count} failed", { count: failed }));
  if (paused > 0)
    parts.push(gettext.$gettext("%{count} paused", { count: paused }));
  if (cancelled > 0)
    parts.push(gettext.$gettext("%{count} cancelled", { count: cancelled }));
  return parts.join(" · ");
}

function notifyDownloadBatchSummary(
  succeeded: number,
  failed: number,
  paused: number,
  cancelled: number,
) {
  const total = succeeded + failed + paused + cancelled;
  if (total === 0) return;
  downloadBatchResult.value = { succeeded, failed, paused, cancelled };

  if (failed === 0 && paused === 0 && cancelled === 0) {
    if (succeeded === 1) {
      notifySuccess(gettext.$gettext("Download complete."));

      return;
    }
    notifySuccess(
      gettext.$ngettext(
        "Downloaded %{count} file.",
        "Downloaded %{count} files.",
        succeeded,
        { count: succeeded },
      ),
    );

    return;
  }

  if (succeeded === 0 && failed > 0 && paused === 0 && cancelled === 0) {
    notifyError(
      failed === 1
        ? gettext.$gettext("Download failed.")
        : gettext.$ngettext(
            "%{count} download failed.",
            "All %{count} downloads failed.",
            failed,
            { count: failed },
          ),
    );

    return;
  }

  const parts: string[] = [];
  if (succeeded > 0)
    parts.push(gettext.$gettext("%{count} succeeded", { count: succeeded }));
  if (failed > 0)
    parts.push(gettext.$gettext("%{count} failed", { count: failed }));
  if (paused > 0)
    parts.push(gettext.$gettext("%{count} paused", { count: paused }));
  if (cancelled > 0)
    parts.push(gettext.$gettext("%{count} cancelled", { count: cancelled }));

  notifyWarning(
    gettext.$gettext("Downloads: %{summary}", { summary: parts.join(" · ") }),
  );
}

function isUploadMultiBatchNotify(): boolean {
  return (uploadNotifyBatchIds?.size ?? 0) >= 2;
}

function notifyUploadBatchSummary(
  succeeded: number,
  failed: number,
  paused: number,
  cancelled: number,
) {
  const total = succeeded + failed + paused + cancelled;
  if (total === 0) return;

  if (failed === 0 && paused === 0 && cancelled === 0) {
    notifySuccess(
      gettext.$ngettext(
        "%{count} file uploaded successfully",
        "%{count} files uploaded successfully",
        succeeded,
        {
          count: succeeded,
        },
      ),
    );
    return;
  }

  if (succeeded === 0 && failed > 0 && paused === 0 && cancelled === 0) {
    notifyError(
      failed === 1
        ? gettext.$gettext("Upload failed.")
        : gettext.$ngettext(
            "%{count} upload failed.",
            "All %{count} uploads failed.",
            failed,
            { count: failed },
          ),
    );
    return;
  }

  const parts: string[] = [];
  if (succeeded > 0)
    parts.push(gettext.$gettext("%{count} uploaded", { count: succeeded }));
  if (failed > 0)
    parts.push(gettext.$gettext("%{count} failed", { count: failed }));
  if (paused > 0)
    parts.push(gettext.$gettext("%{count} paused", { count: paused }));
  if (cancelled > 0)
    parts.push(gettext.$gettext("%{count} cancelled", { count: cancelled }));
  notifyWarning(
    gettext.$gettext("Uploads finished: %{summary}.", {
      summary: parts.join(", "),
    }),
  );
}

async function enqueueDownloads(files: FileBrowserItem[], singleFile = false) {
  if (!files.length) return;

  if (isDownloadProcessorBusy()) {
    notifyWarning(gettext.$gettext("Downloads are already in progress."));
    return;
  }

  pruneFinishedDownloadsBeforeNewBatch();

  const room = MAX_DOWNLOAD_QUEUE_ITEMS - downloadQueue.value.length;
  if (room <= 0) {
    notifyWarning(
      gettext.$ngettext(
        "The download queue is full (max %{limit} item). Clear finished items first.",
        "The download queue is full (max %{limit} items). Clear finished items first.",
        MAX_DOWNLOAD_QUEUE_ITEMS,
        {
          limit: MAX_DOWNLOAD_QUEUE_ITEMS,
        },
      ),
    );
    return;
  }

  let batch = files;
  if (batch.length > room) {
    notifyWarning(
      gettext.$ngettext(
        "Only the first %{queued} of %{total} file was queued (queue limit).",
        "Only the first %{queued} of %{total} files were queued (queue limit).",
        batch.length,
        {
          queued: room,
          total: batch.length,
        },
      ),
    );
    batch = batch.slice(0, room);
  }

  const saveHandles: Array<FileSystemFileHandle | undefined> = [];
  if (canPickDownloadSaveFile()) {
    try {
      for (const file of batch) {
        const suggested =
          file.name && file.name !== "/" ? file.name : "download";
        saveHandles.push(await pickDownloadSaveHandle(suggested));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      notifyError(gettext.$gettext("Could not choose a save location."));
      return;
    }
  }

  downloadBatchResult.value = null;
  downloadStopAllRequested = false;
  downloadBatchIsSingle.value = singleFile;

  for (let i = 0; i < batch.length; i++) {
    const file = batch[i];
    const saveHandle = saveHandles[i];
    const handleKey = downloadHandleIdbKey(props.agent_id, file.path);
    if (saveHandle) {
      await persistDownloadFileHandle([handleKey], saveHandle).catch(() => {});
    }
    const id = `dl-${Date.now()}-${downloadIdSeq++}`;
    downloadQueue.value.push({
      id,
      name: file.name,
      sourcePath: file.path,
      status: "queued",
      progress: 0,
      handleKey,
      resumeFileHandle: saveHandle,
    });
  }

  void processDownloadQueue();
}

async function runSingleDownload(itemId: string): Promise<void> {
  const item = findDownloadItem(itemId);
  if (!item || item.status !== "queued") return;

  const claimKey = claimKeyForDownload(item);
  if (!getTabSync().tryClaim(claimKey)) {
    item.status = "paused";
    item.ownedByOtherTab = true;
    setTransferMessage(item);
    return;
  }
  downloadClaimKeys.set(itemId, claimKey);
  item.ownedByOtherTab = false;

  const priorProgress =
    typeof item.progress === "number" && item.progress > 0 ? item.progress : 0;
  const isResume = Boolean(item.sessionId) || priorProgress > 0;
  item.status = isResume ? "downloading" : "initializing";
  setTransferMessage(item);
  if (!isResume) {
    item.progress = 0;
  }

  const controller = new AbortController();
  const abortIntent: TransferAbortIntent = { mode: "pause" };
  downloadAbortControllers.set(itemId, controller);
  downloadAbortIntents.set(itemId, abortIntent);

  try {
    const transferOptions = {
      signal: controller.signal,
      abortIntent,
      chunkSize: FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
      knownSessionId: item.sessionId,
      fileHandle: item.resumeFileHandle,
      onWaitingForSlot: () => {
        const current = findDownloadItem(itemId);
        if (!current) return;
        if (current.status === "queued") {
          current.status = "initializing";
        }
        setTransferMessage(current, "waiting-slot");
      },
      onSession: (sessionId: string) => {
        const current = findDownloadItem(itemId);
        if (!current) return;
        current.sessionId = sessionId;
        if (current.messageCode === "waiting-slot") {
          setTransferMessage(current);
        }
        rekeyOrClaimTransferSession({
          agentId: props.agent_id,
          itemId,
          sessionId,
          claimKeys: downloadClaimKeys,
          tabSync: getTabSync(),
        });
      },
      onProgress: ({
        committedOffset,
        totalSize,
      }: {
        committedOffset: number;
        totalSize: number;
      }) => {
        const current = findDownloadItem(itemId);
        if (!current) return;
        current.committedOffset = committedOffset;
        current.totalSize = totalSize;
        current.progress = totalSize > 0 ? committedOffset / totalSize : 0;
        if (current.status === "initializing") {
          current.status = "downloading";
        }
        if (
          current.messageCode === "waiting-slot" ||
          current.messageCode === "reconnecting" ||
          current.messageCode === "waiting-agent"
        ) {
          setTransferMessage(current);
        }
      },
      onStatus: (status: "initializing" | "downloading" | "completing") => {
        const current = findDownloadItem(itemId);
        if (!current) return;
        if (
          status === "initializing" &&
          (current.progress > 0 || current.sessionId)
        ) {
          return;
        }
        current.status = status;
        if (
          (status === "downloading" || status === "completing") &&
          (current.messageCode === "waiting-slot" ||
            current.messageCode === "reconnecting" ||
            current.messageCode === "waiting-agent")
        ) {
          setTransferMessage(current);
        }
      },
      onRetrying: (info) => {
        const current = findDownloadItem(itemId);
        if (!current) return;
        setTransferMessage(
          current,
          info.waitingForAgent ? "waiting-agent" : "reconnecting",
        );
      },
    };

    const result =
      item.kind === "archive" && item.archivePaths?.length
        ? await runArchiveDownloadTransfer(
            props.agent_id,
            item.archivePaths,
            item.name,
            {
              ...transferOptions,
              onArchiveBuilding: () => {
                const current = findDownloadItem(itemId);
                if (!current) return;
                if (!(current.progress > 0 || current.sessionId)) {
                  current.status = "initializing";
                }
              },
            },
          )
        : await runFileDownloadTransfer(
            props.agent_id,
            item.sourcePath,
            transferOptions,
          );

    const current = findDownloadItem(itemId);
    if (!current) return;

    current.status = "completed";
    current.progress = 1;
    current.hidden = false;
    const doneSession = current.sessionId;
    current.sessionId = undefined;
    releaseDownloadClaim(itemId, "complete");
    if (doneSession) {
      const handleKey =
        current.kind === "archive" && current.archivePaths?.length
          ? archiveDownloadHandleIdbKey(props.agent_id, current.archivePaths)
          : downloadHandleIdbKey(props.agent_id, current.sourcePath);
      void clearTransferPersistence(props.agent_id, doneSession, {
        handleKey,
        localQueueId: current.id,
      });
    }
    deleteLocalPausedEntry(props.agent_id, current.id);

    if (result.warnings && result.warnings.length > 0) {
      const shown = result.warnings.slice(0, 5).join("; ");
      const extra =
        result.warnings.length > 5
          ? gettext.$gettext(" (+%{count} more)", {
              count: result.warnings.length - 5,
            })
          : "";
      notifyWarning(
        gettext.$ngettext(
          '"%{archiveName}" archived with %{count} warning: %{warnings}%{remainingWarnings}',
          '"%{archiveName}" archived with %{count} warnings: %{warnings}%{remainingWarnings}',
          result.warnings.length,
          {
            archiveName: result.fileName,
            count: result.warnings.length,
            warnings: shown,
            remainingWarnings: extra,
          },
        ),
      );
    }

    if (downloadBatchIsSingle.value && downloadQueue.value.length === 1) {
      notifySuccess(
        gettext.$gettext('Downloaded "%{name}"', { name: result.fileName }),
      );
      scheduleSingleDownloadAutoDismiss(itemId);
    }
  } catch (err: unknown) {
    const current = findDownloadItem(itemId);
    if (!current) return;

    if (isDownloadAbortError(err)) {
      const mode = downloadAbortIntents.get(itemId)?.mode ?? "pause";
      current.status = mode === "cancel" ? "cancelled" : "paused";
      setTransferMessage(current);
      current.ownedByOtherTab =
        mode !== "cancel" &&
        getTabSync().isRemotelyOwned(claimKeyForDownload(current));
      if (mode === "cancel") {
        releaseDownloadClaim(itemId, "cancel");
        const sid = current.sessionId;
        current.sessionId = undefined;
        if (sid) {
          clearDownloadResumeBySessionId(sid);
          const handleKey =
            current.kind === "archive" && current.archivePaths?.length
              ? archiveDownloadHandleIdbKey(
                  props.agent_id,
                  current.archivePaths,
                )
              : downloadHandleIdbKey(props.agent_id, current.sourcePath);
          void clearTransferPersistence(props.agent_id, sid, {
            handleKey,
            localQueueId: current.id,
          });
        }
        deleteLocalPausedEntry(props.agent_id, current.id);
      } else {
        void persistDownloadQueueMeta(props.agent_id, current);
      }
      if (downloadBatchIsSingle.value && downloadQueue.value.length === 1) {
        notifyInfo(
          mode === "cancel"
            ? gettext.$gettext("Download cancelled.")
            : current.ownedByOtherTab
              ? gettext.$gettext("This download is open in another tab.")
              : gettext.$gettext("Download paused."),
        );
      }
      return;
    }

    if (isRetryableTransferError(err)) {
      current.status = "paused";
      current.hidden = false;
      current.ownedByOtherTab = false;
      if (scheduleAutoResume(current, err, resumeDownloadItem)) {
        setTransferMessage(current, "reconnecting");
        void persistDownloadQueueMeta(props.agent_id, current);
        return;
      }
      setTransferMessage(current, "connection-lost");
      void persistDownloadQueueMeta(props.agent_id, current);
      if (downloadBatchIsSingle.value && downloadQueue.value.length === 1) {
        notifyWarning(
          gettext.$gettext("Connection lost. Click Resume to continue."),
        );
      }
      return;
    }

    current.status = "failed";
    current.hidden = false;
    current.ownedByOtherTab = false;
    releaseDownloadClaim(itemId, "fail");
    setTransferFailureMessage(current, err, "download");
    if (downloadBatchIsSingle.value && downloadQueue.value.length === 1) {
      notifyError(transferItemMessage(current) ?? "");
    }
  } finally {
    downloadAbortControllers.delete(itemId);
    downloadAbortIntents.delete(itemId);
  }
}

async function processDownloadQueue(): Promise<void> {
  if (downloadProcessorRunning) return;
  downloadProcessorRunning = true;

  const batchIdSet = new Set(
    downloadQueue.value
      .filter(
        (item) =>
          item.status === "queued" || isDownloadQueueItemActive(item.status),
      )
      .map((item) => item.id),
  );

  try {
    while (true) {
      if (downloadStopAllRequested) {
        cancelRemainingDownloads();
        break;
      }

      const next = downloadQueue.value.find((item) => item.status === "queued");
      if (!next) break;

      await runSingleDownload(next.id);

      const current = findDownloadItem(next.id);
      if (!current) continue;

      if (downloadStopAllRequested) {
        cancelRemainingDownloads();
        break;
      }

      if (current.status === "failed") {
        const shouldContinue =
          await confirmContinueAfterDownloadFailure(current);
        if (!shouldContinue) {
          cancelRemainingDownloads();
          break;
        }
      }
    }
  } finally {
    downloadProcessorRunning = false;
    downloadStopAllRequested = false;

    if (downloadQueue.value.length >= 2 && batchIdSet.size > 0) {
      const batchItems = downloadQueue.value.filter((item) =>
        batchIdSet.has(item.id),
      );
      const succeeded = batchItems.filter(
        (item) => item.status === "completed",
      ).length;
      const failed = batchItems.filter(
        (item) => item.status === "failed",
      ).length;
      const paused = batchItems.filter(
        (item) => item.status === "paused",
      ).length;
      const cancelled = batchItems.filter(
        (item) => item.status === "cancelled",
      ).length;
      notifyDownloadBatchSummary(succeeded, failed, paused, cancelled);
    }

    if (downloadQueue.value.some((item) => item.status === "queued")) {
      void processDownloadQueue();
    }
  }
}

function abortDownloadItem(
  id: string,
  mode: TransferAbortIntent["mode"],
): void {
  setTransferAbortMode(
    downloadAbortIntents,
    downloadAbortControllers,
    id,
    mode,
  );

  const item = findDownloadItem(id);
  if (item && item.status === "queued") {
    item.status = mode === "cancel" ? "cancelled" : "paused";
    item.ownedByOtherTab = false;
    if (mode === "pause") {
      void persistDownloadQueueMeta(props.agent_id, item);
    } else {
      releaseDownloadClaim(id, "cancel");
      deleteLocalPausedEntry(props.agent_id, item.id);
      broadcastCancelForItem(item);
    }
  }
}

function pauseDownloadItem(id: string) {
  abortDownloadItem(id, "pause");
}

function cancelDownloadItem(id: string) {
  const item = findDownloadItem(id);
  if (item?.status === "paused") {
    void discardPausedDownload(item);
    return;
  }
  abortDownloadItem(id, "cancel");
}

// Prefer the in-memory handle, IndexedDB is only needed after a reload.
async function downloadFileHandleFor(
  item: DownloadQueueItem,
): Promise<FileSystemFileHandle | null> {
  if (
    item.resumeFileHandle &&
    (await queryFileHandlePermission(item.resumeFileHandle)) === "granted"
  ) {
    return item.resumeFileHandle;
  }
  return requestStoredDownloadHandle(props.agent_id, item);
}

async function discardPausedDownload(item: DownloadQueueItem): Promise<void> {
  item.status = "cancelled";
  item.hidden = false;
  setTransferMessage(item);
  item.ownedByOtherTab = false;

  const resumeScopeKey =
    item.kind === "archive" && item.archivePaths?.length
      ? archiveDownloadResumeKey(props.agent_id, item.archivePaths)
      : item.sourcePath;
  const handleKey =
    item.kind === "archive" && item.archivePaths?.length
      ? archiveDownloadHandleIdbKey(props.agent_id, item.archivePaths)
      : downloadHandleIdbKey(props.agent_id, item.sourcePath);

  const saved = loadDownloadResume(props.agent_id, resumeScopeKey);
  const sessionId = item.sessionId || saved?.sessionId;

  // Remove what was already written: the partial file (while the Cancel
  // click still counts as a gesture for the permission prompt) and any
  // in-memory bytes kept for resume.
  const handle = await downloadFileHandleFor({ ...item, sessionId }).catch(
    () => null,
  );
  if (handle) {
    await removeFileSystemFileHandle(handle);
  }
  const bytesKeys = [downloadBytesPathKey(props.agent_id, resumeScopeKey)];
  if (sessionId) bytesKeys.push(downloadBytesSessionKey(sessionId));
  for (const key of bytesKeys) {
    await idbDeleteDownloadBytes(key).catch(() => {});
  }

  broadcastCancelForItem({ id: item.id, sessionId });
  releaseDownloadClaim(item.id, "cancel");
  if (sessionId) {
    try {
      await cancelAgentFileDownload(props.agent_id, sessionId, "user");
    } catch {}
    clearDownloadResumeBySessionId(sessionId);
  }
  item.sessionId = undefined;
  clearDownloadResume(props.agent_id, resumeScopeKey);
  await clearTransferPersistence(props.agent_id, sessionId, {
    handleKey,
    localQueueId: item.id,
  });
  notifyInfo(gettext.$gettext("Download cancelled."));
}

async function resumeDownloadItem(id: string) {
  const item = findDownloadItem(id);
  if (!item || item.status !== "paused") return;
  if (
    item.ownedByOtherTab ||
    getTabSync().isRemotelyOwned(claimKeyForDownload(item))
  ) {
    item.ownedByOtherTab = true;
    notifyWarning(gettext.$gettext("This download is open in another tab."));
    return;
  }
  if (item.recoveryHint === "non_resumable") {
    notifyWarning(
      gettext.$gettext(
        "This download cannot be resumed here. Cancel it to free the server session.",
      ),
    );
    return;
  }
  let handle = await downloadFileHandleFor(item);
  if (!handle && (await hasStoredDownloadHandle(props.agent_id, item))) {
    // Access to the partial file was denied. Starting over in memory would
    // throw away the bytes on disk (and fail above the in-memory limit).
    item.recoveryHint = "needs_permission";
    setTransferMessage(item, "file-permission");
    notifyWarning(
      gettext.$gettext(
        "File access was not allowed. Click Resume and allow access to continue the download.",
      ),
    );
    return;
  }
  if (
    !handle &&
    item.recoveryHint === "needs_destination" &&
    canPickExistingDownloadFile()
  ) {
    try {
      handle = await pickExistingDownloadHandle();
      const persistKeys = [
        item.handleKey,
        item.sessionId
          ? downloadSessionHandleIdbKey(item.sessionId)
          : undefined,
        downloadHandleIdbKey(props.agent_id, item.sourcePath),
      ];
      await persistDownloadFileHandle(persistKeys, handle).catch(() => {});
    } catch (err) {
      if (!isAbortError(err)) {
        notifyWarning(
          err instanceof Error
            ? err.message
            : gettext.$gettext("Could not reopen the saved download file."),
        );
        return;
      }
    }
  }
  if (handle) {
    item.resumeFileHandle = handle;
    item.recoveryHint = "ready";
  }
  item.hidden = false;
  item.status = "queued";
  setTransferMessage(item);
  item.ownedByOtherTab = false;
  void processDownloadQueue();
}

function hideDownloadItem(id: string) {
  const item = findDownloadItem(id);
  if (!item || item.status !== "paused") return;
  item.hidden = true;
  void persistDownloadQueueMeta(props.agent_id, item);
}

function hideAllDownloadItems() {
  for (const item of downloadQueue.value) {
    if (item.status === "paused") {
      item.hidden = true;
      void persistDownloadQueueMeta(props.agent_id, item);
    }
  }
}

function dismissDownloadItem(id: string) {
  const item = findDownloadItem(id);
  if (!item) return;
  if (item.status === "queued" || isDownloadQueueItemTerminal(item.status)) {
    downloadQueue.value = downloadQueue.value.filter(
      (entry) => entry.id !== id,
    );
  }
  if (!downloadQueue.value.length) {
    resetDownloadUiState();
  }
}

function clearFinishedDownloads() {
  downloadQueue.value = downloadQueue.value.filter(
    (item) => !isDownloadQueueItemTerminal(item.status),
  );
  if (!downloadQueue.value.length) {
    resetDownloadUiState();
  }
}

function pauseAllDownloads() {
  downloadStopAllRequested = true;
  for (const item of downloadQueue.value) {
    if (isDownloadQueueItemActive(item.status)) {
      abortDownloadItem(item.id, "pause");
    } else if (item.status === "queued") {
      item.status = "paused";
    } else if (item.messageCode === "reconnecting") {
      setTransferMessage(item, "connection-lost");
    }
  }
}

function pauseAllUploads() {
  for (const item of uploadQueue.value) {
    if (isUploadQueueItemActive(item.status)) {
      abortUploadItem(item.id, "pause");
    } else if (item.status === "queued") {
      item.status = "paused";
    } else if (item.messageCode === "reconnecting") {
      setTransferMessage(item, "connection-lost");
    }
  }
}

async function startDownloads(items: FileBrowserItem[]) {
  if (!items.length) {
    notifyWarning(gettext.$gettext("Select one or more items to download."));
    return;
  }

  const selection = classifyDownloadSelection(items);

  if (selection.mode === "none") {
    notifyWarning(gettext.$gettext("Select one or more items to download."));
    return;
  }

  if (selection.mode === "zip") {
    const proceed = await offerZipDownloadDialog(selection);
    if (proceed) {
      startZipDownload(items);
    }
    return;
  }

  if (selection.mode === "single") {
    await enqueueDownloads(selection.files, true);
    return;
  }

  await enqueueDownloads(selection.files, false);
}

function downloadSelectedItems() {
  void startDownloads(selectedRows.value);
}

function downloadFromContext(row: FileBrowserItem) {
  const selected = selectedRows.value;
  const inSelection = selected.some((s) => s.id === row.id);
  void startDownloads(inSelection && selected.length > 0 ? selected : [row]);
}

function setPath(path: string) {
  const normalized = normalizeNavPath(path);
  if (!normalized) {
    notifyWarning(gettext.$gettext("Enter a valid path."));
    return;
  }

  if (pathsEqual(normalized, currentPath.value)) {
    void refresh();
    return;
  }

  clearFolderFilter();
  currentPath.value = normalized;
  selectedRows.value = [];

  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(normalized);
  historyIndex.value = history.value.length - 1;

  void refresh();
}

function goBack() {
  if (!canGoBack.value) return;

  clearFolderFilter();
  historyIndex.value -= 1;
  currentPath.value = history.value[historyIndex.value];
  selectedRows.value = [];
  void refresh();
}

function goForward() {
  if (!canGoForward.value) return;

  clearFolderFilter();
  historyIndex.value += 1;
  currentPath.value = history.value[historyIndex.value];
  selectedRows.value = [];
  void refresh();
}

function onRowDoubleClick(row: FileBrowserItem) {
  if (row.type === "folder") openFolder(row);
}

function openFolder(row: FileBrowserItem) {
  if (row.type !== "folder") return;
  setPath(row.path);
}

async function showProperties(row: FileBrowserItem) {
  selectedPropertyItem.value = row;
  propertiesDialog.value = true;
  propertiesLoading.value = true;
  propertiesError.value = null;

  try {
    const data = await fetchAgentFileProperties(
      props.agent_id,
      row.path,
      agentPlatform.value,
    );
    selectedPropertyItem.value = mapApiItemToFileBrowserItem(
      data,
      agentPlatform.value,
    );
  } catch (err: unknown) {
    propertiesError.value = getListFilesErrorMessage(err);
  } finally {
    propertiesLoading.value = false;
  }
}

function showPropertiesFromToolbar() {
  const sel = selectedRows.value;
  if (sel.length !== 1) {
    notifyWarning(
      gettext.$gettext("Select exactly one item to view properties."),
    );
    return;
  }
  showProperties(sel[0]);
}

function copyPathsToClipboard(items: FileBrowserItem[]) {
  if (!items.length) {
    notifyWarning(
      gettext.$gettext("Select one or more items to copy their paths."),
    );
    return;
  }
  const text = items.map((r) => r.path).join("\n");
  void copyOutput(text, {
    successMessage:
      items.length === 1
        ? gettext.$gettext("Path copied to clipboard.")
        : gettext.$ngettext(
            "%{count} path copied to clipboard.",
            "%{count} paths copied to clipboard.",
            items.length,
            {
              count: items.length,
            },
          ),
  });
}

function copySelectedPathsToClipboard() {
  copyPathsToClipboard(selectedRows.value);
}

function copyPathFromContext(row: FileBrowserItem) {
  const selected = selectedRows.value;
  const inSelection = selected.some((s) => s.id === row.id);
  copyPathsToClipboard(
    inSelection && selected.length > 0 ? [...selected] : [row],
  );
}

function assertUploadPath(): boolean {
  if (!hasUploadPath.value) {
    notifyWarning(gettext.$gettext("Select a folder path before uploading."));
    return false;
  }
  return true;
}

function openFilePicker() {
  if (!assertUploadPath()) return;
  fileInputRef.value?.click();
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = fileListToArray(input.files);
  if (!files.length) return;
  void queueFilesForUpload(files);
  input.value = "";
}

function confirmUploadOverwrite(
  conflicts: File[],
): Promise<UploadConflictAction> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (action: UploadConflictAction) => {
      if (settled) return;
      settled = true;
      resolve(action);
    };

    $q.dialog({
      component: FileBrowserUploadConflictDialog,
      componentProps: {
        conflictNames: conflicts.map((f) => f.name),
      },
    })
      .onOk((action: UploadConflictAction) => {
        finish(action === "replace" || action === "skip" ? action : "cancel");
      })
      .onCancel(() => finish("cancel"))
      .onDismiss(() => finish("cancel"));
  });
}

async function queueFilesForUpload(
  files: File[],
  options?: { folderCount?: number },
) {
  if (!assertUploadPath()) return;
  if (!files.length) {
    if ((options?.folderCount ?? 0) > 0) {
      notifyWarning(
        gettext.$gettext(
          "Folders cannot be uploaded. Drop files into this folder instead.",
        ),
      );
    }
    return;
  }

  let batch = files;
  const notes: string[] = [];

  if ((options?.folderCount ?? 0) > 0) {
    notes.push(
      gettext.$ngettext(
        "%{count} folder skipped — folder upload is not supported.",
        "%{count} folders skipped — folder upload is not supported.",
        options!.folderCount,
        {
          count: options!.folderCount,
        },
      ),
    );
  }

  if (batch.length > MAX_UPLOAD_FILES_PER_SELECTION) {
    notes.push(
      gettext.$ngettext(
        "Only the first %{considered} of %{total} file was considered (per-selection limit).",
        "Only the first %{considered} of %{total} files were considered (per-selection limit).",
        batch.length,
        {
          considered: MAX_UPLOAD_FILES_PER_SELECTION,
          total: batch.length,
        },
      ),
    );
    batch = batch.slice(0, MAX_UPLOAD_FILES_PER_SELECTION);
  }

  const room = MAX_UPLOAD_QUEUE_ITEMS - uploadQueue.value.length;
  if (room <= 0) {
    notifyWarning(
      gettext.$ngettext(
        "Upload queue is full (max %{limit} item). Clear finished items or cancel transfers, then try again.",
        "Upload queue is full (max %{limit} items). Clear finished items or cancel transfers, then try again.",
        MAX_UPLOAD_QUEUE_ITEMS,
        {
          limit: MAX_UPLOAD_QUEUE_ITEMS,
        },
      ),
    );
    return;
  }

  const skippedInvalidNameFiles = batch.filter(
    (f) => nameSegmentBaseRule(f.name, agentPlatform.value) !== true,
  );
  const skippedInvalidName = skippedInvalidNameFiles.length;
  const namedOk = batch.filter(
    (f) => nameSegmentBaseRule(f.name, agentPlatform.value) === true,
  );

  const maxFileBytes = props.maxUploadFileSizeBytes;
  const skippedOversized =
    maxFileBytes > 0 ? namedOk.filter((f) => f.size > maxFileBytes).length : 0;
  const sizeOk =
    maxFileBytes > 0 ? namedOk.filter((f) => f.size <= maxFileBytes) : namedOk;
  let toEnqueue = sizeOk.slice(0, room);
  const skippedDueToQueue = sizeOk.length - toEnqueue.length;

  if (skippedInvalidName > 0) {
    const reason = nameSegmentBaseRule(
      skippedInvalidNameFiles[0].name,
      agentPlatform.value,
    );
    notes.push(
      gettext.$ngettext(
        "%{count} file skipped — %{reason}",
        "%{count} files skipped — %{reason}",
        skippedInvalidName,
        {
          count: skippedInvalidName,
          reason:
            typeof reason === "string"
              ? reason
              : gettext.$gettext("invalid filename"),
        },
      ),
    );
  }

  if (skippedOversized > 0) {
    notes.push(
      gettext.$ngettext(
        "%{count} file skipped — larger than %{sizeLimit}.",
        "%{count} files skipped — larger than %{sizeLimit} each.",
        skippedOversized,
        {
          count: skippedOversized,
          sizeLimit: bytes2Human(maxFileBytes),
        },
      ),
    );
  }
  if (skippedDueToQueue > 0) {
    notes.push(
      gettext.$ngettext(
        "%{count} file not queued — would exceed the queue limit (%{limit}).",
        "%{count} files not queued — would exceed the queue limit (%{limit}).",
        skippedDueToQueue,
        {
          count: skippedDueToQueue,
          limit: MAX_UPLOAD_QUEUE_ITEMS,
        },
      ),
    );
  }

  if (notes.length) {
    notifyWarning(notes.join(" "));
  }

  if (!toEnqueue.length) {
    if (!notes.length) {
      notifyWarning(
        gettext.$gettext("No files could be added to the upload queue."),
      );
    }
    return;
  }

  const destinationPath = normalizeAgentListPath(
    currentPath.value.trim(),
    agentPlatform.value,
  );

  let conflicts: File[] = [];
  try {
    const result = await checkAgentExistingNames(
      props.agent_id,
      destinationPath,
      toEnqueue.map((file) => file.name),
    );
    conflicts = filesMatchingExistingNames(
      toEnqueue,
      result.existing || [],
      agentPlatform.value,
    );
  } catch {
    notifyWarning(
      gettext.$gettext(
        "Could not check the folder for existing files. Only names currently shown in the list were compared.",
      ),
    );
    conflicts = listUploadNameConflicts(
      toEnqueue,
      rows.value,
      agentPlatform.value,
    );
  }

  let conflictPolicy: "skip" | "replace" = "replace";
  if (conflicts.length > 0) {
    const action = await confirmUploadOverwrite(conflicts);
    if (action === "cancel") {
      notifyInfo(gettext.$gettext("Upload cancelled."));
      return;
    }
    if (action === "skip") {
      conflictPolicy = "skip";
      const conflictSet = new Set(conflicts);
      toEnqueue = toEnqueue.filter((f) => !conflictSet.has(f));
      if (!toEnqueue.length) {
        notifyInfo(
          gettext.$gettext(
            "Upload skipped — existing files were not replaced.",
          ),
        );
        return;
      }
      notifyInfo(
        gettext.$gettext(
          "Skipped files that already exist. Uploading the remaining items.",
        ),
      );
    } else {
      conflictPolicy = "replace";
    }
  }

  for (const file of toEnqueue) {
    const id = `up-${Date.now()}-${uploadIdSeq++}`;
    const item: UploadQueueItem = {
      id,
      file,
      name: file.name,
      sizeLabel: bytes2Human(file.size),
      sizeBytes: file.size,
      destinationPath,
      status: "queued",
      progress: 0,
      conflictPolicy,
    };
    uploadQueue.value.push(item);
  }

  void processUploadQueue();
}

function findUploadItem(itemId: string): UploadQueueItem | undefined {
  return uploadQueue.value.find((i) => i.id === itemId);
}

function updateUploadProgress(
  itemId: string,
  progress: {
    acceptedOffset: number;
    committedOffset: number;
    totalSize: number;
  },
): void {
  const item = findUploadItem(itemId);
  if (!item) return;
  item.acceptedOffset = progress.acceptedOffset;
  item.committedOffset = progress.committedOffset;
  item.progress =
    progress.totalSize > 0 ? progress.committedOffset / progress.totalSize : 0;
}

async function runSingleUpload(itemId: string): Promise<void> {
  const item = findUploadItem(itemId);
  if (!item || item.status !== "queued") return;
  if (!item.file) {
    item.status = "paused";
    item.recoveryHint = "needs_file";
    setTransferMessage(item, "select-upload-file");
    return;
  }

  const claimKey = claimKeyForUpload(item);
  if (!getTabSync().tryClaim(claimKey)) {
    item.status = "paused";
    item.ownedByOtherTab = true;
    setTransferMessage(item);
    return;
  }
  uploadClaimKeys.set(itemId, claimKey);
  item.ownedByOtherTab = false;

  const priorProgress =
    typeof item.progress === "number" && item.progress > 0 ? item.progress : 0;
  const isResume = Boolean(item.sessionId) || priorProgress > 0;
  item.status = "uploading";
  setTransferMessage(item);
  if (!isResume) {
    item.progress = 0;
  }
  item.recoveryHint = undefined;

  const controller = new AbortController();
  const abortIntent: TransferAbortIntent = { mode: "pause" };
  uploadAbortControllers.set(itemId, controller);
  uploadAbortIntents.set(itemId, abortIntent);
  const multiBatch = isUploadMultiBatchNotify();

  try {
    const result = await runFileUploadTransfer(
      props.agent_id,
      item.file,
      item.destinationPath,
      {
        signal: controller.signal,
        abortIntent,
        chunkSize: FILE_TRANSFER_DEFAULT_CHUNK_SIZE,
        conflictPolicy: item.conflictPolicy ?? "replace",
        knownSessionId: item.sessionId,
        onWaitingForSlot: () => {
          const current = findUploadItem(itemId);
          if (!current) return;
          setTransferMessage(current, "waiting-slot");
        },
        onSession: (sessionId: string) => {
          const current = findUploadItem(itemId);
          if (!current) return;
          current.sessionId = sessionId;
          if (current.messageCode === "waiting-slot") {
            setTransferMessage(current);
          }
          rekeyOrClaimTransferSession({
            agentId: props.agent_id,
            itemId,
            sessionId,
            claimKeys: uploadClaimKeys,
            tabSync: getTabSync(),
          });
        },
        onProgress: (p) => {
          updateUploadProgress(itemId, p);
          const current = findUploadItem(itemId);
          if (
            current &&
            (current.messageCode === "waiting-slot" ||
              current.messageCode === "reconnecting" ||
              current.messageCode === "waiting-agent")
          ) {
            setTransferMessage(current);
          }
        },
        onRetrying: (info) => {
          const current = findUploadItem(itemId);
          if (!current) return;
          setTransferMessage(
            current,
            info.waitingForAgent ? "waiting-agent" : "reconnecting",
          );
        },
      },
    );

    const current = findUploadItem(itemId);
    if (!current) return;

    if (!result.integrityOk) {
      current.status = "failed";
      current.hidden = false;
      current.sessionId = undefined;
      current.ownedByOtherTab = false;
      releaseUploadClaim(itemId, "fail");
      setTransferMessage(current, "upload-integrity");
      if (!multiBatch) {
        notifyError(transferItemMessage(current) ?? "");
      }
      return;
    }

    current.status = "completed";
    current.progress = 1;
    current.hidden = false;
    const doneSession = current.sessionId;
    current.sessionId = undefined;
    releaseUploadClaim(itemId, "complete");
    if (doneSession) {
      void clearTransferPersistence(props.agent_id, doneSession, {
        localQueueId: current.id,
      });
    }
    deleteLocalPausedEntry(props.agent_id, current.id);
    if (!multiBatch) {
      notifySuccess(
        gettext.$gettext('Uploaded "%{name}"', { name: item.name }),
      );
    }
    if (pathsEqual(item.destinationPath, currentPath.value)) {
      uploadListingNeedsRefresh = true;
    }
  } catch (err: unknown) {
    const current = findUploadItem(itemId);
    if (!current) return;

    if (isUploadAbortError(err)) {
      const mode = uploadAbortIntents.get(itemId)?.mode ?? "pause";
      current.status = mode === "cancel" ? "cancelled" : "paused";
      setTransferMessage(current);
      current.ownedByOtherTab =
        mode !== "cancel" &&
        getTabSync().isRemotelyOwned(claimKeyForUpload(current));
      if (mode === "cancel") {
        releaseUploadClaim(itemId, "cancel");
        const sid = current.sessionId;
        current.sessionId = undefined;
        if (sid) {
          clearUploadResumeBySessionId(sid);
          void clearTransferPersistence(props.agent_id, sid, {
            localQueueId: current.id,
          });
        }
        deleteLocalPausedEntry(props.agent_id, current.id);
      } else {
        void persistUploadQueueMeta(props.agent_id, current);
      }
      if (!multiBatch) {
        notifyInfo(
          mode === "cancel"
            ? gettext.$gettext("Upload cancelled.")
            : current.ownedByOtherTab
              ? gettext.$gettext("This upload is open in another tab.")
              : gettext.$gettext("Upload paused."),
        );
      }
      return;
    }

    if (isRetryableTransferError(err)) {
      current.status = "paused";
      current.hidden = false;
      current.ownedByOtherTab = false;
      if (scheduleAutoResume(current, err, resumeUploadItem)) {
        setTransferMessage(current, "reconnecting");
        void persistUploadQueueMeta(props.agent_id, current);
        return;
      }
      setTransferMessage(current, "connection-lost");
      void persistUploadQueueMeta(props.agent_id, current);
      if (!multiBatch) {
        notifyWarning(
          `"${item.name}": ${gettext.$gettext("Connection lost. Click Resume to continue.")}`,
        );
      }
      return;
    }

    current.status = "failed";
    current.hidden = false;
    current.ownedByOtherTab = false;
    releaseUploadClaim(itemId, "fail");
    setTransferFailureMessage(current, err, "upload");
    if (!multiBatch) {
      notifyError(`"${item.name}": ${transferItemMessage(current)}`);
    }
  } finally {
    uploadAbortControllers.delete(itemId);
    uploadAbortIntents.delete(itemId);
  }
}

async function processUploadQueue(): Promise<void> {
  if (uploadProcessorRunning) return;
  uploadProcessorRunning = true;

  const batchIdSet = new Set(
    uploadQueue.value
      .filter(
        (item) =>
          item.status === "queued" || isUploadQueueItemActive(item.status),
      )
      .map((item) => item.id),
  );
  uploadNotifyBatchIds = batchIdSet;

  try {
    while (true) {
      const next = uploadQueue.value.find((i) => i.status === "queued");
      if (!next) break;
      await runSingleUpload(next.id);
    }
  } finally {
    uploadProcessorRunning = false;
    uploadNotifyBatchIds = null;

    if (batchIdSet.size >= 2) {
      const batchItems = uploadQueue.value.filter((item) =>
        batchIdSet.has(item.id),
      );
      const succeeded = batchItems.filter(
        (item) => item.status === "completed",
      ).length;
      const failed = batchItems.filter(
        (item) => item.status === "failed",
      ).length;
      const paused = batchItems.filter(
        (item) => item.status === "paused",
      ).length;
      const cancelled = batchItems.filter(
        (item) => item.status === "cancelled",
      ).length;
      notifyUploadBatchSummary(succeeded, failed, paused, cancelled);
    }

    const restart = uploadQueue.value.some((i) => i.status === "queued");
    if (uploadListingNeedsRefresh && !restart) {
      uploadListingNeedsRefresh = false;
      void refresh({ preserveSelection: true });
    }
    if (restart) {
      void processUploadQueue();
    }
  }
}

function abortUploadItem(id: string, mode: TransferAbortIntent["mode"]): void {
  setTransferAbortMode(uploadAbortIntents, uploadAbortControllers, id, mode);

  const item = findUploadItem(id);
  if (item && item.status === "queued") {
    item.status = mode === "cancel" ? "cancelled" : "paused";
    item.ownedByOtherTab = false;
    if (mode === "pause") {
      void persistUploadQueueMeta(props.agent_id, item);
    } else {
      releaseUploadClaim(id, "cancel");
      deleteLocalPausedEntry(props.agent_id, item.id);
      broadcastCancelForItem(item);
    }
  }
}

function pauseUploadItem(id: string) {
  abortUploadItem(id, "pause");
}

function cancelUploadItem(id: string) {
  const item = findUploadItem(id);
  if (item?.status === "paused") {
    void discardPausedUpload(item);
    return;
  }
  abortUploadItem(id, "cancel");
}

async function discardPausedUpload(item: UploadQueueItem): Promise<void> {
  item.status = "cancelled";
  item.hidden = false;
  setTransferMessage(item);
  item.ownedByOtherTab = false;

  let sessionId = item.sessionId;
  if (!sessionId && item.file) {
    const saved = loadUploadResume(
      props.agent_id,
      item.file,
      item.destinationPath,
    );
    sessionId = saved?.sessionId;
  }
  broadcastCancelForItem({ id: item.id, sessionId });
  releaseUploadClaim(item.id, "cancel");
  if (sessionId) {
    try {
      await cancelAgentFileUpload(props.agent_id, sessionId, "user");
    } catch {}
    clearUploadResumeBySessionId(sessionId);
  }
  if (item.file) {
    clearUploadResume(props.agent_id, item.file, item.destinationPath);
  }
  item.sessionId = undefined;
  await clearTransferPersistence(props.agent_id, sessionId, {
    localQueueId: item.id,
  });
  notifyInfo(gettext.$gettext("Upload cancelled."));
}

function selectFileToResumeUpload(id: string) {
  const item = findUploadItem(id);
  if (!item || item.status !== "paused") return;
  if (
    item.ownedByOtherTab ||
    getTabSync().isRemotelyOwned(claimKeyForUpload(item))
  ) {
    item.ownedByOtherTab = true;
    notifyWarning(gettext.$gettext("This upload is open in another tab."));
    return;
  }
  resumeUploadTargetId = id;
  resumeUploadFileInputRef.value?.click();
}

function onResumeUploadFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const targetId = resumeUploadTargetId;
  resumeUploadTargetId = null;
  input.value = "";
  if (!file || !targetId) return;

  const item = findUploadItem(targetId);
  if (!item || item.status !== "paused") return;
  if (
    item.ownedByOtherTab ||
    getTabSync().isRemotelyOwned(claimKeyForUpload(item))
  ) {
    item.ownedByOtherTab = true;
    notifyWarning(gettext.$gettext("This upload is open in another tab."));
    return;
  }

  if (item.uploadFileIdentity) {
    if (!matchesUploadFileIdentity(file, item.uploadFileIdentity)) {
      notifyError(
        gettext.$gettext(
          "Selected file does not match the paused upload (name, size, or modified time).",
        ),
      );
      return;
    }
  } else if (
    file.name !== item.name ||
    (item.sizeBytes > 0 && file.size !== item.sizeBytes)
  ) {
    notifyError(
      gettext.$gettext(
        "Selected file does not match the paused upload (name or size).",
      ),
    );
    return;
  }

  item.file = file;
  item.uploadFileIdentity = {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
  };
  item.sizeBytes = file.size;
  item.sizeLabel = bytes2Human(file.size);
  item.recoveryHint = "ready";
  setTransferMessage(item);
  item.hidden = false;
  item.status = "queued";
  void persistUploadQueueMeta(props.agent_id, item);
  void processUploadQueue();
}

function resumeUploadItem(id: string) {
  const item = findUploadItem(id);
  if (!item || item.status !== "paused") return;
  if (
    item.ownedByOtherTab ||
    getTabSync().isRemotelyOwned(claimKeyForUpload(item))
  ) {
    item.ownedByOtherTab = true;
    notifyWarning(gettext.$gettext("This upload is open in another tab."));
    return;
  }
  if (!item.file) {
    selectFileToResumeUpload(id);
    return;
  }
  item.hidden = false;
  item.status = "queued";
  setTransferMessage(item);
  item.recoveryHint = undefined;
  item.ownedByOtherTab = false;
  void processUploadQueue();
}

function hideUploadItem(id: string) {
  const item = findUploadItem(id);
  if (!item || item.status !== "paused") return;
  item.hidden = true;
  void persistUploadQueueMeta(props.agent_id, item);
}

function hideAllUploadItems() {
  for (const item of uploadQueue.value) {
    if (item.status === "paused") {
      item.hidden = true;
      void persistUploadQueueMeta(props.agent_id, item);
    }
  }
}

function dismissUploadItem(id: string) {
  const item = findUploadItem(id);
  if (!item) return;
  if (item.status === "queued" || isUploadQueueItemTerminal(item.status)) {
    uploadQueue.value = uploadQueue.value.filter((entry) => entry.id !== id);
  }
}

function clearFinishedUploads() {
  uploadQueue.value = uploadQueue.value.filter(
    (item) => !isUploadQueueItemTerminal(item.status),
  );
}

function onBrowserDragOver(e: DragEvent) {
  const target = e.target as Element | null;
  if (target?.closest?.(".file-table-wrap")) return;
  if (!isFileDragEvent(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
}

function onBrowserDrop(e: DragEvent) {
  const target = e.target as Element | null;
  if (target?.closest?.(".file-table-wrap")) return;
  if (!isFileDragEvent(e)) return;
  e.preventDefault();
}

function isFileDragEvent(e: DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "Files") return true;
  }
  return false;
}

function onGlobalFindShortcut(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key.toLowerCase() !== "f") return;
  if (e.altKey || e.shiftKey) return;

  const root = rootRef.value;
  if (!root || root.getClientRects().length === 0) return;

  const active = document.activeElement as HTMLElement | null;
  const focusInside = !!(active && root.contains(active));
  const focusIsBody =
    !active || active === document.body || active === document.documentElement;
  if (!focusInside && !focusIsBody) return;

  if (
    active?.closest?.(
      ".q-dialog, .q-menu, .xterm, [role='dialog'], [contenteditable='true']",
    )
  ) {
    return;
  }

  if (
    active &&
    (active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.tagName === "SELECT" ||
      active.isContentEditable) &&
    !active.closest(".toolbar-search")
  ) {
    return;
  }

  e.preventDefault();
  toolbarRef.value?.focusSearch();
}

function onFilesDropped(payload: { files: File[]; folderCount: number }) {
  if (!payload.files.length && payload.folderCount <= 0) return;
  void queueFilesForUpload(payload.files, {
    folderCount: payload.folderCount,
  });
}

function onDropRejected(reason: DropOverlayRejectReason) {
  notifyWarning(dropRejectToastMessage(reason));
}
</script>

<style scoped>
.hidden-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.file-browser {
  height: calc(100vh - 36px);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  gap: 12px;
  box-sizing: border-box;
  outline: none;
}

.file-browser > :not(.file-table-wrap) {
  flex: 0 0 auto;
}
</style>
