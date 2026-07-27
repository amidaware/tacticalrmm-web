<template>
  <q-page class="agent-page-scroll">
    <SummaryTab />
    <q-separator />
    <SubTableTabs
      :style="{ height: `${tabHeight + 38}px` }"
      :activeTabs="[
        'checks',
        'tasks',
        'patches',
        'software',
        'history',
        'aihistory',
        'aitasks',
        'notes',
        'assets',
        'audit',
      ]"
    />
  </q-page>
</template>

<script>
// composition imports
import { defineComponent, ref, watch } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import { useQuasar } from "quasar";

// ui imports
import SummaryTab from "@/components/agents/SummaryTab.vue";
import SubTableTabs from "@/components/SubTableTabs.vue";

export default defineComponent({
  name: "AgentView",
  components: {
    SummaryTab,
    SubTableTabs,
  },
  provide() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      refreshDashboard: () => {}, // noop
    };
  },
  setup() {
    const store = useStore();
    const route = useRoute();
    const $q = useQuasar();

    const tabHeight = ref($q.screen.height - 309 - 50 - 36);

    store.commit("setActiveRow", route.params.agent_id);
    store.state.tabHeight = `${tabHeight.value}px`;

    // watch for route change
    watch(
      () => route.params.agent_id,
      () => {
        store.commit("setActiveRow", route.params.agent_id);
      }
    );

    return {
      tabHeight,
    };
  },
});
</script>

<style scoped>
/* The app disables body scrolling (App.vue: body overflow-y hidden), so on
   info-heavy agents the summary + tabs can overflow the viewport with no way to
   scroll. Make the agent page its own scroll region (viewport minus the 50px
   header) so everything is reachable. */
.agent-page-scroll {
  height: calc(100vh - 50px) !important;
  min-height: 0 !important;
  overflow-y: auto;
}
</style>
