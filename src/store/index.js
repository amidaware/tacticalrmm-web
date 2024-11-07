import { createStore } from "vuex";
import { Screen, Dark, LoadingBar } from "quasar";
import axios from "axios";
import { formatDate } from "@/utils/format";

export default function () {
  const Store = new createStore({
    state() {
      return {
        tree: [],
        agents: [],
        treeReady: false,
        selectedTree: "",
        selectedRow: null,
        agentPlatform: "windows",
        agentTableLoading: false,
        needrefresh: false,
        tokenExpired: false,
        refreshSummaryTab: false,
        tableHeight: "300px",
        tabHeight: "300px",
        showCommunityScripts: false,
        agentDblClickAction: "",
        agentUrlAction: null,
        defaultAgentTblTab: null,
        clientTreeSort: "alphafail",
        clientTreeSplitter: 20,
        noCodeSign: false,
        hosted: false,
        clearSearchWhenSwitching: false,
        currentTRMMVersion: null,
        latestTRMMVersion: null,
        dateFormat: "MMM-DD-YYYY - HH:mm",
        openAIIntegrationEnabled: false,
        dash_info_color: "info",
        dash_positive_color: "positive",
        dash_negative_color: "negative",
        dash_warning_color: "warning",
        run_cmd_placeholder_text: {
          cmd: "rmdir /S /Q C:\\Windows\\System32",
          powershell: "Remove-Item -Recurse -Force C:\\Windows\\System32",
          shell: "rm -rf --no-preserve-root /",
        },
        certexpiry_notification_text: "",
        server_scripts_enabled: true,
        web_terminal_enabled: true,
      };
    },
    getters: {
      clientTreeSplitterModel(state) {
        return state.clientTreeSplitter;
      },
      selectedAgentId(state) {
        return state.selectedRow;
      },
      showCommunityScripts(state) {
        return state.showCommunityScripts;
      },
      allClientsSelected(state) {
        return !state.selectedTree;
      },
      formatDate: (state) => (date) => {
        if (!state.dateFormat) return formatDate(date);
        else return formatDate(date, state.dateFormat);
      },
    },
    mutations: {
      AGENT_TABLE_LOADING(state, visible) {
        state.agentTableLoading = visible;
      },
      setActiveRow(state, agent_id) {
        state.selectedRow = agent_id;
      },
      setAgentPlatform(state, agentPlatform) {
        state.agentPlatform = agentPlatform;
      },
      loadTree(state, treebar) {
        state.tree = treebar;
        state.treeReady = true;
      },
      destroySubTable(state) {
        state.selectedRow = null;
      },
      SET_REFRESH_NEEDED(state, action) {
        state.needrefresh = action;
      },
      SET_TOKEN_EXPIRED(state, action) {
        state.tokenExpired = action;
      },
      SET_SPLITTER(state, val) {
        // top toolbar is 50px. Filebar is 40px and agent filter tabs are 44px
        state.tableHeight = `${Screen.height - 50 - 40 - 78 - val}px`;

        // q-tabs are 37px
        state.tabHeight = `${val - 37}px`;
      },
      SET_CLIENT_SPLITTER(state, val) {
        state.clientTreeSplitter = val;
      },
      setShowCommunityScripts(state, show) {
        state.showCommunityScripts = show;
      },
      SET_AGENT_DBLCLICK_ACTION(state, action) {
        state.agentDblClickAction = action;
      },
      SET_URL_ACTION(state, action) {
        state.agentUrlAction = action;
      },
      SET_DEFAULT_AGENT_TBL_TAB(state, tab) {
        state.defaultAgentTblTab = tab;
      },
      SET_CLIENT_TREE_SORT(state, val) {
        state.clientTreeSort = val;
      },
      SET_HOSTED(state, val) {
        state.hosted = val;
      },
      setClearSearchWhenSwitching(state, val) {
        state.clearSearchWhenSwitching = val;
      },
      setLatestTRMMVersion(state, val) {
        state.latestTRMMVersion = val;
      },
      setCurrentTRMMVersion(state, val) {
        state.currentTRMMVersion = val;
      },
      setAgents(state, agents) {
        state.agents = agents;
      },
      setRefreshSummaryTab(state, val) {
        state.refreshSummaryTab = val;
      },
      setSelectedTree(state, val) {
        state.selectedTree = val;
      },
      setDateFormat(state, val) {
        state.dateFormat = val;
      },
      setOpenAIIntegrationStatus(state, val) {
        state.openAIIntegrationEnabled = val;
      },
      setDashInfoColor(state, val) {
        state.dash_info_color = val;
      },
      setDashPositiveColor(state, val) {
        state.dash_positive_color = val;
      },
      setDashNegativeColor(state, val) {
        state.dash_negative_color = val;
      },
      setDashWarningColor(state, val) {
        state.dash_warning_color = val;
      },
      setRunCmdPlaceholders(state, obj) {
        state.run_cmd_placeholder_text = obj;
      },
      setCertExpiryNotificationText(state, val) {
        state.certexpiry_notification_text = val;
      },
      setServerScriptsEnabled(state, obj) {
        state.server_scripts_enabled = obj;
      },
      setWebTerminalEnabled(state, obj) {
        state.web_terminal_enabled = obj;
      },
    },
    actions: {
      setClientTreeSplitter(context, val) {
        axios
          .patch("/accounts/users/ui/", {
            client_tree_splitter: Math.trunc(val),
          })
          .then(() => {
            context.commit("SET_CLIENT_SPLITTER", val);
          });
      },
      setShowCommunityScripts(context, data) {
        axios
          .patch("/accounts/users/ui/", { show_community_scripts: data })
          .then(() => {
            context.commit("setShowCommunityScripts", data);
          });
      },
      refreshDashboard({ state, commit, dispatch }, clearTreeSelected = false) {
        if (clearTreeSelected || !state.selectedTree) {
          commit("setSelectedTree", "");
        }
        if (clearTreeSelected) commit("destroySubTable");

        dispatch("getDashInfo", false);
        dispatch("loadAgents");
        dispatch("loadTree");
      },
      async loadAgents({ state, commit }) {
        commit("AGENT_TABLE_LOADING", true);

        let localParams = null;
        if (state.defaultAgentTblTab !== "mixed") {
          if (localParams)
            localParams += `&monitoring_type=${state.defaultAgentTblTab}`;
          else localParams = `?monitoring_type=${state.defaultAgentTblTab}`;
        }

        if (state.selectedTree.includes("Client")) {
          if (localParams)
            localParams += `&client=${state.selectedTree.split("|")[1]}`;
          else localParams = `?client=${state.selectedTree.split("|")[1]}`;
        } else if (state.selectedTree.includes("Site")) {
          if (localParams)
            localParams += `&site=${state.selectedTree.split("|")[1]}`;
          else localParams = `?site=${state.selectedTree.split("|")[1]}`;
        }
        try {
          const { data } = await axios.get(
            `/agents/${localParams ? localParams : ""}`,
          );
          commit("setAgents", data);
        } catch (e) {
          console.error(e);
        }

        commit("AGENT_TABLE_LOADING", false);
      },
      async getDashInfo({ commit }, edited = true) {
        const { data } = await axios.get("/core/dashinfo/");
        commit("setDashInfoColor", data.dash_info_color);
        commit("setDashPositiveColor", data.dash_positive_color);
        commit("setDashNegativeColor", data.dash_negative_color);
        commit("setDashWarningColor", data.dash_warning_color);
        if (edited) {
          LoadingBar.setDefaults({ color: data.loading_bar_color });
          commit(
            "setClearSearchWhenSwitching",
            data.clear_search_when_switching,
          );
          commit("SET_DEFAULT_AGENT_TBL_TAB", data.default_agent_tbl_tab);
          commit("SET_CLIENT_TREE_SORT", data.client_tree_sort);
          commit("SET_CLIENT_SPLITTER", data.client_tree_splitter);
        }
        Dark.set(data.dark_mode);
        commit("setCurrentTRMMVersion", data.trmm_version);
        commit("setLatestTRMMVersion", data.latest_trmm_ver);
        commit("SET_AGENT_DBLCLICK_ACTION", data.dbl_click_action);
        commit("SET_URL_ACTION", data.url_action);
        commit("setShowCommunityScripts", data.show_community_scripts);
        commit("SET_HOSTED", data.hosted);
        commit("SET_TOKEN_EXPIRED", data.token_is_expired);
        commit("setOpenAIIntegrationStatus", data.open_ai_integration_enabled);
        commit("setRunCmdPlaceholders", data.run_cmd_placeholder_text);
        commit("setCertExpiryNotificationText", data.certexpiry_notification_text);
        commit("setServerScriptsEnabled", data.server_scripts_enabled);
        commit("setWebTerminalEnabled", data.web_terminal_enabled);

        if (data?.date_format !== "") commit("setDateFormat", data.date_format);
        else commit("setDateFormat", data.default_date_format);
      },
      loadTree({ commit, state }) {
        setTimeout(() => {
          axios
            .get("/clients/")
            .then((r) => {
              if (r.data.length === 0) {
                this.$router.push({ name: "InitialSetup" });
              }

              let output = [];
              for (let client of r.data) {
                let childSites = [];
                for (let site of client.sites) {
                  let siteNode = {
                    label: site.name,
                    id: site.id,
                    raw: `Site|${site.id}`,
                    header: "generic",
                    icon: "apartment",
                    selectable: true,
                    site: site,
                  };

                  if (site.maintenance_mode) {
                    siteNode["color"] = "green";
                  } else if (site.failing_checks.error) {
                    siteNode["color"] = "negative";
                  } else if (site.failing_checks.warning) {
                    siteNode["color"] = "warning";
                  }

                  childSites.push(siteNode);
                }

                let clientNode = {
                  label: client.name,
                  id: client.id,
                  raw: `Client|${client.id}`,
                  header: "root",
                  icon: "business",
                  children: childSites,
                  client: client,
                };

                if (client.maintenance_mode) clientNode["color"] = "green";
                else if (client.failing_checks.error) {
                  clientNode["color"] = "negative";
                } else if (client.failing_checks.warning) {
                  clientNode["color"] = "warning";
                }

                output.push(clientNode);
              }

              const sorted = output.sort((a, b) =>
                a.label.localeCompare(b.label),
              );
              if (state.clientTreeSort === "alphafail") {
                // move failing clients to the top
                const failing = sorted.filter(
                  (i) => i.color === "negative" || i.color === "warning",
                );
                const ok = sorted.filter(
                  (i) => i.color !== "negative" && i.color !== "warning",
                );
                const sortedByFailing = [...failing, ...ok];
                commit("loadTree", sortedByFailing);
              } else {
                commit("loadTree", sorted);
              }
            })
            .catch(() => {
              state.treeReady = true;
            });
        }, 150);
      },
      checkVer(context) {
        axios.get("/core/version/").then((r) => {
          const version = r.data;

          if (localStorage.getItem("rmmver")) {
            if (localStorage.getItem("rmmver") === version) {
              return;
            } else {
              localStorage.setItem("rmmver", "0.0.1");
              context.commit("SET_REFRESH_NEEDED", true);
            }
          } else {
            localStorage.setItem("rmmver", version);
            return;
          }
        });
      },
      reload() {
        localStorage.removeItem("rmmver");
        location.reload();
      },
    },
  });

  return Store;
}
