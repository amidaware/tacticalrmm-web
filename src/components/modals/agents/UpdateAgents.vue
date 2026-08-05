<template>
  <q-card>
    <q-bar>
      {{ $t("agents.updateAgents.title") }}
      <q-space />
      <q-btn dense flat icon="close" v-close-popup>
        <q-tooltip class="bg-white text-primary">{{
          $t("common.buttons.close")
        }}</q-tooltip>
      </q-btn>
    </q-bar>

    <q-separator />

    <q-banner class="bg-primary">
      <template v-slot:avatar>
        <q-icon name="info" />
      </template>
      {{ $t("agents.updateAgents.banner") }}
    </q-banner>

    <q-card-section>
      {{ $t("agents.updateAgents.selectVersion") }}
      <q-select
        square
        disable
        dense
        options-dense
        outlined
        v-model="version"
        :options="versions"
      />
    </q-card-section>

    <q-card-section v-show="version !== null">
      {{ $t("agents.updateAgents.selectAgent") }}
      <br />
      <q-separator />

      <q-input
        v-model="search"
        dense
        outlined
        clearable
        debounce="100"
        :placeholder="$t('common.buttons.search')"
        class="q-my-sm"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-checkbox
        v-model="selectAll"
        :label="$t('agents.updateAgents.selectAll')"
        @update:model-value="selectAllAction"
      />

      <q-btn
        v-show="group.length !== 0"
        :label="$t('common.buttons.update')"
        color="primary"
        @click="update"
        class="q-ml-xl"
      />

      <q-separator />

      <q-option-group
        v-model="group"
        :options="agentOptions"
        color="green"
        type="checkbox"
        style="max-height: 60vh; max-width: 40vw"
        class="scroll"
      />
    </q-card-section>
  </q-card>
</template>

<script>
import mixins from "@/mixins/mixins";

export default {
  name: "UpdateAgents",
  emits: ["close"],
  mixins: [mixins],

  data() {
    return {
      versions: [],
      version: null,
      agents: [],
      group: [],
      selectAll: false,
      search: "",
    };
  },

  methods: {
    selectAllAction() {
      this.selectAll ? (this.group = this.filteredAgentIds) : (this.group = []);
    },

    getVersions() {
      this.$q.loading.show();
      this.$axios
        .get("/agents/versions/")
        .then((r) => {
          this.versions = r.data.versions;
          this.version = r.data.versions[0];
          this.agents = r.data.agents;
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },

    update() {
      const data = { agent_ids: this.group };
      this.$axios.post("/agents/update/", data).then(() => {
        this.$emit("close");
        this.notifySuccess(this.$t("agents.updateAgents.agentsWillBeUpdated"));
      });
    },
  },

  computed: {
    agentIds() {
      return this.agents.map((k) => k.agent_id);
    },

    filteredAgents() {
      const term = this.search?.toLowerCase().trim();

      if (!term) {
        return this.agents;
      }

      return this.agents.filter((agent) => {
        const searchableText = [
          agent.hostname,
          agent.client,
          agent.site,
          agent.agent_id,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(term);
      });
    },

    filteredAgentIds() {
      return this.filteredAgents.map((agent) => agent.agent_id);
    },

    agentOptions() {
      return this.filteredAgents
        .map((agent) => ({
          label: `${agent.hostname} (${agent.client} > ${agent.site})`,
          value: agent.agent_id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
  },

  mounted() {
    this.getVersions();
  },
};
</script>
