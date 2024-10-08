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

export async function fetchSSOProviders(): Promise<SSOProvider[]> {
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

export interface SSOSettings {
  block_local_user_logon: boolean;
}

export async function fetchSSOSettings(): Promise<SSOSettings> {
  const { data } = await axios.get(`${baseUrl}/ssoproviders/settings/`);
  return data;
}

export async function updateSSOSettings(settings: SSOSettings) {
  const { data } = await axios.post(
    `${baseUrl}/ssoproviders/settings/`,
    settings,
  );
  return data;
}

export async function getSSOProviderToken() {
  const { data } = await axios.post(
    `${baseUrl}/ssoproviders/token/`,
    {},
    {
      headers: { "X-CSRFToken": getCSRFToken() },
    },
  );
  return data;
}

// allauth
const allauthBase = "_allauth/browser/v1";

export interface AllAuthResponse<T> {
  data: T;
  status: number;
  meta?: {
    is_autheticated: boolean;
  };
}

export interface SSOProviderConfig {
  client_id: string;
  flows: string[];
  id: string;
  name: string;
}

export interface SSOConfigResponse {
  socialaccount: {
    providers: SSOProviderConfig[];
  };
}

export async function getSSOConfig(): Promise<
  AllAuthResponse<SSOConfigResponse>
> {
  const { data } = await axios.get(`${allauthBase}/config`);
  return data;
}

export interface SSOAccountsResponse {
  uid: string;
  display: string;
  provider: SSOProviderConfig;
}

export async function disconnectSSOAccount(
  provider: string,
  account: string,
): Promise<AllAuthResponse<SSOAccountsResponse[]>> {
  const { data } = await axios.delete(`${allauthBase}/account/providers`, {
    data: { provider, account },
    headers: { "X-CSRFToken": getCSRFToken() },
  });
  return data;
}

export async function openSSOProviderRedirect(id: string) {
  postForm(`${getBaseUrl()}/${allauthBase}/auth/provider/redirect`, {
    provider: id,
    process: "login",
    callback_url: `${location.origin}/account/provider/callback`,
    csrfmiddlewaretoken: getCSRFToken() || "",
  });
}
