/*
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
*/

export type ReportTemplateType = "markdown" | "html";
export interface ReportTemplate {
  id: number;
  name: string;
  template_md: string;
  template_css: string;
  template_html?: number;
  type: ReportTemplateType;
}

export interface ReportHTMLTemplate {
  id: number;
  name: string;
  html: string;
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
  format: "pdf" | "html";
}
