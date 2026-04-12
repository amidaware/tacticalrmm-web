<template>
  <div class="scroll" :style="{ 'max-height': tabHeight - 10 }">
    <div v-for="i in info" :key="i + uid()">
      <div v-for="j in i" :key="j + uid()">
        <div v-for="(v, k) in j" :key="v + uid()">
          <span class="text-overline">{{ k }}:</span>
          <q-badge color="primary" class="q-ml-sm text-caption">{{
            v
          }}</q-badge>
          <q-btn
            v-if="!!v"
            size="sm"
            class="q-ml-xs"
            flat
            round
            icon="content_copy"
            @click="copyValueToClip(v)"
          >
            <q-tooltip>{{ $t("agents.wmiDetail.copyToClipboard") }}</q-tooltip>
          </q-btn>
        </div>
      </div>
      <q-separator v-if="info.length > 1" />
    </div>
  </div>
</template>

<script>
import { copyToClipboard } from "quasar";
import { notifySuccess } from "@/utils/notify";
// composition imports
import { computed } from "vue";
import { useStore } from "vuex";
import { uid } from "quasar";
import { useI18n } from "vue-i18n";

export default {
  name: "WmiDetail",
  props: { info: !Object },
  setup() {
    // setup vuex
    const store = useStore();
    const { t } = useI18n();
    const tabHeight = computed(() => store.state.tabHeight);

    function copyValueToClip(val) {
      copyToClipboard(val).then(() => {
        notifySuccess(t("agents.wmiDetail.copiedToClipboard"));
      });
    }

    return {
      tabHeight,
      uid,
      copyValueToClip,
    };
  },
};
</script>
