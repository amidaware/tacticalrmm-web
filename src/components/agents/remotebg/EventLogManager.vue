<template>
  <div v-if="agentPlatform.toLowerCase() !== 'windows'" class="q-pa-sm">
    {{ $t("agents.shared.onlySupportedWindows") }}
  </div>
  <div v-else>
    <div class="row q-pt-sm q-pl-sm">
      <div class="col-2">
        <q-select
          dense
          options-dense
          outlined
          v-model="days"
          :options="lastDaysOptions"
          :label="showDays"
        />
      </div>
      <div class="col-7"></div>
      <div class="col-3">
        <code v-if="events">{{
          $t("agents.eventLogManager.totalRecords", {
            logType,
            count: events.length,
          })
        }}</code>
      </div>
    </div>
    <q-table
      dense
      :table-class="{
        'table-bgcolor': !$q.dark.isActive,
        'table-bgcolor-dark': $q.dark.isActive,
      }"
      class="remote-bg-tbl-sticky"
      :rows="events"
      :columns="columns"
      :style="{ 'max-height': `${$q.screen.height - 85}px` }"
      :pagination="{ rowsPerPage: 0, sortBy: 'record', descending: true }"
      :filter="filter"
      row-key="uid"
      binary-state-sort
      virtual-scroll
      :rows-per-page-options="[0]"
      :loading="loading"
    >
      <template v-slot:top>
        <q-btn dense flat push @click="getEventLog" icon="refresh" />
        <q-space />
        <q-radio
          v-model="logType"
          color="cyan"
          val="Application"
          :label="$t('agents.eventLogManager.logTypes.application')"
          @update:model-value="getEventLog"
        />
        <q-radio
          v-model="logType"
          color="cyan"
          val="System"
          :label="$t('agents.eventLogManager.logTypes.system')"
        />
        <q-radio
          v-model="logType"
          color="cyan"
          val="Security"
          :label="$t('agents.eventLogManager.logTypes.security')"
        />
        <q-space />
        <q-input
          v-model="filter"
          style="width: 300px"
          outlined
          :label="$t('common.buttons.search')"
          dense
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <!-- file download doesn't work so disabling -->
        <export-table-btn
          v-show="false"
          class="q-ml-sm"
          :columns="columns"
          :data="events"
        />
      </template>
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td>{{ props.row.eventType }}</q-td>
          <q-td>{{ props.row.source }}</q-td>
          <q-td>{{ props.row.eventID }}</q-td>
          <q-td>{{ props.row.time }}</q-td>
          <q-td @click="showEventMessage(props.row.message)">
            <span
              style="cursor: pointer; text-decoration: underline"
              class="text-primary"
              >{{ truncateText(props.row.message, 30) }}</span
            >
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script>
// composition imports
import { ref, computed, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchAgentEventLog } from "@/api/agents";
import { truncateText } from "@/utils/format";

// ui imports
import ExportTableBtn from "@/components/ui/ExportTableBtn.vue";
import PreDialog from "@/components/ui/PreDialog.vue";

const lastDaysOptions = [1, 2, 3, 4, 5, 10, 30, 60, 90, 180, 360, 9999];

export default {
  name: "EventLogManager",
  components: {
    ExportTableBtn,
  },
  props: {
    agent_id: !String,
    agentPlatform: !String,
  },
  setup(props) {
    // quasar setup
    const $q = useQuasar();
    const { t } = useI18n();

    // eventlog manager
    const events = ref([]);
    const logType = ref("Application");
    const days = ref(1);
    const filter = ref("");
    const loading = ref(false);

    const showDays = computed(() =>
      t("agents.eventLogManager.showLastDays", { days: days.value }),
    );

    const columns = computed(() => [
      {
        name: "eventType",
        label: t("agents.eventLogManager.columns.type"),
        field: "eventType",
        align: "left",
        sortable: true,
      },
      {
        name: "source",
        label: t("agents.eventLogManager.columns.source"),
        field: "source",
        align: "left",
        sortable: true,
      },
      {
        name: "eventID",
        label: t("agents.eventLogManager.columns.eventId"),
        field: "eventID",
        align: "left",
        sortable: true,
      },
      {
        name: "time",
        label: t("agents.eventLogManager.columns.time"),
        field: "time",
        align: "left",
        sortable: true,
      },
      {
        name: "message",
        label: t("agents.eventLogManager.columns.message"),
        field: "message",
        align: "left",
        sortable: true,
      },
    ]);

    watch([logType, days], getEventLog);

    async function getEventLog() {
      loading.value = true;
      events.value = await fetchAgentEventLog(
        props.agent_id,
        logType.value,
        days.value,
      );
      loading.value = false;
    }

    function showEventMessage(message) {
      $q.dialog({
        component: PreDialog,
        componentProps: {
          dialogStyle: "width: 85vw; max-width: 90vw",
          message: message,
        },
      });
    }

    // vue lifecycle hooks
    onMounted(() => {
      if (props.agentPlatform === "windows") getEventLog();
    });

    return {
      // reactive data
      events,
      logType,
      days,
      filter,
      showDays,
      loading,

      // non-reactive data
      columns,
      lastDaysOptions,

      // methods
      getEventLog,
      showEventMessage,
      truncateText,
    };
  },
};
</script>
