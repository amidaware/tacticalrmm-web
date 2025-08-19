import { ref } from "vue";
import { useWebSocket } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth";
import { getWSUrl } from "./websocket";

export function useAgentCmdWSConnection(agentId: string) {
  const auth = useAuthStore();
  const lines = ref<string[]>([]);
  const url = getWSUrl(`agent/${agentId}/cmd`, auth.token);
  const ws = useWebSocket(url, {
    autoReconnect: false,
    onMessage(_, ev) {
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed?.output != null) {
          const clean = String(parsed.output).replace(/\r\n/g, "\n");
          if (lines.value.length === 0 && clean.trim() === "") {
            return;
          }
          lines.value = [...lines.value, clean];
        }
      } catch {
        lines.value = [...lines.value, "[Error] Unable to parse server output"];
      }
    },
  });

  function reset() {
    lines.value = [];
  }

  function closeConnection() {
    ws.close();
    lines.value = [];
  }

  return {
    status: ws.status,
    data: lines,
    send: ws.send,
    open: ws.open,
    reset,
    close: closeConnection,
  };
}
