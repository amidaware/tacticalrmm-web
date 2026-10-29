<template>
  <div v-if="mode === 'active'" class="row q-gutter-xs" :class="wrapClass">
    <q-btn
      dense
      flat
      no-caps
      size="sm"
      :label="$gettext('Pause')"
      @click="emit('pause')"
    >
      <q-tooltip v-if="pauseTooltip">{{ pauseTooltip }}</q-tooltip>
    </q-btn>
    <q-btn
      dense
      flat
      no-caps
      size="sm"
      color="negative"
      :label="$gettext('Cancel')"
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
      :label="$gettext('Select file')"
      :disable="resumeDisabled"
      @click="emit('select-file')"
    >
      <q-tooltip v-if="ownedByOtherTab">{{
        $gettext("Open in another tab")
      }}</q-tooltip>
    </q-btn>
    <q-btn
      v-else
      dense
      flat
      no-caps
      size="sm"
      color="primary"
      :label="$gettext('Resume')"
      :disable="resumeDisabled"
      @click="emit('resume')"
    >
      <q-tooltip v-if="ownedByOtherTab">{{
        $gettext("Open in another tab")
      }}</q-tooltip>
    </q-btn>
    <q-btn
      dense
      flat
      no-caps
      size="sm"
      color="negative"
      :label="$gettext('Cancel')"
      @click="emit('cancel')"
    >
      <q-tooltip v-if="cancelTooltip">{{ cancelTooltip }}</q-tooltip>
    </q-btn>
    <q-btn
      dense
      flat
      no-caps
      size="sm"
      :label="$gettext('Hide')"
      @click="emit('hide')"
    >
      <q-tooltip>{{
        $gettext("Hide paused items. Open Transfers to show them again.")
      }}</q-tooltip>
    </q-btn>
  </div>

  <q-btn
    v-else-if="mode === 'terminal'"
    dense
    flat
    :round="dismissRound"
    :icon="dismissRound ? 'close' : undefined"
    :label="dismissRound ? undefined : $gettext('Dismiss')"
    size="sm"
    :class="wrapClass"
    @click="emit('dismiss')"
  >
    <q-tooltip>{{ $gettext("Dismiss") }}</q-tooltip>
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
    <q-tooltip>{{ $gettext("Remove from queue") }}</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
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
