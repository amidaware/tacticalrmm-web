<template>
  <div class="row q-col-gutter-md">
    <div class="col-xs-12 col-md-6">
      <q-card flat bordered class="fit">
        <q-card-section>
          <div class="text-h6">Patching Status</div>
          <q-linear-progress
            :value="0.16"
            color="green"
            track-color="grey-5"
            class="q-mt-sm"
          >
            <div class="text-subtitle2">16% - 350 out of 2167 devices</div>
          </q-linear-progress>
        </q-card-section>
        <q-card-section>
          <div class="row justify-between q-mt-md">
            <div
              v-for="platform in platforms"
              :key="platform.name"
              class="col text-center"
            >
              <q-icon :name="platform.icon" size="36px" color="orange" />
              <div class="text-subtitle1">{{ platform.name }}</div>
              <div>{{ platform.percentage }}%</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div class="col-xs-12 col-md-6">
      <div class="row q-col-gutter-md fit">
        <div v-for="stat in stats" :key="stat.title" class="col-xs-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1">{{ stat.count }}</div>
              <div class="text-caption">{{ stat.title }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <div class="col-xs-12 col-md-6">
      <q-card flat bordered class="fit">
        <q-card-section>
          <div class="text-h6">Device Compliance</div>
        </q-card-section>
        <q-card-section>
          <apex-chart
            type="donut"
            height="200"
            :options="complianceOptions"
            :series="complianceData"
          />
        </q-card-section>
      </q-card>
    </div>

    <div class="col-xs-12 col-md-6">
      <q-card flat bordered class="fit">
        <q-card-section>
          <div class="row justify-between">
            <div class="text-h6">Top Vulnerable Devices</div>
          </div>
        </q-card-section>
        <q-table
          :rows="vulnerableDevices"
          :columns="vulnerableDevicesColumns"
          flat
          dense
          row-key="device_name"
        />
      </q-card>
    </div>

    <div class="col-xs-12 col-md-6">
      <q-card flat bordered class="fit">
        <q-card-section>
          <div class="text-h6">Patch Installation Status</div>
        </q-card-section>
        <q-card-section>
          <apex-chart
            type="bar"
            height="300"
            :options="patchStatusOptions"
            :series="patchStatusData"
          />
        </q-card-section>
      </q-card>
    </div>

    <div class="col-xs-12 col-md-6">
      <q-card flat bordered class="fit">
        <q-card-section>
          <div class="text-h6">Patch Trend Over Time</div>
        </q-card-section>
        <q-card-section>
          <apex-chart
            type="line"
            height="300"
            :options="patchTrendOptions"
            :series="patchTrendData"
          />
        </q-card-section>
      </q-card>
    </div>

    <div class="col-xs-12 col-md-6">
      <q-card flat bordered class="fit">
        <q-card-section>
          <div class="row justify-between">
            <div class="text-h6">Top Missing OS Patches</div>
            <q-btn flat label="See all patches" size="sm" />
          </div>
        </q-card-section>
        <q-table
          :rows="missingPatches"
          :columns="missingPatchesColumns"
          flat
          dense
          row-key="patch_name"
        />
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import ApexChart from "vue3-apexcharts";
import { useQuasar } from "quasar";

const $q = useQuasar();
const isDarkMode = computed(() => $q.dark.isActive);

watch(isDarkMode, (newValue) => {
  const data = {
    theme: {
      mode: newValue ? "dark" : "light",
    },
  };
  complianceOptions = { ...complianceOptions, ...data };
  patchStatusOptions = { ...patchStatusOptions, ...data };
  patchTrendOptions = { ...patchTrendOptions, ...data };
});

// platform data
const platforms = [
  { name: "Windows PC", icon: "mdi-microsoft-windows", percentage: 30 },
  { name: "Windows Server", icon: "mdi-server", percentage: 25 },
  { name: "Mac", icon: "mdi-apple", percentage: 20 },
  { name: "Linux", icon: "mdi-linux", percentage: 25 },
];

// compliance data
const complianceData = [60, 30, 10];
let complianceOptions = reactive({
  labels: ["Fully Patched", "Partially Patched", "Non-Compliant"],
  chart: { background: "transparent" },
  theme: {
    mode: isDarkMode.value ? "dark" : "light",
  },
});

// patch stats data
const stats = [
  { title: "Missing critical patches", count: "165 devices" },
  { title: "Pending review", count: "2572 OS patches" },
  { title: "Missing OS patches", count: "1817 devices" },
  { title: "Pending reboot", count: "69 devices" },
];

// vulnerable devices data
const vulnerableDevices = [
  { device_name: "Device-1", device_type: "Server", missing_patches: 76 },
  { device_name: "Device-3", device_type: "Workstation", missing_patches: 71 },
  { device_name: "Device-4", device_type: "Server", missing_patches: 48 },
  { device_name: "Device-2", device_type: "Workstation", missing_patches: 45 },
  { device_name: "Device-34", device_type: "Workstation", missing_patches: 42 },
  { device_name: "Device-36", device_type: "Server", missing_patches: 33 },
];

const vulnerableDevicesColumns = [
  { name: "device_name", label: "Device Name", field: "device_name" },
  { name: "device_type", label: "Device Type", field: "device_type" },
  {
    name: "missing_patches",
    label: "Missing Patches",
    field: "missing_patches",
  },
];

// patch status data
const patchStatusData = [
  { name: "Successful", data: [120, 95, 80, 60] },
  { name: "Pending", data: [30, 20, 15, 10] },
  { name: "Failed", data: [5, 10, 8, 6] },
];
let patchStatusOptions = reactive({
  chart: { type: "bar", background: "transparent" },
  xaxis: { categories: ["Windows", "Linux", "Mac", "Server"] },
  theme: {
    mode: isDarkMode.value ? "dark" : "light",
  },
});

// patch trend data
const patchTrendData = [
  { name: "Patches Applied", data: [50, 70, 65, 90, 80, 100] },
  { name: "Patches Failed", data: [5, 3, 4, 2, 6, 1] },
];
let patchTrendOptions = reactive({
  chart: { type: "line", background: "transparent" },
  xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
  theme: {
    mode: isDarkMode.value ? "dark" : "light",
  },
});

// patches missing data
const missingPatches = [
  {
    patch_name: "2024-10 Cumulative Update",
    classification: "Critical",
    os_type: "Windows",
    devices: 50,
  },
  {
    patch_name: "Kernel Update 5.12",
    classification: "Important",
    os_type: "Linux",
    devices: 30,
  },
];

const missingPatchesColumns = [
  { name: "patch_name", label: "Patch Name", field: "patch_name" },
  { name: "classification", label: "Classification", field: "classification" },
  { name: "os_type", label: "OS Type", field: "os_type" },
  { name: "devices", label: "Devices", field: "devices" },
];
</script>
