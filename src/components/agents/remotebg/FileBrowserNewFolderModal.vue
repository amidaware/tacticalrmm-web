<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
    @hide="emit('hide')"
  >
    <q-card style="min-width: 360px">
      <q-card-section>
        <div class="text-h6">New Folder</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-input
          ref="nameInputRef"
          v-model="localName"
          dense
          outlined
          autofocus
          label="Folder name"
          lazy-rules
          :rules="nameRules"
          maxlength="255"
          counter
          @keyup.enter="onSubmit"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn
          unelevated
          label="Create"
          color="primary"
          :loading="saving"
          :disable="saving || !localName.trim()"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { QInput } from "quasar";

import { duplicateNameRule, nameSegmentBaseRule } from "@/utils/filebrowser";

const props = defineProps<{
  modelValue: boolean;
  existingNames: string[];
  saving?: boolean;
  platform?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", name: string): void;
  (e: "hide"): void;
}>();

const nameInputRef = ref<InstanceType<typeof QInput> | null>(null);
const localName = ref("");

const nameRules = computed(() => [
  (v: string | number | null | undefined) =>
    nameSegmentBaseRule(v, props.platform),
  (v: string | number | null | undefined) =>
    duplicateNameRule(v, props.existingNames),
]);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      localName.value = "";
      nextTick(() => nameInputRef.value?.resetValidation());
    }
  },
);

watch(localName, () => {
  nextTick(() => {
    const input = nameInputRef.value;
    if (!input) return;
    if (input.hasError || localName.value.trim()) {
      void input.validate();
    }
  });
});

async function onSubmit() {
  if (props.saving) return;

  const input = nameInputRef.value;
  if (input) {
    const ok = await input.validate();
    if (!ok) return;
  }

  const name = localName.value.trim();
  if (!name) return;

  emit("save", name);
}
</script>
