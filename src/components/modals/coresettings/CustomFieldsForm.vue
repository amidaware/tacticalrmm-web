<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{ title }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <!-- model select -->
        <q-card-section>
          <q-select
            :label="$gettext('Target')"
            :options="modelOptions"
            map-options
            emit-value
            outlined
            dense
            :disable="editing"
            v-model="localField.model"
            :rules="[(val) => !!val || $gettext('Required')]"
          />
        </q-card-section>
        <!-- name -->
        <q-card-section>
          <q-input
            :label="$pgettext('Settings actions', 'Name')"
            outlined
            dense
            v-model="localField.name"
            :rules="[(val) => !!val || $gettext('Required')]"
          />
        </q-card-section>
        <!-- type select -->
        <q-card-section>
          <q-select
            :label="$gettext('Field Type')"
            :options="typeOptions"
            @update:model-value="clear"
            map-options
            emit-value
            outlined
            dense
            :disable="editing"
            v-model="localField.type"
            :rules="[(val) => !!val || $gettext('Required')]"
          />
        </q-card-section>
        <!-- input options select for single and multiple input type -->
        <q-card-section
          v-if="localField.type === 'single' || localField.type == 'multiple'"
        >
          <q-select
            dense
            :label="
              $gettext('Input Options (press Enter after typing each option)')
            "
            filled
            v-model="localField.options"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            input-debounce="0"
            new-value-mode="add-unique"
            @update:model-value="
              localField.default_value_string = '';
              localField.default_values_multiple = [];
            "
          />
        </q-card-section>
        <!-- default value -->
        <q-card-section v-if="!!localField.type">
          <!-- For datetime field -->
          <q-input
            v-if="localField.type === 'datetime'"
            type="datetime-local"
            dense
            :label="$gettext('Default Value')"
            stack-label
            outlined
            v-model="localField.default_value_string"
            :rules="defaultValueRules"
            reactive-rules
          />

          <!-- For Checkbox -->
          <q-toggle
            v-else-if="localField.type == 'checkbox'"
            :label="$gettext('Default Value')"
            v-model="localField.default_value_bool"
            color="green"
          />

          <!-- Dropdown Single -->
          <q-select
            v-else-if="localField.type === 'single'"
            :label="$gettext('Default Value')"
            :options="localField.options"
            outlined
            dense
            v-model="localField.default_value_string"
            :rules="defaultValueRules"
            reactive-rules
          />

          <!-- Dropdown Multiple -->
          <q-select
            v-else-if="localField.type === 'multiple'"
            :label="$gettext('Default Value(s)')"
            :options="localField.options"
            outlined
            dense
            multiple
            v-model="localField.default_values_multiple"
            :rules="defaultValueRules"
            reactive-rules
          />

          <!-- For everything else -->
          <q-input
            v-else
            :label="$gettext('Default Value')"
            :type="localField.type === 'text' ? 'text' : 'number'"
            outlined
            dense
            v-model="localField.default_value_string"
            :rules="defaultValueRules"
            reactive-rules
            autogrow
          />
        </q-card-section>
        <q-card-section>
          <q-toggle
            v-if="localField.type !== 'checkbox'"
            :label="$gettext('Required')"
            v-model="localField.required"
            color="green"
          />
          <q-toggle
            :label="$gettext('Hide in Dashboard')"
            v-model="localField.hide_in_ui"
            color="green"
          />
          <q-toggle
            :label="$gettext('Hide in Summary Tab')"
            v-model="localField.hide_in_summary"
            color="green"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$gettext('Cancel')" v-close-popup />
          <q-btn
            flat
            :label="$gettext('Submit')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import mixins from "@/mixins/mixins";

export default {
  name: "CustomFieldsForm",
  emits: ["hide", "ok", "cancel"],
  mixins: [mixins],
  props: { field: Object, model: String },
  data() {
    return {
      localField: {
        name: "",
        model: "",
        type: "",
        options: [],
        required: false,
        default_value_string: "",
        default_value_bool: false,
        default_values_multiple: [],
        hide_in_ui: false,
        hide_in_summary: false,
      },
    };
  },
  computed: {
    modelOptions() {
      return [
        { label: this.$pgettext("Custom fields", "Clients"), value: "client" },
        { label: this.$pgettext("Custom fields", "Sites"), value: "site" },
        { label: this.$pgettext("Custom fields", "Agents"), value: "agent" },
      ];
    },
    typeOptions() {
      return [
        {
          label: this.$pgettext("Custom field configuration", "Text"),
          value: "text",
        },
        {
          label: this.$gettext("Number"),
          value: "number",
        },
        {
          label: this.$gettext("Dropdown Single"),
          value: "single",
        },
        {
          label: this.$gettext("Dropdown Multiple"),
          value: "multiple",
        },
        {
          label: this.$gettext("DateTime"),
          value: "datetime",
        },
        {
          label: this.$gettext("Checkbox"),
          value: "checkbox",
        },
      ];
    },
    title() {
      return this.editing
        ? this.$gettext("Edit Custom Field")
        : this.$gettext("Add Custom Field");
    },
    editing() {
      return !!this.field;
    },
    defaultValueRules() {
      if (this.localField.required) {
        return [
          (val) =>
            !!val ||
            this.$gettext("Default Value needs to be set for required fields"),
        ];
      } else {
        return [];
      }
    },
  },
  methods: {
    submit() {
      this.$q.loading.show();

      let data = {
        ...this.localField,
      };

      if (this.editing) {
        this.$axios
          .put(`/core/customfields/${data.id}/`, data)
          .then(() => {
            this.$q.loading.hide();
            this.onOk();
            this.notifySuccess(this.$gettext("Custom field edited!"));
          })
          .catch(() => {
            this.$q.loading.hide();
          });
      } else {
        this.$axios
          .post("/core/customfields/", data)
          .then(() => {
            this.$q.loading.hide();
            this.onOk();
            this.notifySuccess(this.$gettext("Custom field added!"));
          })
          .catch(() => {
            this.$q.loading.hide();
          });
      }
    },
    clear() {
      this.localField.options = [];
      this.localField.required = false;
      this.localField.default_value_string = "";
      this.localField.default_values_multiple = [];
      this.localField.default_value_bool = false;
    },
    show() {
      this.$refs.dialog.show();
    },
    hide() {
      this.$refs.dialog.hide();
    },
    onHide() {
      this.$emit("hide");
    },
    onOk() {
      this.$emit("ok");
      this.hide();
    },
  },
  mounted() {
    // If pk prop is set that means we are editing
    if (this.field) Object.assign(this.localField, this.field);

    // Set model to current tab
    if (this.model) this.localField.model = this.model;
  },
};
</script>
