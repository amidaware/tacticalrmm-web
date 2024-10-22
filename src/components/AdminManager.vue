<template>
  <q-card style="width: 900px; max-width: 90vw; min-height: 50vh">
    <q-bar>
      <q-btn
        ref="refresh"
        @click="getUsers"
        class="q-mr-sm"
        dense
        flat
        push
        icon="refresh"
      />User Administration
      <q-space />
      <q-btn dense flat icon="close" v-close-popup>
        <q-tooltip class="bg-white text-primary">Close</q-tooltip>
      </q-btn>
    </q-bar>
    <div class="q-pa-md">
      <div class="q-gutter-sm">
        <q-btn
          ref="new"
          label="New"
          dense
          flat
          push
          unelevated
          no-caps
          icon="add"
          @click="showAddUserModal"
        />
      </div>
      <q-table
        dense
        :rows="users"
        :columns="columns"
        v-model:pagination="pagination"
        row-key="id"
        binary-state-sort
        hide-pagination
        virtual-scroll
      >
        <!-- header slots -->
        <template v-slot:header-cell-is_active="props">
          <q-th :props="props" auto-width>
            <q-icon name="power_settings_new" size="1.5em">
              <q-tooltip>Enable User</q-tooltip>
            </q-icon>
          </q-th>
        </template>

        <template v-slot:header-cell-sso="props">
          <q-th :props="props" auto-width></q-th>
        </template>

        <!-- No data Slot -->
        <template v-slot:no-data>
          <div class="full-width row flex-center q-gutter-sm">
            <span v-if="users.length === 0">No Users</span>
          </div>
        </template>

        <!-- body slots -->
        <template v-slot:body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            @dblclick="showEditUserModal(props.row)"
          >
            <!-- context menu -->
            <q-menu context-menu>
              <q-list dense style="min-width: 200px">
                <q-item
                  clickable
                  v-close-popup
                  @click="showEditUserModal(props.row)"
                >
                  <q-item-section side>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section>Edit</q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="deleteUser(props.row)"
                  :disable="props.row.username === logged_in_user"
                >
                  <q-item-section side>
                    <q-icon name="delete" />
                  </q-item-section>
                  <q-item-section>Delete</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item
                  clickable
                  v-close-popup
                  @click="ResetPassword(props.row)"
                  id="context-reset"
                  :disable="localLogonDisabled"
                >
                  <q-item-section side>
                    <q-icon name="autorenew" />
                  </q-item-section>
                  <q-item-section>Reset Password</q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-close-popup
                  @click="reset2FA(props.row)"
                  id="context-reset"
                  :disable="localLogonDisabled"
                >
                  <q-item-section side>
                    <q-icon name="autorenew" />
                  </q-item-section>
                  <q-item-section>Reset Two-Factor Auth</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item
                  clickable
                  v-close-popup
                  @click="showSSOAccounts(props.row)"
                  id="context-reset"
                  :disable="props.row.social_accounts.length === 0"
                >
                  <q-item-section side>
                    <q-icon name="groups" />
                  </q-item-section>
                  <q-item-section>Show Connected SSO Accounts</q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-close-popup
                  @click="showSessions(props.row)"
                  id="context-reset"
                >
                  <q-item-section side>
                    <q-icon name="groups" />
                  </q-item-section>
                  <q-item-section>Show Active Sessions</q-item-section>
                </q-item>

                <q-separator></q-separator>

                <q-item clickable v-close-popup>
                  <q-item-section>Close</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <!-- enabled checkbox -->
            <q-td>
              <q-checkbox
                dense
                @update:model-value="toggleEnabled(props.row)"
                v-model="props.row.is_active"
                :disable="props.row.username === logged_in_user"
              />
            </q-td>
            <q-td>
              <q-chip
                v-if="props.row.social_accounts.length > 0"
                color="primary"
                dense
                >SSO</q-chip
              >
            </q-td>
            <q-td>{{ props.row.username }}</q-td>
            <q-td>{{ props.row.first_name }} {{ props.row.last_name }}</q-td>
            <q-td>{{ props.row.email }}</q-td>
            <q-td v-if="props.row.last_login">{{
              formatDate(props.row.last_login)
            }}</q-td>
            <q-td v-else>Never</q-td>
            <q-td>{{ props.row.last_login_ip }}</q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </q-card>
</template>

<script>
import mixins from "@/mixins/mixins";
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { fetchCoreSettings } from "@/api/core";

