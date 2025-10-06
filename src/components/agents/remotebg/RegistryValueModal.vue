<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
    persistent
  >
    <q-card style="min-width: 420px; max-width: 480px">
      <q-card-section class="q-pb-none">
        <div class="text-subtitle1">
          Edit
          <span v-if="row.type === 'REG_DWORD'">DWORD (32-bit) Value</span>
          <span v-else-if="row.type === 'REG_QWORD'">QWORD (64-bit) Value</span>
          <span v-else-if="row.type === 'REG_MULTI_SZ'">Multi-String</span>
          <span v-else>String</span>
        </div>
      </q-card-section>

      <q-card-section>
        <div class="text-body2 q-mb-xs">Value name:</div>
        <q-input v-model="localRow.name" dense outlined readonly disable />
      </q-card-section>
      <q-card-section>
        <div class="text-body2 q-mb-sm">Value data:</div>
        <q-input
          v-if="row.type === 'REG_MULTI_SZ'"
          v-model="multiStringData"
          type="textarea"
          dense
          outlined
          autofocus
        />
        <div
          v-else-if="row.type === 'REG_DWORD' || row.type === 'REG_QWORD'"
          class="row items-start q-col-gutter-lg"
        >
          <div class="col-7">
            <q-input
              v-model="formattedValue"
              dense
              outlined
              autofocus
              :input-class="localBase === 'hex' ? 'text-uppercase' : ''"
              @keypress="onKeyPress"
            />
          </div>
          <div class="col-5 q-py-none">
            <div class="text-body2 q-mb-xs">Base</div>
            <q-option-group
              v-model="localBase"
              :options="[
                { label: 'Hexadecimal', value: 'hex' },
                { label: 'Decimal', value: 'dec' },
              ]"
              type="radio"
              dense
              inline
              class="q-gutter-sm"
            />
          </div>
        </div>
        <q-input v-else v-model="stringValue" dense outlined autofocus />
      </q-card-section>
      <q-card-actions align="right" class="q-gutter-sm">
        <q-btn label="OK" color="primary" unelevated @click="onSave" />
        <q-btn label="Cancel" flat v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { RegistryValue } from "@/types/agents";
import { ref, watch, computed } from "vue";

const props = defineProps<{
  modelValue: boolean;
  row: RegistryValue;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", row: RegistryValue & { base?: "hex" | "dec" }): void;
}>();

const localRow = ref<RegistryValue>({ ...props.row });
const localBase = ref<"hex" | "dec">("hex");
const stringValue = ref<string>(
  typeof props.row.data === "string" ? props.row.data : "",
);

const multiStringData = ref<string>(
  Array.isArray(props.row.data) ? props.row.data.join("\n") : "",
);

function parseValue(data: string | number): number {
  if (typeof data === "number") return data;
  if (typeof data === "string") {
    const matchHex = data.match(/0x[0-9a-fA-F]+/);
    const matchDec = data.match(/\((\d+)\)/);
    if (matchHex) return parseInt(matchHex[0], 16);
    if (matchDec) return parseInt(matchDec[1], 10);
    if (/^\d+$/.test(data)) return parseInt(data, 10);
  }
  return 0;
}

const numericValue = ref<number>(
  props.row.type === "REG_DWORD" || props.row.type === "REG_QWORD"
    ? parseValue(
        typeof props.row.data === "string" || typeof props.row.data === "number"
          ? props.row.data
          : 0,
      )
    : 0,
);

watch(
  () => props.row,
  (newVal) => {
    localRow.value = { ...newVal };
    if (newVal.type === "REG_DWORD" || newVal.type === "REG_QWORD") {
      numericValue.value = parseValue(
        typeof newVal.data === "string" || typeof newVal.data === "number"
          ? newVal.data
          : 0,
      );
      localBase.value = "hex";
    }
    if (newVal.type === "REG_MULTI_SZ" && Array.isArray(newVal.data)) {
      multiStringData.value = newVal.data.join("\n");
    }
    if (typeof newVal.data === "string") {
      stringValue.value = newVal.data;
    }
  },
  { deep: true, immediate: true },
);

// Formatted value for numeric
const formattedValue = computed({
  get() {
    return localBase.value === "hex"
      ? "0x" + numericValue.value.toString(16).toUpperCase().padStart(8, "0")
      : String(numericValue.value);
  },
  set(val: string) {
    if (localBase.value === "hex") {
      const hexStr = val.replace(/^0x/i, "");
      numericValue.value = parseInt(hexStr, 16) || 0;
    } else {
      numericValue.value = parseFloat(val) || 0;
    }
  },
});

// Restrict input based on base
function onKeyPress(e: KeyboardEvent) {
  if (localBase.value === "hex") {
    if (!/[0-9a-fA-Fx]/.test(e.key)) e.preventDefault();
  } else {
    if (!/[0-9.]/.test(e.key)) e.preventDefault();
  }
}

function onSave() {
  let updatedData: string | number | string[] = localRow.value.data;

  if (
    localRow.value.type === "REG_DWORD" ||
    localRow.value.type === "REG_QWORD"
  ) {
    updatedData =
      localBase.value === "hex"
        ? "0x" + numericValue.value.toString(16).toUpperCase().padStart(8, "0")
        : numericValue.value.toString();
  } else if (localRow.value.type === "REG_MULTI_SZ") {
    updatedData = multiStringData.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (typeof stringValue.value === "string") {
    updatedData = stringValue.value;
  }

  emit("save", {
    ...localRow.value,
    data: updatedData,
    base: localBase.value,
  });
}
</script>
