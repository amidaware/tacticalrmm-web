<template>
  <div>
    <q-bar class="bg-primary text-white" style="height: 34px">
      <q-icon name="support_agent" />
      <span class="text-weight-medium q-ml-xs">{{ entry ? entry.name : "Quick Support" }}</span>
      <span
        v-if="entry && entry.help_text"
        class="text-caption q-ml-md ellipsis"
        style="max-width: 45vw"
        :title="entry.help_text"
        >"{{ entry.help_text }}"</span
      >
      <q-space />
      <q-btn-toggle
        v-if="state === 'ready'"
        v-model="mode"
        dense
        flat
        no-caps
        size="sm"
        toggle-color="white"
        toggle-text-color="primary"
        :options="[
          { label: 'Desktop', value: 'desktop', icon: 'desktop_windows' },
          { label: 'Terminal', value: 'terminal', icon: 'terminal' },
          { label: 'Files', value: 'files', icon: 'folder' },
        ]"
        @update:model-value="open"
      />
      <q-btn
        dense
        flat
        no-caps
        size="sm"
        icon="list"
        label="Queue"
        class="q-ml-sm"
        :to="{ name: 'QuickSupport', query: { device: node } }"
      />
      <q-btn
        dense
        flat
        no-caps
        size="sm"
        icon="logout"
        label="Release & close"
        title="Done helping: drop your claim so the queue shows this person as free"
        @click="releaseAndClose"
      />
    </q-bar>

    <div v-if="state === 'loading'" class="text-center q-mt-xl">
      <q-spinner size="40px" color="primary" />
      <div class="text-grey-7 q-mt-sm">Connecting...</div>
    </div>
    <q-banner
      v-else-if="state === 'error'"
      rounded
      class="bg-red-1 text-red-10 q-ma-lg"
    >
      <template #avatar><q-icon name="error" color="negative" /></template>
      {{ error }}
      <template #action>
        <q-btn flat label="Try again" @click="open" />
        <q-btn flat label="Back to queue" :to="{ name: 'QuickSupport' }" />
      </template>
    </q-banner>
    <div
      v-show="state === 'ready'"
      class="q-video"
      :style="{ height: `${$q.screen.height - 34}px` }"
    >
      <iframe
        v-if="url"
        :src="url"
        allow="clipboard-read; clipboard-write"
        allowfullscreen
        frameborder="0"
      ></iframe>
    </div>
  </div>
</template>

<script>
// One Quick Support session, embedded in the RMM (MeshCentral chrome hidden, hide=31) exactly like
// Take Control does for RMM agents. Opening it CLAIMS the device for this tech (server side).
import { ref, onMounted } from "vue";
import { useMeta, useQuasar } from "quasar";
import { useRoute } from "vue-router";
import {
  connectQuickSupport,
  releaseQuickSupport,
} from "@/api/quickSupport";

export default {
  name: "QuickSupportSession",
  setup() {
    const $q = useQuasar();
    const route = useRoute();
    const node = route.params.node;
    const mode = ref(
      ["desktop", "terminal", "files"].includes(route.query.mode)
        ? route.query.mode
        : "desktop",
    );
    const state = ref("loading");
    const error = ref("");
    const url = ref("");
    const entry = ref(null);
    useMeta(() => ({
      title: entry.value ? `QS: ${entry.value.name}` : "Quick Support session",
    }));

    async function open() {
      state.value = "loading";
      try {
        const data = await connectQuickSupport(node, mode.value);
        entry.value = data.entry;
        url.value = data.url;
        state.value = "ready";
        if (data.previous_claim && data.previous_claim !== data.entry.claimed_by)
          $q.notify({
            type: "info",
            message: `${data.previous_claim} was helping this person - you are now listed as the tech.`,
          });
      } catch (e) {
        error.value =
          (e.response && e.response.data && e.response.data.detail) ||
          "Could not open this Quick Support session.";
        state.value = "error";
      }
    }

    async function releaseAndClose() {
      try {
        await releaseQuickSupport(node);
      } catch {
        /* closing anyway */
      }
      url.value = "";
      window.close();
      // window.close() is ignored if this tab was not opened by script (e.g. from Teams)
      setTimeout(() => (window.location.href = "/quick-support"), 300);
    }

    onMounted(open);
    return { node, mode, state, error, url, entry, open, releaseAndClose };
  },
};
</script>
