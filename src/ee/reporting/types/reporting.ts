/*
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
*/

export type ReportTemplateType = "markdown" | "html" | "plaintext";

export type ReportFormat = "pdf" | "html" | "plaintext";

export interface ReportDependencies {
  [x: string]: string | number;
}

export interface VariableAnalysis {
  [x: string]: string;
}

export interface ReportTemplate {
  id: number;
  name: string;
  template_md: string;
  template_css: string;
  template_html?: number;
  type: ReportTemplateType;
  template_variables: string;
  depends_on?: string[];
  uuid: string;
  revision: number;
}

export interface ReportHTMLTemplate {
  id: number;
  name: string;
  html: string;
  uuid: string;
  revision: number;
}
export interface ReportDataQuery {
  id: number;
  name: string;
  json_query: object;
}

export interface UploadAssetsResponse {
  [x: string]: { id: string; filename: string };
}

export interface RunReportPreviewRequest extends ReportTemplate {
  format: ReportFormat;
  dependencies?: ReportDependencies;
  debug?: boolean;
}

export interface RunReportRequest {
  format: ReportFormat;
  dependencies?: ReportDependencies;
}

export interface OpenReportParams {
  id: number;
  format: ReportFormat;
  dependsOn: string[];
  dependencies: ReportDependencies;
}

export interface SharedTemplate {
  name: string;
  url: string;
}

export interface ReportSchedule {
  id: number;
  name: string;
  enabled: boolean;
  report_template?: number;
  report_template_name?: string;
  format: ReportFormat;
  schedule?: number;
  email_recipients: string[];
  no_email: boolean;
  last_run?: string;
  dependencies: ReportDependencies;
}

export interface ReportHistory {
  id: number;
  run_by: string;
  report_template: number;
  report_template_name: string;
  report_template_type: ReportTemplateType;
  error_data?: string;
  date_created: string;
}
