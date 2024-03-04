export type AgentPlatformType = "windows" | "linux" | "darwin";

export interface Agent {
  id: number;
  agent_id: string;
  hostname: string;
  client: string;
  site: string;
  plat: AgentPlatformType;
}
