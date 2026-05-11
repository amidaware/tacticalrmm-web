<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">{{ $t("settings.keyStoreTable.title") }}</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        text-color="black"
        class="q-mr-sm"
        :label="
          isPwd
            ? $t('settings.keyStoreTable.showValues')
            : $t('settings.keyStoreTable.hideValues')
        "
        :icon="isPwd ? 'visibility_off' : 'visibility'"
        @click="isPwd = !isPwd"
      />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        :label="$t('settings.keyStoreTable.addKey')"
        @click="addKey"
      />
    </div>
    <q-separator />
    <q-table
      dense
      :rows="keystore"
      :columns="columns"
      v-model:pagination="pagination"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      :no-data-label="$t('settings.keyStoreTable.noData')"
    >
      <!-- body slots -->
      <template v-slot:body="props">
        <q-tr
          :props="props"
          class="cursor-pointer"
          @dblclick="editKey(props.row)"
        >
          <!-- context menu -->
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item clickable v-close-popup @click="editKey(props.row)">
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>{{
                  $t("settings.common.edit")
                }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="deleteKey(props.row)">
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>{{
                  $t("settings.common.delete")
                }}</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>{{
                  $t("settings.common.close")
                }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- name -->
          <q-td>
            {{ props.row.name }}
          </q-td>
          <!-- value -->
          <q-td>
            {{ isPwd ? "****" : props.row.value }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script>
import KeyStoreForm from "@/components/modals/coresettings/KeyStoreForm.vue";
import mixins from "@/mixins/mixins";

export default {
  name: "KeyStoreTable",
  mixins: [mixins],
  data() {
    return {
      keystore: [],
      isPwd: true,
      pagination: {
        rowsPerPage: 0,
        sortBy: "name",
        descending: true,
      },
      columns: [
        {
          name: "name",
          label: this.$t("settings.common.name"),
          field: "name",
          align: "left",
          sortable: true,
        },
        {
          name: "value",
          label: this.$t("settings.keyStoreTable.columns.value"),
          field: "value",
          align: "left",
          sortable: true,
        },
      ],
    };
  },
  methods: {
    getKeyStore() {
      this.$q.loading.show();

      this.$axios
        .get("/core/keystore/")
        .then((r) => {
          this.$q.loading.hide();
          this.keystore = r.data;
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    addKey() {
      this.$q
        .dialog({
          component: KeyStoreForm,
        })
        .onOk(() => {
          this.getKeyStore();
        });
    },
    editKey(key) {
      this.$q
        .dialog({
          component: KeyStoreForm,
          componentProps: {
            globalKey: key,
          },
        })
        .onOk(() => {
          this.getKeyStore();
        });
    },
    deleteKey(key) {
      this.$q
        .dialog({
          title: this.$t("settings.keyStoreTable.deleteTitle", {
            name: key.name,
          }),
          cancel: true,
          ok: { label: this.$t("settings.common.delete"), color: "negative" },
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/core/keystore/${key.id}/`)
            .then(() => {
              this.getKeyStore();
              this.$q.loading.hide();
              this.notifySuccess(
                this.$t("settings.keyStoreTable.notify.deleted", {
                  name: key.name,
                }),
              );
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        });
    },
  },
  mounted() {
    this.getKeyStore();
  },
};
</script>
