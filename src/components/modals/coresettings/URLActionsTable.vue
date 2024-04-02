<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">URL Actions</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        label="Add URL Action"
        @click="addURLAction"
      />
    </div>
    <q-separator />
    <q-table
      dense
      :rows="actions"
      :columns="columns"
      :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: true }"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      no-data-label="No URL Actions added yet"
    >
      <!-- body slots -->
      <template v-slot:body="props">
        <q-tr
          :props="props"
          class="cursor-pointer"
          @dblclick="editURLAction(props.row)"
        >
          <!-- context menu -->
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item clickable v-close-popup @click="editURLAction(props.row)">
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="deleteURLAction(props.row)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>Delete</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- name -->
          <q-td>
            {{ props.row.name }}
          </q-td>
          <!-- desc -->
          <q-td>
            {{ props.row.desc }}
          </q-td>
          <!-- action type -->
          <q-td>
            {{ props.row.action_type }}
          </q-td>
          <!-- pattern -->
          <q-td>
            {{ props.row.pattern }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
// composition imports
import { ref, onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { fetchURLActions, removeURLAction } from "@/api/core";
import { notifySuccess } from "@/utils/notify";

// ui imports
import URLActionsForm from "@/components/modals/coresettings/URLActionsForm.vue";

// types
import { type URLAction } from "@/types/core/urlactions";

// setup quasar
const $q = useQuasar();

const actions = ref([]);

const columns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "action_type",
    label: "Type",
    field: "action_type",
    align: "left",
    sortable: true,
  },
  {
    name: "desc",
    label: "Description",
    field: "desc",
    align: "left",
    sortable: true,
  },
  {
    name: "pattern",
    label: "Pattern",
    field: "pattern",
    align: "left",
    sortable: true,
  },
];

async function getURLActions() {
  $q.loading.show();
  try {
    const result = await fetchURLActions();
    actions.value = result;
  } catch (e) {
    console.error(e);
  }

  $q.loading.hide();
}

function addURLAction() {
  $q.dialog({
    component: URLActionsForm,
  }).onOk(getURLActions);
}

function editURLAction(action: URLAction) {
  $q.dialog({
    component: URLActionsForm,
    componentProps: {
      action: action,
    },
  }).onOk(getURLActions);
}
function deleteURLAction(action: URLAction) {
  $q.dialog({
    title: `Delete URL Action: ${action.name}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(async () => {
    $q.loading.show();

    try {
      await removeURLAction(action.id);
      await getURLActions();
      notifySuccess(`URL Action: ${action.name} was deleted!`);
    } catch (e) {
      console.error(e);
    }

    $q.loading.hide();
  });
}
onMounted(getURLActions);
</script>
