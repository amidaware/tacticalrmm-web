<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="min-width: 25vw; max-width: 70vw">
      <q-card-section class="text-h6">{{
        title || $gettext("Confirm action")
      }}</q-card-section>

      <q-card-section>
        {{ $gettext("Please type") }}
        <span class="text-negative text-h5">{{ $gettext("yes") }}</span>
        {{ $gettext("in the box below to confirm") }} {{ actionVerb }}
        {{ $gettext("of") }}
        <span class="text-negative text-h5">{{ hostname }}</span
        >.
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="model"
          autofocus
          :label="$gettext('Type yes to confirm')"
          :rules="[
            (val) =>
              (val || '').toLowerCase() === $gettext('yes').toLowerCase(),
          ]"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$gettext('Cancel')" @click="onDialogCancel" />
        <q-btn
          :color="okColor"
          :label="okLabel || $gettext('Confirm')"
          :disable="
            (model || '').toLowerCase() !== $gettext('yes').toLowerCase()
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
