<template>
  <div>
    <div class="q-pa-sm bg-grey-4 text-dark text-body2 folder-path">
      Computer\{{ currentPath }}
    </div>
    <q-splitter v-model="splitter" :style="{ height: height }">
      <!-- (Left Pane: Registry Keys) -->
      <template #before>
        <q-tree
          class="q-pb-md q-pt-xs"
          ref="registryTree"
          v-model:selected="selectedKey"
          node-key="id"
          label-key="label"
          :nodes="registryNodes"
          :lazy="true"
          :loading.sync="loading"
          selected-color="primary"
          @lazy-load="loadChildren"
          @update:selected="onKeySelect"
        >
          <template v-slot:default-header="prop">
            <div
              class="row items-center"
              @dblclick="toggleNode(prop.node)"
              style="cursor: pointer"
            >
              <q-icon name="folder" class="q-mr-sm text-yellow-7" size="18px" />
              <span>{{ prop.node.label }}</span>
            </div>
            <q-menu
              context-menu
              transition-show="jump-up"
              transition-hide="jump-down"
            >
              <q-list dense style="min-width: 180px">
                <q-item clickable>
                  <q-item-section>New</q-item-section>
                  <q-item-section side>
                    <q-icon name="chevron_right" />
                  </q-item-section>
                  <q-menu
                    anchor="top end"
                    self="top start"
                    transition-show="jump-right"
                    transition-hide="jump-left"
                  >
                    <q-list dense style="min-width: 220px">
                      <q-item
                        v-for="item in registryValueTypes"
                        :key="item.type"
                        clickable
                        v-close-popup
                        @click="
                          item.type === 'KEY'
                            ? createKey(prop.node)
                            : createValue(prop.node, item.type)
                        "
                      >
                        <q-item-section>{{ item.label }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-item>
                <q-item clickable v-close-popup @click="renameKey(prop.node)">
                  <q-item-section>Rename</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="deleteKey(prop.node)">
                  <q-item-section>Delete</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </template>
        </q-tree>
      </template>
      <!-- (Right Pane: Path + Registry Values) -->
      <template #after>
        <div class="column full-height">
          <q-table
            class="col"
            :rows="tableRows"
            :columns="columns"
            row-key="name"
            flat
            bordered
            dense
            no-data-label="No values found"
            :loading="loading"
          >
            <template #body-cell-name="props">
              <q-td :props="props" class="registry-cell">
                <div class="cell-text">{{ props.row.name }}</div>
                <div class="cell-hover">{{ props.row.name }}</div>
                <q-menu
                  context-menu
                  transition-show="jump-up"
                  transition-hide="jump-down"
                >
                  <q-list dense style="min-width: 180px">
                    <q-item
                      clickable
                      v-close-popup
                      @click="openDialog('edit', props.row)"
                    >
                      <q-item-section>Modify</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="openDialog('rename', props.row)"
                    >
                      <q-item-section>Rename</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="deleteValue(props.row)"
                    >
                      <q-item-section>Delete</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-td>
            </template>
            <template #body-cell-type="props">
              <q-td :props="props">{{ props.row.type }}</q-td>
            </template>
            <template #body-cell-data="props">
              <q-td :props="props">{{ props.row.data }}</q-td>
            </template>
          </q-table>
        </div>
      </template>
    </q-splitter>
    <q-dialog v-model="editDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Edit Registry Value</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="editRow.name" label="Name" filled disable />
          <q-input v-model="editRow.type" label="Type" filled disable />
          <q-input v-model="editRow.data" label="Data" filled type="textarea" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat dense label="Cancel" v-close-popup />
          <q-btn flat label="Save" color="primary" @click="saveRow('edit')" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Rename Dialog -->
    <q-dialog v-model="renameDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Rename Registry Value</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="renameRow.name" label="New Name" filled />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat dense label="Cancel" v-close-popup />
          <q-btn flat label="Save" color="primary" @click="saveRow('rename')" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  dummyRegistry,
  registryTableColumns,
  registryValueTypes,
} from "@/constants/constants";
import { RegistryNode, RegistryValue } from "@/types/agents";

const splitter = ref(25);
const height = "100vh";
const loading = ref(false);
const selectedKey = ref<string | null>(null);
const currentPath = ref<string>("");

