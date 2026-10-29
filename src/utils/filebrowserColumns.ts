import { gettext } from "@/gettext";
import type { QTableColumn } from "quasar";

import type { FileBrowserItem } from "@/types/filebrowser";

const FIXED_COL =
  "white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";

export function getFileBrowserTableColumns(): QTableColumn<FileBrowserItem>[] {
  return [
    {
      name: "name",
      label: gettext.$pgettext("File browser", "Name"),
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
      label: gettext.$gettext("Date modified"),
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
      label: gettext.$pgettext("File browser", "Type"),
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
      label: gettext.$pgettext("File browser", "Size"),
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
}
