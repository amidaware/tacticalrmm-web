<template>
  <div
    class="col relative-position file-table-wrap"
    :class="{
      'file-table-wrap--dark': $q.dark.isActive,
    }"
    :style="{
      '--file-browser-row-height': `${FILE_BROWSER_ROW_HEIGHT_PX}px`,
      '--file-browser-header-height': `${FILE_BROWSER_HEADER_HEIGHT_PX}px`,
    }"
    role="region"
    :aria-label="dropRegionLabel"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div
      v-if="loading || loadingMore"
      class="file-table-progress"
      :class="{ 'file-table-progress--more': loadingMore && !loading }"
      aria-hidden="true"
    />

    <q-table
      ref="tableRef"
      flat
      dense
      row-key="id"
      class="file-browser-table file-browser-table--fill"
      :class="{
        'file-browser-table--filtering': !!filterQuery,
        'file-browser-table--busy': loading && rows.length > 0,
      }"
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      :rows="rows"
      :columns="columns"
      :loading="false"
      v-model:pagination="tablePagination"
      :sort-method="sortFileBrowserRows"
      binary-state-sort
      :rows-per-page-options="[0]"
      virtual-scroll
      :virtual-scroll-item-size="FILE_BROWSER_ROW_HEIGHT_PX"
      :virtual-scroll-sticky-size-start="FILE_BROWSER_HEADER_HEIGHT_PX"
      selection="multiple"
      v-model:selected="selected"
      :no-data-label="noDataLabel"
    >
      <template #no-data>
        <span class="hidden-no-data-slot" aria-hidden="true" />
      </template>

      <template #bottom>
        <div
          class="file-table-footer"
          :class="{ 'file-table-footer--muted': !footerLabel }"
        >
          {{ footerLabel }}
        </div>
      </template>

      <template #bottom-row>
        <q-tr
          v-if="showLoadMoreRow"
          class="file-table-load-more-row"
          :aria-busy="true"
        >
          <q-td :colspan="loadMoreColspan" class="file-table-load-more-cell">
            <div
              class="file-table-load-more"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <q-spinner color="primary" size="16px" aria-hidden="true" />
              <span>Loading more…</span>
            </div>
          </q-td>
        </q-tr>
      </template>

      <template #header-selection="scope">
        <q-checkbox v-model="scope.selected" dense size="xs" />
      </template>

      <template #body="props">
        <q-tr
          :props="props"
          class="cursor-pointer file-table-row"
          @dblclick="emit('row-dblclick', props.row)"
          @contextmenu.prevent="openRowMenu($event, props.row)"
          v-touch-hold="
            (details: TouchHoldDetails) => onRowTouchHold(details, props.row)
          "
        >
          <q-td class="file-col-select">
            <q-checkbox v-model="props.selected" dense size="xs" />
          </q-td>

          <q-td key="name" :props="props">
            <div class="row items-center no-wrap file-name-cell">
              <q-icon
                :name="props.row.type === 'folder' ? 'folder' : 'description'"
                :color="props.row.type === 'folder' ? 'yellow-8' : 'primary'"
                size="20px"
                class="q-mr-sm file-name-icon"
              />
              <span class="ellipsis file-name-label" :title="props.row.name">
                <template
                  v-for="(part, idx) in nameHighlightParts(props.row.name)"
                  :key="`${props.row.id}-${idx}`"
                >
                  <mark v-if="part.match" class="file-name-match">{{
                    part.text
                  }}</mark>
                  <template v-else>{{ part.text }}</template>
                </template>
              </span>
            </div>
          </q-td>

          <q-td key="modified" :props="props">
            {{ props.row.modified }}
          </q-td>

          <q-td key="type" :props="props">
            {{
              props.row.type === "folder"
                ? "Folder"
                : props.row.extension || "File"
            }}
          </q-td>

          <q-td key="size" :props="props">
            {{ props.row.type === "folder" ? "—" : props.row.size }}
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <!-- The menu anchors to this 1px element placed at the pointer. Anchored
         to the table instead, clicks anywhere in the table would count as
         "inside" and never close it. -->
    <div
      class="row-menu-anchor"
      :style="{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }"
      aria-hidden="true"
    >
      <q-menu
        ref="rowMenuRef"
        no-parent-event
        anchor="bottom left"
        self="top left"
        transition-show="jump-up"
        transition-hide="jump-down"
      >
        <q-list dense class="file-context-menu" style="min-width: 180px">
          <q-item
            v-if="menuRow?.type === 'folder'"
            clickable
            v-close-popup
            @click="emit('open-folder', menuRow!)"
          >
            <q-item-section avatar>
              <q-icon name="folder_open" size="18px" />
            </q-item-section>
            <q-item-section>Open</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="emit('download', menuRow!)">
            <q-item-section avatar>
              <q-icon name="download" size="18px" />
            </q-item-section>
            <q-item-section>Download</q-item-section>
          </q-item>

          <q-item
            v-if="isZipFileItem(menuRow)"
            clickable
            v-close-popup
            @click="emit('extract', menuRow!)"
          >
            <q-item-section avatar>
              <q-icon name="unarchive" size="18px" />
            </q-item-section>
            <q-item-section>Extract to…</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="emit('rename', menuRow!)">
            <q-item-section avatar>
              <q-icon name="edit" size="18px" />
            </q-item-section>
            <q-item-section>Rename</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="emit('delete', menuRow!)">
            <q-item-section avatar>
              <q-icon name="delete" size="18px" color="negative" />
            </q-item-section>
            <q-item-section class="text-negative">Delete</q-item-section>
          </q-item>

          <q-separator />

          <q-item clickable v-close-popup @click="emit('properties', menuRow!)">
            <q-item-section avatar>
              <q-icon name="info" size="18px" />
            </q-item-section>
            <q-item-section>Properties</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="emit('copy-path', menuRow!)">
            <q-item-section avatar>
              <q-icon name="content_copy" size="18px" />
            </q-item-section>
            <q-item-section>Copy Path</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </div>

    <div
      v-if="showEmptyState"
      class="file-browser-empty-state"
      :class="{
        'file-browser-empty-state--error': emptyIsError,
        'file-browser-empty-state--filter': showClearFilterAction,
      }"
      aria-live="polite"
    >
      <q-spinner v-if="loading" color="primary" size="28px" class="q-mb-sm" />
      <span v-else class="file-browser-empty-state__label">{{
        noDataLabel
      }}</span>
      <q-btn
        v-if="showClearFilterAction && !loading"
        flat
        dense
        no-caps
        color="primary"
        label="Clear filter"
        class="file-browser-empty-state__clear"
        @click="emit('clear-filter')"
      />
    </div>

    <div
      v-if="showDropOverlay"
      class="drop-target"
      :class="{ 'drop-target--reject': dropRejected }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="drop-target__scrim" aria-hidden="true" />
      <div class="drop-target__card">
        <q-icon
          class="drop-target__icon"
          :name="dropRejected ? 'block' : 'upload'"
          size="26px"
          aria-hidden="true"
        />
        <div class="drop-target__title">{{ dropTitle }}</div>
        <template v-if="!dropRejected">
          <div class="drop-target__dest">
            Uploading to
            <span class="drop-target__leaf">{{ destinationLeaf }}</span>
          </div>
          <div
            v-if="currentPath"
            class="drop-target__path"
            :title="currentPath"
          >
            {{ pathDisplay }}
            <q-tooltip
              v-if="pathIsTruncated"
              anchor="top middle"
              self="bottom middle"
            >
              {{ currentPath }}
            </q-tooltip>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useModel,
  watch,
} from "vue";
import { QMenu, TouchHold, useQuasar } from "quasar";

