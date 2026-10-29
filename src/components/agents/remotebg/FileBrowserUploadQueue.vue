<template>
  <div
    class="upload-queue-section"
    :class="{ 'upload-queue-section--dark': $q.dark.isActive }"
  >
    <div class="row items-center justify-between q-mb-xs">
      <div class="text-subtitle2 text-weight-medium upload-queue-title">
        {{ $gettext("Upload queue") }}
      </div>
      <div class="row items-center q-gutter-xs">
        <q-btn
          dense
          flat
          no-caps
          size="sm"
          :label="$gettext('Clear finished')"
          :disable="!canClearFinished"
          @click="emit('clear-finished')"
        >
          <q-tooltip>{{
            $gettext(
              "Remove completed, failed, and cancelled items from this list.",
            )
          }}</q-tooltip>
        </q-btn>
        <q-btn
          dense
          flat
          no-caps
          size="sm"
          :label="$gettext('Hide all')"
          :disable="!canHideAll"
          @click="emit('hide-all')"
        >
          <q-tooltip>{{
            $gettext("Hide paused items. Open Transfers to show them again.")
          }}</q-tooltip>
        </q-btn>
      </div>
    </div>
    <div class="text-caption upload-queue-destination q-mb-sm">
      {{ $gettext("Destination:") }}
      <span class="upload-queue-destination-path">{{ destinationLabel }}</span>
    </div>
    <div v-if="limitsCaption" class="text-caption upload-queue-limits q-mb-sm">
      {{ limitsCaption }}
    </div>
    <q-list
      bordered
      separator
      dense
      class="upload-queue-list"
      :class="{ 'upload-queue-list--dark': $q.dark.isActive }"
      :dark="$q.dark.isActive"
    >
      <q-item v-for="item in items" :key="item.id" class="upload-queue-item">
        <q-item-section avatar>
          <q-icon name="description" color="primary" size="22px" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="ellipsis upload-queue-item-name">{{
            item.name
          }}</q-item-label>
          <q-item-label caption class="upload-queue-item-meta">{{
            item.sizeLabel
          }}</q-item-label>
          <q-item-label
            v-if="
              item.messageCode === 'waiting-slot' && item.status === 'uploading'
            "
            caption
            class="upload-queue-item-meta"
          >
            {{ transferItemMessage(item) }}
          </q-item-label>
          <q-item-label
            v-else-if="item.status === 'paused' && resumeCaption(item)"
            caption
            class="upload-queue-item-meta"
          >
            {{ resumeCaption(item) }}
          </q-item-label>
          <div class="upload-progress-wrap q-mt-xs">
            <q-linear-progress
              :value="item.progress"
              :color="transferQueueProgressColor(item.status)"
              :track-color="$q.dark.isActive ? 'grey-8' : 'grey-4'"
              class="upload-progress"
              rounded
              size="6px"
            />
          </div>
        </q-item-section>
        <q-item-section side>
          <q-badge
            :color="uploadStatusBadgeColor(item.status)"
            :text-color="item.status === 'queued' ? 'dark' : undefined"
            align="middle"
          >
            {{ uploadStatusLabelForItem(item) }}
          </q-badge>
          <FileBrowserTransferQueueActions
            :mode="actionModeForItem(item)"
            :pause-tooltip="$gettext('Pause this upload.')"
            :cancel-tooltip="
              $gettext('Cancel upload and release the transfer slot.')
            "
            :resume-disabled="!!item.ownedByOtherTab"
            :owned-by-other-tab="!!item.ownedByOtherTab"
            :show-select-file="item.recoveryHint === 'needs_file' && !item.file"
            @pause="emit('pause', item.id)"
            @resume="emit('resume', item.id)"
            @cancel="emit('cancel', item.id)"
            @hide="emit('hide', item.id)"
            @dismiss="emit('dismiss', item.id)"
            @select-file="emit('select-file', item.id)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { transferItemMessage } from "@/services/fileTransfer/queueMessages";
import { gettext } from "@/gettext";
import { computed } from "vue";
import { useQuasar } from "quasar";

import FileBrowserTransferQueueActions, {
  type TransferQueueActionMode,
} from "@/components/agents/remotebg/FileBrowserTransferQueueActions.vue";
import type { UploadQueueItem } from "@/types/filebrowser";

import { formatResumeWindowCaption } from "@/services/fileTransfer/transferQueuePersist";
import {
  isUploadQueueItemActive,
  isUploadQueueItemTerminal,
  transferQueueProgressColor,
  transferQueueStatusLabelWithSlotWait,
  uploadStatusBadgeColor,
  uploadStatusLabel,
} from "@/utils/filebrowser";

