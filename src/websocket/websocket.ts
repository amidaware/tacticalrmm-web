import { computed, effectScope, ref, watch } from "vue";
import { UseWebSocketReturn, useWebSocket } from "@vueuse/core";
import { getBaseUrl } from "@/boot/axios";
import { useAuthStore } from "@/stores/auth";

export function getWSUrl(
  path: string,
  token: string | null,
): string | undefined {
  // no token means not logged in; returning undefined prevents
  // useWebSocket from opening a connection that would just 401
  if (!token) return undefined;

  const url = getBaseUrl().split("://")[1];

  const proto =
    process.env.NODE_ENV === "production" || process.env.DOCKER_BUILD
      ? "wss"
      : "ws";
  return `${proto}://${url}/ws/${path}/?access_token=${token}`;
}

interface WSReturn {
  action: string;
  data: unknown;
  error?: string;
}

let WSConnection: UseWebSocketReturn<string> | undefined = undefined;
export function useDashWSConnection() {
  if (WSConnection === undefined) {
    // create the connection in a detached scope so it survives the
    // unmount of whichever component happened to create it, with a
    // reactive url so it automatically disconnects on logout (token
    // becomes null -> url undefined) and reconnects with the fresh
    // token on the next login without needing a page reload
    const scope = effectScope(true);
    WSConnection = scope.run(() => {
      const auth = useAuthStore();
      const url = computed(() => getWSUrl("dashinfo", auth.token));
      return useWebSocket(url, {
        autoReconnect: true,
      });
    }) as UseWebSocketReturn<string>;
  }

  const { status, data, send, open, close } = WSConnection;
  const parsedData = ref<WSReturn>({ action: "", data: {} });

  watch(data, (newValue) => {
    if (newValue) parsedData.value = JSON.parse(newValue);
  });

  function closeConnection() {
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

let WSCliConnection: UseWebSocketReturn<string> | undefined = undefined;
export function useCliWSConnection() {
  const auth = useAuthStore();

  if (WSCliConnection === undefined) {
    const url = getWSUrl("trmmcli", auth.token);
    WSCliConnection = useWebSocket(url);
  }

  const { status, data, send, open, close } = WSCliConnection;
  const parsedData = ref<WSReturn>({ action: "", data: {} });

  watch(data, (newValue) => {
    if (newValue) parsedData.value = JSON.parse(newValue);
  });

  function closeConnection() {
    WSCliConnection = undefined;
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

export function useTerminalWSConnection(agentId: string, sessionId: string) {
  const auth = useAuthStore();

  const path = `agent/${agentId}/terminal/${sessionId}`;
  const url = getWSUrl(path, auth.token);

  const connection = useWebSocket(url);
  const { status, data, send, open, close } = connection;
  const parsedData = ref<WSReturn>({ action: "", data: {} });
  watch(data, (newValue) => {
    if (!newValue) return;

    try {
      parsedData.value = JSON.parse(newValue);
    } catch {
      parsedData.value = {
        action: "",
        data: {},
        error: "Invalid websocket payload",
      };
    }
  });

  return {
    status,
    data: parsedData,
    send,
    open,
    close,
  };
}
