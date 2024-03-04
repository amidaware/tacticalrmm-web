import { defineStore } from "pinia";
import { ref, watch } from "vue";

import { useDashWSConnection } from "@/websocket/websocket";

export const useDashboardStore = defineStore("dashboard", () => {
  const loggedInUser = ref();

  // updated by dashboard.agentcount event
  const serverCount = ref(0);
  const serverOfflineCount = ref(0);
  const workstationCount = ref(0);
  const workstationOfflineCount = ref(0);
  const daysUntilCertExpires = ref(100);

  const currentTRMMVersion = ref(null);
  const latestTRMMVersion = ref(null);
  const needRefresh = ref(false);
  const hosted = ref(false);
  const tokenExpired = ref(false);

  const { data } = useDashWSConnection();

  // watch for agent count ws data
  watch(data, (newValue) => {
    if (newValue.action === "dashboard.agentcount") {
      serverCount.value = newValue.data.total_server_count;
      serverOfflineCount.value = newValue.data.total_server_offline_count;
      workstationCount.value = newValue.data.total_workstation_count;
      workstationOfflineCount.value =
        newValue.data.total_workstation_offline_count;
      daysUntilCertExpires.value = newValue.data.days_until_cert_expires;
    }
  });

  return {
    serverCount,
    serverOfflineCount,
    workstationCount,
    workstationOfflineCount,
    daysUntilCertExpires,
  };
});
