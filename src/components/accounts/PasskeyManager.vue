<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-sm">
      <q-btn-dropdown
        dense
        color="secondary"
        dropdown-icon="more_horiz"
        label="Other"
        no-caps
        class="passkey-action-btn"
      >
        <q-list dense style="min-width: 180px">
          <q-item
            clickable
            v-close-popup
            @click="addPasskey(enrollmentOptions.browser)"
          >
            <q-item-section>Browser Choice</q-item-section>
            <q-item-section side>
              <q-icon name="devices" />
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="addPasskey(enrollmentOptions.securityKey)"
          >
            <q-item-section>Security Key</q-item-section>
            <q-item-section side>
              <q-icon name="vpn_key" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn
        dense
        color="secondary"
        icon-right="phone_iphone"
        label="Phone"
        no-caps
        class="passkey-action-btn"
        @click="addPasskey(enrollmentOptions.phone)"
      />
      <q-btn
        dense
        color="primary"
        icon-right="fingerprint"
        label="This Device"
        no-caps
        class="passkey-action-btn"
        @click="addPasskey(enrollmentOptions.thisDevice)"
      />
      <q-space />
      <q-btn
        dense
        flat
        class="passkey-icon-btn"
        icon="refresh"
        @click="loadPasskeys"
      >
        <q-tooltip>Refresh passkeys</q-tooltip>
      </q-btn>
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
        <q-td :props="props">{{ formatDateTime(props.row.created_at) }}</q-td>
      </template>

      <template v-slot:body-cell-last_used_at="props">
        <q-td :props="props">{{ formatDateTime(props.row.last_used_at) }}</q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" auto-width>
          <q-btn
            dense
            flat
            class="passkey-icon-btn"
            icon="edit"
            @click="renameExistingPasskey(props.row)"
          >
            <q-tooltip>Rename passkey</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            class="passkey-icon-btn"
            color="negative"
            icon="delete"
            @click="removePasskey(props.row)"
          >
            <q-tooltip>Delete passkey</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { date, useQuasar, type QTableColumn } from "quasar";
import {
  beginPasskeyRegistration,
  completePasskeyRegistration,
  createPasskeyCredential,
  credentialToJSON,
  credentialTransports,
  deletePasskey,
  fetchPasskeys,
  renamePasskey,
  type Passkey,
  type PasskeyAttachment,
} from "@/api/webauthn";
import { notifyError, notifySuccess } from "@/utils/notify";

const emit = defineEmits(["changed"]);
const $q = useQuasar();
const passkeys = ref<Passkey[]>([]);

interface EnrollmentOption {
  attachment?: PasskeyAttachment;
  dialogTitle: string;
  defaultName: string;
}

const enrollmentOptions: Record<
  "browser" | "securityKey" | "phone" | "thisDevice",
  EnrollmentOption
> = {
  browser: {
    dialogTitle: "Add passkey",
    defaultName: "Passkey",
  },
  securityKey: {
    attachment: "cross-platform",
    dialogTitle: "Add security key",
    defaultName: "Security key",
  },
  phone: {
    attachment: "cross-platform",
    dialogTitle: "Add phone passkey",
    defaultName: "Phone passkey",
  },
  thisDevice: {
    attachment: "platform",
    dialogTitle: "Add this device",
    defaultName: "This device",
  },
};

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
  {
    name: "actions",
    label: "",
    field: "actions",
    align: "right",
  },
];

function formatDateTime(value: string | null) {
  return value ? date.formatDate(value, "YYYY-MM-DD HH:mm") : "Never";
}

async function loadPasskeys() {
  passkeys.value = await fetchPasskeys();
}

function promptPasskeyName(option: EnrollmentOption) {
  return new Promise<string | null>((resolve) => {
    $q.dialog({
      title: option.dialogTitle,
      prompt: {
        model: option.defaultName,
        type: "text",
        label: "Passkey name",
      },
      cancel: true,
      ok: { label: "Continue" },
      persistent: true,
    })
      .onOk((nickname: string) =>
        resolve(nickname.trim() || option.defaultName),
      )
      .onCancel(() => resolve(null));
  });
}

async function addPasskey(option: EnrollmentOption) {
  const nickname = await promptPasskeyName(option);
  if (nickname === null) return;

  $q.loading.show();
  try {
    const options = await beginPasskeyRegistration(option.attachment);
    const credential = await createPasskeyCredential(options);
    await completePasskeyRegistration(
      credentialToJSON(credential),
      nickname,
      credentialTransports(credential),
    );
    notifySuccess("Passkey added");
    await loadPasskeys();
    emit("changed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Passkey registration failed";
    notifyError(message, 3500);
  } finally {
    $q.loading.hide();
  }
}

function renameExistingPasskey(passkey: Passkey) {
  $q.dialog({
    title: "Rename passkey",
    prompt: {
      model: passkey.nickname || "",
      type: "text",
      label: "Name",
    },
    cancel: true,
    persistent: true,
  }).onOk(async (nickname: string) => {
    await renamePasskey(passkey.id, nickname || null);
    notifySuccess("Passkey renamed");
    await loadPasskeys();
    emit("changed");
  });
}

function removePasskey(passkey: Passkey) {
  $q.dialog({
    title: `Delete ${passkey.nickname || "passkey"}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(async () => {
    await deletePasskey(passkey.id);
    notifySuccess("Passkey deleted");
    await loadPasskeys();
    emit("changed");
  });
}

onMounted(loadPasskeys);
</script>

<style scoped>
.passkey-action-btn,
.passkey-icon-btn {
  border-radius: 6px;
}

.passkey-icon-btn {
  min-height: 30px;
  min-width: 30px;
}

.passkey-chip {
  border-radius: 6px;
}
</style>
