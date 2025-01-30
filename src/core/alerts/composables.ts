import { ref, onMounted, computed } from "vue";
import { useAlertTemplateShared } from "./api";

import type { AlertTemplate } from "./types";

export function useAlertTemplateDropdown() {
  const { alertTemplates, getAlertTemplates } = useAlertTemplateShared;

  const alertTemplate = ref<AlertTemplate | undefined>();

  const alertTemplateOptions = computed(() => {
    return alertTemplates.value.map((alertTemplate) => ({
      label: alertTemplate.name,
      value: alertTemplate.id,
    }));
  });

  onMounted(getAlertTemplates);

  return {
    alertTemplate,
    alertTemplateOptions,
  };
}
