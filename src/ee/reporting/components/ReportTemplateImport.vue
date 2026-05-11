<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card>
      <q-bar>
        {{ t("reporting.templateImport.title") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            t("reporting.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-file
          v-model="file"
          dense
          filled
          :label="t('reporting.templateImport.importFile')"
          style="width: 400px"
          accept=".json"
          :hint="t('reporting.templateImport.importFileHint')"
        />
      </q-card-section>

      <q-card-section>
        <q-checkbox
          v-model="overwriteOnNameConflict"
          :label="t('reporting.templateImport.overwriteIfNameExists')"
        />
      </q-card-section>

      <q-card-actions>
        <q-space />
        <q-btn v-close-popup dense flat :label="t('reporting.common.cancel')" />
        <q-btn
          :loading="isLoading"
          dense
          flat
          :label="t('reporting.common.import')"
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
import { useI18n } from "vue-i18n";

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { isLoading, isError, importReport } = useSharedReportTemplates;
const { t } = useI18n();

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
    notifyError(t("reporting.templateImport.fileRequired"));
  }
}
</script>
