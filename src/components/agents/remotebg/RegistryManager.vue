<template>
  <div>
    <div class="q-pa-sm bg-grey-4 text-dark text-body2 folder-path">
      Computer\{{ currentPath }}
    </div>
    <q-splitter v-model="splitter" :style="{ height: 'calc(100vh - 72px)' }">
      <!-- (Left Pane: Registry Keys) -->
      <template #before>
        <q-tree
          class="q-pb-xs q-pt-xs"
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
              class="row items-center nowrap flex-nowrap"
              @dblclick="toggleNode(prop.node)"
              style="cursor: pointer"
            >
              <q-icon name="folder" class="q-mr-sm text-yellow-7" size="18px" />
              <q-input
                @click.stop
                v-if="editingNodeId === prop.node.id"
                v-model="editLabel"
                dense
                autofocus
                :id="`input-${prop.node.id.replace(/\\/g, '-')}`"
                @keyup.enter="finishRename(prop.node, 'enter')"
                @blur="finishRename(prop.node, 'blur')"
                outlined
                style="max-width: 200px"
              />
              <span v-else>{{ prop.node.label }}</span>
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
        <div class="column full-height q-pb-md">
          <div class="col relative-position" style="flex: 1; overflow: auto">
            <q-menu
              v-model="emptySpaceMenu"
              context-menu
              transition-show="jump-up"
              transition-hide="jump-down"
            >
              <q-list dense style="min-width: 130px">
                <q-item
                  clickable
                  style="padding-right: 3px; padding-left: 12px"
                >
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
                            ? safeCreateKey()
                            : safeCreateKey()
                        "
                      >
                        <q-item-section>{{ item.label }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-item>
              </q-list>
            </q-menu>
            <q-table
              class="col"
              :rows="tableRows"
              :columns="columns"
              row-key="name"
              flat
              dense
              hide-pagination
              no-data-label="No values found"
              :loading="loading"
              :pagination="{ rowsPerPage: 0 }"
            >
              <template #body-cell-name="props">
                <q-td :props="props" class="registry-cell">
                  <q-input
                    v-if="editingValueName === props.row.name"
                    v-model="editValueName"
                    dense
                    autofocus
                    :id="`value-input-${props.row.name}`"
                    @keyup.enter="finishRenameValue(props.row, 'enter')"
                    @blur="finishRenameValue(props.row, 'blur')"
                    outlined
                    style="max-width: 200px"
                    @click.stop
                  />
                  <div v-else>
                    <div class="cell-text">{{ props.row.name }}</div>
                    <div class="cell-hover">{{ props.row.name }}</div>
                  </div>
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
                        @click="renameValue(props.row)"
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
        </div>
      </template>
    </q-splitter>
    <!-- Confirm Delete Key/Value Dialog -->
    <ConfirmDialog
      v-model="confirmDeleteKeyDialog"
      title="Confirm Key Delete"
      message="Are you sure you want to permanently delete this key and all of its subkeys?"
      @confirm="confirmDeleteKey"
    />
    <ConfirmDialog
      v-model="confirmDeleteValueDialog"
      title="Confirm Value Delete"
      message="Deleting certain registry values could cause system instability. Are you sure you want to permanently delete this value?"
      @confirm="confirmDeleteValue"
    />

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
import { ref, onMounted, nextTick } from "vue";
import {
  registryTableColumns,
  registryValueTypes,
} from "@/constants/constants";
import { RegistryNode, RegistryValue } from "@/types/agents";
import {
  createRegistryKey,
  deleteRegistryKey,
  deleteRegistryValue,
  fetchAgentRegistry,
  renameRegistryKey,
  renameRegistryValue,
} from "@/api/agents";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

const props = defineProps<{
  agent_id: string;
}>();

const splitter = ref(25);
const loading = ref(false);
const selectedKey = ref<string | null>(null);
const currentPath = ref<string>();
const registryNodes = ref<RegistryNode[]>([]);
const columns = registryTableColumns;
const tableRows = ref<RegistryValue[]>([]);
const editingNodeId = ref<string | null>(null);
const pendingNodes = ref<Record<string, RegistryNode[]>>({});
const editLabel = ref("");
const emptySpaceMenu = ref(false);

// Dialog state
const editDialog = ref(false);
const renameDialog = ref(false);
const registryTree = ref();
const editRow = ref<RegistryValue>({ name: "", type: "", data: "" });
const renameRow = ref<RegistryValue>({ name: "", type: "", data: "" });
let originalName = ref<string>("");
const confirmDeleteKeyDialog = ref(false);
const nodeToDelete = ref<RegistryNode | null>(null);
const confirmDeleteValueDialog = ref(false);
const valueToDelete = ref<RegistryValue | null>(null);
const editingValueName = ref<string | null>(null);
const editValueName = ref("");
const renameOpenedAt = ref<number | null>(null);
const isFinishingRename = ref(false);
const valueRenameOpenedAt = ref<number | null>(null);
const isFinishingValueRename = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const data = await fetchAgentRegistry(props.agent_id, "Computer");
    const keys = data?.subkeys || [];
    registryNodes.value = keys.map(
      (key: { name: string; hasSubkeys: boolean }) => ({
        id: `${key.name}\\`,
        label: key.name,
        lazy: key.hasSubkeys,
      }),
    );
    if (data?.values) {
      tableRows.value = data.values;
    }
  } catch (err) {
    console.error("Failed to fetch root registry nodes:", err);
  } finally {
    loading.value = false;
  }
});

