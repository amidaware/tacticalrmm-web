<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card>
      <q-bar>
        {{ $gettext("Import Report Template") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-file
          v-model="file"
          dense
          filled
          :label="$gettext('Import File')"
          style="width: 400px"
          accept=".json"
          :hint="$gettext('Only accepts exported report template JSON files')"
        />
      </q-card-section>

      <q-card-section>
        <q-checkbox
          v-model="overwriteOnNameConflict"
          :label="$gettext('Overwrite if name exists')"
        />
      </q-card-section>

      <q-card-actions>
        <q-space />
        <q-btn v-close-popup dense flat :label="$gettext('Cancel')" />
        <q-btn
          :loading="isLoading"
          dense
          flat
          :label="$gettext('Import')"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
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
const overwriteOnNameConflict = ref(false);

async function submit() {
  if (file.value) {
    importReport({
      overwrite: overwriteOnNameConflict.value,
      template: await file.value.text(),
    });

    // stops the dialog from closing when there is an error
    await until(isLoading).not.toBeTruthy();
    if (isError.value) return;

    onDialogOK();
  } else {
    notifyError(gettext.$gettext("File is required"));
  }
}
</script>
