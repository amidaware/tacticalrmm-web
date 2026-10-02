<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 50vw; max-width: 700px">
      <q-bar>
        {{ device ? `Editing ${device.name}` : "Add Network Device" }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-form @submit="submit">
        <q-card-section class="q-gutter-sm">
          <tactical-dropdown
            v-model="state.site"
            label="Site"
            :options="siteOptions"
            outlined
            mapOptions
            filterable
            :rules="[(val) => !!val || 'Site is required']"
            @update:model-value="onSiteChange"
          />

          <q-input
            v-model="state.name"
            label="Name"
            outlined
            dense
            :rules="[(val) => !!val || 'Name is required']"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-4">
              <tactical-dropdown
                v-model="state.protocol"
                label="Protocol"
                :options="protocolOptions"
                outlined
                mapOptions
                @update:model-value="onProtocolChange"
              />
            </div>
            <div class="col-5">
              <q-input
                v-model="state.ip_address"
                label="IP Address / Host"
                outlined
                dense
                :rules="[(val) => !!val || 'Address is required']"
              />
            </div>
            <div class="col-3">
              <q-input
                v-model.number="state.port"
                label="Port"
                type="number"
                outlined
                dense
                :rules="[(val) => (val > 0 && val < 65536) || 'Invalid port']"
              />
            </div>
          </div>

          <q-input
            v-model="state.description"
            label="Description"
            type="textarea"
            autogrow
            outlined
            dense
          />

          <!-- preferred agents, in order of preference -->
          <div class="text-subtitle2 q-mt-sm">
            Preferred Agents
            <q-icon name="help_outline" size="xs">
              <q-tooltip max-width="320px">
                The connection will use the first ONLINE agent in this list
                (top = highest preference). If none are online, a random online
                agent in the site/client is used (servers first).
              </q-tooltip>
            </q-icon>
          </div>

          <tactical-dropdown
            v-model="agentToAdd"
            label="Add an agent..."
            :options="availableAgentOptions"
            outlined
            mapOptions
            filterable
            :disable="!state.site"
            @update:model-value="addAgent"
          />

          <q-list bordered separator dense v-if="state.preferred_agents.length">
            <q-item
              v-for="(aid, idx) in state.preferred_agents"
              :key="aid"
              dense
            >
              <q-item-section side>
                <q-chip dense square color="primary" text-color="white">
                  {{ idx + 1 }}
                </q-chip>
              </q-item-section>
              <q-item-section>
                {{ agentLabel(aid) }}
              </q-item-section>
              <q-item-section side>
                <div class="row items-center">
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="keyboard_arrow_up"
                    :disable="idx === 0"
                    @click="move(idx, -1)"
                  />
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="keyboard_arrow_down"
                    :disable="idx === state.preferred_agents.length - 1"
                    @click="move(idx, 1)"
                  />
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="close"
                    color="negative"
                    @click="removeAgent(idx)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-grey-6 text-caption q-pl-xs">
            No preferred agents selected (a random online agent will be used).
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn dense flat push label="Cancel" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            push
            label="Save"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, onMounted } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useSiteDropdown } from "@/composables/clients";
import { fetchClients } from "@/api/clients";
import { fetchAgents } from "@/api/agents";
import { saveNetworkDevice, editNetworkDevice } from "@/api/netdevices";
import { notifySuccess } from "@/utils/notify";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

const defaultPorts = { https: 443, http: 80, ssh: 22, telnet: 23 };

export default {
  name: "NetworkDeviceForm",
  emits: [...useDialogPluginComponent.emits],
  components: { TacticalDropdown },
  props: {
    device: Object,
    site: Number,
    client: Number,
  },
  setup(props) {
    const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();
    const { siteOptions } = useSiteDropdown(true);

    const protocolOptions = [
      { label: "HTTPS", value: "https" },
      { label: "HTTP", value: "http" },
      { label: "SSH", value: "ssh" },
      { label: "Telnet", value: "telnet" },
    ];

    const state = props.device
      ? ref({
          site: props.device.site,
          name: props.device.name,
          protocol: props.device.protocol,
          ip_address: props.device.ip_address,
          port: props.device.port,
          description: props.device.description || "",
          preferred_agents: [...(props.device.preferred_agents || [])],
        })
      : ref({
          site: props.site || null,
          name: "",
          protocol: "https",
          ip_address: "",
          port: 443,
          description: "",
          preferred_agents: [],
        });

    const loading = ref(false);
    const agentOptions = ref([]); // [{label, value}]
    const availableAgentOptions = ref([]);
    const agentToAdd = ref(null);

    function recomputeAvailable() {
      availableAgentOptions.value = agentOptions.value.filter(
        (o) => !state.value.preferred_agents.includes(o.value),
      );
    }

    async function loadAgents(siteId) {
      if (!siteId) {
        agentOptions.value = [];
        recomputeAvailable();
        return;
      }
      try {
        const data = await fetchAgents({ site: siteId });
        agentOptions.value = (data || [])
          .map((a) => ({
            label: `${a.hostname} (${a.monitoring_type})`,
            value: a.agent_id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      } catch (e) {
        console.error(e);
        agentOptions.value = [];
      }
      recomputeAvailable();
    }

    function agentLabel(aid) {
      const found = agentOptions.value.find((o) => o.value === aid);
      if (found) return found.label;
      // fall back to info embedded on the device when editing
      const info = (props.device?.preferred_agents_info || []).find(
        (i) => i.agent_id === aid,
      );
      return info ? `${info.hostname} (${info.status})` : aid;
    }

    function onSiteChange(val) {
      state.value.preferred_agents = [];
      loadAgents(val);
    }

    function onProtocolChange(val) {
      const known = Object.values(defaultPorts);
      if (!state.value.port || known.includes(Number(state.value.port))) {
        state.value.port = defaultPorts[val];
      }
    }

    function addAgent(val) {
      if (val && !state.value.preferred_agents.includes(val)) {
        state.value.preferred_agents.push(val);
      }
      agentToAdd.value = null;
      recomputeAvailable();
    }

    function removeAgent(idx) {
      state.value.preferred_agents.splice(idx, 1);
      recomputeAvailable();
    }

    function move(idx, dir) {
      const arr = state.value.preferred_agents;
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    }

    async function submit() {
      loading.value = true;
      try {
        const result = props.device
          ? await editNetworkDevice(props.device.id, state.value)
          : await saveNetworkDevice(state.value);
        notifySuccess(
          props.device ? "Network device edited" : "Network device added",
        );
        onDialogOK(result);
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    async function defaultSiteFromClient() {
      // when adding from a Client scope, default to that client's first site
      try {
        const clients = await fetchClients();
        const c = clients.find((x) => x.id === props.client);
        if (c && c.sites && c.sites.length) {
          state.value.site = c.sites[0].id;
        }
      } catch (e) {
        console.error(e);
      }
    }

    onMounted(async () => {
      if (!props.device && !state.value.site && props.client) {
        await defaultSiteFromClient();
      }
      if (state.value.site) loadAgents(state.value.site);
    });

    return {
      dialogRef,
      onDialogHide,
      state,
      loading,
      siteOptions,
      protocolOptions,
      availableAgentOptions,
      agentToAdd,
      agentLabel,
      onSiteChange,
      onProtocolChange,
      addAgent,
      removeAgent,
      move,
      submit,
    };
  },
};
</script>
