<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 75vw; max-heigth: 75vh" class="q-dialog-plugin">
      <q-bar>
        {{ localRole ? $gettext("Editing Role") : $gettext("Adding Role") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>
      <q-form ref="form" @submit="onSubmit">
        <q-card-section class="row">
          <q-input
            :label="$gettext('Role Name')"
            class="col-6"
            dense
            outlined
            v-model="localRole.name"
            :rules="[(val) => !!val || $gettext('*Required')]"
          />
        </q-card-section>
        <q-card-section class="scroll" style="height: 70vh">
          <!-- Permissions -->
          <div class="text-subtitle2">
            {{ $gettext("Super User") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.is_superuser"
                :label="$gettext('Super User')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Reporting") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_view_reports"
                :label="$gettext('Reporting Viewer')"
              />
              <q-checkbox
                v-model="localRole.can_manage_reports"
                :label="
                  $pgettext('Report management permission', 'Reporting Manager')
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $gettext("Accounts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_accounts"
                :label="$gettext('List User Accounts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_accounts"
                :label="$gettext('Manage User Accounts')"
              />
              <q-checkbox
                v-model="localRole.can_list_roles"
                :label="$gettext('List Roles')"
              />
              <q-checkbox
                v-model="localRole.can_manage_roles"
                :label="$gettext('Manage Roles')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Agents") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_agents"
                :label="$gettext('List Agents')"
              />
              <q-checkbox
                v-model="localRole.can_list_agent_history"
                :label="$gettext('List Agent History')"
              />
              <q-checkbox
                v-model="localRole.can_use_mesh"
                :label="$gettext('Use MeshCentral')"
              />
              <q-checkbox
                v-model="localRole.can_uninstall_agents"
                :label="$gettext('Uninstall Agents')"
              />
              <q-checkbox
                v-model="localRole.can_update_agents"
                :label="$pgettext('Role permissions', 'Update Agents')"
              />
              <q-checkbox
                v-model="localRole.can_edit_agent"
                :label="$gettext('Edit Agents')"
              />
              <q-checkbox
                v-model="localRole.can_manage_procs"
                :label="$gettext('Manage Processes')"
              />
              <q-checkbox
                v-model="localRole.can_view_eventlogs"
                :label="$gettext('View Event Logs')"
              />
              <q-checkbox
                v-model="localRole.can_send_cmd"
                :label="$pgettext('Role permissions', 'Send Command')"
              />
              <q-checkbox
                v-model="localRole.can_use_terminal"
                :label="$gettext('Use Terminal')"
              />
              <q-checkbox
                v-model="localRole.can_reboot_agents"
                :label="$gettext('Shutdown / Reboot Agents')"
              />
              <q-checkbox
                v-model="localRole.can_send_wol"
                :label="$gettext('Wake-Up (WoL) Agents')"
              />
              <q-checkbox
                v-model="localRole.can_install_agents"
                :label="$gettext('Install Agents')"
              />
              <q-checkbox
                v-model="localRole.can_run_scripts"
                :label="$pgettext('Role permissions', 'Run Script')"
              />
              <q-checkbox
                v-model="localRole.can_run_bulk"
                :label="$pgettext('Role permissions', 'Bulk Actions')"
              />
              <q-checkbox
                v-model="localRole.can_recover_agents"
                :label="$gettext('Recover Agents')"
              />
              <q-checkbox
                v-model="localRole.can_use_registry"
                :label="$gettext('Use Registry')"
              />
              <q-checkbox
                v-model="localRole.can_use_file_browser"
                :label="$gettext('Use File Browser')"
              />
            </div>
          </q-card-section>
          <div class="text-subtitle2">
            {{ $gettext("Core") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_notes"
                :label="$gettext('List Notes')"
              />
              <q-checkbox
                v-model="localRole.can_manage_notes"
                :label="$gettext('Manage Notes')"
              />
              <q-checkbox
                v-model="localRole.can_view_core_settings"
                :label="$gettext('View Global Settings')"
              />
              <q-checkbox
                v-model="localRole.can_edit_core_settings"
                :label="$gettext('Edit Global Settings')"
              />
              <q-checkbox
                v-model="localRole.can_view_global_keystore"
                :label="$gettext('View Global Key Store')"
              />
              <q-checkbox
                v-model="localRole.can_edit_global_keystore"
                :label="$gettext('Edit Global Key Store')"
              />
              <q-checkbox
                v-model="localRole.can_do_server_maint"
                :label="$gettext('Do Server Maintenance')"
              />
              <q-checkbox
                v-model="localRole.can_code_sign"
                :label="$gettext('Manage Code Signing')"
              />
              <q-checkbox
                v-model="localRole.can_list_api_keys"
                :label="$gettext('List API Keys')"
              />
              <q-checkbox
                v-model="localRole.can_manage_api_keys"
                :label="$gettext('Manage API Keys')"
              />
              <q-checkbox
                v-model="localRole.can_run_urlactions"
                :label="$gettext('Run URL Actions')"
              />
              <q-checkbox
                v-model="localRole.can_view_customfields"
                :label="$gettext('View Custom Fields')"
              />
              <q-checkbox
                v-model="localRole.can_manage_customfields"
                :label="$gettext('Edit Custom Fields')"
              />
              <q-checkbox
                v-model="localRole.can_view_schedules"
                :label="$gettext('List Schedules')"
              />
              <q-checkbox
                v-model="localRole.can_manage_schedules"
                :label="$gettext('Manage Schedules')"
              />
              <q-checkbox
                v-if="!hosted"
                v-model="localRole.can_use_webterm"
                :label="$gettext('Use TRMM Server Web Terminal')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Checks") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_checks"
                :label="$gettext('List Checks')"
              />
              <q-checkbox
                v-model="localRole.can_manage_checks"
                :label="$gettext('Manage Checks')"
              />
              <q-checkbox
                v-model="localRole.can_run_checks"
                :label="$pgettext('Role permissions', 'Run Checks')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Clients") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_clients"
                :label="$gettext('List Clients')"
              />
              <q-checkbox
                v-model="localRole.can_manage_clients"
                :label="$gettext('Manage Clients')"
              />
              <q-checkbox
                v-model="localRole.can_list_sites"
                :label="$gettext('List Sites')"
              />
              <q-checkbox
                v-model="localRole.can_manage_sites"
                :label="$gettext('Manage Sites')"
              />
              <q-checkbox
                v-model="localRole.can_list_deployments"
                :label="$gettext('List Deployments')"
              />
              <q-checkbox
                v-model="localRole.can_manage_deployments"
                :label="$gettext('Manage Deployments')"
              />
            </div>
          </q-card-section>

          <q-card-section class="row">
            <tactical-dropdown
              class="col-6"
              :label="$gettext('Allowed Clients')"
              :options="clientOptions"
              v-model="localRole.can_view_clients"
              :hint="$gettext('Empty means all clients are allowed')"
              outlined
              mapOptions
              multiple
              filterable
            />
          </q-card-section>
          <q-card-section class="row">
            <tactical-dropdown
              class="col-6"
              :label="$gettext('Allowed Sites')"
              :options="siteOptions"
              v-model="localRole.can_view_sites"
              :hint="$gettext('Empty means all sites are allowed')"
              outlined
              mapOptions
              multiple
              filterable
            />
          </q-card-section>

          <div class="text-subtitle2">
            {{ $gettext("Automation Policies") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_automation_policies"
                :label="$gettext('List Automation Policies')"
              />
              <q-checkbox
                v-model="localRole.can_manage_automation_policies"
                :label="$gettext('Manage Automation Policies')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $gettext("Tasks") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_autotasks"
                :label="$gettext('List Tasks')"
              />
              <q-checkbox
                v-model="localRole.can_manage_autotasks"
                :label="$gettext('Manage Tasks')"
              />
              <q-checkbox
                v-model="localRole.can_run_autotasks"
                :label="$gettext('Run Tasks')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $gettext("Logs") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_view_auditlogs"
                :label="$gettext('View Audit Logs')"
              />
              <q-checkbox
                v-model="localRole.can_view_debuglogs"
                :label="$gettext('View Debug Logs')"
              />
              <q-checkbox
                v-model="localRole.can_list_pendingactions"
                :label="$gettext('List Pending Actions')"
              />
              <q-checkbox
                v-model="localRole.can_manage_pendingactions"
                :label="$gettext('Manage Pending Actions')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $gettext("Scripts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_scripts"
                :label="$gettext('List Scripts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_scripts"
                :label="$gettext('Manage Scripts')"
              />
              <q-checkbox
                v-if="!hosted"
                v-model="localRole.can_run_server_scripts"
                :label="$gettext('Run Scripts on TRMM Server')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Alerts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_alerts"
                :label="$gettext('List Alerts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_alerts"
                :label="$gettext('Manage Alerts')"
              />
              <q-checkbox
                v-model="localRole.can_list_alerttemplates"
                :label="$gettext('List Alert Templates')"
              />
              <q-checkbox
                v-model="localRole.can_manage_alerttemplates"
                :label="$gettext('Manage Alert Templates')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $gettext("Windows Services") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_manage_winsvcs"
                :label="$gettext('Manage Windows Services')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Software") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_software"
                :label="$gettext('List Software')"
              />
              <q-checkbox
                v-model="localRole.can_manage_software"
                :label="$gettext('Manage Software')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $pgettext("Role permissions", "Windows Updates") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_manage_winupdates"
                :label="$gettext('Manage Windows Updates')"
              />
            </div>
          </q-card-section>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn dense flat :label="$gettext('Cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            :label="$gettext('Save')"
            color="primary"
            type="submit"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";
import { useDialogPluginComponent } from "quasar";
import { saveRole, editRole } from "@/api/accounts";
import { useClientDropdown, useSiteDropdown } from "@/composables/clients";
import { notifySuccess } from "@/utils/notify";

// ui imports
import TacticalDropdown from "@/components/ui/TacticalDropdown.vue";

export default {
  components: { TacticalDropdown },
  name: "RolesForm",
  emits: [...useDialogPluginComponent.emits],
  props: { role: Object },
  setup(props) {
    // quasar setup
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    // store
    const store = useStore();
    const hosted = computed(() => store.state.hosted);

    // dropdown setup
    const { clientOptions } = useClientDropdown(true);
    const { siteOptions } = useSiteDropdown(true);

    const role = props.role
      ? ref(Object.assign({}, props.role))
      : ref({
          name: "",
          is_superuser: false,
          // agent perms
          can_list_agents: false,
          can_recover_agents: false,
          can_use_mesh: false,
          can_uninstall_agents: false,
          can_update_agents: false,
          can_edit_agent: false,
          can_manage_procs: false,
          can_view_eventlogs: false,
          can_send_cmd: false,
          can_use_terminal: false,
          can_reboot_agents: false,
          can_install_agents: false,
          can_run_scripts: false,
          can_run_bulk: false,
          can_manage_winsvcs: false,
          can_list_agent_history: false,
          can_send_wol: false,
          // software perms
          can_list_software: false,
          can_manage_software: false,
          // note perms
          can_list_notes: false,
          can_manage_notes: false,
          // settings perms
          can_view_core_settings: false,
          can_edit_core_settings: false,
          can_view_global_keystore: false,
          can_edit_global_keystore: false,
          can_do_server_maint: false,
          can_code_sign: false,
          can_run_urlactions: false,
          can_view_customfields: false,
          can_manage_customfields: false,
          can_view_schedules: false,
          can_manage_schedules: false,
          // api key perms
          can_list_api_keys: false,
          can_manage_api_keys: false,
          // check perms
          can_list_checks: false,
          can_manage_checks: false,
          can_run_checks: false,
          // client perms
          can_list_clients: false,
          can_manage_clients: false,
          can_list_sites: false,
          can_manage_sites: false,
          // deployment perms
          can_list_deployments: false,
          can_manage_deployments: false,
          // automation perms
          can_list_automation_policies: false,
          can_manage_automation_policies: false,
          // task perms
          can_list_autotasks: false,
          can_manage_autotasks: false,
          can_run_autotasks: false,
          // log perms
          can_view_auditlogs: false,
          can_view_debuglogs: false,
          can_list_pendingactions: false,
          can_manage_pendingactions: false,
          // script perms
          can_list_scripts: false,
          can_manage_scripts: false,
          // alert perms
          can_list_alerts: false,
          can_manage_alerts: false,
          can_list_alerttemplates: false,
          can_manage_alerttemplates: false,
          // update perms
          can_manage_winupdates: false,
          // account perms
          can_list_accounts: false,
          can_manage_accounts: false,
          can_list_roles: false,
          can_manage_roles: false,
          can_view_clients: [],
          can_view_sites: [],
          // server scripts and web terminal
          can_run_server_scripts: false,
          can_use_webterm: false,
          // reporting perms
          can_view_reports: false,
          can_manage_reports: false,
          can_use_registry: false,
          can_use_file_browser: false,
        });

    const loading = ref(false);

    async function onSubmit() {
      loading.value = true;
      try {
        const result = props.role
          ? await editRole(role.value.id, role.value)
          : await saveRole(role.value);
        notifySuccess(result);
        onDialogOK();
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    watch(
      () => role.value.is_superuser,
      (newValue) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.keys(role.value).forEach((key, index) => {
          if (typeof role.value[key] === "boolean") {
            role.value[key] = newValue;
          }
        });
      },
    );

    return {
      // reactive data
      localRole: role,
      loading,
      clientOptions,
      siteOptions,
      hosted,

      onSubmit,

      // quasar dialog
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
