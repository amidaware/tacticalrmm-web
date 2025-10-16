export type AgentPlatformType = "windows" | "linux" | "darwin";
export type AgentTab = "mixed" | "server" | "workstation";

export interface Agent {
  id: number;
  agent_id: string;
  hostname: string;
  client: string;
  site: string;
  plat: AgentPlatformType;
  monitoring_type: AgentTab;
}

export interface RegistryNode {
  id: string;
  label: string;
  lazy?: boolean;
  children?: RegistryNode[];
  isComputer?: boolean;
  isLoadMore?: boolean;
}
export interface RegistryValue {
  name: string;
  type: string;
  data: string | number | string[];
}
