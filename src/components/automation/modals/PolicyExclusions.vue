<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card style="width: 50vw; max-width: 50vw">
      <q-bar>
        {{ $t("settings.policyExclusions.title", { name: policy.name }) }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form ref="form" @submit.prevent="onSubmit">
        <q-card-section>
          <tactical-dropdown
            v-model="localPolicy.excluded_clients"
            :options="clientOptions"
            :label="$t('settings.policyExclusions.excludedClients')"
            outlined
            multiple
            mapOptions
            filterable
          />
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            v-model="localPolicy.excluded_sites"
            :options="siteOptions"
            :label="$t('settings.policyExclusions.excludedSites')"
            outlined
            multiple
            mapOptions
            filterable
          />
        </q-card-section>
        <q-card-section>
          <tactical-dropdown
            v-model="localPolicy.excluded_agents"
            :options="agentOptions"
            :label="$t('settings.policyExclusions.excludedAgents')"
            outlined
            multiple
            mapOptions
            filterable
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            dense
            flat
            :label="$t('common.buttons.cancel')"
            v-close-popup
          />
          <q-btn
            dense
            flat
            :label="$t('common.buttons.save')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";
import mixins from "@/mixins/mixins";
export default {
  name: "PolicyExclusions",
  components: { TacticalDropdown },
  emits: ["hide", "ok", "cancel"],
  props: { policy: !Object },
  mixins: [mixins],
  data() {
    return {
      localPolicy: {
        excluded_clients: [],
        excluded_sites: [],
        excluded_agents: [],
      },
      clientOptions: [],
      siteOptions: [],
      agentOptions: [],
    };
  },
  methods: {
    onSubmit() {
      this.$axios
        .put(`automation/policies/${this.policy.id}/`, this.localPolicy)
        .then(() => {
          this.$q.loading.hide();
          this.onOk();
          this.notifySuccess(this.$t("settings.policyExclusions.notify.saved"));
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    getClientsandSites() {
      this.$q.loading.show();
      this.$axios
        .get("/clients/")
        .then((r) => {
          this.clientOptions = r.data.map((client) => ({
            label: client.name,
            value: client.id,
          }));

          r.data.forEach((client) => {
            this.siteOptions.push({ category: client.name });
            client.sites.forEach((site) =>
              this.siteOptions.push({ label: site.name, value: site.id }),
            );
          });
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    getOptions() {
      this.getAgentOptions("id").then(
        (options) => (this.agentOptions = Object.freeze(options)),
      );
      this.getClientsandSites();
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
  created() {
    // copy prop data locally
    this.localPolicy.id = this.policy.id;
    this.localPolicy.excluded_clients = this.policy.excluded_clients;
    this.localPolicy.excluded_sites = this.policy.excluded_sites;
    this.localPolicy.excluded_agents = this.policy.excluded_agents;

    this.getOptions();
  },
};
</script>
