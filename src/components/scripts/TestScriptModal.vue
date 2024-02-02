<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="min-width: 65vw">
      <q-bar>
        Script Test
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section style="height: 70vh" class="scroll">
        <div>
          Run Time:
          <code>{{ ret.execution_time }} seconds</code>
          <br />Return Code:
          <code>{{ ret.retcode }}</code>
          <br />
        </div>
        <br />
        <div v-if="ret.stdout">
          Standard Output
          <q-separator />
          <pre>{{ ret.stdout }}</pre>
        </div>
        <div v-if="ret.stderr">
          Standard Error
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
import { testScript } from "@/api/scripts";
import { useDialogPluginComponent } from "quasar";

export default {
  name: "TestScriptModal",
  emits: [...useDialogPluginComponent.emits],
  props: {
    script: !Object,
    agent: !String,
  },
  setup(props) {
    // setup quasar dialog plugin
    const { dialogRef, onDialogHide } = useDialogPluginComponent();

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
        ret.value = await testScript(props.agent, data);
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

      // quasar dialog plugin
      dialogRef,
      onDialogHide,
    };
  },
};
</script>
