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
          @click="getReportHTMLTemplates"
        />{{ $gettext("Base Templates") }}
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
        :rows="reportHTMLTemplates"
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
            @click="openNewHTMLTemplateForm"
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
            @dblclick="openEditHTMLTemplate(props.row)"
          >
            <!-- Context Menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  v-close-popup
                  clickable
                  @click="openEditHTMLTemplate(props.row)"
                >
                  <q-item-section>{{
                    $pgettext("Report edit action", "Edit")
                  }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="cloneHTMLTemplate(props.row)"
                >
                  <q-item-section>{{ $gettext("Clone") }}</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteHTMLTemplate(props.row)"
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
import { useSharedReportHTMLTemplates } from "../api/reporting";

// ui imports
import ReportHTMLTemplateForm from "./ReportHTMLTemplateForm.vue";

// type imports
import type { ReportHTMLTemplate } from "../types/reporting";

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
  reportHTMLTemplates,
  isLoading,
  getReportHTMLTemplates,
  deleteReportHTMLTemplate,
} = useSharedReportHTMLTemplates;
const search = ref("");

function openNewHTMLTemplateForm() {
  $q.dialog({
    component: ReportHTMLTemplateForm,
  });
}

function openEditHTMLTemplate(template: ReportHTMLTemplate) {
  $q.dialog({
    component: ReportHTMLTemplateForm,
    componentProps: {
      template,
    },
  });
}

function deleteHTMLTemplate(template: ReportHTMLTemplate) {
  $q.dialog({
    title: gettext.$gettext("Delete HTML Template: %{name}?", {
      name: template.name,
    }),
    message: gettext.$gettext(
      "If this template is in use you will need to change it in every report template",
    ),
    cancel: true,
    ok: { label: gettext.$gettext("Delete"), color: "negative" },
  }).onOk(() => {
    deleteReportHTMLTemplate(template.id);
  });
}

async function cloneHTMLTemplate(template: ReportHTMLTemplate) {
  $q.dialog({
    component: ReportHTMLTemplateForm,
    componentProps: {
      cloneTemplate: template,
    },
  });
}

onMounted(getReportHTMLTemplates);
</script>
