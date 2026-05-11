import { ref } from "vue";
import axios from "axios";

import { Schedule } from "./types";

import { notifySuccess } from "@/utils/notify";
import { i18n } from "@/i18n";

const baseUrl = "/core";

export function useSchedule() {
  const schedules = ref<Schedule[]>([]);

  const isLoading = ref(false);
  const isError = ref(false);

  function getSchedules() {
    isLoading.value = true;
    isError.value = false;

    axios
      .get(`${baseUrl}/schedules/`)
      .then(({ data }: { data: Schedule[] }) => {
        schedules.value = data;
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function addSchedule(schedule: Schedule) {
    isLoading.value = true;
    isError.value = false;

    axios
      .post(`${baseUrl}/schedules/`, schedule)
      .then(({ data }: { data: Schedule }) => {
        schedules.value.push(data);
        notifySuccess(i18n.global.t("settings.scheduleApi.added"));
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function editSchedule(id: number, schedule: Schedule) {
    isLoading.value = true;
    isError.value = false;

    axios
      .put(`${baseUrl}/schedules/${id}/`, schedule)
      .then(({ data }: { data: Schedule }) => {
        const index = schedules.value.findIndex(
          (schedule) => schedule.id === data.id,
        );
        if (index !== -1) {
          schedules.value[index] = data;
        }
        notifySuccess(i18n.global.t("settings.scheduleApi.updated"));
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  function deleteSchedule(id: number) {
    isLoading.value = true;
    isError.value = false;

    axios
      .delete(`${baseUrl}/schedules/${id}/`)
      .then(() => {
        schedules.value = schedules.value.filter(
          (schedule) => schedule.id !== id,
        );
        notifySuccess(i18n.global.t("settings.scheduleApi.deleted"));
      })
      .catch(() => (isError.value = true))
      .finally(() => (isLoading.value = false));
  }

  return {
    schedules,
    isLoading,
    isError,
    getSchedules,
    addSchedule,
    editSchedule,
    deleteSchedule,
  };
}

export const useScheduleShared = useSchedule();
