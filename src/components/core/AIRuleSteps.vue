<template>
  <!-- eslint-disable vue/no-mutating-props -- the rule is ONE shared object (see
       AIRuleBlock.vue's script comment): the editor writes into it directly rather than
       copying subtrees around, so the form and the saved JSON can never diverge. -->
  <!-- A BRANCH BODY: an ordered list of steps, where a step is either an action or a whole
       nested IF. Rendered for both THEN and ELSE.

       Editing is in place - the steps array belongs to the rule being edited - so there is
       exactly one copy of the rule and no synchronisation to get wrong. -->
  <div class="rule-steps">
    <template v-for="(s, i) in steps" :key="i">
      <Block
        v-if="s.if"
        :block="s"
        :vocab="vocab"
        :procedures="procedures"
        :depth="depth + 1"
        :first="true"
        :removable="true"
        @remove="steps.splice(i, 1)"
      />
      <Action
        v-else
        :step="s"
        :vocab="vocab"
        :procedures="procedures"
        @remove="steps.splice(i, 1)"
      />
    </template>
    <div v-if="!steps || !steps.length" class="rule-empty">nothing - this branch does nothing</div>
  </div>
</template>

<script setup>
import Action from "./AIRuleAction.vue";
import Block from "./AIRuleBlock.vue";

defineProps({
  steps: { type: Array, required: true },
  vocab: { type: Object, required: true },
  procedures: { type: Array, default: () => [] },
  depth: { type: Number, default: 1 },
});
</script>

<style scoped>
.rule-empty {
  font-size: 11px;
  color: #78909c;
  font-style: italic;
  padding: 2px 0;
}
</style>
