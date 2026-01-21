<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-card-section class="row">
        <div class="col-3">Nouveau mot de passe:</div>
        <div class="col-9">
          <q-input
            outlined
            dense
            v-model="pass"
            :type="isPwd ? 'password' : 'text'"
            :rules="[(val) => !!val || '*Required']"
          >
            <template v-slot:append>
              <q-icon
                :name="isPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="isPwd = !isPwd"
              />
            </template>
          </q-input>
        </div>
        <div class="col-3">Confirmer le mot de passe:</div>
        <div class="col-9">
          <q-input
            outlined
            dense
            v-model="pass2"
            :type="isPwd ? 'password' : 'text'"
            :rules="[(val) => val === pass || 'Passwords do not match']"
          >
            <template v-slot:append>
              <q-icon
                :name="isPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="isPwd = !isPwd"
              />
            </template>
          </q-input>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          color="primary"
          label="Reset"
          @click="onOKClick"
          :disable="!pass || pass !== pass2"
        />
        <q-btn color="negative" label="Cancel" @click="onDialogCancel" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useDialogPluginComponent } from "quasar";
import { resetPass } from "@/api/accounts";
import { notifySuccess } from "@/utils/notify";

const pass = ref("");
const pass2 = ref("");
const isPwd = ref(true);

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

async function onOKClick() {
  const ret = await resetPass(pass.value);
  notifySuccess(ret);
  onDialogOK();
}
</script>
