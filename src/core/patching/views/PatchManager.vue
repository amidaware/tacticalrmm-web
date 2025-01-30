<template>
  <q-page padding>
    <div class="text-h6">Patch Manager</div>
    <div class="row q-pb-sm">
      <q-tabs align="left" dense inline-label>
        <q-route-tab label="Overview" :to="{ name: 'patching-overview' }" />
        <q-route-tab label="Agents" :to="{ name: 'patching-devices' }" />
        <q-route-tab label="Patches" :to="{ name: 'patching-patches' }" />
        <q-route-tab
          label="Patch Policies"
          :to="{ name: 'patching-policies' }"
        />
      </q-tabs>
      <q-space />

      <div class="row q-gutter-sm">
        <tactical-dropdown
          filled
          v-model="client"
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
          v-model="site"
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
import { useClientDropdown, useSiteDropdown } from "@/core/clients/composables";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

const { client, clientOptions } = useClientDropdown();
const { site, siteOptions } = useSiteDropdown();
</script>
