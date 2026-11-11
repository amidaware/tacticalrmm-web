<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">SSH Keys</div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        label="Add key"
        @click="addSSHKey"
      />
    </div>
    <q-separator />
    <q-table
      dense
      :rows="keys"
      :columns="columns"
      v-model:pagination="pagination"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      no-data-label="No SSH keys added yet"
    >
      <template v-slot:header-cell-actions="props">
        <q-th :props="props" auto-width> </q-th>
      </template>

      <template v-slot:body="props">
        <q-tr
          :props="props"
          class="cursor-pointer"
          @dblclick="editSSHKey(props.row)"
        >
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item clickable v-close-popup @click="editSSHKey(props.row)">
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="deleteSSHKey(props.row)">
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>Delete</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>Close</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <q-td>
            {{ props.row.name }}
          </q-td>
          <q-td>
            {{ props.row.key_type }}
          </q-td>
          <q-td>
            <code class="text-caption">{{ props.row.fingerprint }}</code>
          </q-td>
          <q-td>
            {{ props.row.comment }}
          </q-td>
          <q-td>
            {{ formatDate(props.row.created_time) }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { fetchSSHKeys, removeSSHKey } from "@/api/accounts";
import { useQuasar } from "quasar";
import { notifySuccess } from "@/utils/notify";
import SSHKeysForm from "@/components/core/SSHKeysForm.vue";

const columns = [
  {
    name: "name",
    label: "Name",
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "key_type",
    label: "Type",
    field: "key_type",
    align: "left",
    sortable: true,
  },
  {
    name: "fingerprint",
    label: "Fingerprint",
    field: "fingerprint",
    align: "left",
    sortable: true,
  },
  {
    name: "comment",
    label: "Comment",
    field: "comment",
    align: "left",
    sortable: true,
  },
  {
    name: "created_time",
    label: "Created",
    field: "created_time",
    align: "left",
    sortable: true,
  },
  {
    name: "actions",
    label: "",
    field: "actions",
  },
];

export default {
  name: "SSHKeysTable",
  setup() {
    const $q = useQuasar();
    const store = useStore();
    const formatDate = computed(() => store.getters.formatDate);

    const keys = ref([]);
    const loading = ref(false);

    const pagination = ref({
      rowsPerPage: 0,
      sortBy: "name",
      descending: true,
    });

    async function getSSHKeys() {
      loading.value = true;
      keys.value = await fetchSSHKeys();
      loading.value = false;
    }

    async function deleteSSHKey(key) {
      $q.dialog({
        title: `Delete SSH key: ${key.name}?`,
        cancel: true,
        ok: { label: "Delete", color: "negative" },
      }).onOk(async () => {
        loading.value = true;
        try {
          const result = await removeSSHKey(key.id);
          notifySuccess(result);
          getSSHKeys();
          loading.value = false;
        } catch (e) {
          console.error(e);
          loading.value = false;
        }
      });
    }

    function editSSHKey(key) {
      $q.dialog({
        component: SSHKeysForm,
        componentProps: {
          SSHKey: key,
        },
      }).onOk(() => getSSHKeys());
    }

    function addSSHKey() {
      $q.dialog({
        component: SSHKeysForm,
      }).onOk(() => getSSHKeys());
    }

    onMounted(getSSHKeys);

    return {
      keys,
      loading,
      pagination,
      columns,
      getSSHKeys,
      deleteSSHKey,
      formatDate,
      editSSHKey,
      addSSHKey,
    };
  },
};
</script>
