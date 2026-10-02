<template>
  <!-- eslint-disable vue/no-mutating-props -- the rule is ONE shared object (see
       AIRuleBlock.vue's script comment): the editor writes into it directly rather than
       copying subtrees around, so the form and the saved JSON can never diverge. -->
  <!-- ONE ACTION in a branch. The verb comes from the vocabulary the server owns, so the editor
       can never offer a verb the interpreter does not know. Parameters are rendered from the
       verb's own declaration - a script body is a reviewed command, a procedure is a picker. -->
  <div class="rule-action">
    <div class="row q-col-gutter-sm items-start">
      <q-select
        class="col-12 col-sm-5"
        dense
        outlined
        options-dense
        emit-value
        map-options
        v-model="step.action"
        :options="actionOptions"
        @update:model-value="onVerb"
      />
      <div class="col">
        <div class="row q-col-gutter-sm">
          <template v-for="p in params" :key="p.name">
            <q-select
              v-if="p.type === 'procedure'"
              class="col-12 col-sm-6"
              dense
              outlined
              clearable
              options-dense
              emit-value
              map-options
              v-model="step.args[p.name]"
              :options="procedureOptions"
              :label="p.name"
            />
            <q-select
              v-else-if="p.type === 'choice'"
              class="col-12 col-sm-6"
              dense
              outlined
              options-dense
              emit-value
              map-options
              v-model="step.args[p.name]"
              :options="(p.choices || []).map((c) => ({ label: c, value: c }))"
              :label="p.name"
            />
            <q-input
              v-else-if="p.type === 'int'"
              class="col-6 col-sm-3"
              dense
              outlined
              type="number"
              v-model.number="step.args[p.name]"
              :label="p.name"
            />
          </template>
        </div>
        <!-- A SCRIPT BODY IS THE ONE THING HERE THAT RUNS VERBATIM. It gets its own full-width
             monospace box rather than being crammed into a text input, because it is the part a
             person must actually read before approving the rule. -->
        <q-input
          v-if="scriptParam"
          class="q-mt-sm"
          dense
          outlined
          autogrow
          type="textarea"
          input-style="font-family:monospace;font-size:12px"
          v-model="step.args[scriptParam.name]"
          :label="`${step.args.name || scriptParam.name} - this exact text runs on the device`"
        />
        <div v-if="spec && spec.plain" class="rule-hint">
          {{ spec.plain }}
          <span v-if="spec.needs_ai" class="text-amber-8">Runs the AI at this step, every time.</span>
        </div>
      </div>
      <q-btn dense flat round size="sm" color="negative" icon="close" @click="$emit('remove')" />
    </div>
  </div>
</template>

<script setup>
/* eslint-disable vue/no-mutating-props -- DELIBERATE, see AIRuleBlock.vue: the action writes into
   the one shared rule object rather than keeping a copy of itself. */
import { computed } from "vue";

const props = defineProps({
  step: { type: Object, required: true },
  vocab: { type: Object, required: true },
  procedures: { type: Array, default: () => [] },
});
defineEmits(["remove"]);

const actionOptions = computed(() =>
  (props.vocab.actions || []).map((a) => ({
    label: a.text.replace(/\{[a-z_]+\}/g, "").replace(/\s+/g, " ").trim() + (a.needs_ai ? "  (AI each time)" : ""),
    value: a.id,
  })),
);
const spec = computed(() => (props.vocab.actions || []).find((a) => a.id === props.step.action) || null);
const params = computed(() => (spec.value ? spec.value.params || [] : []));
const scriptParam = computed(() => params.value.find((p) => p.name === "script") || null);
const procedureOptions = computed(() =>
  (props.procedures || []).map((p) => ({ label: `#${p.id} ${p.title}`, value: p.id })),
);

// Changing the verb invalidates the old arguments - "procedure 412" means nothing to
// "run the script" - so they are cleared rather than left behind to look meaningful.
function onVerb() {
  const fresh = {};
  for (const p of params.value) if (p.default !== undefined) fresh[p.name] = p.default;
  props.step.args = fresh;
}
</script>

<style scoped>
.rule-action {
  padding: 2px 0;
}
.rule-hint {
  font-size: 11px;
  line-height: 1.4;
  color: #b0bec5;
  margin-top: 3px;
}
</style>
