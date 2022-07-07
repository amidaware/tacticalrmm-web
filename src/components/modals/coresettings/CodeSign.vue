<template>
  <q-card style="min-width: 85vh">
    <q-card-section class="row items-center">
      <div class="text-h6">Code Signing</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>
    <q-card-section class="row">
      <q-btn
        :disable="!settings.token"
        label="Code sign all agents"
        color="positive"
        class="full-width"
        @click="doCodeSign"
        :loading="loading"
      >
        <q-tooltip
          >Force all existing agents to be updated to the code-signed
          version</q-tooltip
        >
        <template v-slot:loading>
          <q-spinner-facebook />
        </template>
      </q-btn>
    </q-card-section>
    <q-form @submit.prevent="editToken">
      <q-card-section class="row">
        <div class="col-2">Token:</div>
        <div class="col-1"></div>
        <q-input
          outlined
          dense
          v-model="settings.token"
          class="col-9 q-pa-none"
          :rules="[(val) => !!val || 'Token is required']"
        />
      </q-card-section>
      <q-card-section class="row items-center">
        <q-btn label="Save" color="primary" type="submit" />
        <q-space />
        <q-btn label="Delete" color="negative" @click="confirmDelete" />
      </q-card-section>
    </q-form>
  </q-card>
</template>

<script>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import axios from "axios";
import { notifySuccess } from "@/utils/notify";

const endpoint = "/core/codesign/";

export default {
  name: "CodeSign",
  setup() {
    const $q = useQuasar();
    const settings = ref({ token: "" });
    const loading = ref(false);

    async function getToken() {
      try {
        const { data } = await axios.get(endpoint);
        settings.value = data;
      } catch (e) {
        console.error(e);
      }
    }

    async function deleteToken() {
      try {
        await axios.delete(endpoint);
        notifySuccess("Token was deleted!");
        await getToken();
      } catch (e) {
        console.error(e);
      }
    }

    function confirmDelete() {
      $q.dialog({
        title: "Delete token?",
        cancel: true,
        persistent: true,
      }).onOk(() => {
        deleteToken();
      });
    }

    async function doCodeSign() {
      loading.value = true;
      try {
        const { data } = await axios.post(endpoint);
        loading.value = false;
        notifySuccess(data);
      } catch (e) {
        loading.value = false;
        console.error(e);
      }
    }

    async function editToken() {
      $q.loading.show();
      try {
        const { data } = await axios.patch(endpoint, settings.value);
        $q.loading.hide();
        notifySuccess(data);
      } catch (e) {
        $q.loading.hide();
        console.error(e);
      }
    }

    onMounted(() => {
      getToken();
    });

    return {
      settings,
      loading,
      confirmDelete,
      doCodeSign,
      editToken,
    };
  },
};
</script>
