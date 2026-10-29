<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 60vw; max-width: 90vw; min-height: 40vh">
      <q-bar>
        {{
          $gettext("Connected Social Accounts for %{username}", {
            username: user.username,
          })
        }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-table
        dense
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        :style="{ 'max-height': `${$q.screen.height - 24}px` }"
        class="tbl-sticky"
        :rows="user.social_accounts"
        :columns="columns"
        :loading="loading"
        :pagination="{ rowsPerPage: 0, sortBy: 'display', descending: true }"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #body="props">
          <q-tr>
            <!-- rows -->
            <td>{{ props.row.display }}</td>
            <td>{{ props.row.provider }}</td>
            <td>{{ formatDate(props.row.last_login) }}</td>
            <td>{{ formatDate(props.row.date_joined) }}</td>
            <td>
              <q-btn
                size="sm"
                @click="removeSSOAccount(props.row)"
                :label="$gettext('Disconnect')"
                color="negative"
              ></q-btn>
            </td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
// composition imports
import { computed, ref } from "vue";
import { useDialogPluginComponent, useQuasar, type QTableColumn } from "quasar";
import { disconnectSSOAccount } from "@/ee/sso/api/sso";
import { notifySuccess } from "@/utils/notify";
import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/utils/format";

//types
import type { SSOAccount, SSOUser } from "../types/sso";

const columns = computed<QTableColumn[]>(() => [
  {
    name: "display",
    label: gettext.$pgettext("SSO accounts", "Display Name"),
    field: "display",
    align: "left",
    sortable: true,
  },
  {
    name: "provider",
    label: gettext.$gettext("Provider"),
    field: "provider",
    align: "left",
    sortable: true,
  },
  {
    name: "last_login",
    label: gettext.$gettext("Last Login"),
    field: "last_login",
    align: "left",
    sortable: true,
  },
  {
    name: "date_joined",
    label: gettext.$gettext("Date Joined"),
    field: "date_joined",
    align: "left",
    sortable: true,
  },
  {
    name: "action",
    label: "",
    field: "action",
    align: "left",
    sortable: true,
  },
]);

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  user: SSOUser;
}>();

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();
const auth = useAuthStore();

const loading = ref(false);

function removeSSOAccount(account: SSOAccount) {
  $q.dialog({
    title: gettext.$gettext("Disconnect social account: %{name}?", {
      name: account.display,
    }),
    cancel: true,
    ok: { label: gettext.$gettext("Delete"), color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await disconnectSSOAccount(account.provider, account.uid);
      notifySuccess(
        gettext.$gettext("Social account disconnected successfully"),
      );
      if (
        auth.username === props.user.username &&
        auth.ssoLoginProvider === account.provider
      ) {
        await auth.logout();
      }
    } finally {
      loading.value = false;
      onDialogHide();
    }
  });
}
</script>
