<template>
  <tactical-table
    :rows="agents"
    :columns="columns"
    row-key="id"
    binary-state-sort
    virtual-scroll
    :rows-per-page-options="[0]"
    column-select
    filter-header
    view-table-key="device-table"
    :loading="isLoading"
    selection="multiple"
    v-model:selected="selected"
    storage-key="patching-device-table"
  >
    <template v-slot:top-buttons>
      <div class="q-gutter-sm">
        <q-btn-dropdown
          label="Actions"
          no-caps
          flat
          :disable="selected.length === 0"
        >
          <q-list>
            <q-item clickable v-close-popup :disable="selected.length === 0">
              <q-item-section>
                <q-item-label>Patch Scan</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-close-popup :disable="selected.length === 0">
              <q-item-section>
                <q-item-label>Patch Install</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup :disable="selected.length === 0">
              <q-item-section>
                <q-item-label>Patch Uninstall</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          label="Assign to Patch Policy"
          no-caps
          flat
          :disable="selected.length === 0"
        />
      </div>
    </template>

    <template v-slot:body-cell-needs_reboot="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.needs_reboot" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-patch_count="props">
      <q-td :props="props">
        <div>
          <q-btn
            :label="
              props.row.patch_count > 0
                ? `${props.row.patch_count} Patches`
                : '0 Patches'
            "
            outline
            rounded
            no-caps
            size="sm"
            :to="{ name: 'patching-patches' }"
          />
        </div>
      </q-td>
    </template>

    <template v-slot:body-cell-installed_patches="props">
      <q-td :props="props">
        <q-linear-progress
          :value="props.row.installed_patches / props.row.patch_count"
          :color="
            props.row.installed_patches / props.row.patch_count > 0.5
              ? 'primary'
              : 'negative'
          "
        >
          <q-tooltip>{{
            `${props.row.installed_patches} / ${props.row.patch_count} Patches Installed`
          }}</q-tooltip>
        </q-linear-progress>
      </q-td>
    </template>
  </tactical-table>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { capitalize } from "@/utils/format";

// ui
import TacticalTable from "../../dashboard/ui/components/TacticalTable.vue";

// types
import { patchPlatformArray, Patch } from "../types";
import { AgentPatchTable } from "../types";
import { useTimeoutFn } from "@vueuse/shared";

const columns = [
  {
    name: "hostname",
    label: "Hostname",
    align: "left",
    field: "hostname",
    sortable: true,
    filterType: "text",
  },
  {
    name: "client",
    label: "Client",
    align: "left",
    field: "client",
    sortable: true,
    filterType: "text",
  },
  {
    name: "site",
    label: "Site",
    align: "left",
    field: "site",
    sortable: true,
    filterType: "text",
  },
  {
    name: "platform",
    label: "Platform",
    align: "left",
    field: "platform",
    sortable: true,
    format: (val: string) => capitalize(val),
    filterType: "select",
    filterOptions: patchPlatformArray.map((item) => capitalize(item)),
  },
  {
    name: "operating_system",
    label: "Operating System",
    align: "left",
    field: "operating_system",
    sortable: true,
    filterType: "text",
  },
  {
    name: "patch_policy",
    label: "Patch Policy",
    align: "left",
    field: "patch_policy",
    sortable: true,
    filterType: "text",
  },
  {
    name: "needs_reboot",
    label: "Reboot Needed",
    align: "center",
    field: "needs_reboot",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "patch_install_date",
    label: "Patches Installed",
    align: "left",
    field: "patch_install_date",
    sortable: true,
    format: (val: string) => (val ? new Date(val).toLocaleDateString() : ""),
    filterType: "date",
  },
  {
    name: "patch_install_by",
    label: "Installed By",
    align: "left",
    field: "patch_install_by",
    sortable: true,
    filterType: "text",
  },
  {
    name: "patch_scan_date",
    label: "Last Checked",
    align: "left",
    field: "last_patch_scan_date",
    sortable: true,
    format: (val: string) => (val ? new Date(val).toLocaleDateString() : ""),
    filterType: "date",
  },
  {
    name: "patch_scan_by",
    label: "Scan Initiated By",
    align: "left",
    field: "patch_scan_by",
    sortable: true,
    filterType: "text",
  },
  {
    name: "installed_patches",
    label: "Patch Compliance",
    align: "left",
    field: "installed_patches",
    sortable: true,
  },
  {
    name: "patch_count",
    label: "Patches",
    align: "left",
    field: "patch_count",
    sortable: true,
  },
];

