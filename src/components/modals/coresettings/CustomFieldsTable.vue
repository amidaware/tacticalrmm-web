<template>
  <q-table
    dense
    :rows="data"
    :columns="columns"
    v-model:pagination="pagination"
    row-key="id"
    binary-state-sort
    hide-pagination
    virtual-scroll
    :rows-per-page-options="[0]"
    :no-data-label="$t('settings.customFieldsTable.noData')"
  >
    <!-- body slots -->
    <template v-slot:body="props">
      <q-tr
        :props="props"
        class="cursor-pointer"
        @dblclick="editCustomField(props.row)"
      >
        <!-- context menu -->
        <q-menu context-menu>
          <q-list dense style="min-width: 200px">
            <q-item clickable v-close-popup @click="editCustomField(props.row)">
              <q-item-section side>
                <q-icon name="edit" />
              </q-item-section>
              <q-item-section>{{ $t("settings.common.edit") }}</q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="deleteCustomField(props.row)"
            >
              <q-item-section side>
                <q-icon name="delete" />
              </q-item-section>
              <q-item-section>{{
                $t("settings.common.delete")
              }}</q-item-section>
            </q-item>

            <q-separator></q-separator>

            <q-item clickable v-close-popup>
              <q-item-section>{{ $t("settings.common.close") }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <!-- name -->
        <q-td>
          {{ props.row.name }}
          <q-tooltip :delay="600">{{
            $t("settings.customFieldsTable.id", { id: props.row.id })
          }}</q-tooltip>
        </q-td>
        <!-- type -->
        <q-td>
          {{ capitalize(props.row.type) }}
        </q-td>
        <!-- hide in ui -->
        <q-td>
          <q-icon v-if="props.row.hide_in_ui" name="check" />
        </q-td>
        <!-- hide in summary tab -->
        <q-td>
          <q-icon v-if="props.row.hide_in_summary" name="check" />
        </q-td>
        <!-- default value -->
        <q-td v-if="props.row.type === 'checkbox'">
          {{ props.row.default_value_bool }}
        </q-td>
        <q-td v-else-if="props.row.type === 'multiple'">
          <span v-if="props.row.default_values_multiple.length > 0">{{
            props.row.default_values_multiple
          }}</span>
        </q-td>
        <q-td v-else>
          {{ truncateText(props.row.default_value_string) }}
          <q-tooltip
            v-if="props.row.default_value_string.length >= 60"
            style="font-size: 12px"
            >{{ props.row.default_value_string }}</q-tooltip
          >
        </q-td>
        <!-- required -->
        <q-td>
          <q-icon v-if="props.row.required" name="check" />
        </q-td>
      </q-tr>
    </template>
  </q-table>
</template>

<script>
import CustomFieldsForm from "@/components/modals/coresettings/CustomFieldsForm.vue";
import mixins from "@/mixins/mixins";

export default {
  name: "CustomFieldsTable",
  emits: ["refresh"],
  mixins: [mixins],
  props: {
    data: !Array,
  },
  data() {
    return {
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
          name: "type",
          label: this.$t("settings.customFieldsTable.columns.fieldType"),
          field: "type",
          align: "left",
          sortable: true,
        },
        {
          name: "hide_in_ui",
          label: this.$t("settings.customFieldsTable.columns.hideInUi"),
          field: "hide_in_ui",
          align: "left",
          sortable: true,
        },
        {
          name: "hide_in_summary",
          label: this.$t("settings.customFieldsTable.columns.hideInSummary"),
          field: "hide_in_summary",
          align: "left",
          sortable: true,
        },
        {
          name: "default_value",
          label: this.$t("settings.customFieldsTable.columns.defaultValue"),
          field: "default_value",
          align: "left",
          sortable: true,
        },
        {
          name: "required",
          label: this.$t("settings.common.required"),
          field: "required",
          align: "left",
          sortable: true,
        },
      ],
    };
  },
  methods: {
    editCustomField(field) {
      this.$q
        .dialog({
          component: CustomFieldsForm,
          componentProps: {
            field: field,
          },
        })
        .onOk(() => {
          this.refresh();
        });
    },
    deleteCustomField(field) {
      this.$q
        .dialog({
          title: this.$t("settings.customFieldsTable.deleteTitle", {
            name: field.name,
          }),
          cancel: true,
          ok: { label: this.$t("settings.common.delete"), color: "negative" },
        })
        .onOk(() => {
          this.$q.loading.show();
          this.$axios
            .delete(`/core/customfields/${field.id}/`)
            .then(() => {
              this.refresh();
              this.$q.loading.hide();
              this.notifySuccess(
                this.$t("settings.customFieldsTable.notify.deleted", {
                  name: field.name,
                }),
              );
            })
            .catch(() => {
              this.$q.loading.hide();
            });
        });
    },
    refresh() {
      this.$emit("refresh");
    },
  },
};
</script>