import { fileBrowserTableColumns } from "@/utils/filebrowserColumns";
import {
  collectDroppedUploadFiles,
  formatDropOverlayTitle,
  fileBrowserPathLeaf,
  getFileBrowserNameHighlightParts,
  inspectFileDrag,
  isFileDrag,
  isZipFileItem,
  resolveDropOverlayReject,
  sortFileBrowserRows,
  truncatePathMiddle,
  type DropOverlayRejectReason,
} from "@/utils/filebrowser";
import {
  FILE_BROWSER_HEADER_HEIGHT_PX,
  FILE_BROWSER_LOAD_MORE_THRESHOLD,
  FILE_BROWSER_ROW_HEIGHT_PX,
} from "@/constants/filebrowser";
import type { FileBrowserItem } from "@/types/filebrowser";

type FileBrowserTableRoot = HTMLElement | {
  $el?: HTMLElement;
  scrollTo?: (index: number) => void;
};

const $q = useQuasar();

const props = withDefaults(
  defineProps<{
    rows: FileBrowserItem[];
    loading: boolean;
    noDataLabel: string;
    emptyIsError?: boolean;
    dropEnabled?: boolean;
    currentPath: string;
    selected?: FileBrowserItem[];
    queueRoom?: number;
    maxFilesPerSelection?: number;
    maxFileSizeBytes?: number;
    filterQuery?: string;
    folderItemCount?: number;
    listTotal?: number | null;
    hasMore?: boolean;
    loadingMore?: boolean;
    filterActive?: boolean;
  }>(),
  {
    dropEnabled: false,
    emptyIsError: false,
    queueRoom: Number.POSITIVE_INFINITY,
    maxFilesPerSelection: 100,
    maxFileSizeBytes: 0,
    filterQuery: "",
    folderItemCount: 0,
    listTotal: null,
    hasMore: false,
    loadingMore: false,
    filterActive: false,
  },
);

