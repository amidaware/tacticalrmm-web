<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 40vw">
      <q-bar>
        {{ $t("scripts.upload.title") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form id="scriptUploadForm" @submit="submitForm">
        <q-card-section>
          <q-input
            :label="$t('common.name')"
            outlined
            dense
            v-model="script.name"
            :rules="[(val) => !!val || $t('scripts.validation.required')]"
          />
        </q-card-section>

        <q-card-section>
          <q-input
            :label="$t('common.description')"
            outlined
            dense
            v-model="script.description"
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.category"
            :options="categories"
            :label="$t('scripts.shared.category')"
            :hint="$t('scripts.upload.categoryHint')"
            outlined
            filterable
            clearable
            new-value-mode="add-unique"
          />
        </q-card-section>

        <q-card-section>
          <q-file
            :label="$t('scripts.upload.scriptUpload')"
            v-model="file"
            filled
            dense
            counter
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.shell"
            :options="shellOptions"
            :label="$t('common.type')"
            outlined
            mapOptions
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.supported_platforms"
            :options="agentPlatformOptions"
            :label="$t('scripts.shared.supportedPlatforms')"
            clearable
            mapOptions
            filled
            multiple
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.args"
            :label="$t('scripts.upload.scriptArgs')"
            :placeholder="$t('scripts.upload.scriptArgsPlaceholder')"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.env_vars"
            :label="$t('scripts.upload.envVars')"
            :placeholder="$t('scripts.upload.envVarsPlaceholder')"
            filled
            use-input
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add"
          />
        </q-card-section>

        <q-card-section>
          <q-input
            :label="$t('scripts.upload.defaultTimeout')"
            type="number"
            outlined
            dense
            v-model.number="script.default_timeout"
            :rules="[(val) => val >= 5 || $t('scripts.validation.minTimeout')]"
          />
        </q-card-section>

        <q-card-actions>
          <q-space />
          <q-btn dense flat :label="$t('common.cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            :label="$t('common.add')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { saveScript } from "@/api/scripts";
import { agentPlatformOptions } from "@/composables/agents";
import { notifySuccess } from "@/utils/notify";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// static data
import { shellOptions } from "@/composables/scripts";
export default {
  components: { TacticalDropdown },
  name: "ScriptModal",
  emits: [...useDialogPluginComponent.emits],
  props: {
    categories: !Array,
  },
  setup() {
    // setup quasar plugins
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // script upload logic
    const script = ref({});
    const file = ref(null);
    const loading = ref(false);

    watch(file, (newValue) => {
      if (newValue) {
        // base64 encode the script and delete file
        const reader = new FileReader();
        reader.onloadend = () => {
          script.value.script_body = reader.result;
        };

        reader.readAsText(file.value);
      } else {
        script.value.script_body = "";
      }
    });

    async function submitForm() {
      loading.value = true;
      let result = "";
      try {
        result = await saveScript(script.value);
        onDialogOK();
        notifySuccess(result);
      } catch (e) {
        console.error(e);
      }

      loading.value = false;
    }

    return {
      // reactive data
      script,
      file,
      loading,

      // non-reactive data
      shellOptions,
      agentPlatformOptions,

      // methods
      submitForm,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
