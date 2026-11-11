<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 50">
      <q-bar>
        {{ $t("sso.settings.title") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>

      <!-- disable sso-->
      <q-card-section>
        <q-checkbox
          dense
          :label="$t('sso.settings.enable')"
          v-model="ssoSettings.sso_enabled"
        />
      </q-card-section>

      <!-- block local user logon -->
      <q-card-section>
        <q-checkbox
          dense
          :label="$t('sso.settings.blockLocal')"
          v-model="ssoSettings.block_local_user_logon"
          :disable="!ssoSettings.sso_enabled"
          :hint="$t('sso.settings.blockLocalHint')"
        >
          <q-tooltip class="text-caption">{{
            $t("sso.settings.blockLocalHint")
          }}</q-tooltip>
        </q-checkbox>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$t('common.cancel')" v-close-popup />
        <q-btn
          flat
          :label="$t('common.submit')"
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
import { useI18n } from "vue-i18n";

// types
import { SSOSettingsType } from "../types/sso";

// define emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { t } = useI18n();

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
    notifySuccess(t("sso.settings.updated"));
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
