export type AlertSeverity = "info" | "warning" | "error";

export type AlertTemplateActionType =
  | "availability"
  | "check"
  | "task"
  | "custom";

export interface AlertTemplate {
  id: number;
  name: string;
  is_active: boolean;
  action_type: AlertTemplateActionType;
  action?: number;
  action_rest?: number;
  action_args: string[];
  action_env_vars: string[];
  action_timeout: number;
  resolved_action_type: AlertTemplateActionType;
  resolved_action?: number;
  resolved_action_rest?: number;
  resolved_action_args: string[];
  resolved_action_env_vars: string[];
  resolved_action_timeout: number;
  email_recipients: string[];
  text_recipients: string[];
  email_from?: string;
  agent_email_on_resolved?: boolean;
  agent_text_on_resolved?: boolean;
  agent_always_email?: boolean;
  agent_always_text?: boolean;
  agent_always_alert?: boolean;
  agent_periodic_alert_days?: number;
  agent_script_actions?: boolean;
  check_email_alert_severity: AlertSeverity[];
  check_text_alert_severity: AlertSeverity[];
  check_dashboard_alert_severity: AlertSeverity[];
  check_email_on_resolved?: boolean;
  check_text_on_resolved?: boolean;
  check_always_email?: boolean;
  check_always_text?: boolean;
  check_always_alert?: boolean;
  check_periodic_alert_days?: number;
  check_script_actions?: boolean;
  task_email_alert_severity: AlertSeverity[];
  task_text_alert_severity: AlertSeverity[];
  task_dashboard_alert_severity: AlertSeverity[];
  task_email_on_resolved?: boolean;
  task_text_on_resolved?: boolean;
  task_always_email?: boolean;
  task_always_text?: boolean;
  task_always_alert?: boolean;
  task_periodic_alert_days?: number;
  task_script_actions?: boolean;
  exclude_workstations?: boolean;
  exclude_servers?: boolean;
  excluded_sites: number[];
  excluded_clients: number[];
  excluded_agents: number[];
}
