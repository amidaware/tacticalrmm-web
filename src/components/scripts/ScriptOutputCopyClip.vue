<template>
  <div class="row q-gutter-sm items-center">
    <div class="col-auto">{{ label }}</div>
    <div class="col-auto">
      <q-btn dense flat size="md" icon="content_copy" @click="copyText">
        <q-tooltip>Copy to Clipboard</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { copyOutput } from "@/utils/helpers";

const props = defineProps({
  label: String,
  data: {
    type: String,
    required: true,
  },
});

const copyText = () => {
  copyOutput(props.data);
};
</script>
