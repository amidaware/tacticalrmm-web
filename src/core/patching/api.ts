import { ref } from "vue";
import { useTimeoutFn } from "@vueuse/shared";
import axios from "axios";

import { notifySuccess } from "@/utils/notify";
import type { Patch, PatchStatusType, PatchPolicy } from "./types";

const baseUrl = "/patching";

const testMode = true;

const patchTestData = [
  {
    id: 1,
    agent_count: 3,
    platform: "windows",
    classification: "package",
    name: "Patch 1",
    description: "Description of patch 1",
    software: "Software 50",
    vendor_id: "vendor-638",
    status: "not approved",
    size: 912,
    requires_reboot: false,
    installed_agents: 2,
    last_action_date: "2024-12-29T22:12:51Z",
    last_action_by: "admin6",
  },
  {
    id: 2,
    agent_count: 0,
    platform: "linux",
    classification: "critical",
    name: "Patch 2",
    description: "Description of patch 2",
    software: "Software 18",
    vendor_id: "vendor-512",
    status: "pending approval",
    size: 3487,
    requires_reboot: false,
    installed_agents: 0,
    last_action_date: "",
    last_action_by: "",
  },
  {
    id: 3,
    agent_count: 5,
    platform: "linux",
    classification: "package",
    name: "Patch 3",
    description: "Description of patch 3",
    software: "Software 27",
    vendor_id: "vendor-411",
    status: "pending approval",
    size: 2725,
    requires_reboot: false,
    installed_agents: 2,
    last_action_date: "",
    last_action_by: "",
  },
  {
    id: 4,
    agent_count: 35,
    platform: "mac",
    classification: "recommended",
    name: "Patch 4",
    description: "Description of patch 4",
    software: "Software 34",
    vendor_id: "vendor-279",
    status: "pending approval",
    size: 3920,
    requires_reboot: false,
    installed_agents: 22,
    last_action_date: "",
    last_action_by: "",
  },
  {
    id: 5,
    agent_count: 4,
    platform: "mac",
    classification: "hardware",
    name: "Patch 5",
    description: "Description of patch 5",
    software: "Software 2",
    vendor_id: "vendor-453",
    status: "uninstall",
    size: 2515,
    requires_reboot: true,
    installed_agents: 4,
    last_action_date: "2024-08-17T16:57:47Z",
    last_action_by: "admin5",
  },
  {
    id: 6,
    agent_count: 8,
    platform: "linux",
    classification: "critical",
    name: "Patch 6",
    description: "Description of patch 6",
    software: "Software 11",
    vendor_id: "vendor-810",
    status: "pending approval",
    size: 2864,
    requires_reboot: true,
    installed_agents: 0,
    last_action_date: "",
    last_action_by: "",
  },
  {
    id: 7,
    agent_count: 5,
    platform: "windows",
    classification: "feature",
    name: "Patch 7",
    description: "Description of patch 7",
    software: "Software 3",
    vendor_id: "vendor-730",
    status: "approved",
    size: 3613,
    requires_reboot: true,
    installed_agents: 4,
    last_action_date: "2024-02-04T20:05:45Z",
    last_action_by: "admin1",
  },
  {
    id: 8,
    agent_count: 3,
    platform: "windows",
    classification: "package",
    name: "Patch 8",
    description: "Description of patch 8",
    software: "Software 35",
    vendor_id: "vendor-802",
    status: "approved",
    size: 4065,
    requires_reboot: false,
    installed_agents: 1,
    last_action_date: "2024-12-26T08:57:31Z",
    last_action_by: "admin3",
  },
  {
    id: 9,
    agent_count: 18,
    platform: "linux",
    classification: "hardware",
    name: "Patch 9",
    description: "Description of patch 9",
    software: "Software 35",
    vendor_id: "vendor-931",
    status: "uninstall",
    size: 1500,
    requires_reboot: true,
    installed_agents: 7,
    last_action_date: "2024-08-22T17:42:51Z",
    last_action_by: "admin6",
  },
  {
    id: 10,
    agent_count: 6,
    platform: "mac",
    classification: "feature",
    name: "Patch 10",
    description: "Description of patch 10",
    software: "Software 49",
    vendor_id: "vendor-513",
    status: "uninstall",
    size: 2765,
    requires_reboot: false,
    installed_agents: 2,
    last_action_date: "2024-10-23T17:34:48Z",
    last_action_by: "admin9",
  },
] as Patch[];

