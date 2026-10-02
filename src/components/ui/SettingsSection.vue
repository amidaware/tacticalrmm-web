<!--
  SettingsSection — the section heading used on the settings panels.

  Purely presentational. It renders one consistent block:

      Title  (i)                                   [ optional action slot ]
      ─────────────────────────────────────────────────────────────────────

  i.e. the same "text-subtitle2 + q-separator" convention the other Global
  Settings tabs use (see EditCoreSettings.vue), plus an optional InfoTip and an
  optional right-aligned control (a master toggle, an "Add …" button, etc).

  It deliberately owns only the HEADER, not the section body, so it can be
  dropped into an existing page without re-nesting any of the controls.

    <settings-section title="Providers" tip="Where the API keys live.">
      <template #action><q-btn … /></template>
    </settings-section>
-->
<template>
  <div>
    <div class="row items-center no-wrap" :class="first ? '' : 'q-mt-lg'">
      <div class="text-subtitle2 ellipsis">{{ title }}</div>
      <info-tip v-if="tip || $slots.tip" :text="tip">
        <slot v-if="$slots.tip" name="tip" />
      </info-tip>
      <q-space />
      <div class="row items-center no-wrap q-gutter-sm">
        <slot name="action" />
      </div>
    </div>
    <q-separator :class="dense ? 'q-mb-xs' : 'q-mb-sm'" />
  </div>
</template>

<script>
import InfoTip from "@/components/ui/InfoTip.vue";

export default {
  name: "settings-section",
  components: { InfoTip },
  props: {
    title: { type: String, required: true },
    // Hover text explaining what the whole section governs.
    tip: { type: String, default: "" },
    // Suppresses the top margin for the first section on a panel.
    first: { type: Boolean, default: false },
    dense: { type: Boolean, default: false },
  },
};
</script>
