<template>
  <q-select
    ref="dropdown"
    v-model="tableView"
    label="Views"
    class="q-pr-sm"
    style="width: 250px"
    :options="tableViewOptions"
    filled
    dense
    options-dense
    clearable
    @clear="filter = {}"
  />

  <q-btn icon="more_vert" flat>
    <q-menu>
      <q-list dense :ripple="false">
        <q-item
          v-if="tableView"
          clickable
          v-close-popup
          :disable="!filter"
          @click="editView(tableView)"
        >
          <q-item-section>
            <q-item-label>Edit Current View</q-item-label>
          </q-item-section>
        </q-item>

        <q-item :disable="!filter" clickable v-close-popup @click="addView">
          <q-item-section>
            <q-item-label>Save As New View</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          v-if="tableView"
          :disable="!filter"
          clickable
          v-close-popup
          @click="deleteView(tableView)"
        >
          <q-item-section>
            <q-item-label>Delete View</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script lang="ts" setup>
import { ref, defineModel, watch, useTemplateRef } from "vue";
import { QSelect, useQuasar } from "quasar";
import { useTableViewShared } from "../../api";
import { useTableViewDropdown } from "../../composables";

// types
import { FilterObject, TableView } from "../../types";

const props = defineProps<{
  tableKey: string;
}>();

const $q = useQuasar();
const { addTableView, editTableView, deleteTableView } = useTableViewShared;
const { tableViewOptions } = useTableViewDropdown();

const tableView = ref<TableView | null>();
const filter = defineModel<FilterObject>({ required: true });

const dropdown = useTemplateRef<QSelect>("dropdown");

// watch view changes and update filter
watch(
  tableView,
  (newValue) => {
    if (newValue) {
      filter.value = JSON.parse(newValue.filter);
    }
  },
  { deep: true },
);

function addView() {
  $q.dialog({
    title: "Adding View",
    prompt: {
      model: "",
      type: "text",
      filled: true,
    },
    color: "primary",
    cancel: true,
    persistent: true,
  }).onOk((data: string) => {
    addTableView({
      name: data,
      filter: JSON.stringify(filter.value),
      table: props.tableKey,
    });

    // TODO: add error handling here

    // find newly added view in options and select it
    const addedView = tableViewOptions.value.find((view) => view.name === data);

    if (addedView) {
      tableView.value = addedView;
    }
  });
}

function editView(view: TableView) {
  if (view && view.id) {
    const newView = { ...view, filter: JSON.stringify(filter.value) };
    editTableView(view.id, newView);
    tableView.value = newView;

    // TODO: add error handling here
  }
}

function deleteView(view: TableView) {
  if (view && view.id) {
    deleteTableView(view.id);
    tableView.value = null;
    filter.value = {};

    // TODO: add error handling here
  }
}
</script>
