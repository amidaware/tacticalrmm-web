export type PatchPlatformType = "windows" | "linux" | "mac";

export enum PatchPlatform {
  Windows = "windows",
  Linux = "linux",
  Mac = "mac",
}

export const patchPlatformArray: PatchPlatformType[] =
  Object.values(PatchPlatform);

export type PatchClassificationType =
  | "critical"
  | "security"
  | "feature"
  | "recommended"
  | "hardware"
  | "package";

export enum PatchClassification {
  Critical = "critical",
  Security = "security",
  Feature = "feature",
  Recommended = "recommended",
  Hardware = "hardware",
  Package = "package",
}

export const patchClassificationArray: PatchClassificationType[] =
  Object.values(PatchClassification);

export type PatchStatusType =
  | "approved"
  | "pending approval"
  | "not approved"
  | "uninstall";

export enum PatchStatus {
  Approved = "approved",
  PendingApproval = "pending approval",
  NotApproved = "not approved",
  Uninstall = "uninstall",
}

export const patchStatusArray: PatchStatusType[] = Object.values(PatchStatus);

export interface Patch {
  id: number;
  agent_count: number;
  platform: PatchPlatformType;
  classification: PatchClassificationType;
  name: string;
  description: string;
  software: string;
  vendor_id: string;
  status: PatchStatusType;
  size: number;
  requires_reboot: boolean;
  installed_agents: number;
  last_action_date: string;
  last_action_by: string;
}

export interface AgentPatchTable {
  id: number;
  hostname: string;
  platform: PatchPlatformType;
  operating_system: string;
  client: string;
  site: string;
  patch_policy: string;
  needs_reboot: boolean;
  patch_install_date?: string;
  patch_install_by: string;
  last_patch_scan_date?: string;
  patch_scan_by: string;
  installed_patches: number;
  patch_count: number;
}

export interface PatchPolicy {
  id: number;
  name: string;
  description?: string;
  schedule: PatchSchedule;
  include_critical_updates: boolean;
  include_security_updates: boolean;
  include_optional_updates?: boolean;
  include_preview_updates?: boolean;
  max_deferral_days?: number;
  auto_reboot: boolean;
  notifications?: PolicyNotification;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  patches_approved: number[];
  patches_not_approved: number[];
  patches_uninstall: number[];
  excluded_clients: number[];
  excluded_sites: number[];
  excluded_agents: number[];
}

export interface PatchSchedule {
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  day_of_week?: string;
  day_of_month?: number;
}

export interface PolicyNotification {
  enabled: boolean;
  notify_on_failure: boolean;
  notify_on_success: boolean;
  recipients: string[];
}
