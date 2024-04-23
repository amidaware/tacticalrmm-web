<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 70vw">
      <q-bar>
        Testing {{ urlAction.name }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section>
        <q-option-group
          v-model="runAgainst"
          :options="runAgainstOptions"
          inline
          dense
        />
      </q-card-section>

      <q-card-section v-if="runAgainst === 'agent'">
        <tactical-dropdown
          v-model="agent"
          :options="agentOptions"
          label="Agents"
          mapOptions
          filterable
          dense
          filled
        />
      </q-card-section>

      <q-card-section v-else-if="runAgainst === 'site'">
        <tactical-dropdown
          v-model="site"
          :options="siteOptions"
          label="Sites"
          mapOptions
          filterable
          dense
          filled
        />
      </q-card-section>

      <q-card-section v-else-if="runAgainst === 'client'">
        <tactical-dropdown
          v-model="client"
          :options="clientOptions"
          label="Client"
          mapOptions
          filterable
          dense
          filled
        />
      </q-card-section>

      <q-card-section style="height: 40vh" class="scroll">
        <div>
          URL:
          <code>{{ return_url }}</code>
        </div>
        <br />
        <div>
          Response
          <q-separator />
          <pre>{{ return_result }}</pre>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" v-close-popup />
        <q-btn flat label="Run" color="primary" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, reactive, computed } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useAgentDropdown } from "@/composables/agents";
import { useSiteDropdown, useClientDropdown } from "@/composables/clients";
import { runTestURLAction } from "@/api/core";
import { URLAction } from "@/types/core/urlactions";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// define emits
defineEmits([...useDialogPluginComponent.emits]);

// define props
const props = defineProps<{ urlAction: URLAction }>();

// setup quasar
const { dialogRef, onDialogHide } = useDialogPluginComponent();

// setup dropdowns
const { agent, agentOptions } = useAgentDropdown({ onMount: true });
const { client, clientOptions } = useClientDropdown(true);
const { site, siteOptions } = useSiteDropdown(true);

const runAgainst = ref<"agent" | "site" | "client" | "none">("client");

const runAgainstOptions = [
  { label: "Agent", value: "agent" },
  { label: "Site", value: "site" },
  { label: "Client", value: "client" },
  { label: "None", value: "none" },
];
const loading = ref(false);

const runAgainstID = computed(() => {
  if (runAgainst.value === "agent") return agent.value;
  else if (runAgainst.value === "site") return site.value;
  else if (runAgainst.value === "client") return client.value;
  else return 0;
});
const state = reactive({
  pattern: props.urlAction.pattern,
  rest_body: props.urlAction.rest_body,
  rest_headers: props.urlAction.rest_headers,
  rest_method: props.urlAction.rest_method,
  run_instance_type: runAgainst.value,
  run_instance_id: runAgainstID.value,
});

const return_url = ref();
const return_result = ref();

async function submit() {
  loading.value = true;

  try {
    const { url, result } = await runTestURLAction(state);

    return_result.value = result;
    return_url.value = url;

    console.log(result);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>