const showEmptyState = computed(() => props.rows.length === 0);

const showLoadMoreRow = computed(
  () => props.loadingMore && props.rows.length > 0,
);

const loadMoreColspan = computed(() => fileBrowserTableColumns.length + 1);

const showClearFilterAction = computed(
  () =>
    showEmptyState.value &&
    !props.loading &&
    !props.emptyIsError &&
    props.filterActive,
);

const footerLabel = computed(() => {
  if (props.loading) return "";

  const loaded = props.folderItemCount;
  const total =
    props.listTotal != null && props.listTotal >= 0 ? props.listTotal : null;

  if (props.filterActive) {
    if (props.hasMore || props.loadingMore) {
      if (total != null && total > loaded) {
        return `${loaded.toLocaleString()} of ${total.toLocaleString()} matches loaded`;
      }
      return `${loaded.toLocaleString()} matches loaded`;
    }
    if (total != null && total > 0) {
      return total === 1 ? "1 match" : `${total.toLocaleString()} matches`;
    }
    return loaded === 1 ? "1 match" : `${loaded.toLocaleString()} matches`;
  }

  if (loaded <= 0 && props.rows.length === 0) return "";

  if (props.hasMore || props.loadingMore) {
    if (total != null && total > loaded) {
      return `${loaded.toLocaleString()} of ${total.toLocaleString()} loaded`;
    }
    return `${loaded.toLocaleString()} loaded`;
  }

  const count = total != null && total > 0 ? total : loaded;
  return count === 1 ? "1 item" : `${count.toLocaleString()} items`;
});

const emit = defineEmits<{
  (e: "row-dblclick", row: FileBrowserItem): void;
  (e: "open-folder", row: FileBrowserItem): void;
  (e: "download", row: FileBrowserItem): void;
  (e: "extract", row: FileBrowserItem): void;
  (e: "rename", row: FileBrowserItem): void;
  (e: "delete", row: FileBrowserItem): void;
  (e: "properties", row: FileBrowserItem): void;
  (e: "copy-path", row: FileBrowserItem): void;
  (e: "update:selected", value: FileBrowserItem[]): void;
  (e: "files-dropped", payload: { files: File[]; folderCount: number }): void;
  (e: "drop-rejected", reason: DropOverlayRejectReason): void;
  (e: "clear-filter"): void;
  (e: "load-more"): void;
}>();

