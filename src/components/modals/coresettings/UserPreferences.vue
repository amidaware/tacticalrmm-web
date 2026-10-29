<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="min-width: 60vw">
      <q-splitter v-model="splitterModel">
        <template v-slot:before>
          <q-tabs dense v-model="tab" vertical class="text-primary">
            <q-tab
              name="ui"
              :label="$gettext('User Interface')"
              style="white-space: normal"
            />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-form @submit.prevent="editUserPrefs">
            <q-card-section class="row items-center">
              <div class="text-h6">
                {{ $pgettext("User preferences", "Preferences") }}
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
                  {{ $gettext("User Interface") }}
                </div>
                <q-separator />
                <q-card-section class="row">
                  <div class="col-6">
                    {{ $gettext("Agent double-click action") }}:
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
                    {{ $pgettext("User preferences", "URL Action") }}:
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
                    {{ $gettext("Agent table default tab") }}:
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
                  <div class="col-4">{{ $gettext("Loading Bar Color") }}:</div>
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
                    {{ $gettext("Dashboard Info Color") }}:
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
                          $gettext("Click to see color options")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $gettext("Dashboard Positive Color") }}:
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
                          $gettext("Click to see color options")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $gettext("Dashboard Negative Color") }}:
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
                          $gettext("Click to see color options")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">
                    {{ $gettext("Dashboard Warning Color") }}:
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
                          $gettext("Click to see color options")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <div class="col-2">{{ $gettext("Language") }}:</div>
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
                  <div class="col-2">{{ $gettext("Client Sort") }}:</div>
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
                  <div class="col-2">{{ $gettext("Date Format") }}:</div>
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
                          $gettext("Click to see formatting options")
                        }}</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-section class="row">
                  <q-checkbox
                    v-model="clear_search_when_switching"
                    :label="
                      $gettext('Clear search field when switching client/site')
                    "
                  />
                </q-card-section>
              </q-tab-panel>
            </q-tab-panels>

            <q-card-section class="row items-center">
              <q-btn :label="$gettext('Save')" color="primary" type="submit" />
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
  clearStoredLocale,
} from "@/gettext/locale";
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
    clientTreeSortOptions() {
      return [
        {
          label: this.$gettext(
            "Sort alphabetically, moving failing clients to the top",
          ),
          value: "alphafail",
        },
        {
          label: this.$gettext("Sort alphabetically only"),
          value: "alpha",
        },
      ];
    },
    agentDblClickOptions() {
      return [
        {
          label: this.$gettext("Edit Agent"),
          value: "editagent",
        },
        {
          label: this.$pgettext("User preferences", "Take Control"),
          value: "takecontrol",
        },
        {
          label: this.$gettext("Remote Background"),
          value: "remotebg",
        },
        {
          label: this.$gettext("Run URL Action"),
          value: "urlaction",
        },
      ];
    },
    defaultAgentTblTabOptions() {
      return [
        {
          label: this.$gettext("Servers"),
          value: "server",
        },
        {
          label: this.$gettext("Workstations"),
          value: "workstation",
        },
        {
          label: this.$gettext("Mixed"),
          value: "mixed",
        },
      ];
    },
    localeOptions() {
      return [
        {
          label: this.$gettext("System (auto)"),
          value: "system",
        },
        ...locales,
      ];
    },
    loadingBarColorOptions() {
      return this.loadingBarColors.map((color) => ({
        label:
          {
            amber: this.$gettext("Amber"),
            blue: this.$gettext("Blue"),
            "blue-grey": this.$gettext("Blue Grey"),
            brown: this.$gettext("Brown"),
            cyan: this.$gettext("Cyan"),
            "deep-orange": this.$gettext("Deep Orange"),
            "deep-purple": this.$gettext("Deep Purple"),
            green: this.$gettext("Green"),
            grey: this.$gettext("Grey"),
            indigo: this.$gettext("Indigo"),
            "light-blue": this.$gettext("Light Blue"),
            "light-green": this.$gettext("Light Green"),
            lime: this.$gettext("Lime"),
            orange: this.$gettext("Orange"),
            pink: this.$gettext("Pink"),
            purple: this.$gettext("Purple"),
            red: this.$gettext("Red"),
            teal: this.$gettext("Teal"),
            yellow: this.$gettext("Yellow"),
          }[color] ?? color,
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
            this.$gettext(
              "No URL Actions configured. Go to Settings > Global Settings > URL Actions",
            ),
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
        this.notifyError(this.$gettext("Select a URL Action"));
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
          clearStoredLocale();
        } else {
          setLocalePreference(this.locale);
          await setLocale(this.locale, { persist: true });
        }
        this.notifySuccess(this.$gettext("Preferences were saved!"));
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
