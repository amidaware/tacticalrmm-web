/*
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
*/

import { ref } from "vue";
import axios from "axios";
import type { Branding } from "./types";
import { notifySuccess } from "@/utils/notify";

export function useBrandingStore() {
  const branding = ref<Branding>({
    company_name: "",
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    dark_color: "",
    dark_page_color: "",
    positive_color: "",
    negative_color: "",
    info_color: "",
    warning_color: "",
    favicon: "",
  });

  const isLoading = ref(false);

  function getBranding() {
    isLoading.value = true;

    axios
      .get<Branding>("/core/branding/")
      .then((response) => {
        branding.value = response.data;
      })
      .catch(() => {
        //
      })
      .finally(() => {
        isLoading.value = false;
      });
  }

  async function saveBranding(data: Branding) {
    isLoading.value = true;
    try {
      await axios.post("/core/branding/", data);
      branding.value = data;
      notifySuccess("Branding saved successfully");
    } catch (error) {
      //
    } finally {
      isLoading.value = false;
    }
  }

  return {
    branding,
    isLoading,
    getBranding,
    saveBranding,
  };
}

export const brandingStore = useBrandingStore();
