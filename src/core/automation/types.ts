export interface Policy {
  id: number;
  name: string;
  desc: string;
  active: boolean;
  alert_template: number;
  server_policy: number;
  workstation_policy: number;
  excluded_clients: number[];
  excluded_sites: number[];
  excluded_agents: number[];
}
