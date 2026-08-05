<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{
          $t("settings.policyAdd.title", {
            type: $t(`settings.policyAdd.types.${type}`),
          })
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            $t("common.buttons.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit="submit">
        <q-card-section v-if="options.length > 0">
          <tactical-dropdown
            v-if="type === 'client' || type === 'site'"
            class="q-mb-md"
            v-model="selectedServerPolicy"
            :options="options"
            :label="$t('settings.policyAdd.serverPolicy')"
            outlined
            clearable
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-if="type === 'client' || type === 'site'"
            v-model="selectedWorkstationPolicy"
            :options="options"
            :label="$t('settings.policyAdd.workstationPolicy')"
            outlined
            clearable
            mapOptions
            filterable
          />
          <tactical-dropdown
            v-if="type === 'agent'"
            v-model="selectedAgentPolicy"
            :options="options"
            :label="$t('settings.policyAdd.policy')"
            outlined
            clearable
            mapOptions
            filterable
          />

          <q-checkbox
            :label="$t('settings.policyAdd.blockPolicyInheritance')"
            v-model="blockInheritance"
          >
            <q-tooltip>{{
              $t("settings.policyAdd.blockPolicyInheritanceHint", {
                type: $t(`settings.policyAdd.types.${type}`),
              })
            }}</q-tooltip>
          </q-checkbox>
        </q-card-section>
        <q-card-section v-else>
          {{ $t("settings.policyAdd.noPolicies") }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            dense
            flat
            :label="$t('common.buttons.cancel')"
            v-close-popup
          />
          <q-btn
            v-if="options.length > 0"
            dense
            flat
            :label="$t('common.actions.submit')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import mixins from "@/mixins/mixins";
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  name: "PolicyAdd",
  components: { TacticalDropdown },
  emits: ["hide", "ok", "cancel"],
  props: {
    object: !Object,
    type: {
      required: true,
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ["agent", "site", "client"].includes(value);
      },
    },
  },
  mixins: [mixins],
  data() {
    return {
      selectedWorkstationPolicy: null,
      selectedServerPolicy: null,
      selectedAgentPolicy: null,
      blockInheritance: false,
      options: [],
    };
  },
  methods: {
    submit() {
      // check if data was changed
      if (this.type === "client" || this.type === "site") {
        if (
          this.object.workstation_policy === this.selectedWorkstationPolicy &&
          this.object.server_policy === this.selectedServerPolicy &&
          this.object.blockInheritance === this.blockInheritance
        ) {
          this.hide();
          return;
        }
      } else if (this.type === "agent") {
        if (
          this.object.policy === this.selectedAgentPolicy &&
          this.object.block_policy_inheritance === this.blockInheritance
        ) {
          this.hide();
          return;
        }
      } else {
        return;
      }
      this.$q.loading.show();

      let data = {};
      let url = "";
      if (this.type === "client") {
        url = `/clients/${this.object.id}/`;
        data = {
          client: {
            server_policy: this.selectedServerPolicy,
            workstation_policy: this.selectedWorkstationPolicy,
            block_policy_inheritance: this.blockInheritance,
          },
        };
      } else if (this.type === "site") {
        url = `/clients/sites/${this.object.id}/`;
        data = {
          site: {
            server_policy: this.selectedServerPolicy,
            workstation_policy: this.selectedWorkstationPolicy,
            block_policy_inheritance: this.blockInheritance,
          },
        };
      } else if (this.type === "agent") {
        url = `/agents/${this.object.agent_id}/`;
        data = {
          policy: this.selectedAgentPolicy,
          block_policy_inheritance: this.blockInheritance,
        };
      }

      this.$axios
        .put(url, data)
        .then(() => {
          this.$q.loading.hide();
          this.onOk();
          this.notifySuccess(this.$t("settings.policyAdd.notify.updated"));
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    getPolicies() {
      this.$q.loading.show();
      this.$axios
        .get("/automation/policies/")
        .then((r) => {
          this.options = r.data.map((policy) => ({
            label: policy.name,
            value: policy.id,
          }));

          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
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
    this.getPolicies();

    if (this.type !== "agent") {
      this.selectedServerPolicy = this.object.server_policy;
      this.selectedWorkstationPolicy = this.object.workstation_policy;
      this.blockInheritance = this.object.block_policy_inheritance;
    } else {
      this.selectedAgentPolicy = this.object.policy;
      this.blockInheritance = this.object.block_policy_inheritance;
    }
  },
};
</script>
