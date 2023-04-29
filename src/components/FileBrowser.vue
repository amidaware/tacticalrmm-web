<template>
  <div>
    <q-splitter v-model="splitter" :style="{ height: height }">
      <!-- folder view -->
      <template #before>
        <q-tree
          ref="folderTree"
          v-model:selected="selectedTreeNode"
          node-key="id"
          filter="filter"
          no-selection-unset
          selected-color="primary"
          :filter-method="(node: QTreeFileNode/*,  filter */) => node.type === 'folder'"
          :nodes="nodes"
          @update:selected="onFolderSelection"
          @lazy-load="loadNodeChildren"
        />
      </template>

      <!-- file/folder list -->
      <template #after>
        <q-table
          ref="tableRef"
          v-model:selected="selectedTableNodes"
          :rows="tableRows"
          :columns="tableColumns"
          :loading="loading"
          dense
          no-data-label="Folder is Empty"
          binary-state-sort
          virtual-scroll
          selection="multiple"
          row-key="id"
          :pagination="{ sortBy: 'type', descending: true }"
          :rows-per-page-options="[0]"
          :table-class="{
            'table-bgcolor': !$q.dark.isActive,
            'table-bgcolor-dark': $q.dark.isActive,
          }"
          :style="{ 'max-height': height }"
          class="tbl-sticky"
        >
          <template #top>
            <slot
              name="action-bar"
              v-bind="{ selectedTreeNode: folderTree?.getNodeByKey(selectedTreeNode) as QTreeFileNode, selectedTableNodes: selectedTableNodes as FileSystemNodeTable[]}"
            ></slot>
          </template>

          <template #body="slotProps">
            <q-tr
              class="cursor-pointer"
              @dblclick.prevent="doubleClickTableRow(slotProps.row)"
            >
              <!-- Context Menu -->
              <slot
                name="table-menu"
                v-bind="{ item: slotProps.row as FileSystemNodeTable, selectedTreeNode: folderTree?.getNodeByKey(selectedTreeNode) as QTreeFileNode }"
              ></slot>

              <!-- rows -->
              <q-td>
                <q-checkbox v-model="slotProps.selected" dense />
              </q-td>

              <q-td>
                <q-icon
                  class="q-mr-sm"
                  :color="
                    slotProps.row.type === 'folder' ? 'yellow-9' : 'primary'
                  "
                  size="sm"
                  :name="
                    slotProps.row.type === 'folder' ? 'folder' : 'description'
                  "
                />{{ slotProps.row.name }}
              </q-td>
              <q-td>{{ slotProps.row.type }}</q-td>
              <q-td>{{ slotProps.row.size }}</q-td>
            </q-tr>
          </template>
        </q-table>
      </template>
    </q-splitter>
  </div>
</template>

<script lang="ts" setup>
// composition imports
import { ref, toRef, onMounted } from "vue";
import { isDefined } from "@vueuse/core";

// type imports
import type { QTableColumn, QTreeLazyLoadParams, QTree, QTable } from "quasar";

import type {
  LazyLoadCallbackParams,
  FileSystemNodeTable,
  QTreeFileNode,
} from "../types/filebrowser";

// emits
const emit = defineEmits<{
  (event: "lazy-load", callback: LazyLoadCallbackParams): void;
}>();

// props
const props = withDefaults(
  defineProps<{
    nodes: QTreeFileNode[];
    loading?: boolean;
    separator?: "windows" | "unix";
    height?: string;
  }>(),
  {
    separator: "unix",
    loading: false,
    height: "200px",
  }
);

// expose public methods
defineExpose({
  getNodeByKey: (nodeKey: string): QTreeFileNode =>
    folderTree.value?.getNodeByKey(nodeKey),
  reloadTable: reloadTable,
});

const fileSeparator = props.separator === "unix" ? "/" : "\\";
const folderTree = ref<InstanceType<typeof QTree> | null>(null);
const tableRef = ref<InstanceType<typeof QTable> | null>(null);

