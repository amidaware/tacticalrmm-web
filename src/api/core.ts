import axios from "axios";

import type { URLAction, URLActionRunResponse } from "@/types/core/urlactions";
import type { AutomatedTask } from "@/types/tasks";

const baseUrl = "/core";

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
  id: number;
  timeout: number;
  env_vars: string[];
  args: string[];
}

export async function runServerScript(
  id: number,
  payload: ServerScriptRunRequest,
): Promise<ServerScriptResponse> {
  const { data } = await axios.post(
    `${baseUrl}/serverscript/${id}/run/`,
    payload,
  );
  return data;
}
