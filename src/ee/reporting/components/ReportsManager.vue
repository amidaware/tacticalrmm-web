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
          @click="getReportTemplates()"
        />Reports Manager
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-table
        dense
        :table-class="{
          'table-bgcolor': !$q.dark.isActive,
          'table-bgcolor-dark': $q.dark.isActive,
        }"
        :style="{ 'max-height': `${$q.screen.height - 32}px` }"
        class="tbl-sticky"
        :rows="reportTemplates"
        :columns="columns"
        :loading="isLoading"
        :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: false }"
        :filter="search"
        row-key="id"
        binary-state-sort
        virtual-scroll
        :rows-per-page-options="[0]"
      >
        <template #top>
          <q-btn-dropdown
            class="q-ml-sm"
            icon="add"
            label="Template"
            no-caps
            dense
            flat
          >
            <q-list dense>
              <q-item
                v-close-popup
                clickable
                @click="openNewReportTemplateForm('markdown')"
              >
                <q-item-section>
                  <q-item-label>Markdown Template</q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-close-popup
                clickable
                @click="openNewReportTemplateForm('html')"
              >
                <q-item-section>
                  <q-item-label>HTML Template</q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-close-popup
                clickable
                @click="openNewReportTemplateForm('plaintext')"
              >
                <q-item-section>
                  <q-item-label>Plain Text Template</q-item-label>
                </q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup @click="importReportTemplate">
                <q-item-section>
                  <q-item-label>Import Report Template</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-btn
            class="q-ml-sm"
            label="Base Templates"
            no-caps
            dense
            flat
            @click="openHTMLTemplates"
          />
          <q-btn
            class="q-ml-sm"
            label="Report Assets"
            no-caps
            dense
            flat
            @click="openReportAssets"
          />
          <q-btn
            class="q-ml-sm"
            label="Data Queries"
            no-caps
            dense
            flat
            @click="openDataQueries"
          />
          <q-btn
            @click="openReportSchedules"
            class="q-ml-sm"
            label="Report Schedules"
            no-caps
            dense
            flat
          />
          <q-btn
            @click="openReportHistory"
            class="q-ml-sm"
            label="Report Run History"
            no-caps
            dense
            flat
          />
          <q-btn
            class="q-ml-sm"
            label="Shared Templates"
            no-caps
            dense
            flat
            @click="openSharedTemplates"
          />
          <q-space />
          <q-input
            v-model="search"
            style="width: 300px"
            label="Search"
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
            @dblclick="openEditReportTemplateForm(props.row)"
          >
            <!-- Context Menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  v-close-popup
                  clickable
                  @click="openEditReportTemplateForm(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="cloneTemplate(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="content_copy" />
                  </q-item-section>
                  <q-item-section>Clone</q-item-section>
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  @click="
                    openReport(props.row.id, 'pdf', props.row.depends_on, {})
                  "
                >
                  <q-item-section side>
                    <q-icon name="mdi-file-pdf-box" />
                  </q-item-section>
                  <q-item-section>Open PDF Report</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="
                    openReport(
                      props.row.id,
                      props.row.type !== 'plaintext' ? 'html' : 'plaintext',
                      props.row.depends_on,
                      {},
                    )
                  "
                >
                  <q-item-section side>
                    <q-icon
                      :name="
                        props.row.type !== 'plaintext' ? 'code' : 'description'
                      "
                    />
                  </q-item-section>
                  <q-item-section
                    >Open
                    {{ props.row.type !== "plaintext" ? "HTML" : "Text" }}
                    Report</q-item-section
                  >
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  @click="downloadReport(props.row, 'pdf', {})"
                >
                  <q-item-section side>
                    <q-icon name="mdi-download" />
                  </q-item-section>
                  <q-item-section>Download PDF Report</q-item-section>
                </q-item>

                <q-item
                  v-close-popup
                  clickable
                  @click="
                    downloadReport(
                      props.row,
                      props.row.type !== 'plaintext' ? 'html' : 'plaintext',
                      {},
                    )
                  "
                >
                  <q-item-section side>
                    <q-icon name="mdi-download" />
                  </q-item-section>
                  <q-item-section
                    >Download
                    {{ props.row.type !== "plaintext" ? "HTML" : "Text" }}
                    Report</q-item-section
                  >
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  @click="exportReport(props.row.id)"
                >
                  <q-item-section side>
                    <q-icon name="mdi-export" />
                  </q-item-section>
                  <q-item-section>Export</q-item-section>
                </q-item>

                <q-separator />

                <q-item
                  v-close-popup
                  clickable
                  @click="deleteTemplate(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>Delete</q-item-section>
                </q-item>

                <q-separator />

                <q-item v-close-popup clickable>
                  <q-item-section>Close</q-item-section>
                </q-item>
              </q-list>
            </q-menu>

            <!-- rows -->
            <td>{{ props.row.name }}</td>
            <td>{{ props.row.type }}</td>
            <td>
              {{ props.row.depends_on.length > 0 ? props.row.depends_on : "" }}
            </td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, onMounted } from "vue";