const selected = useModel(props, "selected");

const columns = fileBrowserTableColumns;

const tableRef = ref<FileBrowserTableRoot | null>(null);

// One context menu for the whole table (a QMenu per row is costly on large
// folders); it opens at the pointer for the row that was right-clicked.
const rowMenuRef = ref<QMenu | null>(null);
const menuRow = ref<FileBrowserItem | null>(null);
const menuPos = ref({ x: 0, y: 0 });

// iOS Safari doesn't fire contextmenu on long press
const vTouchHold = TouchHold;
type TouchHoldDetails = { position: { top: number; left: number } };
let lastRowMenuOpen = { row: null as FileBrowserItem | null, at: 0 };

function openRowMenu(evt: MouseEvent, row: FileBrowserItem) {
  showRowMenuAt(evt.clientX, evt.clientY, row);
}

function onRowTouchHold(details: TouchHoldDetails, row: FileBrowserItem) {
  // Android already opened it via contextmenu
  if (lastRowMenuOpen.row === row && Date.now() - lastRowMenuOpen.at < 1000) {
    return;
  }
  showRowMenuAt(details.position.left, details.position.top, row);
}

function showRowMenuAt(x: number, y: number, row: FileBrowserItem) {
  const menu = rowMenuRef.value;
  if (!menu) return;
  lastRowMenuOpen = { row, at: Date.now() };
  menu.hide();
  menuPos.value = { x, y };
  // Show after the anchor has moved so the menu is placed at the pointer.
  void nextTick(() => {
    menuRow.value = row;
    menu.show();
  });
}
let tableScrollEl: HTMLElement | null = null;

function getTableRootEl(): HTMLElement | null {
  const inst = tableRef.value;
  if (!inst) return null;
  if (inst instanceof HTMLElement) return inst;
  const el = inst.$el;
  return el instanceof HTMLElement ? el : null;
}

const tablePagination = ref({
  page: 1,
  rowsPerPage: 0,
  sortBy: "name",
  descending: false,
});

function onTableMiddleScroll() {
  if (!props.hasMore || props.loading || props.loadingMore) return;
  const el = tableScrollEl;
  if (!el) return;

  const thresholdPx =
    FILE_BROWSER_ROW_HEIGHT_PX * FILE_BROWSER_LOAD_MORE_THRESHOLD;
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remaining <= thresholdPx) {
    emit("load-more");
  }
}

function bindTableScroll() {
  unbindTableScroll();
  const root = getTableRootEl();
  if (!root) return;
  const middle = root.querySelector(".q-table__middle") as HTMLElement | null;
  if (!middle) return;
  tableScrollEl = middle;
  middle.addEventListener("scroll", onTableMiddleScroll, { passive: true });
}

function unbindTableScroll() {
  if (tableScrollEl) {
    tableScrollEl.removeEventListener("scroll", onTableMiddleScroll);
    tableScrollEl = null;
  }
}

let pendingScrollToTop = false;

function scrollTableToTop() {
  const inst = tableRef.value;
  if (
    inst &&
    !(inst instanceof HTMLElement) &&
    typeof inst.scrollTo === "function"
  ) {
    inst.scrollTo(0);
  }
  if (!tableScrollEl) {
    bindTableScroll();
  }
  if (tableScrollEl) {
    tableScrollEl.scrollTop = 0;
  }
}

