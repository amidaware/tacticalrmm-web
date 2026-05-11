<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog persistent ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 35vw; max-width: 35vw">
      <q-bar>
        {{
          props.provider
            ? t("reporting.sso.providersForm.editOidcProvider")
            : t("reporting.sso.providersForm.addOidcProvider")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            t("reporting.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>

      <!-- name -->
      <q-card-section>
        <q-input
          :readonly="!!props.provider"
          :disable="!!props.provider"
          :label="t('reporting.sso.providersForm.providerName')"
          outlined
          dense
          v-model="localProvider.name"
          :rules="[
            (val) => !!val || t('reporting.sso.providersForm.required'),
            (val) =>
              /^[a-zA-Z0-9_-]+$/.test(val) ||
              t('reporting.sso.providersForm.providerNameValidation'),
          ]"
          :hint="t('reporting.sso.providersForm.providerNameHint')"
        />
      </q-card-section>

      <!-- url -->
      <q-card-section>
        <q-input
          :label="t('reporting.sso.providersForm.issuerUrl')"
          outlined
          dense
          v-model="localProvider.server_url"
          :rules="[(val) => !!val || t('reporting.sso.providersForm.required')]"
          :hint="t('reporting.sso.providersForm.issuerUrlHint')"
        />
      </q-card-section>

      <!-- client id -->
      <q-card-section>
        <q-input
          :label="t('reporting.sso.providersForm.clientId')"
          outlined
          dense
          v-model="localProvider.client_id"
          :rules="[(val) => !!val || t('reporting.sso.providersForm.required')]"
        />
      </q-card-section>

      <!-- secret -->
      <q-card-section>
        <q-input
          v-model="localProvider.secret"
          filled
          :type="hideSecret ? 'password' : 'text'"
          :label="t('reporting.sso.providersForm.secret')"
          outlined
          dense
          :rules="[(val) => !!val || t('reporting.sso.providersForm.required')]"
        >
          <template v-slot:append>
            <q-icon
              :name="hideSecret ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="hideSecret = !hideSecret"
            />
          </template>
        </q-input>
      </q-card-section>

      <q-card-section>
        <tactical-dropdown
          :label="t('reporting.sso.providersForm.defaultUserRole')"
          :options="roleOptions"
          outlined
          dense
          clearable
          mapOptions
          filled
          v-model="localProvider.role"
          :hint="t('reporting.sso.providersForm.defaultUserRoleHint')"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('reporting.common.cancel')" v-close-popup />
        <q-btn
          flat
          :label="t('reporting.common.submit')"
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
import { ref, reactive } from "vue";
import { useDialogPluginComponent, extend } from "quasar";
import { useI18n } from "vue-i18n";
import { editSSOProvider, addSSOProvider } from "@/ee/sso/api/sso";
import { notifySuccess } from "@/utils/notify";
import { useRoleDropdown } from "@/composables/accounts";

// components
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// types
import type { SSOProvider } from "@/ee/sso/types/sso";

// define emits
defineEmits([...useDialogPluginComponent.emits]);

// define props
const props = defineProps<{ provider?: SSOProvider }>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { t } = useI18n();

const loading = ref(false);

const { roleOptions } = useRoleDropdown({ onMount: true });

const hideSecret = ref(true);
const localProvider: SSOProvider = props.provider
  ? reactive(extend({}, props.provider))
  : reactive({
      id: 0,
      name: "",
      client_id: "",
      secret: "",
      server_url: "",
      role: null,
    } as SSOProvider);

async function submit() {
  loading.value = true;

  try {
    props.provider
      ? await editSSOProvider(localProvider.id, localProvider)
      : await addSSOProvider(localProvider);
    onDialogOK();
    notifySuccess(t("reporting.sso.providersForm.providerSaved"));
  } catch (e) {}

  loading.value = false;
}
</script>
