import { ref } from "vue";
import { useWebSocket } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth";
import { getWSUrl } from "./websocket";

interface CmdMessage {
  cmd_id: string;
  output?: string;
  done?: boolean;
  exit_code?: number;
  [key: string]: unknown;
}

export function useAgentCmdWSConnection(agentId: string, cmdId: string) {
  const auth = useAuthStore();
  const lines = ref<CmdMessage[]>([]);
  const url = getWSUrl(`agent/${agentId}/cmd`, auth.token);
  const ws = useWebSocket(url, {
    autoReconnect: false,
    onMessage(_, ev) {
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed?.cmd_id !== cmdId) return;
        if (parsed?.output != null && !((lines.value.length === 0 || lines.value.length === 1) && parsed.output.trim() === "")) {
          lines.value.push(parsed);
        }
      } catch {
        lines.value.push({
          cmd_id,
          output: "[Error] Unable to parse server output",
        });
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
