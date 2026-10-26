<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <q-card class="fb-props-card">
      <q-card-section class="fb-props-header">
        <div class="text-h6">Properties</div>
        <div v-if="item?.name" class="fb-props-title-row">
          <div class="fb-props-title-leading" aria-hidden="true">
            <q-icon
              :name="item.type === 'folder' ? 'folder' : 'description'"
              :color="item.type === 'folder' ? 'yellow-8' : 'primary'"
              size="22px"
              class="fb-props-title-icon"
            />
          </div>
          <div class="fb-props-title-text" :title="item.name">
            {{ item.name }}
          </div>
          <div class="fb-props-title-trailing">
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="content_copy"
              color="grey-7"
              aria-label="Copy name"
              @click="copyText(item.name, 'Name copied to clipboard.')"
            >
              <q-tooltip>Copy name</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section
        v-if="loading"
        class="column items-center q-pa-lg q-gutter-sm"
      >
        <q-spinner color="primary" size="32px" />
        <div v-if="item?.type === 'folder'" class="text-caption text-grey-7">
          Calculating folder size…
        </div>
      </q-card-section>

      <q-card-section v-else-if="error" class="text-negative fb-props-wrap">
        {{ error }}
      </q-card-section>

      <q-card-section v-else-if="item" class="q-pa-md fb-props-body">
        <div class="fb-props-grid">
          <template v-if="item.type === 'folder'">
            <div class="fb-props-label">Type:</div>
            <div class="fb-props-value">File folder</div>

            <div class="fb-props-label">Location:</div>
            <div class="fb-props-value fb-props-path-row">
              <div class="fb-props-path fb-props-wrap" :title="locationText">
                {{ locationText }}
              </div>
              <q-btn
                v-if="locationText !== '—'"
                flat
                dense
                round
                size="sm"
                icon="content_copy"
                color="grey-7"
                aria-label="Copy location"
                @click="copyText(locationText, 'Path copied to clipboard.')"
              >
                <q-tooltip>Copy location</q-tooltip>
              </q-btn>
            </div>

            <div class="fb-props-label">Size:</div>
            <div class="fb-props-value fb-props-wrap">
              {{ formatSize(item) }}
            </div>

            <div class="fb-props-label">Contains:</div>
            <div class="fb-props-value fb-props-wrap">
              {{ formatContains(item) }}
            </div>

            <div class="fb-props-sep" />

            <div class="fb-props-label">Created:</div>
            <div class="fb-props-value">{{ item.created || "—" }}</div>

            <div class="fb-props-label">Modified:</div>
            <div class="fb-props-value">{{ item.modified || "—" }}</div>

            <div class="fb-props-sep" />

            <div class="fb-props-label">Hidden:</div>
            <div class="fb-props-value">{{ formatBool(item.hidden) }}</div>

            <div class="fb-props-label">Read-only:</div>
            <div class="fb-props-value">{{ formatBool(item.readonly) }}</div>
          </template>

          <template v-else>
            <div class="fb-props-label">Type:</div>
            <div class="fb-props-value">{{ fileTypeLabel(item) }}</div>

            <div class="fb-props-label">Location:</div>
            <div class="fb-props-value fb-props-path-row">
              <div class="fb-props-path fb-props-wrap" :title="locationText">
                {{ locationText }}
              </div>
              <q-btn
                v-if="locationText !== '—'"
                flat
                dense
                round
                size="sm"
                icon="content_copy"
                color="grey-7"
                aria-label="Copy location"
                @click="copyText(locationText, 'Path copied to clipboard.')"
              >
                <q-tooltip>Copy location</q-tooltip>
              </q-btn>
            </div>

            <div class="fb-props-label">Size:</div>
            <div class="fb-props-value fb-props-wrap">
              {{ formatSize(item) }}
            </div>

            <div class="fb-props-sep" />

            <div class="fb-props-label">Created:</div>
            <div class="fb-props-value">{{ item.created || "—" }}</div>

            <div class="fb-props-label">Modified:</div>
            <div class="fb-props-value">{{ item.modified || "—" }}</div>

            <div class="fb-props-label">Accessed:</div>
            <div class="fb-props-value">{{ item.accessed || "—" }}</div>

            <div class="fb-props-sep" />

            <div class="fb-props-label">Hidden:</div>
            <div class="fb-props-value">{{ formatBool(item.hidden) }}</div>

            <div class="fb-props-label">Read-only:</div>
            <div class="fb-props-value">{{ formatBool(item.readonly) }}</div>

            <div class="fb-props-label">System:</div>
            <div class="fb-props-value">{{ formatBool(item.system) }}</div>
          </template>
        </div>

        <div
          v-if="item.type === 'folder' && item.summaryTruncated"
          class="text-caption text-warning q-mt-md fb-props-wrap"
        >
          Summary is partial — this folder is very large or deep. Size and
          Contains may undercount.
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { FileBrowserItem } from "@/types/filebrowser";
import { bytes2Human } from "@/utils/format";
import { copyOutput } from "@/utils/helpers";

