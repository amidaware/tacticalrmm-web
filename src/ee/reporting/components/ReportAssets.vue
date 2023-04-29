<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" maximized @hide="onDialogHide">
    <q-card>
      <q-bar>
        Report Assets
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <FileBrowser
        ref="fileBrowser"
        :nodes="nodes"
        :height="`${$q.screen.height - 32}px`"
        :loading="isLoading"
        @lazy-load="loadAssets"
      >
        <template #action-bar="{ selectedTreeNode, selectedTableNodes }">
          <q-btn
            class="q-ml-sm"
            icon="add"
            label="Upload"
            no-caps
            dense
            flat
            @click="uploadFiles(selectedTreeNode)"
          />
          <q-btn
            class="q-ml-sm"
            label="New Folder"
            no-caps
            dense
            flat
            @click="newFolder(selectedTreeNode)"
          />
          <q-btn-dropdown
            :disable="selectedTableNodes.length === 0"
            class="q-ml-sm"
            flat
            outline
            dense
            no-caps
            label="Bulk Actions"
          >
            <q-list>
              <q-item
                v-close-popup
                clickable
                dense
                @click="deleteFiles(selectedTableNodes, selectedTreeNode)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Delete</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </template>

        <template #table-menu="{ item, selectedTreeNode }">
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item v-close-popup clickable @click="sendRename(item)">
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Rename</q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="downloadFile(item)">
                <q-item-section side>
                  <q-icon name="cloud_download" />
                </q-item-section>
                <q-item-section>Download</q-item-section>
              </q-item>

              <q-item
                v-close-popup
                clickable
                @click="deleteFiles([item], selectedTreeNode)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>Delete</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item v-close-popup clickable>
                <q-item-section>Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </template>
      </FileBrowser>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
// composition imports
import { ref } from "vue";
import { useFileBrowser } from "@/composables/filebrowser";
import {
  fetchReportAssets,
  renameReportAsset,
  createAssetFolder,
  deleteAssets,
  downloadAsset,
} from "../api/reporting";
import { useQuasar, useDialogPluginComponent, exportFile } from "quasar";

// ui imports
import FileBrowser from "@/components/FileBrowser.vue";
import AssetFileUpload from "./AssetFileUpload.vue";

// type imports
import type {
  LazyLoadCallbackParams,
  FileSystemNodeTable,
  QTreeFileNode,
} from "@/types/filebrowser";
import { UploadAssetsResponse } from "../types/reporting";

// emits
defineEmits([...useDialogPluginComponent.emits]);

// setup quasar
const $q = useQuasar();

// quasar dialog setup
const { dialogRef, onDialogHide /* onDialogOK */ } = useDialogPluginComponent();

// setup filebrowser
const { createFileNode, createFolderNode, getFile } = useFileBrowser();

// data
const nodes = ref([
  createFolderNode("Assets", "/", "storage", "primary"),
] as QTreeFileNode[]);
const fileBrowser = ref<InstanceType<typeof FileBrowser> | null>(null);
const isLoading = ref(false);

async function loadAssets({ path, isDone, isFail }: LazyLoadCallbackParams) {
  try {
    const result = await fetchReportAssets(path);
    isDone(parseNode(result));
  } catch (e) {
    isFail();
  }
}

function uploadFiles(node: QTreeFileNode) {
  $q.dialog({
    component: AssetFileUpload,
    componentProps: {
      parentPath: node.path,
    },
  }).onOk(
    ({
      files,
      response,
    }: {
      files: File[];
      response: UploadAssetsResponse;
    }) => {
      // the upload view returns an object with the old filename as the key and the
      // new filename as the value in case there are name conflicts
      files.forEach((file) => {
        const path = response[file.name].filename;
        const asset_id = response[file.name].id;
        const name = getFile(path);
        const fileNode = createFileNode(
          name,
          path,
          file.size.toString(),
          asset_id
        );
        node.children?.push(fileNode);
      });

      fileBrowser.value?.reloadTable();
    }
  );
}

function newFolder(node: QTreeFileNode) {
  $q.dialog({
    title: "Enter a folder name",
    prompt: {
      model: "",
      isValid: (val) => val.length > 0,
      type: "text",
    },
    cancel: true,
    persistent: true,
  }).onOk(async (data: string) => {
    isLoading.value = true;
    const folderName = data;
    const folderPath = `${node.path}/${folderName}`;
    try {
      const newPath = await createAssetFolder(folderPath);

      const folderNode = createFolderNode(getFile(newPath), newPath);
      node.children?.push(folderNode);

      fileBrowser.value?.reloadTable();
      isLoading.value = false;
    } catch (e) {
      isLoading.value = false;
    }
  });
}

function sendRename(node: FileSystemNodeTable) {
  $q.dialog({
    title: `Enter a new ${node.type} name`,
    prompt: {
      model: node.name,
      isValid: (val) => val.length > 0,
      type: "text",
    },
    cancel: true,
    persistent: true,
  }).onOk(async (data: string) => {
    isLoading.value = true;
    const oldPath = node.path;
    const newName = data;
    try {
      const newPath = await renameReportAsset(oldPath, newName);

      const treeNode = fileBrowser.value?.getNodeByKey(node.id);

      if (treeNode === undefined) {
        console.error("Node key not found");
        return;
      }

      treeNode.label = getFile(newPath);
      treeNode.path = newPath;

      if (treeNode.type === "folder" && treeNode.children) {
        updatePathOnChildNodes(treeNode.children, oldPath, newPath);
      }

      fileBrowser.value?.reloadTable();
      isLoading.value = false;
    } catch (e) {
      isLoading.value = false;
    }
  });
}

async function downloadFile(node: FileSystemNodeTable) {
  isLoading.value = true;
  try {
    const result = await downloadAsset(node.path);
    if (result.type === "application/zip")
      exportFile(`${node.name}.zip`, result);
    else exportFile(node.name, result);
    isLoading.value = false;
  } catch (e) {
    isLoading.value = false;
  }
}

function deleteFiles(
  nodes: FileSystemNodeTable[],
  selectedTreeNode: QTreeFileNode
) {
  $q.dialog({
    title: "Are you sure?",
    message: `You are about to delete ${
      nodes.length > 1 ? nodes.length + " assets" : "an asset"
    }. This action isn't reversible`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const paths = nodes.map((node) => node.path);
      await deleteAssets(paths);

      selectedTreeNode.children = selectedTreeNode.children?.filter(
        (node) => !paths.includes(node.path)
      );

      fileBrowser.value?.reloadTable();

      isLoading.value = false;
    } catch (e) {
      isLoading.value = false;
    }
  });
}

// recursive function to update path on child nodes
function updatePathOnChildNodes(
  nodes: QTreeFileNode[],
  oldPath: string,
  newPath: string
) {
  nodes.forEach((node) => {
    node.path = node.path.replace(oldPath, newPath);

    if (node.children) {
      updatePathOnChildNodes(node.children, oldPath, newPath);
    }
  });
}

// recursive function to parse file system output into Quasar tree nodes
function parseNode(nodes: QTreeFileNode[]): QTreeFileNode[] {
  let parsedNodes: QTreeFileNode[] = [];

  nodes.forEach((node) => {
    let tempNode: QTreeFileNode =
      node.type === "folder"
        ? createFolderNode(node.name, node.path)
        : createFileNode(node.name, node.path, node.size, node.asset_id);

    if (node.children) {
      const parsedNode = parseNode(node.children);
      if (tempNode.children) tempNode.children = parsedNode;
    }

    parsedNodes.push(tempNode);
  });

  return parsedNodes;
}
</script>
