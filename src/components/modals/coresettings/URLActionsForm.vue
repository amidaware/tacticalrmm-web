<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    @show="loadEditor"
    @before-hide="cleanupEditors"
  >
    <q-card class="q-dialog-plugin" style="width: 60vw">
      <q-bar>
        {{
          props.action
            ? props.type === "web"
              ? "Edit URL Action"
              : "Edit Web Hook"
            : props.type === "web"
              ? "Add URL Action"
              : "Add Web Hook"
        }}
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip class="bg-white text-primary">Close</q-tooltip>
        </q-btn>
      </q-bar>

      <div style="max-height: 80vh" class="scroll">
        <!-- name -->
        <q-card-section>
          <q-input
            label="Name"
            outlined
            dense
            v-model="localAction.name"
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>

        <!-- description -->
        <q-card-section>
          <q-input
            label="Description"
            outlined
            dense
            type="textarea"
            rows="2"
            v-model="localAction.desc"
          />
        </q-card-section>

        <!-- pattern -->
        <q-card-section>
          <q-input
            label="URL Pattern"
            outlined
            dense
            v-model="localAction.pattern"
            :rules="[(val) => !!val || '*Required']"
          />
        </q-card-section>

        <q-card-section v-if="type === 'rest'">
          <q-select
            v-model="localAction.rest_method"
            label="Method"
            :options="URLActionMethods"
            outlined
            dense
            map-options
            emit-value
          />
        </q-card-section>

        <q-card-section v-show="type === 'rest'">
          <q-toolbar>
            <q-space />
            <q-tabs v-model="tab" dense shrink>
              <q-tab
                name="body"
                label="Request Body"
                :ripple="false"
                :disable="disableBodyTab"
              />
              <q-tab name="headers" label="Request Headers" :ripple="false" />
            </q-tabs>
          </q-toolbar>
          <div ref="editorDiv" :style="{ height: '30vh' }"></div>
        </q-card-section>
      </div>

      <q-card-actions align="right">
        <q-btn
          v-if="type === 'rest'"
          flat
          label="Test"
          color="primary"
          @click="testWebHook"
        />
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Submit" color="primary" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// composition imports
import { ref, computed, reactive, watch } from "vue";
import { useDialogPluginComponent, useQuasar, extend } from "quasar";
import { editURLAction, saveURLAction } from "@/api/core";
import { notifySuccess } from "@/utils/notify";
import { URLAction, URLActionType } from "@/types/core/urlactions";

// ui imports
import TestURLAction from "@/components/modals/coresettings/TestURLAction.vue";

import * as monaco from "monaco-editor";

// define emits
defineEmits([...useDialogPluginComponent.emits]);

// define props
const props = defineProps<{ type: URLActionType; action?: URLAction }>();

// setup quasar
const $q = useQuasar();
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

// static data
const URLActionMethods = [
  { value: "get", label: "GET" },
  { value: "post", label: "POST" },
  { value: "put", label: "PUT" },
  { value: "delete", label: "DELETE" },
  { value: "patch", label: "PATCH" },
];

const localAction: URLAction = props.action
  ? reactive(extend({}, props.action))
  : reactive({
      name: "",
      desc: "",
      pattern: "",
      action_type: props.type,
      rest_body: "{\n    \n}",
      rest_method: "post",
      rest_headers: `{\n  "Content-Type": "application/json"\n}`,
    } as URLAction);

const disableBodyTab = computed(() =>
  ["get", "delete"].includes(localAction.rest_method),
);
const tab = ref(disableBodyTab.value ? "headers" : "body");

watch(
  () => localAction.rest_method,
  () => {
    disableBodyTab.value ? (tab.value = "headers") : undefined;
  },
);

async function submit() {
  $q.loading.show();

  try {
    props.action
      ? await editURLAction(localAction.id, localAction)
      : await saveURLAction(localAction);
    onDialogOK();
    notifySuccess("Url Action was edited!");
  } catch (e) {}

  $q.loading.hide();
}

const editorDiv = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;
var modelBodyUri = monaco.Uri.parse("model://body"); // a made up unique URI for our model
var modelHeadersUri = monaco.Uri.parse("model://headers"); // a made up unique URI for our model
var modelBody = monaco.editor.createModel(
  localAction.rest_body,
  "json",
  modelBodyUri,
);

var modelHeaders = monaco.editor.createModel(
  localAction.rest_headers,
  "json",
  modelHeadersUri,
);

function testWebHook() {
  $q.dialog({
    component: TestURLAction,
    componentProps: {
      urlAction: localAction,
    },
  });
}

// watch tab change and change model
watch(tab, (newValue, oldValue) => {
  if (oldValue === "body") {
    localAction.rest_body = editor.getValue();
  } else if (oldValue === "headers") {
    localAction.rest_headers = editor.getValue();
  }

  if (newValue === "body") {
    editor.setModel(modelBody);
    editor.setValue(localAction.rest_body);
  } else if (newValue === "headers") {
    editor.setModel(modelHeaders);
    editor.setValue(localAction.rest_headers);
  }
});

function loadEditor() {
  const theme = $q.dark.isActive ? "vs-dark" : "vs-light";

  if (!editorDiv.value) return;

  editor = monaco.editor.create(editorDiv.value, {
    model: tab.value === "body" ? modelBody : modelHeaders,
    theme: theme,
    automaticLayout: true,
    minimap: { enabled: false },
    quickSuggestions: false,
  });

  editor.onDidChangeModelContent(() => {
    if (tab.value === "body") {
      localAction.rest_body = editor.getValue();
    } else if (tab.value === "headers") {
      localAction.rest_headers = editor.getValue();
    }
  });
}

function cleanupEditors() {
  modelBody.dispose();
  modelHeaders.dispose();
  editor.dispose();
}
</script>
