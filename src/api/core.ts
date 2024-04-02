import axios from "axios";

import type { URLAction, URLActionRunResponse } from "@/types/core/urlactions";
import type { AutomatedTask } from "@/types/tasks";

const baseUrl = "/core";

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

export async function fetchURLActions(params = {}) {
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

export async function runURLAction(id: number): Promise<URLActionRunResponse> {
  const { data } = await axios.post(`${baseUrl}/urlaction/${id}/run/`);
  return data;
}

export async function fetchServerTasks(params = {}): Promise<AutomatedTask[]> {
  const { data } = await axios.get(`${baseUrl}/servertasks/`, {
    params: params,
  });
  return data;
}

export async function saveServerTask(action: AutomatedTask) {
  const { data } = await axios.post(`${baseUrl}/servertasks/`, action);
  return data;
}

export async function editServerTask(id: number, action: AutomatedTask) {
  const { data } = await axios.put(`${baseUrl}/servertasks/${id}/`, action);
  return data;
}

export async function removeServerTask(id: number) {
  const { data } = await axios.delete(`${baseUrl}/servertasks/${id}/`);
  return data;
}

export interface ServerScriptResponse {
  output: string;
  execution_time: number;
}

export async function runServerTask(id: number): Promise<ServerScriptResponse> {
  const { data } = await axios.post(`${baseUrl}/servertasks/${id}/run/`);
  return data;
}

export interface ServerScriptRunRequest {
  timeout: number;
  env_vars: string[];
  args: string[];
}

export async function runServerScript(
  id: number,
  payload: ServerScriptRunRequest,
): Promise<string> {
  const { data } = await axios.post(
    `${baseUrl}/serverscript/${id}/run/`,
    payload,
  );
  return data;
}

// TODO: Build out type for openai payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateScript(payload: any) {
  const { data } = await axios.post(`${baseUrl}/openai/generate/`, payload);
  return data;
}
