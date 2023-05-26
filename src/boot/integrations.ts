import { boot } from "quasar/wrappers";

export default boot(({ app }) => {
  app.config.globalProperties.$integrations = {
    fileBarIntegrations: [],
    clientMenuIntegrations: [],
    siteMenuIntegrations: [],
    agentMenuIntegrations: [],
  };
});
