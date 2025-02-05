<template>
  <tactical-table
    :rows="patchPolicies"
    :columns="columns"
    row-key="id"
    binary-state-sort
    virtual-scroll
    :rows-per-page-options="[0]"
    column-select
    filter-header
    :loading="isLoading"
    selection="single"
    v-model:selected="selected"
  >
    <template v-slot:top>
      <div class="q-gutter-sm">
        <q-btn label="Add Policy" no-caps @click="openAddPolicyForm" />
        <q-btn-dropdown
          label="Manage Policy"
          no-caps
          :disable="selected.length === 0"
        >
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="selected.length > 0 && openEditPolicyForm(selected[0])"
            >
              <q-item-section>
                <q-item-label>Edit</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="selected.length > 0 && deletePatchPolicy(selected[0].id)"
            >
              <q-item-section>
                <q-item-label>Delete</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </template>

    <template v-slot:body-cell-include_critical_updates="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.include_critical_updates" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-include_security_updates="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.include_security_updates" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-include_optional_updates="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.include_optional_updates" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-include_preview_updates="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.include_preview_updates" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-include_hardware_updates="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.include_hardware_updates" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-auto_reboot="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.auto_reboot" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-exclusions="props">
      <q-td :props="props">
        <div>
          <q-btn
            :label="`${props.row.excluded_agents.length + props.row.excluded_clients.length + props.row.excluded_sites.length} Exclusions`"
            outline
            rounded
            no-caps
            size="sm"
            @click="openPolicyExclusions(props.row)"
          />
        </div>
      </q-td>
    </template>

    <template v-slot:body-cell-applied_to="props">
      <q-td :props="props">
        <div>
          <q-btn
            :label="`Applied to ${props.row.applied_agents.length + props.row.applied_clients.length + props.row.applied_sites.length}`"
            outline
            rounded
            no-caps
            size="sm"
            @click="openPolicyApplied(props.row)"
          />
        </div>
      </q-td>
    </template>
  </tactical-table>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { usePatchPolicyShared } from "../api";

// ui
import TacticalTable from "@/components/ui/TacticalTable.vue";
import PatchPolicyForm from "./PatchPolicyForm.vue";
import PatchPolicyExclusionsForm from "./PatchPolicyExclusionsForm.vue";
import PatchPolicyApplied from "./PatchPolicyApplied.vue";

// types
import { PatchPolicy, PatchSchedule } from "../types";

const columns = [
  {
    name: "name",
    label: "Name",
    align: "left",
    field: "name",
    sortable: true,
    filterType: "text",
  },
  {
    name: "description",
    label: "Description",
    align: "left",
    field: "description",
    sortable: false,
    filterType: "text",
  },
  {
    name: "scan_schedule",
    label: "Scan Schedule",
    align: "left",
    field: "scan_schedule",
    sortable: false,
    format: (val: PatchSchedule) =>
      val.frequency === "daily"
        ? "Daily at " + val.time
        : val.frequency === "weekly"
          ? `Weekly on ${val.day_of_week} at ${val.time}`
          : `Monthly on ${val.day_of_month} at ${val.time}`,
  },
  {
    name: "install_schedule",
    label: "Install Schedule",
    align: "left",
    field: "install_schedule",
    sortable: false,
    format: (val: PatchSchedule) =>
      val.frequency === "daily"
        ? "Daily at " + val.time
        : val.frequency === "weekly"
          ? `Weekly on ${val.day_of_week} at ${val.time}`
          : `Monthly on ${val.day_of_month} at ${val.time}`,
  },
  {
    name: "include_critical_updates",
    label: "Critical Updates",
    align: "center",
    field: "include_critical_updates",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "include_security_updates",
    label: "Security Updates",
    align: "center",
    field: "include_security_updates",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "include_optional_updates",
    label: "Optional Updates",
    align: "center",
    field: "include_optional_updates",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "include_preview_updates",
    label: "Preview Updates",
    align: "center",
    field: "include_preview_updates",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "include_hardware_updates",
    label: "Hardware Updates",
    align: "center",
    field: "include_hardware_updates",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "auto_reboot",
    label: "Auto Reboot",
    align: "center",
    field: "auto_reboot",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "created_by",
    label: "Created By",
    align: "left",
    field: "created_by",
    sortable: true,
    filterType: "text",
  },
  {
    name: "created_at",
    label: "Created At",
    align: "left",
    field: "created_at",
    sortable: true,
    format: (val: string) => (val ? new Date(val).toLocaleDateString() : ""),
    filterType: "date",
  },
  {
    name: "applied_to",
    label: "Applied To",
    align: "center",
    field: "applied_to",
    sortable: false,
  },
  {
    name: "exclusions",
    label: "Exclusions",
    align: "center",
    field: "exclusions",
    sortable: false,
  },
];

const { getPatchPolicies, patchPolicies, deletePatchPolicy, isLoading } =
  usePatchPolicyShared;

const selected = ref<PatchPolicy[]>([]);

const $q = useQuasar();

function openAddPolicyForm() {
  $q.dialog({
    component: PatchPolicyForm,
  });
}

function openEditPolicyForm(patchPolicy: PatchPolicy) {
  $q.dialog({
    component: PatchPolicyForm,
    componentProps: { patchPolicy },
  });
}

function openPolicyExclusions(patchPolicy: PatchPolicy) {
  $q.dialog({
    component: PatchPolicyExclusionsForm,
    componentProps: { patchPolicy },
  });
}

function openPolicyApplied(patchPolicy: PatchPolicy) {
  $q.dialog({
    component: PatchPolicyApplied,
    componentProps: { patchPolicy },
  });
}

onMounted(getPatchPolicies);
</script>