function scheduleScrollToTop() {
  void nextTick(() => {
    if (!pendingScrollToTop || props.loading) return;
    bindTableScroll();
    scrollTableToTop();
    requestAnimationFrame(() => {
      if (!pendingScrollToTop || props.loading) return;
      scrollTableToTop();
      pendingScrollToTop = false;
    });
  });
}

watch(
  () => props.currentPath,
  () => {
    pendingScrollToTop = true;
    if (!props.loading) {
      scheduleScrollToTop();
    }
  },
);

watch(
  () => props.loading,
  (isLoading) => {
    if (pendingScrollToTop && !isLoading) {
      scheduleScrollToTop();
    }
  },
);

watch(
  () => props.rows.length,
  () => {
    void nextTick(() => {
      bindTableScroll();
      if (pendingScrollToTop && !props.loading) {
        scheduleScrollToTop();
      }
      onTableMiddleScroll();
    });
  },
);

const dragCounter = ref(0);
const isFileDragSession = ref(false);
const rejectReason = ref<DropOverlayRejectReason | null>(null);
const dragFileCount = ref<number | null>(null);

const PATH_DISPLAY_MAX = 52;

const showDropOverlay = computed(
  () => !!props.dropEnabled && dragCounter.value > 0 && isFileDragSession.value,
);

const dropRejected = computed(() => rejectReason.value != null);

const destinationLeaf = computed(() =>
  fileBrowserPathLeaf(props.currentPath || ""),
);

const pathDisplay = computed(() =>
  truncatePathMiddle(props.currentPath || "", PATH_DISPLAY_MAX),
);

const pathIsTruncated = computed(
  () => (props.currentPath || "").trim().length > PATH_DISPLAY_MAX,
);

const dropTitle = computed(() =>
  formatDropOverlayTitle(rejectReason.value, dragFileCount.value),
);

const dropRegionLabel = computed(() => {
  if (!props.dropEnabled) {
    return "File list";
  }
  return "File list. Drop files here to upload, or use the Upload button.";
});

function nameHighlightParts(name: string) {
  return getFileBrowserNameHighlightParts(name, props.filterQuery);
}

function resetDragState() {
  dragCounter.value = 0;
  isFileDragSession.value = false;
  rejectReason.value = null;
  dragFileCount.value = null;
}

function syncDropState(dataTransfer?: DataTransfer | null) {
  if (!props.dropEnabled) {
    isFileDragSession.value = false;
    rejectReason.value = null;
    dragFileCount.value = null;
    return;
  }

  if (!isFileDrag(dataTransfer)) {
    return;
  }

  isFileDragSession.value = true;

  const inspection = inspectFileDrag(dataTransfer, props.maxFileSizeBytes);

  dragFileCount.value = inspection.countKnown ? inspection.fileCount : null;

  rejectReason.value = resolveDropOverlayReject({
    inspection,
    queueRoom: props.queueRoom,
    maxFilesPerSelection: props.maxFilesPerSelection,
    maxFileSizeBytes: props.maxFileSizeBytes,
  });
}

function applyDropEffect(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer || !props.dropEnabled || !isFileDrag(dataTransfer)) return;
  dataTransfer.dropEffect = rejectReason.value ? "none" : "copy";
}

function onDragEnter(e: DragEvent) {
  dragCounter.value += 1;
  syncDropState(e.dataTransfer);
  applyDropEffect(e.dataTransfer);
}

function onDragOver(e: DragEvent) {
  syncDropState(e.dataTransfer);
  applyDropEffect(e.dataTransfer);
}

function onDragLeave() {
  dragCounter.value -= 1;
  if (dragCounter.value <= 0) {
    resetDragState();
  }
}

