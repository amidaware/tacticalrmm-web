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
    :filterMethod="filterHeader ? filterMethod : undefined"
    :filter="filterHeader ? filterTerms : undefined"
    v-table-resizable="resizableColumns"
    v-bind="$attrs"
  >
    <template v-for="(_, slotName) in $slots" v-slot:[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>

    <template v-if="filterHeader" v-slot:top-row="props">
      <q-tr :props="props">
        <q-td v-if="$attrs.selection"></q-td>
        <q-td v-for="col in props.cols" :key="col.name" class="filter-inputs">
          <!-- select box -->
          <q-select
            v-if="col.filterType === 'select' || col.filterType === 'boolean'"
            outlined
            dense
            v-model.trim="filter[col.name]"
            hide-bottom-space
            options-dense
            multiple
            clearable
            @clear="filter[col.name] = []"
            :display-value="getSelectDisplayValue(filter[col.name])"
            :options="
              col.filterType === 'select' ? col.filterOptions : ['Yes', 'No']
            "
          >
            <template
              v-slot:option="{ itemProps, opt, selected, toggleOption }"
            >
              <q-item v-bind="itemProps" dense>
                <q-item-section side>
                  <q-checkbox
                    dense
                    :model-value="selected"
                    @update:model-value="toggleOption(opt)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label v-html="opt" />
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- text field -->
          <q-input
            v-else-if="col.filterType === 'text'"
            outlined
            dense
            v-model.trim="filter[col.name]"
            hide-bottom-space
            clearable
            @clear="filter[col.name] = ''"
            class="filter-inputs"
          />

          <!-- date range selector -->
          <q-input
            v-else-if="col.filterType === 'date'"
            :model-value="getDateDisplayValue(filter[col.name])"
            outlined
            dense
            clearable
            @clear="filter[col.name] = ''"
            @focus="
              filter[col.name] === undefined
                ? (filter[col.name] = '')
                : undefined
            "
          >
            <q-popup-proxy
              cover
              transition-show="scale"
              transition-hide="scale"
            >
              <q-date v-model="filter[col.name]" range />
            </q-popup-proxy>
          </q-input>

          <!-- don't add filter input for column select-->
          <div v-else></div>
        </q-td>
      </q-tr>
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
import { ref, reactive, computed, watch, useTemplateRef, onMounted } from "vue";
import { watchArray } from "@vueuse/shared";
import { useStorage } from "@vueuse/core";
import { QTable, type QTableColumn } from "quasar";
import { vTableResizable } from "@/core/dashboard/ui/directives/TableResizable";

const props = withDefaults(
  defineProps<{
    columns: QTableColumn[];
    columnSelect?: boolean;
    excludeColumns?: string[];
    filterHeader?: boolean;
    resizableColumns?: boolean;
    storageKey?: string;
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

// filter types
const tacticalTable = useTemplateRef<QTable>("tacticalTable");

type Filter = string | string[] | { to: string; from: string };
type FilterTerm = {
  column: string;
  values: string[] | { to: string; from: string }[];
};

// filter type guards
function isStringArrayFilter(value: Filter): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isDateFilter(value: Filter): value is { to: string; from: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value &&
    typeof value.from === "string" &&
    typeof value.to === "string"
  );
}

// filter input display functions
function getSelectDisplayValue(filterValue: Filter): string {
  if (isStringArrayFilter(filterValue) && filterValue.length > 0) {
    return `${filterValue.length} Selected`;
  }
  return "";
}

function getDateDisplayValue(filterValue: Filter): string {
  if (isDateFilter(filterValue))
    return `${filterValue.from} - ${filterValue.to}`;
  else return "";
}
const filter = reactive<{
  [key: string]: Filter;
}>({});

const filterTerms = computed((): FilterTerm[] => {
  return getFilterTerms(filter);
});

const getFilterTerms = (filter: { [key: string]: Filter }): FilterTerm[] => {
  return Object.entries(filter).map(([column, value]) => {
    // ensure the value is always an array for consistent processing
    const values = Array.isArray(value) ? value : [value];
    return { column, values } as FilterTerm;
  });
};

const filterMethod = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[],
  terms: FilterTerm[],
) => {
  // if no filter terms are provided, return all rows
  if (terms.length === 0) {
    return rows;
  }

  tacticalTable.value?.clearSelection();

  for (const term of terms) {
    // skip filtering if the term's values array is empty
    if (term.values.length === 0) {
      continue;
    }

    rows = rows.filter((row) => {
      return term.values.some((value) => {
        if (typeof value === "object" && "from" in value && "to" in value) {
          // handle date range filtering
          const fromDate = value.from ? new Date(value.from) : null;
          const toDate = value.to ? new Date(value.to) : null;
          const rowDate = new Date(row[term.column]);

          // exclude invalid dates
          if (isNaN(rowDate.getTime())) return false;
          if (fromDate && rowDate < fromDate) return false;
          if (toDate && rowDate > toDate) return false;

          return true;
        } else if (typeof row[term.column] == "boolean") {
          const boolValue = value.toLowerCase() === "yes" ? "true" : "false";
          return ("" + row[term.column]).includes(boolValue);
        } else if (typeof value === "string") {
          // Handle case-insensitive matching for string values
          return ("" + row[term.column])
            .toLowerCase()
            .includes(value.toLowerCase());
        }

        return false;
      });
    });
  }

  return rows;
};

// watch visible columns and clear filter if column is hidden
watchArray(visibleColumns, (_, __, ___, removed) => {
  delete filter[removed[0]];
});

// save visible columns to local storage
if (props.storageKey) {
  const storedVisibleColumns = useStorage<string[]>(props.storageKey, []);

  onMounted(() => {
    if (storedVisibleColumns.value.length > 0) {
      // only assign valid column names
      visibleColumns.value = storedVisibleColumns.value.filter((name: string) =>
        localColumns.some((col) => col.name === name),
      );
    }
  });

  // watch for changes and save to local storage
  watch(visibleColumns, (newValue) => {
    storedVisibleColumns.value = newValue;
  });
}
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
