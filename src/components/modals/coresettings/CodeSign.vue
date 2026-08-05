<template>
  <q-card style="min-width: 85vh">
    <q-card-section class="row items-center">
      <div class="text-h6">{{ t("settings.codeSign.title") }}</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>
    <q-card-section class="row">
      <q-btn
        :disable="!settings.token"
        :label="t('settings.codeSign.codeSignAllAgents')"
        color="positive"
        class="full-width"
        @click="doCodeSign"
        :loading="loading"
      >
        <q-tooltip>{{
          t("settings.codeSign.codeSignAllAgentsTooltip")
        }}</q-tooltip>
        <template v-slot:loading>
          <q-spinner-facebook />
        </template>
      </q-btn>
    </q-card-section>
    <q-form @submit.prevent="editToken">
      <q-card-section class="row">
        <div class="col-2">{{ t("settings.codeSign.token") }}:</div>
        <div class="col-1"></div>
        <q-input
          outlined
          dense
          v-model="settings.token"
          class="col-9 q-pa-none"
          :rules="[(val) => !!val || t('settings.codeSign.tokenRequired')]"
        />
      </q-card-section>
      <q-card-section class="row items-center">
        <q-btn
          :label="t('settings.common.save')"
          color="primary"
          type="submit"
        />
        <q-space />
        <q-btn
          :label="t('settings.common.delete')"
          color="negative"
          @click="confirmDelete"
        />
      </q-card-section>
    </q-form>
  </q-card>
</template>

<script>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import axios from "axios";
import { notifySuccess } from "@/utils/notify";
import { useI18n } from "vue-i18n";

const endpoint = "/core/codesign/";

export default {
  name: "CodeSign",
  setup() {
    const $q = useQuasar();
    const { t } = useI18n();
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
        notifySuccess(t("settings.codeSign.notify.tokenDeleted"));
        await getToken();
      } catch (e) {
        console.error(e);
      }
    }

    function confirmDelete() {
      $q.dialog({
        title: t("settings.codeSign.deleteTokenTitle"),
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
      t,
      confirmDelete,
      doCodeSign,
      editToken,
    };
  },
};
</script>
