<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 50">
      <q-bar>
        SSO Settings
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <!-- disable sso-->
      <q-card-section>
        <q-checkbox
          dense
          label="Enable SSO"
          v-model="ssoSettings.sso_enabled"
        />
      </q-card-section>

      <!-- block local user logon -->
      <q-card-section>
        <q-checkbox
          dense
          label="Block Local User Login"
          v-model="ssoSettings.block_local_user_logon"
          :disable="!ssoSettings.sso_enabled"
          hint="When enabled, only users with SSO accounts can log in, with the exception of local superuser accounts."
        >
          <q-tooltip class="text-caption"
            >When enabled, only users with SSO accounts can log in, with the
            exception of local superuser accounts.</q-tooltip
          >
        </q-checkbox>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          flat
          label="Submit"
          color="primary"
          :loading="loading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, watch, onMounted } from "vue";
import { useDialogPluginComponent } from "quasar";
import { notifySuccess, notifyWarning } from "@/utils/notify";
import { fetchSSOSettings, updateSSOSettings } from "@/ee/sso/api/sso";

// types
import { SSOSettingsType } from "../types/sso";

// define emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const ssoSettings = ref({} as SSOSettingsType);
const loading = ref(false);

async function getSSOSettings() {
  loading.value = true;
  try {
    ssoSettings.value = await fetchSSOSettings();
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
}

async function submit() {
  loading.value = true;
  try {
    await updateSSOSettings(ssoSettings.value);
    notifySuccess("Settings updated successfully");
    onDialogOK(ssoSettings.value);
  } catch (e) {
    if (e.status === 423) {
      notifyWarning(e.response.data, 7000);
    }
    console.error(e);
  }
  loading.value = false;
}

onMounted(async () => {
  await getSSOSettings();
  // watcher to disable block local login if sso is disabled
  watch(
    () => ssoSettings.value.sso_enabled,
    (newValue) => {
      if (!newValue) {
        ssoSettings.value.block_local_user_logon = false;
      }
    },
  );
});
</script>
