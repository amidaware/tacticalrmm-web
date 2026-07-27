import axios from "axios";
import { openURL } from "quasar";
import { router } from "@/router";

import type {
  URLAction,
  TestRunURLActionRequest,
  TestRunURLActionResponse,
} from "@/types/core/urlactions";

import { getCenteredWindowOptions } from "@/utils/helpers";

import type { CoreSetting } from "@/types/core/settings";

const baseUrl = "/core";

export async function fetchCoreSettings(params = {}): Promise<CoreSetting> {
  const { data } = await axios.get("/core/settings/", { params: params });
  return data;
}

export async function fetchDashboardInfo(params = {}) {
  const { data } = await axios.get(`${baseUrl}/dashinfo/`, { params: params });
  return data;
}

export async function fetchCustomFields(params = {}) {
  try {
    const { data } = await axios.get(`${baseUrl}/customfields/`, {
      params: params,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
}

export async function fetchURLActions(params = {}): Promise<URLAction[]> {
  const { data } = await axios.get(`${baseUrl}/urlaction/`, {
    params: params,
  });
  return data;
}

export async function saveURLAction(action: URLAction) {
  const { data } = await axios.post(`${baseUrl}/urlaction/`, action);
  return data;
}

export async function editURLAction(id: number, action: URLAction) {
  const { data } = await axios.put(`${baseUrl}/urlaction/${id}/`, action);
  return data;
}

export async function removeURLAction(id: number) {
  const { data } = await axios.delete(`${baseUrl}/urlaction/${id}/`);
  return data;
}

interface RunURLActionRequest {
  agent_id?: string;
  client?: number;
  site?: number;
  action: number;
}

export async function runURLAction(payload: RunURLActionRequest) {
  const { data } = await axios.patch(`${baseUrl}/urlaction/run/`, payload);
  openURL(data);
}

export async function runTestURLAction(
  payload: TestRunURLActionRequest,
): Promise<TestRunURLActionResponse> {
  const { data } = await axios.post(`${baseUrl}/urlaction/run/test/`, payload);
  return data;
}

export async function checkWebTermPerms(): Promise<{
  message: string;
  status: number;
}> {
  const ret = await axios.post(`${baseUrl}/webtermperms/`);
  return { message: ret.data, status: ret.status };
}

export function openWebTerminal(): void {
  const url: string = router.resolve("/webterm").href;
  openURL(url, undefined, {
    ...getCenteredWindowOptions(1280, 720),
  });
}

// TODO: Build out type for openai payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateScript(payload: any) {
  const { data } = await axios.post(`${baseUrl}/openai/generate/`, payload);
  return data;
}

// Pi.dev AI providers & models
export async function fetchAIProviders() {
  const { data } = await axios.get(`${baseUrl}/ai/providers/`);
  return data;
}

export async function saveAIProvider(provider: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/providers/`, provider);
  return data;
}

export async function editAIProvider(id: number, provider: Record<string, unknown>) {
  const { data } = await axios.put(`${baseUrl}/ai/providers/${id}/`, provider);
  return data;
}

export async function deleteAIProvider(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/providers/${id}/`);
  return data;
}

export async function fetchAIModels() {
  const { data } = await axios.get(`${baseUrl}/ai/models/`);
  return data;
}

export async function saveAIModel(model: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/models/`, model);
  return data;
}

export async function editAIModel(id: number, model: Record<string, unknown>) {
  const { data } = await axios.put(`${baseUrl}/ai/models/${id}/`, model);
  return data;
}

export async function deleteAIModel(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/models/${id}/`);
  return data;
}

export async function fetchAvailableAIModels() {
  const { data } = await axios.get(`${baseUrl}/ai/available-models/`);
  return data;
}

export async function helpdeskAssist(messages: { role: string; content: string }[]) {
  const { data } = await axios.post(`${baseUrl}/ai/helpdesk-assist/`, { messages });
  return data as { reply: string };
}

export async function getScheduledActions() {
  const { data } = await axios.get(`${baseUrl}/ai/schedule-action/`);
  return data as {
    id: number; ticket_ref: string; agent: string | null; agent_id: string | null;
    action: string; run_at: string; status: string; allow_mutating: boolean;
    created_by: string; result: string;
  }[];
}