function toggleNode(node: RegistryNode) {
  if (editingNodeId.value && editingNodeId.value.includes(node.id)) {
    return;
  }
  if (!registryTree.value) return;
  registryTree.value.setExpanded(
    node.id,
    !registryTree.value.isExpanded(node.id),
  );
}

async function loadChildren({
  node,
  done,
}: {
  node: RegistryNode;
  done: (children: RegistryNode[]) => void;
}) {
  loading.value = true;
  try {
    const data = await fetchAgentRegistry(props.agent_id, node.id);
    const keys = data?.subkeys || [];
    const children = keys.map((key: { name: string; hasSubkeys: boolean }) => {
      const id = node.id.endsWith("\\")
        ? `${node.id}${key.name}\\`
        : `${node.id}\\${key.name}\\`;
      return {
        id,
        label: key.name,
        lazy: key.hasSubkeys, // only show arrow if subkeys exist
      };
    });

    const tempNodes = pendingNodes.value[node.id] || [];
    done([...tempNodes, ...children]);
  } catch (err) {
    console.error("Failed to load registry children:", err);
    done(pendingNodes.value[node.id] || []);
  } finally {
    loading.value = false;
  }
}

async function onKeySelect(nodeId: string) {
  if (!nodeId) return;
  if (editingNodeId.value && nodeId === editingNodeId.value) {
    return;
  }
  if (nodeId.includes("__temp_new_key__")) {
    return;
  }
  loading.value = true;
  try {
    const data = await fetchAgentRegistry(props.agent_id, nodeId);
    tableRows.value = data?.values || [];
    currentPath.value = nodeId || currentPath.value;
  } catch (err) {
    console.error("Failed to load registry values:", err);
    tableRows.value = [];
  } finally {
    loading.value = false;
  }
}

function deleteKey(node: RegistryNode) {
  nodeToDelete.value = node;
  confirmDeleteKeyDialog.value = true;
}

async function confirmDeleteKey() {
  if (!nodeToDelete.value) return;
  loading.value = true;
  try {
    await deleteRegistryKey(props.agent_id, nodeToDelete.value.id);
    const parentId =
      nodeToDelete.value.id.split("\\").slice(0, -2).join("\\") + "\\";
    const parent = findNodeById(registryNodes.value, parentId);
    if (parent?.children) {
      parent.children = parent.children.filter(
        (child) => child.id !== nodeToDelete.value!.id,
      );
      registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
    }
  } catch (err) {
    console.error("Failed to delete key:", err);
  } finally {
    confirmDeleteKeyDialog.value = false;
    nodeToDelete.value = null;
    loading.value = false;
  }
}

