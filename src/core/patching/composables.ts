import { ref, onMounted, computed } from "vue";
import { usePatchPolicyShared } from "./api";

import type { PatchPolicy } from "./types";

export function usePatchPolicyDropdown() {
  const { patchPolicies, getPatchPolicies } = usePatchPolicyShared;

  const patchPolicy = ref<PatchPolicy | undefined>();

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
