import { onMounted, computed } from "vue";
import { useTableViewShared } from "./api";

export function useTableViewDropdown() {
  const { tableViews, getTableViews } = useTableViewShared;

  const tableViewOptions = computed(() => {
    return tableViews.value.map((view) => ({
      label: view.name,
      value: view.id,
      ...view,
    }));
  });

  onMounted(getTableViews);

  return {
    tableViewOptions,
  };
}