const $q = useQuasar();

const props = defineProps<{
  items: UploadQueueItem[];
  destinationLabel: string;
  limitsCaption?: string;
}>();

const emit = defineEmits<{
  (e: "clear-finished"): void;
  (e: "hide-all"): void;
  (e: "dismiss", id: string): void;
  (e: "pause", id: string): void;
  (e: "resume", id: string): void;
  (e: "select-file", id: string): void;
  (e: "cancel", id: string): void;
  (e: "hide", id: string): void;
}>();

function resumeCaption(item: UploadQueueItem): string | null {
  if (item.ownedByOtherTab) {
    return gettext.$gettext("Open in another tab");
  }
  if (item.recoveryHint === "needs_file" && !item.file) {
    const window = formatResumeWindowCaption(item.expiresAt);
    return window
      ? gettext.$gettext("Select original file to resume · %{resumeWindow}", {
          resumeWindow: window,
        })
      : gettext.$gettext("Select the original file to resume");
  }
  const parts: string[] = [];
  if (transferItemMessage(item)) parts.push(transferItemMessage(item));
  const window = formatResumeWindowCaption(item.expiresAt);
  if (window) parts.push(window);
  return parts.length ? parts.join(" · ") : null;
}

function uploadStatusLabelForItem(item: UploadQueueItem): string {
  return transferQueueStatusLabelWithSlotWait(
    uploadStatusLabel(item.status),
    item.messageCode,
    isUploadQueueItemActive(item.status),
  );
}

function actionModeForItem(item: UploadQueueItem): TransferQueueActionMode {
  if (item.status === "uploading") return "active";
  if (item.status === "paused") return "paused";
  if (isUploadQueueItemTerminal(item.status)) return "terminal";
  if (item.status === "queued") return "queued";
  return "none";
}

const canClearFinished = computed(() =>
  props.items.some((item) => isUploadQueueItemTerminal(item.status)),
);

const canHideAll = computed(() =>
  props.items.some((item) => item.status === "paused"),
);
</script>

<style scoped>
.upload-queue-section {
  flex: 0 0 auto;
  max-height: min(240px, 35vh);
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  color: rgba(0, 0, 0, 0.87);
}

.upload-queue-section--dark {
  border-color: rgba(255, 255, 255, 0.12);
  background: #1d1d1d;
  color: rgba(255, 255, 255, 0.87);
}

.upload-queue-section--dark .upload-queue-title,
.upload-queue-section--dark .upload-queue-destination,
.upload-queue-section--dark .upload-queue-destination-path,
.upload-queue-section--dark .upload-queue-item-name {
  color: rgba(255, 255, 255, 0.87);
}

.upload-queue-destination {
  color: rgba(0, 0, 0, 0.6);
}

.upload-queue-limits {
  color: rgba(0, 0, 0, 0.55);
}

.upload-queue-section--dark .upload-queue-limits {
  color: rgba(255, 255, 255, 0.5);
}

.upload-queue-section--dark .upload-queue-destination {
  color: rgba(255, 255, 255, 0.6);
}

.upload-queue-destination-path {
  color: rgba(0, 0, 0, 0.87);
}

.upload-queue-list {
  border-radius: 6px;
  background: transparent;
}

.upload-queue-list--dark {
  background: transparent;
  color: rgba(255, 255, 255, 0.87);
}

.upload-queue-list--dark :deep(.q-item) {
  background: transparent;
  color: rgba(255, 255, 255, 0.87);
}

.upload-queue-list--dark :deep(.q-item__label--caption),
.upload-queue-section--dark .upload-queue-item-meta {
  color: rgba(255, 255, 255, 0.55) !important;
}

.upload-queue-list--dark :deep(.q-list--bordered) {
  border-color: rgba(255, 255, 255, 0.12);
}

.upload-queue-list--dark :deep(.q-separator) {
  background: rgba(255, 255, 255, 0.12);
}

.upload-queue-item :deep(.q-item__section--main) {
  min-width: 0;
}

.upload-queue-item :deep(.q-item__section--side) {
  flex-direction: column;
  align-items: flex-end;
}

.upload-progress-wrap {
  flex: 0 0 auto;
  width: 100%;
  height: 6px;
}

.upload-progress {
  width: 100%;
  height: 6px;
}

.upload-progress :deep(.q-linear-progress) {
  height: 6px !important;
  font-size: 6px;
}
</style>
