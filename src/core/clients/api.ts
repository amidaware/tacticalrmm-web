import { ref } from "vue";
import axios from "axios";

import { notifySuccess } from "@/utils/notify";
import type { Client, Site } from "./types";

const baseUrl = "/clients";

export function useClient() {
  const clients = ref<Client[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getClients() {
    isLoading.value = true;
    isError.value = false;

    axios
      .get(`${baseUrl}/`)
      .then(({ data }) => {
        clients.value = data;
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function editClient(id: number, payload: Partial<Client>) {
    isLoading.value = true;
    isError.value = false;

    axios
      .put(`${baseUrl}/${id}/`, payload)
      .then(({ data }: { data: Client }) => {
        const index = clients.value.findIndex(
          (client) => client.id === data.id,
        );
        clients.value[index] = data;
        notifySuccess("Client was modified successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function addClient(payload: Client) {
    isLoading.value = true;
    isError.value = false;

    axios
      .post(`${baseUrl}/`, payload)
      .then(({ data }: { data: Client }) => {
        const index = clients.value.findIndex(
          (client) => client.id === data.id,
        );
        clients.value[index] = data;
        notifySuccess("Client was added successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function deleteClient(id: number) {
    isLoading.value = true;
    isError.value = false;

    axios
      .delete(`${baseUrl}/${id}/`)
      .then(({ data }: { data: Client }) => {
        const index = clients.value.findIndex(
          (client) => client.id === data.id,
        );
        clients.value.splice(index, 1);
        notifySuccess("Client was deleted successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  return {
    clients,
    isLoading,
    isError,

    getClients,
    addClient,
    editClient,
    deleteClient,
  };
}

export const useClientShared = useClient();

export function useSite() {
  const sites = ref<Site[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getSites() {
    isLoading.value = true;
    isError.value = false;

    axios
      .get(`${baseUrl}/sites/`)
      .then(({ data }) => {
        sites.value = data;
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function editSite(id: number, payload: Partial<Site>) {
    isLoading.value = true;
    isError.value = false;

    axios
      .put(`${baseUrl}/sites/${id}/`, payload)
      .then(({ data }: { data: Site }) => {
        const index = sites.value.findIndex((site) => site.id === data.id);
        sites.value[index] = data;
        notifySuccess("Site was modified successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function addSite(payload: Site) {
    isLoading.value = true;
    isError.value = false;

    axios
      .post(`${baseUrl}/sites/`, payload)
      .then(({ data }: { data: Site }) => {
        const index = sites.value.findIndex((site) => site.id === data.id);
        sites.value[index] = data;
        notifySuccess("Site was added successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function deleteSite(id: number) {
    isLoading.value = true;
    isError.value = false;

    axios
      .delete(`${baseUrl}/sites/${id}/`)
      .then(({ data }: { data: Site }) => {
        const index = sites.value.findIndex((site) => site.id === data.id);
        sites.value.splice(index, 1);
        notifySuccess("Site was deleted successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  return {
    sites,
    isLoading,
    isError,

    getSites,
    addSite,
    editSite,
    deleteSite,
  };
}

export const useSiteShared = useSite();
