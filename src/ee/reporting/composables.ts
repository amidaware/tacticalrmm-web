import { computed, onMounted } from "vue";
import { useSharedReportTemplates } from "./api/reporting";

export function useReportTemplateDropdown() {
  const { reportTemplates, getReportTemplates } = useSharedReportTemplates;

  const reportTemplateOptions = computed(() =>
    reportTemplates.value.map((template) => ({
      label: template.name,
      value: template.id,
    })),
  );

  onMounted(getReportTemplates);

  return {
    reportTemplateOptions,
  };
}