const props = defineProps<{
  modelValue: boolean;
  item: FileBrowserItem | null;
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const locationText = computed(() => {
  const item = props.item;
  if (!item) return "—";
  return item.location || parentPath(item.path) || "—";
});

function copyText(value: string, successMessage: string) {
  const text = value?.trim();
  if (!text || text === "—") return;
  void copyOutput(text, { successMessage });
}

function formatBool(value: boolean | undefined): string {
  if (value === undefined) return "—";
  return value ? "Yes" : "No";
}

function parentPath(path: string): string {
  if (!path) return "";
  const normalized = path.replace(/[/\\]+$/, "");
  const idxWin = normalized.lastIndexOf("\\");
  const idxPosix = normalized.lastIndexOf("/");
  const idx = Math.max(idxWin, idxPosix);
  if (idx <= 0) return normalized;
  const parent = normalized.slice(0, idx);
  if (/^[A-Za-z]:$/.test(parent)) return `${parent}\\`;
  return parent;
}

function formatSize(item: FileBrowserItem): string {
  const bytes = item.sizeBytes;
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return item.size || "—";
  }
  const human = bytes2Human(bytes);
  return `${human} (${bytes.toLocaleString()} bytes)`;
}

function formatContains(item: FileBrowserItem): string {
  const files = item.fileCount ?? 0;
  const folders = item.folderCount ?? 0;
  const fileLabel = files === 1 ? "File" : "Files";
  const folderLabel = folders === 1 ? "Folder" : "Folders";
  return `${files.toLocaleString()} ${fileLabel}, ${folders.toLocaleString()} ${folderLabel}`;
}

function fileTypeLabel(item: FileBrowserItem): string {
  if (item.extension) return `${item.extension} File`;
  return "File";
}
</script>

<style scoped>
.fb-props-card {
  width: min(520px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

.fb-props-header {
  min-width: 0;
}

.fb-props-title-row {
  --fb-props-title-size: 0.95rem;
  --fb-props-title-lh: 1.35;
  --fb-props-title-line: calc(
    var(--fb-props-title-size) * var(--fb-props-title-lh)
  );
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  min-width: 0;
}

.fb-props-title-leading,
.fb-props-title-trailing {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--fb-props-title-line);
}

.fb-props-title-icon {
  display: block;
}

.fb-props-title-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--fb-props-title-size);
  font-weight: 500;
  line-height: var(--fb-props-title-lh);
  white-space: normal;
  overflow-wrap: anywhere;
}

.fb-props-body {
  min-width: 0;
}

.fb-props-grid {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 8px;
  align-items: start;
}

.fb-props-label {
  color: var(--q-dark-page, #616161);
  white-space: nowrap;
}

.body--dark .fb-props-label {
  color: rgba(255, 255, 255, 0.6);
}

.fb-props-value {
  min-width: 0;
}

.fb-props-wrap {
  white-space: normal;
  overflow-wrap: anywhere;
}

.fb-props-path-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.fb-props-path {
  flex: 1 1 auto;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}

.fb-props-sep {
  grid-column: 1 / -1;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  margin: 4px 0;
}

.body--dark .fb-props-sep {
  border-top-color: rgba(255, 255, 255, 0.16);
}
</style>