function openDialog(type: "edit" | "rename", row: RegistryValue) {
  if (type === "edit") {
    editRow.value = { ...row };
    editDialog.value = true;
  } else {
    renameRow.value = { ...row };
    originalName.value = row.name;
    renameDialog.value = true;
  }
}

function saveRow(type: "edit" | "rename") {
  if (type === "edit") {
    const index = tableRows.value.findIndex(
      (r) => r.name === editRow.value.name,
    );
    if (index !== -1) {
      tableRows.value[index] = { ...editRow.value };
    }
    editDialog.value = false;
  } else {
    const index = tableRows.value.findIndex(
      (r) => r.name === originalName.value,
    );
    if (index !== -1) {
      tableRows.value[index].name = renameRow.value.name;
    }
    renameDialog.value = false;
  }
}

function refreshParent(parentId: string) {
  const parent = findNodeById(registryNodes.value, parentId);
  if (parent) {
    parent.children = [...(parent.children ?? [])];
    registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
  }
}

async function createKey(parentNode: RegistryNode) {
  try {
    const data = await fetchAgentRegistry(props.agent_id, parentNode.id);
    const keys = data?.subkeys || [];
    parentNode.children = keys.map(
      (key: { name: string; hasSubkeys: boolean }) => {
        const id = parentNode.id.endsWith("\\")
          ? `${parentNode.id}${key.name}\\`
          : `${parentNode.id}\\${key.name}\\`;
        return {
          id,
          label: key.name,
          lazy: key.hasSubkeys,
        };
      },
    );
  } catch (err) {
    console.error("Failed to load children before creating key:", err);
    parentNode.children = [];
    return;
  }
  if (!parentNode.children) parentNode.children = [];
  registryTree.value.setExpanded(parentNode.id, true);
  await nextTick();
  const tempId = parentNode.id + "__temp_new_key__";
  const newNode: RegistryNode = {
    id: tempId,
    label: "New_Key",
    lazy: false,
  };
  parentNode.children.unshift(newNode);
  if (!pendingNodes.value[parentNode.id]) {
    pendingNodes.value[parentNode.id] = [];
  }
  pendingNodes.value[parentNode.id].unshift(newNode);
  selectedKey.value = parentNode.id;
  registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
  await nextTick();
  editLabel.value = "New_Key";
  editingNodeId.value = tempId;
  registryTree.value.setExpanded(parentNode.id, true);
}

function safeCreateKey() {
  if (!selectedKey.value) return;
  const parentNode = findNodeById(registryNodes.value, selectedKey.value);
  if (parentNode) {
    createKey(parentNode);
  }
}

async function finishRename(
  node: RegistryNode,
  source: "enter" | "blur" = "enter",
) {
  if (isFinishingRename.value) return;
  if (source === "blur" && renameOpenedAt.value) {
    const elapsed = Date.now() - renameOpenedAt.value;
    if (elapsed < 150) {
      return;
    }
  }
  renameOpenedAt.value = null;
  isFinishingRename.value = true;
  if (loading.value) {
    isFinishingRename.value = false;
    return;
  }
  let newName = editLabel.value ? editLabel.value.trim() : "";
  if (!newName) newName = "New_Key";
  const originalId = node.id;
  const parts = originalId.split("\\").filter(Boolean);
  const parentPath = parts.slice(0, -1).join("\\") + "\\";
  const newId = parentPath + newName + "\\";
  const isTempNode = originalId.includes("__temp_new_key__");
  try {
    loading.value = true;
    if (isTempNode) {
      await createRegistryKey(props.agent_id, newId);
    } else if (originalId !== newId) {
      await renameRegistryKey(props.agent_id, originalId, newId);
    }
    node.id = newId;
    node.label = newName;
    const parent = findNodeById(registryNodes.value, parentPath);
    if (parent?.children) {
      const idx = parent.children.findIndex((c) => c.id === originalId);
      if (idx !== -1) {
        parent.children[idx] = { id: newId, label: newName, lazy: true };
        registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
      }
    }
    if (isTempNode && pendingNodes.value[parentPath]) {
      pendingNodes.value[parentPath] = pendingNodes.value[parentPath].filter(
        (n) => n.id !== originalId,
      );
    }
    refreshParent(parentPath);
  } catch (err) {
    console.error("Failed to rename/create registry key:", err);
    if (isTempNode) {
      removeTempNode(node);
    } else {
      node.label = parts[parts.length - 1];
      node.id = originalId;
      registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
    }
  } finally {
    editingNodeId.value = null;
    loading.value = false;
    isFinishingRename.value = false;
  }
}

