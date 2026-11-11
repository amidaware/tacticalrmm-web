<template>
  <div class="fixed-center text-center">
    <p class="text-faded">
      {{ $t("dashboard.notFound.message") }}
      <strong>(404)</strong>
    </p>
    <q-btn color="secondary" style="width: 200px" @click="$router.push('/')">
      {{ $t("dashboard.notFound.goBack") }}
    </q-btn>
  </div>
</template>

<script>
export default {
  name: "NotFound",
};
</script>
