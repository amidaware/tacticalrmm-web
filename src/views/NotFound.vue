<template>
  <div class="fixed-center text-center">
    <p class="text-faded">
      {{ $t("navigation.notFound.message") }}
      <strong>{{ $t("navigation.notFound.code") }}</strong>
    </p>
    <q-btn color="secondary" style="width: 200px" @click="$router.push('/')">
      {{ $t("navigation.notFound.goBack") }}
    </q-btn>
  </div>
</template>

<script>
export default {
  name: "NotFound",
};
</script>
