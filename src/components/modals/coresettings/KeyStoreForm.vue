<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{ title }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("settings.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <!-- name -->
        <q-card-section>
          <q-input
            :label="$t('settings.common.name')"
            outlined
            dense
            v-model="localKey.name"
            :rules="[(val) => !!val || $t('settings.common.required')]"
          />
        </q-card-section>

        <!-- value -->
        <q-card-section>
          <q-input
            :label="$t('settings.keyStoreTable.columns.value')"
            outlined
            dense
            v-model="localKey.value"
            :type="isPwd ? 'password' : 'text'"
            :rules="[(val) => !!val || $t('settings.common.required')]"
            ><template v-slot:append>
              <q-icon
                :name="isPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="isPwd = !isPwd"
              />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('settings.common.cancel')" v-close-popup />
          <q-btn
            flat
            :label="$t('settings.common.submit')"
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
  name: "KeyStoreForm",
  emits: ["hide", "ok", "cancel"],
  mixins: [mixins],
  props: { globalKey: Object },
  data() {
    return {
      isPwd: true,
      localKey: {
        name: "",
        value: "",
      },
    };
  },
  computed: {
    title() {
      return this.editing
        ? this.$t("settings.keyStoreForm.editTitle")
        : this.$t("settings.keyStoreForm.addTitle");
    },
    editing() {
      return !!this.globalKey;
    },
  },
  methods: {
    submit() {
      this.$q.loading.show();

      let data = {
        ...this.localKey,
      };

      if (this.editing) {
        this.$axios
          .put(`/core/keystore/${data.id}/`, data)
          .then(() => {
            this.$q.loading.hide();
            this.onOk();
            this.notifySuccess(this.$t("settings.keyStoreForm.notify.edited"));
          })
          .catch(() => {
            this.$q.loading.hide();
          });
      } else {
        this.$axios
          .post("/core/keystore/", data)
          .then(() => {
            this.$q.loading.hide();
            this.onOk();
            this.notifySuccess(this.$t("settings.keyStoreForm.notify.added"));
          })
          .catch(() => {
            this.$q.loading.hide();
          });
      }
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
    if (this.globalKey) Object.assign(this.localKey, this.globalKey);
  },
};
</script>
