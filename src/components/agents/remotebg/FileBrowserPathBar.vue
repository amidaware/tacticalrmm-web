<template>
  <div
    class="row items-center file-path-row"
    :class="{ 'file-path-row--dark': $q.dark.isActive }"
  >
    <q-btn
      dense
      flat
      icon="arrow_back"
      class="nav-btn"
      :disable="!canGoBack"
      @click="emit('back')"
    />

    <q-btn
      dense
      flat
      icon="arrow_forward"
      class="nav-btn nav-btn--forward"
      :disable="!canGoForward"
      @click="emit('forward')"
    />

    <div class="text-body2 folder-path path-bar min-width-0">
      <q-icon
        name="far fa-folder-open"
        class="q-mr-sm text-blue-5 crumb-folder-icon self-center"
        size="18px"
        @click.stop="onFolderPathIconClick"
      />

      <div
        v-if="!pathEditMode"
        class="crumb-path-hitbox min-width-0"
        @click="onPathBarClick"
      >
        <div
          ref="crumbScrollRef"
          class="crumb-scroll min-width-0"
          @wheel="onCrumbWheel"
        >
          <div class="crumb-track">
            <template
              v-for="(seg, idx) in breadcrumbSegments"
              :key="`${idx}-${seg.fullPath}`"
            >
              <span v-if="idx > 0" class="crumb-separator" aria-hidden="true"
                >&gt;</span
              >
              <q-btn
                dense
                flat
                no-caps
                class="crumb-btn"
                :class="{
                  'crumb-btn--current': isCurrentBreadcrumbSegment(seg),
                }"
                :disable="isCurrentBreadcrumbSegment(seg)"
                @click.stop="onBreadcrumbSegmentClick(seg)"
              >
                {{ seg.label }}
              </q-btn>
            </template>
            <span
              v-if="breadcrumbSegments.length === 0 && currentPath.trim()"
              class="crumb-fallback-path"
              >{{ currentPath }}</span
            >
          </div>
        </div>
      </div>

      <q-input
        v-else
        ref="pathEditInputRef"
        v-model="pathInput"
        dense
        class="path-edit-input min-width-0"
        borderless
        @keyup.enter="submitPathEdit"
        @keyup.esc="cancelPathEdit"
        @blur="onPathEditBlur"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { QInput, useQuasar } from "quasar";

const $q = useQuasar();

import { useFileBrowser } from "@/composables/filebrowser";
import type { BreadcrumbSegment } from "@/types/filebrowser";

const props = defineProps<{
  currentPath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  agentPlatform?: string;
}>();

const emit = defineEmits<{
  (e: "navigate", path: string): void;
  (e: "back"): void;
  (e: "forward"): void;
}>();

const { parsePathToBreadcrumbs, pathsEqual, normalizePathSlashes } =
  useFileBrowser(() => props.agentPlatform ?? "windows");

const pathEditMode = ref(false);
const pathInput = ref(props.currentPath);
const pathEditInputRef = ref<InstanceType<typeof QInput> | null>(null);
const crumbScrollRef = ref<HTMLElement | null>(null);

const breadcrumbSegments = computed(() =>
  parsePathToBreadcrumbs(props.currentPath),
);

function scrollCrumbToEnd() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = crumbScrollRef.value;
      if (!el) return;
      el.scrollLeft = el.scrollWidth;
    });
  });
}

function onCrumbWheel(ev: WheelEvent) {
  const el = crumbScrollRef.value;
  if (!el || el.scrollWidth <= el.clientWidth) return;

  if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;

  ev.preventDefault();
  el.scrollLeft += ev.deltaY;
}

watch(
  () => props.currentPath,
  () => {
    if (!pathEditMode.value) scrollCrumbToEnd();
  },
);

onMounted(() => {
  scrollCrumbToEnd();
});

function isCurrentBreadcrumbSegment(seg: BreadcrumbSegment): boolean {
  return pathsEqual(seg.fullPath, props.currentPath);
}

function onBreadcrumbSegmentClick(seg: BreadcrumbSegment) {
  if (isCurrentBreadcrumbSegment(seg)) return;
  emit("navigate", seg.fullPath);
}

function onPathBarClick(ev: MouseEvent) {
  const el = ev.target as HTMLElement | null;
  if (el?.closest?.(".crumb-btn")) return;
  enterPathEditMode();
}

