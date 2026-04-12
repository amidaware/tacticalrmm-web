<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div class="q-px-sm">
    <div class="text-h5">{{ t("reporting.helpMenu.reportTemplate") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{ t("reporting.helpMenu.reportTemplates") }}
      </div>
    </div>

    <div class="text-h5">{{ t("reporting.helpMenu.baseTemplate") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">{{ t("reporting.helpMenu.test") }}</div>
    </div>

    <div class="text-h5">{{ t("reporting.helpMenu.dataQuery") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{ t("reporting.helpMenu.dataQueryDescription") }}
      </div>
      <div class="text-h6">{{ t("reporting.helpMenu.syntax") }}</div>
      <div class="q-px-sm">
        <div class="text-body1">
          {{ t("reporting.helpMenu.syntaxDescription") }}
        </div>
      </div>

      <div class="text-body1"></div>

      <div class="text-h6">{{ t("reporting.helpMenu.structure") }}</div>
      <div class="q-px-sm">
        <div class="text-body1">
          {{ t("reporting.helpMenu.structureDescription") }}
        </div>

        <dl>
          <dt>{{ t("reporting.helpMenu.modelField") }}</dt>
          <dd>
            {{ t("reporting.helpMenu.modelFieldDescription") }}
          </dd>
          <dt>{{ t("reporting.helpMenu.filterField") }}</dt>
          <dd></dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  section: "template" | "baseTemplate" | "dataQuery";
}>();

const { t } = useI18n();
</script>
