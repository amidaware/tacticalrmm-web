import type { AgentMenuItem } from "./types";

// top-level entries of AgentActionMenu.vue in their default order; "Close" is not part of it
export const AGENT_MENU_ITEMS: AgentMenuItem[] = [
  { id: "edit_agent", label: "Edit Agent", icon: "fas fa-edit" },
  {
    id: "pending_actions",
    label: "Pending Agent Actions",
    icon: "far fa-clock",
  },
  { id: "take_control", label: "Take Control", icon: "fas fa-desktop" },
  { id: "vnc", label: "VNC", icon: "screen_share" },
  { id: "run_url_action", label: "Run URL Action", icon: "open_in_new" },
  { id: "send_command", label: "Send Command", icon: "fas fa-terminal" },
  { id: "run_script", label: "Run Script", icon: "fas fa-terminal" },
  { id: "run_favorited_script", label: "Run Favorited Script", icon: "star" },
  { id: "remote_background", label: "Remote Background", icon: "terminal" },
  { id: "maintenance_mode", label: "Maintenance Mode", icon: "construction" },
  { id: "patch_management", label: "Patch Management", icon: "system_update" },
  { id: "run_checks", label: "Run Checks", icon: "fas fa-check-double" },
  { id: "wake_up", label: "Wake-Up (WoL)", icon: "offline_bolt" },
  { id: "reboot", label: "Reboot", icon: "power_settings_new" },
  { id: "shutdown", label: "Shutdown", icon: "power" },
  { id: "assign_policy", label: "Assign Automation Policy", icon: "policy" },
  { id: "reporting", label: "Reporting", icon: "analytics" },
  { id: "agent_recovery", label: "Agent Recovery", icon: "fas fa-first-aid" },
  { id: "remove_agent", label: "Remove Agent", icon: "delete" },
];

export const AGENT_MENU_ITEM_IDS = AGENT_MENU_ITEMS.map((item) => item.id);
