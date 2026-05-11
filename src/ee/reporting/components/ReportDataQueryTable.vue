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
        />{{ t("reporting.dataQueryTable.title") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            t("reporting.common.close")
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
            :label="t('reporting.common.new')"
            no-caps
            dense
            flat
            @click="openNewDataQueryForm"
          />
          <q-space />
          <q-input
            v-model="search"
            style="width: 300px"
            :label="t('reporting.common.search')"
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
                  <q-item-section>{{
                    t("reporting.common.clone")
                  }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="openEditDataQuery(props.row)"
                >
                  <q-item-section>{{
                    t("reporting.common.edit")
                  }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteDataQuery(props.row)"
                >
                  <q-item-section>{{
                    t("reporting.common.delete")
                  }}</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item v-close-popup clickable>
                  <q-item-section>{{
                    t("reporting.common.close")
                  }}</q-item-section>
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
// composition imports
import { ref, onMounted, computed } from "vue";
import { useQuasar, useDialogPluginComponent, type QTableColumn } from "quasar";
import { useSharedReportDataQueries } from "../api/reporting";
import { useI18n } from "vue-i18n";

// ui imports
import ReportDataQueryForm from "./ReportDataQueryForm.vue";

// type imports
import type { ReportDataQuery } from "../types/reporting";

const { t } = useI18n();

const columns = computed<QTableColumn[]>(() => [
  {
    name: "name",
    label: t("reporting.common.name"),
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
    title: t("reporting.dataQueryTable.deleteTitle", { name: dataQuery.name }),
    message: t("reporting.dataQueryTable.deleteMessage"),
    cancel: true,
    ok: { label: t("reporting.common.delete"), color: "negative" },
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
