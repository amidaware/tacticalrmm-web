export interface CoreSetting {
  block_local_user_logon: boolean;
  all_timezones: string[];
  default_time_zone: string;
  email_alert_recipients: string[];
  email_subject_template: string;
  email_body_template: string;
  check_email_subject_template: string;
  check_email_body_template: string;
  task_email_subject_template: string;
  task_email_body_template: string;
  agent_outage_email_subject_template: string;
  agent_outage_email_body_template: string;
  agent_recovery_email_subject_template: string;
  agent_recovery_email_body_template: string;
}
