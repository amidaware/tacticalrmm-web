<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 75vw; max-heigth: 75vh" class="q-dialog-plugin">
      <q-bar>
        {{
          localRole
            ? $t("settings.rolesForm.editingRole")
            : $t("settings.rolesForm.addingRole")
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>
      <q-form ref="form" @submit="onSubmit">
        <q-card-section class="row">
          <q-input
            :label="$t('settings.rolesForm.roleName')"
            class="col-6"
            dense
            outlined
            v-model="localRole.name"
            :rules="[(val) => !!val || $t('tasks.shared.required')]"
          />
        </q-card-section>
        <q-card-section class="scroll" style="height: 70vh">
          <!-- Permissions -->
          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.superUser") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.is_superuser"
                :label="$t('settings.rolesForm.permissionLabels.superUser')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.reporting") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_view_reports"
                :label="
                  $t('settings.rolesForm.permissionLabels.reportingViewer')
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_reports"
                :label="
                  $t('settings.rolesForm.permissionLabels.reportingManager')
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.accounts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_accounts"
                :label="
                  $t('settings.rolesForm.permissionLabels.listUserAccounts')
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_accounts"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageUserAccounts')
                "
              />
              <q-checkbox
                v-model="localRole.can_list_roles"
                :label="$t('settings.rolesForm.permissionLabels.listRoles')"
              />
              <q-checkbox
                v-model="localRole.can_manage_roles"
                :label="$t('settings.rolesForm.permissionLabels.manageRoles')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.agents") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_agents"
                :label="$t('settings.rolesForm.permissionLabels.listAgents')"
              />
              <q-checkbox
                v-model="localRole.can_list_agent_history"
                :label="
                  $t('settings.rolesForm.permissionLabels.listAgentHistory')
                "
              />
              <q-checkbox
                v-model="localRole.can_use_mesh"
                :label="
                  $t('settings.rolesForm.permissionLabels.useMeshCentral')
                "
              />
              <q-checkbox
                v-model="localRole.can_uninstall_agents"
                :label="
                  $t('settings.rolesForm.permissionLabels.uninstallAgents')
                "
              />
              <q-checkbox
                v-model="localRole.can_update_agents"
                :label="$t('settings.rolesForm.permissionLabels.updateAgents')"
              />
              <q-checkbox
                v-model="localRole.can_edit_agent"
                :label="$t('settings.rolesForm.permissionLabels.editAgents')"
              />
              <q-checkbox
                v-model="localRole.can_manage_procs"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageProcesses')
                "
              />
              <q-checkbox
                v-model="localRole.can_view_eventlogs"
                :label="$t('settings.rolesForm.permissionLabels.viewEventLogs')"
              />
              <q-checkbox
                v-model="localRole.can_send_cmd"
                :label="$t('settings.rolesForm.permissionLabels.sendCommand')"
              />
              <q-checkbox
                v-model="localRole.can_reboot_agents"
                :label="
                  $t('settings.rolesForm.permissionLabels.shutdownRebootAgents')
                "
              />
              <q-checkbox
                v-model="localRole.can_send_wol"
                :label="
                  $t('settings.rolesForm.permissionLabels.wakeUpWolAgents')
                "
              />
              <q-checkbox
                v-model="localRole.can_install_agents"
                :label="$t('settings.rolesForm.permissionLabels.installAgents')"
              />
              <q-checkbox
                v-model="localRole.can_run_scripts"
                :label="$t('settings.rolesForm.permissionLabels.runScript')"
              />
              <q-checkbox
                v-model="localRole.can_run_bulk"
                :label="$t('settings.rolesForm.permissionLabels.bulkActions')"
              />
              <q-checkbox
                v-model="localRole.can_recover_agents"
                :label="$t('settings.rolesForm.permissionLabels.recoverAgents')"
              />
              <q-checkbox
                v-model="localRole.can_use_registry"
                :label="$t('settings.rolesForm.permissionLabels.useRegistry')"
              />
            </div>
          </q-card-section>
          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.core") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_notes"
                :label="$t('settings.rolesForm.permissionLabels.listNotes')"
              />
              <q-checkbox
                v-model="localRole.can_manage_notes"
                :label="$t('settings.rolesForm.permissionLabels.manageNotes')"
              />
              <q-checkbox
                v-model="localRole.can_view_core_settings"
                :label="
                  $t('settings.rolesForm.permissionLabels.viewGlobalSettings')
                "
              />
              <q-checkbox
                v-model="localRole.can_edit_core_settings"
                :label="
                  $t('settings.rolesForm.permissionLabels.editGlobalSettings')
                "
              />
              <q-checkbox
                v-model="localRole.can_view_global_keystore"
                :label="
                  $t('settings.rolesForm.permissionLabels.viewGlobalKeyStore')
                "
              />
              <q-checkbox
                v-model="localRole.can_edit_global_keystore"
                :label="
                  $t('settings.rolesForm.permissionLabels.editGlobalKeyStore')
                "
              />
              <q-checkbox
                v-model="localRole.can_do_server_maint"
                :label="
                  $t('settings.rolesForm.permissionLabels.doServerMaintenance')
                "
              />
              <q-checkbox
                v-model="localRole.can_code_sign"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageCodeSigning')
                "
              />
              <q-checkbox
                v-model="localRole.can_list_api_keys"
                :label="$t('settings.rolesForm.permissionLabels.listApiKeys')"
              />
              <q-checkbox
                v-model="localRole.can_manage_api_keys"
                :label="$t('settings.rolesForm.permissionLabels.manageApiKeys')"
              />
              <q-checkbox
                v-model="localRole.can_run_urlactions"
                :label="$t('settings.rolesForm.permissionLabels.runUrlActions')"
              />
              <q-checkbox
                v-model="localRole.can_view_customfields"
                :label="
                  $t('settings.rolesForm.permissionLabels.viewCustomFields')
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_customfields"
                :label="
                  $t('settings.rolesForm.permissionLabels.editCustomFields')
                "
              />
              <q-checkbox
                v-model="localRole.can_view_schedules"
                :label="$t('settings.rolesForm.permissionLabels.listSchedules')"
              />
              <q-checkbox
                v-model="localRole.can_manage_schedules"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageSchedules')
                "
              />
              <q-checkbox
                v-if="!hosted"
                v-model="localRole.can_use_webterm"
                :label="
                  $t(
                    'settings.rolesForm.permissionLabels.useTrmmServerWebTerminal',
                  )
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.checks") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_checks"
                :label="$t('settings.rolesForm.permissionLabels.listChecks')"
              />
              <q-checkbox
                v-model="localRole.can_manage_checks"
                :label="$t('settings.rolesForm.permissionLabels.manageChecks')"
              />
              <q-checkbox
                v-model="localRole.can_run_checks"
                :label="$t('settings.rolesForm.permissionLabels.runChecks')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.clients") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_clients"
                :label="$t('settings.rolesForm.permissionLabels.listClients')"
              />
              <q-checkbox
                v-model="localRole.can_manage_clients"
                :label="$t('settings.rolesForm.permissionLabels.manageClients')"
              />
              <q-checkbox
                v-model="localRole.can_list_sites"
                :label="$t('settings.rolesForm.permissionLabels.listSites')"
              />
              <q-checkbox
                v-model="localRole.can_manage_sites"
                :label="$t('settings.rolesForm.permissionLabels.manageSites')"
              />
              <q-checkbox
                v-model="localRole.can_list_deployments"
                :label="
                  $t('settings.rolesForm.permissionLabels.listDeployments')
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_deployments"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageDeployments')
                "
              />
            </div>
          </q-card-section>

          <q-card-section class="row">
            <tactical-dropdown
              class="col-6"
              :label="$t('settings.rolesForm.allowedClients')"
              :options="clientOptions"
              v-model="localRole.can_view_clients"
              :hint="$t('settings.rolesForm.emptyMeansAllClientsAllowed')"
              outlined
              mapOptions
              multiple
              filterable
            />
          </q-card-section>
          <q-card-section class="row">
            <tactical-dropdown
              class="col-6"
              :label="$t('settings.rolesForm.allowedSites')"
              :options="siteOptions"
              v-model="localRole.can_view_sites"
              :hint="$t('settings.rolesForm.emptyMeansAllSitesAllowed')"
              outlined
              mapOptions
              multiple
              filterable
            />
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.automationPolicies") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_automation_policies"
                :label="
                  $t(
                    'settings.rolesForm.permissionLabels.listAutomationPolicies',
                  )
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_automation_policies"
                :label="
                  $t(
                    'settings.rolesForm.permissionLabels.manageAutomationPolicies',
                  )
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.tasks") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_autotasks"
                :label="$t('settings.rolesForm.permissionLabels.listTasks')"
              />
              <q-checkbox
                v-model="localRole.can_manage_autotasks"
                :label="$t('settings.rolesForm.permissionLabels.manageTasks')"
              />
              <q-checkbox
                v-model="localRole.can_run_autotasks"
                :label="$t('settings.rolesForm.permissionLabels.runTasks')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.logs") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_view_auditlogs"
                :label="$t('settings.rolesForm.permissionLabels.viewAuditLogs')"
              />
              <q-checkbox
                v-model="localRole.can_view_debuglogs"
                :label="$t('settings.rolesForm.permissionLabels.viewDebugLogs')"
              />
              <q-checkbox
                v-model="localRole.can_list_pendingactions"
                :label="
                  $t('settings.rolesForm.permissionLabels.listPendingActions')
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_pendingactions"
                :label="
                  $t('settings.rolesForm.permissionLabels.managePendingActions')
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.scripts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_scripts"
                :label="$t('settings.rolesForm.permissionLabels.listScripts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_scripts"
                :label="$t('settings.rolesForm.permissionLabels.manageScripts')"
              />
              <q-checkbox
                v-if="!hosted"
                v-model="localRole.can_run_server_scripts"
                :label="
                  $t(
                    'settings.rolesForm.permissionLabels.runScriptsOnTrmmServer',
                  )
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.alerts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_alerts"
                :label="$t('settings.rolesForm.permissionLabels.listAlerts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_alerts"
                :label="$t('settings.rolesForm.permissionLabels.manageAlerts')"
              />
              <q-checkbox
                v-model="localRole.can_list_alerttemplates"
                :label="
                  $t('settings.rolesForm.permissionLabels.listAlertTemplates')
                "
              />
              <q-checkbox
                v-model="localRole.can_manage_alerttemplates"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageAlertTemplates')
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.windowsServices") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_manage_winsvcs"
                :label="
                  $t(
                    'settings.rolesForm.permissionLabels.manageWindowsServices',
                  )
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.software") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_software"
                :label="$t('settings.rolesForm.permissionLabels.listSoftware')"
              />
              <q-checkbox
                v-model="localRole.can_manage_software"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageSoftware')
                "
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("settings.rolesForm.sections.windowsUpdates") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_manage_winupdates"
                :label="
                  $t('settings.rolesForm.permissionLabels.manageWindowsUpdates')
                "
              />
            </div>
          </q-card-section>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            dense
            flat
            :label="$t('common.buttons.cancel')"
            v-close-popup
          />
          <q-btn
            :loading="loading"
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
