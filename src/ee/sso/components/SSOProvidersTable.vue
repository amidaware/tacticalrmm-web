<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">SSO Providers</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        label="Add SSO Provider"
        @click="addSSOProvider"
      />
    </div>
    <q-separator />
    <q-table
      dense
      :rows="providers"
      :columns="columns"
      :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: true }"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      no-data-label="No SSO Providers added yet"
      :loading="loading"
    >
      <template v-slot:top>
        <q-space />
        <q-btn
          @click="
            changeSSOSettings({
              block_local_user_logon: !ssoSettings.block_local_user_logon,
            })
          "
          :label="
            ssoSettings.block_local_user_logon
              ? 'Allow Local Logon'
              : 'Block Local Logon'
          "
          no-caps
          color="primary"
          size="sm"
        />
      </template>
      <!-- body slots -->
      <template v-slot:body="props">
        <q-tr
          :props="props"
          class="cursor-pointer"
          @dblclick="editSSOProvider(props.row)"
        >
          <!-- context menu -->
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item
                clickable
                v-close-popup
                @click="editSSOProvider(props.row)"
              >
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="deleteSSOProvider(props.row)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>Delete</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- name -->
          <q-td>
            {{ props.row.name }}
          </q-td>
          <!-- server_url -->
          <q-td>
            {{ props.row.server_url }}
          </q-td>
          <!-- pattern -->
          <q-td>
            {{ props.row.client_id }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
// composition imports
import { ref, onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import {
  fetchSSOProviders,
  removeSSOProvider,
  fetchSSOSettings,
  updateSSOSettings,
  type SSOSettings,
} from "@/ee/sso/api/sso";
import { notifySuccess } from "@/utils/notify";

// ui imports
import SSOProvidersForm from "@/ee/sso/components/SSOProvidersForm.vue";

// types
import { type SSOProvider } from "@/ee/sso/types/sso";

// setup quasar
const $q = useQuasar();

const loading = ref(false);

const providers = ref([] as SSOProvider[]);
const ssoSettings = ref({} as SSOSettings);
const columns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "server_url",
    label: "Server Url",
    field: "server_url",
    align: "left",
    sortable: true,
  },
  {
    name: "client_id",
    label: "Client ID",
    field: "client_id",
    align: "left",
    sortable: true,
  },
];

async function getSSOProviders() {
  loading.value = true;
  try {
    providers.value = await fetchSSOProviders();
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
}

async function getSSOSettings() {
  loading.value = true;
  try {
    ssoSettings.value = await fetchSSOSettings();
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
}

async function changeSSOSettings(data: SSOSettings) {
  loading.value = true;
  try {
    ssoSettings.value = await updateSSOSettings(data);
    await getSSOSettings();
    notifySuccess("Settings updated successfully");
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
}

function addSSOProvider() {
  $q.dialog({
    component: SSOProvidersForm,
  }).onOk(getSSOProviders);
}

function editSSOProvider(provider: SSOProvider) {
  $q.dialog({
    component: SSOProvidersForm,
    componentProps: {
      provider: provider,
    },
  }).onOk(getSSOProviders);
}

function deleteSSOProvider(provider: SSOProvider) {
  $q.dialog({
    title: `Delete SSO Provider: ${provider.name}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await removeSSOProvider(provider.id);
      await getSSOProviders();
      notifySuccess(`SSO Provider: ${provider.name} was deleted!`);
    } catch (e) {
      console.error(e);
    }
    loading.value = false;
  });
}

onMounted(async () => {
  await getSSOProviders();
  await getSSOSettings();
});
</script>
