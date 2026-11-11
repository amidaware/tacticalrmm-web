<template>
  <div>
    <div class="row">
      <div class="text-subtitle2">
        {{
          props.type === "web"
            ? t("settings.urlActions.title")
            : t("settings.urlActions.webhooksTitle")
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
            ? t('settings.urlActions.addUrlAction')
            : t('settings.urlActions.addWebhook')
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
          ? t('settings.urlActions.noUrlActions')
          : t('settings.urlActions.noWebhooks')
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
                <q-item-section>{{ $t("common.edit") }}</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="deleteURLAction(props.row)"
              >
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>{{ $t("common.delete") }}</q-item-section>
              </q-item>

              <q-separator></q-separator>

              <q-item clickable v-close-popup>
                <q-item-section>{{ $t("common.close") }}</q-item-section>
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
import { fetchURLActions, removeURLAction } from "@/api/core";
import { notifySuccess } from "@/utils/notify";
import { truncateText } from "@/utils/format";
import { useI18n } from "vue-i18n";

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
    label: t("common.name"),
    field: "name",
    align: "left",
    sortable: true,
  },
  {
    name: "desc",
    label: t("common.description"),
    field: "desc",
    align: "left",
    sortable: true,
  },
  {
    name: "pattern",
    label: t("settings.urlActions.pattern"),
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
    title: t("settings.urlActions.deleteConfirm", { name: action.name }),
    cancel: true,
    ok: { label: t("common.delete"), color: "negative" },
  }).onOk(async () => {
    loading.value = true;
    try {
      await removeURLAction(action.id);
      await getURLActions();
      notifySuccess(t("settings.urlActions.deleted", { name: action.name }));
    } catch (e) {
      console.error(e);
    }
    loading.value = false;
  });
}
onMounted(getURLActions);
</script>
