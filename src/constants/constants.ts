import type { QTableColumn } from "quasar";

export const GOARCH_AMD64 = "amd64";
export const GOARCH_i386 = "386";
export const GOARCH_ARM64 = "arm64";
export const GOARCH_ARM32 = "arm";

export const runAsUserToolTip =
  "Run in the context of the logged in user. If no user is logged in, the script will run as SYSTEM";

export const envVarsLabel =
  "Environment vars (press Enter after typing each key=value pair)";

export const registryTableColumns: QTableColumn[] = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    style:
      "width: 240px; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    headerStyle: "width: 240px; max-width: 240px;",
  },
  {
    name: "type",
    label: "Type",
    field: "type",
    align: "left",
    style: "width: 160px; max-width: 160px; white-space: nowrap;",
    headerStyle: "width: 160px; max-width: 160px;",
  },
  {
    name: "data",
    label: "Data",
    field: "data",
    align: "left",
    style:
      "min-width: 300px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    headerStyle: "min-width: 300px; max-width: 300px;",
  },
];

export const registryValueTypes = [
  { label: "Key", type: "KEY" },
  { label: "String Value", type: "REG_SZ" },
  { label: "DWORD (32-bit) Value", type: "REG_DWORD" },
  { label: "QWORD (64-bit) Value", type: "REG_QWORD" },
  { label: "Multi-String Value", type: "REG_MULTI_SZ" },
  { label: "Expandable String Value", type: "REG_EXPAND_SZ" },
];
