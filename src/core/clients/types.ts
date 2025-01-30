export interface Client {
  id: number;
  name: string;
  block_policy_inheritance: boolean;
  failing_checks: {
    error: boolean;
    warning: boolean;
  };
  workstation_policy?: number;
  server_policy?: number;
  alert_template?: number;
  patch_policy?: number;
  sites: Site[];
}

export interface Site {
  id: number;
  name: string;
  client: number;
  block_policy_inheritance: boolean;
  failing_checks: {
    error: boolean;
    warning: boolean;
  };
  workstation_policy?: number;
  server_policy?: number;
  alert_template?: number;
  patch_policy?: number;
}
