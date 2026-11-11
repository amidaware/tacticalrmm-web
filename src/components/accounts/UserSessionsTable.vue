<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 60vw; max-width: 90vw; min-height: 40vh">
      <q-bar>
        {{ $t("admin.sessions.title", { username: user.username }) }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            $t("common.close")
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
            :label="$t('admin.sessions.removeAll')"
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
                :label="$t('admin.sessions.disconnect')"
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
import { useI18n } from "vue-i18n";
import {
  fetchUserSessions,
  deleteAllUserSessions,
  deleteUserSession,
} from "@/api/accounts";

//types
import type { SSOUser } from "@/ee/sso/types/sso";
import type { AuthToken } from "@/types/accounts";

const { t } = useI18n();

const columns: QTableColumn[] = [
  {
    name: "created",
    label: t("admin.sessions.created"),
    field: "created",
    align: "left",
    sortable: true,
  },
  {
    name: "expiry",
    label: t("admin.sessions.expires"),
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
    title: t("admin.sessions.disconnectConfirm", { user: token.user }),
    message: t("admin.sessions.signedOutMessage"),
    cancel: true,
    ok: { label: t("common.delete"), color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await deleteUserSession(token.digest);
      notifySuccess(t("admin.sessions.deleted"));
    } finally {
      loading.value = false;
      await getSessions();
    }
  });
}

function removeAllSessions() {
  $q.dialog({
    title: t("admin.sessions.disconnectAllConfirm", {
      username: props.user.username,
    }),
    cancel: true,
    ok: { label: t("common.delete"), color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await deleteAllUserSessions(props.user.id);
      notifySuccess(t("admin.sessions.allDeleted"));
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
