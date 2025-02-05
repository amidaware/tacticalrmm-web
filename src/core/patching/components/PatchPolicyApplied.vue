<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        Patch Policy Applied View
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-tabs v-model="tab" dense>
        <q-tab name="clients" label="Applied Clients" />
        <q-tab name="sites" label="Applied Sites" />
        <q-tab name="agents" label="Applied Agents" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="clients">
          <q-card-section>
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(client, index) in appliedClients"
                  :key="index"
                  dense
                >
                  <q-item-section>{{ client.name }}</q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>

        <q-tab-panel name="sites">
          <q-card-section>
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(site, index) in appliedSites"
                  :key="index"
                  dense
                >
                  <q-item-section>
                    <q-item-label caption>{{ site.client_name }}</q-item-label>
                    <q-item-label>{{ site.name }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>

        <q-tab-panel name="agents">
          <q-card-section>
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(agent, index) in appliedAgents"
                  :key="index"
                  dense
                >
                  <q-item-section>
                    <q-item-label caption>{{
                      `${agent.client_name} > ${agent.site_name}`
                    }}</q-item-label>
                    <q-item-label>{{ agent.hostname }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useClientShared, useSiteShared } from "@/core/clients/api";
import { useAgentShared } from "@/core/agents/api";

//types
import type { PatchPolicy } from "../types";

const { dialogRef, onDialogHide } = useDialogPluginComponent();

defineEmits([...useDialogPluginComponent.emits]);

const { agents } = useAgentShared;
const { clients } = useClientShared;
const { sites } = useSiteShared;

const appliedClients = computed(() =>
  clients.value.filter((item) =>
    props.patchPolicy.applied_clients?.includes(item.id),
  ),
);
const appliedSites = computed(() =>
  sites.value.filter((item) =>
    props.patchPolicy.applied_sites?.includes(item.id),
  ),
);
const appliedAgents = computed(() =>
  agents.value.filter((item) =>
    props.patchPolicy.applied_agents?.includes(item.id),
  ),
);

const props = defineProps<{ patchPolicy: PatchPolicy }>();

const tab = ref("clients");
</script>
