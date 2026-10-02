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

// Providers the installed pi runtime supports natively (Settings > AI > Providers dropdown).
export async function fetchNativeAIProviders() {
  const { data } = await axios.get(`${baseUrl}/ai/native-providers/`);
  return data;
}

export async function fetchAvailableAIModels() {
  const { data } = await axios.get(`${baseUrl}/ai/available-models/`);
  return data;
}

// pi relay keys (Settings > AI > pi Relay Keys) - see core/relay.py
export async function fetchRelayKeys() {
  const { data } = await axios.get(`${baseUrl}/ai/relay/keys/`);
  return data;
}

export async function createRelayKey(payload: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/relay/keys/`, payload);
  return data;
}

// Emails the user a NEW secret for this key + setup instructions (the old secret stops working).
export async function sendRelayInstallKey(id: number) {
  const { data } = await axios.post(`${baseUrl}/ai/relay/keys/${id}/send-install/`);
  return data;
}

// Emails every active key holder a "re-run the installer to update your pi extension" notice.
// Keys are NOT changed or rotated - existing keys keep working. `dryRun` reports who would be
// emailed without sending.
export async function notifyRelayUpdate(dryRun = false) {
  const { data } = await axios.post(`${baseUrl}/ai/relay/keys/notify-update/${dryRun ? "?dry_run=1" : ""}`);
  return data;
}

export async function editRelayKey(id: number, payload: Record<string, unknown>) {
  const { data } = await axios.patch(`${baseUrl}/ai/relay/keys/${id}/`, payload);
  return data;
}

// Per-session chat capability grants. See core/session_caps.py - an exception can only ADD to
// what the user's role already allows. Listing and withdrawing live here; granting happens from
// the technician's own chat session.
export async function fetchSessionCaps(params: {
  scope_kind?: string;
  scope_ref?: string;
  username?: string;
  // list=1 returns EVERY live exception (the Settings table), not one user+scope.
  list?: number;
}) {
  const { data } = await axios.get(`${baseUrl}/ai/session-caps/`, { params });
  return data;
}


// Withdrawing happens from the same dialog that grants (the Access dialog), so a grant made
// "until withdrawn" can always be taken back without a DB visit.
export async function revokeSessionCaps(payload: Record<string, unknown>) {
  const { data } = await axios.delete(`${baseUrl}/ai/session-caps/`, { data: payload });
  return data;
}

// Granting happens from the technician's own chat session (the Access dialog) - the person who
// needs the switch is in the roster, so it does not belong in Global Settings.
export async function grantSessionCaps(payload: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/session-caps/`, payload);
  return data;
}

// Permanently removes a revoked key (admin only, server-enforced).
export async function purgeRelayKey(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/relay/keys/${id}/?purge=1`);
  return data;
}

export async function revokeRelayKey(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/relay/keys/${id}/`);
  return data;
}

export async function fetchAIAgentGroups() {
  const { data } = await axios.get(`${baseUrl}/ai/agent-groups/`);
  return data;
}

export async function saveAIAgentGroup(group: Record<string, unknown>) {
  const { data } = await axios.post(`${baseUrl}/ai/agent-groups/`, group);
  return data;
}

export async function editAIAgentGroup(id: number, group: Record<string, unknown>) {
  const { data } = await axios.put(`${baseUrl}/ai/agent-groups/${id}/`, group);
  return data;
}

