<!--
  InfoTip — the small blue "?" affordance used beside a setting label.

  Purely presentational: it renders an information icon that reveals explanatory
  text on hover (and on tap, since Quasar tooltips fire on long-press). Use it to
  explain what a setting DOES and what turning it on/off actually affects.

  Matches the pattern already used in EditCoreSettings.vue (ion-information-circle-outline
  + q-tooltip.text-caption), with the icon coloured so it reads as an affordance
  rather than as decoration.

    <info-tip text="What this control does." />
    <info-tip>Rich <strong>markup</strong> instead of plain text.</info-tip>
-->
<template>
  <q-icon
    :name="icon"
    :size="size"
    :color="color"
    class="cursor-pointer q-ml-xs"
    tabindex="0"
  >
    <q-tooltip class="text-caption" :max-width="maxWidth" v-bind="anchorProps">
      <slot>{{ text }}</slot>
    </q-tooltip>
  </q-icon>
</template>

<script>
export default {
  name: "info-tip",
  props: {
    // Tooltip body. Ignored when the default slot is used.
    text: { type: String, default: "" },
    icon: { type: String, default: "ion-information-circle-outline" },
    size: { type: String, default: "xs" },
    color: { type: String, default: "primary" },
    // Wide enough for a sentence or two without becoming a wall of text.
    maxWidth: { type: String, default: "420px" },
  },
  setup() {
    // Keep long tips from covering the control they describe.
    return {
      anchorProps: {
        anchor: "top middle",
        self: "bottom middle",
        offset: [0, 6],
      },
    };
  },
};
</script>