import { mapState as piniaMapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import UserForm from "@/components/modals/admin/UserForm.vue";
import UserResetPasswordForm from "@/components/modals/admin/UserResetPasswordForm.vue";
import SSOAccountsTable from "@/ee/sso/components/SSOAccountsTable.vue";
import UserSessionsTable from "@/components/accounts/UserSessionsTable.vue";

export default {
  name: "AdminManager",
  mixins: [mixins],
  setup() {
    // setup vuex
    const store = useStore();
    const formatDate = computed(() => store.getters.formatDate);

    const $q = useQuasar();

    const localLogonDisabled = ref(false);

    function showSSOAccounts(user) {
      $q.dialog({
        component: SSOAccountsTable,
        componentProps: {
          user,
        },
      });
    }

    async function getCoreSettings() {
      const result = await fetchCoreSettings();

      localLogonDisabled.value = result.block_local_user_logon;
    }

    async function showSessions(user) {
      $q.dialog({
        component: UserSessionsTable,
        componentProps: {
          user,
        },
      });
    }

    onMounted(getCoreSettings);

    return {
      localLogonDisabled,
      formatDate,
      showSSOAccounts,
      showSessions,
    };
  },
  data() {
    return {
      users: [],
      columns: [
        {
          name: "is_active",
          label: "Active",
          field: "is_active",
          align: "left",
        },
        {
          name: "sso",
          label: "",
          field: "sso",
          align: "left",
          sortable: true,
        },
        {
          name: "username",
          label: "Username",
          field: "username",
          align: "left",
          sortable: true,
        },
        {
          name: "name",
          label: "Name",
          field: "name",
          align: "left",
          sortable: true,
        },
        {
          name: "email",
          label: "Email",
          field: "email",
          align: "left",
          sortable: true,
        },
        {
          name: "last_login",
          label: "Last Login",
          field: "last_login",
          align: "left",
          sortable: true,
        },
        {
          name: "last_login_ip",
          label: "Last Logon From",
          field: "last_login_ip",
          align: "left",
          sortable: true,
        },
      ],
      pagination: {
        rowsPerPage: 0,
        sortBy: "username",
        descending: true,
      },
    };
  },
  methods: {
    getUsers() {
      this.$q.loading.show();
      this.$axios
        .get("/accounts/users/")
        .then((r) => {
          this.users = r.data;
          this.$q.loading.hide();
        })
        .catch(() => {
          this.$q.loading.hide();
        });
    },
    deleteUser(user) {
      this.$q
        .dialog({
          title: `Delete user ${user.username}?`,
          cancel: true,
          ok: { label: "Delete", color: "negative" },
        })
        .onOk(() => {
          this.$axios.delete(`/accounts/${user.id}/users/`).then(() => {
            this.getUsers();
            this.notifySuccess(`User ${user.username} was deleted!`);
          });
        });
    },
    showEditUserModal(user) {
      this.$q
        .dialog({
          component: UserForm,
          componentProps: {
            user: user,
          },
        })
        .onOk(() => {
          this.getUsers();
        });
    },
    showAddUserModal() {
      this.$q
        .dialog({
          component: UserForm,
        })
        .onOk(() => {
          this.getUsers();
        });
    },
    toggleEnabled(user) {
      if (user.username === this.logged_in_user) {
        return;
      }
      let text = !user.is_active
        ? "User enabled successfully"
        : "User disabled successfully";

      const data = {
        id: user.id,
        is_active: !user.is_active,
      };

      this.$axios.put(`/accounts/${data.id}/users/`, data).then(() => {
        this.notifySuccess(text);
      });
    },
    ResetPassword(user) {
      this.$q
        .dialog({
          component: UserResetPasswordForm,
          componentProps: {
            user: user,
          },
        })
        .onOk(() => {
          this.getUsers();
        });
    },
    reset2FA(user) {
      const data = {
        id: user.id,
      };

      this.$q
        .dialog({
          title: `Reset 2FA for ${user.username}?`,
          cancel: true,
          ok: { label: "Reset", color: "positive" },
        })
        .onOk(() => {
          this.$axios
            .put("/accounts/users/reset_totp/", data)
            .then((response) => {
              this.notifySuccess(response.data, 4000);
            });
        });
    },
  },
  computed: {
    ...piniaMapState(useAuthStore, {
      logged_in_user: (state) => state.username,
    }),
  },
  mounted() {
    this.getUsers();
  },
};
</script>
