<template>
  <q-dialog v-model="localModel" persistent>
    <q-card style="min-width: 420px; max-width: 500px">
      <q-card-section class="text-subtitle1 text-bold">
        {{ title }}
      </q-card-section>

      <q-card-section class="row items-start q-gutter-sm flex-nowrap">
        <q-icon name="warning" color="orange" size="32px" />
        <div>{{ message }}</div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Yes" color="primary" @click="$emit('confirm')" />
        <q-btn flat label="No" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
}>();
const localModel = ref(props.modelValue);
watch(
  () => props.modelValue,
  (val) => {
    localModel.value = val;
  },
);
watch(localModel, (val) => {
  emit("update:modelValue", val);
});
</script>

<style scoped>
.flex-nowrap {
  flex-wrap: nowrap;
}
</style>
