<template>
  <q-btn
    v-if="visible"
    size="md"
    dense
    no-caps
    flat
    icon="support_agent"
    label="Quick Support"
    :class="waiting ? 'text-orange' : ''"
    title="Open the Quick Support queue"
    @click="openQueue"
  >
    <q-badge v-if="waiting" color="red" floating rounded>{{ waiting }}</q-badge>
  </q-btn>
</template>

<script>
// Top-bar entry to the Quick Support queue. Only Support Techs see it (the API answers 403 to
// everyone else, and we stop polling). Polls every 15s and chimes / notifies on new requests.
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { fetchQuickSupportQueue } from "@/api/quickSupport";
import { alertNewRequests } from "@/composables/quickSupportAlerts";

const POLL_MS = 15000;

export default {
  name: "QuickSupportButton",
  setup() {
    const router = useRouter();
    const visible = ref(false);
    const waiting = ref(0);
    let timer = null;
    let stopped = false;

    async function poll() {
      try {
        const data = await fetchQuickSupportQueue();
        visible.value = true;
        waiting.value = data.waiting;
        alertNewRequests(data.entries, router);
      } catch (e) {
        const status = e.response && e.response.status;
        if (status === 403 || status === 401) {
          visible.value = false;
          stopped = true;
          return;
        }
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    }

    function openQueue() {
      window.open(router.resolve({ name: "QuickSupport" }).href, "qs-queue");
    }

    onMounted(poll);
    onBeforeUnmount(() => {
      stopped = true;
      clearTimeout(timer);
    });
    return { visible, waiting, openQueue };
  },
};
</script>
