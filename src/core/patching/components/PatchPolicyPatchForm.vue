<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-dialog-plugin" style="width: 90vw; max-width: 600px">
      <q-bar>
        Patch Exclusions
        <q-space />
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <q-tabs v-model="tab" dense>
        <q-tab name="patches_approved" label="Approved Patches" />
        <q-tab name="patches_not_approved" label="Not Approved Patches" />
        <q-tab name="patches_uninstall" label="Uninstall Patches" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="patches_approved">
          <q-card-section>
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(patch, index) in formData.patches_approved"
                  :key="index"
                  dense
                >
                  <q-item-section>{{ getPatch(patch)?.name }}</q-item-section>
                  <q-item-section side>
                    <q-btn
                      dense
                      flat
                      icon="close"
                      @click="removeItem('patches_approved', index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>

        <q-tab-panel name="patches_not_approved">
          <q-card-section>
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(patch, index) in formData.patches_not_approved"
                  :key="index"
                  dense
                >
                  <q-item-section>{{ getPatch(patch)?.name }}</q-item-section>
                  <q-item-section side>
                    <q-btn
                      dense
                      flat
                      icon="close"
                      @click="removeItem('patches_not_approved', index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>

        <q-tab-panel name="patches_uninstall">
          <q-card-section>
            <q-scroll-area style="height: 300px">
              <q-list>
                <q-item
                  v-for="(patch, index) in formData.patches_uninstall"
                  :key="index"
                  dense
                >
                  <q-item-section>{{ getPatch(patch)?.name }}</q-item-section>
                  <q-item-section side>
                    <q-btn
                      dense
                      flat
                      icon="close"
                      @click="removeItem('patches_uninstall', index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </q-card-section>
        </q-tab-panel>
      </q-tab-panels>

      <q-card-actions align="right">
        <q-btn dense flat label="Cancel" v-close-popup />
        <q-btn
          :loading="loading"
          :disable="!changed"
          dense
          flat
          label="Save"
          color="primary"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from "vue";
import { useDialogPluginComponent } from "quasar";
import { usePatchShared } from "../api";
import { usePatchPolicyShared } from "../api";

// types
import { PatchPolicy } from "../types";

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

defineEmits([...useDialogPluginComponent.emits]);

const props = defineProps<{ patchPolicy: PatchPolicy }>();

const { patches } = usePatchShared;
const { editPatchPolicy } = usePatchPolicyShared;

const formData = reactive({
  patches_approved: props.patchPolicy.patches_approved || [],
  patches_not_approved: props.patchPolicy.patches_not_approved || [],
  patches_uninstall: props.patchPolicy.patches_uninstall || [],
});

const changed = ref(false);
const tab = ref("patches_approved");
const loading = ref(false);

watch(formData, () => {
  changed.value = true;
});

function removeItem(
  type: "patches_approved" | "patches_not_approved" | "patches_uninstall",
  index: number,
) {
  formData[type].splice(index, 1);
}

function getPatch(id: number) {
  return patches.value.find((item) => item.id === id);
}

function submit() {
  if (!changed.value) {
    onDialogHide();
  }
  loading.value = true;

  editPatchPolicy(props.patchPolicy.id, formData);

  // TODO: Error Handling
  onDialogOK();
}
</script>
