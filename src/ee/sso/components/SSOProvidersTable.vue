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
        label="Add OIDC Provider"
        @click="addSSOProvider"
        :disable="!ssoSettings.sso_enabled"
      >
        <q-tooltip v-if="!ssoSettings.sso_enabled" class="text-caption"
          >Enable SSO in the settings to allow adding a provider.</q-tooltip
        >
      </q-btn>
    </div>
    <q-separator />
    <q-table
      dense
      :rows="providers"
      :columns="columns"
      :visible-columns="visibleColumns"
      :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: true }"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      no-data-label="No OIDC Providers added yet"
      :loading="loading"
    >
      <template v-slot:top>
        <q-btn
          @click="openSSOSettings"
          label="SSO Settings"
          no-caps
          color="primary"
          size="md"
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

              <!-- callback url -->
              <q-item
                clickable
                v-close-popup
                @click="getCallbackURL(props.row.callback_url)"
              >
                <q-item-section side>
                  <q-icon name="description" />
                </q-item-section>
                <q-item-section>Copy Callback URL</q-item-section>
              </q-item>

              <!-- javascript origin url (used by google oauth) -->
              <q-item
                clickable
                v-close-popup
                @click="getCallbackURL(props.row.javascript_origin_url)"
              >
                <q-item-section side>
                  <q-icon name="description" />
                </q-item-section>
                <q-item-section
                  >Copy Allowed JavaScript Origin to Clipboard</q-item-section
                >
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- name -->
          <q-td>
            {{ truncateText(props.row.name, 25) }}
            <q-tooltip>{{ props.row.name }}</q-tooltip>
          </q-td>
          <!-- server_url -->
          <q-td>
            {{ truncateText(props.row.server_url, 20) }}
            <q-tooltip>{{ props.row.server_url }}</q-tooltip>
          </q-td>
          <!-- pattern -->
          <q-td>
            {{ truncateText(props.row.client_id, 20) }}
            <q-tooltip>{{ props.row.client_id }}</q-tooltip>
          </q-td>
          <q-td>
            <q-icon
              size="sm"
              name="content_copy"
              @click="getCallbackURL(props.row.callback_url)"
            >
              <q-tooltip>Copy Callback URL to Clipboard</q-tooltip>
            </q-icon>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
// composition imports
import { computed, ref, onMounted } from "vue";
import { useStore } from "vuex";
import { QTableColumn, useQuasar, copyToClipboard } from "quasar";
import {
  fetchSSOProviders,
  removeSSOProvider,
  fetchSSOSettings,
} from "@/ee/sso/api/sso";
import { notifySuccess } from "@/utils/notify";
import { truncateText } from "@/utils/format";

// ui imports
import SSOProvidersForm from "@/ee/sso/components/SSOProvidersForm.vue";

// types
import { type SSOProvider, SSOSettingsType } from "@/ee/sso/types/sso";
import SSOSettings from "@/ee/sso/components/SSOSettings.vue";

// setup quasar
const $q = useQuasar();

// setup vuew store
const store = useStore();

const loading = ref(false);
const providers = ref([] as SSOProvider[]);
const ssoSettings = ref({} as SSOSettingsType);

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
  {
    name: "callback_url",
    label: "Callback URL",
    field: "callback_url",
    align: "left",
    sortable: false,
  },
  {
    name: "javascript_origin_url",
    label: "Javascript Origin URL",
    field: "javascript_origin_url",
    align: "left",
    sortable: false,
  },
];

const visibleColumns = computed(() => {
  return columns
    .map((column) => column.name)
    .filter((name) => name !== "javascript_origin_url");
});

async function getSSOSettings() {
  try {
    ssoSettings.value = await fetchSSOSettings();
  } catch (e) {
    console.error(e);
  }
}

async function getSSOProviders() {
  loading.value = true;
  try {
    providers.value = await fetchSSOProviders();
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

function getCallbackURL(url: string) {
  copyToClipboard(url).then(() => {
    notifySuccess("URL copied!");
  });
}

function openSSOSettings() {
  $q.dialog({
    component: SSOSettings,
  }).onOk((updatedSSOSettings: SSOSettingsType) => {
    store.commit(
      "setBlockLocalUserLogon",
      updatedSSOSettings.block_local_user_logon,
    );
    ssoSettings.value = { ...updatedSSOSettings };
  });
}

onMounted(async () => {
  await getSSOSettings();
  await getSSOProviders();
});
</script>
