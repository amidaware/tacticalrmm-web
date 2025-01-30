import { ref } from "vue";
import axios from "axios";

import { notifySuccess } from "@/utils/notify";
import type { AlertTemplate } from "./types";

const baseUrl = "/alerts";

export function useAlertTemplate() {
  const alertTemplates = ref<AlertTemplate[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getAlertTemplates() {
    isLoading.value = true;
    isError.value = false;

    axios
      .get(`${baseUrl}/templates/`)
      .then(({ data }) => {
        alertTemplates.value = data;
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function editAlertTemplate(id: number, payload: Partial<AlertTemplate>) {
    isLoading.value = true;
    isError.value = false;

    axios
      .put(`${baseUrl}/templates/${id}/`, payload)
      .then(({ data }: { data: AlertTemplate }) => {
        const index = alertTemplates.value.findIndex(
          (alertTemplate) => alertTemplate.id === data.id,
        );
        alertTemplates.value[index] = data;
        notifySuccess("AlertTemplate was modified successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function addAlertTemplate(payload: AlertTemplate) {
    isLoading.value = true;
    isError.value = false;

    axios
      .post(`${baseUrl}/templates/`, payload)
      .then(({ data }: { data: AlertTemplate }) => {
        const index = alertTemplates.value.findIndex(
          (alertTemplate) => alertTemplate.id === data.id,
        );
        alertTemplates.value[index] = data;
        notifySuccess("AlertTemplate was added successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function deleteAlertTemplate(id: number) {
    isLoading.value = true;
    isError.value = false;

    axios
      .delete(`${baseUrl}/templates/${id}/`)
      .then(({ data }: { data: AlertTemplate }) => {
        const index = alertTemplates.value.findIndex(
          (alertTemplate) => alertTemplate.id === data.id,
        );
        alertTemplates.value.splice(index, 1);
        notifySuccess("AlertTemplate was deleted successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  return {
    alertTemplates,
    isLoading,
    isError,

    getAlertTemplates,
    addAlertTemplate,
    editAlertTemplate,
    deleteAlertTemplate,
  };
}

export const useAlertTemplateShared = useAlertTemplate();
