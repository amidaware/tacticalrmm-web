<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    persistent
    @keydown.esc.stop="onDialogHide"
    :maximized="maximized"
  >
    <q-card
      class="q-dialog-plugin"
      :style="maximized ? '' : 'width: 90vw; max-width: 90vw'"
    >
      <q-bar>
        <span class="q-pr-sm">{{ title }}</span>
        <q-btn
          v-if="!script && openAIEnabled"
          size="xs"
          :disable="loading"
          dense
          label="Generate Script"
          color="primary"
          no-caps
          @click="generateScriptOpenAI"
        />
        <q-space />
        <q-btn
          dense
          flat
          icon="minimize"
          @click="maximized = false"
          :disable="!maximized"
        >
          <q-tooltip v-if="maximized" class="bg-white text-primary"
            >Minimize</q-tooltip
          >
        </q-btn>
        <q-btn
          dense
          flat
          icon="crop_square"
          @click="maximized = true"
          :disable="maximized"
        >
          <q-tooltip v-if="!maximized" class="bg-white text-primary"
            >Maximize</q-tooltip
          >
        </q-btn>
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submitForm">
        <q-banner
          v-if="missingShebang"
          dense
          inline-actions
          class="text-black bg-warning"
        >
          <template v-slot:avatar>
            <q-icon
              class="text-center"
              name="warning"
              color="black"
            /> </template
          >Shell/Python scripts on Linux/Mac need a shebang at the top of the
          script e.g. <code>#!/bin/bash</code> or <code>#!/usr/bin/python3</code
          ><br />Add one to get rid of this warning. Ignore if windows.
        </q-banner>
        <div class="row q-pa-sm">
          <q-scroll-area
            :thumb-style="{
              right: '4px',
              borderRadius: '5px',
              width: '5px',
              opacity: 0.75,
            }"
            :bar-style="{
              right: '2px',
              borderRadius: '9px',
              width: '9px',
              opacity: 0.2,
            }"
            class="col-4 q-mb-none q-pb-none"
            :style="{ height: `${maximized ? '82vh' : '64vh'}` }"
          >
            <div class="q-gutter-sm q-pr-sm">
              <q-input
                filled
                dense
                :readonly="readonly"
                v-model="formScript.name"
                label="Name"
                :rules="[(val) => !!val || '*Required']"
                hide-bottom-space
              />
              <q-input
                filled
                dense
                :readonly="readonly"
                v-model="formScript.description"
                label="Description"
              />
              <q-select
                :readonly="readonly"
                options-dense
                filled
                dense
                v-model="formScript.shell"
                :options="shellOptions"
                emit-value
                map-options
                label="Shell Type"
              />
              <tactical-dropdown
                v-model="formScript.supported_platforms"
                :options="agentPlatformOptions"
                label="Supported Platforms (All supported if blank)"
                clearable
                mapOptions
                filled
                multiple
                :readonly="readonly"
              />
              <tactical-dropdown
                filled
                v-model="formScript.category"
                :options="categories"
                use-input
                clearable
                new-value-mode="add-unique"
                filterable
                label="Category"
                :readonly="readonly"
                hide-bottom-space
              />
              <tactical-dropdown
                v-model="formScript.args"
                label="Script Arguments (press Enter after typing each argument)"
                filled
                use-input
                multiple
                hide-dropdown-icon
                input-debounce="0"
                new-value-mode="add"
                :readonly="readonly"
              />
              <tactical-dropdown
                v-model="formScript.env_vars"
                :label="envVarsLabel"
                filled
                use-input
                multiple
                hide-dropdown-icon
                input-debounce="0"
                new-value-mode="add"
                :readonly="readonly"
              />
              <q-input
                type="number"
                filled
                dense
                :readonly="readonly"
                v-model.number="formScript.default_timeout"
                label="Timeout (seconds)"
                :rules="[(val) => val >= 5 || 'Minimum is 5']"
                hide-bottom-space
              />
              <q-checkbox
                v-model="formScript.run_as_user"
                label="Run As User (Windows only)"
              >
                <q-tooltip
                  >Setting this value on the script model will always override
                  any 'Run As User' checkboxes in the UI and force this script
                  to always be run in the context of the logged in user. If no
                  user is logged in, the script will not run and an error will
                  be returned.
                </q-tooltip>
              </q-checkbox>
              <q-input
                label="Syntax"
                type="textarea"
                style="height: 150px; overflow-y: auto; resize: none"
                v-model="formScript.syntax"
                dense
                filled
                :readonly="readonly"
              />
            </div>
          </q-scroll-area>
          <v-ace-editor
            v-model:value="formScript.script_body"
            class="col-8"
            :lang="lang"
            :theme="$q.dark.isActive ? 'tomorrow_night_eighties' : 'tomorrow'"
            :style="{ height: `${maximized ? '82vh' : '64vh'}` }"
            wrap
            :printMargin="false"
            :options="{ fontSize: '14px' }"
          />
        </div>
        <q-card-actions>
          <tactical-dropdown
            style="width: 350px"
            dense
            :loading="agentLoading"
            filled
            v-model="agent"
            :options="agentOptions"
            label="Agent to run test script on"
            mapOptions
            filterable
          >
            <template v-slot:after>
              <q-btn
                size="md"
                color="primary"
                dense
                flat
                label="Test Script"
                :disable="
                  !agent ||
                  !formScript.script_body ||
                  !formScript.default_timeout
                "
                @click="openTestScriptModal"
              />
            </template>
          </tactical-dropdown>
          <q-space />
          <q-btn dense flat label="Cancel" v-close-popup />
          <q-btn
            v-if="!readonly"
            :loading="loading"
            dense
            flat
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
// composable imports
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { saveScript, editScript, downloadScript } from "@/api/scripts";
import { useAgentDropdown, agentPlatformOptions } from "@/composables/agents";
import { generateScript } from "@/api/core";
import { notifySuccess } from "@/utils/notify";

