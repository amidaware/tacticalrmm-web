import type { AgentPlatformType } from "@/types/agents";

export type ScriptShellType = "powershell" | "cmd" | "shell" | "python" | "nushell" | "deno";

export interface Script {
  id?: number;
  name: string;
  description?: string;
  shell: ScriptShellType;
  default_timeout: number;
  category?: string;
  syntax?: string;
  args: string[];
  run_as_user: boolean;
  env_vars: string[];
  script_body: string;
  supported_platforms?: AgentPlatformType[];
  guid?: string;
  script_type: "userdefined" | "builtin";
  favorite: boolean;
  hidden: boolean;
  filename?: string;
}

export interface ScriptSnippet {
  id?: number;
  name: string;
  code: string;
  shell: ScriptShellType;
  desc?: string;
}
