<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card style="width: 400px">
      <q-bar>
        {{ t("reporting.assetSelect.title") }}
        <q-space />
        <q-btn v-close-popup dense flat icon="close">
          <q-tooltip class="bg-white text-primary">{{
            t("reporting.common.close")
          }}</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section class="q-gutter-sm">
        <q-radio
          dense
          v-model="imageType"
          val="link"
          :label="t('reporting.common.link')"
        />
        <q-radio
          dense
          v-model="imageType"
          val="asset"
          :label="t('reporting.common.reportAsset')"
        />
      </q-card-section>

      <q-card-section v-if="imageType === 'link'">
        <q-input
          v-model="linkText"
          :label="t('reporting.common.text')"
          dense
          outlined
          class="q-pb-sm"
        />
        <q-input
          v-model="linkUrl"
          :label="t('reporting.common.url')"
          dense
          outlined
          class="q-pb-sm"
        />
        <q-input
          v-model="output"
          :label="t('reporting.common.output')"
          readonly
          dense
        />
      </q-card-section>
      <q-card-section
        v-if="imageType === 'asset'"
        style="max-height: 50vh"
        class="scroll"
      >
        <div v-if="tree.length === 0">
          {{ t("reporting.assetSelect.noAssetsFound") }}
        </div>
        <q-tree
          v-else
          ref="qtree"
          :nodes="tree"
          v-model:selected="selected"
          node-key="path"
          label-key="name"
          dense
          default-expand-all
        />
      </q-card-section>
      <q-card-section v-if="imageType === 'asset'">
        <q-input
          v-model="output"
          :label="t('reporting.common.selected')"
          readonly
          dense
          class="q-pb-sm"
        />
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn dense flat :label="t('reporting.common.cancel')" v-close-popup />
        <q-btn
          @click="onDialogOK(output)"
          dense
          flat
          :label="t('reporting.common.select')"
          color="primary"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { type QTree, type QTreeNode, useDialogPluginComponent } from "quasar";
import { fetchAllReportAssets } from "../api/reporting";
import { useI18n } from "vue-i18n";

import { ReportTemplateType } from "../types/reporting";

// props
const props = defineProps<{ templateType: ReportTemplateType }>();

// emits
defineEmits([...useDialogPluginComponent.emits]);

// quasar dialog setup
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();
const { t } = useI18n();

const tree = ref([] as QTreeNode<unknown>[]);

const imageType = ref("link");
const linkText = ref("");
const linkUrl = ref("");
const selected = ref("");
const output = ref("");
const qtree = ref<InstanceType<typeof QTree> | null>(null);

function formatImageLink(url: string, text: string) {
  if (props.templateType === "markdown") {
    return `![${text}](${url})`;
  } else {
    return `<img src="${url}" alt="${text}">`;
  }
}

watch([linkText, linkUrl, selected], ([newText, newLink, newSelected]) => {
  if (imageType.value === "link")
    output.value = formatImageLink(newLink, newText);
  else if (imageType.value === "asset") {
    if (newSelected) {
      const asset: QTreeNode<unknown> = qtree.value?.getNodeByKey(newSelected);
      output.value = formatImageLink(`asset://${asset.id}`, asset.name);
    }
  }
});

watch(imageType, () => {
  output.value = "";
  linkText.value = "";
  linkUrl.value = "";
  selected.value = "";
});

async function getAssets() {
  tree.value = await fetchAllReportAssets();
}

onMounted(getAssets);
</script>
