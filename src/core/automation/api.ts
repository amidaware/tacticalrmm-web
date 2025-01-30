import { ref } from "vue";
import axios from "axios";

import { notifySuccess } from "@/utils/notify";
import type { Policy } from "./types";

const baseUrl = "/automation";

export function usePolicy() {
  const policies = ref<Policy[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getPolicies() {
    isLoading.value = true;
    isError.value = false;

    axios
      .get(`${baseUrl}/policies/`)
      .then(({ data }) => {
        policies.value = data;
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function editPolicy(id: number, payload: Partial<Policy>) {
    isLoading.value = true;
    isError.value = false;

    axios
      .put(`${baseUrl}/policies/${id}/`, payload)
      .then(({ data }: { data: Policy }) => {
        const index = policies.value.findIndex(
          (policy) => policy.id === data.id,
        );
        policies.value[index] = data;
        notifySuccess("Policy was modified successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function addPolicy(payload: Policy) {
    isLoading.value = true;
    isError.value = false;

    axios
      .post(`${baseUrl}/policies/`, payload)
      .then(({ data }: { data: Policy }) => {
        const index = policies.value.findIndex(
          (policy) => policy.id === data.id,
        );
        policies.value[index] = data;
        notifySuccess("Policy was added successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function deletePolicy(id: number) {
    isLoading.value = true;
    isError.value = false;

    axios
      .delete(`${baseUrl}/policies/${id}/`)
      .then(({ data }: { data: Policy }) => {
        const index = policies.value.findIndex(
          (policy) => policy.id === data.id,
        );
        policies.value.splice(index, 1);
        notifySuccess("Policy was deleted successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
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

export const usePolicyShared = usePolicy();
