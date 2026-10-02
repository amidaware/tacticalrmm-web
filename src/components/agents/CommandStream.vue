<template>
  <q-card-section class="q-px-xs q-pb-md q-pt-xs" v-if="hasText">
    <script-output-copy-clip label="Live Output" :data="outputText" />
    <q-separator class="q-my-sm" />
  </q-card-section>
  <!-- Same scroll rule as the AI chat windows (PiChat.vue): live output follows the
       bottom only while the reader is AT the bottom (within 1% of the scrolled area), so
       scrolling up to read or copy a line is not undone by the next chunk. -->
  <div class="command-stream" ref="streamContainer" v-if="hasText" @scroll.passive="onScroll">
    <div class="terminal">
      <pre class="mt-0">{{ outputText }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  watchEffect,
  nextTick,
  computed,
} from "vue";
import { useTemplateRef } from "vue";
import { useAgentCmdWSConnection } from "@/websocket/agent";
import ScriptOutputCopyClip from "@/components/scripts/ScriptOutputCopyClip.vue";
import { isFollowingBottom } from "@/utils/scrollFollow";
import { uid } from "quasar";

const props = defineProps({
  agentId: { type: String, required: true },
  cmd: { type: String, required: true },
  shell: { type: String, required: true },
  run_as_user: { type: Boolean, required: true },
  custom_shell: { type: String, required: false },
  timeout: { type: Number, default: 10 },
});

// emits
const emit = defineEmits(["updateOutput", "streamLoaded", "streamClosed"]);

const cmdId = uid();
const { send, data, reset, close, status } = useAgentCmdWSConnection(
  props.agentId,
  cmdId,
);

const outputText = ref("");
const streamContainer = useTemplateRef<HTMLElement>("streamContainer");
let firstChunk = false;

const hasText = computed(() => outputText.value.trim() !== "");

// Follow the output only while the view is within 1% of the bottom of the scrolled area
// (utils/scrollFollow.js - the same rule as the AI chat windows). One long command's output
// is exactly where someone scrolls up to copy an error out of.
let following = true;

function onScroll() {
  following = isFollowingBottom(streamContainer.value);
}

watchEffect(() => {
  if (data.value.length) {
    outputText.value = data.value.map((msg) => msg.output).join("\n");
    emit("updateOutput", outputText.value);

    if (!firstChunk && data.value.length > 0) {
      firstChunk = true;
      emit("streamLoaded");
    }

    nextTick(() => {
      if (streamContainer.value && following) {
        streamContainer.value.scrollTop = streamContainer.value.scrollHeight;
      }
    });
  }
});

watchEffect(() => {
  if (status.value === "CLOSED") emit("streamClosed");
});

onMounted(() => {
  outputText.value = "";
  reset();
  send(
    JSON.stringify({
      shell: props.shell,
      cmd: props.cmd,
      timeout: props.timeout,
      run_as_user: props.run_as_user,
      custom_shell: props.custom_shell,
      stream: true,
      cmd_id: cmdId,
    }),
  );
});

onUnmounted(close);
</script>

<style scoped>
.command-stream {
  font-family: monospace;
  background: #191818;
  color: #fff;
  padding: 0 10px;
  height: 30vh;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.terminal {
  white-space: pre-wrap;
}
</style>
