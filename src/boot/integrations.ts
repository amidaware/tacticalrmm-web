import { boot } from "quasar/wrappers";
import ReportsManager from "@/ee/reporting/components/ReportsManager.vue";
import { DefineComponent } from "vue";

interface Integration {
  component: DefineComponent;
  name: string;
  type: "dialog" | "route";
}

export default boot(({ app }) => {
  const fileBarIntegrations = [
    {
      component: ReportsManager,
      name: "Reporting Manager",
      type: "dialog",
    },
  ];

  const clientMenuIntegrations = [] as Integration[];
  const siteMenuIntegrations = [] as Integration[];
  const agentMenuIntegrations = [] as Integration[];

  app.config.globalProperties.$integrations = {
    fileBarIntegrations,
    clientMenuIntegrations,
    siteMenuIntegrations,
    agentMenuIntegrations,
  };
});
