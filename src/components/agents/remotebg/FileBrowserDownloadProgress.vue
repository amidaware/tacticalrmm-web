<template>
  <div
    class="download-progress-section"
    :class="{ 'download-progress-section--dark': $q.dark.isActive }"
  >
    <div class="row items-center justify-between q-mb-xs">
      <div class="text-subtitle2 text-weight-medium download-progress-title">
        Download
      </div>
      <FileBrowserTransferQueueActions
        :mode="actionMode"
        :pause-tooltip="TRANSFER_TOOLTIP_PAUSE"
        :cancel-tooltip="TRANSFER_TOOLTIP_CANCEL"
        :resume-disabled="!!ownedByOtherTab"
        :owned-by-other-tab="!!ownedByOtherTab"
        :dismiss-round="false"
        wrap-class=""
        @pause="emit('pause')"
        @resume="emit('resume')"
        @cancel="emit('cancel')"
        @hide="emit('hide')"
        @dismiss="emit('dismiss')"
      />
    </div>
    <div class="text-caption download-progress-file q-mb-xs ellipsis">
      {{ fileName }}
    </div>
    <div class="row items-center justify-between q-mb-xs">
      <span class="text-caption download-progress-status">{{
        statusLabel
      }}</span>
      <span class="text-caption download-progress-pct"
        >{{ progressPercent }}%</span
      >
    </div>
    <q-linear-progress
      :value="progress"
      :color="transferQueueProgressColor(status)"
      :track-color="$q.dark.isActive ? 'grey-8' : 'grey-4'"
      rounded
      size="6px"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useQuasar } from "quasar";

import FileBrowserTransferQueueActions, {
  type TransferQueueActionMode,
} from "@/components/agents/remotebg/FileBrowserTransferQueueActions.vue";
import type { DownloadTransferStatus } from "@/types/fileTransfer";
import {
  TRANSFER_CONNECTION_LOST_MESSAGE,
  TRANSFER_RECONNECTING_MESSAGE,
  TRANSFER_SLOT_WAIT_MESSAGE,
  TRANSFER_WAITING_FOR_AGENT_MESSAGE,
  TRANSFER_TOOLTIP_CANCEL,
  TRANSFER_TOOLTIP_PAUSE,
} from "@/constants/fileTransfer";
import {
  downloadStatusLabel,
  transferQueueProgressColor,
} from "@/utils/filebrowser";

const $q = useQuasar();

const props = defineProps<{
  fileName: string;
  progress: number;
  status: DownloadTransferStatus;
  errorMessage?: string;
  buildingArchive?: boolean;
  ownedByOtherTab?: boolean;
}>();

const emit = defineEmits<{
  (e: "pause"): void;
  (e: "resume"): void;
  (e: "cancel"): void;
  (e: "hide"): void;
  (e: "dismiss"): void;
}>();

const isActive = computed(
  () =>
    props.status === "initializing" ||
    props.status === "downloading" ||
    props.status === "completing",
);

const isPaused = computed(() => props.status === "paused");

const canDismiss = computed(
  () =>
    props.status === "completed" ||
    props.status === "failed" ||
    props.status === "cancelled",
);

const actionMode = computed((): TransferQueueActionMode => {
  if (isActive.value) return "active";
  if (isPaused.value) return "paused";
  if (canDismiss.value) return "terminal";
  return "none";
});

const progressPercent = computed(() => Math.round(props.progress * 100));

const statusLabel = computed(() => {
  if (
    isActive.value &&
    props.errorMessage &&
    (props.errorMessage === TRANSFER_SLOT_WAIT_MESSAGE ||
      props.errorMessage === TRANSFER_RECONNECTING_MESSAGE ||
      props.errorMessage === TRANSFER_WAITING_FOR_AGENT_MESSAGE ||
      /waiting for a free transfer slot/i.test(props.errorMessage))
  ) {
    return props.errorMessage;
  }
  if (
    isPaused.value &&
    !props.ownedByOtherTab &&
    (props.errorMessage === TRANSFER_RECONNECTING_MESSAGE ||
      props.errorMessage === TRANSFER_CONNECTION_LOST_MESSAGE)
  ) {
    return props.errorMessage;
  }

  if (props.status === "initializing" && props.buildingArchive) {
    return "Building archive…";
  }
  if (props.status === "completed") {
    return "Complete";
  }
  if (props.status === "failed") {
    return props.errorMessage || "Download failed";
  }
  if (props.status === "paused" && props.ownedByOtherTab) {
    return "Open in another tab";
  }
  if (props.status === "idle") {
    return "";
  }
  if (
    props.status === "initializing" ||
    props.status === "downloading" ||
    props.status === "completing" ||
    props.status === "paused" ||
    props.status === "cancelled"
  ) {
    return downloadStatusLabel(props.status);
  }
  return "";
});
</script>

<style scoped>
.download-progress-section {
  flex: 0 0 auto;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  color: rgba(0, 0, 0, 0.87);
}

.download-progress-section--dark {
  border-color: rgba(255, 255, 255, 0.12);
  background: #1d1d1d;
  color: rgba(255, 255, 255, 0.87);
}

.download-progress-section--dark .download-progress-title,
.download-progress-section--dark .download-progress-file,
.download-progress-section--dark .download-progress-status,
.download-progress-section--dark .download-progress-pct {
  color: rgba(255, 255, 255, 0.87);
}

.download-progress-file {
  color: rgba(0, 0, 0, 0.6);
}

.download-progress-section--dark .download-progress-file {
  color: rgba(255, 255, 255, 0.6);
}

.download-progress-status {
  color: rgba(0, 0, 0, 0.6);
}

.download-progress-section--dark .download-progress-status {
  color: rgba(255, 255, 255, 0.55);
}
</style>
