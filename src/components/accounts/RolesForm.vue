<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="min-width: 75vw; max-heigth: 75vh" class="q-dialog-plugin">
      <q-bar>
        {{ localRole ? $t("admin.roles.editing") : $t("admin.roles.adding") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>
      <q-form ref="form" @submit="onSubmit">
        <q-card-section class="row">
          <q-input
            :label="$t('admin.roles.roleName')"
            class="col-6"
            dense
            outlined
            v-model="localRole.name"
            :rules="[(val) => !!val || $t('admin.required')]"
          />
        </q-card-section>
        <q-card-section class="scroll" style="height: 70vh">
          <!-- Permissions -->
          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.superUser") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.is_superuser"
                :label="$t('admin.roles.perms.superUser')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.reporting") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_view_reports"
                :label="$t('admin.roles.perms.reportingViewer')"
              />
              <q-checkbox
                v-model="localRole.can_manage_reports"
                :label="$t('admin.roles.perms.reportingManager')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.accounts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_accounts"
                :label="$t('admin.roles.perms.listAccounts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_accounts"
                :label="$t('admin.roles.perms.manageAccounts')"
              />
              <q-checkbox
                v-model="localRole.can_list_roles"
                :label="$t('admin.roles.perms.listRoles')"
              />
              <q-checkbox
                v-model="localRole.can_manage_roles"
                :label="$t('admin.roles.perms.manageRoles')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.agents") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_agents"
                :label="$t('admin.roles.perms.listAgents')"
              />
              <q-checkbox
                v-model="localRole.can_list_agent_history"
                :label="$t('admin.roles.perms.listAgentHistory')"
              />
              <q-checkbox
                v-model="localRole.can_use_mesh"
                :label="$t('admin.roles.perms.useMesh')"
              />
              <q-checkbox
                v-model="localRole.can_uninstall_agents"
                :label="$t('admin.roles.perms.uninstallAgents')"
              />
              <q-checkbox
                v-model="localRole.can_update_agents"
                :label="$t('admin.roles.perms.updateAgents')"
              />
              <q-checkbox
                v-model="localRole.can_edit_agent"
                :label="$t('admin.roles.perms.editAgents')"
              />
              <q-checkbox
                v-model="localRole.can_manage_procs"
                :label="$t('admin.roles.perms.manageProcs')"
              />
              <q-checkbox
                v-model="localRole.can_view_eventlogs"
                :label="$t('admin.roles.perms.viewEventLogs')"
              />
              <q-checkbox
                v-model="localRole.can_send_cmd"
                :label="$t('admin.roles.perms.sendCmd')"
              />
              <q-checkbox
                v-model="localRole.can_use_terminal"
                :label="$t('admin.roles.perms.useTerminal')"
              />
              <q-checkbox
                v-model="localRole.can_reboot_agents"
                :label="$t('admin.roles.perms.rebootAgents')"
              />
              <q-checkbox
                v-model="localRole.can_send_wol"
                :label="$t('admin.roles.perms.sendWol')"
              />
              <q-checkbox
                v-model="localRole.can_install_agents"
                :label="$t('admin.roles.perms.installAgents')"
              />
              <q-checkbox
                v-model="localRole.can_run_scripts"
                :label="$t('admin.roles.perms.runScripts')"
              />
              <q-checkbox
                v-model="localRole.can_run_bulk"
                :label="$t('admin.roles.perms.runBulk')"
              />
              <q-checkbox
                v-model="localRole.can_recover_agents"
                :label="$t('admin.roles.perms.recoverAgents')"
              />
              <q-checkbox
                v-model="localRole.can_use_registry"
                :label="$t('admin.roles.perms.useRegistry')"
              />
              <q-checkbox
                v-model="localRole.can_use_file_browser"
                :label="$t('admin.roles.perms.useFileBrowser')"
              />
            </div>
          </q-card-section>
          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.core") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_notes"
                :label="$t('admin.roles.perms.listNotes')"
              />
              <q-checkbox
                v-model="localRole.can_manage_notes"
                :label="$t('admin.roles.perms.manageNotes')"
              />
              <q-checkbox
                v-model="localRole.can_view_core_settings"
                :label="$t('admin.roles.perms.viewCoreSettings')"
              />
              <q-checkbox
                v-model="localRole.can_edit_core_settings"
                :label="$t('admin.roles.perms.editCoreSettings')"
              />
              <q-checkbox
                v-model="localRole.can_view_global_keystore"
                :label="$t('admin.roles.perms.viewKeyStore')"
              />
              <q-checkbox
                v-model="localRole.can_edit_global_keystore"
                :label="$t('admin.roles.perms.editKeyStore')"
              />
              <q-checkbox
                v-model="localRole.can_do_server_maint"
                :label="$t('admin.roles.perms.serverMaint')"
              />
              <q-checkbox
                v-model="localRole.can_code_sign"
                :label="$t('admin.roles.perms.codeSign')"
              />
              <q-checkbox
                v-model="localRole.can_list_api_keys"
                :label="$t('admin.roles.perms.listApiKeys')"
              />
              <q-checkbox
                v-model="localRole.can_manage_api_keys"
                :label="$t('admin.roles.perms.manageApiKeys')"
              />
              <q-checkbox
                v-model="localRole.can_run_urlactions"
                :label="$t('admin.roles.perms.runUrlActions')"
              />
              <q-checkbox
                v-model="localRole.can_view_customfields"
                :label="$t('admin.roles.perms.viewCustomFields')"
              />
              <q-checkbox
                v-model="localRole.can_manage_customfields"
                :label="$t('admin.roles.perms.manageCustomFields')"
              />
              <q-checkbox
                v-model="localRole.can_view_schedules"
                :label="$t('admin.roles.perms.listSchedules')"
              />
              <q-checkbox
                v-model="localRole.can_manage_schedules"
                :label="$t('admin.roles.perms.manageSchedules')"
              />
              <q-checkbox
                v-if="!hosted"
                v-model="localRole.can_use_webterm"
                :label="$t('admin.roles.perms.useWebterm')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.checks") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_checks"
                :label="$t('admin.roles.perms.listChecks')"
              />
              <q-checkbox
                v-model="localRole.can_manage_checks"
                :label="$t('admin.roles.perms.manageChecks')"
              />
              <q-checkbox
                v-model="localRole.can_run_checks"
                :label="$t('admin.roles.perms.runChecks')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.clients") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_clients"
                :label="$t('admin.roles.perms.listClients')"
              />
              <q-checkbox
                v-model="localRole.can_manage_clients"
                :label="$t('admin.roles.perms.manageClients')"
              />
              <q-checkbox
                v-model="localRole.can_list_sites"
                :label="$t('admin.roles.perms.listSites')"
              />
              <q-checkbox
                v-model="localRole.can_manage_sites"
                :label="$t('admin.roles.perms.manageSites')"
              />
              <q-checkbox
                v-model="localRole.can_list_deployments"
                :label="$t('admin.roles.perms.listDeployments')"
              />
              <q-checkbox
                v-model="localRole.can_manage_deployments"
                :label="$t('admin.roles.perms.manageDeployments')"
              />
            </div>
          </q-card-section>

          <q-card-section class="row">
            <tactical-dropdown
              class="col-6"
              :label="$t('admin.roles.allowedClients')"
              :options="clientOptions"
              v-model="localRole.can_view_clients"
              :hint="$t('admin.roles.allowedClientsHint')"
              outlined
              mapOptions
              multiple
              filterable
            />
          </q-card-section>
          <q-card-section class="row">
            <tactical-dropdown
              class="col-6"
              :label="$t('admin.roles.allowedSites')"
              :options="siteOptions"
              v-model="localRole.can_view_sites"
              :hint="$t('admin.roles.allowedSitesHint')"
              outlined
              mapOptions
              multiple
              filterable
            />
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.automationPolicies") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_automation_policies"
                :label="$t('admin.roles.perms.listPolicies')"
              />
              <q-checkbox
                v-model="localRole.can_manage_automation_policies"
                :label="$t('admin.roles.perms.managePolicies')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.tasks") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_autotasks"
                :label="$t('admin.roles.perms.listTasks')"
              />
              <q-checkbox
                v-model="localRole.can_manage_autotasks"
                :label="$t('admin.roles.perms.manageTasks')"
              />
              <q-checkbox
                v-model="localRole.can_run_autotasks"
                :label="$t('admin.roles.perms.runTasks')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.logs") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_view_auditlogs"
                :label="$t('admin.roles.perms.viewAuditLogs')"
              />
              <q-checkbox
                v-model="localRole.can_view_debuglogs"
                :label="$t('admin.roles.perms.viewDebugLogs')"
              />
              <q-checkbox
                v-model="localRole.can_list_pendingactions"
                :label="$t('admin.roles.perms.listPendingActions')"
              />
              <q-checkbox
                v-model="localRole.can_manage_pendingactions"
                :label="$t('admin.roles.perms.managePendingActions')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.scripts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_scripts"
                :label="$t('admin.roles.perms.listScripts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_scripts"
                :label="$t('admin.roles.perms.manageScripts')"
              />
              <q-checkbox
                v-if="!hosted"
                v-model="localRole.can_run_server_scripts"
                :label="$t('admin.roles.perms.runServerScripts')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.alerts") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_alerts"
                :label="$t('admin.roles.perms.listAlerts')"
              />
              <q-checkbox
                v-model="localRole.can_manage_alerts"
                :label="$t('admin.roles.perms.manageAlerts')"
              />
              <q-checkbox
                v-model="localRole.can_list_alerttemplates"
                :label="$t('admin.roles.perms.listAlertTemplates')"
              />
              <q-checkbox
                v-model="localRole.can_manage_alerttemplates"
                :label="$t('admin.roles.perms.manageAlertTemplates')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.windowsServices") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_manage_winsvcs"
                :label="$t('admin.roles.perms.manageWinSvcs')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.software") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_list_software"
                :label="$t('admin.roles.perms.listSoftware')"
              />
              <q-checkbox
                v-model="localRole.can_manage_software"
                :label="$t('admin.roles.perms.manageSoftware')"
              />
            </div>
          </q-card-section>

          <div class="text-subtitle2">
            {{ $t("admin.roles.sections.windowsUpdates") }}
          </div>
          <q-separator />
          <q-card-section class="row">
            <div class="q-gutter-sm">
              <q-checkbox
                v-model="localRole.can_manage_winupdates"
                :label="$t('admin.roles.perms.manageWinUpdates')"
              />
            </div>
          </q-card-section>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn dense flat :label="$t('common.cancel')" v-close-popup />
          <q-btn
            :loading="loading"
            dense
            flat
            :label="$t('common.save')"
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
