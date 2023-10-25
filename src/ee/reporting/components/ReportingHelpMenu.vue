<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div class="q-px-sm">
    <div class="text-h5">Report Template</div>

    <div class="q-px-sm">
      <div class="text-body1">Report Templates</div>
    </div>

    <div class="text-h5">Base Template</div>

    <div class="q-px-sm">
      <div class="text-body1">Test</div>
    </div>

    <div class="text-h5">Data Query</div>

    <div class="q-px-sm">
      <div class="text-body1">
        Data Queries are used to save common database queries to use them in
        templates. Behind the scenes, we are just creating a Django queryset.
        The only difference is these querysets are restricted to only retrieve
        data versus modifying data.
      </div>
      <div class="text-h6">Syntax</div>
      <div class="q-px-sm">
        <div class="text-body1">
          When you create Data Queries in the Data Query Editor you use JSON.
          You can also create Data Queries directly in the template variables
          which uses yaml syntax.
        </div>
      </div>

      <div class="text-body1"></div>

      <div class="text-h6">Structure</div>
      <div class="q-px-sm">
        <div class="text-body1">
          Ctrl+Space in the query editor to auto-complete values
        </div>

        <dl>
          <dt>* model (*string)</dt>
          <dd>
            This is the only required field. This specifies the table to query.
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
