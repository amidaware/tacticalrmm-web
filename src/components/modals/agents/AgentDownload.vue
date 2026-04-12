<template>
  <q-card style="min-width: 70vw">
    <q-card-section class="row">
      <q-card-actions align="left">
        <div class="text-h6">
          {{ $t("agents.agentDownload.manualInstallationInstructions") }}
        </div>
      </q-card-actions>
      <q-space />
      <q-card-actions align="right">
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-actions>
    </q-card-section>
    <q-card-section>
      <p v-if="info.plat === 'windows'" class="text-subtitle1">
        {{ $t("agents.agentDownload.windowsInstructions") }}
      </p>
      <p v-else-if="info.plat === 'darwin'" class="text-subtitle1">
        {{ $t("agents.agentDownload.macosInstructions") }}
      </p>
      <p>
        <q-field outlined :color="$q.dark.isActive ? 'white' : 'black'">
          <code>{{ info.data.cmd }}</code>
        </q-field>
        <q-btn
          size="md"
          flat
          round
          icon="content_copy"
          :label="$t('agents.agentDownload.copyToClipboard')"
          @click="copyValueToClip(info.data.cmd)"
        >
        </q-btn>
      </p>
      <q-expansion-item
        switch-toggle-side
        header-class="text-primary"
        expand-separator
        :label="$t('agents.agentDownload.viewOptionalArgs')"
      >
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-log debug</code>
          </q-badge>
          <span>{{ $t("agents.agentDownload.verboseInstall") }}</span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-silent</code>
          </q-badge>
          <span>{{ $t("agents.agentDownload.noPopupMessages") }}</span>
        </div>
        <div v-if="info.plat === 'windows'" class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code
              >-local-mesh "C:\\&lt;some folder or
              path&gt;\\meshagent.exe"</code
            >
          </q-badge>
          <span>{{ $t("agents.agentDownload.skipMeshDownload") }}</span>
        </div>
        <div v-if="info.plat === 'windows'" class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code
              >-meshdir "C:\Program Files\Your Company Name\Mesh Agent"</code
            >
          </q-badge>
          <span>{{ $t("agents.agentDownload.specifyMeshPath") }}</span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-nomesh</code>
          </q-badge>
          <span>{{ $t("agents.agentDownload.noMeshInstall") }}</span>
        </div>
        <div v-if="info.plat === 'windows'" class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-cert "C:\\&lt;some folder or path&gt;\\ca.pem"</code>
          </q-badge>
          <span>{{ $t("agents.agentDownload.useDomainCa") }}</span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-desc "Desired custom description on agent"</code>
          </q-badge>
          <span>{{ $t("agents.agentDownload.setAgentDescription") }}</span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-proxy "http://proxyserver:port"</code>
          </q-badge>
          <span>{{ $t("agents.agentDownload.useHttpProxy") }}</span>
        </div>
      </q-expansion-item>
      <br />
      <p class="text-italic">
        {{ $t("agents.agentDownload.authTokenHours", { hours: info.expires }) }}
      </p>
      <q-btn
        v-if="info.plat === 'windows'"
        type="a"
        :href="info.data.url"
        color="primary"
        :label="$t('agents.agentDownload.downloadAgent')"
      ></q-btn>
    </q-card-section>
  </q-card>
</template>

<script>
import mixins from "@/mixins/mixins";
import { notifySuccess } from "@/utils/notify";
import { copyToClipboard } from "quasar";
import { useI18n } from "vue-i18n";

export default {
  name: "AgentDownload",
  mixins: [mixins],
  props: ["info"],
  setup() {
    const { t } = useI18n();

    function copyValueToClip(val) {
      copyToClipboard(val).then(() => {
        notifySuccess(t("agents.wmiDetail.copiedToClipboard"));
      });
    }

    return {
      copyValueToClip,
    };
  },
};
</script>
