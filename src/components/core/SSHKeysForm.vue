<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{ title }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-form @submit.prevent="submitForm">
        <q-card-section>
          <span v-if="!SSHKey">Add a public key for SSH access to agents</span>
        </q-card-section>

        <q-card-section>
          <q-input
            label="Name"
            outlined
            dense
            v-model="localKey.name"
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>

        <q-card-section v-if="!SSHKey">
          <q-input
            label="Public Key"
            outlined
            dense
            type="textarea"
            v-model="localKey.public_key"
            :rules="[(val) => !!val || '*Required']"
            placeholder="ssh-ed25519 AAAAC3... your@email.com"
          />
        </q-card-section>

        <q-card-section v-if="SSHKey">
          <q-input
            label="Comment"
            outlined
            dense
            v-model="localKey.comment"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            flat
            label="Submit"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, computed } from "vue";
import { useDialogPluginComponent } from "quasar";
import { saveSSHKey, editSSHKey } from "@/api/accounts";
import { notifySuccess } from "@/utils/notify";

export default {
  name: "SSHKeysForm",
  emits: [...useDialogPluginComponent.emits],
  props: { SSHKey: Object },
  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

    const key = props.SSHKey
      ? ref(Object.assign({}, props.SSHKey))
      : ref({ name: "", public_key: "" });
    const loading = ref(false);

    const title = computed(() =>
      props.SSHKey ? "Edit SSH Key" : "Add SSH Key"
    );

    async function submitForm() {
      loading.value = true;

      const data = {
        ...key.value,
      };

      try {
        const result = props.SSHKey
          ? await editSSHKey(data.id, data)
          : await saveSSHKey(data);
        onDialogOK();
        notifySuccess(result);
        loading.value = false;
      } catch (e) {
        loading.value = false;
      }
    }

    return {
      localKey: key,
      loading,
      title,
      submitForm,
      dialogRef,
      onDialogHide,
      onDialogOK,
    };
  },
};
</script>