function onDrop(e: DragEvent) {
  const reasonAtDrop = rejectReason.value;
  const wasFileDrag = isFileDragSession.value;
  resetDragState();

  if (!props.dropEnabled || !wasFileDrag) return;

  const { files, folderCount } = collectDroppedUploadFiles(e.dataTransfer);
  const inspection = inspectFileDrag(e.dataTransfer, props.maxFileSizeBytes);
  if (files.length > 0 || folderCount > 0) {
    inspection.fileCount = files.length;
    inspection.folderCount = folderCount;
    inspection.countKnown = true;
    if (props.maxFileSizeBytes > 0 && files.length > 0) {
      inspection.oversizedFileCount = files.filter(
        (f) => f.size > props.maxFileSizeBytes,
      ).length;
      inspection.sizeKnown = true;
    }
  }

  const reason =
    resolveDropOverlayReject({
      inspection,
      queueRoom: props.queueRoom,
      maxFilesPerSelection: props.maxFilesPerSelection,
      maxFileSizeBytes: props.maxFileSizeBytes,
    }) ?? reasonAtDrop;

  if (reason) {
    emit("drop-rejected", reason);
    return;
  }

  if (!files.length) {
    emit("drop-rejected", folderCount > 0 ? "folders" : "unsupported");
    return;
  }

  emit("files-dropped", { files, folderCount });
}

onMounted(() => {
  window.addEventListener("dragend", resetDragState);
  window.addEventListener("blur", resetDragState);
  void nextTick(() => {
    bindTableScroll();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("dragend", resetDragState);
  window.removeEventListener("blur", resetDragState);
  unbindTableScroll();
  resetDragState();
});
</script>

<style scoped>
.file-table-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 0 !important;
  max-height: none !important;
  overflow: hidden;
  align-self: stretch;
  width: 100%;
}

.file-table-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 5;
  overflow: hidden;
  pointer-events: none;
  background: color-mix(in srgb, var(--q-primary) 22%, transparent);
}

.file-table-progress::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 1px;
  background: var(--q-primary);
  opacity: 0.35;
  box-shadow: 0 0 8px color-mix(in srgb, var(--q-primary) 55%, transparent);
  animation: file-table-progress-pulse 1.1s ease-in-out infinite;
}

.file-table-progress--more::after {
  animation-duration: 1.35s;
}

@keyframes file-table-progress-pulse {
  0%,
  100% {
    opacity: 0.28;
    box-shadow: 0 0 4px color-mix(in srgb, var(--q-primary) 30%, transparent);
  }
  50% {
    opacity: 0.95;
    box-shadow: 0 0 10px color-mix(in srgb, var(--q-primary) 65%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .file-table-progress::after {
    animation: none;
    opacity: 0.7;
    box-shadow: none;
  }
}

.file-browser-table--busy {
  opacity: 0.72;
  transition: opacity 0.15s ease;
}

@media (prefers-reduced-motion: reduce) {
  .file-browser-table--busy {
    transition: none;
  }
}

.file-table-wrap :deep(.file-browser-table--fill) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100% !important;
  max-height: none !important;
  display: flex;
  flex-direction: column;
}

.file-table-wrap :deep(.file-browser-table--fill .q-table__top),
.file-table-wrap :deep(.file-browser-table--fill .q-table__bottom) {
  flex: 0 0 auto;
}

.file-table-wrap :deep(.file-browser-table--fill .q-table__middle) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.file-table-wrap :deep(.file-browser-table table) {
  table-layout: fixed;
  width: 100%;
}

.file-table-wrap :deep(.file-browser-table th:first-child),
.file-table-wrap :deep(.file-browser-table td.file-col-select),
.file-table-wrap :deep(.file-browser-table .q-table--col-auto-width) {
  width: 44px !important;
  max-width: 44px;
  min-width: 44px;
  padding: 0 !important;
  text-align: center;
  vertical-align: middle;
}

.file-table-wrap :deep(.file-browser-table th:first-child .q-checkbox),
.file-table-wrap :deep(.file-browser-table td.file-col-select .q-checkbox) {
  margin: 0 auto;
}

.file-table-wrap :deep(.file-browser-table th:first-child .q-checkbox__inner),
.file-table-wrap
  :deep(.file-browser-table td.file-col-select .q-checkbox__inner) {
  margin: 0 auto;
}

.file-table-wrap :deep(.file-browser-table--fill thead tr th) {
  position: sticky;
  top: 0;
  z-index: 1;
}

.file-table-wrap :deep(.hidden-no-data-slot) {
  display: none;
}

.file-browser-empty-state {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--file-browser-header-height);
  bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  pointer-events: none;
  z-index: 1;
  text-align: center;
}

