import { Dark, setCssVar } from "quasar";
import { watch } from "vue";

import type { BrandingConfig } from "./types";

// build time values from src/css/quasar.variables.sass and Quasar's $dark-page
const DEFAULTS = {
  primary: "#1976D2",
  secondary: "#26A69A",
  accent: "#9C27B0",
  dark_page: "#121212",
};

let current: BrandingConfig | null = null;
let watchingDark = false;

// black or white text, whichever is readable on the given background
export function textColorFor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#000000" : "#ffffff";
}

function applyColors() {
  const c = current;
  const primary =
    (Dark.isActive && c?.dark_primary) || c?.primary || DEFAULTS.primary;

  setCssVar("primary", primary);
  setCssVar("secondary", c?.secondary || DEFAULTS.secondary);
  setCssVar("accent", c?.accent || DEFAULTS.accent);
  setCssVar("dark-page", c?.dark_page || DEFAULTS.dark_page);

  const root = document.documentElement.style;
  if (c?.header) {
    root.setProperty("--trmm-header", c.header);
    root.setProperty("--trmm-header-text", textColorFor(c.header));
  } else {
    root.removeProperty("--trmm-header");
    root.removeProperty("--trmm-header-text");
  }
}

function applyFavicon(url: string | null) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;

  if (!link.dataset.defaultHref) {
    link.dataset.defaultHref = link.getAttribute("href") || "favicon.ico";
  }
  link.removeAttribute("type");
  link.href = url ?? link.dataset.defaultHref;
}

export function applyBranding(
  config: BrandingConfig | null,
  productName: string,
  faviconUrl: string | null,
) {
  current = config;
  applyColors();
  document.title = productName;
  applyFavicon(faviconUrl);

  if (!watchingDark) {
    watch(() => Dark.isActive, applyColors);
    watchingDark = true;
  }
}
