<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="min-width: 50vw">
      <q-bar>
        {{ modalTitle }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="submit">
        <q-card-section>
          <p>Choose Target</p>
          <q-option-group
            v-model="state.target"
            :options="targetOptions"
            color="primary"
            dense
            inline
            class="q-pl-sm"
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-if="state.target === 'client'"
            :rules="[(val) => !!val || '*Required']"
            v-model="state.client"
            :options="clientOptions"
            label="Select Client"
            outlined
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-else-if="state.target === 'site'"
            :rules="[(val) => !!val || '*Required']"
            v-model="state.site"
            :options="siteOptions"
            label="Select Site"
            outlined
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-else-if="state.target === 'agents'"
            :rules="[(val) => !!val || '*Required']"
            v-model="state.agents"
            :options="agentOptions"
            label="Select Agents"
            filled
            multiple
            mapOptions
            filterable
          />
        </q-card-section>

        <q-card-section>
          <p>Agent OS</p>
          <q-option-group
            v-model="state.osType"
            :options="filteredOsTypeOptions"
            color="primary"
            dense
            inline
            class="q-pl-sm"
          />
        </q-card-section>

        <q-card-section v-show="state.target !== 'agents'">
          <p>Agent Type</p>
          <q-option-group
            v-model="state.monType"
            :options="monTypeOptions"
            color="primary"
            dense
            inline
            class="q-pl-sm"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'script'" class="q-pt-none">
          <tactical-dropdown
            :rules="[(val) => !!val || '*Required']"
            v-model="state.script"
            :options="filterByPlatformOptions"
            label="Select Script"
            outlined
            mapOptions
            filterable
          >
            <template v-slot:after>
              <q-btn
                size="sm"
                round
                dense
                flat
                icon="info"
                @click="openScriptURL"
              >
                <q-tooltip
                  v-if="syntax"
                  class="bg-white text-primary text-body1"
                  >{{ syntax }}</q-tooltip
                >
              </q-btn>
            </template>
          </tactical-dropdown>
        </q-card-section>
        <q-card-section v-if="mode === 'script'" class="q-pt-none">
          <tactical-dropdown
            v-model="state.args"
            label="Script Arguments (press Enter after typing each argument)"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>
        <q-card-section v-if="mode === 'script'" class="q-pt-none">
          <tactical-dropdown
            v-model="state.env_vars"
            :label="envVarsLabel"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'command'">
          <p>Shell</p>
          <q-option-group
            v-model="state.shell"
            :options="shellOptions"
            color="primary"
            dense
            inline
            class="q-pl-sm"
            @update:model-value="state.custom_shell = null"
          />
        </q-card-section>
        <q-card-section v-if="state.shell === 'custom'">
          <q-input
            v-model="state.custom_shell"
            outlined
            label="Custom shell"
            stack-label
            placeholder="/usr/bin/python3"
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>
        <q-card-section v-if="mode === 'command'">
          <q-input
            v-model="state.cmd"
            outlined
            label="Command"
            stack-label
            :placeholder="cmdPlaceholder(state.shell)"
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>
        <q-card-section v-if="supportsRunAsUser()" class="q-pt-none">
          <q-checkbox v-model="state.run_as_user" label="Run As User">
            <q-tooltip>{{ runAsUserToolTip }}</q-tooltip>
          </q-checkbox>
        </q-card-section>

        <q-card-section v-if="mode === 'script'" class="q-pt-none">
          <div class="q-gutter-sm">
            <q-checkbox
              label="Save results to Custom Field"
              v-model="collector"
              @update:model-value="
                state.custom_field = null;
                state.collector_all_output = false;
              "
            />
            <q-checkbox
              v-model="state.save_to_agent_note"
              label="Save results to Agent Note"
            />
          </div>
        </q-card-section>

        <q-card-section v-if="mode === 'script' && collector">
          <tactical-dropdown
            :rules="[(val) => !!val || '*Required']"
            outlined
            v-model="state.custom_field"
            :options="customFieldOptions"
            label="Select custom field"
            mapOptions
            filterable
          />
          <q-checkbox
            v-model="state.collector_all_output"
            label="Save all output"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'script' || mode === 'command'">
          <q-input
            v-model.number="state.timeout"
            dense
            outlined
            type="number"
            style="max-width: 150px"
            label="Timeout (seconds)"
            stack-label
            :rules="[
              (val) => !!val || '*Required',
              (val) => val >= 5 || 'Minimum is 5 seconds',
            ]"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'patch'">
          <p>Action</p>
          <q-option-group
            v-model="state.patchMode"
            :options="patchModeOptions"
            color="primary"
            dense
            inline
            class="q-pl-sm"
          />
        </q-card-section>

        <q-card-section v-show="false">
          <q-checkbox
            v-model="state.offlineAgents"
            label="Offline Agents (Run on next checkin)"
          >
            <q-tooltip
              >If the agent is offline, a pending action will be created to run
              on agent checkin</q-tooltip
            >
          </q-checkbox>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn label="Cancel" v-close-popup />
          <q-btn
            label="Run"
            color="primary"
            type="submit"
            :disable="loading"
            :loading="loading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  defineComponent,
} from "vue";
import { useDialogPluginComponent, openURL } from "quasar";
import { useScriptDropdown } from "@/composables/scripts";
import { useAgentDropdown } from "@/composables/agents";
import { useClientDropdown, useSiteDropdown } from "@/composables/clients";
import { useCustomFieldDropdown } from "@/composables/core";
import { runBulkAction } from "@/api/agents";
import { notifySuccess } from "@/utils/notify";
import { cmdPlaceholder } from "@/composables/agents";
import { envVarsLabel, runAsUserToolTip } from "@/constants/constants";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// static data
const monTypeOptions = [
  { label: "All", value: "all" },
  { label: "Servers", value: "servers" },
  { label: "Workstations", value: "workstations" },
];

