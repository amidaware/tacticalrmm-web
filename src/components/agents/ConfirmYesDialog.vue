<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="min-width: 25vw; max-width: 70vw">
      <q-card-section class="text-h6">{{
        title || t("agents.confirmYesDialog.confirmAction")
      }}</q-card-section>

      <q-card-section>
        {{ $t("agents.confirmYesDialog.promptPrefix") }}
        <span class="text-negative text-h5">{{
          $t("agents.confirmYesDialog.yesWord")
        }}</span>
        {{ $t("agents.confirmYesDialog.promptMiddle") }} {{ actionVerb }}
        {{ $t("agents.confirmYesDialog.promptSuffix") }}
        <span class="text-negative text-h5">{{ hostname }}</span
        >.
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="model"
          autofocus
          :label="$t('agents.confirmYesDialog.typeYesToConfirm')"
          :rules="[
            (val) =>
              (val || '').toLowerCase() ===
              $t('agents.confirmYesDialog.yesWord').toLowerCase(),
          ]"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          :label="$t('common.buttons.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          :color="okColor"
          :label="okLabel || t('common.buttons.confirm')"
          :disable="
            (model || '').toLowerCase() !==
            $t('agents.confirmYesDialog.yesWord').toLowerCase()
          "
          @click="onDialogOK()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps({
  hostname: { type: String, required: true },
  actionVerb: { type: String, required: true },
  title: { type: String, default: "" },
  okLabel: { type: String, default: "" },
  okColor: { type: String, default: "negative" },
});

defineEmits([...useDialogPluginComponent.emits]);

const model = ref("");

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();
</script>
