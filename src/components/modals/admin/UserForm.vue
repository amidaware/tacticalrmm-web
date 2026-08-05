<template>
  <q-dialog ref="dialog" @hide="onHide">
    <q-card style="min-width: 85vh">
      <q-form ref="form" @submit="onSubmit">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ title }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="row">
          <div class="col-2">{{ $t("settings.common.username") }}:</div>
          <div class="col-10">
            <q-input
              outlined
              dense
              v-model="localUser.username"
              :rules="[(val) => !!val || $t('tasks.shared.required')]"
              class="q-pa-none"
            />
          </div>
        </q-card-section>
        <q-card-section class="row" v-if="!user">
          <div class="col-2">{{ $t("settings.common.password") }}:</div>
          <div class="col-10">
            <q-input
              outlined
              dense
              v-model="localUser.password"
              :type="isPwd ? 'password' : 'text'"
              :rules="[(val) => !!val || $t('tasks.shared.required')]"
              class="q-pa-none"
            >
              <template v-slot:append>
                <q-icon
                  :name="isPwd ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="isPwd = !isPwd"
                />
              </template>
            </q-input>
          </div>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-2">
            {{ $t("settings.adminManager.columns.email") }}:
          </div>
          <div class="col-10">
            <q-input
              outlined
              dense
              v-model="localUser.email"
              :rules="[
                (val) =>
                  isValidEmail(val) || $t('settings.userForm.invalidEmail'),
              ]"
              class="q-pa-none"
            />
          </div>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-2">{{ $t("settings.userForm.firstName") }}:</div>
          <div class="col-10">
            <q-input outlined dense v-model="localUser.first_name" />
          </div>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-2">{{ $t("settings.userForm.lastName") }}:</div>
          <div class="col-10">
            <q-input outlined dense v-model="localUser.last_name" />
          </div>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-2">
            {{ $t("settings.adminManager.columns.active") }}:
          </div>
          <div class="col-10">
            <q-checkbox
              v-model="localUser.is_active"
              :disable="localUser.username === logged_in_user"
            />
          </div>
        </q-card-section>
        <q-card-section class="row">
          <div class="col-2">{{ $t("settings.userForm.role") }}:</div>
          <template v-if="roles.length === 0"
            ><span>{{ $t("settings.userForm.noRolesCreated") }}</span></template
          >
          <template v-else
            ><q-select
              map-options
              emit-value
              outlined
              dense
              options-dense
              v-model="localUser.role"
              :options="roles"
              class="col-10"
          /></template>
        </q-card-section>
        <q-card-section>
          <q-checkbox
            :label="$t('settings.userForm.denyDashboardLogins')"
            left-label
            v-model="localUser.block_dashboard_login"
            :disable="localUser.username === logged_in_user"
          />
        </q-card-section>
        <q-card-section class="row items-center">
          <q-btn
            :disable="!disableSave"
            :label="$t('common.buttons.save')"
            color="primary"
            type="submit"
          />
        </q-card-section>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import { mapState as piniaMapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import mixins from "@/mixins/mixins";

export default {
  name: "UserForm",
  emits: ["cancel", "ok", "hide"],
  mixins: [mixins],
  props: { user: !Object },
  data() {
    return {
      localUser: {
        is_active: true,
        block_dashboard_login: false,
      },
      roles: [],
      isPwd: true,
    };
  },
  computed: {
    disableSave() {
      if (this.user) {
        return !!this.localUser.username;
      } else {
        return !!this.localUser.username && !!this.localUser.password;
      }
    },
    title() {
      return this.user
        ? this.$t("settings.userForm.editUser")
        : this.$t("settings.userForm.addUser");
    },
    ...piniaMapState(useAuthStore, {
      logged_in_user: (state) => state.username,
    }),
  },
  methods: {
    getRoles() {
      this.$axios.get("/accounts/roles/").then((r) => {
        this.roles = r.data.map((role) => ({
          label: role.name,
          value: role.id,
        }));
      });
    },
    onSubmit() {
      this.$q.loading.show();
      delete this.localUser.last_login;

      if (this.user) {
        // dont allow updating is_active if username is same as logged in user
        if (this.localUser.username === this.logged_in_user) {
          delete this.localUser.is_active;
          delete this.localUser.deny_dashboard_login;
        }

        this.$axios
          .put(`/accounts/${this.localUser.id}/users/`, this.localUser)
          .then(() => {
            this.$q.loading.hide();
            this.onOk();
            this.notifySuccess(this.$t("settings.userForm.notify.edited"));
          })
          .catch(() => {
            this.$q.loading.hide();
          });
      } else {
        this.$axios
          .post("/accounts/users/", this.localUser)
          .then((r) => {
            this.$q.loading.hide();
            this.onOk();
            this.notifySuccess(
              this.$t("settings.userForm.notify.added", { username: r.data }),
            );
          })
          .catch(() => {
            this.$q.loading.hide();
          });
      }
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
    this.getRoles();

    if (this.user) Object.assign(this.localUser, this.user);
  },
};
</script>
