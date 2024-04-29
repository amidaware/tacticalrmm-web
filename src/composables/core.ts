import { ref, computed, onMounted } from "vue";
import { fetchCustomFields, fetchURLActions } from "@/api/core";
import {
  formatCustomFieldOptions,
  formatURLActionOptions,
} from "@/utils/format";
import type { CustomField } from "@/types/core/customfields";
import type { URLAction } from "@/types/core/urlactions";

export interface URLActionOption extends URLAction {
  value: number;
  label: string;
}

export interface CustomFieldOption extends CustomField {
  value: number;
  label: string;
}

export interface UseCustomFieldDropdownParams {
  onMount?: boolean;
}

export function useCustomFieldDropdown(opts: UseCustomFieldDropdownParams) {
  const customFieldOptions = ref([] as CustomFieldOption[]);

  // type can be "client", "site", or "agent"
  async function getCustomFieldOptions(model = null, flat = false) {
    const params = {};

    if (model) params[model] = model;
    customFieldOptions.value = formatCustomFieldOptions(
      await fetchCustomFields(params),
      flat,
    );
  }

  const restActionOptions = computed(() =>
    customFieldOptions.value.filter((option) => option.type === "rest"),
  );

  if (opts.onMount) onMounted(getCustomFieldOptions);

  return {
    customFieldOptions,
    restActionOptions,

    //methods
    getCustomFieldOptions,
  };
}

export interface UseURLActionDropdownParams {
  onMount?: boolean;
}

export function useURLActionDropdown(opts: UseURLActionDropdownParams) {
  const urlActionOptions = ref([] as URLActionOption[]);

  // type can be "client", "site", or "agent"
  async function getURLActionOptions(flat = false) {
    const params = {};

    urlActionOptions.value = formatURLActionOptions(
      await fetchURLActions(params),
      flat,
    );
  }

  const webActionOptions = computed(() =>
    urlActionOptions.value.filter((action) => action.action_type === "web"),
  );

  const restActionOptions = computed(() =>
    urlActionOptions.value.filter((action) => action.action_type === "rest"),
  );

  if (opts.onMount) onMounted(getURLActionOptions);

  return {
    urlActionOptions,
    restActionOptions,
    webActionOptions,

    //methods
    getURLActionOptions,
  };
}
