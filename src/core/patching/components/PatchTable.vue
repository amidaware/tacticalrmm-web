<template>
  <tactical-table
    :rows="patches"
    :columns="columns"
    row-key="id"
    binary-state-sort
    virtual-scroll
    :rows-per-page-options="[0]"
    column-select
    filter-header
    view-table-key="patch-table"
    :exclude-columns="patchPolicySelected ? [] : ['status']"
    :loading="isLoading"
    selection="multiple"
    v-model:selected="selected"
    storage-key="patching-patch-table"
  >
    <template v-slot:top-buttons>
      <div class="q-gutter-sm">
        <q-btn-dropdown
          v-if="patchPolicySelected"
          label="Change Status"
          no-caps
          :disable="selected.length === 0"
          flat
          outline
        >
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="updatePatchStatus(selected, PatchStatus.Approved)"
            >
              <q-item-section>
                <q-item-label>Approve</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="updatePatchStatus(selected, PatchStatus.NotApproved)"
            >
              <q-item-section>
                <q-item-label>Not Approved</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="updatePatchStatus(selected, PatchStatus.Uninstall)"
            >
              <q-item-section>
                <q-item-label>Uninstall</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          label="Add to Policy"
          no-caps
          :disable="selected.length === 0"
          flat
          outline
          @click="openPatchPolicySelector(selected)"
        />
      </div>
    </template>

    <template v-slot:body-cell-requires_reboot="props">
      <q-td :props="props" auto-width>
        <q-icon v-if="props.row.requires_reboot" name="check" />
      </q-td>
    </template>

    <template v-slot:body-cell-agent_count="props">
      <q-td :props="props">
        <div>
          <q-btn
            :label="
              props.row.agent_count > 0
                ? `${props.row.agent_count} Agents`
                : '0 Agents'
            "
            outline
            rounded
            no-caps
            size="sm"
            :to="{ name: 'patching-devices' }"
          />
        </div>
      </q-td>
    </template>
    <template v-slot:body-cell-installed_agents="props">
      <q-td :props="props">
        <q-linear-progress
          :value="props.row.installed_agents / props.row.agent_count"
          color="primary"
        />
        <q-tooltip>{{
          `${props.row.installed_agents} / ${props.row.agent_count} Agents Installed`
        }}</q-tooltip>
      </q-td>
    </template>
  </tactical-table>
</template>

<script lang="ts" setup>
import { onMounted, computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useQuasar } from "quasar";
import { usePatchShared } from "../api";
import { capitalize } from "@/utils/format";

// ui
import TacticalTable from "../../dashboard/ui/components/TacticalTable.vue";

// types
import {
  patchClassificationArray,
  patchStatusArray,
  PatchStatus,
  patchPlatformArray,
  Patch,
} from "../types";
import PatchPolicySelector from "./PatchPolicySelector.vue";

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
    name: "classification",
    label: "Classification",
    align: "left",
    field: "classification",
    sortable: true,
    format: (val: string) => capitalize(val),
    filterType: "select",
    filterOptions: patchClassificationArray.map((item) => capitalize(item)),
  },
  {
    name: "description",
    label: "Description",
    align: "left",
    field: "description",
    sortable: true,
    filterType: "text",
  },
  {
    name: "software",
    label: "Software",
    align: "left",
    field: "software",
    sortable: true,
    filterType: "text",
  },
  {
    name: "vendor_id",
    label: "Vendor ID",
    align: "left",
    field: "vendor_id",
    sortable: true,
    filterType: "text",
  },
  {
    name: "status",
    label: "Status",
    align: "left",
    field: "status",
    sortable: true,
    format: (val: string) => capitalize(val),
    filterType: "select",
    filterOptions: patchStatusArray.map((item) => capitalize(item)),
  },
  {
    name: "size",
    label: "Size (KB)",
    align: "right",
    field: "size",
    sortable: true,
    format: (val: string) => `${val} KB`,
    filterType: "text",
  },
  {
    name: "requires_reboot",
    label: "Reboot Required",
    align: "center",
    field: "requires_reboot",
    sortable: true,
    filterType: "boolean",
  },
  {
    name: "last_action_date",
    label: "Status Changed Date",
    align: "left",
    field: "last_action_date",
    sortable: true,
    format: (val: string) => (val ? new Date(val).toLocaleDateString() : ""),
    filterType: "date",
  },
  {
    name: "last_action_by",
    label: "Changed By",
    align: "left",
    field: "last_action_by",
    sortable: true,
    filterType: "text",
  },
  {
    name: "installed_agents",
    label: "Installed",
    align: "left",
    field: "installed_agents",
    sortable: true,
  },
  {
    name: "agent_count",
    label: "Agents",
    align: "left",
    field: "agent_count",
    sortable: true,
  },
];

const { patches, getPatches, updatePatchStatus, isLoading } = usePatchShared;

const selected = ref<Patch[]>([]);

const $q = useQuasar();

const route = useRoute();

const patchPolicySelected = computed(() => !!route.query.patchPolicy);

function openPatchPolicySelector(patches: Patch[]) {
  $q.dialog({
    component: PatchPolicySelector,
    componentProps: {
      patches,
    },
  });
}

onMounted(getPatches);
</script>