.file-browser-empty-state__label {
  font-size: 0.95rem;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.55);
  max-width: 420px;
  overflow-wrap: anywhere;
}

.file-browser-empty-state__clear {
  pointer-events: auto;
}

.file-table-footer {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 10px;
  font-size: 12px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.55);
  box-sizing: border-box;
}

.file-table-footer--muted {
  color: transparent;
  user-select: none;
}

.file-table-wrap--dark .file-table-footer {
  color: rgba(255, 255, 255, 0.55);
}

.file-table-wrap--dark .file-table-footer--muted {
  color: transparent;
}

.file-table-wrap--dark .file-browser-empty-state__label {
  color: rgba(255, 255, 255, 0.55);
}

.file-browser-empty-state--error .file-browser-empty-state__label {
  color: var(--q-negative);
}

.file-table-wrap :deep(.file-table-row:hover > td) {
  background: rgba(0, 0, 0, 0.045) !important;
}

.file-table-wrap--dark :deep(.file-table-row:hover > td) {
  background: rgba(255, 255, 255, 0.07) !important;
}

.file-table-wrap :deep(.file-browser-table tbody td) {
  height: var(--file-browser-row-height);
  min-height: var(--file-browser-row-height);
  max-height: var(--file-browser-row-height);
  box-sizing: border-box;
  padding-top: 0;
  padding-bottom: 0;
  vertical-align: middle;
  border-bottom: 1px solid rgba(0, 0, 0, 0.14) !important;
}

.file-table-wrap :deep(.file-browser-table tbody tr.file-table-row) {
  height: var(--file-browser-row-height);
}

.file-table-load-more-row {
  pointer-events: none;
  user-select: none;
}

.file-table-wrap :deep(.file-table-load-more-row:hover > td) {
  background: transparent !important;
}

.file-table-wrap :deep(.file-table-load-more-cell) {
  height: auto !important;
  min-height: var(--file-browser-row-height);
  max-height: none !important;
  padding: 10px 12px !important;
  border-bottom: none !important;
}

.file-table-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  font-size: 0.8125rem;
  line-height: 1.3;
  letter-spacing: 0.01em;
  color: rgba(0, 0, 0, 0.55);
}

.file-table-wrap--dark .file-table-load-more {
  color: rgba(255, 255, 255, 0.55);
}

.file-table-wrap--dark :deep(.file-browser-table tbody td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: rgba(255, 255, 255, 0.87);
}

.file-table-wrap :deep(.file-browser-table thead tr th) {
  height: var(--file-browser-header-height);
  min-height: var(--file-browser-header-height);
  max-height: var(--file-browser-header-height);
  box-sizing: border-box;
  padding-top: 0;
  padding-bottom: 0;
  vertical-align: middle;
  border-bottom: 1px solid rgba(0, 0, 0, 0.16) !important;
}

.file-table-wrap--dark :deep(.file-browser-table thead tr th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.16) !important;
  color: rgba(255, 255, 255, 0.7);
}

.file-table-wrap :deep(th.sortable .q-table__sort-icon) {
  opacity: 0;
  transition: opacity 0.15s ease;
}
.file-table-wrap :deep(th.sortable:hover .q-table__sort-icon) {
  opacity: 0.45;
}
.file-table-wrap :deep(th.sorted .q-table__sort-icon),
.file-table-wrap :deep(th.sorted:hover .q-table__sort-icon) {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .file-table-wrap :deep(th.sortable .q-table__sort-icon) {
    transition: none;
  }
}

