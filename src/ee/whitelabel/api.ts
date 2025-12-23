/*
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
*/

import { ref } from "vue";
import { Dialog } from "quasar";
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
    light_page_color: "",
    light_card_color: "",
    positive_color: "",
    negative_color: "",
    info_color: "",
    warning_color: "",
    toolbar_color: "",
    toolbar_text_color: "",
    favicon: "",
  });

  function promptReload() {
    if (!process.env.DOCKER_BUILD) {
      Dialog.create({
        title: "",
        ok: {
          label: "Reload",
          color: "primary",
        },
        cancel: false,
        noBackdropDismiss: true,
        noEscDismiss: true,
        message: "You must reload the page for changes to take effect.",
      }).onOk(() => location.reload());
    } else {
      Dialog.create({
        title: "",
        ok: false,
        cancel: false,
        noBackdropDismiss: true,
        noEscDismiss: true,
        message:
          "You must run `docker compose down && docker compose up` to apply changes the reload this page.",
      });
    }
  }

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
      promptReload();
    } catch (error) {
      //
    } finally {
      isLoading.value = false;
    }
  }

  function resetToDefault() {
    branding.value.primary_color = "";
    branding.value.secondary_color = "";
    branding.value.accent_color = "";
    branding.value.dark_color = "";
    branding.value.dark_page_color = "";
    branding.value.light_page_color = "";
    branding.value.light_card_color = "";
    branding.value.positive_color = "";
    branding.value.negative_color = "";
    branding.value.info_color = "";
    branding.value.warning_color = "";
    branding.value.toolbar_color = "";
    branding.value.toolbar_text_color = "";
  }

  return {
    branding,
    isLoading,
    getBranding,
    saveBranding,
    resetToDefault,
  };
}

export const brandingStore = useBrandingStore();
