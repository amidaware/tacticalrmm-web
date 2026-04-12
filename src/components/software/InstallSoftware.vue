<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 40vw; max-width: 50vw">
      <q-bar>
        {{ t("software.installSoftware.title") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            t("software.shared.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <q-table
          class="remote-bg-tbl-sticky"
          :table-class="{
            'table-bgcolor': !$q.dark.isActive,
            'table-bgcolor-dark': $q.dark.isActive,
          }"
          dense
          :rows="chocos"
          :columns="columns"
          v-model:pagination="pagination"
          :filter="filter"
          binary-state-sort
          hide-bottom
          virtual-scroll
          :rows-per-page-options="[0]"
          row-key="name"
        >
          <template v-slot:top-left>
            <q-input
              v-model="filter"
              outlined
              :label="t('software.shared.search')"
              dense
              clearable
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </template>
          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td auto-width>
                <q-btn
                  dense
                  flat
                  push
                  icon="add"
                  @click="installSoftware(props.row.name)"
                />
              </q-td>
              <q-td @click="showDescription(props.row.name)">
                <span style="cursor: pointer; text-decoration: underline">{{
                  props.row.name
                }}</span>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, onMounted } from "vue";
import { useDialogPluginComponent, useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchChocosSoftware, installAgentSoftware } from "@/api/software";
import { notifySuccess } from "@/utils/notify";

export default {
  name: "InstallSoftware",
  emits: [...useDialogPluginComponent.emits],
  props: {
    agent_id: !String,
  },
  setup(props) {
    // quasar setup
    const { dialogRef, onDialogHide } = useDialogPluginComponent();
    const $q = useQuasar();
    const { t } = useI18n();

    const columns = [
      {
        name: "install",
        align: "left",
        label: t("software.installSoftware.columns.install"),
        sortable: false,
      },
      {
        name: "name",
        align: "left",
        label: t("software.shared.name"),
        field: "name",
        sortable: true,
      },
    ];

    // install software logic
    const chocos = ref([]);
    const filter = ref("");
    const pagination = ref({
      rowsPerPage: 0,
      sortBy: "name",
      descending: false,
    });

    async function getChocos() {
      chocos.value = Object.freeze(await fetchChocosSoftware());
    }

    function showDescription(name) {
      window.open(`https://chocolatey.org/packages/${name}`, "_blank");
    }

    function installSoftware(name) {
      const data = { name: name };
      $q.dialog({
        title: t("software.installSoftware.installTitle", { name }),
        persistent: true,
        ok: { label: t("software.installSoftware.columns.install") },
        cancel: true,
      }).onOk(async () => {
        $q.loading.show();
        try {
          const result = await installAgentSoftware(props.agent_id, data);
          onDialogHide();
          notifySuccess(result, 5000);
        } catch (e) {
          console.error(e);
        }
        $q.loading.hide();
      });
    }

    onMounted(getChocos);

    return {
      // reactive data
      chocos,
      filter,
      pagination,

      // non-reactive data
      columns,

      // methods
      getChocos,
      showDescription,
      installSoftware,

      // quasar dialog
      onDialogHide,
      dialogRef,
      t,
    };
  },
};
</script>
