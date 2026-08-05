<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="min-width: 80vw">
      <q-bar>
        {{ evtLogData.readable_desc }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("checks.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <div v-if="evtLogData.check_result.extra_details !== null">
        <q-table
          dense
          style="height: 65vh"
          :table-class="{
            'table-bgcolor': !$q.dark.isActive,
            'table-bgcolor-dark': $q.dark.isActive,
          }"
          class="tabs-tbl-sticky"
          :filter="filter"
          :rows="evtLogData.check_result.extra_details.log"
          :columns="columns"
          v-model:pagination="pagination"
          row-key="uid"
          binary-state-sort
          virtual-scroll
          :rows-per-page-options="[0]"
          :no-data-label="$t('checks.eventLogOutput.noEventLogs')"
        >
          <template v-slot:top>
            <q-space />
            <q-input
              v-model="filter"
              outlined
              :label="$t('checks.eventLogOutput.search')"
              dense
              clearable
              class="q-pr-sm"
            >
              <template v-slot:prepend>
                <q-icon name="search" color="primary" />
              </template>
            </q-input>
            <export-table-btn
              :data="evtLogData.check_result.extra_details.log"
              :columns="columns"
            />
          </template>
        </q-table>
      </div>
      <div v-else>{{ $t("checks.eventLogOutput.notRunYet") }}</div>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { computed, ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";

//ui imports
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";

// static data
const columns = [
  {
    name: "eventType",
    label: "checks.eventLogOutput.columns.type",
    field: "eventType",
    align: "left",
    sortable: true,
  },
  {
    name: "source",
    label: "checks.eventLogOutput.columns.source",
    field: "source",
    align: "left",
    sortable: true,
  },
  {
    name: "eventID",
    label: "checks.eventLogOutput.columns.eventId",
    field: "eventID",
    align: "left",
    sortable: true,
  },
  {
    name: "time",
    label: "checks.eventLogOutput.columns.time",
    field: "time",
    align: "left",
    sortable: true,
  },
  {
    name: "message",
    label: "checks.eventLogOutput.columns.message",
    field: "message",
    align: "left",
    sortable: true,
  },
];
export default {
  name: "EventLogCheckOutput",
  components: { ExportTableBtn },
  emits: [...useDialogPluginComponent.emits],
  props: { evtLogData: !Object },
  setup() {
    // setup quasar
    const { dialogRef, onDialogHide } = useDialogPluginComponent();
    const { t } = useI18n();

    const filter = ref("");
    const pagination = ref({
      rowsPerPage: 0,
      sortBy: "time",
      descending: true,
    });

    const localizedColumns = computed(() =>
      columns.map((column) => ({ ...column, label: t(column.label) })),
    );

    return {
      // reactive data
      filter,
      pagination,

      // non-reactive data
      columns: localizedColumns,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
