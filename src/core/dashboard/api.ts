// save table views
import { ref } from "vue";
import axios from "axios";

import { notifySuccess } from "@/utils/notify";
import type { TableView } from "./types";

const baseUrl = "/tableviews";

const testMode = true;

export function useTableView() {
  const tableViews = ref<TableView[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getTableViews() {
    if (!testMode) {
      isLoading.value = true;
      isError.value = false;

      axios
        .get(`${baseUrl}/`)
        .then(({ data }) => {
          tableViews.value = data;
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    }
  }

  function editTableView(id: number, payload: Partial<TableView>) {
    isLoading.value = true;
    isError.value = false;

    if (!testMode) {
      axios
        .put(`${baseUrl}/${id}/`, payload)
        .then(({ data }: { data: TableView }) => {
          const index = tableViews.value.findIndex(
            (tableView) => tableView.id === data.id,
          );
          tableViews.value[index] = data;
          notifySuccess("Table view was modified successfully");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      const index = tableViews.value.findIndex(
        (tableView) => tableView.id === id,
      );
      tableViews.value[index] = { ...tableViews.value[index], ...payload };

      notifySuccess("Table view was modified successfully");
    }
  }

  function addTableView(payload: TableView) {
    if (!testMode) {
      isLoading.value = true;
      isError.value = false;

      axios
        .post(`${baseUrl}/`, payload)
        .then(({ data }: { data: TableView }) => {
          const index = tableViews.value.findIndex(
            (tableView) => tableView.id === data.id,
          );
          tableViews.value[index] = data;
          notifySuccess("Table view was added successfully");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      const id = Math.floor(Math.random() * 1000) + 1;
      tableViews.value.push({ id, ...payload });

      notifySuccess("Table view was added successfully");
    }
  }

  function deleteTableView(id: number) {
    if (!testMode) {
      isLoading.value = true;
      isError.value = false;

      axios
        .delete(`${baseUrl}/${id}/`)
        .then(({ data }: { data: TableView }) => {
          const index = tableViews.value.findIndex(
            (tableView) => tableView.id === data.id,
          );
          tableViews.value.splice(index, 1);
          notifySuccess("TableView was deleted successfully");
        })
        .catch(() => (isError.value = true))
        .finally(() => (isLoading.value = false));
    } else {
      const index = tableViews.value.findIndex(
        (tableView) => tableView.id === id,
      );

      tableViews.value.splice(index, 1);
      notifySuccess("TableView was deleted successfully");
    }
  }

  return {
    tableViews,
    isLoading,
    isError,

    getTableViews,
    addTableView,
    editTableView,
    deleteTableView,
  };
}

export const useTableViewShared = useTableView();
