<template>
  <div class="q-video" :style="{ height: `${$q.screen.height - 26}px` }">
    <iframe
      v-show="vnc"
      :src="vnc"
      allow="clipboard-read; clipboard-write"
      allowfullscreen
      frameborder="0"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useMeta } from "quasar";

import { fetchAgentWebVNCUrl } from "@/api/agents";

const { params } = useRoute();
const vnc = ref("");

async function getVNCUrl() {
  try {
    const data = await fetchAgentWebVNCUrl(params.agent_id, params.port);
    vnc.value = data.vnc;
    useMeta({
      title: `${data.hostname} - ${data.client} - ${data.site} | VNC`,
    });
  } catch (e) {
    console.error(e);
  }
}

onMounted(async () => {
  getVNCUrl();
});
</script>
