<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 60vw">
      <q-card-section class="row items-center">
        <div class="text-h6">Passkeys for {{ user.username }}</div>
        <q-space />
        <q-btn dense flat class="passkey-icon-btn" icon="close" v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="row items-center q-gutter-sm q-mb-sm">
          <q-btn
            dense
            flat
            class="passkey-icon-btn"
            icon="refresh"
            @click="loadPasskeys"
          >
            <q-tooltip>Refresh passkeys</q-tooltip>
          </q-btn>
          <q-space />
          <q-btn
            dense
            color="negative"
            icon="delete"
            label="Reset Passkeys"
            no-caps
            :disable="passkeys.length === 0"
            @click="resetPasskeys"
          />
        </div>

        <q-table
          dense
          flat
          bordered
          row-key="id"
          :rows="passkeys"
          :columns="columns"
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
          no-data-label="No passkeys enrolled"
        >
          <template v-slot:body-cell-nickname="props">
            <q-td :props="props">
              {{ props.row.nickname || "Unnamed passkey" }}
            </q-td>
          </template>

          <template v-slot:body-cell-transports="props">
            <q-td :props="props">
              <q-chip
                v-for="transport in props.row.transports"
                :key="transport"
                dense
                square
                class="passkey-chip"
                color="primary"
                text-color="white"
              >
                {{ transport }}
              </q-chip>
              <span v-if="props.row.transports.length === 0">Browser</span>
            </q-td>
          </template>

          <template v-slot:body-cell-created_at="props">
            <q-td :props="props">{{
              formatDateTime(props.row.created_at)
            }}</q-td>
          </template>

          <template v-slot:body-cell-last_used_at="props">
            <q-td :props="props">{{
              formatDateTime(props.row.last_used_at)
            }}</q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  date,
  useDialogPluginComponent,
  useQuasar,
  type QTableColumn,
} from "quasar";
import {
  fetchUserPasskeys,
  resetUserPasskeys,
  type Passkey,
} from "@/api/webauthn";
import { notifySuccess } from "@/utils/notify";

interface AdminUser {
  id: number;
  username: string;
}

const props = defineProps<{
  user: AdminUser;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();
const passkeys = ref<Passkey[]>([]);

const columns: QTableColumn[] = [
  {
    name: "nickname",
    label: "Name",
    field: "nickname",
    align: "left",
    sortable: true,
  },
  {
    name: "transports",
    label: "Type",
    field: "transports",
    align: "left",
  },
  {
    name: "created_at",
    label: "Created",
    field: "created_at",
    align: "left",
    sortable: true,
  },
  {
    name: "last_used_at",
    label: "Last Used",
    field: "last_used_at",
    align: "left",
    sortable: true,
  },
  {
    name: "device_id",
    label: "Device ID",
    field: "device_id",
    align: "left",
  },
];

function formatDateTime(value: string | null) {
  return value ? date.formatDate(value, "YYYY-MM-DD HH:mm") : "Never";
}

async function loadPasskeys() {
  passkeys.value = await fetchUserPasskeys(props.user.id);
}

function resetPasskeys() {
  $q.dialog({
    title: `Reset passkeys for ${props.user.username}?`,
    cancel: true,
    ok: { label: "Reset", color: "negative" },
  }).onOk(async () => {
    const result = await resetUserPasskeys(props.user.id);
    notifySuccess(`Removed ${result.deleted} passkey(s)`);
    await loadPasskeys();
  });
}

onMounted(loadPasskeys);
</script>

<style scoped>
.passkey-icon-btn {
  border-radius: 6px;
  min-height: 30px;
  min-width: 30px;
}

.passkey-chip {
  border-radius: 6px;
}
</style>
