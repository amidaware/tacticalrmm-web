<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 400px">
      <q-bar>
        {{ t("reporting.dataQuerySelect.title") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            t("reporting.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section>
        <tactical-dropdown
          v-model="selectedQuery"
          :options="queryOptions"
          :label="t('reporting.common.dataQueries')"
          outlined
        />
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn dense flat :label="t('reporting.common.cancel')" v-close-popup />
        <q-btn
          :loading="loading"
          @click="submit"
          dense
          flat
          :label="t('reporting.common.select')"
          color="primary"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, computed, onMounted } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useSharedReportDataQueries } from "../api/reporting";
import { notifyError } from "@/utils/notify";
import { useI18n } from "vue-i18n";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props = defineProps<{ dataSources?: any }>();

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { t } = useI18n();

const { reportDataQueries, getReportDataQueries } = useSharedReportDataQueries;

const selectedQuery = ref<string | null>(null);
const loading = ref(false);

const queryOptions = computed(() => {
  if (props.dataSources === undefined)
    return reportDataQueries.value.map((query) => query.name);
  else return Object.keys(props.dataSources);
});

function submit() {
  if (selectedQuery.value === null)
    notifyError(t("reporting.dataQuerySelect.selectQueryFromDropdown"));
  else {
    let dataQuery;
    if (props.dataSources === undefined) {
      dataQuery = reportDataQueries.value.find(
        (query) => query.name === selectedQuery.value,
      );
    } else {
      dataQuery = {
        id: 0,
        name: selectedQuery.value,
        json_query: props.dataSources[selectedQuery.value],
      };
    }
    onDialogOK(dataQuery);
  }
}

onMounted(() => {
  if (props.dataSources === undefined) {
    getReportDataQueries();
  }
});
</script>
