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
  </tactical-table>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { usePatchPolicyShared } from "../api";

// ui
import TacticalTable from "@/components/ui/TacticalTable.vue";
import PatchPolicyForm from "./PatchPolicyForm.vue";

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
    name: "schedule",
    label: "Schedule",
    align: "left",
    field: "schedule",
    sortable: false,
    format: (val: PatchSchedule) =>
      val.frequency === "daily"
        ? "Daily at " + val.time
        : val.frequency === "weekly"
          ? `Weekly on ${val.day_of_week} at ${val.time}`
          : `Monthly on ${val.day_of_month} at ${val.time}`,
    filterType: "text",
  },
  {
    name: "include_critical_updates",
    label: "Critical Updates",
    align: "center",
    field: "include_critical_updates",
    sortable: false,
    filterType: "boolean",
  },
  {
    name: "include_security_updates",
    label: "Security Updates",
    align: "center",
    field: "include_security_updates",
    sortable: false,
    filterType: "boolean",
  },
  {
    name: "include_optional_updates",
    label: "Optional Updates",
    align: "center",
    field: "include_optional_updates",
    sortable: false,
    filterType: "boolean",
  },
  {
    name: "include_preview_updates",
    label: "Preview Updates",
    align: "center",
    field: "include_preview_updates",
    sortable: false,
    filterType: "boolean",
  },
  {
    name: "auto_reboot",
    label: "Auto Reboot",
    align: "center",
    field: "auto_reboot",
    sortable: false,
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
];

const { getPatchPolicies, patchPolicies, deletePatchPolicy, isLoading } = usePatchPolicyShared;

const selected = ref<PatchPolicy[]>([]);

const $q = useQuasar();

function openAddPolicyForm() {
  $q.dialog({
    component: PatchPolicyForm,
  });
}

function openEditPolicyForm(policy: PatchPolicy) {
  $q.dialog({
    component: PatchPolicyForm,
    componentProps: { policy },
  });
}

onMounted(getPatchPolicies);
</script>