const agentPatchData: AgentPatchTable[] = [
  {
    id: 1,
    hostname: "host01.example.com",
    platform: "windows",
    operating_system: "Windows 10 Pro",
    client: "Client A",
    site: "Site 1",
    patch_policy: "Critical Updates",
    needs_reboot: true,
    patch_install_date: "2025-01-10",
    patch_install_by: "admin01",
    last_patch_scan_date: "2025-01-15",
    patch_scan_by: "scanner01",
    installed_patches: 120,
    patch_count: 150,
  },
  {
    id: 2,
    hostname: "host02.example.com",
    platform: "linux",
    operating_system: "Ubuntu 20.04",
    client: "Client B",
    site: "Site 2",
    patch_policy: "Security Updates",
    needs_reboot: false,
    patch_install_date: "2025-01-12",
    patch_install_by: "admin02",
    last_patch_scan_date: "2025-01-18",
    patch_scan_by: "scanner02",
    installed_patches: 90,
    patch_count: 95,
  },
  {
    id: 3,
    hostname: "host03.example.com",
    platform: "mac",
    operating_system: "macOS Ventura",
    client: "Client C",
    site: "Site 1",
    patch_policy: "All Updates",
    needs_reboot: false,
    patch_install_date: "2025-01-08",
    patch_install_by: "admin03",
    last_patch_scan_date: "2025-01-14",
    patch_scan_by: "scanner03",
    installed_patches: 70,
    patch_count: 72,
  },
  {
    id: 4,
    hostname: "host04.example.com",
    platform: "windows",
    operating_system: "Windows Server 2019",
    client: "Client A",
    site: "Site 3",
    patch_policy: "Critical Updates",
    needs_reboot: true,
    patch_install_date: "2025-01-05",
    patch_install_by: "admin04",
    last_patch_scan_date: "2025-01-11",
    patch_scan_by: "scanner04",
    installed_patches: 150,
    patch_count: 200,
  },
  {
    id: 5,
    hostname: "host05.example.com",
    platform: "linux",
    operating_system: "CentOS 7",
    client: "Client D",
    site: "Site 2",
    patch_policy: "Security Updates",
    needs_reboot: false,
    patch_install_date: "2025-01-01",
    patch_install_by: "admin05",
    last_patch_scan_date: "2025-01-10",
    patch_scan_by: "scanner05",
    installed_patches: 60,
    patch_count: 70,
  },
  {
    id: 6,
    hostname: "host06.example.com",
    platform: "mac",
    operating_system: "macOS Monterey",
    client: "Client C",
    site: "Site 4",
    patch_policy: "All Updates",
    needs_reboot: true,
    patch_install_date: "2025-01-14",
    patch_install_by: "admin06",
    last_patch_scan_date: "2025-01-19",
    patch_scan_by: "scanner06",
    installed_patches: 45,
    patch_count: 50,
  },
  {
    id: 7,
    hostname: "host07.example.com",
    platform: "windows",
    operating_system: "Windows 11 Pro",
    client: "Client B",
    site: "Site 1",
    patch_policy: "Critical Updates",
    needs_reboot: false,
    patch_install_date: "2025-01-09",
    patch_install_by: "admin07",
    last_patch_scan_date: "2025-01-17",
    patch_scan_by: "scanner07",
    installed_patches: 110,
    patch_count: 130,
  },
  {
    id: 8,
    hostname: "host08.example.com",
    platform: "linux",
    operating_system: "Debian 11",
    client: "Client D",
    site: "Site 3",
    patch_policy: "Security Updates",
    needs_reboot: true,
    patch_install_date: "2025-01-07",
    patch_install_by: "admin08",
    last_patch_scan_date: "2025-01-16",
    patch_scan_by: "scanner08",
    installed_patches: 75,
    patch_count: 80,
  },
  {
    id: 9,
    hostname: "host09.example.com",
    platform: "mac",
    operating_system: "macOS Big Sur",
    client: "Client A",
    site: "Site 2",
    patch_policy: "All Updates",
    needs_reboot: false,
    patch_install_date: "2025-01-13",
    patch_install_by: "admin09",
    last_patch_scan_date: "2025-01-20",
    patch_scan_by: "scanner09",
    installed_patches: 85,
    patch_count: 100,
  },
  {
    id: 10,
    hostname: "host10.example.com",
    platform: "windows",
    operating_system: "Windows Server 2022",
    client: "Client B",
    site: "Site 4",
    patch_policy: "Critical Updates",
    needs_reboot: true,
    patch_install_date: "2025-01-06",
    patch_install_by: "admin10",
    last_patch_scan_date: "2025-01-12",
    patch_scan_by: "scanner10",
    installed_patches: 200,
    patch_count: 250,
  },
];

const selected = ref<Patch[]>([]);
const agents = ref([] as AgentPatchTable[]);
const isLoading = ref(false);

onMounted(() => {
  isLoading.value = true;
  useTimeoutFn(() => {
    agents.value = agentPatchData;
    isLoading.value = false;
  }, 1000);
});
</script>
