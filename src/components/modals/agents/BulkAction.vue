<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="min-width: 50vw">
      <q-bar>
        {{ modalTitle }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="submit">
        <q-card-section>
          <p>{{ $t("agents.bulkAction.chooseTarget") }}</p>
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
            :rules="[(val) => !!val || $t('agents.shared.required')]"
            v-model="state.client"
            :options="clientOptions"
            :label="$t('agents.bulkAction.selectClient')"
            outlined
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-else-if="state.target === 'site'"
            :rules="[(val) => !!val || $t('agents.shared.required')]"
            v-model="state.site"
            :options="siteOptions"
            :label="$t('agents.bulkAction.selectSite')"
            outlined
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-else-if="state.target === 'agents'"
            :rules="[(val) => !!val || $t('agents.shared.required')]"
            v-model="state.agents"
            :options="agentOptions"
            :label="$t('agents.bulkAction.selectAgents')"
            filled
            multiple
            mapOptions
            filterable
          />
        </q-card-section>

        <q-card-section>
          <p>{{ $t("agents.bulkAction.agentOs") }}</p>
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
          <p>{{ $t("agents.bulkAction.agentType") }}</p>
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
            :rules="[(val) => !!val || $t('agents.shared.required')]"
            v-model="state.script"
            :options="filterByPlatformOptions"
            :label="$t('agents.bulkAction.selectScript')"
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
            :label="$t('agents.bulkAction.scriptArguments')"
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
            :label="$t('agents.bulkAction.environmentVars')"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'command'">
          <p>{{ $t("agents.bulkAction.shell") }}</p>
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
            :label="$t('agents.bulkAction.customShell')"
            stack-label
            placeholder="/usr/bin/python3"
            :rules="[(val) => !!val || $t('agents.shared.required')]"
          />
        </q-card-section>
        <q-card-section v-if="mode === 'command'">
          <q-input
            v-model="state.cmd"
            outlined
            :label="$t('agents.bulkAction.command')"
            stack-label
            :placeholder="cmdPlaceholder(state.shell)"
            :rules="[(val) => !!val || $t('agents.shared.required')]"
          />
        </q-card-section>
        <q-card-section v-if="supportsRunAsUser()" class="q-pt-none">
          <q-checkbox
            v-model="state.run_as_user"
            :label="$t('agents.bulkAction.runAsUser')"
          >
            <q-tooltip>{{
              $t("agents.bulkAction.runAsUserTooltip")
            }}</q-tooltip>
          </q-checkbox>
        </q-card-section>

        <q-card-section v-if="mode === 'script'" class="q-pt-none">
          <div class="q-gutter-sm">
            <q-checkbox
              :label="$t('agents.bulkAction.saveResultsToCustomField')"
              v-model="collector"
              @update:model-value="
                state.custom_field = null;
                state.collector_all_output = false;
              "
            />
            <q-checkbox
              v-model="state.save_to_agent_note"
              :label="$t('agents.bulkAction.saveResultsToAgentNote')"
            />
          </div>
        </q-card-section>

        <q-card-section v-if="mode === 'script' && collector">
          <tactical-dropdown
            :rules="[(val) => !!val || $t('agents.shared.required')]"
            outlined
            v-model="state.custom_field"
            :options="customFieldOptions"
            :label="$t('agents.bulkAction.selectCustomField')"
            mapOptions
            filterable
          />
          <q-checkbox
            v-model="state.collector_all_output"
            :label="$t('agents.bulkAction.saveAllOutput')"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'script' || mode === 'command'">
          <q-input
            v-model.number="state.timeout"
            dense
            outlined
            type="number"
            style="max-width: 150px"
            :label="$t('agents.bulkAction.timeoutSeconds')"
            stack-label
            :rules="[
              (val) => !!val || $t('agents.shared.required'),
              (val) =>
                val >= 5 || $t('agents.bulkAction.minimumSeconds', { min: 5 }),
            ]"
          />
        </q-card-section>

        <q-card-section v-if="mode === 'patch'">
          <p>{{ $t("agents.bulkAction.action") }}</p>
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
            :label="$t('agents.bulkAction.offlineAgentsNextCheckin')"
          >
            <q-tooltip>{{
              $t("agents.bulkAction.offlineAgentsHint")
            }}</q-tooltip>
          </q-checkbox>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn :label="$t('common.buttons.cancel')" v-close-popup />
          <q-btn
            :label="$t('agents.bulkAction.run')"
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
import { useI18n } from "vue-i18n";
import { useScriptDropdown } from "@/composables/scripts";
import { useAgentDropdown } from "@/composables/agents";
import { useClientDropdown, useSiteDropdown } from "@/composables/clients";
import { useCustomFieldDropdown } from "@/composables/core";
import { runBulkAction } from "@/api/agents";
import { notifySuccess } from "@/utils/notify";
import { cmdPlaceholder } from "@/composables/agents";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default defineComponent({
  name: "BulkAction",
  components: { TacticalDropdown },
  emits: [...useDialogPluginComponent.emits],
  props: {
    mode: !String,
  },
  setup(props) {
    const { t } = useI18n();

    const monTypeOptions = computed(() => [
      { label: t("agents.bulkAction.options.all"), value: "all" },
      { label: t("agents.bulkAction.options.servers"), value: "servers" },
      {
        label: t("agents.bulkAction.options.workstations"),
        value: "workstations",
      },
    ]);

    const osTypeOptions = computed(() => [
      { label: t("agents.bulkAction.options.windows"), value: "windows" },
      { label: t("agents.bulkAction.options.linux"), value: "linux" },
      { label: t("agents.bulkAction.options.macos"), value: "darwin" },
      { label: t("agents.bulkAction.options.all"), value: "all" },
    ]);

    const targetOptions = computed(() => [
      { label: t("agents.bulkAction.options.client"), value: "client" },
      { label: t("agents.bulkAction.options.site"), value: "site" },
      { label: t("agents.bulkAction.options.selectedAgents"), value: "agents" },
      { label: t("agents.bulkAction.options.all"), value: "all" },
    ]);

    const patchModeOptions = computed(() => [
      { label: t("agents.bulkAction.options.scan"), value: "scan" },
      { label: t("agents.bulkAction.options.install"), value: "install" },
    ]);

    const shellOptions = computed(() => {
      if (state.osType === "windows") {
        return [
          { label: t("agents.bulkAction.options.cmd"), value: "cmd" },
          {
            label: t("agents.bulkAction.options.powershell"),
            value: "powershell",
          },
        ];
      } else {
        return [
          { label: t("agents.bulkAction.options.bash"), value: "/bin/bash" },
          { label: t("agents.bulkAction.options.custom"), value: "custom" },
        ];
      }
    });

    const filteredOsTypeOptions = computed(() => {
      if (props.mode === "command")
        return osTypeOptions.value.filter((i) => i.value !== "all");
      else if (props.mode === "patch")
        return osTypeOptions.value.filter((i) => i.value === "windows");
      return osTypeOptions.value;
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
        ? t("agents.bulkAction.titles.runBulkCommand")
        : props.mode === "script"
          ? t("agents.bulkAction.titles.runBulkScript")
          : props.mode === "patch"
            ? t("agents.bulkAction.titles.bulkPatchManagement")
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
