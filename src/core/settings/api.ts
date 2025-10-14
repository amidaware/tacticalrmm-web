import { ref } from "vue";
import axios from "axios";

import { Schedule } from "./types";

import { notifySuccess } from "@/utils/notify";

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
        notifySuccess("Schedule was added successfully.");
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
        notifySuccess("Schedule was modified successfully.");
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
        notifySuccess("Schedule successfully deleted.");
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
