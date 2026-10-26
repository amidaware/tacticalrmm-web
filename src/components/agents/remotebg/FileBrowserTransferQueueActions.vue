<template>
  <div v-if="mode === 'active'" class="row q-gutter-xs" :class="wrapClass">
    <q-btn dense flat no-caps size="sm" label="Pause" @click="emit('pause')">
      <q-tooltip v-if="pauseTooltip">{{ pauseTooltip }}</q-tooltip>
    </q-btn>
    <q-btn
      dense
      flat
      no-caps
      size="sm"
      color="negative"
      label="Cancel"
      @click="emit('cancel')"
    >
      <q-tooltip v-if="cancelTooltip">{{ cancelTooltip }}</q-tooltip>
    </q-btn>
  </div>

  <div v-else-if="mode === 'paused'" class="row q-gutter-xs" :class="wrapClass">
    <q-btn
      v-if="showSelectFile"
      dense
      flat
      no-caps
      size="sm"
      color="primary"
      label="Select file"
      :disable="resumeDisabled"
      @click="emit('select-file')"
    >
      <q-tooltip v-if="ownedByOtherTab">{{
        TRANSFER_TOOLTIP_OPEN_IN_OTHER_TAB
      }}</q-tooltip>
    </q-btn>
    <q-btn
      v-else
      dense
      flat
      no-caps
      size="sm"
      color="primary"
      label="Resume"
      :disable="resumeDisabled"
      @click="emit('resume')"
    >
      <q-tooltip v-if="ownedByOtherTab">{{
        TRANSFER_TOOLTIP_OPEN_IN_OTHER_TAB
      }}</q-tooltip>
    </q-btn>
    <q-btn
      dense
      flat
      no-caps
      size="sm"
      color="negative"
      label="Cancel"
      @click="emit('cancel')"
    >
      <q-tooltip v-if="cancelTooltip">{{ cancelTooltip }}</q-tooltip>
    </q-btn>
    <q-btn dense flat no-caps size="sm" label="Hide" @click="emit('hide')">
      <q-tooltip>{{ TRANSFER_TOOLTIP_HIDE_PAUSED }}</q-tooltip>
    </q-btn>
  </div>

  <q-btn
    v-else-if="mode === 'terminal'"
    dense
    flat
    :round="dismissRound"
    :icon="dismissRound ? 'close' : undefined"
    :label="dismissRound ? undefined : 'Dismiss'"
    size="sm"
    :class="wrapClass"
    @click="emit('dismiss')"
  >
    <q-tooltip>{{ TRANSFER_TOOLTIP_DISMISS }}</q-tooltip>
  </q-btn>

  <q-btn
    v-else-if="mode === 'queued'"
    dense
    flat
    round
    icon="close"
    size="sm"
    :class="wrapClass"
    @click="emit('dismiss')"
  >
    <q-tooltip>{{ TRANSFER_TOOLTIP_REMOVE_FROM_QUEUE }}</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
import {
  TRANSFER_TOOLTIP_DISMISS,
  TRANSFER_TOOLTIP_HIDE_PAUSED,
  TRANSFER_TOOLTIP_OPEN_IN_OTHER_TAB,
  TRANSFER_TOOLTIP_REMOVE_FROM_QUEUE,
} from "@/constants/fileTransfer";

export type TransferQueueActionMode =
  | "active"
  | "paused"
  | "terminal"
  | "queued"
  | "none";

withDefaults(
  defineProps<{
    mode: TransferQueueActionMode;
    pauseTooltip?: string;
    cancelTooltip?: string;
    resumeDisabled?: boolean;
    ownedByOtherTab?: boolean;
    showSelectFile?: boolean;
    dismissRound?: boolean;
    wrapClass?: string;
  }>(),
  {
    resumeDisabled: false,
    ownedByOtherTab: false,
    showSelectFile: false,
    dismissRound: true,
    wrapClass: "q-mt-xs",
  },
);

const emit = defineEmits<{
  (e: "pause"): void;
  (e: "resume"): void;
  (e: "cancel"): void;
  (e: "hide"): void;
  (e: "dismiss"): void;
  (e: "select-file"): void;
}>();
</script>
