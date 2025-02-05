<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        Patch Policy Exclusions
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-tabs v-model="tab" dense>
        <q-tab name="clients" label="Clients" />
        <q-tab name="sites" label="Sites" />
        <q-tab name="agents" label="Agents" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="clients">
          <q-card-section>
            <tactical-dropdown
              v-model="formData.excluded_clients"
              :options="clientOptions"
              label="Excluded Clients"
              filled
              clearable
              mapOptions
              filterable
              dense
              multiple
              @clear="formData.excluded_clients = []"
              :display-value="
                formData.excluded_clients.length > 0
                  ? `${formData.excluded_clients.length} Selected`
                  : ''
              "
              :emit-value="false"
              :use-chips="false"
              class="q-mb-md"
            />
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(client, index) in formData.excluded_clients"
                  :key="index"
                  dense
                >
                  <q-item-section>{{
                    getClientOption(client)?.label
                  }}</q-item-section>
                  <q-item-section side>
                    <q-btn
                      dense
                      flat
                      icon="close"
                      @click="removeItem('client', index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>

        <!-- sites tab -->
        <q-tab-panel name="sites">
          <q-card-section>
            <tactical-dropdown
              v-model="formData.excluded_sites"
              :options="siteOptions"
              label="Excluded Sites"
              filled
              clearable
              mapOptions
              filterable
              dense
              multiple
              @clear="formData.excluded_sites = []"
              :display-value="
                formData.excluded_sites.length > 0
                  ? `${formData.excluded_sites.length} Selected`
                  : ''
              "
              :use-chips="false"
              class="q-mb-md"
            />
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(site, index) in formData.excluded_sites"
                  :key="index"
                  dense
                >
                  <q-item-section>
                    <q-item-label caption>{{
                      getSiteOption(site)?.cat
                    }}</q-item-label>
                    <q-item-label>
                      {{ getSiteOption(site)?.label }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      dense
                      flat
                      icon="close"
                      @click="removeItem('site', index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>

        <!-- agents tab -->
        <q-tab-panel name="agents">
          <q-card-section>
            <tactical-dropdown
              v-model="formData.excluded_agents"
              :options="agentOptions"
              label="Excluded Agents"
              filled
              clearable
              mapOptions
              filterable
              dense
              multiple
              @clear="formData.excluded_agents = []"
              :display-value="
                formData.excluded_agents.length > 0
                  ? `${formData.excluded_agents.length} Selected`
                  : ''
              "
              :use-chips="false"
              class="q-mb-md"
            />
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(agent, index) in formData.excluded_agents"
                  :key="index"
                  dense
                >
                  <q-item-section>
                    <q-item-label caption>{{
                      getAgentOption(agent)?.cat
                    }}</q-item-label>
                    <q-item-label>{{
                      getAgentOption(agent)?.label
                    }}</q-item-label>
                  </q-item-section>

                  <q-item-section side>
                    <q-btn
                      dense
                      flat
                      icon="close"
                      @click="removeItem('agent', index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>
      </q-tab-panels>

      <q-card-actions align="right">
        <q-btn dense flat label="Cancel" v-close-popup />
        <q-btn
          :loading="loading"
          :disable="!changed"
          dense
          flat
          label="Save"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useClientDropdown, useSiteDropdown } from "@/core/clients/composables";
import { useAgentDropdown } from "@/core/agents/composables";
import { usePatchPolicyShared } from "../api";

// ui
import TacticalDropdown from "@/core/dashboard/ui/components/TacticalDropdown.vue";

// types
import { isLabeledOption } from "@/core/dashboard/types";
import { type PatchPolicy } from "../types";

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

defineEmits([...useDialogPluginComponent.emits]);

const props = defineProps<{ patchPolicy: PatchPolicy }>();

const { clientOptions } = useClientDropdown();
const { siteOptions } = useSiteDropdown();
const { agentOptions } = useAgentDropdown();
const { editPatchPolicy } = usePatchPolicyShared;

const formData = reactive({
  excluded_clients: props.patchPolicy.excluded_clients || [],
  excluded_sites: props.patchPolicy.excluded_sites || [],
  excluded_agents: props.patchPolicy.excluded_agents || [],
});

const changed = ref(false);
const tab = ref("clients");
const loading = ref(false);

watch(formData, () => {
  changed.value = true;
});

function removeItem(type: string, index: number) {
  if (type === "client") formData.excluded_clients.splice(index, 1);
  else if (type === "site") formData.excluded_sites.splice(index, 1);
  else if (type === "agent") formData.excluded_agents.splice(index, 1);
}

function getClientOption(id: number) {
  return clientOptions.value.find((item) => item.value === id);
}

function getSiteOption(id: number) {
  const option = siteOptions.value.find(
    (item) => isLabeledOption(item) && item.value === id,
  );

  return option && isLabeledOption(option) ? option : undefined;
}

function getAgentOption(id: number) {
  const option = agentOptions.value.find(
    (item) => isLabeledOption(item) && item.value === id,
  );

  return option && isLabeledOption(option) ? option : undefined;
}

function submit() {
  if (!changed.value) {
    onDialogHide();
  }

  loading.value = true;
  editPatchPolicy(props.patchPolicy.id, formData);
  // TODO: Error handling

  onDialogOK();
}
</script>
