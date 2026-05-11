<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 70vw; height: 70vh">
      <q-bar>
        <q-btn
          @click="getDeployments"
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
        />
        {{ t("dashboard.deployments.manageDeployments") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary" />
        </q-btn>
      </q-bar>
      <q-table
        dense
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        class="audit-mgr-tbl-sticky"
        style="max-height: 65vh"
        binary-state-sort
        virtual-scroll
        :rows="deployments"
        :columns="columns"
        :rows-per-page-options="[0]"
        row-key="id"
        :pagination="{ rowsPerPage: 0, sortBy: 'id', descending: true }"
        :no-data-label="t('dashboard.deployments.noDeployments')"
        :loading="loading"
      >
        <template v-slot:top>
          <q-btn
            dense
            flat
            icon="add"
            :label="t('dashboard.clients.new')"
            @click="showAddDeployment"
          />
        </template>

        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            @dblclick="copyLink(props.row)"
          >
            <q-menu context-menu auto-close>
              <q-list dense style="min-width: 200px">
                <q-item clickable @click="deleteDeployment(props.row)">
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>{{
                    t("dashboard.contextMenu.delete")
                  }}</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable>
                  <q-item-section>{{
                    t("common.buttons.close")
                  }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <q-td key="client" :props="props">{{ props.row.client_name }}</q-td>
            <q-td key="site" :props="props">{{ props.row.site_name }}</q-td>
            <q-td key="mon_type" :props="props">{{ props.row.mon_type }}</q-td>
            <q-td key="goarch" :props="props">{{ props.row.goarch }}</q-td>
            <q-td key="expiry" :props="props">{{
              formatDate(props.row.expiry)
            }}</q-td>
            <q-td key="created" :props="props">{{
              formatDate(props.row.created)
            }}</q-td>
            <q-td key="flags" :props="props"
              ><q-badge
                color="grey-8"
                :label="t('dashboard.deployments.viewFlags')"
              />
              <q-tooltip style="font-size: 12px">{{
                props.row.install_flags
              }}</q-tooltip>
            </q-td>
            <q-td key="link" :props="props">
              <q-btn
                flat
                dense
                size="sm"
                color="primary"
                icon="content_copy"
                :label="t('dashboard.deployments.copy')"
                @click="copyLink(props.row)"
              />
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { useQuasar, useDialogPluginComponent, copyToClipboard } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchDeployments, removeDeployment } from "@/api/clients";
import { notifySuccess } from "@/utils/notify";
import { getBaseUrl } from "@/boot/axios";

// ui imports
import NewDeployment from "@/components/clients/NewDeployment.vue";

export default {
  name: "DeploymentTable",
  emits: [...useDialogPluginComponent.emits],
  setup() {
    // quasar dialog setup
    const { dialogRef, onDialogHide } = useDialogPluginComponent();
    const $q = useQuasar();
    const { t } = useI18n();

    const columns = computed(() => [
      {
        name: "client",
        label: t("dashboard.table.client"),
        field: "client_name",
        align: "left",
        sortable: true,
      },
      {
        name: "site",
        label: t("dashboard.table.site"),
        field: "site_name",
        align: "left",
        sortable: true,
      },
      {
        name: "mon_type",
        label: t("dashboard.fileBrowser.columns.type"),
        field: "mon_type",
        align: "left",
        sortable: true,
      },
      {
        name: "goarch",
        label: t("dashboard.deployments.columns.arch"),
        field: "goarch",
        align: "left",
        sortable: true,
      },
      {
        name: "expiry",
        label: t("dashboard.deployments.columns.expiry"),
        field: "expiry",
        align: "left",
        sortable: true,
      },
      {
        name: "created",
        label: t("dashboard.deployments.columns.created"),
        field: "created",
        align: "left",
        sortable: true,
      },
      {
        name: "flags",
        label: t("dashboard.deployments.columns.flags"),
        field: "install_flags",
        align: "left",
      },
      {
        name: "link",
        label: t("dashboard.deployments.columns.downloadLink"),
        align: "left",
      },
    ]);

    // setup vuex
    const store = useStore();
    const formatDate = computed(() => store.getters.formatDate);

    // deployment logic
    const deployments = ref([]);
    const loading = ref(false);

    async function getDeployments() {
      loading.value = true;
      deployments.value = await fetchDeployments();
      loading.value = false;
    }

    function deleteDeployment(deployment) {
      $q.dialog({
        title: t("dashboard.deployments.dialog.deleteDeploymentTitle"),
        cancel: true,
        ok: { label: t("common.buttons.delete"), color: "negative" },
      }).onOk(async () => {
        loading.value = true;
        try {
          const result = await removeDeployment(deployment.id);
          notifySuccess(result);
          await getDeployments();
        } catch (e) {
          console.error(e);
        }
        loading.value = false;
      });
    }

    function copyLink(deployment) {
      const api = getBaseUrl();
      copyToClipboard(`${api}/clients/${deployment.uid}/deploy/`).then(() => {
        notifySuccess(t("dashboard.deployments.notify.linkCopied"), 1500);
      });
    }

    function showAddDeployment() {
      $q.dialog({
        component: NewDeployment,
      }).onOk(getDeployments);
    }

    onMounted(getDeployments);

    return {
      // reactive data
      deployments,
      loading,

      // non-reactive data
      columns,
      t,

      // mehtods
      getDeployments,
      deleteDeployment,
      showAddDeployment,
      copyLink,
      formatDate,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
