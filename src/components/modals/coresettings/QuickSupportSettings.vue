<template>
  <div>
    <div class="text-subtitle2">Quick Support</div>
    <q-separator />

    <q-card-section class="q-pb-none">
      <div class="text-body2 text-grey-8">
        Customers start a session from
        <a href="https://erp.blueuc.com/support" target="_blank">erp.blueuc.com/support</a>.
        Techs see everyone waiting in the
        <a href="/quick-support" target="_blank">Quick Support queue</a>
        (top bar &rarr; <b>Quick Support</b>). Only members of the MeshCentral user
        group <b>Support Techs</b> can see the queue or connect. Sound and desktop
        notifications are switched on per browser, from the queue page.
      </div>
    </q-card-section>

    <q-card-section>
      <div class="text-weight-medium q-mb-sm">Microsoft Teams</div>
      <q-checkbox
        dense
        :model-value="settings.quick_support_teams_enabled"
        label="Post each new Quick Support request to a Teams channel"
        @update:model-value="set('quick_support_teams_enabled', $event)"
      />
      <q-input
        class="q-mt-md"
        outlined
        dense
        :autogrow="showUrl"
        :type="showUrl ? 'textarea' : 'password'"
        label="Teams webhook URL (Power Automate 'When a Teams webhook request is received')"
        :model-value="settings.quick_support_teams_webhook"
        :rules="[
          (v) => !v || v.startsWith('https://') || 'Must start with https://',
        ]"
        @update:model-value="set('quick_support_teams_webhook', ($event || '').trim())"
      >
        <template #append>
          <q-icon
            :name="showUrl ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="showUrl = !showUrl"
          />
        </template>
      </q-input>
      <div class="row items-center q-gutter-sm">
        <q-btn
          dense
          no-caps
          outline
          color="primary"
          icon="send"
          label="Send test message"
          :loading="testing"
          :disable="!settings.quick_support_teams_webhook"
          @click="test"
        />
        <span class="text-caption text-grey-7">
          Uses the URL above, even before you click Save.
        </span>
      </div>
      <div class="text-caption text-grey-7 q-mt-md">
        Each card shows what the customer typed, the computer name, the Windows
        user, public IP and OS, with <b>Take Control</b> and
        <b>Open Quick Support queue</b> buttons that open the RMM (sign-in
        required). The same request is posted once; the check runs every 15
        seconds.
      </div>
    </q-card-section>
  </div>
</template>

<script>
// Global Settings > Quick Support (core/quick_support.py). Saved with the dialog's Save button.
import { ref } from "vue";
import { useQuasar } from "quasar";
import { testQuickSupportTeams } from "@/api/quickSupport";

export default {
  name: "QuickSupportSettings",
  props: {
    settings: { type: Object, required: true },
  },
  emits: ["update"],
  setup(props, { emit }) {
    const $q = useQuasar();
    const showUrl = ref(false);
    const testing = ref(false);

    function set(key, val) {
      emit("update", { key, val });
    }

    async function test() {
      testing.value = true;
      try {
        await testQuickSupportTeams(props.settings.quick_support_teams_webhook);
        $q.notify({
          type: "positive",
          message: "Test sent - check the Teams channel.",
        });
      } catch (e) {
        $q.notify({
          type: "negative",
          message:
            (e.response && e.response.data && e.response.data.detail) ||
            "The test message could not be sent.",
          timeout: 8000,
        });
      } finally {
        testing.value = false;
      }
    }

    return { showUrl, testing, set, test };
  },
};
</script>
