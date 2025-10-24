<template>
  <div>
    <div class="text-body2 row items-center px-2 folder-path">
      <q-input
        v-model="pathInput"
        dense
        class="col"
        borderless
        @keyup.enter="navigateToPath"
      >
        <template #prepend>
          <q-icon
            name="fa-solid fa-display"
            class="q-mr-sm text-blue-5"
            size="18px"
          />
        </template>
      </q-input>
    </div>
    <q-splitter v-model="splitter" :style="{ height: 'calc(100vh - 80px)' }">
      <!-- (Left Pane: Registry Keys) -->
      <template #before>
        <q-tree
          no-transition
          class="q-pb-md q-pt-xs"
          ref="registryTree"
          v-model:selected="selectedKey"
          node-key="id"
          label-key="label"
          :nodes="registryNodes"
          :lazy="true"
          :loading="loading"
          selected-color="primary"
          @lazy-load="loadChildren"
          @update:selected="onKeySelect"
        >
          <template v-slot:default-header="prop">
            <div
              v-if="!prop.node.isLoadMore"
              class="row items-center nowrap flex-nowrap"
              @dblclick="toggleNode(prop.node)"
              style="cursor: pointer"
            >
              <q-icon name="folder" class="q-mr-sm text-yellow-7" size="18px" />
              <q-input
                @click.stop
                v-if="editingNodeId === prop.node.id"
                v-model="editLabel"
                ref="editInputRef"
                dense
                autofocus
                @keyup.enter="finishRename(prop.node, 'enter')"
                @blur="finishRename(prop.node, 'blur')"
                outlined
                style="max-width: 200px"
              />
              <span v-else>{{ prop.node.label }}</span>
            </div>
            <div v-else class="q-ml-xs q-my-xs">
              <q-btn
                dense
                size="sm"
                color="primary"
                label="Load More"
                class="q-px-xs q-py-xs fontt-weight-medium"
                :loading="
                  loadingMoreNodes[getParentIdFromLoadNode(prop.node.id)]
                "
                @click.stop="onClickLoadMoreFromPlaceholder(prop.node)"
              />
            </div>
            <q-menu
              v-if="!prop.node.isLoadMore"
              context-menu
              transition-show="jump-up"
              transition-hide="jump-down"
            >
              <q-list dense style="min-width: 180px">
                <q-item clickable style="padding-right: 4px !important">
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
                            : createValue(prop.node, item.type, true)
                        "
                      >
                        <q-item-section>{{ item.label }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="refreshNode(prop.node.id)"
                >
                  <q-item-section>Refresh</q-item-section>
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
                            : createValue(undefined, item.type, true)
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
                    ref="editInputRef"
                    @keyup.enter="finishRenameValue(props.row, 'enter')"
                    @blur="finishRenameValue(props.row, 'blur')"
                    outlined
                    style="max-width: 200px"
                    @click.stop
                  />
                  <div
                    v-else
                    @dblclick="openModifyDialog(props.row)"
                    class="cursor-pointer"
                  >
                    <div class="cell-text">{{ props.row.name }}</div>
                    <div v-if="props.row.name" class="cell-hover">
                      {{ props.row.name }}
                    </div>
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
                        @click="openModifyDialog(props.row)"
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
                <q-td :props="props">
                  <span v-if="Array.isArray(props.row.data)">
                    {{
                      JSON.stringify(props.row.data)
                        .replace(/^\[|\]$/g, "")
                        .replace(/['"]/g, "")
                        .replace(/,/g, ", ")
                    }}
                    <q-tooltip
                      anchor="top middle"
                      self="bottom middle"
                      :offset="[10, 10]"
                    >
                      {{
                        JSON.stringify(props.row.data)
                          .replace(/^\[|\]$/g, "")
                          .replace(/['"]/g, "")
                          .replace(/,/g, ", ")
                      }}
                    </q-tooltip>
                  </span>
                  <span v-else>
                    {{ props.row.data }}
                    <q-tooltip
                      anchor="top middle"
                      self="bottom middle"
                      :offset="[10, 10]"
                    >
                      {{ props.row.data }}
                    </q-tooltip>
                  </span>
                </q-td>
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
      type="confirm"
      icon="warning"
      iconColor="orange"
    />
    <ConfirmDialog
      v-model="confirmDeleteValueDialog"
      title="Confirm Value Delete"
      message="Deleting certain registry values could cause system instability. Are you sure you want to permanently delete this value?"
      @confirm="confirmDeleteValue"
      type="confirm"
      icon="warning"
      iconColor="orange"
    />
    <ConfirmDialog
      v-model="warningDialog"
      title="Selection Required"
      message="Please select a hive or key before creating a new key."
      :showConfirm="false"
      icon="warning"
      iconColor="orange"
    />
    <RegistryValueModal
      v-model="modifyDialog"
      :row="modifyRow"
      @save="saveModify"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { QInput, useQuasar } from "quasar";
import { watch } from "vue";
import {
  registryTableColumns,
  registryValueTypes,
} from "@/constants/constants";
import { RegistryNode, RegistryValue } from "@/types/agents";
import {
  createRegistryKey,
  createRegistryValue,
  deleteRegistryKey,
  deleteRegistryValue,
  fetchAgentRegistry,
  modifyRegistryValue,
  renameRegistryKey,
  renameRegistryValue,
} from "@/api/agents";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import RegistryValueModal from "@/components/agents/remotebg/RegistryValueModal.vue";

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
const registryTree = ref();
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
const modifyDialog = ref(false);
const modifyRow = ref({} as RegistryValue);
const $q = useQuasar();
const nodePage = ref<Record<string, number>>({});
const nodeHasMore = ref<Record<string, boolean>>({});
const loadingMoreNodes = ref<Record<string, boolean>>({});
const pathInput = ref("");
const editInputRef = ref<InstanceType<typeof QInput> | null>(null);
const warningDialog = ref(false);
const searchKeys = ref(false);
const inFlightLoads: Record<
  string,
  Array<(children: RegistryNode[]) => void>
> = {};

onMounted(async () => {
  loading.value = true;
  try {
    const rootPath = "Computer";
    pathInput.value = rootPath;
    const data = await fetchAgentRegistry(props.agent_id, rootPath);
    const keys = data?.subkeys || [];
    registryNodes.value = keys.map(
      (key: { name: string; hasSubkeys: boolean }) => ({
        id: `${key.name}\\`,
        label: key.name,
        lazy: key.hasSubkeys,
      }),
    );
    if (data?.values) tableRows.value = data.values;
    currentPath.value = rootPath;
  } catch (err) {
    console.error("Failed to fetch root registry nodes:", err);
  } finally {
    loading.value = false;
  }
});

function toggleNode(node: RegistryNode) {
  if (editingNodeId.value && editingNodeId.value.includes(node.id)) return;
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
  const existingParent = findNodeById(registryNodes.value, node.id);
  if (existingParent?.children && existingParent.children.length > 0) {
    const children = existingParent.children.filter((c) => !c.isLoadMore);
    done(children);
    return;
  }
  if (inFlightLoads[node.id]) {
    inFlightLoads[node.id].push(done);
    return;
  }
  inFlightLoads[node.id] = [done];
  loading.value = true;
  try {
    const currentPage = nodePage.value[node.id] || 1;
    const data = await fetchAgentRegistry(
      props.agent_id,
      node.id,
      currentPage,
      searchKeys.value,
    );
    const keys = data?.subkeys || [];
    const children: RegistryNode[] = keys.map(
      (key: { name: string; hasSubkeys: boolean }) => {
        const id = node.id.endsWith("\\")
          ? `${node.id}${key.name}\\`
          : `${node.id}\\${key.name}\\`;
        return { id, label: key.name, lazy: key.hasSubkeys } as RegistryNode;
      },
    );

    nodeHasMore.value[node.id] = data?.has_more ?? false;
    nodePage.value[node.id] = data?.page ?? currentPage;
    if (nodeHasMore.value[node.id]) {
      const placeholderId = makeLoadMoreId(node.id);
      children.push({
        id: placeholderId,
        label: "Load More",
        isLoadMore: true,
        lazy: false,
      } as RegistryNode);
    }
    const parent = findNodeById(registryNodes.value, node.id);
    if (parent) {
      parent.children = children;
      registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
    }
    const queue = inFlightLoads[node.id] || [];
    queue.forEach((cb) => cb(children));
  } catch (err) {
    console.error("Failed to load registry children:", err);
    const fallback = pendingNodes.value[node.id] || [];
    const queue = inFlightLoads[node.id] || [];
    queue.forEach((cb) => cb(fallback));
  } finally {
    delete inFlightLoads[node.id];
    loading.value = false;
  }
}

function refreshNode(nodeId: string) {
  const node = findNodeById(registryNodes.value, nodeId);
  if (node) {
    node.children = [];
    nodePage.value[node.id] = 0;
    nodeHasMore.value[node.id] = false;
    pendingNodes.value[node.id] = [];
    if (registryTree.value) registryTree.value.setExpanded(node.id, true);
    loadChildren({
      node,
      done: (children: RegistryNode[]) => {
        node.children = children;
        registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
      },
    });
    currentPath.value = nodeId || currentPath.value;
  }
}

function onClickLoadMoreFromPlaceholder(placeholderNode: RegistryNode) {
  const parentId = getParentIdFromLoadNode(placeholderNode.id);
  const parent = findNodeById(registryNodes.value, parentId);
  if (parent) loadMoreSubkeys(parent);
}

async function loadMoreSubkeys(parent: RegistryNode) {
  if (!parent || !parent.id) return;
  const parentId = parent.id;
  loadingMoreNodes.value[parentId] = true;
  try {
    const nextPage = (nodePage.value[parentId] || 1) + 1;
    const data = await fetchAgentRegistry(props.agent_id, parentId, nextPage);
    const keys = data?.subkeys || [];
    const newChildren = keys.map(
      (key: { name: string; hasSubkeys: boolean }) => {
        const id = parentId.endsWith("\\")
          ? `${parentId}${key.name}\\`
          : `${parentId}\\${key.name}\\`;
        return {
          id,
          label: key.name,
          lazy: key.hasSubkeys,
        } as RegistryNode;
      },
    );
    const filteredChildren = (parent.children ?? []).filter(
      (c) => !c.isLoadMore,
    );
    parent.children = [...filteredChildren, ...newChildren];
    nodeHasMore.value[parentId] = data?.has_more ?? false;
    nodePage.value[parentId] = data?.page ?? nextPage;
    if (nodeHasMore.value[parentId]) {
      parent.children.push({
        id: makeLoadMoreId(parentId),
        label: "Load More",
        isLoadMore: true,
        lazy: false,
      } as RegistryNode);
    }
    registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
  } catch (err) {
    console.error("Failed to load more subkeys:", err);
  } finally {
    loadingMoreNodes.value[parentId] = false;
  }
}

function makeLoadMoreId(parentId: string) {
  return `${parentId}__load_more__`;
}
function isLoadMoreId(id: string) {
  return id.endsWith("__load_more__");
}
function getParentIdFromLoadNode(loadNodeId: string) {
  return loadNodeId.replace(/__load_more__$/, "");
}

async function onKeySelect(nodeId: string) {
  if (!nodeId) return;
  if (editingNodeId.value && nodeId === editingNodeId.value) return;
  if (nodeId.includes("__temp_new_key__") || isLoadMoreId(nodeId)) return;
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
  if (!pendingNodes.value[parentNode.id])
    pendingNodes.value[parentNode.id] = [];
  pendingNodes.value[parentNode.id].unshift(newNode);
  selectedKey.value = parentNode.id;
  registryNodes.value = JSON.parse(JSON.stringify(registryNodes.value));
  await nextTick();
  editLabel.value = "New_Key";
  editingNodeId.value = tempId;
  registryTree.value.setExpanded(parentNode.id, true);
}

function safeCreateKey() {
  if (!selectedKey.value) {
    warningDialog.value = true;
    return;
  }
  const parentNode = findNodeById(registryNodes.value, selectedKey.value);
  if (parentNode) {
    createKey(parentNode);
  } else {
    warningDialog.value = true;
  }
}

async function finishRename(
  node: RegistryNode,
  source: "enter" | "blur" = "enter",
) {
  if (isFinishingRename.value) return;
  if (source === "blur" && renameOpenedAt.value) {
    const elapsed = Date.now() - renameOpenedAt.value;
    if (elapsed < 150) return;
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

function renameKey(node: RegistryNode) {
  editingNodeId.value = node.id;
  editLabel.value = node.label;
  renameOpenedAt.value = Date.now();
  focusInput();
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

const focusInput = () => {
  nextTick(() => {
    setTimeout(() => {
      const inputEl = editInputRef.value?.$el?.querySelector("input");
      if (inputEl) inputEl.focus();
    }, 50);
  });
};

function renameValue(row: RegistryValue) {
  editingValueName.value = row.name;
  editValueName.value = row.name;
  valueRenameOpenedAt.value = Date.now();
  focusInput();
}

async function finishRenameValue(
  row: RegistryValue,
  source: "enter" | "blur" = "enter",
) {
  if (isFinishingValueRename.value) return;
  if (source === "blur" && valueRenameOpenedAt.value) {
    const elapsed = Date.now() - valueRenameOpenedAt.value;
    if (elapsed < 150) return;
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
    if (index !== -1) tableRows.value[index].name = newName;
  } catch (err) {
    console.error("Failed to rename value:", err);
  } finally {
    editingValueName.value = null;
    loading.value = false;
    isFinishingValueRename.value = false;
  }
}

function openModifyDialog(row: RegistryValue) {
  if (row.type === "REG_BINARY") {
    $q.notify({
      type: "warning",
      message: "Modifying REG_BINARY values access denied.",
      position: "top",
    });
    return;
  }
  modifyRow.value = { ...row };
  modifyDialog.value = true;
}
async function saveModify(row: RegistryValue) {
  if (!currentPath.value) return;
  try {
    loading.value = true;
    const existing = tableRows.value.find((r) => r.name === row.name);
    if (existing && !row.newKey) {
      const response = await modifyRegistryValue(
        props.agent_id,
        currentPath.value,
        row.name,
        row.type,
        String(row.data),
      );
      existing.data = response.data.data;
    } else {
      const response = await createRegistryValue(
        props.agent_id,
        currentPath.value,
        row.name,
        row.type,
        String(row.data),
      );
      tableRows.value.push(response.data);
    }
    modifyDialog.value = false;
  } catch (err) {
    console.error("Failed to save value:", err);
  } finally {
    loading.value = false;
  }
}

function createValue(
  node: RegistryNode | undefined,
  type: string,
  newKey: boolean = false,
) {
  const targetNode =
    node || findNodeById(registryNodes.value, selectedKey.value || "");
  if (!targetNode?.id) {
    warningDialog.value = true;
    return;
  }
  const defaultName = "";
  const defaultData =
    type === "REG_MULTI_SZ"
      ? []
      : type === "REG_DWORD" || type === "REG_QWORD"
        ? 0
        : "";

  modifyRow.value = { name: defaultName, type, data: defaultData, newKey };
  modifyDialog.value = true;
  currentPath.value = targetNode.id;
}

async function navigateToPath() {
  if (!pathInput.value) return;
  let inputPath = pathInput.value.trim();
  if (inputPath.startsWith("Computer"))
    inputPath = inputPath.replace(/^Computer[/\\]*/, "");
  loading.value = true;
  try {
    searchKeys.value = true;
    const data = await fetchAgentRegistry(
      props.agent_id,
      inputPath,
      1,
      searchKeys.value,
    );
    currentPath.value = inputPath;
    tableRows.value = data.values || [];
    await expandTreeToPath(`${inputPath}`);
  } catch (err) {
    console.error("Invalid path:", err);
  } finally {
    loading.value = false;
    searchKeys.value = false;
  }
}
async function expandTreeToPath(path: string) {
  if (!registryTree.value) return;
  const parts = path.split("\\").filter(Boolean);
  let currentId = "";
  for (let i = 0; i < parts.length; i++) {
    currentId += parts[i] + "\\";
    let node = findNodeById(registryNodes.value, currentId);
    if (!node) {
      const parentPath = currentId.split("\\").slice(0, -2).join("\\") + "\\";
      const parentNode = findNodeById(registryNodes.value, parentPath);
      if (parentNode) {
        await new Promise<void>((resolve) => {
          loadChildren({
            node: parentNode,
            done: () => resolve(),
          });
        });
        node = findNodeById(registryNodes.value, currentId);
      }
    }
    if (node) registryTree.value.setExpanded(node.id, true);
  }
  selectedKey.value = currentId;
  await nextTick();
  await new Promise((r) => setTimeout(r, 150));
  scrollSelectedNodeIntoView();
}
function scrollSelectedNodeIntoView() {
  nextTick(() => {
    const treeEl = registryTree.value?.$el;
    if (!treeEl || !selectedKey.value) return;
    const selectedEl = treeEl.querySelector(".q-tree__node--selected");
    if (selectedEl && selectedEl.scrollIntoView) {
      selectedEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  });
}
watch(currentPath, (newPath) => {
  if (newPath) pathInput.value = newPath;
});
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
  background: #e0e0e0;
  color: #000000;
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
  padding: 0 6px;
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
