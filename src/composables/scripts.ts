import { ref, watch, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { fetchScripts } from "@/api/scripts";
import { formatScriptOptions } from "@/utils/format.ts";

import type { Script } from "@/types/scripts";

export interface ScriptOption extends Script {
  label: string;
  value: number;
}

// script dropdown
export function useScriptDropdown(
  setScript = undefined,
  { onMount = false } = {},
) {
  const scriptOptions = ref([] as readonly ScriptOption[]);
  const scriptName = ref("");
  const defaultTimeout = ref(30);
  const defaultArgs = ref([] as string[]);
  const defaultEnvVars = ref([] as string[]);
  const script = ref<number | undefined>(setScript);
  const syntax = ref<string | undefined>("");
  const link = ref<string | undefined>("");
  const baseUrl =
    "https://github.com/amidaware/community-scripts/blob/main/scripts/";

  // specify parameters to filter out community scripts
  async function getScriptOptions(showCommunityScripts = false) {
    scriptOptions.value = Object.freeze(
      formatScriptOptions(
        await fetchScripts({ showCommunityScripts }),
      ) as ScriptOption[],
    );
  }

  // watch scriptPk for changes and update the default timeout and args
  watch([script, scriptOptions], () => {
    if (script.value && scriptOptions.value.length > 0) {
      const tmpScript = scriptOptions.value.find(
        (i) => i.value === script.value,
      );
      if (tmpScript) {
        scriptName.value = tmpScript.label;
        defaultTimeout.value = tmpScript.default_timeout;
        defaultArgs.value = tmpScript.args;
        defaultEnvVars.value = tmpScript.env_vars;
        syntax.value = tmpScript?.syntax;
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

  if (onMount) onMounted(() => getScriptOptions(showCommunityScripts.value));

  return {
    //data
    script,
    scriptOptions,
    defaultTimeout,
    defaultArgs,
    defaultEnvVars,
    syntax,
    link,
    scriptName,

    //methods
    getScriptOptions,
  };
}

export const shellOptions = [
  { label: "Powershell", value: "powershell" },
  { label: "Batch", value: "cmd" },
  { label: "Python", value: "python" },
  { label: "Shell", value: "shell" },
];
