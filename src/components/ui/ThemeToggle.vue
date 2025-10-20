<template>
  <q-toggle
    v-model="isDark"
    dense
    checked-icon="nights_stay"
    unchecked-icon="wb_sunny"
    :label="label"
  />

</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useQuasar } from "quasar"

const $q = useQuasar()
const label = computed(() => ($q.dark.isActive ? "Dark" : "Light"))

const isDark = computed({
  get: () => $q.dark.isActive,
  set: (v: boolean) => {
    $q.dark.set(v)
    try { localStorage.setItem("theme", v ? "dark" : "light") } catch {}
  }
})

onMounted(() => {
  try {
    const saved = localStorage.getItem("theme")
    if (saved === "dark" || saved === "light") {
      $q.dark.set(saved === "dark")
    } else {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches
      $q.dark.set(prefers)
    }
  } catch {}
})
</script>


