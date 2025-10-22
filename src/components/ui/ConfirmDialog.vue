<template>
  <q-dialog v-model="localModel" persistent>
    <q-card :style="{ minWidth: '320px', maxWidth: '500px' }">
      <q-card-section class="text-subtitle1 text-bold">
        {{ title }}
      </q-card-section>

      <q-card-section class="row items-center q-gutter-sm flex-nowrap">
        <q-icon v-if="icon" :name="icon" :color="iconColor" size="32px" />
        <div>{{ message }}</div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <template v-if="type === 'confirm'">
          <q-btn flat label="Yes" color="primary" @click="confirmAction" />
          <q-btn flat label="No" color="primary" v-close-popup />
        </template>
        <template v-else>
          <q-btn flat label="OK" color="primary" @click="closeDialog" />
        </template>
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
  type?: "warning" | "confirm";
  icon?: string;
  iconColor?: string;
}>();

const emit = defineEmits(["update:modelValue", "confirm"]);
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

function closeDialog() {
  localModel.value = false;
}
function confirmAction() {
  emit("confirm");
  closeDialog();
}
</script>

<style scoped>
.flex-nowrap {
  flex-wrap: nowrap;
}
</style>
