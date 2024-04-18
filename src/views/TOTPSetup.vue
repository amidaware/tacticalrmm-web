<template>
  <div class="q-pa-md">
    <div class="row">
      <div class="col"></div>
      <div class="col">
        <q-card>
          <q-card-section class="row items-center">
            <div class="text-h6">Setup 2-Factor</div>
          </q-card-section>
          <q-card-section v-if="qrUrl">
            <p>
              Scan the QR Code with your authenticator app and then click Finish
              to be redirected back to the signin page. If you navigate away
              from this page you 2FA signin will need to be reset!
            </p>
            <img :src="qrCode" alt="QR Code" />
          </q-card-section>
          <q-card-section v-if="totpKey">
            <p>
              You can also use the below code to configure the authenticator
              manually.
            </p>
            <p>{{ totpKey }}</p>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              label="Finish"
              color="primary"
              class="full-width"
              @click="logout"
              :loading="loading"
            />
          </q-card-actions>
        </q-card>
      </div>
      <div class="col"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useQuasar } from "quasar";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

import { useQRCode } from "@vueuse/integrations/useQRCode";

// setup quasar
const $q = useQuasar();

// setup auth store
const auth = useAuthStore();

// setup router
const router = useRouter();

const totpKey = ref("");
const qrUrl = ref("");
const clearToken = ref(true);
const loading = ref(false);

const qrCode = useQRCode(qrUrl);

async function getQRCodeData() {
  loading.value = true;

  try {
    const data = await auth.setupTotp();

    if (!data) {
      //don't logout user if totp is already set
      clearToken.value = false;
      router.push({ name: "Login" });
    } else {
      totpKey.value = data.totp_key;
      qrUrl.value = data.qr_url;
    }
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await auth.logout();
  clearToken.value = false;
  router.push({ name: "Login" });
}

onMounted(() => {
  getQRCodeData();
  $q.dark.set(false);
});

onBeforeUnmount(async () => {
  if (clearToken.value) {
    await auth.logout();
  }
});
</script>
