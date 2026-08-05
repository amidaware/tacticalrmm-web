<template>
  <div class="row q-gutter-sm items-center">
    <div class="col-auto">{{ label }}</div>
    <div class="col-auto">
      <q-btn dense flat size="md" icon="content_copy" @click="copyText">
        <q-tooltip>{{
          t("scripts.scriptOutputCopyClip.copyToClipboard")
        }}</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { copyOutput } from "@/utils/helpers";
import { useI18n } from "vue-i18n";

const props = defineProps({
  label: String,
  data: {
    type: String,
    required: true,
  },
});

const { t } = useI18n();

const copyText = () => {
  copyOutput(props.data);
};
</script>