export async function deleteScheduledAction(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/schedule-action/${id}/`);
  return data;
}

export async function getTicketConsole() {
  const { data } = await axios.get(`${baseUrl}/ai/ticket-console/`);
  return data as {
    ticket_ref: string; subject: string; client: string; device: string;
    requester: string; status: string; classification: string; is_alert: boolean;
    summary: string; proposed_action: string; updated: string;
    odoo_status: string; assigned_to: string; assigned_to_bot: boolean;
    token: string | null; decision_url: string;
  }[];
}

export async function getTicketConsoleItem(ticketRef: string) {
  const { data } = await axios.get(`${baseUrl}/ai/ticket-console/${ticketRef}/`);
  return data as {
    ticket_ref: string; subject: string; status: string; classification: string;
    summary: string; proposed_action: string; is_alert: boolean;
    messages: { role: string; content: string; ts?: string }[];
    context: Record<string, string>;
  };
}

export async function autoResolveTicket(ticketRef: string) {
  const { data } = await axios.post(`${baseUrl}/ai/ticket-console/${ticketRef}/`, {});
  return data as { queued: boolean };
}

export interface AIProcedure {
  id?: number;
  code?: string;
  title: string;
  category: string;
  applies_to: string;
  symptom: string;
  root_cause: string;
  fix: string;
  verification: string;
  occurrence_count?: number;
  source_ticket_refs?: string[];
  confidence?: string;
  origin?: string;
  status?: string;
  updated_by?: string;
  updated?: string;
}

export async function getProcedures(params: { q?: string; category?: string; status?: string } = {}) {
  const { data } = await axios.get(`${baseUrl}/ai/procedures/`, { params });
  return data as { procedures: AIProcedure[]; categories: string[]; all_categories: string[]; total: number };
}

export async function createProcedure(payload: Partial<AIProcedure>) {
  const { data } = await axios.post(`${baseUrl}/ai/procedures/`, payload);
  return data as AIProcedure;
}

export async function updateProcedure(id: number, payload: Partial<AIProcedure>) {
  const { data } = await axios.put(`${baseUrl}/ai/procedures/${id}/`, payload);
  return data as AIProcedure;
}

export async function deleteProcedure(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/procedures/${id}/`);
  return data;
}

export async function mineProceduresNow() {
  const { data } = await axios.post(`${baseUrl}/ai/procedures/mine-now/`, {});
  return data as { queued: boolean };
}

export async function stopMining() {
  const { data } = await axios.post(`${baseUrl}/ai/procedures/mining-stop/`, {});
  return data as { stopping: boolean };
}

export async function getMiningStatus() {
  const { data } = await axios.get(`${baseUrl}/ai/procedures/mining-status/`);
  return data as {
    running: boolean; phase: string; window?: number; to_mine?: number; done?: number;
    companies?: number; current_company?: string; procedures_found?: number; kb_updates?: number;
    started?: string; updated?: string; log?: { t: string; line: string }[];
  };
}

// Re-check each provider's model catalog now (also runs every 6h on a schedule, and
// self-gates to the configured interval unless forced).
export async function refreshModelCatalog() {
  const { data } = await axios.post(`${baseUrl}/ai/model-catalog/refresh/`, {});
  return data as { result: string; checked: string | null };
}

// ---- Daily helpdesk activity report -------------------------------------------
// Sends the report now (ignores the schedule). Covers everyone's activity, not just AI.
export async function sendDailyReportNow() {
  const { data } = await axios.post(`${baseUrl}/ai/daily-report/send/`, {});
  return data as { result: string; last_run: string | null };
}

// ---- AI runtime (the pi package the bridge embeds) ----------------------------
export interface RuntimeStatus {
  installed: string | null;
  installed_error?: string | null;
  latest: string | null;
  latest_error?: string | null;
  update_available: boolean;
  busy: boolean;
  busy_detail?: Record<string, unknown>;
  last_run: string | null;
  last_result: string;
  last_version: string;
}