const osTypeOptions = [
  { label: "Windows", value: "windows" },
  { label: "Linux", value: "linux" },
  { label: "macOS", value: "darwin" },
  { label: "All", value: "all" },
];

const targetOptions = [
  { label: "Client", value: "client" },
  { label: "Site", value: "site" },
  { label: "Selected Agents", value: "agents" },
  { label: "All", value: "all" },
];

const patchModeOptions = [
  { label: "Scan", value: "scan" },
  { label: "Install", value: "install" },
];

export default defineComponent({
  name: "BulkAction",
  components: { TacticalDropdown },
  emits: [...useDialogPluginComponent.emits],
  props: {
    mode: !String,
  },
  setup(props) {
    const shellOptions = computed(() => {
      if (state.osType === "windows") {
        return [
          { label: "CMD", value: "cmd" },
          { label: "Powershell", value: "powershell" },
        ];
      } else {
        return [
          { label: "Bash", value: "/bin/bash" },
          { label: "Custom", value: "custom" },
        ];
      }
    });

    const filteredOsTypeOptions = computed(() => {
      if (props.mode === "command")
        return osTypeOptions.filter((i) => i.value !== "all");
      else if (props.mode === "patch")
        return osTypeOptions.filter((i) => i.value === "windows");
      return osTypeOptions;
    });

    // quasar dialog setup
    const { dialogRef, onDialogHide } = useDialogPluginComponent();

    // dropdown setup
    const {
      script,
      plat,
      filterByPlatformOptions,
      defaultTimeout,
      defaultArgs,
      defaultEnvVars,
      syntax,
      link,
      getScriptOptions,
    } = useScriptDropdown();
    const { agents, agentOptions, getAgentOptions } = useAgentDropdown();
    const { site, siteOptions, getSiteOptions } = useSiteDropdown();
    const { client, clientOptions, getClientOptions } = useClientDropdown();
    const { customFieldOptions } = useCustomFieldDropdown({ onMount: true });

    function openScriptURL() {
      link.value ? openURL(link.value) : null;
    }

    // bulk action logic
    const state = reactive({
      mode: props.mode,
      target: "client",
      monType: "all",
      osType: "windows",
      cmd: "",
      shell: "cmd",
      custom_shell: null,
      custom_field: null,
      collector_all_output: false,
      save_to_agent_note: false,
      patchMode: "scan",
      offlineAgents: false,
      client,
      site,
      agents,
      script,
      timeout: defaultTimeout,
      args: defaultArgs,
      env_vars: defaultEnvVars,
      run_as_user: false,
    });
    const loading = ref(false);
    const collector = ref(false);

    watch(
      () => state.target,
      () => {
        client.value = null;
        site.value = null;
        agents.value = [];
      },
    );

    plat.value = state.osType;

    watch(
      () => state.osType,
      (newValue) => {
        state.custom_shell = null;
        state.run_as_user = false;

        if (newValue === "windows") {
          state.shell = "cmd";
        } else {
          state.shell = "/bin/bash";
        }

        // set plat to filter script options
        if (newValue === "all") plat.value = undefined;
        else plat.value = newValue;
      },
    );

    async function submit() {
      loading.value = true;

      try {
        const data = await runBulkAction(state);
        notifySuccess(data);
        onDialogHide();
      } catch (e) {}

      loading.value = false;
    }

    const supportsRunAsUser = () => {
      const modes = ["script", "command"];
      return state.osType === "windows" && modes.includes(state.mode);
    };

    // set modal title and caption
    const modalTitle = computed(() => {
      return props.mode === "command"
        ? "Run Bulk Command"
        : props.mode === "script"
          ? "Run Bulk Script"
          : props.mode === "patch"
            ? "Bulk Patch Management"
            : "";
    });

    // component lifecycle hooks
    onMounted(() => {
      getAgentOptions();
      getSiteOptions();
      getClientOptions();
      if (props.mode === "script") getScriptOptions();
    });

    return {
      // reactive data
      state,
      agentOptions,
      clientOptions,
      collector,
      customFieldOptions,
      siteOptions,
      filterByPlatformOptions,
      loading,
      shellOptions,
      filteredOsTypeOptions,

      // non-reactive data
      monTypeOptions,
      osTypeOptions,
      targetOptions,
      patchModeOptions,
      runAsUserToolTip,
      envVarsLabel,
      syntax,

      //computed
      modalTitle,

      //methods
      submit,
      cmdPlaceholder,
      supportsRunAsUser,
      openScriptURL,

      // quasar dialog plugin
      dialogRef,
      onDialogHide,
    };
  },
});
</script>
