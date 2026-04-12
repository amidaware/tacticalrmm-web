<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        <q-btn
          @click="getSites"
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
        />{{ t("dashboard.clients.sitesFor", { name: client.name }) }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-table
        dense
        :rows="sites"
        :columns="columns"
        :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: false }"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
        :no-data-label="t('dashboard.clients.noSites')"
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        class="settings-tbl-sticky"
        style="height: 65vh"
        :loading="loading"
      >
        <template v-slot:top>
          <q-btn
            :label="t('dashboard.clients.new')"
            dense
            flat
            push
            unelevated
            no-caps
            icon="add"
            @click="showAddSite"
          />
        </template>

        <!-- loading slot -->
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <!-- body slots -->
        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            @dblclick="showEditSite(props.row)"
          >
            <!-- context menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  clickable
                  v-close-popup
                  @click="showEditSite(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>{{
                    t("dashboard.contextMenu.edit")
                  }}</q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="showSiteDeleteModal(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>{{
                    t("dashboard.contextMenu.delete")
                  }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item clickable v-close-popup>
                  <q-item-section>{{
                    t("common.buttons.close")
                  }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <!-- name -->
            <q-td>
              {{ props.row.name }}
            </q-td>
            <!-- agent count -->
            <q-td>{{ props.row.agent_count }}</q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, onMounted, computed } from "vue";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchClient, removeSite } from "@/api/clients";
import { notifySuccess } from "@/utils/notify";

// ui imports
import SitesForm from "@/components/clients/SitesForm.vue";
import DeleteClient from "@/components/clients/DeleteClient.vue";

export default {
  name: "SitesTable",
  emits: [...useDialogPluginComponent.emits],
  props: {
    client: !Object,
  },
  setup(props) {
    // setup quasar dialog
    const $q = useQuasar();
    const { t } = useI18n();
    const { dialogRef, onDialogHide } = useDialogPluginComponent();

    const columns = computed(() => [
      {
        name: "name",
        label: t("dashboard.clients.columns.name"),
        field: "name",
        align: "left",
      },
      {
        name: "agent_count",
        label: t("dashboard.clients.columns.totalAgents"),
        field: "agent_count",
        align: "left",
      },
    ]);

    // sites table logic
    const sites = ref([]);
    const loading = ref(false);

    async function getSites() {
      loading.value = true;
      const client = await fetchClient(props.client.id);
      sites.value = client.sites;
      loading.value = false;
    }

    function showSiteDeleteModal(site) {
      // agents are still assigned to client. Need to open modal to select which site to move to
      if (site.agent_count > 0) {
        $q.dialog({
          component: DeleteClient,
          componentProps: {
            object: site,
            type: "site",
          },
        }).onOk(getSites);

        // can delete the client since there are no agents
      } else {
        $q.dialog({
          title: t("dashboard.dialog.deleteTitle"),
          message: t("dashboard.clients.dialog.deleteSite", {
            name: site.name,
          }),
          cancel: true,
          ok: { label: t("common.buttons.delete"), color: "negative" },
        }).onOk(async () => {
          loading.value = true;
          try {
            const result = await removeSite(site.id);
            notifySuccess(result);
            await getSites();
          } catch (e) {
            console.error(e);
          }
          loading.value = false;
        });
      }
    }

    function showEditSite(site) {
      $q.dialog({
        component: SitesForm,
        componentProps: {
          site: site,
        },
      }).onOk(getSites);
    }

    function showAddSite() {
      $q.dialog({
        component: SitesForm,
        componentProps: {
          client: props.client.id,
        },
      }).onOk(getSites);
    }

    onMounted(getSites);

    return {
      // reactive data
      sites,
      loading,

      // non-reactive data
      columns,
      t,

      // methods
      getSites,
      showSiteDeleteModal,
      showEditSite,
      showAddSite,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
