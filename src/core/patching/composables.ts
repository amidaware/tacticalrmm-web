import { ref, onMounted, computed } from "vue";
import { usePatchPolicyShared, usePatchScheduleShared } from "./api";

export function usePatchPolicyDropdown() {
  const { patchPolicies, getPatchPolicies } = usePatchPolicyShared;

  const patchPolicy = ref<number | undefined>();

  const patchPolicyOptions = computed(() => {
    return patchPolicies.value.map((policy) => ({
      label: policy.name,
      value: policy.id,
    }));
  });

  onMounted(getPatchPolicies);

  return {
    patchPolicy,
    patchPolicyOptions,
  };
}

export function usePatchScheduleDropdown() {
  const { patchSchedules, getPatchSchedules } = usePatchScheduleShared;

  const patchScheduleOptions = computed(() => {
    return patchSchedules.value.map((schedule) => ({
      label: schedule.name,
      value: schedule.id,
    }));
  });

  onMounted(getPatchSchedules);

  return {
    patchScheduleOptions,
  };
}
