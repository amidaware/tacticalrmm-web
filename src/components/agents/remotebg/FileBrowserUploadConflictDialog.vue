<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <q-card class="upload-conflict-dialog">
      <q-card-section class="text-subtitle1 text-weight-medium">
        {{ title }}
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="text-body2 q-mb-sm">
          The following
          {{
            conflictNames.length === 1
              ? "file already exists"
              : "files already exist"
          }}
          in this folder:
        </div>

        <div class="upload-conflict-names text-body2">
          <template v-if="!showAllNames">
            <span
              v-for="(name, idx) in preview.visibleNames"
              :key="`${name}-${idx}`"
              class="upload-conflict-name"
              >{{ name
              }}<span v-if="idx < preview.visibleNames.length - 1"
                >,
              </span></span
            >
            <span v-if="preview.remainingCount > 0">
              , and {{ preview.remainingCount }} more
            </span>
          </template>
          <ul v-else class="upload-conflict-name-list q-mb-none">
            <li v-for="(name, idx) in conflictNames" :key="`${name}-${idx}`">
              {{ name }}
            </li>
          </ul>
        </div>

        <q-btn
          v-if="preview.remainingCount > 0"
          flat
          dense
          no-caps
          size="sm"
          color="primary"
          class="q-mt-xs q-ml-none"
          :label="showAllNames ? 'Show less' : 'Show all'"
          @click="showAllNames = !showAllNames"
        />

        <div class="text-body2 q-mt-md text-grey-7">
          Choose how to handle these conflicts. Other files in this upload will
          continue normally.
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-gutter-xs">
        <q-btn
          flat
          no-caps
          label="Cancel upload"
          color="primary"
          @click="choose('cancel')"
        />
        <q-btn
          flat
          no-caps
          label="Skip existing"
          color="primary"
          @click="choose('skip')"
        />
        <q-btn
          unelevated
          no-caps
          label="Replace existing"
          color="primary"
          @click="choose('replace')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useDialogPluginComponent } from "quasar";

import {
  formatUploadConflictNamePreview,
  type UploadConflictAction,
} from "@/utils/filebrowser";

defineEmits([...useDialogPluginComponent.emits]);

const props = defineProps<{
  conflictNames: string[];
}>();

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

const showAllNames = ref(false);

const preview = computed(() =>
  formatUploadConflictNamePreview(props.conflictNames, 3),
);

const title = computed(() => {
  const count = props.conflictNames.length;
  return count === 1 ? "1 file already exists" : `${count} files already exist`;
});

function choose(action: UploadConflictAction) {
  if (action === "cancel") {
    onDialogCancel();
    return;
  }
  onDialogOK(action);
}
</script>

<style scoped>
.upload-conflict-dialog {
  min-width: min(420px, 92vw);
  max-width: 560px;
}

.upload-conflict-names {
  word-break: break-word;
}

.upload-conflict-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
}

.upload-conflict-name-list {
  padding-left: 1.15rem;
  max-height: min(240px, 40vh);
  overflow: auto;
}

.upload-conflict-name-list li {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
  margin: 0.15rem 0;
}

.text-grey-7 {
  opacity: 0.85;
}
</style>
