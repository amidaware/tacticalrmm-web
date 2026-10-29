<template>
  <div
    v-for="job in jobs"
    :key="job.sessionId"
    class="extract-progress-section"
    :class="{ 'extract-progress-section--dark': $q.dark.isActive }"
  >
    <div class="row items-center justify-between q-mb-xs">
      <div class="text-subtitle2 text-weight-medium">
        {{ $gettext("Extract") }}
      </div>
      <q-btn
        dense
        flat
        no-caps
        size="sm"
        color="negative"
        :label="$gettext('Cancel')"
        :loading="job.cancelling"
        @click="emit('cancel', job.sessionId)"
      >
        <q-tooltip>{{
          $gettext("Cancel the extraction. Files already extracted are kept.")
        }}</q-tooltip>
      </q-btn>
    </div>
    <div class="text-caption extract-progress-dest q-mb-xs ellipsis">
      {{ job.name }} → {{ job.destination }}
    </div>
    <div class="row items-center justify-between q-mb-xs">
      <span class="text-caption extract-progress-status">{{
        statusLabel(job)
      }}</span>
      <span class="text-caption extract-progress-pct">{{ percent(job) }}%</span>
    </div>
    <q-linear-progress
      :value="percent(job) / 100"
      :indeterminate="job.filesTotal === 0"
      color="primary"
      :track-color="$q.dark.isActive ? 'grey-8' : 'grey-4'"
      rounded
      size="6px"
    />
  </div>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
import { useQuasar } from "quasar";

import type { ExtractJob } from "@/types/filebrowser";

const $q = useQuasar();

defineProps<{
  jobs: ExtractJob[];
}>();

const emit = defineEmits<{
  (e: "cancel", sessionId: string): void;
}>();

function percent(job: ExtractJob): number {
  if (job.total <= 0) return 0;
  return Math.min(100, Math.floor((job.written / job.total) * 100));
}

function statusLabel(job: ExtractJob): string {
  if (job.cancelling) return gettext.$gettext("Cancelling…");
  if (job.filesTotal === 0) return gettext.$gettext("Starting…");
  return gettext.$ngettext(
    "%{done} of %{total} file",
    "%{done} of %{total} files",
    job.filesTotal,
    {
      done: job.filesDone.toLocaleString(),
      total: job.filesTotal.toLocaleString(),
    },
  );
}
</script>

<style scoped>
.extract-progress-section {
  flex: 0 0 auto;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  color: rgba(0, 0, 0, 0.87);
}

.extract-progress-section--dark {
  border-color: rgba(255, 255, 255, 0.12);
  background: #1d1d1d;
  color: rgba(255, 255, 255, 0.87);
}

.extract-progress-dest,
.extract-progress-status {
  color: rgba(0, 0, 0, 0.6);
}

.extract-progress-section--dark .extract-progress-dest,
.extract-progress-section--dark .extract-progress-status {
  color: rgba(255, 255, 255, 0.55);
}
</style>