// Registry tree nodes
const registryNodes = ref<RegistryNode[]>([
  { id: "HKEY_CLASSES_ROOT", label: "HKEY_CLASSES_ROOT", lazy: true },
  { id: "HKEY_CURRENT_USER", label: "HKEY_CURRENT_USER", lazy: true },
  { id: "HKEY_LOCAL_MACHINE", label: "HKEY_LOCAL_MACHINE", lazy: true },
  { id: "HKEY_USERS", label: "HKEY_USERS", lazy: true },
  { id: "HKEY_CURRENT_CONFIG", label: "HKEY_CURRENT_CONFIG", lazy: true },
]);

const columns = registryTableColumns;
const tableRows = ref<RegistryValue[]>([]);

// Dialog state
const editDialog = ref(false);
const renameDialog = ref(false);
const registryTree = ref();
const editRow = ref<RegistryValue>({ name: "", type: "", data: "" });
const renameRow = ref<RegistryValue>({ name: "", type: "", data: "" });

function toggleNode(node: RegistryNode) {
  if (!registryTree.value) return;
  if (node.lazy || dummyRegistry[node.id]?.keys?.length) {
    registryTree.value.setExpanded(
      node.id,
      !registryTree.value.isExpanded(node.id),
    );
  }
}

function loadChildren({
  node,
  done,
}: {
  node: RegistryNode;
  done: (children: RegistryNode[]) => void;
}) {
  loading.value = true;
  setTimeout(() => {
    const entry = dummyRegistry[node.id];
    const keys = entry?.keys || [];
    const children = keys.map((key) => {
      const childId = `${node.id}\\${key}`;
      const hasSubkeys = (dummyRegistry[childId]?.keys?.length ?? 0) > 0;
      return { id: childId, label: key, lazy: hasSubkeys };
    });
    done(children);
    loading.value = false;
  }, 400);
}

function onKeySelect(nodeId: string) {
  const entry = dummyRegistry[nodeId];
  tableRows.value = entry?.values || [];
  currentPath.value = nodeId;
}

function openDialog(type: "edit" | "rename", row: RegistryValue) {
  if (type === "edit") {
    editRow.value = { ...row };
    editDialog.value = true;
  } else {
    renameRow.value = { ...row };
    renameDialog.value = true;
  }
}

function saveRow(type: "edit" | "rename") {
  const target = type === "edit" ? editRow.value : renameRow.value;
  const index = tableRows.value.findIndex((r) => r.name === target.name);
  if (index !== -1) {
    if (type === "edit") tableRows.value[index] = { ...target };
    else tableRows.value[index].name = target.name;
  }
  type === "edit" ? (editDialog.value = false) : (renameDialog.value = false);
}

function deleteValue(row: RegistryValue) {
  tableRows.value = tableRows.value.filter((r) => r.name !== row.name);
}

function createKey(node: RegistryNode) {
  const entry = dummyRegistry[node.id];
  if (!entry.keys) entry.keys = [];
  const newKey = "NewKey";
  entry.keys.push(newKey);
  dummyRegistry[`${node.id}\\${newKey}`] = { values: [] };
}

function createValue(node: RegistryNode, type: string) {
  const entry = dummyRegistry[node.id];
  if (!entry.values) entry.values = [];
  entry.values.push({ name: "NewValue", type, data: "" });
  if (currentPath.value === node.id) {
    tableRows.value = [...entry.values];
  }
}

function renameKey(node: RegistryNode) {
  console.log("Rename folder:", node.label);
}

function deleteKey(node: RegistryNode) {
  delete dummyRegistry[node.id];
  console.log("Deleted folder:", node.label);
}
</script>

<style scoped>
.registry-cell {
  position: relative;
  overflow: visible !important;
}
.cell-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-hover {
  position: absolute;
  top: -1px;
  left: 0;
  white-space: nowrap;
  background: rgb(156, 153, 153);
  display: none;
  padding: 5px 6px 3px 16px;
  min-width: 100%;
  border: 1px solid #000;
  z-index: 100;
}
.registry-cell:hover .cell-hover {
  display: block;
}
.registry-cell:hover .cell-text {
  visibility: hidden;
}
::v-deep(.q-table__middle) {
  overflow: visible !important;
}
.folder-path {
  border: 1px solid #ccc;
  height: 36px;
}
</style>
