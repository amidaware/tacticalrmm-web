import { defineStore } from "pinia";
import { ref, watch } from "vue";

import { useDashWSConnection } from "@/websocket/websocket";

export const useUserStore = defineStore("user", () => {
  const { data } = useDashWSConnection();

  // updated by user.update event
  const dashInfoColor = ref("info");
  const dashPositiveColor = ref("positive");
  const dashWarningColor = ref("warning");
  const dashNegativeColor = ref("negative");

  // watch for agent count ws data
  watch(data, (newValue) => {
    if (newValue.action === "user.update") {
      serverCount.value = newValue.data.total_server_count;
      serverOfflineCount.value = newValue.data.total_server_offline_count;
      workstationCount.value = newValue.data.total_workstation_count;
      workstationOfflineCount.value =
        newValue.data.total_workstation_offline_count;
      daysUntilCertExpires.value = newValue.data.days_until_cert_expires;
    }
  });
});
