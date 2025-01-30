import { ref } from "vue";
import axios from "axios";

import { notifySuccess } from "@/utils/notify";
import type { Agent } from "./types";

const baseUrl = "/agents";

export function useAgent() {
  const agents = ref<Agent[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getAgents() {
    isLoading.value = true;
    isError.value = false;

    axios
      .get(`${baseUrl}/`)
      .then(({ data }) => {
        agents.value = data;
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function editAgent(agent_id: string, payload: Partial<Agent>) {
    isLoading.value = true;
    isError.value = false;

    axios
      .put(`${baseUrl}/${agent_id}/`, payload)
      .then(({ data }: { data: Agent }) => {
        const index = agents.value.findIndex((agent) => agent.id === data.id);
        agents.value[index] = data;
        notifySuccess("Agent was modified successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function deleteAgent(agent_id: string) {
    isLoading.value = true;
    isError.value = false;

    axios
      .delete(`${baseUrl}/${agent_id}/`)
      .then(({ data }: { data: Agent }) => {
        const index = agents.value.findIndex((agent) => agent.id === data.id);
        agents.value.splice(index, 1);
        notifySuccess("Agent was deleted successfully");
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  return {
    agents,
    isLoading,
    isError,

    getAgents,
    editAgent,
    deleteAgent,
  };
}

export const useAgentShared = useAgent();
