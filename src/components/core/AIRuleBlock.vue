<template>
  <!-- eslint-disable vue/no-mutating-props -- the rule is ONE shared object (see
       AIRuleBlock.vue's script comment): the editor writes into it directly rather than
       copying subtrees around, so the form and the saved JSON can never diverge. -->
  <!-- ONE IF-BLOCK, recursive on itself (Vue resolves that by the SFC's own filename).

       Recursion is not decoration: the owner's SendPlot rule needs an IF *after* some actions -
       "fix it, then check it is back up: if it is up close the ticket, else hand it to a human".
       An ELSE IF is a sibling of the same IF and cannot express that, so a branch body is a list
       of STEPS where a step may itself be a whole IF.

       The block is mutated in place on purpose: it is a plain object inside the subject being
       edited, so the parent form sees every edit immediately and there is no second copy of the
       rule to keep in step. -->
  <div class="rule-block" :class="{ 'rule-block--nested': depth > 1 }">
    <div class="row q-col-gutter-sm items-start">
      <div class="rule-kw">{{ first ? "IF" : "ELSE IF" }}</div>
      <div class="col">
        <div class="row q-col-gutter-sm">
          <q-select
            class="col-12 col-sm-7"
            dense
            outlined
            options-dense
            emit-value
            map-options
            v-model="block.if.condition"
            :options="conditionOptions"
            @update:model-value="onCondition"
          />
          <template v-for="p in condParams" :key="p.name">
            <q-select
              v-if="p.type === 'procedure'"
              class="col-12 col-sm-5"
              dense
              outlined
              clearable
              options-dense
              emit-value
              map-options
              v-model="block.if.args[p.name]"
              :options="procedureOptions"
              :label="p.name"
            />
            <q-input
              v-else
              class="col-12 col-sm-5"
              dense
              outlined
              :type="p.type === 'int' ? 'number' : 'text'"
              v-model="block.if.args[p.name]"
              :label="p.name"
            />
          </template>
        </div>
        <div v-if="condSpec && condSpec.plain" class="rule-hint">
          {{ condSpec.plain }}
          <span v-if="condSpec.needs_ai" class="text-amber-8">The AI decides this one at run time.</span>
        </div>
      </div>
      <q-btn v-if="removable" dense flat round size="sm" color="negative" icon="close" @click="$emit('remove')" />
    </div>

    <!-- THEN -->
    <div class="rule-branch">
      <div class="rule-kw rule-kw--sm">THEN</div>
      <Steps :steps="block.then" :vocab="vocab" :procedures="procedures" :depth="depth" />
      <div class="q-gutter-xs q-mt-xs">
        <q-btn dense flat no-caps size="sm" color="primary" icon="add" label="action" @click="addAction('then')" />
        <q-btn
          v-if="depth < maxDepth"
          dense
          flat
          no-caps
          size="sm"
          color="primary"
          icon="add"
          label="if (after these)"
          @click="addNested('then')"
        />
      </div>
    </div>

    <!-- ELSE IF -->
    <Block
      v-for="(e, i) in block.elif || []"
      :key="`elif${i}`"
      :block="e"
      :vocab="vocab"
      :procedures="procedures"
      :depth="depth"
      :first="false"
      :removable="true"
      @remove="block.elif.splice(i, 1)"
    />

    <!-- ELSE -->
    <div v-if="block.else" class="rule-branch">
      <div class="row items-center">
        <div class="rule-kw rule-kw--sm">ELSE</div>
        <q-space />
        <q-btn dense flat round size="xs" color="negative" icon="close" @click="block.else = null" />
      </div>
      <Steps :steps="block.else" :vocab="vocab" :procedures="procedures" :depth="depth" />
      <div class="q-gutter-xs q-mt-xs">
        <q-btn dense flat no-caps size="sm" color="primary" icon="add" label="action" @click="addAction('else')" />
      </div>
    </div>

    <div class="q-gutter-xs q-mt-xs">
      <q-btn
        v-if="!block.else"
        dense
        flat
        no-caps
        size="sm"
        color="grey-6"
        icon="add"
        label="else"
        @click="block.else = [{ action: 'hand_to_human', args: {} }]"
      />
      <q-btn dense flat no-caps size="sm" color="grey-6" icon="add" label="else if" @click="addElif" />
    </div>
  </div>
</template>

<script setup>
/* eslint-disable vue/no-mutating-props -- DELIBERATE. A rule block is a plain object owned by the
   subject being edited, and it is handed down the recursion by reference so there is exactly ONE
   copy of the rule. The alternative - every nested level copying itself and emitting the whole
   subtree back up - would mean several partial copies of a permission structure, which is a much
   worse thing to get wrong than a lint rule. The selects below write into that shared object,
   which is what makes the parent form and the saved JSON the same data. */
import { computed } from "vue";
import Steps from "./AIRuleSteps.vue";

const props = defineProps({
  block: { type: Object, required: true },
  vocab: { type: Object, required: true },
  procedures: { type: Array, default: () => [] },
  depth: { type: Number, default: 1 },
  first: { type: Boolean, default: true },
  removable: { type: Boolean, default: false },
});
defineEmits(["remove"]);

const maxDepth = computed(() => props.vocab.max_depth || 4);
const conditionOptions = computed(() =>
  (props.vocab.conditions || []).map((c) => ({ label: c.text.replace(/\{[a-z_]+\}/g, "").replace(/\s+/g, " ").trim(), value: c.id })),
);
const condSpec = computed(() => (props.vocab.conditions || []).find((c) => c.id === props.block.if.condition) || null);
const condParams = computed(() => (condSpec.value ? condSpec.value.params || [] : []));
const procedureOptions = computed(() =>
  (props.procedures || []).map((p) => ({ label: `#${p.id} ${p.title}`, value: p.id })),
);

function onCondition() {
  const fresh = {};
  for (const p of condParams.value) if (p.default !== undefined) fresh[p.name] = p.default;
  props.block.if.args = fresh;
}
function addAction(branch, i) {
  const list = props.block[branch];
  const step = { action: "investigate", args: {} };
  if (i === undefined) list.push(step);
  else list.splice(i + 1, 0, step);
}
function addNested(branch) {
  props.block[branch].push({
    if: { condition: "fix_verified", args: {} },
    then: [{ action: "reply_customer", args: {} }, { action: "close_ticket", args: {} }],
    else: [{ action: "hand_to_human", args: {} }],
  });
}
function addElif() {
  if (!props.block.elif) props.block.elif = [];
  props.block.elif.push({
    if: { condition: "nothing_matched", args: {} },
    then: [{ action: "hand_to_human", args: {} }],
  });
}
</script>

<style scoped>
.rule-block {
  border-left: 2px solid #455a64;
  padding-left: 10px;
  margin: 6px 0;
}
.rule-block--nested {
  border-left-color: #4db6ac;
  background: rgba(77, 182, 172, 0.05);
  border-radius: 0 4px 4px 0;
  padding: 6px 8px 6px 10px;
}
.rule-branch {
  margin-left: 38px;
  padding-top: 2px;
}
.rule-kw {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #80cbc4;
  padding-top: 10px;
  min-width: 52px;
}
.rule-kw--sm {
  font-size: 10px;
  padding-top: 4px;
}
.rule-hint {
  font-size: 11px;
  line-height: 1.4;
  color: #b0bec5;
  margin-top: 3px;
}
</style>
