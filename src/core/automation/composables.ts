import { ref, onMounted, computed } from "vue";
import { usePolicyShared } from "./api";

import type { Policy } from "./types";

export function usePolicyDropdown() {
  const { policies, getPolicies } = usePolicyShared;

  const policy = ref<Policy | undefined>();

  const policyOptions = computed(() => {
    return policies.value.map((policy) => ({
      label: policy.name,
      value: policy.id,
    }));
  });

  onMounted(getPolicies);

  return {
    policy,
    policyOptions,
  };
}
