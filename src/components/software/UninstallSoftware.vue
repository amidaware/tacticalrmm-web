<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 50vw; max-width: 50vw">
      <q-card-section>
        <div class="text-h6">Uninstalling {{ softwareName }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>Confirm or edit the uninstall command:</p>
        <q-input class="q-mb-md" dense v-model="uninstallString" />
        <q-input
          style="max-width: 100px"
          label="Timeout (seconds)"
          type="number"
          v-model.number="timeout"
          dense
          :rules="[(val) => !!val || 'Timeout is required']"
        />
        <q-checkbox v-model="run_as_user" label="Run as user" class="q-mt-sm" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn color="primary" flat label="Cancel" @click="onDialogCancel" />
        <q-btn color="primary" label="Uninstall" @click="onOKClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useDialogPluginComponent } from "quasar";

const props = defineProps({
  softwareName: String,
  initialUninstallString: String,
});

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

const uninstallString = ref(props.initialUninstallString);
const run_as_user = ref(false);
const timeout = ref(1800);

function onOKClick() {
  onDialogOK({
    uninstallString: uninstallString.value,
    run_as_user: run_as_user.value,
    timeout: timeout.value,
  });
}
</script>
