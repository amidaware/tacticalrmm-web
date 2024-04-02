import { ref } from "vue";
import { useDashboardStore } from "@/stores/dashboard";
import { fetchAgents } from "@/api/agents";
import { formatAgentOptions } from "@/utils/format";

// agent dropdown
export function useAgentDropdown() {
  const agent = ref(null);
  const agents = ref([]);
  const agentOptions = ref([]);

  // specifing flat returns an array of hostnames versus {value:id, label: hostname}
  async function getAgentOptions(flat = false) {
    agentOptions.value = formatAgentOptions(
      await fetchAgents({ detail: false }),
      flat,
    );
  }

  return {
    //data
    agent,
    agents,
    agentOptions,

    //methods
    getAgentOptions,
  };
}

export function cmdPlaceholder(shell) {
  const store = useDashboardStore();

  if (shell === "cmd") return store.runCmdPlaceholders.cmd;
  else if (shell === "powershell") return store.runCmdPlaceholders.powershell;
  else return store.runCmdPlaceholders.shell;
}

export const agentPlatformOptions = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "darwin", label: "macOS" },
];
