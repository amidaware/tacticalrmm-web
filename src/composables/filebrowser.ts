import { uid } from "quasar";

import type { QTreeFileNode } from "../types/filebrowser";

export function useFileBrowser() {
  function createFileNode(
    name: string,
    path: string,
    size = "0",
    asset_id?: string
  ): QTreeFileNode {
    return {
      id: uid(),
      label: name,
      path: path,
      type: "file",
      icon: "description",
      asset_id: asset_id,
      size: `${size}b`,
    };
  }

  function createFolderNode(
    name: string,
    path: string,
    icon = "folder",
    color = "yellow-9"
  ): QTreeFileNode {
    return {
      id: uid(),
      label: name,
      path: path,
      type: "folder",
      icon: icon,
      iconColor: color,
      selectable: true,
      lazy: true,
    };
  }

  function getFile(path: string, separator: "/" | "\\" = "/"): string {
    const file = path.split(separator).pop();
    return file ? file : "";
  }

  function getPath(path: string, separator: "/" | "\\" = "/"): string {
    const pathArray = path.split(separator);
    pathArray.pop();
    return pathArray.join(separator);
  }

  return {
    createFolderNode,
    createFileNode,
    getFile,
    getPath,
  };
}
