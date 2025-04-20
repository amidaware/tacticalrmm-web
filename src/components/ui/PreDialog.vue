<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" :style="dialogStyle">
      <q-card-section>
        <div class="text-h6">{{ title }}</div>
        <q-btn
          dense
          flat
          size="md"
          icon="content_copy"
          @click="copyOutput(message)"
          ><q-tooltip>Copy to Clipboard</q-tooltip></q-btn
        >
      </q-card-section>

      <q-card-section class="q-pt-none">
        <pre class="q-pa-sm">{{ message }}</pre>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="OK" @click="onOKClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from "quasar";
import { copyOutput } from "@/utils/helpers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  dialogStyle: {
    type: [String, Object],
    default: () => ({}),
  },
  message: {
    type: String,
    default: "",
  },
});

defineEmits([...useDialogPluginComponent.emits]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

function onOKClick() {
  onDialogOK();
}
</script>

<style>
pre {
  font-family: monospace;
  white-space: pre-wrap;
}
</style>
