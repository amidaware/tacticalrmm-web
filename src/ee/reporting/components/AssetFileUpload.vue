<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card>
      <q-bar>
        File Upload
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <div class="q-pa-md column items-start q-gutter-y-md">
        <q-file
          v-model="files"
          label="Select files"
          outlined
          multiple
          :clearable="!loading"
          style="width: 400px"
        >
          <template #file="{ file }">
            <q-chip class="full-width q-my-xs" square>
              <q-avatar>
                <q-icon name="insert_drive_file" />
              </q-avatar>

              <div class="ellipsis relative-position">
                {{ file.name }}
              </div>

              <q-tooltip>
                {{ file.name }}
              </q-tooltip>
            </q-chip>
          </template>
        </q-file>
      </div>
      <q-card-actions align="right">
        <q-btn v-close-popup dense flat label="Cancel" />
        <q-btn
          color="primary"
          label="Upload"
          dense
          flat
          :loading="loading"
          @click="upload"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
// composition imports
import { ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { uploadAssets } from "../api/reporting";
import { notifySuccess } from "@/utils/notify";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// props
const props = defineProps<{ parentPath: string }>();

// setup quasar dialog
const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();

const files = ref<File[]>([]);
const loading = ref(false);

async function upload() {
  loading.value = true;

  let formData = new FormData();
  files.value.forEach((file) => {
    formData.append(file.name, file);
  });

  try {
    const result = await uploadAssets(formData, props.parentPath);
    notifySuccess("Files uploaded successfully");
    onDialogOK({ files: files.value, response: result });
  } finally {
    loading.value = false;
  }
}
</script>
