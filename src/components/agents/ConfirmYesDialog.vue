<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="min-width: 25vw; max-width: 70vw">
      <q-card-section class="text-h6">{{
        title || $t("agentMenu.confirmYes.defaultTitle")
      }}</q-card-section>

      <q-card-section>
        <i18n-t keypath="agentMenu.confirmYes.message" tag="span">
          <template #yes>
            <span class="text-negative text-h5">yes</span>
          </template>
          <template #action>{{ actionVerb }}</template>
          <template #hostname>
            <span class="text-negative text-h5">{{ hostname }}</span>
          </template>
        </i18n-t>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="model"
          autofocus
          :label="$t('agentMenu.confirmYes.inputLabel')"
          :rules="[(val) => (val || '').toLowerCase() === 'yes']"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$t('common.cancel')" @click="onDialogCancel" />
        <q-btn
          :color="okColor"
          :label="okLabel || $t('common.confirm')"
          :disable="(model || '').toLowerCase() !== 'yes'"
          @click="onDialogOK()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useDialogPluginComponent } from "quasar";

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
