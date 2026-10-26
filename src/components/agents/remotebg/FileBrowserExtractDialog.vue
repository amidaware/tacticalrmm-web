<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
    @hide="emit('hide')"
  >
    <q-card style="min-width: 420px; max-width: 560px">
      <q-card-section>
        <div class="text-h6">Extract ZIP</div>
        <div class="text-caption text-grey ellipsis">
          {{ item?.name }}<span v-if="item?.size"> · {{ item.size }}</span>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-gutter-sm">
        <q-input
          ref="destInputRef"
          v-model="destination"
          dense
          outlined
          autofocus
          label="Extract to"
          hint="The folder is created if it doesn't exist"
          :rules="destinationRules"
          @keyup.enter="onSubmit"
        />
        <div class="text-body2 q-pt-sm">If a file already exists:</div>
        <q-option-group
          v-model="conflictPolicy"
          dense
          :options="conflictOptions"
          color="primary"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn
          unelevated
          label="Extract"
          color="primary"
          :loading="saving"
          :disable="saving || !destination.trim()"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { QInput } from "quasar";

import type { FileBrowserItem } from "@/types/filebrowser";
import {
  defaultExtractDestination,
  extractDestinationRule,
} from "@/utils/filebrowser";

const props = defineProps<{
  modelValue: boolean;
  item: FileBrowserItem | null;
  folder: string;
  saving?: boolean;
  platform?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (
    e: "save",
    value: { destination: string; conflictPolicy: "skip" | "replace" },
  ): void;
  (e: "hide"): void;
}>();

const conflictOptions = [
  { label: "Skip existing files", value: "skip" },
  { label: "Replace existing files", value: "replace" },
];

const destInputRef = ref<InstanceType<typeof QInput> | null>(null);
const destination = ref("");
const conflictPolicy = ref<"skip" | "replace">("skip");

const destinationRules = computed(() => [
  (v: string | number | null | undefined) =>
    extractDestinationRule(v, props.platform),
]);

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.item) {
      destination.value = defaultExtractDestination(
        props.folder,
        props.item.name,
        props.platform,
      );
      conflictPolicy.value = "skip";
      nextTick(() => destInputRef.value?.resetValidation());
    }
  },
);

async function onSubmit() {
  if (props.saving) return;

  const input = destInputRef.value;
  if (input) {
    const ok = await input.validate();
    if (!ok) return;
  }

  emit("save", {
    destination: destination.value.trim(),
    conflictPolicy: conflictPolicy.value,
  });
}
</script>
