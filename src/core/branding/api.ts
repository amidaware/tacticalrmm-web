import axios from "axios";
import { getBaseUrl } from "@/boot/axios";

import type {
  BrandingConfig,
  BrandingImageKind,
  BrandingUpdate,
} from "./types";

const baseUrl = "/branding";

function apiRoot(): string {
  return `${getBaseUrl().replace(/\/+$/, "")}${baseUrl}`;
}

// plain fetch on purpose: this public call must not trigger the global axios
// error toasts or the 401 redirect, e.g. against an older backend without branding
export async function fetchBranding(): Promise<BrandingConfig | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const r = await fetch(`${apiRoot()}/`, { signal: controller.signal });
    if (!r.ok) return null;
    return (await r.json()) as BrandingConfig;
  } catch (e) {
    console.error(e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function brandingImageUrl(kind: BrandingImageKind, version: number) {
  return `${apiRoot()}/image/${kind}/?v=${version}`;
}

export async function saveBranding(data: BrandingUpdate) {
  await axios.put(`${baseUrl}/`, data);
}

export async function uploadBrandingImage(kind: BrandingImageKind, file: File) {
  const form = new FormData();
  form.append("file", file);
  await axios.put(`${baseUrl}/image/${kind}/`, form);
}

export async function deleteBrandingImage(kind: BrandingImageKind) {
  await axios.delete(`${baseUrl}/image/${kind}/`);
}
