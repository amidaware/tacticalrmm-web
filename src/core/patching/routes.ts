export const topRoutes = [];

export const nestedRoutes = [
  {
    path: "/patching",
    name: "patching",
    component: () => import("./views/PatchManager.vue"),
    meta: {
      requireAuth: true,
    },
    children: [
      {
        path: "overview",
        name: "patching-overview",
        component: () => import("./components/PatchOverview.vue"),
        meta: {
          requireAuth: true,
        },
      },
      {
        path: "devices",
        name: "patching-devices",
        component: () => import("./components/DeviceTable.vue"),
        meta: {
          requireAuth: true,
        },
      },
      {
        path: "patches",
        name: "patching-patches",
        component: () => import("./components/PatchTable.vue"),
        meta: {
          requireAuth: true,
        },
      },
      {
        path: "policies",
        name: "patching-policies",
        component: () => import("./components/PatchPolicyTable.vue"),
        meta: {
          requireAuth: true,
        },
      },
    ],
  },
];
