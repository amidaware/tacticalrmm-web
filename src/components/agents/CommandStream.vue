<template>
  <q-card-section class="q-px-xs q-pb-md q-pt-xs" v-if="hasText">
    <script-output-copy-clip label="Live Output" :data="outputText" />
    <q-separator class="q-my-sm" />
  </q-card-section>
  <div class="command-stream" ref="streamContainer">
    <div class="terminal">
      <pre class="mt-0">{{ outputText }}</pre>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watchEffect, nextTick, computed } from "vue";
import { useAgentCmdWSConnection } from "@/websocket/agent";
import ScriptOutputCopyClip from "@/components/scripts/ScriptOutputCopyClip.vue";

export default {
  name: "CommandStream",
  components: { ScriptOutputCopyClip },
  props: {
    agentId: { type: String, required: true },
    cmd: { type: String, required: true },
    shell: { type: String, required: true },
    timeout: { type: Number, default: 10 },
  },
  emits: ["updateOutput", "streamLoaded", "streamClosed"],
  setup(props, { emit }) {
    const { send, data, reset, close, status } = useAgentCmdWSConnection(props.agentId);
    const outputText = ref("");
    const streamContainer = ref(null);
    let firstChunk = false;

    const hasText = computed(() => outputText.value.trim() !== "");

    watchEffect(() => {
      if (data.value.length) {
        outputText.value = data.value.join("\n");
        emit("updateOutput", outputText.value);

        if (!firstChunk) {
          firstChunk = true;
          emit("streamLoaded");
        }

        nextTick(() => {
          if (streamContainer.value) {
            streamContainer.value.scrollTop = streamContainer.value.scrollHeight;
          }
        });
      }
    });

    watchEffect(() => {
      if (status.value === "CLOSED") {
        emit("streamClosed");
      }
    });

    onMounted(() => {
      outputText.value = "";
      reset();
      send(JSON.stringify({
        shell: props.shell,
        cmd: props.cmd,
        timeout: props.timeout,
        run_as_user: false,
        custom_shell: "",
        stream: true,
      }));
    });
    onUnmounted(close);

    return { outputText, hasText, streamContainer };
  },
};
</script>

<style scoped>
.command-stream {
  font-family: monospace;
  background: #191818;
  color: #fff;
  padding: 0 10px;
  height: 240px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.terminal { white-space: pre-wrap; }
</style>