function removeTempNode(node: RegistryNode) {
  const parts = node.id.split("\\").filter(Boolean);
  const parentId = parts.slice(0, -1).join("\\") + "\\";
  const parent = findNodeById(registryNodes.value, parentId);
  if (parent?.children) {
    parent.children = parent.children.filter((child) => child.id !== node.id);
    registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
  }

  if (pendingNodes.value[parentId]) {
    pendingNodes.value[parentId] = pendingNodes.value[parentId].filter(
      (n) => n.id !== node.id,
    );
  }
}

function findNodeById(nodes: RegistryNode[], id: string): RegistryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function createValue(node: RegistryNode, type: string) {
  console.log("TODO: API call → create value in", node.id, "of type", type);
}

function renameKey(node: RegistryNode) {
  editingNodeId.value = node.id;
  editLabel.value = node.label;
  renameOpenedAt.value = Date.now();
  nextTick(() => {
    const inputEl = document.querySelector<HTMLInputElement>(
      `#input-${node.id.replace(/\\/g, "-")}`,
    );
    inputEl?.focus();
    inputEl?.select();
  });
}

function deleteValue(row: RegistryValue) {
  valueToDelete.value = row;
  confirmDeleteValueDialog.value = true;
}

async function confirmDeleteValue() {
  if (!valueToDelete.value || !currentPath.value) return;
  loading.value = true;
  try {
    await deleteRegistryValue(
      props.agent_id,
      currentPath.value,
      valueToDelete.value.name,
    );
    tableRows.value = tableRows.value.filter(
      (r) => r.name !== valueToDelete.value!.name,
    );
  } catch (err) {
    console.error("Failed to delete registry value:", err);
  } finally {
    confirmDeleteValueDialog.value = false;
    valueToDelete.value = null;
    loading.value = false;
  }
}

function renameValue(row: RegistryValue) {
  editingValueName.value = row.name;
  editValueName.value = row.name;
  valueRenameOpenedAt.value = Date.now();
  console.log("------------------", editingValueName.value);
  nextTick(() => {
    const inputEl = document.querySelector<HTMLInputElement>(
      `#value-input-${row.name}`,
    );
    inputEl?.focus();
    inputEl?.select();
  });
}

async function finishRenameValue(
  row: RegistryValue,
  source: "enter" | "blur" = "enter",
) {
  if (isFinishingValueRename.value) return;
  if (source === "blur" && valueRenameOpenedAt.value) {
    const elapsed = Date.now() - valueRenameOpenedAt.value;
    if (elapsed < 150) {
      return;
    }
  }
  valueRenameOpenedAt.value = null;
  isFinishingValueRename.value = true;
  if (!currentPath.value) {
    isFinishingValueRename.value = false;
    return;
  }
  const newName = editValueName.value.trim() || row.name;
  if (newName === row.name) {
    editingValueName.value = null;
    isFinishingValueRename.value = false;
    return;
  }
  try {
    loading.value = true;
    await renameRegistryValue(
      props.agent_id,
      currentPath.value,
      row.name,
      newName,
    );
    const index = tableRows.value.findIndex((r) => r.name === row.name);
    if (index !== -1) {
      tableRows.value[index].name = newName;
    }
  } catch (err) {
    console.error("Failed to rename value:", err);
  } finally {
    editingValueName.value = null;
    loading.value = false;
    isFinishingValueRename.value = false;
  }
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
.nowrap {
  text-wrap: nowrap;
  padding-right: 10px;
}
.flex-nowrap {
  flex-wrap: nowrap;
}
.q-field--dense .q-field__control {
  height: 36px;
}
</style>
