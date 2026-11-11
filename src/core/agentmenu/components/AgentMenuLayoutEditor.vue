<template>
  <div>
    <draggable
      v-model="rows"
      class="q-list q-list--dense q-list--bordered rounded-borders"
      handle=".handle"
      item-key="id"
      @end="emitLayout"
    >
      <template #item="{ element }">
        <q-item dense>
          <q-item-section avatar>
            <q-icon class="handle" name="drag_indicator" style="cursor: move" />
          </q-item-section>
          <q-item-section side>
            <q-icon size="xs" :name="element.icon" />
          </q-item-section>
          <q-item-section :class="{ 'text-grey': !element.visible }">
            {{ element.label }}
          </q-item-section>
          <q-item-section side>
            <q-checkbox
              v-model="element.visible"
              dense
              @update:model-value="emitLayout"
            >
              <q-tooltip>Show in menu</q-tooltip>
            </q-checkbox>
          </q-item-section>
        </q-item>
      </template>
    </draggable>
    <div class="q-mt-sm text-caption text-grey">
      "Close" always stays at the bottom. Hiding an entry does not change
      permissions.
    </div>
    <q-btn
      class="q-mt-sm"
      flat
      dense
      no-caps
      icon="restart_alt"
      label="Reset to default"
      @click="emit('update:modelValue', {})"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import draggable from "vuedraggable";

import { AGENT_MENU_ITEMS } from "@/core/agentmenu/items";
import { layoutFromRows, orderedIds } from "@/core/agentmenu/resolve";
import type { AgentMenuItem, AgentMenuLayout } from "@/core/agentmenu/types";

interface Row extends AgentMenuItem {
  visible: boolean;
}

const props = defineProps<{ modelValue: AgentMenuLayout | null | undefined }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: AgentMenuLayout): void;
}>();

const byId = new Map(AGENT_MENU_ITEMS.map((item) => [item.id, item]));
const rows = ref<Row[]>([]);

function buildRows(layout: AgentMenuLayout) {
  const hidden = new Set(layout.hidden ?? []);
  rows.value = orderedIds(layout, [...byId.keys()]).map((id) => ({
    ...(byId.get(id) as AgentMenuItem),
    visible: !hidden.has(id),
  }));
}

function emitLayout() {
  emit("update:modelValue", layoutFromRows(rows.value));
}

watch(
  () => props.modelValue,
  (value) => buildRows(value || {}),
  { immediate: true, deep: true },
);
</script>
