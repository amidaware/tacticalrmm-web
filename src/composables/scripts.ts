import { ref, watch, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { fetchScripts } from "@/api/scripts";
import {
  formatScriptOptions,
  removeExtraOptionCategories,
} from "@/utils/format";
import type { Script } from "@/types/scripts";
import { AgentPlatformType } from "@/types/agents";

export interface ScriptOption extends Script {
  label: string;
  value: number;
}

export interface useScriptDropdownParams {
  script?: number; // set a selected script on init
  onMount?: boolean; // loads script options on mount
}

// script dropdown
export function useScriptDropdown(opts: useScriptDropdownParams) {
  const scriptOptions = ref([] as ScriptOption[]);
  const defaultTimeout = ref(30);
  const defaultArgs = ref([] as string[]);
  const defaultEnvVars = ref([] as string[]);
  const script = ref(opts.script);
  const scriptName = ref("");
  const syntax = ref<string | undefined>("");
  const link = ref<string | undefined>("");
  const baseUrl =
    "https://github.com/amidaware/community-scripts/blob/main/scripts/";

  // specify parameters to filter out community scripts
  async function getScriptOptions(showCommunityScripts = false) {
    scriptOptions.value = Object.freeze(
      formatScriptOptions(await fetchScripts({ showCommunityScripts })),
    ) as ScriptOption[];
  }

  // watch scriptPk for changes and update the default timeout and args
  watch([script, scriptOptions], () => {
    if (script.value && scriptOptions.value.length > 0) {
      const tmpScript = scriptOptions.value.find(
        (i) => i.value === script.value,
      );

      if (tmpScript) {
        defaultTimeout.value = tmpScript.default_timeout;
        defaultArgs.value = tmpScript.args;
        defaultEnvVars.value = tmpScript.env_vars;
        syntax.value = tmpScript.syntax;
        scriptName.value = tmpScript.name;
        link.value =
          tmpScript.script_type === "builtin"
            ? `${baseUrl}${tmpScript.filename}`
            : undefined;
      }
    }
  });

  // vuex show community scripts
  const store = useStore();
  const showCommunityScripts = computed(() => store.state.showCommunityScripts);

  // filter for only getting server tasks
  const serverScriptOptions = computed(() =>
    removeExtraOptionCategories(
      scriptOptions.value.filter(
        (script) =>
          script.category ||
          !script.supported_platforms ||
          script.supported_platforms.length === 0 ||
          script.supported_platforms.includes("linux"),
      ),
    ),
  );

  const filterByPlatformOptions = (plat: AgentPlatformType | undefined) => {
    if (!plat) {
      return scriptOptions.value;
    }

    return removeExtraOptionCategories(
      scriptOptions.value.filter(
        (script) =>
          script.category ||
          !script.supported_platforms ||
          script.supported_platforms.length === 0 ||
          script.supported_platforms.includes(plat),
      ),
    );
  };

  function reset() {
    defaultTimeout.value = 30;
    defaultArgs.value = [];
    defaultEnvVars.value = [];
    script.value = undefined;
    syntax.value = "";
    link.value = "";
  }

  if (opts.onMount)
    onMounted(() => getScriptOptions(showCommunityScripts.value));

  return {
    //data
    script,
    defaultTimeout,
    defaultArgs,
    defaultEnvVars,
    scriptName,
    syntax,
    link,

    scriptOptions, // unfiltered options
    serverScriptOptions, //only scripts that can run on server

    //methods
    getScriptOptions,
    filterByPlatformOptions,
    reset,
  };
}

export const shellOptions = [
  { label: "Powershell", value: "powershell" },
  { label: "Batch", value: "cmd" },
  { label: "Python", value: "python" },
  { label: "Shell", value: "shell" },
  { label: "Nushell", value: "nushell" },
  { label: "Deno", value: "deno" },
];