.file-table-wrap--dark :deep(.file-browser-table .q-table__bottom) {
  color: rgba(255, 255, 255, 0.7);
}

.row-menu-anchor {
  position: fixed;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.file-context-menu .q-item__section--avatar {
  min-width: 28px;
  padding-right: 8px;
}

.file-context-menu .q-item__section--main {
  padding-left: 0;
}

.file-context-menu .q-icon {
  font-size: 18px;
}

.drop-target {
  --drop-bg: #f4f8fc;
  --drop-border: #5aa3e8;
  --drop-icon: #3d8fd4;
  --drop-title: #20252b;
  --drop-secondary: #5c6670;
  --drop-leaf: #2a3138;
  --drop-path: #4a5560;
  --drop-shadow: 0 6px 20px rgba(32, 37, 43, 0.12);
  --drop-scrim: rgba(255, 255, 255, 0.28);

  position: absolute;
  left: 0;
  right: 0;
  top: var(--file-browser-header-height);
  bottom: 32px;
  z-index: 10;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.file-table-wrap--dark .drop-target {
  --drop-bg: #1d2b38;
  --drop-border: #2f80c9;
  --drop-icon: #4ea1e0;
  --drop-title: #f5f7fa;
  --drop-secondary: #b0bac4;
  --drop-leaf: #e8eef4;
  --drop-path: #9aa6b2;
  --drop-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  --drop-scrim: rgba(0, 0, 0, 0.22);
}

.drop-target--reject {
  --drop-border: #d64545;
  --drop-icon: #d64545;
  --drop-title: #8f1f1f;
  --drop-bg: #fbf4f4;
  --drop-shadow: 0 6px 20px rgba(143, 31, 31, 0.12);
}

.file-table-wrap--dark .drop-target--reject {
  --drop-border: #e57373;
  --drop-icon: #ef9a9a;
  --drop-title: #ffebee;
  --drop-bg: #2a2226;
  --drop-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.drop-target__scrim {
  position: absolute;
  inset: 0;
  background: var(--drop-scrim);
}

.drop-target__card {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: min(280px, 100%);
  padding: 24px 28px;
  border-radius: 10px;
  border: 1px solid var(--drop-border);
  background: var(--drop-bg);
  box-shadow: var(--drop-shadow);
  text-align: center;
  animation: drop-target-fade-in 140ms ease-out;
}

.drop-target__icon {
  margin-bottom: 2px;
  color: var(--drop-icon);
}

.drop-target__title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  color: var(--drop-title);
}

.drop-target__dest {
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--drop-secondary);
}

.drop-target__leaf {
  font-weight: 600;
  color: var(--drop-leaf);
}

.drop-target__path {
  position: relative;
  max-width: 100%;
  margin-top: 2px;
  font-size: 0.6875rem;
  line-height: 1.35;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--drop-path);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes drop-target-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drop-target__card {
    animation: none;
  }
}

.file-name-cell {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.file-name-icon {
  flex: 0 0 auto;
}

.ellipsis {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name-label {
  display: block;
  vertical-align: bottom;
}

.file-name-match {
  padding: 0;
  margin: 0;
  background: rgba(90, 163, 232, 0.35);
  color: inherit;
  border-radius: 2px;
}

.file-table-wrap--dark .file-name-match {
  background: rgba(47, 128, 201, 0.45);
}

.file-table-wrap :deep(.file-table-row:hover .file-name-match),
.file-table-wrap :deep(.file-table-row.selected .file-name-match) {
  background: rgba(90, 163, 232, 0.5);
}

.file-table-wrap--dark :deep(.file-table-row:hover .file-name-match),
.file-table-wrap--dark :deep(.file-table-row.selected .file-name-match) {
  background: rgba(47, 128, 201, 0.62);
}
</style>
