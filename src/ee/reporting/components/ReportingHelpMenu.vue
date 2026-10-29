<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <div class="q-px-sm">
    <div class="text-h5">{{ $gettext("Report Template") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{ $gettext("Report Templates") }}
      </div>
    </div>

    <div class="text-h5">{{ $gettext("Base Template") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{ $pgettext("Report editor help", "Test") }}
      </div>
    </div>

    <div class="text-h5">{{ $gettext("Data Query") }}</div>

    <div class="q-px-sm">
      <div class="text-body1">
        {{
          $gettext(
            "Data Queries are used to save common database queries to use them in templates. Behind the scenes, we are just creating a Django queryset. The only difference is these querysets are restricted to only retrieve data versus modifying data.",
          )
        }}
      </div>
      <div class="text-h6">{{ $pgettext("Report editor help", "Syntax") }}</div>
      <div class="q-px-sm">
        <div class="text-body1">
          {{
            $gettext(
              "When you create Data Queries in the Data Query Editor you use JSON. You can also create Data Queries directly in the template variables which uses YAML syntax.",
            )
          }}
        </div>
      </div>

      <div class="text-body1"></div>

      <div class="text-h6">{{ $gettext("Structure") }}</div>
      <div class="q-px-sm">
        <div class="text-body1">
          {{
            $gettext("Ctrl+Space in the query editor to auto-complete values")
          }}
        </div>

        <dl>
          <dt>{{ $gettext("* model (*string)") }}</dt>
          <dd>
            {{
              $gettext(
                "This is the only required field. This specifies the table to query.",
              )
            }}
          </dd>
          <dt>{{ $gettext("* filter (object)") }}</dt>
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
