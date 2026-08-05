<template>
  <div class="fixed-center text-center">
    <p class="text-faded">{{ t("auth.sessionExpired.message") }}</p>
    <q-btn color="secondary" style="width: 200px" to="/login">
      {{ t("auth.sessionExpired.login") }}
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useDashWSConnection } from "@/websocket/websocket";

const { t } = useI18n();

// setup store
const auth = useAuthStore();

// setup websocket
const { close } = useDashWSConnection();

onMounted(async () => {
  await auth.logout();
  close();
});
</script>
