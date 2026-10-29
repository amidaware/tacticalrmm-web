<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        {{ $gettext("Customize Email Options") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.subject"
          :label="$gettext('Subject')"
          dense
          filled
          :hint="
            $gettext(
              'Default if left blank: \u0027Scheduled Report: <report name>\u0027',
            )
          "
        />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.body"
          type="textarea"
          :label="$pgettext('Report email settings', 'Body')"
          dense
          filled
          :hint="
            $gettext('Default if blank: \u0027Your report is attached.\u0027')
          "
        />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.attachment_name"
          :label="$gettext('Attachment Name')"
          dense
          filled
          :hint="$gettext('Do not include the extension.')"
        />
      </q-card-section>

      <q-card-section
        v-if="props.format === 'plaintext'"
        class="q-pa-md"
        style="padding-top: 0"
      >
        <q-input
          v-model="localEmailSettings.attachment_extension"
          :label="$gettext('Attachment Extension')"
          dense
          filled
          prefix="."
          :hint="
            $gettext(
              'Enter the desired extension without a dot (e.g., csv, json, txt). Defaults to \u0027txt\u0027 if blank.',
            )
          "
        />
      </q-card-section>

      <q-card-section v-if="props.format === 'html'" class="q-pa-md">
        <q-checkbox
          v-model="localEmailSettings.include_report_link"
          :label="
            $gettext(
              'Include a direct link to view the report online (requires TRMM account authentication).',
            )
          "
        >
          <q-tooltip class="text-caption">
            {{
              $gettext(
                "The link will be automatically added at the end of the email body.",
              )
            }}
          </q-tooltip>
        </q-checkbox>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$gettext('Cancel')" v-close-popup dense />
        <q-btn
          flat
          :label="$gettext('Save')"
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

import { EmailSettings, ReportFormat } from "../types/reporting";

const props = defineProps<{
  emailSettings: EmailSettings;
  format: ReportFormat;
}>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
defineEmits(useDialogPluginComponent.emits);

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
