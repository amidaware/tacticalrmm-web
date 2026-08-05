<template>
  <div class="q-pa-md">
    <div class="row">
      <div class="col"></div>
      <div class="col">
        <q-card>
          <q-card-actions align="center">
            <q-btn
              :label="$t('auth.initialSetup.gettingStarted')"
              color="info"
              class="full-width"
              href="https://docs.tacticalrmm.com/guide_gettingstarted/"
              target="_blank"
            />
          </q-card-actions>
          <q-card-section class="row items-center">
            <div class="text-h5 text-weight-bold">
              {{ $t("auth.initialSetup.title") }}
            </div>
          </q-card-section>
          <q-form @submit.prevent="finish">
            <q-card-section>
              <div>{{ $t("auth.initialSetup.addClient") }}</div>
              <q-input
                dense
                outlined
                v-model="client.name"
                :rules="[(val) => !!val || $t('auth.validation.required')]"
              >
                <template v-slot:prepend>
                  <q-icon name="business" />
                </template>
              </q-input>
            </q-card-section>
            <q-card-section>
              <div>{{ $t("auth.initialSetup.addSite") }}</div>
              <q-input
                dense
                outlined
                v-model="site.name"
                :rules="[(val) => !!val || $t('auth.validation.required')]"
              >
                <template v-slot:prepend>
                  <q-icon name="apartment" />
                </template>
              </q-input>
            </q-card-section>
            <q-card-section>
              <div>{{ $t("auth.initialSetup.defaultTimezone") }}</div>
              <tactical-dropdown
                filterable
                dense
                options-dense
                outlined
                v-model="timezone"
                :options="allTimezones"
              />
            </q-card-section>

            <q-card-section>
              <div>
                {{ $t("auth.initialSetup.companyName") }}
                <q-icon
                  name="ion-information-circle-outline"
                  size="sm"
                  class="q-ml-sm cursor-pointer"
                >
                  <q-tooltip class="text-caption">
                    {{ $t("auth.initialSetup.companyNameHelp") }}
                  </q-tooltip>
                </q-icon>
              </div>

              <q-input dense outlined v-model="companyname"> </q-input>
            </q-card-section>

            <q-card-actions align="center">
              <q-btn
                :label="$t('common.buttons.finish')"
                color="primary"
                class="full-width"
                type="submit"
              />
            </q-card-actions>
          </q-form>
        </q-card>
      </div>
      <div class="col"></div>
    </div>
  </div>
</template>

<script>
import mixins from "@/mixins/mixins";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  name: "InitialSetup",
  components: { TacticalDropdown },
  mixins: [mixins],
  data() {
    return {
      client: {
        name: "",
      },
      site: {
        name: "",
      },
      allTimezones: [],
      timezone: null,
      arch: "64",
      companyname: "",
    };
  },
  methods: {
    finish() {
      this.$q.loading.show();
      const data = {
        client: this.client,
        site: this.site,
        timezone: this.timezone,
        companyname: this.companyname,
        initialsetup: true,
      };
      this.$axios
        .post("/clients/", data)
        .then(() => {
          this.$q.loading.hide();
          this.$router.push({ name: "Dashboard" });
        })
        .catch(() => this.$q.loading.hide());
    },
    getSettings() {
      this.$axios.get("/core/settings/").then((r) => {
        this.allTimezones = Object.freeze(r.data.all_timezones);
        this.timezone = r.data.default_time_zone;
      });
    },
  },
  mounted() {
    this.getSettings();
  },
};
</script>
