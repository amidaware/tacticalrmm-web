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
            ? $gettext("Edit OIDC Provider")
            : $gettext("Add OIDC Provider")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>

      <!-- name -->
      <q-card-section>
        <q-input
          :readonly="!!props.provider"
          :disable="!!props.provider"
          :label="$gettext('Provider Name')"
          outlined
          dense
          v-model="localProvider.name"
          :rules="[
            (val) => !!val || $gettext('*Required'),
            (val) =>
              /^[a-zA-Z0-9_-]+$/.test(val) ||
              $gettext(
                'Only letters, numbers, hyphens, and underscores are allowed',
              ),
          ]"
          :hint="
            $gettext(
              'A unique identifier for the SSO provider. Avoid spaces and special characters, as this will be part of the callback URL.',
            )
          "
        />
      </q-card-section>

      <!-- url -->
      <q-card-section>
        <q-input
          :label="$gettext('Issuer URL')"
          outlined
          dense
          v-model="localProvider.server_url"
          :rules="[(val) => !!val || $gettext('*Required')]"
          :hint="
            $gettext(
              'The OpenID Connect Issuer URL provided by the SSO provider. This is typically the base URL where the provider hosts their OIDC configuration.',
            )
          "
        />
      </q-card-section>

      <!-- client id -->
      <q-card-section>
        <q-input
          :label="$gettext('Client ID')"
          outlined
          dense
          v-model="localProvider.client_id"
          :rules="[(val) => !!val || $gettext('*Required')]"
        />
      </q-card-section>

      <!-- secret -->
      <q-card-section>
        <q-input
          v-model="localProvider.secret"
          filled
          :type="hideSecret ? 'password' : 'text'"
          :label="$gettext('Secret')"
          outlined
          dense
          :rules="[(val) => !!val || $gettext('*Required')]"
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
          :label="$gettext('Default User Role')"
          :options="roleOptions"
          outlined
          dense
          clearable
          mapOptions
          filled
          v-model="localProvider.role"
          :hint="
            $gettext(
              'The role assigned to users upon first sign-in through this provider.',
            )
          "
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$gettext('Cancel')" v-close-popup />
        <q-btn
          flat
          :label="$gettext('Submit')"
          color="primary"
          :loading="loading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
// composition imports
import { ref, reactive } from "vue";
import { useDialogPluginComponent, extend } from "quasar";
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
    notifySuccess(gettext.$gettext("SSO Provider was edited!"));
  } catch (e) {}

  loading.value = false;
}
</script>
