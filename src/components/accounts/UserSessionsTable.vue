<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 60vw; max-width: 90vw; min-height: 40vh">
      <q-bar>
        User Sessions for {{ user.username }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
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
        :rows="sessions"
        :columns="columns"
        :loading="loading"
        :pagination="{ rowsPerPage: 0, sortBy: 'display', descending: true }"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #top>
          <q-space />
          <q-btn
            label="Remove All Sessions"
            @click="removeAllSessions"
            size="sm"
            color="negative"
          />
        </template>
        <template #body="props">
          <q-tr>
            <!-- rows -->
            <td>{{ formatDate(props.row.created) }}</td>
            <td>{{ formatDate(props.row.expiry) }}</td>
            <td>
              <q-btn
                size="sm"
                @click="removeSession(props.row)"
                label="Disconnect"
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
// composition imports
import { onMounted, ref } from "vue";
import { useDialogPluginComponent, useQuasar, type QTableColumn } from "quasar";
import { notifySuccess } from "@/utils/notify";
import { formatDate } from "@/utils/format";
import {
  fetchUserSessions,
  deleteAllUserSessions,
  deleteUserSession,
} from "@/api/accounts";

//types
import type { SSOUser } from "@/ee/sso/types/sso";
import type { AuthToken } from "@/types/accounts";

const columns: QTableColumn[] = [
  {
    name: "created",
    label: "Created",
    field: "created",
    align: "left",
    sortable: true,
  },
  {
    name: "expiry",
    label: "Expires",
    field: "expiry",
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
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{
  user: SSOUser;
}>();

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

const sessions = ref([] as AuthToken[]);
const loading = ref(false);

function removeSession(token: AuthToken) {
  $q.dialog({
    title: `Disconnect session for ${token.user}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await deleteUserSession(token.digest);
      notifySuccess("Login session deleted successfully");
    } finally {
      loading.value = false;
      await getSessions();
    }
  });
}

function removeAllSessions() {
  $q.dialog({
    title: `Disconnect all sessions for ${props.user.username}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await deleteAllUserSessions(props.user.id);
      notifySuccess("Login sessions deleted successfully");
    } finally {
      loading.value = false;
      onDialogHide();
    }
  });
}

async function getSessions() {
  sessions.value = await fetchUserSessions(props.user.id);
}

onMounted(getSessions);
</script>