export async function getRuntimeStatus() {
  const { data } = await axios.get(`${baseUrl}/ai/runtime/status/`);
  return data as RuntimeStatus;
}

// Runs the update immediately (skips the time window only). Still waits for idle,
// still probes compatibility, still rolls back on failure.
export async function updateRuntimeNow() {
  const { data } = await axios.post(`${baseUrl}/ai/runtime/update/`, {});
  return data as { result: string; last_run: string | null; last_version: string };
}

// ---- Alert verifiers (deterministic "prove it before you act" rules) ----------
export interface VerifierRule {
  index: number;
  name: string;
  enabled: boolean;
  shell: string;
  identity: string;
  timeout: number;
  script_lines: number;
  problems: string[];
}

// Report how each helpdesk operation is CLASSIFIED and which surfaces may use it.
// Runs nothing. An operation the integration declares mutating but leaves unclassified
// is DENIED once enforcement is on - this surfaces that before it blocks a live feature.
export async function helpdeskCaps(code?: string) {
  const { data } = await axios.post(`${baseUrl}/ai/helpdesk-caps/`, code === undefined ? {} : { code });
  return data as {
    ok: boolean; error?: string; mode?: string; total?: number;
    ops: { op: string; mutating: boolean; class: string | null; source: string }[];
    surfaces?: Record<string, string[]>;
    unclassified?: string[]; guessed?: string[]; invalid?: string[]; warning?: string;
  };
}

// Validate a rule set without running anything (lists parked rules too).
export async function lintVerifiers(code?: string) {
  const { data } = await axios.post(`${baseUrl}/ai/verifiers/lint/`, code === undefined ? {} : { code });
  return data as {
    ok: boolean; error?: string; note?: string;
    rules: VerifierRule[]; live?: number; total?: number;
  };
}

// Dry-run a rule against one real ticket. Server forces dry_run, so this can never
// change a ticket - it inspects the device read-only and reports the verdict.
export async function testVerifier(ticket_ref: string, code?: string) {
  const { data } = await axios.post(`${baseUrl}/ai/verifiers/test/`, { ticket_ref, ...(code === undefined ? {} : { code }) });
  return data as {
    matched: boolean; verifier?: string; host?: string; agent_client?: string;
    identified_by?: string; action?: string; reason?: string; detail?: string;
    cancelled?: boolean; noted?: boolean; dry_run?: boolean; error?: string; skipped?: string;
  };
}

export async function createDecisionSession(token: string, payload: object = {}) {
  // Mint a stateful, streaming decision-chat session (same machinery as the device chat).
  const { data } = await axios.post(`${baseUrl}/ai/decision/${token}/session/`, payload);
  return data;
}

export async function getDeviceNotes(agentId: string) {
  const { data } = await axios.get(`${baseUrl}/ai/device-note/`, {
    params: { agent_id: agentId },
  });
  return data as { agent_id: string; notes: string };
}

export async function saveDeviceNotes(agentId: string, notes: string) {
  const { data } = await axios.put(`${baseUrl}/ai/device-note/`, {
    agent_id: agentId,
    notes,
  });
  return data as { ok: boolean; notes: string };
}

export async function aiPromptAssist(payload: {
  messages: { role: string; content: string }[];
  kind: "single" | "bulk";
  current_prompt?: string;
  current_report?: string;
}) {
  const { data } = await axios.post(`${baseUrl}/ai/prompt-assist/`, payload);
  return data as { reply: string };
}

// Scheduled Pi AI Tasks
export async function fetchAITasks(agentId?: string) {
  const { data } = await axios.get(`${baseUrl}/ai/tasks/`, {
    params: agentId ? { agent_id: agentId } : {},
  });
  return data;
}

// Aggregate: all tasks for a client or site (company-wide view)
export async function fetchAITasksByScope(scope: {
  client?: string | null;
  site?: string | null;
}) {
  const params: Record<string, string> = {};
  if (scope.site) params.site = scope.site;
  else if (scope.client) params.client = scope.client;
  const { data } = await axios.get(`${baseUrl}/ai/tasks/`, { params });
  return data;
}

