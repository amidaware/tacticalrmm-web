<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">Server Tasks</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        label="Add Server Task"
        @click="addServerTask"
      />
    </div>
    <q-separator />
    <q-table
      dense
      :rows="tasks"
      :columns="columns"
      :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: true }"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      no-data-label="No Server Tasks added yet"
    >
      <template v-slot:header-cell-enabled="props">
        <q-th auto-width :props="props">
          <q-icon name="power_settings_new" size="1.5em">
            <q-tooltip>Enabled</q-tooltip>
          </q-icon>
        </q-th>
      </template>

      <template v-slot:header-cell-smsalert="props">
        <q-th auto-width :props="props">
          <q-icon name="phone_android" size="1.5em">
            <q-tooltip>SMS Alert</q-tooltip>
          </q-icon>
        </q-th>
      </template>

      <template v-slot:header-cell-emailalert="props">
        <q-th auto-width :props="props">
          <q-icon name="email" size="1.5em">
            <q-tooltip>Email Alert</q-tooltip>
          </q-icon>
        </q-th>
      </template>

      <template v-slot:header-cell-dashboardalert="props">
        <q-th auto-width :props="props">
          <q-icon name="notifications" size="1.5em">
            <q-tooltip>Dashboard Alert</q-tooltip>
          </q-icon>
        </q-th>
      </template>

      <template v-slot:header-cell-status="props">
        <q-th auto-width :props="props"></q-th>
      </template>

      <!-- body slots -->
      <template v-slot:body="props">
        <q-tr
          :props="props"
          class="cursor-pointer"
          @dblclick="editServerTask(props.row)"
        >
          <!-- context menu -->
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item
                clickable
                v-close-popup
                @click="editServerTask(props.row)"
              >
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="deleteServerTask(props.row)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>Delete</q-item-section>
              </q-item>

              <q-separator />

              <q-item
                clickable
                v-close-popup
                @click="executeServerTask(props.row)"
              >
                <q-item-section side>
                  <q-icon name="play_arrow" />
                </q-item-section>
                <q-item-section>Run Server Task</q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup>
                <q-item-section>Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- enabled -->
          <q-td>
            <q-checkbox
              dense
              v-model="props.row.enabled"
              @update:model-value="
                editTask(props.row.id, { enabled: props.row.enabled })
              "
            />
          </q-td>
          <!-- text alert -->
          <q-td>
            <q-checkbox
              dense
              v-model="props.row.text_alert"
              @update:model-value="
                editTask(props.row.id, { text_alert: props.row.text_alert })
              "
            />
          </q-td>
          <!-- email alert -->
          <q-td>
            <q-checkbox
              dense
              v-model="props.row.email_alert"
              @update:model-value="
                editTask(props.row.id, { email_alert: props.row.email_alert })
              "
            />
          </q-td>
          <!-- dashboard alert -->
          <q-td>
            <q-checkbox
              dense
              v-model="props.row.dashboard_alert"
              @update:model-value="
                editTask(props.row.id, {
                  dashboard_alert: props.row.dashboard_alert,
                })
              "
            />
          </q-td>
          <!-- status icon -->
          <q-td v-if="Object.keys(props.row.task_result).length === 0"></q-td>
          <q-td v-else-if="props.row.task_result.status === 'passing'">
            <q-icon
              style="font-size: 1.3rem"
              :color="dashPositiveColor"
              name="check_circle"
            >
              <q-tooltip>Passing</q-tooltip>
            </q-icon>
          </q-td>
          <q-td v-else-if="props.row.task_result.status === 'failing'">
            <q-icon
              v-if="props.row.alert_severity === 'info'"
              style="font-size: 1.3rem"
              :color="dashInfoColor"
              name="info"
            >
              <q-tooltip>Informational</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="props.row.alert_severity === 'warning'"
              style="font-size: 1.3rem"
              :color="dashWarningColor"
              name="warning"
            >
              <q-tooltip>Warning</q-tooltip>
            </q-icon>
            <q-icon
              v-else
              style="font-size: 1.3rem"
              :color="dashNegativeColor"
              name="error"
            >
              <q-tooltip>Error</q-tooltip>
            </q-icon>
          </q-td>
          <q-td v-else></q-td>
          <!-- name -->
          <q-td>{{ props.row.name }}</q-td>
          <!-- schedule -->
          <q-td>{{
            props.row.crontab_schedule ? props.row.crontab_schedule : "Manual"
          }}</q-td>
          <!-- more info -->
          <q-td
            v-if="
              props.row.task_result.retcode !== null ||
              props.row.task_result.stdout ||
              props.row.task_result.stderr
            "
          >
            <span
              style="cursor: pointer; text-decoration: underline"
              class="text-primary"
              @click="showScriptOutput(props.row)"
              >output</span
            >
          </q-td>
          <q-td v-else>Awaiting output</q-td>
          <!-- last run -->
          <q-td v-if="props.row.task_result.last_run">{{
            formatDate(props.row.task_result.last_run)
          }}</q-td>
          <q-td v-else>Has not run yet</q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
