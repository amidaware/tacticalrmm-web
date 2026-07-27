import { useStorage } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth";
import {
  getSSOProviderToken,
  openSSOProviderRedirect,
} from "@/ee/sso/api/sso";

const routes = [
  {
    path: "/",
    name: "MainLayout",
    component: () => import("@/layouts/MainLayout.vue"),
    children: [
      {
        path: "agents/:agent_id",
        name: "Agent",
        component: () => import("@/views/AgentView.vue"),
        meta: {
          requireAuth: true,
        },
      },
      {
        path: "",
        name: "Dashboard",
        component: () => import("@/views/DashboardView.vue"),
        meta: {
          requireAuth: true,
        },
      },
    ],
  },
  {
    path: "/setup",
    name: "InitialSetup",
    component: () => import("@/views/InitialSetup.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/totp_setup",
    name: "TOTPSetup",
    component: () => import("@/views/TOTPSetup.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/takecontrol/:agent_id",
    name: "TakeControl",
    component: () => import("@/views/TakeControl.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/webvnc/:agent_id/:port",
    name: "VNC",
    component: () => import("@/views/WebVNC.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/remoteproxy/:agent_id",
    name: "RemoteProxy",
    component: () => import("@/views/RemoteProxy.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/pichat/:agent_id",
    name: "PiChat",
    component: () => import("@/views/PiChat.vue"),
    meta: {
      requireAuth: true,
    },
  },

  {
    path: "/ai-decision/:token",
    name: "AIDecision",
    // Stateful, streaming ticket chat - reuses the device-chat UI (PiChat).
    component: () => import("@/views/PiChat.vue"),
    meta: {
      requireAuth: true,
    },
  },

  {
    path: "/ai-procedures",
    name: "AIProcedures",
    component: () => import("@/views/AIProcedures.vue"),
    meta: {
      requireAuth: true,
    },
  },

  {
    path: "/ai-ticket-console",
    name: "AITicketConsole",
    component: () => import("@/views/AITicketConsole.vue"),
    meta: {
      requireAuth: true,
    },
  },

  {
    path: "/webterm",
    name: "WebTerm",
    component: () => import("@/views/WebTerminal.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/remotebackground/:agent_id",
    name: "RemoteBackground",
    component: () => import("@/views/RemoteBackground.vue"),
    meta: {
      requireAuth: true,
    },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/LoginView.vue"),
    meta: {
      requiresVisitor: true,
    },
  },
  {
    path: "/expired",
    name: "SessionExpired",
    component: () => import("@/views/SessionExpired.vue"),
    beforeEnter: (_, from) => {
      const auth = useAuthStore();
      auth.next = from.fullPath;
    },
  },
  {
    // SSO (allauth) redirects the browser back here after provider login.
    // Faithful reproduction of the route the official/paid build injects so a
    // local build keeps SSO working. Matches callback_url in src/ee/sso/api/sso.ts.
    path: "/account/provider/callback",
    name: "ProviderCallback",
    component: () => import("@/ee/sso/views/ProviderCallback.vue"),
    beforeEnter: async (to) => {
      const auth = useAuthStore();
      if (auth.loggedIn) return true;
      try {
        const data = await getSSOProviderToken();
        auth.token = data.token;
        auth.username = data.username;
        auth.ssoLoginProvider = data.provider;
        auth.name = data.name;
      } catch (err) {
        if (err.response?.status === 403) {
          const provider_id = useStorage("provider_id", null);
          if (provider_id.value) {
            openSSOProviderRedirect(provider_id.value);
            provider_id.value = null;
            return false;
          }
          to.query.error = "SSO Login not in progress";
        }
      }
    },
  },
  { path: "/:catchAll(.*)", component: () => import("@/views/NotFound.vue") },
];

export default routes;
