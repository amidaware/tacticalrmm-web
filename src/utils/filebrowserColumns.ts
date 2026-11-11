import type { QTableColumn } from "quasar";

import type { FileBrowserItem } from "@/types/filebrowser";
import { t } from "@/i18n";

const FIXED_COL =
  "white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";

export const fileBrowserTableColumns: QTableColumn<FileBrowserItem>[] = [
  {
    name: "name",
    get label() {
      return t("fileBrowser.columns.name");
    },
    field: "name",
    align: "left",
    sortable: true,
    sortOrder: "ad",
    classes: "file-col-name",
    headerClasses: "file-col-name",
    style: `width: 100%; min-width: 320px; max-width: 0; ${FIXED_COL}`,
    headerStyle: "width: 100%; min-width: 320px; max-width: 0;",
  },
  {
    name: "modified",
    get label() {
      return t("fileBrowser.columns.modified");
    },
    field: "modified",
    align: "left",
    sortable: true,
    sortOrder: "da",
    classes: "file-col-modified",
    headerClasses: "file-col-modified",
    style: `width: 220px; max-width: 220px; ${FIXED_COL}`,
    headerStyle: "width: 220px; max-width: 220px;",
  },
  {
    name: "type",
    get label() {
      return t("fileBrowser.columns.type");
    },
    field: "type",
    align: "left",
    sortable: true,
    sortOrder: "ad",
    classes: "file-col-type",
    headerClasses: "file-col-type",
    style: `width: 130px; max-width: 130px; ${FIXED_COL}`,
    headerStyle: "width: 130px; max-width: 130px;",
  },
  {
    name: "size",
    get label() {
      return t("fileBrowser.columns.size");
    },
    field: "size",
    align: "left",
    sortable: true,
    sortOrder: "da",
    classes: "file-col-size",
    headerClasses: "file-col-size",
    style: `width: 120px; max-width: 120px; ${FIXED_COL}`,
    headerStyle: "width: 120px; max-width: 120px;",
  },
];
