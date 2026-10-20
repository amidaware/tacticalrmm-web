<template>
  <div
    class="row items-center justify-between file-toolbar"
    :class="{ 'file-toolbar--dark': $q.dark.isActive }"
  >
    <div class="row items-center q-gutter-sm file-toolbar__actions">
      <q-btn
        dense
        unelevated
        no-caps
        color="primary"
        icon="upload"
        label="Upload"
        class="toolbar-btn toolbar-primary-btn"
        :disable="!hasUploadPath"
        @click="emit('upload')"
      />

      <q-btn
        dense
        unelevated
        icon="create_new_folder"
        label="New Folder"
        class="toolbar-btn"
        :disable="!hasUploadPath"
        @click="emit('new-folder')"
      />
      <q-btn
        dense
        unelevated
        icon="download"
        label="Download"
        class="toolbar-btn"
        :disable="selectedCount === 0"
        @click="emit('download')"
      />
      <q-btn
        dense
        unelevated
        icon="delete"
        label="Delete"
        class="toolbar-btn"
        :disable="selectedCount === 0"
        @click="emit('delete')"
      />
      <q-btn
        dense
        unelevated
        icon="edit"
        label="Rename"
        class="toolbar-btn"
        :disable="selectedCount !== 1"
        @click="emit('rename')"
      />

      <q-btn
        dense
        unelevated
        label="More"
        icon-right="expand_more"
        class="toolbar-btn"
      >
        <q-menu transition-show="jump-up" transition-hide="jump-down">
          <q-list dense class="file-context-menu" style="min-width: 180px">
            <q-item
              clickable
              v-close-popup
              :disable="selectedCount !== 1"
              @click="emit('properties')"
            >
              <q-item-section avatar>
                <q-icon name="info" size="18px" />
              </q-item-section>
              <q-item-section>Properties</q-item-section>
            </q-item>

            <q-item
              v-if="canExtract"
              clickable
              v-close-popup
              @click="emit('extract')"
            >
              <q-item-section avatar>
                <q-icon name="unarchive" size="18px" />
              </q-item-section>
              <q-item-section>Extract to…</q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              :disable="selectedCount === 0"
              @click="emit('copy-path')"
            >
              <q-item-section avatar>
                <q-icon name="content_copy" size="18px" />
              </q-item-section>
              <q-item-section>Copy Path</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>

    <div
      class="row items-center q-gutter-sm file-toolbar__trailing min-width-0"
    >
      <q-btn
        v-if="showTransfers"
        dense
        unelevated
        no-caps
        icon="swap_vert"
        :label="transfersLabel"
        class="toolbar-btn"
        @click="emit('open-transfers')"
      >
        <q-badge
          v-if="pausedCount > 0"
          color="warning"
          text-color="dark"
          floating
        >
          {{ pausedCount }}
        </q-badge>
        <q-tooltip v-if="pausedCount > 0">
          {{ pausedTooltip }} — resume anytime, or cancel to discard
        </q-tooltip>
      </q-btn>

      <div class="toolbar-search-wrap row items-center no-wrap min-width-0">
        <span
          v-if="showFilterCount"
          class="toolbar-filter-count"
          :class="{
            'toolbar-filter-count--stale': listingLoading || filterSearching,
          }"
          aria-live="polite"
        >
          {{ filterCountLabel }}
        </span>

        <q-input
          ref="searchInputRef"
          :model-value="search"
          dense
          outlined
          clearable
          hide-bottom-space
          class="toolbar-search"
          :class="{ 'toolbar-search--active': filterActive }"
          placeholder="Filter by name in this folder"
          aria-label="Filter by name in this folder"
          :dark="$q.dark.isActive"
          @update:model-value="onSearchUpdate"
          @keydown="onSearchKeydown"
        >
          <template #prepend>
            <q-spinner
              v-if="filterSearching || (listingLoading && filterActive)"
              color="primary"
              size="16px"
              aria-hidden="true"
            />
            <q-icon v-else name="search" size="18px" />
          </template>
        </q-input>
      </div>

      <q-btn
        dense
        unelevated
        icon="refresh"
        class="toolbar-btn toolbar-icon-btn"
        aria-label="Refresh folder"
        @click="emit('refresh')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuasar } from "quasar";

const $q = useQuasar();

const props = withDefaults(
  defineProps<{
    hasUploadPath: boolean;
    selectedCount: number;
    search: string;
    showTransfers?: boolean;
    canExtract?: boolean;
    transfersLabel?: string;
    pausedCount?: number;
    filterMatchCount?: number;
    filterTotalCount?: number;
    listingLoading?: boolean;
    filterSearching?: boolean;
  }>(),
  {
    showTransfers: false,
    canExtract: false,
    transfersLabel: "Transfers",
    pausedCount: 0,
    filterMatchCount: 0,
    filterTotalCount: 0,
    listingLoading: false,
    filterSearching: false,
  },
);

const emit = defineEmits<{
  (e: "upload"): void;
  (e: "new-folder"): void;
  (e: "download"): void;
  (e: "delete"): void;
  (e: "rename"): void;
  (e: "properties"): void;
  (e: "copy-path"): void;
  (e: "extract"): void;
  (e: "refresh"): void;
  (e: "open-transfers"): void;
  (e: "update:search", value: string): void;
}>();

type SearchInputExpose = {
  focus: () => void;
  getNativeElement?: () => HTMLInputElement;
  $el?: HTMLElement;
};

const searchInputRef = ref<SearchInputExpose | null>(null);

const filterActive = computed(() => (props.search ?? "").trim().length > 0);

const showFilterCount = computed(() => filterActive.value);

