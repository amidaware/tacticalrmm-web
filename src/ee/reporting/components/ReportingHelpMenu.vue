<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div class="q-px-sm">
    <div class="text-h5">{{ $t("reporting.helpMenu.reportTemplate") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{ $t("reporting.helpMenu.reportTemplates") }}
      </div>
    </div>

    <div class="text-h5">{{ $t("reporting.helpMenu.baseTemplate") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">Test</div>
    </div>

    <div class="text-h5">{{ $t("reporting.helpMenu.dataQuery") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{ $t("reporting.helpMenu.dataQueryDescription") }}
      </div>
      <div class="text-h6">{{ $t("reporting.helpMenu.syntax") }}</div>
      <div class="q-px-sm">
        <div class="text-body1">
          {{ $t("reporting.helpMenu.syntaxDescription") }}
        </div>
      </div>

      <div class="text-body1"></div>

      <div class="text-h6">{{ $t("reporting.helpMenu.structure") }}</div>
      <div class="q-px-sm">
        <div class="text-body1">
          {{ $t("reporting.helpMenu.autocomplete") }}
        </div>

        <dl>
          <dt>* model (*string)</dt>
          <dd>
            {{ $t("reporting.helpMenu.modelDescription") }}
          </dd>
          <dt>* filter (object)</dt>
          <dd></dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  section: "template" | "baseTemplate" | "dataQuery";
}>();
</script>
