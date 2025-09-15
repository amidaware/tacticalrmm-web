import { RegistryValue } from "@/types/agents";
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
      "width: 220px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    headerStyle: "width: 220px; max-width: 220px;",
  },
  {
    name: "type",
    label: "Type",
    field: "type",
    align: "left",
    style: "width: 120px; max-width: 120px; white-space: nowrap;",
    headerStyle: "width: 120px; max-width: 120px;",
  },
  {
    name: "data",
    label: "Data",
    field: "data",
    align: "left",
    style:
      "min-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    headerStyle: "min-width: 300px;",
  },
];

export const registryValueTypes = [
  { label: "Key", type: "KEY" },
  { label: "String Value", type: "REG_SZ" },
  { label: "Binary Value", type: "REG_BINARY" },
  { label: "DWORD (32-bit) Value", type: "REG_DWORD" },
  { label: "QWORD (64-bit) Value", type: "REG_QWORD" },
  { label: "Multi-String Value", type: "REG_MULTI_SZ" },
  { label: "Expandable String Value", type: "REG_EXPAND_SZ" },
];

export const dummyRegistry: Record<
  string,
  { keys?: string[]; values?: RegistryValue[] }
> = {
  HKEY_CURRENT_USER: { keys: ["Software", "Environment", "Console"] },
  "HKEY_CURRENT_USER\\Console": {
    values: [{ name: "(Default)", type: "REG_SZ", data: "(value not set)" }],
  },
  HKEY_LOCAL_MACHINE: { keys: ["SOFTWARE", "SYSTEM"] },
  "HKEY_LOCAL_MACHINE\\SOFTWARE": { keys: ["Microsoft", "Wow6432Node"] },
  "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft": {
    values: [
      {
        name: "InstallPath (x86) and (x64) merged for demo",
        type: "REG_SZ",
        data: "C:\\Program Files\\Microsoft",
      },
      { name: "Version", type: "REG_DWORD", data: "0x00000001 (1)" },
    ],
  },
  HKEY_USERS: { keys: ["S-1-5-18", "S-1-5-19"] },
  "HKEY_USERS\\S-1-5-18\\Console": {
    values: [{ name: "(Default)", type: "REG_SZ", data: "(value not set)" }],
  },
};
