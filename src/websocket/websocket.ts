import { ref, watch } from "vue";
import { UseWebSocketReturn, useWebSocket } from "@vueuse/core";
import { getBaseUrl } from "@/boot/axios";
import { useAuthStore } from "@/stores/auth";

export function getWSUrl(path: string, token: string) {
  const url = getBaseUrl().split("://")[1];

  const proto =
    process.env.NODE_ENV === "production" || process.env.DOCKER_BUILD
      ? "wss"
      : "ws";
  return `${proto}://${url}/ws/${path}/?access_token=${token}`;
}

interface WSReturn {
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

let WSConnection: UseWebSocketReturn<string> | undefined = undefined;
export function useDashWSConnection() {
  const auth = useAuthStore();

  if (WSConnection === undefined) {
    const url = getWSUrl("dashinfo", auth.token);
    WSConnection = useWebSocket(url, {
      autoReconnect: true,
    });
  }

  const { status, data, send, open, close } = WSConnection;
  const parsedData = ref<WSReturn>({ action: "", data: {} });

  watch(data, (newValue) => {
    if (newValue) parsedData.value = JSON.parse(newValue);
  });

  function closeConnection() {
    WSConnection = undefined;
    close();
  }

  return {
    status,
    data: parsedData,
    send,
    open,
    close: closeConnection,
  };
}
