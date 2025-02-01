import { ref, onMounted, computed } from "vue";
import { useAgentShared } from "./api";
import { Option } from "../dashboard/types";

import type { Agent } from "./types";

export function useAgentDropdown() {
  const { agents, getAgents } = useAgentShared;

  const agent = ref<Agent | undefined>();

  const agentOptions = computed(() => {
    return _formatAgentOptions(agents.value);
  });

  onMounted(getAgents);

  return {
    agent,
    agentOptions,
  };
}

export function _formatAgentOptions(data: Agent[]): Option[] {
  console.log(data);
  const agents = data.map(({ hostname, agent_id, client_name, site_name }) => ({
    label: hostname,
    value: agent_id,
    cat: `${client_name} > ${site_name}`,
  }));

  agents.sort((a, b) => a.label.localeCompare(b.label));

  const categoryMap = new Map<string, { label: string; value: string }[]>();

  for (const agent of agents) {
    if (!categoryMap.has(agent.cat)) {
      categoryMap.set(agent.cat, []);
    }
    categoryMap
      .get(agent.cat)!
      .push({ label: agent.label, value: agent.value });
  }

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([category, agents]) => [{ category }, ...agents]);
}
