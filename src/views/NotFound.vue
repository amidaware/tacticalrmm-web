<template>
  <div class="fixed-center text-center">
    <p class="text-faded">
      {{ $gettext("Sorry, nothing here...") }}
      <strong>{{ $gettext("(404)") }}</strong>
    </p>
    <q-btn color="secondary" style="width: 200px" @click="$router.push('/')">
      {{ $gettext("Go back") }}
    </q-btn>
  </div>
</template>

<script>
export default {
  name: "NotFound",
};
</script>
