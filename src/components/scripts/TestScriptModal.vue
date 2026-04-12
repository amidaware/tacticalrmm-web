<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="min-width: 65vw">
      <q-bar>
        {{ t("scripts.testScriptModal.title") }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">{{
            t("scripts.shared.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section style="height: 70vh" class="scroll">
        <div>
          {{ t("scripts.testScriptModal.runTime") }}:
          <code>{{
            t("scripts.testScriptModal.secondsValue", {
              value: ret.execution_time,
            })
          }}</code>
          <br />{{ t("scripts.testScriptModal.returnCode") }}:
          <code>{{ ret.retcode }}</code>
          <br />
        </div>
        <br />
        <div v-if="ret.stdout">
          <script-output-copy-clip
            :label="t('scripts.testScriptModal.standardOutput')"
            :data="ret.stdout"
          />
          <q-separator />
          <pre>{{ ret.stdout }}</pre>
        </div>
        <div v-if="ret.stderr">
          <script-output-copy-clip
            :label="t('scripts.testScriptModal.standardError')"
            :data="ret.stderr"
          />
          <q-separator />
          <pre>{{ ret.stderr }}</pre>
        </div>
        <q-inner-loading :showing="loading" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
// composition imports
import { ref, onMounted } from "vue";
import { testScript, testScriptOnServer } from "@/api/scripts";
import { useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";
import ScriptOutputCopyClip from "@/components/scripts/ScriptOutputCopyClip.vue";

export default {
  name: "TestScriptModal",
  components: {
    ScriptOutputCopyClip,
  },
  emits: [...useDialogPluginComponent.emits],
  props: {
    script: !Object,
    agent: !String,
    ctx: !String,
  },
  setup(props) {
    // setup quasar dialog plugin
    const { dialogRef, onDialogHide } = useDialogPluginComponent();
    const { t } = useI18n();

    // main run script functionality
    const ret = ref({
      execution_time: "",
      retcode: "",
      stdout: "",
      stderr: "",
    });
    const loading = ref(false);

    async function runTestScript() {
      loading.value = true;
      const data = {
        code: props.script.script_body,
        timeout: props.script.default_timeout,
        args: props.script.args,
        shell: props.script.shell,
        run_as_user: props.script.run_as_user,
        env_vars: props.script.env_vars,
      };
      try {
        if (props.ctx === "server") {
          ret.value = await testScriptOnServer(data);
        } else {
          ret.value = await testScript(props.agent, data);
        }
      } catch (e) {
        console.error(e);
      }
      loading.value = false;
    }

    onMounted(runTestScript);

    return {
      // reactive data
      ret,
      loading,

      // methods
      runTestScript,
      t,

      // quasar dialog plugin
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
