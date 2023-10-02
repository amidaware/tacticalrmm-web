<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card>
      <q-bar>
        Import Report Template
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-file
          v-model="file"
          dense
          filled
          label="Import File"
          style="width: 400px"
          accept=".json"
          hint="Only accepts exported report template json files"
        />
      </q-card-section>

      <q-card-actions>
        <q-space />
        <q-btn v-close-popup dense flat label="Cancel" />
        <q-btn
          :loading="isLoading"
          dense
          flat
          label="Import"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { until } from "@vueuse/shared";
import { useDialogPluginComponent } from "quasar";
import { useSharedReportTemplates } from "../api/reporting";
import { notifyError } from "@/utils/notify";

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { isLoading, isError, importReport } = useSharedReportTemplates;

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const file = ref<File | null>(null);

async function submit() {
  if (file.value) {
    importReport(await file.value.text());

    // stops the dialog from closing when there is an error
    await until(isLoading).not.toBeTruthy();
    if (isError.value) return;

    onDialogOK();
  } else {
    notifyError("File is required");
  }
}
</script>
