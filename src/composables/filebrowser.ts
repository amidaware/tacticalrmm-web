import { computed, type MaybeRef, toValue } from "vue";
import { uid } from "quasar";

import type { QTreeFileNode } from "../types/filebrowser";
import type { BreadcrumbSegment } from "../types/filebrowser";
import {
  normalizeAgentListPath,
  normalizeFileBrowserPathSlashes,
} from "../utils/filebrowser";

function isWindowsPlatform(platform: string): boolean {
  return (platform || "").toLowerCase() === "windows";
}

export function useFileBrowser(platform: MaybeRef<string> = "windows") {
  const resolvedPlatform = computed(() => toValue(platform));
  const isWindows = computed(() => isWindowsPlatform(resolvedPlatform.value));
  const pathSeparator = computed<"/" | "\\">(() =>
    isWindows.value ? "\\" : "/",
  );

  function createFileNode(
    name: string,
    path: string,
    size = "0",
    asset_id?: string,
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
    color = "yellow-9",
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

  function normalizePathSlashes(p: string): string {
    return normalizeFileBrowserPathSlashes(p, resolvedPlatform.value);
  }

  function pathKeyForCompare(p: string): string {
    const s = normalizePathSlashes(p);
    if (isWindows.value) {
      const driveOnly = /^([A-Za-z]:)\\*$/.exec(s);
      if (driveOnly) return `${driveOnly[1].toLowerCase()}\\`;
      return s.replace(/\\+$/, "").toLowerCase();
    }

    if (s === "/") return "/";
    return s.replace(/\/+$/, "");
  }

  function pathsEqual(a: string, b: string): boolean {
    return pathKeyForCompare(a) === pathKeyForCompare(b);
  }

  function parseWindowsPathToBreadcrumbs(raw: string): BreadcrumbSegment[] {
    const normalized = normalizePathSlashes(raw);
    if (!normalized) return [];

    if (normalized.startsWith("\\\\")) {
      const noTrail = normalized.replace(/\\+$/, "");
      const inner = noTrail.slice(2).split("\\").filter(Boolean);
      if (inner.length === 0) {
        return [{ label: "\\\\", fullPath: "\\\\" }];
      }
      return inner.map((label, i) => ({
        label,
        fullPath: "\\\\" + inner.slice(0, i + 1).join("\\"),
      }));
    }

    const parts = normalized.split("\\").filter(Boolean);
    if (parts.length === 0) return [];

    const first = parts[0];
    if (/^[A-Za-z]:$/.test(first)) {
      const out: BreadcrumbSegment[] = [
        { label: first, fullPath: `${first}\\` },
      ];
      for (let i = 1; i < parts.length; i++) {
        const fullPath = `${first}\\${parts.slice(1, i + 1).join("\\")}`;
        out.push({ label: parts[i], fullPath });
      }
      return out;
    }

    return parts.map((label, i) => ({
      label,
      fullPath: parts.slice(0, i + 1).join("\\"),
    }));
  }

  function parseUnixPathToBreadcrumbs(raw: string): BreadcrumbSegment[] {
    const normalized = normalizePathSlashes(raw);
    if (!normalized || normalized === "/") {
      return [{ label: "/", fullPath: "/" }];
    }

    const parts = normalized.split("/").filter(Boolean);
    return parts.map((label, i) => ({
      label,
      fullPath: "/" + parts.slice(0, i + 1).join("/"),
    }));
  }

  function parsePathToBreadcrumbs(raw: string): BreadcrumbSegment[] {
    if (isWindows.value) {
      return parseWindowsPathToBreadcrumbs(raw);
    }
    return parseUnixPathToBreadcrumbs(raw);
  }

  function normalizeNavPath(path: string): string {
    return normalizeAgentListPath(path, resolvedPlatform.value);
  }

  return {
    pathSeparator,
    createFolderNode,
    createFileNode,
    getFile,
    getPath,
    normalizePathSlashes,
    pathKeyForCompare,
    pathsEqual,
    parsePathToBreadcrumbs,
    normalizeNavPath,
  };
}
