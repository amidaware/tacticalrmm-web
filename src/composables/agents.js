import { computed, ref } from "vue";
import { useStore } from "vuex";
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
      flat
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
  const store = useStore();
  const placeholders = computed(() => store.state.run_cmd_placeholder_text);

  if (shell === "cmd") return placeholders.value.cmd;
  else if (shell === "powershell") return placeholders.value.powershell;
  else return placeholders.value.shell;
}

export const agentPlatformOptions = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "darwin", label: "macOS" },
];
