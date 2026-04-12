<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">
        {{
          props.type === "web"
            ? t("settings.urlActionsTable.urlActions")
            : t("settings.urlActionsTable.webhooks")
        }}
      </div>
      <q-space />
      <q-btn
        size="sm"
        color="grey-5"
        icon="fas fa-plus"
        text-color="black"
        :label="
          props.type === 'web'
            ? t('settings.urlActionsTable.addUrlAction')
            : t('settings.urlActionsTable.addWebhook')
        "
        @click="addURLAction"
      />
    </div>
    <q-separator />
    <q-table
      dense
      :rows="actions"
      :columns="columns"
      :pagination="{ rowsPerPage: 0, sortBy: 'name', descending: true }"
      row-key="id"
      binary-state-sort
      hide-pagination
      virtual-scroll
      :rows-per-page-options="[0]"
      :no-data-label="
        props.type === 'web'
          ? t('settings.urlActionsTable.noUrlActions')
          : t('settings.urlActionsTable.noWebhooks')
      "
      :loading="loading"
    >
      <!-- body slots -->
      <template v-slot:body="props">
        <q-tr
          :props="props"
          class="cursor-pointer"
          @dblclick="editURLAction(props.row)"
        >
          <!-- context menu -->
          <q-menu context-menu>
            <q-list dense style="min-width: 200px">
              <q-item clickable v-close-popup @click="editURLAction(props.row)">
                <q-item-section side>
                  <q-icon name="edit" />
                </q-item-section>
                <q-item-section>{{ t("settings.common.edit") }}</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="deleteURLAction(props.row)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>{{
                  t("settings.common.delete")
                }}</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>{{
                  t("settings.common.close")
                }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- name -->
          <q-td>
            {{ truncateText(props.row.name, 30) }}
          </q-td>
          <!-- desc -->
          <q-td>
            {{ truncateText(props.row.desc, 20) }}
          </q-td>
          <!-- pattern -->
          <q-td>
            {{ truncateText(props.row.pattern, 20) }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
// composition imports
import { ref, onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { fetchURLActions, removeURLAction } from "@/api/core";
import { notifySuccess } from "@/utils/notify";
import { truncateText } from "@/utils/format";

// ui imports
import URLActionsForm from "@/components/modals/coresettings/URLActionsForm.vue";

// types
import { type URLActionType, type URLAction } from "@/types/core/urlactions";

// define props
const props = defineProps<{ type: URLActionType }>();

// setup quasar
const $q = useQuasar();
const { t } = useI18n();

const loading = ref(false);

const actions = ref([] as URLAction[]);

const columns: QTableColumn[] = [
  {
    name: "name",
    label: t("settings.common.name"),
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "desc",
    label: t("settings.urlActionsTable.columns.description"),
    field: "desc",
    align: "left",
    sortable: true,
  },
  {
    name: "pattern",
    label: t("settings.urlActionsTable.columns.urlPattern"),
    field: "pattern",
    align: "left",
    sortable: true,
  },
];

async function getURLActions() {
  $q.loading.show();
  try {
    const result = await fetchURLActions();
    actions.value = result.filter(
      (action) => action.action_type === props.type,
    );
  } catch (e) {
    console.error(e);
  }

  $q.loading.hide();
}

function addURLAction() {
  $q.dialog({
    component: URLActionsForm,
    componentProps: {
      type: props.type,
    },
  }).onOk(getURLActions);
}

function editURLAction(action: URLAction) {
  $q.dialog({
    component: URLActionsForm,
    componentProps: {
      type: props.type,
      action: action,
    },
  }).onOk(getURLActions);
}

function deleteURLAction(action: URLAction) {
  $q.dialog({
    title: t("settings.urlActionsTable.deleteTitle", { name: action.name }),
    cancel: true,
    ok: { label: t("settings.common.delete"), color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await removeURLAction(action.id);
      await getURLActions();
      notifySuccess(
        t("settings.urlActionsTable.notify.deleted", { name: action.name }),
      );
    } catch (e) {
      console.error(e);
    }
    loading.value = false;
  });
}
onMounted(getURLActions);
</script>
