<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        Customize Email Options
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.subject"
          label="Subject"
          dense
          filled
        />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.body"
          type="textarea"
          label="Body"
          dense
          filled
          hint="Report link will be included at end of body if html report is used"
        />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-input
          v-model="localEmailSettings.attachment_name"
          label="Attachment Name"
          dense
          filled
          hint="Don't include extension"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup dense />
        <q-btn
          flat
          label="Save"
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

import { EmailSettings } from "../types/reporting";

const props = defineProps<{
  emailSettings: EmailSettings;
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
      },
);

async function submit() {
  onDialogOK(localEmailSettings);
}
</script>
