<template>
  <q-card style="min-width: 400px">
    <q-card-section class="row">
      <q-card-actions align="left">
        <div class="text-h6">{{ $t("settings.serverMaintenance.title") }}</div>
      </q-card-actions>
      <q-space />
      <q-card-actions align="right">
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-actions>
    </q-card-section>
    <q-card-section>
      <q-form @submit.prevent="submit">
        <q-card-section>
          <q-select
            :rules="[(val) => !!val || $t('settings.common.required')]"
            outlined
            options-dense
            :label="$t('settings.serverMaintenance.actions')"
            v-model="action"
            :options="actions"
            emit-value
            map-options
            @update:model-value="clear"
          />
        </q-card-section>

        <q-card-section v-if="action === 'prune_db'">
          <q-checkbox
            v-model="prune_tables"
            val="audit_logs"
            :label="$t('settings.serverMaintenance.auditLog')"
          >
            <q-tooltip>{{
              $t("settings.serverMaintenance.auditLogTooltip")
            }}</q-tooltip>
          </q-checkbox>
          <q-checkbox
            v-model="prune_tables"
            val="pending_actions"
            :label="$t('settings.serverMaintenance.pendingActions')"
          >
            <q-tooltip>{{
              $t("settings.serverMaintenance.pendingActionsTooltip")
            }}</q-tooltip>
          </q-checkbox>
          <q-checkbox
            v-model="prune_tables"
            val="alerts"
            :label="$t('settings.serverMaintenance.alerts')"
          >
            <q-tooltip>{{
              $t("settings.serverMaintenance.alertsTooltip")
            }}</q-tooltip>
          </q-checkbox>
        </q-card-section>

        <q-card-actions align="left">
          <q-btn
            :label="$t('settings.common.submit')"
            color="primary"
            type="submit"
            class="full-width"
          />
        </q-card-actions>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script>
import mixins from "@/mixins/mixins";

export default {
  name: "ServerMaintenance",
  mixins: [mixins],
  data() {
    return {
      action: null,
      prune_tables: [],
      actions: [],
    };
  },
  created() {
    this.actions = [
      {
        label: this.$t("settings.serverMaintenance.actionOptions.reloadNats"),
        value: "reload_nats",
      },
      {
        label: this.$t(
          "settings.serverMaintenance.actionOptions.removeOrphanedTasks",
        ),
        value: "rm_orphaned_tasks",
      },
      {
        label: this.$t(
          "settings.serverMaintenance.actionOptions.pruneDbTables",
        ),
        value: "prune_db",
      },
    ];
  },
  methods: {
    clear() {
      this.prune_tables = [];
    },
    submit() {
      this.$q.loading.show();

      let data = {
        action: this.action,
        prune_tables: this.prune_tables,
      };

      this.$axios
        .post("core/servermaintenance/", data)
        .then((r) => {
          this.$q.loading.hide();
          this.notifySuccess(r.data);
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
  },
};
</script>
