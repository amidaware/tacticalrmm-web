import { computed, onMounted } from "vue";
import { useScheduleShared } from "./api";

export function useScheduleDropdown() {
  const { schedules, getSchedules } = useScheduleShared;

  const scheduleOptions = computed(() =>
    schedules.value.map((schedule) => ({
      label: schedule.name,
      value: schedule.id,
    })),
  );

  onMounted(getSchedules);

  return {
    scheduleOptions,
  };
}
