<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 50vw; max-width: 50vw">
      <q-card-section>
        <div class="text-h6">
          {{
            t("software.uninstallSoftware.uninstalling", { name: softwareName })
          }}
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>{{ t("software.uninstallSoftware.confirmOrEdit") }}</p>
        <q-input class="q-mb-md" dense v-model="uninstallString" />
        <q-input
          style="max-width: 100px"
          :label="t('software.shared.timeoutSeconds')"
          type="number"
          v-model.number="timeout"
          dense
          :rules="[
            (val) => !!val || t('software.uninstallSoftware.timeoutRequired'),
          ]"
        />
        <q-checkbox
          v-model="run_as_user"
          :label="t('software.uninstallSoftware.runAsUser')"
          class="q-mt-sm"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          color="primary"
          flat
          :label="t('software.shared.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          color="primary"
          :label="t('software.shared.uninstall')"
          @click="onOKClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";

const props = defineProps({
  softwareName: String,
  initialUninstallString: String,
});

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();
const { t } = useI18n();

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