export async function deleteAIAgentGroup(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/agent-groups/${id}/`);
  return data;
}

export async function seedAIAgentGroups(resetMembers = false) {
  const { data } = await axios.post(`${baseUrl}/ai/agent-groups/seed/`, {
    reset_members: resetMembers,
  });
  return data;
}

export async function helpdeskAssist(messages: { role: string; content: string }[]) {
  const { data } = await axios.post(`${baseUrl}/ai/helpdesk-assist/`, { messages });
  return data as { reply: string };
}

export async function getScheduledActions(scope?: {
  agent_id?: string | null;
  client?: string | null;
  site?: string | null;
}) {
  const params: Record<string, string> = {};
  if (scope?.agent_id) params.agent_id = scope.agent_id;
  else if (scope?.site) params.site = scope.site;
  else if (scope?.client) params.client = scope.client;
  const { data } = await axios.get(`${baseUrl}/ai/schedule-action/`, { params });
  return data as {
    id: number; ticket_ref: string; agent: string | null; agent_id: string | null;
    hostname?: string | null; client?: string | null; site?: string | null;
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

export interface KbArticle {
  id: number;
  title: string;
  company?: string;
  url?: string;
  content?: string;
  missing?: boolean;
}

// Resolve helpdesk KB article ids to titles and text. The helpdesk exposes one company's articles
// at a time, so this resolves ids rather than browsing.
export async function fetchKbArticles(ids: number[]) {
  const { data } = await axios.get(`${baseUrl}/ai/kb-articles/`, { params: { ids: (ids || []).join(",") } });
  return data as { articles: KbArticle[] };
}

// Type-ahead over the helpdesk KB. Nothing is fetched for an empty or 1-character query: the
// field stays quiet until a few characters have been typed and the typing has paused.
export async function searchKbArticles(q: string) {
  const { data } = await axios.get(`${baseUrl}/ai/kb-articles/`, { params: { q } });
  return data as {
    articles: KbArticle[];
    total?: number;
    catalogue_size?: number;
    catalogue_capped?: boolean;
    needs_more?: boolean;
  };
}

// One procedure, in full. Used by the subject editor so an admin can read the procedure a subject
// works from without leaving the form they are editing.
export async function fetchAIProcedure(id: number) {
  const { data } = await axios.get(`${baseUrl}/ai/procedures/${id}/`);
  return data as AIProcedure;
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

// Technician Productivity Analysis: send one now without creating a schedule for it.
// Defaults to a week - a single day is far too little data to score anyone on.
export async function sendTechProductivityNow(
  hours = 168,
  recipients?: string,
  options: Record<string, unknown> = {},
) {
  const { data } = await axios.post(`${baseUrl}/ai/tech-productivity/send/`, {
    hours,
    recipients,
    options,
  });
  return data as { result: string };
}

export async function runAIReportScheduleNow(id: number) {
  const { data } = await axios.post(`/core/ai/report-schedules/${id}/`);
  return data as string;
}

// --- AI spend ledger report ---------------------------------------------------
// NOTE: AI Spend is a SCHEDULED REPORT kind (see AIReportSchedules), not a separate
// screen. The /core/ai/spend-report/ endpoint remains available for ad-hoc queries.

// ---- Ticket Automation Subjects -------------------------------------------------------
// The kinds of ticket the AI may work on its own (Procedures page -> subsection).
export interface AITicketAutomationSubject {
  id: number;
  name: string;
  description: string;
  status: "proposed" | "approved" | "rejected" | "retired";
  enabled: boolean;
  mode: "advise" | "device_readonly" | "device_fix";
  mode_display?: string;
  match: Record<string, unknown>;
  procedures: number[];
  procedure_titles?: string[];
  kb_article_ids: number[];
  instructions: string;
  all_clients: boolean;
  clients: string[];
  domains: string[];
  baseline_minutes: number | null;
  proposal_reason: string;
  proposal_tickets: string[];
  approved_at: string | null;
  approved_by: string;
  tickets_matched: number;
  tickets_worked: number;
  tickets_deduped: number;
  last_worked: string | null;
  updated: string;
}

export async function fetchAutomationSubjects(status?: string) {
  const { data } = await axios.get(`${baseUrl}/ai/automation-subjects/`, {
    params: status ? { status } : {},
  });
  return data as { subjects: AITicketAutomationSubject[]; modes: [string, string][] };
}
export async function createAutomationSubject(payload: Partial<AITicketAutomationSubject>) {  const { data } = await axios.post(`${baseUrl}/ai/automation-subjects/`, payload);
  return data as AITicketAutomationSubject;
}

// The rule language (conditions, actions, the fixed approval prelude and stop terminator) is
// served by the server so the editor can never offer a verb the interpreter does not know.
// The rule language, as the server declares it. Typed loosely on purpose: the editor renders
// whatever the server offers, so a new verb needs no client change and cannot drift out of sync
// with the interpreter.
export interface RuleParam {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  choices?: string[];
}
export interface RuleCondition {
  id: string;
  text: string;
  plain?: string;
  needs_ai?: boolean;
  params?: RuleParam[];
}
export interface RuleAction extends RuleCondition {
  class?: string;
}
export interface RuleVocabulary {
  conditions: RuleCondition[];
  actions: RuleAction[];
  prelude: { id: string; text: string; note: string } | null;
  terminator: { id: string; text: string; note: string } | null;
  max_depth: number;
}
export interface RuleDraft {
  statements?: { blocks?: Record<string, unknown>[] };
  english?: string[];
  errors?: string[];
  notes?: string;
  error?: string;
}

export async function fetchRuleVocab() {
  const { data } = await axios.get(`${baseUrl}/ai/rule-vocab/`);
  return data as RuleVocabulary;
}

// "Have an AI help write this rule": plain English in, a rule tree back. Never saves - it only
// fills the form, and the draft comes back with any validation problems attached.
// ---- APPROVAL FOR AUTOMATION ON ONE TICKET ------------------------------------------------
// What a rule would do on THIS ticket, for a technician to read before saying go. The plan is the
// rule rendered for this ticket (machine + script names filled in), not model-written prose, so
// what is approved is exactly what would run.
export interface ApprovalStep {
  step: string;
  detail?: string;
  needs_ai?: boolean;
  class?: string;
  mutating?: boolean;
  where?: string;
  depth?: number;
}
export interface AutomationApproval {
  state: "none" | "awaiting_review" | "approved" | "declined" | "expired" | "revoked";
  ticket_ref?: string;
  subject?: { id?: number; name?: string };
  plan?: { host?: string; steps?: ApprovalStep[]; mutates?: boolean; english?: string[] };
  rule_english?: string[];
  rule_still_matches?: boolean;
  approved_by?: string;
  approver_capacity?: string;
  approved_at?: string;
  expires_at?: string;
  declined_by?: string;
  decline_reason?: string;
  awaiting_go?: boolean;
  error?: string;
}

export async function fetchAutomationApproval(ticketRef: string) {
  const { data } = await axios.get(`${baseUrl}/ai/approval/`, { params: { ticket_ref: ticketRef } });
  return data as AutomationApproval;
}

// action: "propose" (write the plan for this ticket - Django finds the matching subject),
//         "approve" (a technician says go on the plan they were shown),
//         "decline" (with a reason).
export async function automationApproval(payload: {
  action: "propose" | "approve" | "decline";
  ticket_ref: string;
  reason?: string;
}) {
  const { data } = await axios.post(`${baseUrl}/ai/approval/`, payload);
  return data as AutomationApproval;
}

export async function draftRule(payload: { description: string; subject?: number | null }) {
  const { data } = await axios.post(`${baseUrl}/ai/rule-draft/`, payload);
  return data as RuleDraft;
}
export async function updateAutomationSubject(id: number, payload: Partial<AITicketAutomationSubject>) {
  const { data } = await axios.put(`${baseUrl}/ai/automation-subjects/${id}/`, payload);
  return data as AITicketAutomationSubject;
}
export async function deleteAutomationSubject(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ai/automation-subjects/${id}/`);
  return data;
}

// ---- Pi.dev mobile inbox ----------------------------------------------------------------
export async function fetchMobileInbox() {
  const { data } = await axios.get(`${baseUrl}/ai/mobile/inbox/`);
  return data as {
    decisions: Record<string, unknown>[];
    chats: Record<string, unknown>[];
    agents: { agent_id: string; hostname: string; client: string; online: boolean }[];
    me: { username: string; display?: string; odoo_user_id?: number; can_take_over: boolean };
  };
}
