<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        Patch Policy Exclusions
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-card-section>
        <tactical-dropdown
          v-model="formData.excluded_clients"
          :options="clientOptions"
          label="Excluded Clients"
          outlined
          clearable
          mapOptions
          filterable
          dense
          options-dense
          multiple
        />
      </q-card-section>
      <q-card-section>
        <tactical-dropdown
          v-model="formData.excluded_sites"
          :options="siteOptions"
          label="Excluded Sites"
          outlined
          clearable
          mapOptions
          filterable
          dense
          options-dense
          multiple
        />
      </q-card-section>
      <q-card-section>
        <tactical-dropdown
          v-model="formData.excluded_agents"
          :options="agentOptions"
          label="Excluded Agents"
          outlined
          clearable
          mapOptions
          filterable
          dense
          options-dense
          multiple
        />
      </q-card-section>

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

// ui imports
import TacticalDropdown from "@/core/dashboard/ui/components/TacticalDropdown.vue";

// typ
import { type PatchPolicy } from "../types";

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

defineEmits([...useDialogPluginComponent.emits]);

const props = defineProps<{
  patchPolicy: PatchPolicy;
}>();
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

watch(formData, () => {
  changed.value = true;
});

const loading = ref(false);

function submit() {
  if (!changed.value) {
    onDialogHide();
  }

  loading.value = true;

  editPatchPolicy(props.patchPolicy.id, formData);

  // TODO: Add Error Handling
  onDialogOK();
}
</script>