const filterCountLabel = computed(() => {
  if (props.filterSearching) {
    return "Searching this folder…";
  }
  const match = props.filterMatchCount ?? 0;
  const total = props.filterTotalCount ?? 0;
  if (total > 0 && match !== total) {
    return `${match.toLocaleString()} of ${total.toLocaleString()} matches`;
  }
  if (total === 1) return "1 match";
  if (total > 1) return `${total.toLocaleString()} matches`;
  return "0 matches";
});

const pausedTooltip = computed(() =>
  (props.pausedCount ?? 0) === 1
    ? "1 paused"
    : `${props.pausedCount ?? 0} paused`,
);

function onSearchUpdate(val: string | number | null) {
  emit("update:search", String(val ?? ""));
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.stopPropagation();
  if ((props.search ?? "").length > 0) {
    e.preventDefault();
    emit("update:search", "");
    return;
  }
  (e.target as HTMLElement | null)?.blur?.();
}

function focusSearch() {
  const input = searchInputRef.value;
  input?.focus?.();
  const native =
    (input?.getNativeElement?.() as HTMLInputElement | undefined) ??
    (input?.$el?.querySelector?.("input") as HTMLInputElement | null);
  native?.select?.();
}

defineExpose({
  focusSearch,
});
</script>

<style scoped>
.file-toolbar {
  gap: 12px;
}

.file-toolbar__trailing {
  flex: 0 1 auto;
}

.file-toolbar :deep(.q-btn) {
  text-transform: none !important;
}

.file-toolbar :deep(.toolbar-btn),
.file-toolbar :deep(.toolbar-primary-btn) {
  height: 32px;
  min-height: 32px;
  max-height: 32px;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.25;
}

.file-toolbar :deep(.toolbar-btn .q-btn__wrapper),
.file-toolbar :deep(.toolbar-primary-btn .q-btn__wrapper) {
  min-height: 32px;
  padding: 0 12px;
}

.file-toolbar :deep(.toolbar-btn .q-btn__content),
.file-toolbar :deep(.toolbar-primary-btn .q-btn__content) {
  font-size: 13px;
  line-height: 1.25;
}

.file-toolbar :deep(.toolbar-btn .q-icon),
.file-toolbar :deep(.toolbar-primary-btn .q-icon) {
  font-size: 18px;
}

.file-toolbar :deep(.toolbar-btn:not(.toolbar-primary-btn)) {
  background: #fff;
  border: 1px solid #d0d0d0;
  color: rgba(0, 0, 0, 0.87);
}

.file-toolbar :deep(.toolbar-primary-btn) {
  border: none;
}

.file-toolbar :deep(.toolbar-btn:not(.toolbar-primary-btn):hover) {
  background: #f0f0f0;
}

.file-toolbar :deep(.toolbar-btn.q-btn--disabled) {
  opacity: 0.45;
}

.file-toolbar :deep(.toolbar-primary-btn.q-btn--disabled) {
  opacity: 0.55;
}

.file-toolbar :deep(.toolbar-icon-btn) {
  width: 32px;
  min-width: 32px;
  padding: 0;
}

.file-toolbar :deep(.toolbar-icon-btn .q-btn__content) {
  padding: 0;
}

.toolbar-search-wrap {
  gap: 8px;
  min-width: 0;
}

.toolbar-filter-count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  color: #5c6670;
  font-variant-numeric: tabular-nums;
}

.toolbar-filter-count--stale {
  opacity: 0.45;
}

.file-toolbar :deep(.toolbar-search) {
  width: clamp(160px, 22vw, 280px);
  min-width: 140px;
  max-width: 280px;
}

.file-toolbar :deep(.toolbar-search .q-field__control) {
  min-height: 32px;
  height: 32px;
  border-radius: 6px;
  background: #f4f8fc;
  align-items: center;
}

.file-toolbar :deep(.toolbar-search .q-field__control:before) {
  border-color: #c5d4e3;
}

.file-toolbar :deep(.toolbar-search--active .q-field__control:before) {
  border-color: #5aa3e8;
}

.file-toolbar :deep(.toolbar-search .q-field__prepend) {
  height: 32px;
  padding-right: 6px;
  align-self: center;
  color: #5c6670;
}

.file-toolbar :deep(.toolbar-search .q-field__prepend .q-icon) {
  font-size: 18px;
}

.file-toolbar :deep(.toolbar-search .q-field__native) {
  min-height: 32px;
  line-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  color: #20252b;
}

.file-toolbar :deep(.toolbar-search .q-field__native::placeholder) {
  color: #7a8692;
  opacity: 1;
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

.file-toolbar--dark :deep(.toolbar-btn:not(.toolbar-primary-btn)) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.9);
}

.file-toolbar--dark :deep(.toolbar-btn:not(.toolbar-primary-btn):hover) {
  background: rgba(255, 255, 255, 0.12);
}

.file-toolbar--dark :deep(.toolbar-btn.q-btn--disabled) {
  opacity: 0.38;
  color: rgba(255, 255, 255, 0.45);
}

.file-toolbar--dark .toolbar-filter-count {
  color: #b0bac4;
}

.file-toolbar--dark :deep(.toolbar-search .q-field__control) {
  background: #1d2b38;
}

.file-toolbar--dark :deep(.toolbar-search .q-field__control:before) {
  border-color: rgba(255, 255, 255, 0.18);
}

.file-toolbar--dark :deep(.toolbar-search--active .q-field__control:before) {
  border-color: #2f80c9;
}

.file-toolbar--dark :deep(.toolbar-search .q-field__prepend) {
  color: #b0bac4;
}

.file-toolbar--dark :deep(.toolbar-search .q-field__native) {
  color: #f5f7fa;
}

.file-toolbar--dark :deep(.toolbar-search .q-field__native::placeholder) {
  color: rgba(255, 255, 255, 0.45);
}
</style>
