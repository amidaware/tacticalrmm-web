<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div class="fixed-center text-center" v-if="error">
    <p class="text-faded">There was an error logging into your provider.</p>
    <q-btn color="secondary" style="width: 200px" to="/login"
      >Go back to Login</q-btn
    >
  </div>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const error = route.params.error;

const router = useRouter();

const auth = useAuthStore();

if (!error) {
  if (auth.loggedIn) {
    router.push({ name: "Dashboard" });
  } else {
    router.push({ name: "Login" });
  }
}
</script>
