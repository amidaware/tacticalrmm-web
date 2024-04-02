import axios from "axios";

import type { AlertTemplate } from "@/types/alerts";

export async function saveAlertTemplate(id: number, payload: AlertTemplate) {
  const { data } = await axios.put(`alerts/templates/${id}/`, payload);
  return data;
}

export async function addAlertTemplate(payload: AlertTemplate) {
  const { data } = await axios.post("alerts/templates/", payload);
  return data;
}