// composition imports
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { QTableColumn, useQuasar } from "quasar";
import { fetchServerTasks, removeServerTask, runServerTask } from "@/api/core";
import { updateTask } from "@/api/tasks";
import { notifyError, notifySuccess } from "@/utils/notify";

// ui imports
import AutomatedTaskForm from "@/components/tasks/AutomatedTaskForm.vue";
import ScriptOutput from "@/components/checks/ScriptOutput.vue";

// types
import type { AutomatedTask } from "@/types/tasks";

// setup quasar
const $q = useQuasar();

const store = useStore();

const dashWarningColor = computed(() => store.state.dash_warning_color);
const dashNegativeColor = computed(() => store.state.dash_negative_color);
const dashPositiveColor = computed(() => store.state.dash_positive_color);
const dashInfoColor = computed(() => store.state.dash_info_color);
const formatDate = computed(() => store.getters.formatDate);

const tasks = ref([] as AutomatedTask[]);

const columns: QTableColumn[] = [
  { name: "enabled", align: "left", field: "enabled", label: "" },
  { name: "smsalert", field: "text_alert", align: "left", label: "" },
  { name: "emailalert", field: "email_alert", align: "left", label: "" },
  {
    name: "dashboardalert",
    field: "dashboard_alert",
    align: "left",
    label: "",
  },
  { name: "status", field: "status", align: "left", label: "" },
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "crontab_schedule",
    label: "Schedule",
    field: "crontab_schedule",
    align: "left",
    sortable: true,
  },
  {
    name: "moreinfo",
    label: "More Info",
    field: "more_info",
    align: "left",
    sortable: true,
  },
  {
    name: "datetime",
    label: "Last Run Time",
    field: "last_run",
    align: "left",
    sortable: true,
  },
];

async function getServerTasks() {
  $q.loading.show();
  try {
    const result = await fetchServerTasks();
    tasks.value = result;
  } catch (e) {
    console.error(e);
  }

  $q.loading.hide();
}

function addServerTask() {
  $q.dialog({
    component: AutomatedTaskForm,
    componentProps: {
      type: "server",
    },
  }).onOk(getServerTasks);
}

function editServerTask(task: AutomatedTask) {
  $q.dialog({
    component: AutomatedTaskForm,
    componentProps: {
      task: task,
      type: "server",
    },
  }).onOk(getServerTasks);
}

async function executeServerTask(task: AutomatedTask) {
  try {
    await runServerTask(task.id);
    notifySuccess(
      "Server task sent successfully. Check script output after script execution.",
    );
  } catch (e) {
    notifyError(`Unable to run task: ${e}`);
  }
}

function showScriptOutput(task: AutomatedTask) {
  $q.dialog({
    component: ScriptOutput,
    componentProps: {
      scriptInfo: task.task_result,
    },
  });
}

function deleteServerTask(task: AutomatedTask) {
  $q.dialog({
    title: `Delete Server Task: ${task.name}?`,
    cancel: true,
    ok: { label: "Delete", color: "negative" },
  }).onOk(async () => {
    $q.loading.show();

    try {
      await removeServerTask(task.id);
      await getServerTasks();
      notifySuccess(`Server Task: ${task.name} was deleted!`);
    } catch (e) {
      console.error(e);
    }

    $q.loading.hide();
  });
}

interface EditTaskRequest {
  text_alert?: boolean;
  email_alert?: boolean;
  dashboard_alert?: boolean;
  enabled?: boolean;
}

async function editTask(task_id: number, data: EditTaskRequest) {
  try {
    const result = await updateTask(task_id, data);
    notifySuccess(result);
  } catch (e) {
    console.error(e);
  }
}

onMounted(getServerTasks);
</script>
