// type imports
import { type QTreeNode } from "quasar";

export interface LazyLoadCallbackParams {
  path: string;
  isDone(nodes: QTreeFileNode[]): void;
  isFail(): void;
}

export interface FileSystemNodeTable {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  asset_id?: string;
  size?: string;
}

export interface QTreeFileNode extends QTreeNode<unknown> {
  id: string;
  path: string;
  type: "folder" | "file";
  size?: string;
  asset_id?: string;
  children?: QTreeFileNode[];
}
