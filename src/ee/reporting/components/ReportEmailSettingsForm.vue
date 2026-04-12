<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        {{ t("reporting.emailSettingsForm.customizeEmailOptions") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.subject"
          :label="t('reporting.emailSettingsForm.subject')"
          dense
          filled
          :hint="t('reporting.emailSettingsForm.subjectHint')"
        />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.body"
          type="textarea"
          :label="t('reporting.emailSettingsForm.body')"
          dense
          filled
          :hint="t('reporting.emailSettingsForm.bodyHint')"
        />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.attachment_name"
          :label="t('reporting.emailSettingsForm.attachmentName')"
          dense
          filled
          :hint="t('reporting.emailSettingsForm.attachmentNameHint')"
        />
      </q-card-section>

      <q-card-section
        v-if="props.format === 'plaintext'"
        class="q-pa-md"
        style="padding-top: 0"
      >
        <q-input
          v-model="localEmailSettings.attachment_extension"
          :label="t('reporting.emailSettingsForm.attachmentExtension')"
          dense
          filled
          prefix="."
          :hint="t('reporting.emailSettingsForm.attachmentExtensionHint')"
        />
      </q-card-section>

      <q-card-section v-if="props.format === 'html'" class="q-pa-md">
        <q-checkbox
          v-model="localEmailSettings.include_report_link"
          :label="t('reporting.emailSettingsForm.includeReportLink')"
        >
          <q-tooltip class="text-caption">
            {{ t("reporting.emailSettingsForm.includeReportLinkTooltip") }}
          </q-tooltip>
        </q-checkbox>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('reporting.common.cancel')" v-close-popup dense />
        <q-btn
          flat
          :label="t('reporting.common.save')"
          color="primary"
          class="q-ml-sm"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { reactive } from "vue";
import { useDialogPluginComponent, extend } from "quasar";
import { useI18n } from "vue-i18n";

import { EmailSettings, ReportFormat } from "../types/reporting";

const props = defineProps<{
  emailSettings: EmailSettings;
  format: ReportFormat;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits(useDialogPluginComponent.emits);
const { t } = useI18n();

const localEmailSettings = reactive<EmailSettings>(
  props.emailSettings
    ? extend({}, props.emailSettings)
    : {
        subject: "",
        body: "",
        attachment_name: "",
        attachment_extension: "",
        include_report_link: false,
      },
);

async function submit() {
  onDialogOK(localEmailSettings);
}
</script>
