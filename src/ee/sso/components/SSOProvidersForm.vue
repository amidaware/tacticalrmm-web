<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 50">
      <q-bar>
        {{ props.provider ? "Edit SSO Provider" : "Add SSO Provider" }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <!-- name -->
      <q-card-section>
        <q-input
          :readonly="!!props.provider"
          label="Name"
          outlined
          dense
          v-model="localProvider.name"
          :rules="[(val) => !!val || '*Required']"
        />
      </q-card-section>

      <!-- url -->
      <q-card-section>
        <q-input
          label="Server URL"
          outlined
          dense
          v-model="localProvider.server_url"
          :rules="[(val) => !!val || '*Required']"
        />
      </q-card-section>

      <!-- client id -->
      <q-card-section>
        <q-input
          label="Client ID"
          outlined
          dense
          v-model="localProvider.client_id"
          :rules="[(val) => !!val || '*Required']"
        />
      </q-card-section>

      <!-- secret -->
      <q-card-section>
        <q-input
          label="Secret"
          outlined
          dense
          v-model="localProvider.secret"
          :rules="[(val) => !!val || '*Required']"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          flat
          label="Submit"
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
import { editSSOProvider, addSSOProvider } from "@/ee/sso/api/sso";
import { notifySuccess } from "@/utils/notify";
import { SSOProvider } from "@/types/accounts";

// define emits
defineEmits([...useDialogPluginComponent.emits]);

// define props
const props = defineProps<{ provider?: SSOProvider }>();

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const loading = ref(false);

const localProvider: SSOProvider = props.provider
  ? reactive(extend({}, props.provider))
  : reactive({
      id: 0,
      name: "",
      client_id: "",
      secret: "",
      server_url: "",
    } as SSOProvider);

async function submit() {
  loading.value = true;

  try {
    props.provider
      ? await editSSOProvider(localProvider.id, localProvider)
      : await addSSOProvider(localProvider);
    onDialogOK();
    notifySuccess("SSO Provider was edited!");
  } catch (e) {}

  loading.value = false;
}
</script>
