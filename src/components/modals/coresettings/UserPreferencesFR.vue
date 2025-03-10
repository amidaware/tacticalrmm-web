<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="min-width: 85vh">
      <q-splitter v-model="splitterModel">
        <template v-slot:before>
          <q-tabs dense v-model="tab" vertical class="text-primary">
            <q-tab name="ui" label="Interface utilisateur" />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-form @submit.prevent="editUserPrefs">
            <q-card-section class="row items-center">
              <div class="text-h6">Préférences</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <q-tab-panels
              v-model="tab"
              animated
              transition-prev="jump-up"
              transition-next="jump-up"
            >
              <!-- UI -->
              <q-tab-panel name="ui">
                <div class="text-subtitle2">Interface utilisateur</div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-6">Action sur double-clic agent:</div>
                  <div class="col-2"></div>
                  <q-select
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="agentDblClickAction"
                    :options="agentDblClickOptions"
                    class="col-4"
                    @update:model-value="url_action = null"
                  />
                </q-card-section>
                <q-card-section
                  class="row"
                  v-if="agentDblClickAction === 'urlaction'"
                >
                  <div class="col-6">Action sur URL:</div>
                  <div class="col-2"></div>
                  <q-select
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="url_action"
                    :options="urlActions"
                    class="col-4"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-6">Onglet par défaut des agents:</div>
                  <div class="col-2"></div>
                  <q-select
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="defaultAgentTblTab"
                    :options="defaultAgentTblTabOptions"
                    class="col-4"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-4">Couleur de la barre de chargement:</div>
                  <div class="col-4"></div>
                  <q-select
                    outlined
                    dense
                    options-dense
                    v-model="loading_bar_color"
                    :options="loadingBarColors"
                    class="col-4"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">Tri des lients:</div>
                  <div class="col-2"></div>
                  <q-select
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="clientTreeSort"
                    :options="clientTreeSortOptions"
                    class="col-8"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">Format de la date:</div>
                  <div class="col-2"></div>
                  <q-input outlined dense v-model="date_format" class="col-8">
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        size="sm"
                        icon="info"
                        @click="
                          openURL(
                            'https://quasar.dev/quasar-utils/date-utils#format-for-display'
                          )
                        "
                      >
                        <q-tooltip>Cliquez pour voir les formats possibles</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <q-checkbox
                    v-model="clear_search_when_switching"
                    label="Effacer le champ de recherche lors d'un switch entre client et site"
                  />
                </q-card-section>
              </q-tab-panel>
            </q-tab-panels>

            <q-card-section class="row items-center">
              <q-btn label="Sauvegarder" color="primary" type="submit" />
            </q-card-section>
          </q-form>
        </template>
      </q-splitter>
    </q-card>
  </q-dialog>
</template>

<script>
import { openURL } from "quasar";
import { loadingBarColors } from "@/mixins/data";
import mixins from "@/mixins/mixins";

export default {
  name: "UserPreferences",
  emits: ["hide", "ok", "cancel"],
  mixins: [mixins],
  data() {
    return {
      loadingBarColors,
      agentDblClickAction: "",
      defaultAgentTblTab: "",
      clientTreeSort: "",
      url_action: null,
      tab: "ui",
      splitterModel: 20,
      loading_bar_color: "",
      urlActions: [],
      clear_search_when_switching: true,
      date_format: "",
      clientTreeSortOptions: [
        {
          label: "Trier par ordre alphabétique déplace les clients en échec vers le haut",
          value: "alphafail",
        },
        {
          label: "Sort alphabetically only",
          value: "alpha",
        },
      ],
      agentDblClickOptions: [
        {
          label: "Éditer l'agent",
          value: "editagent",
        },
        {
          label: "Prendre le contrôle",
          value: "takecontrol",
        },
        {
          label: "Arrière-plan distant",
          value: "remotebg",
        },
        {
          label: "Executer une action URL",
          value: "urlaction",
        },
      ],
      defaultAgentTblTabOptions: [
        {
          label: "Serveurs",
          value: "server",
        },
        {
          label: "Ordinateurs",
          value: "workstation",
        },
        {
          label: "Tous",
          value: "mixed",
        },
      ],
    };
  },
  watch: {
    agentDblClickAction(new_value) {
      if (new_value === "urlaction") {
        this.getURLActions();
      }
    },
  },
  methods: {
    openURL(url) {
      openURL(url);
    },
    getURLActions() {
      this.$axios.get("/core/urlaction/").then((r) => {
        if (r.data.length === 0) {
          this.notifyWarning(
            "Aucune action URL de configurée. Allez dans Paramètres > paramètres globaux > Actions URL"
          );
          return;
        }
        this.urlActions = r.data.map((action) => ({
          label: action.name,
          value: action.id,
        }));
      });
    },
    getUserPrefs() {
      this.$axios.get("/core/dashinfo/").then((r) => {
        this.agentDblClickAction = r.data.dbl_click_action;
        this.url_action = r.data.url_action;
        this.defaultAgentTblTab = r.data.default_agent_tbl_tab;
        this.clientTreeSort = r.data.client_tree_sort;
        this.loading_bar_color = r.data.loading_bar_color;
        this.clear_search_when_switching = r.data.clear_search_when_switching;
        this.date_format = r.data.date_format;
      });
    },
    editUserPrefs() {
      if (
        this.agentDblClickAction === "urlaction" &&
        this.url_action === null
      ) {
        this.notifyError("Sélectionner une action URL");
        return;
      }
      const data = {
        agent_dblclick_action: this.agentDblClickAction,
        url_action: this.url_action,
        default_agent_tbl_tab: this.defaultAgentTblTab,
        client_tree_sort: this.clientTreeSort,
        loading_bar_color: this.loading_bar_color,
        clear_search_when_switching: this.clear_search_when_switching,
        date_format: this.date_format,
      };
      this.$axios.patch("/accounts/users/ui/", data).then(() => {
        this.notifySuccess("Vos préférences sont sauvegardées!");
        this.$store.dispatch("loadTree");
        this.onOk();
      });
    },
    show() {
      this.$refs.dialog.show();
    },
    hide() {
      this.$refs.dialog.hide();
    },
    onHide() {
      this.$emit("hide");
    },
    onOk() {
      this.$emit("ok");
      this.hide();
    },
  },
  mounted() {
    this.getUserPrefs();
  },
};
</script>
