<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 40vw">
      <q-bar>
        {{ $gettext("Add Script") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form id="scriptUploadForm" @submit="submitForm">
        <q-card-section>
          <q-input
            :label="$pgettext('Script configuration', 'Name')"
            outlined
            dense
            v-model="script.name"
            :rules="[(val) => !!val || $gettext('*Required')]"
          />
        </q-card-section>

        <q-card-section>
          <q-input
            :label="$pgettext('Script configuration', 'Description')"
            outlined
            dense
            v-model="script.description"
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.category"
            :options="categories"
            :label="$gettext('Category')"
            :hint="$gettext('Press Enter or Tab when adding a new value')"
            outlined
            filterable
            clearable
            new-value-mode="add-unique"
          />
        </q-card-section>

        <q-card-section>
          <q-file
            :label="$gettext('Script Upload')"
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
            :label="$pgettext('Script upload', 'Type')"
            outlined
            mapOptions
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.supported_platforms"
            :options="agentPlatformOptions"
            :label="$gettext('Supported Platforms (All supported if blank)')"
            clearable
            mapOptions
            filled
            multiple
          />
        </q-card-section>

        <q-card-section>
          <tactical-dropdown
            v-model="script.args"
            :label="
              $pgettext(
                'Script configuration',
                'Script Arguments (press Enter after typing each argument)',
              )
            "
            :placeholder="$gettext('(press Enter after typing each argument)')"
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
            :label="$gettext('Environment Variables')"
            :placeholder="
              $gettext('(press Enter after typing each key=value pair)')
            "
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
            :label="$gettext('Default Timeout')"
            type="number"
            outlined
            dense
            v-model.number="script.default_timeout"
            :rules="[
              (val) => val >= 5 || $gettext('Minimum is %{min}', { min: 5 }),
            ]"
          />
        </q-card-section>

        <q-card-actions>
          <q-space />
          <q-btn dense flat :label="$gettext('Cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            :label="$gettext('Add')"
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
