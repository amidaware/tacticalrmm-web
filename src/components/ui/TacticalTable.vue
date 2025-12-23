<template>
  <q-table
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
    <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
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
import { ref } from "vue";
import { type QTableColumn } from "quasar";
const props = withDefaults(
  defineProps<{
    columns: QTableColumn[];
    columnSelect?: boolean;
    excludeColumns?: string[];
  }>(),
  { columnSelect: false, excludeColumns: () => ["columnSelect"] },
);
// save a non-reactive copy of columns to modify
const localColumns: QTableColumn[] = Object.assign([], props.columns);
if (props.columnSelect)
  localColumns.push({
    name: "columnSelect",
    label: "Column Select",
    field: "columnSelect",
  });
const visibleColumns = ref(localColumns.map((column) => column.name));
const columnOptions = ref(
  localColumns
    .filter((column) => !props.excludeColumns.includes(column.name))
    .map((column) => ({ label: column.label, value: column.name })),
);
</script>

<style lang="sass">

.column-bgcolor-dark
  tbody tr td:last-child
    /* bg color is important for td; just specify one */
    background-color: var(--q-dark) !important

.column-bgcolor
  tbody tr td:last-child
    /* bg color is important for td; just specify one */
    background-color: var(--q-light-card, #ffffff) !important

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
  thead tr:last-child th
    top: 0
    z-index: 1
  tr:last-child th:last-child
    /* highest z-index */
    z-index: 3
  td:last-child
    z-index: 1
  td:last-child, th:last-child
    position: sticky
    right: 0
  /* prevent scrolling behind sticky top row on focus */
  tbody
    /* height of all previous header rows */
    scroll-margin-top: 48px
</style>
