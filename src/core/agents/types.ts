export type AgentPlat = "windows" | "linux" | "darwin";
export type AgentMonitoringType = "server" | "workstation";
export type GoArch = "amd64" | "386" | "arm64" | "arm";

export interface Agent {
  id: number;
  version: string;
  operating_system?: string;
  plat: AgentPlat;
  goarch?: GoArch;
  hostname: string;
  agent_id: string;
  last_seen?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services?: any;
  public_ip?: string;
  total_ram?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disks?: any;
  boot_time?: number;
  logged_in_username?: string;
  last_logged_in_user?: string;
  monitoring_type: AgentMonitoringType;
  description?: string;
  mesh_node_id?: string;
  overdue_email_alert: boolean;
  overdue_text_alert: boolean;
  overdue_dashboard_alert: boolean;
  offline_time: number;
  overdue_time: number;
  check_interval: number;
  needs_reboot: boolean;
  choco_installed: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wmi_detail?: any;
  patches_last_installed?: Date;
  time_zone?: string;
  maintenance_mode: boolean;
  block_policy_inheritance: boolean;
  alert_template?: number;
  site: number;
  policy?: number;
  patch_policy: number;
}