export async function saveAITask(task: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/tasks/`, task);
  return data;
}

export async function editAITask(id: number, task: Record<string, unknown>) {
  const { data } = await axios.put(`${baseUrl}/ai/tasks/${id}/`, task);
  return data;
}

export async function deleteAITask(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/tasks/${id}/`);
  return data;
}

export async function runAITaskNow(id: number) {
  const { data } = await axios.post(`${baseUrl}/ai/tasks/${id}/run/`);
  return data;
}

export async function fetchAITaskRuns(taskId: number) {
  const { data } = await axios.get(`${baseUrl}/ai/runs/`, {
    params: { task_id: taskId },
  });
  return data;
}

export async function fetchAITaskRunLive(runId: string) {
  const { data } = await axios.get(`${baseUrl}/ai/runs/${runId}/live/`);
  return data;
}

export async function fetchAIRunsByAgent(agentId: string) {
  const { data } = await axios.get(`${baseUrl}/ai/runs/`, {
    params: { agent_id: agentId },
  });
  return data;
}

// Scope = { client: <id> } or { site: <id> }
export async function fetchAIRunsByScope(scope: { client?: number; site?: number }) {
  const { data } = await axios.get(`${baseUrl}/ai/runs/`, { params: scope });
  return data;
}

export async function fetchAIHistoryScope(scope: { client?: number; site?: number }) {
  const { data } = await axios.get(`${baseUrl}/ai/history-scope/`, { params: scope });
  return data;
}

// Bulk AI Commands
export async function fetchBulkAICommands() {
  const { data } = await axios.get(`${baseUrl}/ai/bulk/`);
  return data;
}
export async function saveBulkAICommand(cmd: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/bulk/`, cmd);
  return data;
}
export async function editBulkAICommand(id: number, cmd: Record<string, unknown>) {
  const { data } = await axios.put(`${baseUrl}/ai/bulk/${id}/`, cmd);
  return data;
}
export async function deleteBulkAICommand(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/bulk/${id}/`);
  return data;
}
export async function stopBulkAICommand(id: number) {
  const { data } = await axios.post(`${baseUrl}/ai/bulk/${id}/stop/`);
  return data;
}

export async function stopAllAIRuns() {
  const { data } = await axios.post(`${baseUrl}/ai/stop-all/`);
  return data;
}

export async function fetchBulkAICommandResults(id: number) {
  const { data } = await axios.get(`${baseUrl}/ai/bulk/${id}/results/`);
  return data;
}

export async function runBulkAICommandNow(id: number) {
  const { data } = await axios.post(`${baseUrl}/ai/bulk/${id}/run/`);
  return data;
}
export async function previewBulkAITargets(payload: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/bulk/preview/`, payload);
  return data;
}

// --- Operator-defined AI reports (any cadence) --------------------------------
export interface AIReportSchedule {
  id?: number;
  name: string;
  kind: "activity" | "open_tickets";
  enabled: boolean;
  cadence: "daily" | "weekdays" | "weekly" | "monthly";
  run_at: string;
  weekday?: number;
  day_of_month?: number;
  window_hours?: number | null;
  recipients: string;
  options?: Record<string, unknown>;
  last_run?: string | null;
  last_result?: string;
  cadence_display?: string;
  kind_display?: string;
  window_hours_effective?: number;
}

export async function fetchAIReportSchedules() {
  const { data } = await axios.get("/core/ai/report-schedules/");
  return data as AIReportSchedule[];
}

export async function saveAIReportSchedule(s: AIReportSchedule) {
  if (s.id) {
    const { data } = await axios.put(`/core/ai/report-schedules/${s.id}/`, s);
    return data as AIReportSchedule;
  }
  const { data } = await axios.post("/core/ai/report-schedules/", s);
  return data as AIReportSchedule;
}

export async function deleteAIReportSchedule(id: number) {
  const { data } = await axios.delete(`/core/ai/report-schedules/${id}/`);
  return data;
}

export async function runAIReportScheduleNow(id: number) {
  const { data } = await axios.post(`/core/ai/report-schedules/${id}/`);
  return data as string;
}
