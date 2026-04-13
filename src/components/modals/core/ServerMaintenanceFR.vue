<template>
  <q-card style="min-width: 400px">
    <q-card-section class="row">
      <q-card-actions align="left">
        <div class="text-h6">Maintenance serveur</div>
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
            :rules="[(val) => !!val || '*Required']"
            outlined
            options-dense
            label="Actions"
            v-model="action"
            :options="actions"
            emit-value
            map-options
            @update:model-value="clear"
          />
        </q-card-section>

        <q-card-section v-if="action === 'prune_db'">
          <q-checkbox v-model="prune_tables" val="audit_logs" label="Audit Log">
            <q-tooltip>Retire les résultats de recherche des agents</q-tooltip>
          </q-checkbox>
          <q-checkbox
            v-model="prune_tables"
            val="pending_actions"
            label="Actions en attente"
          >
            <q-tooltip>Retire complètement les actions en attente</q-tooltip>
          </q-checkbox>
          <q-checkbox v-model="prune_tables" val="alerts" label="Alerts">
            <q-tooltip>Retirer toutes les alertes</q-tooltip>
          </q-checkbox>
        </q-card-section>

        <q-card-actions align="left">
          <q-btn
            label="Soumettre"
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
      actions: [
        {
          label: "Relire la configuration Nats",
          value: "reload_nats",
        },
        {
          label: "Retirer les tâches orphelines",
          value: "rm_orphaned_tasks",
        },
        {
          label: "Épurer les tables de la base de données",
          value: "prune_db",
        },
      ],
    };
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
