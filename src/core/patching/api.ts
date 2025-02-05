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
    name: "Monthly Security Updates",
    description: "Policy to apply monthly security updates.",
    scan_schedule: {
      frequency: "monthly",
      time: "02:00",
      day_of_month: 15,
    },
    install_schedule: {
      frequency: "monthly",
      time: "02:00",
      day_of_month: 15,
    },
    include_critical_updates: true,
    include_security_updates: true,
    include_optional_updates: false,
    include_preview_updates: false,
    include_hardware_updates: true,
    max_deferral_days: 7,
    auto_reboot: true,
    notifications: {
      notify_on_failure: true,
      notify_on_success: false,
      recipients: ["admin@example.com", "security@example.com"],
    },
    created_by: "admin",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-02T00:00:00Z",
    patches_approved: [101, 102, 105, 109, 100],
    patches_not_approved: [101, 102, 105, 109, 100],
    patches_uninstall: [101, 102, 105, 109, 100],
    excluded_clients: [1001, 1002, 1005, 1008, 1009, 1111, 1225, 15412, 125],
    excluded_sites: [2001],
    excluded_agents: [3001],
  },
  {
    id: 2,
    name: "Weekly Maintenance",
    description: "Weekly patch maintenance policy.",
    scan_schedule: {
      frequency: "weekly",
      time: "03:30",
      day_of_week: "Sunday",
    },
    install_schedule: {
      frequency: "weekly",
      time: "03:30",
      day_of_week: "Sunday",
    },
    include_critical_updates: true,
    include_security_updates: false,
    include_optional_updates: true,
    include_preview_updates: true,
    include_hardware_updates: false,
    max_deferral_days: 5,
    auto_reboot: false,
    notifications: {
      notify_on_failure: false,
      notify_on_success: false,
      recipients: [],
    },
    created_by: "maintenance",
    created_at: "2023-02-01T00:00:00Z",
    updated_at: "2023-02-02T00:00:00Z",
    patches_approved: [110, 111],
    patches_not_approved: [210, 211],
    patches_uninstall: [310],
    excluded_clients: [],
    excluded_sites: [],
    excluded_agents: [],
  },
] as PatchPolicy[];

export function usePatchPolicy() {
  const patchPolicies = ref<PatchPolicy[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getPatchPolicies() {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .get(`${baseUrl}/`)
        .then(({ data }) => {
          patchPolicies.value = data;
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        patchPolicies.value = policyTestData;
        isLoading.value = false;
      }, 500);
    }
  }

  function addPatchPolicy(patchPolicy: PatchPolicy) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .post(`${baseUrl}/`, patchPolicy)
        .then(({ data }: { data: PatchPolicy }) => {
          patchPolicies.value.push(data);
          notifySuccess("Patch policy was added successfully.");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        const newId =
          patchPolicies.value.length > 0
            ? Math.max(...patchPolicies.value.map((p) => p.id)) + 1
            : 1;
        const policyWithId = { ...patchPolicy, id: newId };
        patchPolicies.value.push(policyWithId);
        isLoading.value = false;
        notifySuccess("Patch policy was added successfully (test mode).");
      }, 1000);
    }
  }

  function editPatchPolicy(id: number, patchPolicy: Partial<PatchPolicy>) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .put(`${baseUrl}/${id}/`, patchPolicy)
        .then(({ data }: { data: PatchPolicy }) => {
          const index = patchPolicies.value.findIndex(
            (policy) => policy.id === data.id,
          );
          if (index !== -1) {
            patchPolicies.value[index] = data;
          }
          notifySuccess("Patch policy was modified successfully.");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        const index = patchPolicies.value.findIndex(
          (policy) => policy.id === patchPolicy.id,
        );
        if (index !== -1) {
          patchPolicies.value[index] = {
            ...patchPolicies.value[index],
            ...patchPolicy,
          };
        }
        isLoading.value = false;
        notifySuccess("Patch policy was modified successfully (test mode).");
      }, 1000);
    }
  }

  function deletePatchPolicy(id: number) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .delete(`${baseUrl}/${id}/`)
        .then(() => {
          patchPolicies.value = patchPolicies.value.filter(
            (policy) => policy.id !== id,
          );
          notifySuccess("Policy successfully deleted.");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      useTimeoutFn(() => {
        patchPolicies.value = patchPolicies.value.filter(
          (policy) => policy.id !== id,
        );
        isLoading.value = false;
        notifySuccess("Policy successfully deleted (test mode).");
      }, 1000);
    }
  }

  return {
    patchPolicies,
    isLoading,
    isError,
    getPatchPolicies,
    addPatchPolicy,
    editPatchPolicy,
    deletePatchPolicy,
  };
}

export const usePatchPolicyShared = usePatchPolicy();
