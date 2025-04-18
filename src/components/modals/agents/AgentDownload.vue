<template>
  <q-card style="min-width: 70vw">
    <q-card-section class="row">
      <q-card-actions align="left">
        <div class="text-h6">Manual Installation Instructions</div>
      </q-card-actions>
      <q-space />
      <q-card-actions align="right">
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-actions>
    </q-card-section>
    <q-card-section>
      <p v-if="info.plat === 'windows'" class="text-subtitle1">
        Download the agent then run the following command from an elevated
        command prompt on the device you want to add.
      </p>
      <p v-else-if="info.plat === 'darwin'" class="text-subtitle1">
        Run the following command from a terminal
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
          label="Copy to clipboard"
          @click="copyValueToClip(info.data.cmd)"
        >
        </q-btn>
      </p>
      <q-expansion-item
        switch-toggle-side
        header-class="text-primary"
        expand-separator
        label="View optional command line args"
      >
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-log debug</code>
          </q-badge>
          <span>To enable verbose output during the install</span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-silent</code>
          </q-badge>
          <span>Do not popup any message boxes during install</span>
        </div>
        <div v-if="info.plat === 'windows'" class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code
              >-local-mesh "C:\\&lt;some folder or
              path&gt;\\meshagent.exe"</code
            >
          </q-badge>
          <span> To skip downloading the Mesh Agent during the install.</span>
        </div>
        <div v-if="info.plat === 'windows'" class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code
              >-meshdir "C:\Program Files\Your Company Name\Mesh Agent"</code
            >
          </q-badge>
          <span
            >Specify full path to the directory containing MeshAgent.exe if
            using custom agent branding</span
          >
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-nomesh</code>
          </q-badge>
          <span>Don't install the mesh agent</span>
        </div>
        <div v-if="info.plat === 'windows'" class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-cert "C:\\&lt;some folder or path&gt;\\ca.pem"</code>
          </q-badge>
          <span> To use a domain CA </span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-desc "Desired custom description on agent"</code>
          </q-badge>
          <span> Set agent description field during install </span>
        </div>
        <div class="q-pa-xs q-gutter-xs">
          <q-badge class="text-caption q-mr-xs" color="grey" text-color="black">
            <code>-proxy "http://proxyserver:port"</code>
          </q-badge>
          <span>Use a http proxy</span>
        </div>
      </q-expansion-item>
      <br />
      <p class="text-italic">
        Note: the auth token above will be valid for {{ info.expires }} hours.
      </p>
      <q-btn
        v-if="info.plat === 'windows'"
        type="a"
        :href="info.data.url"
        color="primary"
        label="Download Agent"
      ></q-btn>
    </q-card-section>
  </q-card>
</template>

<script>
import mixins from "@/mixins/mixins";
import { notifySuccess } from "@/utils/notify";
import { copyToClipboard } from "quasar";

export default {
  name: "AgentDownload",
  mixins: [mixins],
  props: ["info"],
  setup() {
    function copyValueToClip(val) {
      copyToClipboard(val).then(() => {
        notifySuccess("Copied to clipboard");
      });
    }

    return {
      copyValueToClip,
    };
  },
};
</script>
