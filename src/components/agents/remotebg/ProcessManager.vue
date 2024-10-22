<template>
  <q-table
    dense
    :table-class="{
      'table-bgcolor': !$q.dark.isActive,
      'table-bgcolor-dark': $q.dark.isActive,
    }"
    class="remote-bg-tbl-sticky"
    :style="{ 'max-height': `${$q.screen.height - 36}px` }"
    :rows="processes"
    :columns="columns"
    :pagination="{ rowsPerPage: 0, sortBy: 'cpu_percent', descending: true }"
    :filter="filter"
    row-key="id"
    binary-state-sort
    :rows-per-page-options="[0]"
    :loading="loading"
  >
    <template v-slot:top>
      <div class="q-gutter-md flex flex-center items-center">
        <q-btn
          v-if="isPolling"
          dense
          flat
          push
          @click="stopPoll"
          icon="stop"
          label="Stop Live Refresh"
        />
        <q-btn
          v-else
          dense
          flat
          push
          @click="startPoll"
          icon="play_arrow"
          label="Resume Live Refresh"
        />

        <div class="flex flex-center q-ml-md">
          <q-icon name="fas fa-microchip" class="q-mr-xs" />
          <div class="text-caption q-mr-sm">
            CPU Usage:
            <span class="text-body1 text-weight-medium"
              >{{ totalCpuUsage }}%</span
            >
          </div>

          <q-icon name="fas fa-memory" class="q-mr-xs" />
          <div class="text-caption">
            RAM Usage:
            <span class="text-body1 text-weight-medium"
              >{{ bytes2Human(totalRamUsage) }}/{{ total_ram }} GB</span
            >
          </div>
        </div>

        <q-space />

        <div class="q-pa-md q-gutter-sm">
          <q-btn
            :disable="pollInterval === 1"
            dense
            @click="pollIntervalChanged('subtract')"
            push
            icon="remove"
            size="sm"
            color="grey"
          />
          <q-btn
            dense
            push
            icon="add"
            size="sm"
            color="grey"
            @click="pollIntervalChanged('add')"
          />
        </div>

        <div class="text-overline">
          <q-badge
            align="middle"
            size="sm"
            class="text-h6"
            color="blue"
            :label="pollInterval"
          />
          Refresh interval (seconds)
        </div>

        <q-space />

        <q-input v-model="filter" outlined label="Search" dense clearable>
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </template>
    <template v-slot:body="props">
      <q-tr :props="props" class="cursor-pointer">
        <q-menu context-menu auto-close>
          <q-list dense style="min-width: 200px">
            <q-item
              clickable
              @click="killProcess(props.row.pid, props.row.name)"
            >
              <q-item-section side>
                <q-icon name="fas fa-trash-alt" size="xs" />
              </q-item-section>
              <q-item-section>End Process</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable>
              <q-item-section>Close</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <q-td>{{ props.row.name }}</q-td>
        <q-td>{{ props.row.cpu_percent }}%</q-td>
        <q-td>{{ bytes2Human(props.row.membytes) }}</q-td>
        <q-td>{{ props.row.username }}</q-td>
        <q-td>{{ props.row.pid }}</q-td>
      </q-tr>
    </template>
  </q-table>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  fetchAgent,
  fetchAgentProcesses,
  killAgentProcess,
} from "@/api/agents";
import { bytes2Human } from "@/utils/format";
import { notifySuccess } from "@/utils/notify";

const columns = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "cpu_percent",
    label: "CPU",
    field: "cpu_percent",
    align: "left",
    sortable: true,
    sort: (a, b) => parseFloat(b) < parseFloat(a),
  },
  {
    name: "membytes",
    label: "Memory",
    field: "membytes",
    align: "left",
    sortable: true,
  },
  {
    name: "username",
    label: "User",
    field: "username",
    align: "left",
    sortable: true,
  },
  {
    name: "pid",
    label: "PID",
    field: "pid",
    align: "left",
    sortable: true,
  },
];

export default {
  name: "ProcessManager",
  props: {
    agent_id: !String,
  },
  setup(props) {
    // polling setup
    const pollInterval = ref(2);
    const poll = ref(null);
    const isPolling = computed(() => !!poll.value);

    function startPoll() {
      stopPoll();
      getProcesses();
      poll.value = setInterval(() => {
        getProcesses();
      }, pollInterval.value * 1000);
    }

    function stopPoll() {
      if (poll.value) {
        clearInterval(poll.value);
        poll.value = null;
      }
    }

    function pollIntervalChanged(action) {
      if (action === "add") {
        pollInterval.value++;
      } else if (action === "subtract" && pollInterval.value > 1) {
        pollInterval.value--;
      }
      if (isPolling.value) {
        startPoll();
      }
    }

    // process manager logic
    const processes = ref([]);
    const filter = ref("");
    const total_ram = ref(0);

    const loading = ref(false);

    const totalCpuUsage = computed(() => {
      if (!Array.isArray(processes.value) || processes.value.length === 0) {
        return "0.00";
      }

      const total = processes.value.reduce((acc, proc) => {
        const cpuPercent = parseFloat(proc.cpu_percent);

        if (isNaN(cpuPercent)) {
          return acc;
        }

        return acc + cpuPercent;
      }, 0);

      return total.toFixed(2);
    });

    const totalRamUsage = computed(() => {
      return processes.value.reduce((acc, proc) => acc + proc.membytes, 0);
    });

    async function getProcesses() {
      loading.value = true;
      try {
        processes.value = await fetchAgentProcesses(props.agent_id);
      } catch (error) {
        console.error(error);
      }
      loading.value = false;
    }

    async function killProcess(pid) {
      loading.value = true;
      let result = "";
      try {
        result = await killAgentProcess(props.agent_id, pid);
        notifySuccess(result);
      } catch (e) {
        console.error(error);
      }
      loading.value = false;
    }

    // lifecycle hooks
    onMounted(async () => {
      total_ram.value = (await fetchAgent(props.agent_id)).total_ram;
      startPoll();
    });

    onBeforeUnmount(() => clearInterval(poll.value));

    return {
      // reactive data
      processes,
      filter,
      total_ram,
      isPolling,
      pollInterval,
      loading,
      totalCpuUsage,
      totalRamUsage,

      // non-reactive data
      columns,

      //methods
      getProcesses,
      killProcess,
      startPoll,
      stopPoll,
      pollIntervalChanged,
      bytes2Human,
    };
  },
};
</script>