import { useQuasar, useDialogPluginComponent, type QTableColumn } from "quasar";
import { useSharedReportTemplates } from "../api/reporting";

// ui imports
import ReportTemplateForm from "./ReportTemplateForm.vue";
import ReportAssets from "./ReportAssets.vue";
import ReportHTMLTemplateTable from "./ReportHTMLTemplateTable.vue";
import ReportDataQueryTable from "./ReportDataQueryTable.vue";
import ReportTemplateImport from "./ReportTemplateImport.vue";
import SharedTemplatesImport from "./SharedTemplatesImport.vue";
import ReportScheduleTable from "./ReportScheduleTable.vue";
import ReportHistoryTable from "./ReportHistoryTable.vue";

// type imports
import type { ReportTemplate } from "../types/reporting";

const columns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "type",
    label: "Template Type",
    field: "type",
    align: "left",
    sortable: true,
  },
  {
    name: "depends_on",
    label: "Template Dependencies",
    field: "depends_on",
    align: "left",
    sortable: true,
  },
];

// emits
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide } = useDialogPluginComponent();
const $q = useQuasar();

// reports manager logic
const {
  reportTemplates,
  isLoading,
  getReportTemplates,
  deleteReportTemplate,
  openReport,
  exportReport,
  downloadReport,
} = useSharedReportTemplates;

onMounted(getReportTemplates);
const search = ref("");

function openNewReportTemplateForm(templateType: string) {
  $q.dialog({
    component: ReportTemplateForm,
    componentProps: {
      templateType: templateType,
    },
  });
}

function openEditReportTemplateForm(template: ReportTemplate) {
  $q.dialog({
    component: ReportTemplateForm,
    componentProps: {
      reportTemplate: template,
      templateType: template.type,
    },
  });
}

function openReportAssets() {
  $q.dialog({
    component: ReportAssets,
  });
}

function openDataQueries() {
  $q.dialog({
    component: ReportDataQueryTable,
  });
}

function openHTMLTemplates() {
  $q.dialog({
    component: ReportHTMLTemplateTable,
  });
}

function openReportSchedules() {
  $q.dialog({
    component: ReportScheduleTable,
  });
}

function openReportHistory() {
  $q.dialog({
    component: ReportHistoryTable,
  });
}

function deleteTemplate(template: ReportTemplate) {
  $q.dialog({
    title: `Delete template: ${template.name}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(() => {
    deleteReportTemplate(template.id);
  });
}

async function cloneTemplate(template: ReportTemplate) {
  $q.dialog({
    component: ReportTemplateForm,
    componentProps: {
      cloneTemplate: template,
      templateType: template.type,
    },
  });
}

function importReportTemplate() {
  $q.dialog({
    component: ReportTemplateImport,
  });
}

function openSharedTemplates() {
  $q.dialog({
    component: SharedTemplatesImport,
  }).onDismiss(() => getReportTemplates());
}
</script>