const selectedTreeNode = ref(fileSeparator);
const selectedTableNodes = ref([] as FileSystemNodeTable[]);
const splitter = ref(25);
const nodes = toRef(props, "nodes");
const tableRows = ref([] as FileSystemNodeTable[]);
const tableColumns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "type",
    label: "Type",
    field: "type",
    align: "left",
    sortable: true,
  },
  {
    name: "size",
    label: "Size",
    field: "size",
    align: "left",
    sortable: true,
  },
];

function doubleClickTableRow(file: FileSystemNodeTable) {
  if (file.type == "file") return;

  selectedTreeNode.value = file.id;
  onFolderSelection(file.id);
}

function reloadTable(parentNodeKey: string = selectedTreeNode.value) {
  tableRows.value = [];
  selectedTableNodes.value = [];
  const node: QTreeFileNode = folderTree.value?.getNodeByKey(parentNodeKey);
  if (isDefined(node.children)) {
    tableRows.value = parseNodeChildrenIntoTable(node);
  }
}

function onFolderSelection(nodeKey: string) {
  !folderTree.value?.isExpanded(nodeKey)
    ? folderTree.value?.setExpanded(nodeKey, true)
    : undefined;
  reloadTable(nodeKey);
}

function loadNodeChildren({ node, key, done, fail }: QTreeLazyLoadParams) {
  const isDone = (loadedChildren: QTreeFileNode[]) => {
    done(loadedChildren);
    reloadTable(key);
  };

  const isFail = () => {
    fail();
  };

  // re-emit lazy load event so parent can call api
  emit("lazy-load", {
    isDone,
    isFail,
    path: node.path,
  });
}

// parses children of node into table rows
function parseNodeChildrenIntoTable(
  node: QTreeFileNode
): FileSystemNodeTable[] {
  if (isDefined(node.children)) {
    return node.children.map((childNode) => ({
      id: childNode.id,
      name: childNode.label as string,
      path: childNode.path,
      type: childNode.type,
      size: childNode.size,
    }));
  } else {
    return [];
  }
}

// TODO: figure this shit out multiple selection with shift-click
// let storedSelectedRow: FileSystemNodeTable;

// function onSelection({
//   rows,
//   added,
//   evt,
// }: {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   rows: readonly unknown[];
//   added: boolean;
//   evt: Event;
// }) {
//   // ignore selection change from header of not from a direct click event
//   if (!isDefined(tableRef.value) || rows.length !== 1 || !isDefined(evt)) {
//     return;
//   }

//   const oldSelectedRow = storedSelectedRow;
//   const newSelectedRow = rows[0] as FileSystemNodeTable;
//   const { ctrlKey, shiftKey } = evt as KeyboardEvent;

//   if (!shiftKey) {
//     storedSelectedRow = newSelectedRow;
//   }

//   // wait for the default selection to be performed
//   nextTick(() => {
//     if (!isDefined(tableRef.value)) return;
//     if (shiftKey === true) {
//       const tableRows = tableRef.value.filteredSortedRows;
//       let firstIndex = tableRows.indexOf(oldSelectedRow);
//       let lastIndex = tableRows.indexOf(newSelectedRow);

//       if (firstIndex < 0) {
//         firstIndex = 0;
//       }

//       if (firstIndex > lastIndex) {
//         [firstIndex, lastIndex] = [lastIndex, firstIndex];
//       }

//       const rangeRows = tableRows.slice(
//         firstIndex,
//         lastIndex + 1
//       ) as FileSystemNodeTable[];
//       // we need the original row object so we can match them against the rows in range
//       const selectedRows = selectedTableNodes.value.map(
//         toRaw(storedSelectedRow)
//       ) as FileSystemNodeTable[];

//       selectedTableNodes.value = added
//         ? selectedRows.concat(
//             rangeRows.filter((row) => selectedRows.includes(row) === false)
//           )
//         : selectedRows.filter((row) => rangeRows.includes(row) === false);
//     } else if (ctrlKey !== true && added === true) {
//       selectedTableNodes.value = [newSelectedRow];
//     }
//   });
// }

onMounted(() => {
  // make sure the table on the right is always populated and selected node is expanded
  selectedTreeNode.value = nodes.value[0].id;
  folderTree.value?.setExpanded(selectedTreeNode.value, true);
});
</script>
