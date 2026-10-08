import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { brandingImageUrl, fetchBranding } from "./api";
import { applyBranding } from "./apply";
import type { BrandingConfig, BrandingImageKind } from "./types";

export const DEFAULT_PRODUCT_NAME = "Tactical RMM";

function hasImage(config: BrandingConfig, kind: BrandingImageKind): boolean {
  switch (kind) {
    case "logo":
      return config.has_logo;
    case "favicon":
      return config.has_favicon;
    case "login_background":
      return config.has_login_background;
  }
}

export const useBrandingStore = defineStore("branding", () => {
  const config = ref<BrandingConfig | null>(null);

  const productName = computed(
    () => config.value?.product_name || DEFAULT_PRODUCT_NAME,
  );

  function imageUrl(kind: BrandingImageKind): string | null {
    const c = config.value;
    if (!c || !hasImage(c, kind)) return null;
    return brandingImageUrl(kind, c.version);
  }

  async function refresh() {
    config.value = await fetchBranding();
    applyBranding(config.value, productName.value, imageUrl("favicon"));
  }

  return { config, productName, imageUrl, refresh };
});
