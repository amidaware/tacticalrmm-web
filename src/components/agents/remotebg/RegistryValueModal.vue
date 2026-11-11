<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
    persistent
  >
    <q-card style="min-width: 420px; max-width: 480px">
      <q-card-section class="q-pb-none">
        <div class="text-subtitle1">
          {{
            row.name
              ? $t("remoteBg.registry.valueModal.editTitle", {
                  type: typeLabel,
                })
              : $t("remoteBg.registry.valueModal.createTitle", {
                  type: typeLabel,
                })
          }}
        </div>
      </q-card-section>

      <q-card-section class="q-pb-none">
        <div class="text-body2 q-mb-xs">
          {{ $t("remoteBg.registry.valueModal.valueName") }}
        </div>
        <q-input
          v-model="localRow.name"
          ref="nameInputRef"
          dense
          outlined
          :readonly="!!row.name"
          :disable="!!row.name"
          :autofocus="!row.name"
          :rules="[
            (val) => !!val || $t('remoteBg.registry.valueModal.nameRequired'),
          ]"
          lazy-rules
          class="q-pb-sm"
        />
      </q-card-section>
      <q-card-section>
        <div class="text-body2 q-mb-sm">
          {{ $t("remoteBg.registry.valueModal.valueData") }}
        </div>
        <q-input
          v-if="row.type === 'REG_MULTI_SZ'"
          v-model="multiStringData"
          type="textarea"
          dense
          outlined
          :autofocus="!!row.name"
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
              :error="!!numericError"
              :error-message="numericError"
              @keypress="onKeyPress"
            />
          </div>
          <div class="col-5 q-py-none">
            <div class="text-body2 q-mb-xs">
              {{ $t("remoteBg.registry.valueModal.base") }}
            </div>
            <q-option-group
              v-model="localBase"
              :options="[
                {
                  label: $t('remoteBg.registry.valueModal.hexadecimal'),
                  value: 'hex',
                },
                {
                  label: $t('remoteBg.registry.valueModal.decimal'),
                  value: 'dec',
                },
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
        <q-btn
          :label="$t('common.ok')"
          color="primary"
          unelevated
          @click="onSave"
          :loading="isSaving"
          :disable="isSaving"
        />
        <q-btn
          :label="$t('common.cancel')"
          flat
          v-close-popup
          :disable="isSaving"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { QInput } from "quasar";
import { useI18n } from "vue-i18n";
import { RegistryValue } from "@/types/agents";

const props = defineProps<{
  modelValue: boolean;
  row: RegistryValue;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", row: RegistryValue & { base?: "hex" | "dec" }): void;
}>();

const { t } = useI18n();

const typeLabel = computed(() => {
  switch (props.row.type) {
    case "REG_DWORD":
      return t("remoteBg.registry.valueModal.types.dword");
    case "REG_QWORD":
      return t("remoteBg.registry.valueModal.types.qword");
    case "REG_MULTI_SZ":
      return t("remoteBg.registry.valueModal.types.multiString");
    default:
      return t("remoteBg.registry.valueModal.types.string");
  }
});

const nameInputRef = ref();
const numericError = ref<string>("");
const isSaving = ref(false);
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
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  }
}

async function onSave() {
  numericError.value = "";
  const input: QInput | null = nameInputRef.value;
  if (input && !(input.validate?.() ?? true)) return;
  if (
    localRow.value.type === "REG_DWORD" ||
    localRow.value.type === "REG_QWORD"
  ) {
    const maxValue =
      localRow.value.type === "REG_DWORD"
        ? 0xffffffff // 4,294,967,295
        : Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991 (safe 64-bit limit)

    if (numericValue.value < 0) {
      numericError.value = t("remoteBg.registry.valueModal.negative");
      return;
    }

    if (numericValue.value > maxValue) {
      numericError.value =
        localRow.value.type === "REG_DWORD"
          ? t("remoteBg.registry.valueModal.dwordMax")
          : t("remoteBg.registry.valueModal.qwordMax");
      return;
    }
  }

  isSaving.value = true;
  try {
    let updatedData: string | number | string[] = localRow.value.data;

    if (
      localRow.value.type === "REG_DWORD" ||
      localRow.value.type === "REG_QWORD"
    ) {
      updatedData =
        localBase.value === "hex"
          ? "0x" +
            numericValue.value.toString(16).toUpperCase().padStart(8, "0")
          : numericValue.value.toString();
    } else if (localRow.value.type === "REG_MULTI_SZ") {
      updatedData = multiStringData.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (typeof stringValue.value === "string") {
      updatedData = stringValue.value;
    }
    await emit("save", {
      ...localRow.value,
      data: updatedData,
      base: localBase.value,
    });
    emit("update:modelValue", false);
  } finally {
    isSaving.value = false;
  }
}
</script>
