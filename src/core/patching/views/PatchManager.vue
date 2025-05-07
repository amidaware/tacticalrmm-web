<template>
  <q-page padding>
    <div class="text-h6">Patch Manager</div>
    <div class="row q-pb-sm">
      <q-tabs align="left" dense inline-label>
        <q-route-tab
          label="Overview"
          :to="{ name: 'patching-overview', query: $route.query }"
        />
        <q-route-tab
          label="Agents"
          :to="{ name: 'patching-devices', query: $route.query }"
        />
        <q-route-tab
          label="Patches"
          :to="{ name: 'patching-patches', query: $route.query }"
        />
        <q-route-tab
          label="Patch Policies"
          :to="{ name: 'patching-policies' }"
        />
      </q-tabs>
      <q-space />

      <div class="row q-gutter-sm">
        <tactical-dropdown
          filled
          v-model="patchPolicy"
          :options="patchPolicyOptions"
          label="Patch Policy"
          emit-value
          map-options
          style="width: 300px"
          dense
          options-dense
          filterable
          clearable
        />

        <tactical-dropdown
          filled
          v-model="clients"
          :options="clientOptions"
          label="Clients"
          multiple
          emit-value
          map-options
          style="width: 300px"
          dense
          options-dense
          filterable
        />

        <tactical-dropdown
          filled
          v-model="sites"
          :options="siteOptions"
          label="Sites"
          multiple
          emit-value
          map-options
          style="width: 300px"
          dense
          options-dense
          filterable
        />
      </div>
    </div>

    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </q-page>
</template>

<script lang="ts" setup>
// composable imports
import { ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useClientDropdown, useSiteDropdown } from "@/core/clients/composables";
import { usePatchPolicyDropdown } from "../composables";

// ui imports
import TacticalDropdown from "@/core/dashboard/ui/components/TacticalDropdown.vue";

const { clientOptions } = useClientDropdown();
const { siteOptions } = useSiteDropdown();
const { patchPolicyOptions } = usePatchPolicyDropdown();

const patchPolicy = ref<number>();
const sites = ref<number[]>([]);
const clients = ref<number[]>([]);

// set/watch query params
const route = useRoute();
const router = useRouter();

// Watch the filter values and update URL query parameters accordingly
watch([patchPolicy, clients, sites], ([newPatchPolicy, newClient, newSite]) => {
  const newQuery = { ...route.query };

  // For patchPolicy, if a value is selected, update; otherwise, remove it.
  if (newPatchPolicy) {
    newQuery.patchPolicy = newPatchPolicy.toString();
  } else {
    delete newQuery.patchPolicy;
  }

  // For client: only include if there's at least one selected option.
  if (newClient && newClient.length > 0) {
    newQuery.clients = newClient.map((c) => c.toString());
  } else {
    delete newQuery.clients;
  }

  // For site: only include if there's at least one selected option.
  if (newSite && newSite.length > 0) {
    newQuery.sites = newSite.map((s) => s.toString());
  } else {
    delete newQuery.sites;
  }

  router.push({ query: newQuery });
});

onMounted(() => {
  interface FilterQuery {
    patchPolicy?: number;
    clients?: number | number[];
    sites?: number | number[];
  }

  const query = route.query as FilterQuery;

  // Initialize the patchPolicy (single value)
  patchPolicy.value = Number(query.patchPolicy) || undefined;

  // Normalize client to an array
  clients.value = query.clients
    ? Array.isArray(query.clients)
      ? query.clients.map((c) => Number(c))
      : [Number(query.clients)]
    : [];

  // Normalize site to an array
  sites.value = query.sites
    ? Array.isArray(query.sites)
      ? query.sites.map((s) => Number(s))
      : [Number(query.sites)]
    : [];
});
</script>
