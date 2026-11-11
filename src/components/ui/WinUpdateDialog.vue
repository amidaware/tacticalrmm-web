<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" :style="dialogStyle">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ title }}</div>
      </q-card-section>
      <q-card-section>
        <div>
          <strong>{{ $t("ui.winUpdateDialog.categories") }}</strong>
          {{ categories.join(", ") }}
        </div>
        <div class="q-mt-md">
          <strong>{{ $t("common.description") }}</strong>
          <div
            v-for="(para, i) in descriptionParagraphs"
            :key="i"
            class="q-mt-xs"
          >
            {{ para }}
          </div>
        </div>
        <div class="q-mt-md">
          <strong>{{ $t("ui.winUpdateDialog.supportUrls") }}</strong>
          <div v-for="url in supportUrls" :key="url" class="q-mt-xs">
            <a
              v-if="isWebUrl(url)"
              :href="url"
              target="_blank"
              rel="noopener"
              :class="linkClass"
              >{{ url }}</a
            >
            <template v-else>{{ url }}</template>
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn :label="$t('common.ok')" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from "vue";
import { useDialogPluginComponent, useQuasar } from "quasar";

const $q = useQuasar();

const props = defineProps({
  title: { type: String, required: true },
  dialogStyle: { type: [String, Object], default: () => ({}) },
  categories: { type: Array, default: () => [] },
  description: { type: String, default: "" },
  supportUrls: { type: Array, default: () => [] },
});

defineEmits([...useDialogPluginComponent.emits]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

const descriptionParagraphs = computed(() =>
  props.description
    .split(/\. +/)
    .map((para) => (para.endsWith(".") ? para : para + ".")),
);

function isWebUrl(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

const linkClass = computed(() =>
  $q.dark.isActive ? "text-white" : "text-primary",
);
</script>
