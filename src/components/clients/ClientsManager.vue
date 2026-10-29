<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 70vw">
      <q-bar>
        <q-btn
          @click="getClients"
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
        />{{ $gettext("Clients Manager") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-table
        :rows="clients"
        :columns="columns"
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        class="settings-tbl-sticky"
        style="height: 70vh"
        :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: false }"
        dense
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
        :no-data-label="$gettext('No Clients')"
        :loading="loading"
      >
        <!-- top slot -->
        <template v-slot:top>
          <q-btn
            :label="$pgettext('Clients and sites', 'New')"
            dense
            flat
            push
            no-caps
            icon="add"
            @click="showAddClient"
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
            @dblclick="showEditClient(props.row)"
          >
            <!-- context menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  clickable
                  v-close-popup
                  @click="showEditClient(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>{{
                    $pgettext("Dashboard agent actions", "Edit")
                  }}</q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="showClientDeleteModal(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>{{ $gettext("Delete") }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item clickable v-close-popup @click="showAddSite(props.row)">
                  <q-item-section side>
                    <q-icon name="add" />
                  </q-item-section>
                  <q-item-section>{{ $gettext("Add Site") }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item clickable v-close-popup>
                  <q-item-section>{{ $gettext("Close") }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <!-- name -->
            <q-td>
              {{ props.row.name }}
            </q-td>
            <q-td>
              <span
                style="cursor: pointer; text-decoration: underline"
                class="text-primary"
                @click="showSitesTable(props.row)"
                >{{
                  $gettext("Show Sites (%{count})", {
                    count: props.row.sites.length,
                  })
                }}</span
              >
            </q-td>
            <q-td>{{ props.row.agent_count }}</q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script>
import { gettext } from "@/gettext";
// composition imports
import { ref, onMounted, computed } from "vue";
import { useQuasar, useDialogPluginComponent } from "quasar";
import { fetchClients, removeClient } from "@/api/clients";
import { notifySuccess } from "@/utils/notify";

// ui imports
import ClientsForm from "@/components/clients/ClientsForm.vue";
import SitesForm from "@/components/clients/SitesForm.vue";
import DeleteClient from "@/components/clients/DeleteClient.vue";
import SitesTable from "@/components/clients/SitesTable.vue";

export default {
  name: "ClientsManager",
  emits: [...useDialogPluginComponent.emits],
  setup() {
    // setup quasar dialog
    const $q = useQuasar();

    const { dialogRef, onDialogHide } = useDialogPluginComponent();

    const columns = computed(() => [
      {
        name: "name",
        label: gettext.$pgettext("Clients and sites", "Name"),
        field: "name",
        align: "left",
      },
      {
        name: "sites",
        label: gettext.$pgettext("Clients and sites", "Sites"),
        field: "sites",
        align: "left",
      },
      {
        name: "agent_count",
        label: gettext.$gettext("Total Agents"),
        field: "agent_count",
        align: "left",
      },
    ]);

    // clients manager logic
    const clients = ref([]);
    const loading = ref(false);

    async function getClients() {
      loading.value = true;
      clients.value = await fetchClients();
      loading.value = false;
    }

    function showClientDeleteModal(client) {
      // agents are still assigned to client. Need to open modal to select which site to move to
      if (client.agent_count > 0) {
        $q.dialog({
          component: DeleteClient,
          componentProps: {
            object: client,
            type: "client",
          },
        }).onOk(getClients);

        // can delete the client since there are no agents
      } else {
        $q.dialog({
          title: gettext.$gettext("Are you sure?"),
          message: gettext.$gettext("Delete client: %{name}.", {
            name: client.name,
          }),
          cancel: true,
          ok: { label: gettext.$gettext("Delete"), color: "negative" },
        }).onOk(async () => {
          loading.value = true;
          try {
            const result = await removeClient(client.id);
            notifySuccess(result);
            await getClients();
          } catch (e) {
            console.error(e);
          }
          loading.value = false;
        });
      }
    }

    function showEditClient(client) {
      $q.dialog({
        component: ClientsForm,
        componentProps: {
          client: client,
        },
      }).onOk(getClients);
    }

    function showAddClient() {
      $q.dialog({
        component: ClientsForm,
      }).onOk(getClients);
    }

    function showAddSite(client) {
      $q.dialog({
        component: SitesForm,
        componentProps: {
          client: client.id,
        },
      }).onOk(getClients);
    }

    function showSitesTable(client) {
      $q.dialog({
        component: SitesTable,
        componentProps: {
          client: client,
        },
      });
    }

    onMounted(getClients);

    return {
      // reactive data
      clients,
      loading,

      // non-reactive data
      columns,

      // methods
      getClients,
      showClientDeleteModal,
      showEditClient,
      showAddClient,
      showAddSite,
      showSitesTable,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
