<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide">
    <q-card>
      <q-bar>
        <q-btn
          class="q-mr-sm"
          dense
          flat
          push
          icon="refresh"
          @click="getReportDataQueries"
        />{{ $gettext("Data Queries") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            $gettext("Close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-table
        dense
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        :style="{ 'max-height': `${$q.screen.height - 24}px` }"
        class="tbl-sticky"
        :rows="reportDataQueries"
        :columns="columns"
        :loading="isLoading"
        :pagination="{ rowsPerPage: 0, sortBy: 'favorite', descending: true }"
        :filter="search"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #top>
          <q-btn
            class="q-ml-sm"
            icon="add"
            :label="$pgettext('Report editing', 'New')"
            no-caps
            dense
            flat
            @click="openNewDataQueryForm"
          />
          <q-space />
          <q-input
            v-model="search"
            style="width: 300px"
            :label="$pgettext('Report editing', 'Search')"
            dense
            outlined
            clearable
            class="q-pr-md q-pb-xs"
          >
            <template #prepend>
              <q-icon name="search" color="primary" />
            </template>
          </q-input>
        </template>

        <template #body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            @dblclick="openEditDataQuery(props.row)"
          >
            <!-- Context Menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item v-close-popup clickable @click="cloneQuery(props.row)">
                  <q-item-section>{{ $gettext("Clone") }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="openEditDataQuery(props.row)"
                >
                  <q-item-section>{{
                    $pgettext("Report edit action", "Edit")
                  }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteDataQuery(props.row)"
                >
                  <q-item-section>{{ $gettext("Delete") }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item v-close-popup clickable>
                  <q-item-section>{{ $gettext("Close") }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>

            <!-- rows -->
            <td>{{ props.row.name }}</td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { gettext } from "@/gettext";
// composition imports
import { ref, onMounted, computed } from "vue";
import { useQuasar, useDialogPluginComponent, type QTableColumn } from "quasar";
import { useSharedReportDataQueries } from "../api/reporting";

// ui imports
import ReportDataQueryForm from "./ReportDataQueryForm.vue";

// type imports
import type { ReportDataQuery } from "../types/reporting";

const columns = computed<QTableColumn[]>(() => [
  {
    name: "name",
    label: gettext.$pgettext("Report editing", "Name"),
    field: "name",
    align: "left",
    sortable: true,
  },
]);

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

// reports manager logic
const {
  reportDataQueries,
  isLoading,
  getReportDataQueries,
  deleteReportDataQuery,
} = useSharedReportDataQueries;
const search = ref("");

function openNewDataQueryForm() {
  $q.dialog({
    component: ReportDataQueryForm,
  });
}

function openEditDataQuery(dataQuery: ReportDataQuery) {
  $q.dialog({
    component: ReportDataQueryForm,
    componentProps: {
      dataQuery,
    },
  });
}

function deleteDataQuery(dataQuery: ReportDataQuery) {
  $q.dialog({
    title: gettext.$gettext("Delete Data Query: %{name}?", {
      name: dataQuery.name,
    }),
    message: gettext.$gettext(
      "If this query is in use you will need to change it in every report template",
    ),
    cancel: true,
    ok: { label: gettext.$gettext("Delete"), color: "negative" },
  }).onOk(() => {
    deleteReportDataQuery(dataQuery.id);
  });
}

async function cloneQuery(dataQuery: ReportDataQuery) {
  // TODO: fill out function
  console.log(dataQuery);
}

onMounted(getReportDataQueries);
</script>
