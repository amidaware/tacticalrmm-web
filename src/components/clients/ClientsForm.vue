<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 40vw">
      <q-bar>
        {{
          !!client
            ? $t("clients.clientsForm.editing", { name: client.name })
            : $t("clients.clientsForm.adding")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <q-card-section>
          <q-input
            outlined
            dense
            v-model="state.name"
            :label="$t('common.name')"
            :rules="[
              (val) =>
                (val && val.length > 0) || $t('clients.validation.required'),
            ]"
          />
        </q-card-section>
        <q-card-section v-if="!client">
          <q-input
            :rules="[(val) => !!val || $t('clients.validation.required')]"
            outlined
            dense
            v-model="site.name"
            :label="$t('clients.clientsForm.defaultFirstSite')"
          />
        </q-card-section>

        <div class="q-pl-sm text-h6" v-if="customFields.length > 0">
          {{ $t("clients.shared.customFields") }}
        </div>
        <q-card-section v-for="field in customFields" :key="field.id">
          <CustomField v-model="custom_fields[field.name]" :field="field" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn dense flat :label="$t('common.cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            push
            :label="$t('common.save')"
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
import { ref, onMounted } from "vue";
import { useDialogPluginComponent } from "quasar";
import { fetchClient, saveClient, editClient } from "@/api/clients";
import { fetchCustomFields } from "@/api/core";
import { formatCustomFields } from "@/utils/format";
import { notifySuccess } from "@/utils/notify";

// ui imports
import CustomField from "@/components/ui/CustomField.vue";

export default {
  name: "ClientsForm",
  emits: [...useDialogPluginComponent.emits],
  components: {
    CustomField,
  },
  props: {
    client: Object,
  },
  setup(props) {
    // setup quasar dialog
    const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();

    // clients form logic
    const state = !!props.client
      ? ref(Object.assign({}, props.client))
      : ref({ name: "" });
    const site = ref({ name: "" });
    const custom_fields = ref({});
    const customFields = ref([]);
    const loading = ref(false);

    async function submit() {
      loading.value = true;
      const data = {
        client: state.value,
        site: site.value,
        custom_fields: formatCustomFields(
          customFields.value,
          custom_fields.value,
        ),
      };
      try {
        const result = !!props.client
          ? await editClient(props.client.id, data)
          : await saveClient(data);
        notifySuccess(result);
        onDialogOK();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    async function getClientCustomFieldValues() {
      loading.value = true;
      const data = await fetchClient(props.client.id);

      for (let field of customFields.value) {
        const value = data.custom_fields.find(
          (value) => value.field === field.id,
        );

        if (field.type === "multiple") {
          if (value) custom_fields.value[field.name] = value.value;
          else custom_fields.value[field.name] = [];
        } else if (field.type === "checkbox") {
          if (value) custom_fields.value[field.name] = value.value;
          else custom_fields.value[field.name] = false;
        } else {
          if (value) custom_fields.value[field.name] = value.value;
          else custom_fields.value[field.name] = "";
        }
      }
      loading.value = false;
    }

    onMounted(async () => {
      const fields = await fetchCustomFields({ model: "client" });
      customFields.value = fields.filter((field) => !field.hide_in_ui);
      if (props.client) getClientCustomFieldValues();
    });

    return {
      // reactive data
      state,
      site,
      customFields,
      custom_fields,
      loading,

      // methods
      submit,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
