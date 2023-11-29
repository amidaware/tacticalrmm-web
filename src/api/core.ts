import axios from "axios";

import type { URLAction, URLActionRunResponse } from "@/types/core/urlactions";

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

export async function runURLAction(id: number, payload): Promise<URLActionRunResponse> {
  const { data } = await axios.post(`${baseUrl}/urlaction/${id}/run/`);
  return data;
}
