<template>
  <q-table
    ref="tacticalTable"
    :columns="localColumns"
    :visible-columns="visibleColumns"
    :table-class="{
      'table-bgcolor': !$q.dark.isActive,
      'table-bgcolor-dark': $q.dark.isActive,
      'column-bgcolor-dark': $q.dark.isActive && columnSelect,
      'column-bgcolor': !$q.dark.isActive && columnSelect,
      'sticky-header-right-column': columnSelect,
      'tbl-sticky': !columnSelect,
    }"
    v-bind="$attrs"
  >
    <template v-for="(_, slotName) in $slots" v-slot:[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>

    <template v-slot:header-cell-columnSelect="props">
      <q-th :props="props" auto-width>
        <q-btn dense flat icon="more_horiz">
          <q-menu>
            <q-option-group
              v-model="visibleColumns"
              :options="columnOptions"
              type="checkbox"
            />
          </q-menu>
        </q-btn>
      </q-th>
    </template>
  </q-table>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  inheritAttrs: false,
});
</script>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useStorage } from "@vueuse/core";
import type { QTableColumn } from "quasar";

const props = withDefaults(
  defineProps<{
    columns: QTableColumn[];
    columnSelect?: boolean;
    excludeColumns?: string[];
    storageKey?: string;
  }>(),
  { columnSelect: false, excludeColumns: () => [] },
);

const columnSelectCol = {
  name: "columnSelect",
  label: "Column Select",
  field: "columnSelect",
};

const localColumns = computed(() =>
  props.columnSelect ? [...props.columns, columnSelectCol] : [...props.columns],
);

const defaultNames = computed(() =>
  localColumns.value
    .map((c) => c.name)
    .filter((n) => !props.excludeColumns.includes(n)),
);

const storedNames = props.storageKey
  ? useStorage<string[]>(`${props.storageKey}columns`, [])
  : ref<string[]>([]);

const visibleColumns = computed<string[]>({
  get() {
    const valid = storedNames.value.filter((n) =>
      localColumns.value.some((c) => c.name === n),
    );
    return valid.length ? valid : defaultNames.value;
  },
  set(v) {
    storedNames.value = v;
  },
});

const columnOptions = computed(() =>
  localColumns.value
    .filter(
      (c) =>
        c.name !== "columnSelect" && !props.excludeColumns.includes(c.name),
    )
    .map((c) => ({ label: c.label, value: c.name })),
);
</script>

<style lang="sass">

.column-bgcolor-dark
  td:last-child
    /* bg color is important for td; just specify one */
    background-color: #1d1d1d

.column-bgcolor
  td:last-child
    /* bg color is important for td; just specify one */
    background-color: #ffffff

.sticky-header-right-column
  tr th
    position: sticky
    /* higher than z-index for td below */
    z-index: 2
  /* this will be the loading indicator */
  thead tr:last-child th
    /* height of all previous header rows */
    top: 48px
    /* highest z-index */
    z-index: 3
  thead tr:first-child th
    top: 0
    z-index: 1
  tr:last-child th:last-child
    /* highest z-index */
    z-index: 3
  th:last-child
    position: sticky
    right: 0
  /* prevent scrolling behind sticky top row on focus */
  tbody
    /* height of all previous header rows */
    scroll-margin-top: 48px

td.filter-inputs
  .q-field--dense .q-field__control, .q-field--dense .q-field__marginal
    height: 30px
  .q-field--auto-height.q-field--dense .q-field__control, .q-field--auto-height.q-field--dense .q-field__native
    min-height: 30px
  .q-field__control
    padding-right: 5px
    padding-left: 10px
</style>
