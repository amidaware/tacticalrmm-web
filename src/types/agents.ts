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
