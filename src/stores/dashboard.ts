import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDashWSConnection } from "@/websocket/websocket";

export interface WSAgentCount {
  total_server_count: number;
  total_server_offline_count: number;
  total_workstation_count: number;
  total_workstation_offline_count: number;
  days_until_cert_expires: number;
}

export const useDashboardStore = defineStore("dashboard", () => {
  // updated by dashboard.agentcount event
  const serverCount = ref(0);
  const serverOfflineCount = ref(0);
  const workstationCount = ref(0);
  const workstationOfflineCount = ref(0);
  const daysUntilCertExpires = ref(180);

  const { data } = useDashWSConnection();

  // watch for data ws data
  watch(data, (newValue) => {
    if (newValue.action === "dashboard.agentcount") {
      const incomingData = newValue.data as WSAgentCount;

      serverCount.value = incomingData.total_server_count;
      serverOfflineCount.value = incomingData.total_server_offline_count;
      workstationCount.value = incomingData.total_workstation_count;
      workstationOfflineCount.value =
        incomingData.total_workstation_offline_count;
      daysUntilCertExpires.value = incomingData.days_until_cert_expires;
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