export function usePatch() {
  const patches = ref<Patch[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getPatches() {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      const query = {};
      axios
        .get(`${baseUrl}/`, { params: query })
        .then(({ data }) => {
          patches.value = data;
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else
      useTimeoutFn(() => {
        patches.value = patchTestData;
        isLoading.value = false;
      }, 500);
  }

  function updatePatchStatus(selected: Patch[], status: PatchStatusType) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .put(`${baseUrl}/`, {
          ids: selected.map((item) => item.id),
          status: status,
        })
        .then(({ data }: { data: Patch[] }) => {
          data.forEach((item) => {
            const index = patches.value.findIndex(
              (patch) => patch.id === item.id,
            );
            patches.value[index] = item;
          });
          notifySuccess(`Successfully set the selected patches to ${status}`);
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else
      useTimeoutFn(() => {
        selected.forEach((item) => {
          const index = patches.value.findIndex(
            (patch) => patch.id === item.id,
          );
          patches.value[index].status = status;
        });

        isLoading.value = false;
        notifySuccess(`Successfully set the selected patches to ${status}`);
      }, 1000);
  }
  return {
    patches,
    isLoading,
    isError,

    getPatches,
    updatePatchStatus,
  };
}

export const usePatchShared = usePatch();

const policyTestData = [
  {
    id: 1,
    name: "Critical Updates",
    description: "Apply critical updates daily at 2 AM.",
    schedule: { frequency: "daily", time: "02:00" },
    include_critical_updates: true,
    include_security_updates: true,
    include_optional_updates: false,
    include_preview_updates: false,
    max_deferral_days: 7,
    auto_reboot: true,
    created_by: "admin1",
    created_at: "2024-12-01T12:00:00Z",
  },
  {
    id: 2,
    name: "Monthly Optional Updates",
    description: "Optional updates for all platforms, monthly.",
    schedule: { frequency: "monthly", time: "01:00", day_of_month: 15 },
    include_critical_updates: false,
    include_security_updates: false,
    include_optional_updates: true,
    include_preview_updates: true,
    max_deferral_days: 14,
    auto_reboot: false,
    created_by: "admin2",
    created_at: "2024-12-05T14:00:00Z",
  },
] as PatchPolicy[];

export function usePatchPolicy() {
  const policies = ref<PatchPolicy[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getPolicies() {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .get(`${baseUrl}/`)
        .then(({ data }) => {
          policies.value = data;
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        policies.value = policyTestData;
        isLoading.value = false;
      }, 500);
    }
  }

  function addPolicy(newPolicy: PatchPolicy) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .post(`${baseUrl}/`, newPolicy)
        .then(({ data }: { data: PatchPolicy }) => {
          policies.value.push(data);
          notifySuccess(`Policy "${data.name}" successfully added.`);
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        const newId =
          policies.value.length > 0
            ? Math.max(...policies.value.map((p) => p.id)) + 1
            : 1;
        const policyWithId = { ...newPolicy, id: newId };
        policies.value.push(policyWithId);
        isLoading.value = false;
        notifySuccess(
          `Policy "${newPolicy.name}" successfully added (test mode).`,
        );
      }, 1000);
    }
  }

  function editPolicy(updatedPolicy: PatchPolicy) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .put(`${baseUrl}/${updatedPolicy.id}/`, updatedPolicy)
        .then(({ data }: { data: PatchPolicy }) => {
          const index = policies.value.findIndex(
            (policy) => policy.id === data.id,
          );
          if (index !== -1) {
            policies.value[index] = data;
          }
          notifySuccess(`Policy "${data.name}" successfully updated.`);
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        const index = policies.value.findIndex(
          (policy) => policy.id === updatedPolicy.id,
        );
        if (index !== -1) {
          policies.value[index] = updatedPolicy;
        }
        isLoading.value = false;
        notifySuccess(
          `Policy "${updatedPolicy.name}" successfully updated (test mode).`,
        );
      }, 1000);
    }
  }

  function deletePolicy(policyId: number) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .delete(`${baseUrl}/${policyId}/`)
        .then(() => {
          policies.value = policies.value.filter(
            (policy) => policy.id !== policyId,
          );
          notifySuccess("Policy successfully deleted.");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        policies.value = policies.value.filter(
          (policy) => policy.id !== policyId,
        );
        isLoading.value = false;
        notifySuccess("Policy successfully deleted (test mode).");
      }, 1000);
    }
  }

  return {
    policies,
    isLoading,
    isError,
    getPolicies,
    addPolicy,
    editPolicy,
    deletePolicy,
  };
}

export const usePatchPolicyShared = usePatchPolicy();