// ui imports
import TestScriptModal from "@/components/scripts/TestScriptModal.vue";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import { VAceEditor } from "vue3-ace-editor";

// imports for ace editor
import "ace-builds/src-noconflict/mode-powershell";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-batchfile";
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import "ace-builds/src-noconflict/theme-tomorrow";

// static data
import { shellOptions } from "@/composables/scripts";
import { envVarsLabel } from "@/constants/constants";

export default {
  name: "ScriptFormModal",
  emits: [...useDialogPluginComponent.emits],
  components: {
    TacticalDropdown,
    VAceEditor,
  },
  props: {
    script: Object,
    categories: !Array,
    readonly: {
      type: Boolean,
      default: false,
    },
    clone: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    // setup quasar plugins
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
    const $q = useQuasar();

    // setup store
    const store = useStore();
    const openAIEnabled = computed(() => store.state.openAIIntegrationEnabled);

    // setup agent dropdown
    const { agent, agentOptions, getAgentOptions } = useAgentDropdown();

    // script form logic
    const script = props.script
      ? ref(Object.assign({}, { ...props.script, script_body: "" }))
      : ref({
          shell: "powershell",
          default_timeout: 90,
          args: [],
          script_body: "",
          run_as_user: false,
          env_vars: [],
        });

    if (props.clone) script.value.name = `(Copy) ${script.value.name}`;
    const maximized = ref(false);
    const loading = ref(false);
    const agentLoading = ref(false);

    const missingShebang = computed(() => {
      if (script.value.shell === "shell" || script.value.shell === "python") {
        return !script.value.script_body.includes("#!");
      } else {
        return false;
      }
    });

    const title = computed(() => {
      if (props.script) {
        return props.readonly
          ? `Viewing ${script.value.name}`
          : props.clone
          ? `Copying ${script.value.name}`
          : `Editing ${script.value.name}`;
      } else {
        return "Adding new script";
      }
    });

    // convert highlighter language to match what ace expects
    const lang = computed(() => {
      if (script.value.shell === "cmd") return "batchfile";
      else if (script.value.shell === "powershell") return "powershell";
      else if (script.value.shell === "python") return "python";
      else if (script.value.shell === "shell") return "sh";
      else return "";
    });

    // get code if editing or cloning script
    if (props.script)
      downloadScript(script.value.id, { with_snippets: props.readonly }).then(
        (r) => {
          script.value.script_body = r.code;
        }
      );

    async function submitForm() {
      loading.value = true;
      let result = "";
      try {
        // edit existing script
        if (props.script && !props.clone) {
          result = await editScript(script.value);

          // add or save cloned script
        } else {
          result = await saveScript(script.value);
        }

        onDialogOK();
        notifySuccess(result);
      } catch (e) {
        console.error(e);
      }

      loading.value = false;
    }

    function openTestScriptModal() {
      $q.dialog({
        component: TestScriptModal,
        componentProps: {
          script: { ...script.value },
          agent: agent.value,
        },
      });
    }

    function generateScriptOpenAI() {
      $q.dialog({
        title: "Ask ChatGPT what you need!",
        prompt: {
          model: `${lang.value} code that `,
          type: "text",
        },
        cancel: true,
        persistent: true,
      }).onOk(async (data) => {
        const completion = await generateScript({
          prompt: data,
        });
        script.value.script_body = completion;
      });
    }

    // component life cycle hooks
    onMounted(async () => {
      agentLoading.value = true;
      await getAgentOptions();
      agentLoading.value = false;
    });

    return {
      // reactive data
      formScript: script.value,
      maximized,
      loading,
      agentOptions,
      agent,
      agentLoading,
      lang,
      missingShebang,

      // non-reactive data
      shellOptions,
      agentPlatformOptions,
      envVarsLabel,

      //computed
      title,
      openAIEnabled,

      //methods
      submitForm,
      openTestScriptModal,
      generateScriptOpenAI,

      // quasar dialog plugin
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
