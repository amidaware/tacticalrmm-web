<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{ $t("alerts.templateAdd.title", { type: capitalize(type) }) }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("alerts.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="submit" ref="form">
        <q-card-section v-if="options.length > 0">
          <q-select
            v-model="selectedTemplate"
            :options="options"
            outlined
            dense
            clearable
            emit-value
            map-options
            :label="
              $t('alerts.templateAdd.selectLabel', { type: capitalize(type) })
            "
          >
          </q-select>
        </q-card-section>
        <q-card-section v-else>
          {{ $t("alerts.templateAdd.noTemplates") }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn dense flat :label="$t('alerts.common.cancel')" v-close-popup />
          <q-btn
            v-if="options.length > 0"
            flat
            :label="$t('alerts.common.submit')"
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
  name: "AlertTemplateAdd",
  emits: ["hide", "ok", "cancel"],
  props: {
    object: !Object,
    type: {
      required: true,
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ["site", "client", "policy"].includes(value);
      },
    },
  },
  mixins: [mixins],
  data() {
    return {
      selectedTemplate: null,
      options: [],
    };
  },
  methods: {
    submit() {
      // close because nothing was edited
      if (this.object.alert_template === this.selectedTemplate) {
        this.hide();
        return;
      }

      this.$q.loading.show();

      let url = "";
      let data = {};
      if (this.type === "client") {
        url = `/clients/${this.object.id}/`;
        data = {
          client: { id: this.object.id, alert_template: this.selectedTemplate },
        };
      } else if (this.type === "site") {
        url = `/clients/sites/${this.object.id}/`;
        data = {
          site: { id: this.object.id, alert_template: this.selectedTemplate },
        };
      } else if (this.type === "policy") {
        url = `/automation/policies/${this.object.id}/`;
        data = { id: this.object.id, alert_template: this.selectedTemplate };
      }

      const text = this.selectedTemplate
        ? this.$t("alerts.templateAdd.actions.assigned")
        : this.$t("alerts.templateAdd.actions.removed");
      this.$axios
        .put(url, data)
        .then(() => {
          this.$q.loading.hide();
          this.onOk();
          this.notifySuccess(
            this.$t("alerts.templateAdd.notify.templateUpdated", {
              action: text,
            }),
          );
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    getAlertTemplates() {
      this.$q.loading.show();
      this.$axios
        .get("/alerts/templates/")
        .then((r) => {
          this.options = r.data.map((template) => ({
            label: template.name,
            value: template.id,
          }));
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
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
    this.getAlertTemplates();
    this.selectedTemplate = this.object.alert_template;
  },
};
</script>
