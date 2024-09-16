import axios from "axios";
import { getCookie } from "@/ee/sso/utils/cookies";
import { getBaseUrl } from "@/boot/axios";

import type { SSOProvider } from "@/ee/sso/types/sso";

const baseUrl = "accounts";

interface FormData {
  provider: string;
  process: string;
  callback_url: string;
  csrfmiddlewaretoken: string;
}

export function getCSRFToken() {
  return getCookie("csrftoken");
}

// needed for sso provider redirect
function postForm(url: string, data: FormData) {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = url;

  for (const key in data) {
    const d = document.createElement("input");
    d.type = "hidden";
    d.name = key;
    d.value = data[key];
    f.appendChild(d);
  }
  document.body.appendChild(f);
  f.submit();
}

// sso providers
export interface AllAuthResponse<T> {
  data: T;
  status: number;
}

export async function fetchSSOProviders(): Promise<SSOProvider> {
  const { data } = await axios.get(`${baseUrl}/ssoproviders/`);
  return data;
}

export async function addSSOProvider(payload: SSOProvider) {
  const { data } = await axios.post(`${baseUrl}/ssoproviders/`, payload);
  return data;
}

export async function editSSOProvider(id: number, payload: SSOProvider) {
  const { data } = await axios.put(`${baseUrl}/ssoproviders/${id}/`, payload);
  return data;
}

export async function removeSSOProvider(id: number) {
  const { data } = await axios.delete(`${baseUrl}/ssoproviders/${id}/`);
  return data;
}

export async function getCurrentSession() {
  const { data } = await axios.get("_allauth/browser/v1/auth/session");
  return data;
}

export interface SSOProviderConfig {
  client_id: string;
  flows: string[];
  id: string;
  name: string;
}

export interface SSOConfigResponseProviders {
  providers: SSOProviderConfig[];
}

export interface SSOConfigResponse {
  socialaccount: SSOConfigResponseProviders;
}

export async function getSSOConfig(): Promise<
  AllAuthResponse<SSOConfigResponse>
> {
  const { data } = await axios.get("_allauth/browser/v1/config");
  return data;
}

export async function openSSOProviderRedirect(id: string) {
  postForm(`${getBaseUrl()}/_allauth/browser/v1/auth/provider/redirect`, {
    provider: id,
    process: "login",
    callback_url: `${location.origin}/account/provider/callback`,
    csrfmiddlewaretoken: getCSRFToken() || "",
  });
}
