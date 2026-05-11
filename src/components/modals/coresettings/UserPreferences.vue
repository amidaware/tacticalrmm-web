<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="min-width: 60vw">
      <q-splitter v-model="splitterModel">
        <template v-slot:before>
          <q-tabs dense v-model="tab" vertical class="text-primary">
            <q-tab
              name="ui"
              :label="$t('settings.userPreferences.userInterface')"
            />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-form @submit.prevent="editUserPrefs">
            <q-card-section class="row items-center">
              <div class="text-h6">
                {{ $t("settings.userPreferences.title") }}
              </div>
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
                <div class="text-subtitle2">
                  {{ $t("settings.userPreferences.userInterface") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-6">
                    {{ $t("settings.userPreferences.agentDoubleClickAction") }}:
                  </div>
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
                  <div class="col-6">
                    {{ $t("settings.userPreferences.urlAction") }}:
                  </div>
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
                  <div class="col-6">
                    {{ $t("settings.userPreferences.agentTableDefaultTab") }}:
                  </div>
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
                  <div class="col-4">
                    {{ $t("settings.userPreferences.loadingBarColor") }}:
                  </div>
                  <div class="col-4"></div>
                  <q-select
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="loading_bar_color"
                    :options="loadingBarColorOptions"
                    class="col-4"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.userPreferences.dashboardInfoColor") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    outlined
                    dense
                    v-model="dash_info_color"
                    class="col-8"
                  >
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        size="sm"
                        icon="info"
                        @click="openURL(quasar_color_url)"
                      >
                        <q-tooltip>{{
                          $t("settings.userPreferences.clickForColorOptions")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.userPreferences.dashboardPositiveColor") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    outlined
                    dense
                    v-model="dash_positive_color"
                    class="col-8"
                  >
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        size="sm"
                        icon="info"
                        @click="openURL(quasar_color_url)"
                      >
                        <q-tooltip>{{
                          $t("settings.userPreferences.clickForColorOptions")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.userPreferences.dashboardNegativeColor") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    outlined
                    dense
                    v-model="dash_negative_color"
                    class="col-8"
                  >
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        size="sm"
                        icon="info"
                        @click="openURL(quasar_color_url)"
                      >
                        <q-tooltip>{{
                          $t("settings.userPreferences.clickForColorOptions")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.userPreferences.dashboardWarningColor") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-input
                    outlined
                    dense
                    v-model="dash_warning_color"
                    class="col-8"
                  >
                    <template v-slot:after>
                      <q-btn
                        round
                        dense
                        flat
                        size="sm"
                        icon="info"
                        @click="openURL(quasar_color_url)"
                      >
                        <q-tooltip>{{
                          $t("settings.userPreferences.clickForColorOptions")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.userPreferences.language") }}:
                  </div>
                  <div class="col-2"></div>
                  <q-select
                    map-options
                    emit-value
                    outlined
                    dense
                    options-dense
                    v-model="locale"
                    :options="localeOptions"
                    class="col-8"
                  />
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $t("settings.userPreferences.clientSort") }}:
                  </div>
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
                  <div class="col-2">
                    {{ $t("settings.userPreferences.dateFormat") }}:
                  </div>
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
                            'https://quasar.dev/quasar-utils/date-utils#format-for-display',
                          )
                        "
                      >
                        <q-tooltip>{{
                          $t(
                            "settings.userPreferences.clickForFormattingOptions",
                          )
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <q-checkbox
                    v-model="clear_search_when_switching"
                    :label="
                      $t('settings.userPreferences.clearSearchWhenSwitching')
                    "
                  />
                </q-card-section>
              </q-tab-panel>
            </q-tab-panels>

            <q-card-section class="row items-center">
              <q-btn
                :label="$t('settings.common.save')"
                color="primary"
                type="submit"
              />
            </q-card-section>
          </q-form>
        </template>
      </q-splitter>
    </q-card>
  </q-dialog>
</template>

<script>
import { openURL } from "quasar";
import {
  setLocale,
  locales,
  getLocalePreference,
  setLocalePreference,
  resolveSystemLocale,
} from "@/i18n";
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
      locale: "system",
      localeFieldKey: null,
      url_action: null,
      tab: "ui",
      splitterModel: 20,
      loading_bar_color: "",
      dash_info_color: "",
      dash_positive_color: "",
      dash_negative_color: "",
      dash_warning_color: "",
      urlActions: [],
      clear_search_when_switching: true,
      date_format: "",
      quasar_color_url: "https://quasar.dev/style/color-palette",
      clientTreeSortOptions: [
        {
          label: this.$t(
            "settings.userPreferences.clientSortOptions.alphaFail",
          ),
          value: "alphafail",
        },
        {
          label: this.$t("settings.userPreferences.clientSortOptions.alpha"),
          value: "alpha",
        },
      ],
      agentDblClickOptions: [
        {
          label: this.$t(
            "settings.userPreferences.agentDoubleClickOptions.editAgent",
          ),
          value: "editagent",
        },
        {
          label: this.$t(
            "settings.userPreferences.agentDoubleClickOptions.takeControl",
          ),
          value: "takecontrol",
        },
        {
          label: this.$t(
            "settings.userPreferences.agentDoubleClickOptions.remoteBackground",
          ),
          value: "remotebg",
        },
        {
          label: this.$t(
            "settings.userPreferences.agentDoubleClickOptions.runUrlAction",
          ),
          value: "urlaction",
        },
      ],
      defaultAgentTblTabOptions: [
        {
          label: this.$t("settings.userPreferences.defaultTabOptions.servers"),
          value: "server",
        },
        {
          label: this.$t(
            "settings.userPreferences.defaultTabOptions.workstations",
          ),
          value: "workstation",
        },
        {
          label: this.$t("settings.userPreferences.defaultTabOptions.mixed"),
          value: "mixed",
        },
      ],
      localeOptions: [
        {
          label: this.$t("settings.userPreferences.languageOptions.system"),
          value: "system",
        },
        ...locales,
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
  computed: {
    loadingBarColorOptions() {
      return this.loadingBarColors.map((color) => ({
        label: this.$t(
          `settings.userPreferences.loadingBarColorOptions.${color}`,
        ),
        value: color,
      }));
    },
  },
  methods: {
    openURL(url) {
      openURL(url);
    },
    getURLActions() {
      this.$axios.get("/core/urlaction/").then((r) => {
        this.urlActions = r.data
          .filter((action) => action.action_type === "web")
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((action) => ({
            label: action.name,
            value: action.id,
          }));

        if (this.urlActions.length === 0) {
          this.notifyWarning(
            this.$t("settings.userPreferences.notify.noUrlActions"),
          );
        }
      });
    },
    getUserPrefs() {
      this.$axios.get("/core/dashinfo/").then((r) => {
        this.localeFieldKey = ["locale", "language", "lang", "ui_locale"].find(
          (key) => key in r.data,
        );
        this.locale = getLocalePreference();
        this.agentDblClickAction = r.data.dbl_click_action;
        this.url_action = r.data.url_action;
        this.defaultAgentTblTab = r.data.default_agent_tbl_tab;
        this.clientTreeSort = r.data.client_tree_sort;
        this.loading_bar_color = r.data.loading_bar_color;
        this.dash_info_color = r.data.dash_info_color;
        this.dash_positive_color = r.data.dash_positive_color;
        this.dash_negative_color = r.data.dash_negative_color;
        this.dash_warning_color = r.data.dash_warning_color;
        this.clear_search_when_switching = r.data.clear_search_when_switching;
        this.date_format = r.data.date_format;
      });
    },
    async editUserPrefs() {
      if (
        this.agentDblClickAction === "urlaction" &&
        this.url_action === null
      ) {
        this.notifyError(
          this.$t("settings.userPreferences.notify.selectUrlAction"),
        );
        return;
      }
      const data = {
        agent_dblclick_action: this.agentDblClickAction,
        url_action: this.url_action,
        default_agent_tbl_tab: this.defaultAgentTblTab,
        client_tree_sort: this.clientTreeSort,
        loading_bar_color: this.loading_bar_color,
        dash_info_color: this.dash_info_color,
        dash_positive_color: this.dash_positive_color,
        dash_negative_color: this.dash_negative_color,
        dash_warning_color: this.dash_warning_color,
        clear_search_when_switching: this.clear_search_when_switching,
        date_format: this.date_format,
      };
      if (this.localeFieldKey) {
        data[this.localeFieldKey] =
          this.locale === "system" ? resolveSystemLocale() : this.locale;
      }

      this.$axios.patch("/accounts/users/ui/", data).then(async () => {
        if (this.locale === "system") {
          setLocalePreference("system");
          await setLocale(resolveSystemLocale(), { persist: false });
          localStorage.removeItem("ui_locale");
        } else {
          setLocalePreference(this.locale);
          await setLocale(this.locale, { persist: true });
        }
        this.notifySuccess(this.$t("settings.userPreferences.notify.saved"));
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