function onFolderPathIconClick() {
  if (!pathEditMode.value) enterPathEditMode();
}

function enterPathEditMode() {
  pathEditMode.value = true;
  pathInput.value = props.currentPath;
  nextTick(() => {
    const inp = pathEditInputRef.value;
    if (!inp) return;
    inp.focus();
    const root = inp.$el as HTMLElement | undefined;
    const native = root?.querySelector("input");
    if (native instanceof HTMLInputElement) native.select();
  });
}

function cancelPathEdit() {
  pathInput.value = props.currentPath;
  pathEditMode.value = false;
  scrollCrumbToEnd();
}

function onPathEditBlur() {
  window.setTimeout(() => {
    if (pathEditMode.value) cancelPathEdit();
  }, 0);
}

function submitPathEdit() {
  const nextPath = normalizePathSlashes(pathInput.value);
  if (!nextPath) {
    cancelPathEdit();
    return;
  }
  if (pathsEqual(nextPath, props.currentPath)) {
    pathInput.value = props.currentPath;
    pathEditMode.value = false;
    scrollCrumbToEnd();
    return;
  }
  emit("navigate", nextPath);
  pathEditMode.value = false;
}
</script>

<style scoped>
.folder-path.path-bar {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  flex: 1 1 auto;
  max-width: 720px;
  min-width: 0;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  background: transparent;
  padding: 0 6px;
  border-radius: 8px;
  margin-bottom: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: rgba(0, 0, 0, 0.75);
}

.min-width-0 {
  min-width: 0;
}

.crumb-folder-icon {
  flex-shrink: 0;
}

.crumb-path-hitbox {
  cursor: default;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.crumb-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  max-height: 100%;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.crumb-scroll::-webkit-scrollbar {
  display: none;
}

.crumb-track {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  white-space: nowrap;
  width: max-content;
  min-width: 100%;
}

.crumb-separator {
  flex-shrink: 0;
  font-size: 0.75rem;
  line-height: 1.25rem;
  user-select: none;
  padding: 0 2px;
  margin: 0 2px;
  align-self: center;
  color: rgba(0, 0, 0, 0.45);
}

.crumb-btn {
  flex-shrink: 0;
  font-weight: 500;
  min-height: 0;
  min-width: unset;
  border-radius: 6px;
}

.crumb-btn:not(:disabled) {
  cursor: pointer;
}

.crumb-btn :deep(.q-btn__wrapper) {
  padding: 0 3px;
  min-height: 0;
}

.crumb-btn :deep(.q-btn__content) {
  font-size: inherit;
  line-height: inherit;
}

.crumb-btn--current,
.crumb-btn:disabled {
  opacity: 1;
}

.crumb-fallback-path {
  flex-shrink: 0;
  padding-left: 4px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.path-edit-input {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
}

.path-edit-input :deep(.q-field) {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
}

.path-edit-input :deep(.q-field__inner) {
  height: 100%;
}

.path-edit-input :deep(.q-field__control) {
  height: 100%;
  min-height: 0 !important;
  align-items: center;
}

.path-edit-input :deep(input) {
  font-size: inherit;
  line-height: inherit;
  padding: 0;
}

.file-path-row {
  gap: 0;
  min-width: 0;
}

.file-path-row :deep(.nav-btn) {
  width: 42px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.7);
}

.file-path-row :deep(.nav-btn:first-of-type) {
  border-radius: 8px 0 0 8px;
}

.file-path-row :deep(.nav-btn--forward) {
  border-radius: 0 8px 8px 0;
  margin-right: 12px;
}

.file-path-row :deep(.nav-btn.q-btn--disabled) {
  opacity: 0.4;
}

.file-path-row--dark .folder-path.path-bar {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.78);
}

.file-path-row--dark .crumb-separator {
  color: rgba(255, 255, 255, 0.45);
}

.file-path-row--dark .crumb-btn :deep(.q-btn__content) {
  color: rgba(255, 255, 255, 0.88);
}

.file-path-row--dark .crumb-btn--current :deep(.q-btn__content) {
  color: #fff;
  font-weight: 600;
}

.file-path-row--dark .crumb-fallback-path {
  color: rgba(255, 255, 255, 0.78);
}

.file-path-row--dark :deep(.nav-btn) {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.75);
}
</style>
