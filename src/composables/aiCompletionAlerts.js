import { computed, ref, watch } from "vue";

const STORAGE_KEY = "trmm.aiCompletionAlerts.v1";
const DEFAULTS = {
  sound: true,
  desktop: false,
  onlyWhenUnfocused: true,
};

function loadPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULTS, ...saved };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

export function useAICompletionAlerts() {
  const preferences = loadPreferences();
  const soundEnabled = ref(!!preferences.sound);
  const desktopEnabled = ref(!!preferences.desktop);
  const onlyWhenUnfocused = ref(preferences.onlyWhenUnfocused !== false);
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const notificationPermission = ref(
    notificationSupported ? window.Notification.permission : "unsupported",
  );
  // A saved preference must not pretend notifications are active after the
  // operator revokes permission in browser settings.
  if (notificationPermission.value !== "granted") desktopEnabled.value = false;

  let audioContext = null;
  let lastCompletionKey = null;
  let lastApprovalKey = null;
  let lastApprovalSoundAt = 0;

  watch(
    [soundEnabled, desktopEnabled, onlyWhenUnfocused],
    () => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            sound: soundEnabled.value,
            desktop: desktopEnabled.value,
            onlyWhenUnfocused: onlyWhenUnfocused.value,
          }),
        );
      } catch (e) {
        // A locked-down browser may deny localStorage. Alerts still work for this tab.
      }
    },
    { immediate: true },
  );

  const desktopStatus = computed(() => {
    if (!notificationSupported) return "Desktop notifications are not supported by this browser.";
    if (notificationPermission.value === "denied")
      return "Desktop notifications are blocked in this browser's site settings.";
    if (notificationPermission.value === "granted")
      return desktopEnabled.value
        ? "Desktop notifications are enabled."
        : "Permission granted; notifications are currently off.";
    return "The browser will ask for permission when enabled.";
  });

  function getAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  // Call during a click/key action so browsers permit sounds later, when the
  // asynchronous AI response finishes and the page no longer has user activation.
  function primeAudio() {
    if (!soundEnabled.value) return;
    try {
      const ctx = getAudioContext();
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    } catch (e) {
      // Sound is a convenience; it must never interfere with sending a prompt.
    }
  }

  function playToneSequence(notes, { peak = 0.16, release = 0.42 } = {}) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const play = () => {
        const start = ctx.currentTime;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + release);
        gain.connect(ctx.destination);

        notes.forEach(({ frequency, offset, duration, type = "sine" }) => {
          const oscillator = ctx.createOscillator();
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(frequency, start + offset);
          oscillator.connect(gain);
          oscillator.start(start + offset);
          oscillator.stop(start + offset + duration);
        });
      };
      if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
      else play();
    } catch (e) {
      // Never let an unavailable audio device affect the chat session.
    }
  }

  function playDing({ force = false } = {}) {
    if (!force && !soundEnabled.value) return;
    // Short, friendly two-note completion chime (high).
    playToneSequence(
      [
        { frequency: 880, offset: 0, duration: 0.16 },
        { frequency: 1174.66, offset: 0.14, duration: 0.27 },
      ],
      { peak: 0.16, release: 0.42 },
    );
  }

  // Low "bong/dong" when the operator must hit Approve — distinct from the
  // bright completion ding so it cuts through even if the tab is in the background.
  function playApprovalBong({ force = false } = {}) {
    if (!force && !soundEnabled.value) return;
    const now = Date.now();
    // Parallel multi-machine turns can raise several approvals at once; don't
    // machine-gun the speaker — one bong per ~700ms is enough to pull attention.
    if (!force && now - lastApprovalSoundAt < 700) return;
    lastApprovalSoundAt = now;
    playToneSequence(
      [
        // Fundamental + a soft octave for body (triangle = rounder/bassier than sine).
        { frequency: 98, offset: 0, duration: 0.55, type: "triangle" },
        { frequency: 196, offset: 0.02, duration: 0.4, type: "sine" },
        // Second "dong" a fifth up, slightly delayed.
        { frequency: 130.81, offset: 0.28, duration: 0.55, type: "triangle" },
        { frequency: 261.63, offset: 0.3, duration: 0.35, type: "sine" },
      ],
      { peak: 0.22, release: 0.85 },
    );
  }

  async function setDesktopEnabled(value) {
    if (!value) {
      desktopEnabled.value = false;
      return true;
    }
    if (!notificationSupported) {
      desktopEnabled.value = false;
      return false;
    }
    try {
      let permission = window.Notification.permission;
      if (permission === "default") permission = await window.Notification.requestPermission();
      notificationPermission.value = permission;
      desktopEnabled.value = permission === "granted";
      return desktopEnabled.value;
    } catch (e) {
      desktopEnabled.value = false;
      return false;
    }
  }

  function showDesktopNotification({ title, body, key, force = false }) {
    if (!notificationSupported || window.Notification.permission !== "granted") return;
    if (!force && !desktopEnabled.value) return;
    if (
      !force &&
      onlyWhenUnfocused.value &&
      !document.hidden &&
      document.hasFocus()
    ) return;

    try {
      const notification = new window.Notification(title, {
        body,
        tag: `trmm-ai-alert-${key}`,
        renotify: false,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      // Some managed browsers expose Notification but disallow constructing one.
    }
  }

  /**
   * The turn is over - and ONLY when it really is (owner, 2026-09-27).
   *
   * This used to be called from `agent_end`, which is just the end of one model run: the bridge
   * then continues the turn (recovery re-run, stall-continue, the authorizer, a queued prompt), so
   * the technician heard "finished" while the assistant kept working. It is now driven by the
   * bridge's `turn_settled` frame, which is sent only after nothing is left to run.
   *
   * `needsYou` marks a settle that is WAITING for the technician (the assistant asked a question):
   * that is not "finished", so it gets the approval bong and its own wording.
   */
  function finished({ kind, hostname, key, needsYou = false }) {
    if (key && key === lastCompletionKey && !needsYou) return;
    lastCompletionKey = key || `completion-${Date.now()}`;

    const isDecision = kind === "decision";
    if (needsYou) {
      playApprovalBong();
      showDesktopNotification({
        title: isDecision ? "AI Decision needs you" : "Pi Chat needs you",
        body: `The AI asked a question and is waiting for your answer${hostname ? ` (${hostname})` : ""}.`,
        key: lastCompletionKey,
      });
      return;
    }
    const title = isDecision ? "AI Decision finished" : "Pi Chat finished";
    const body = isDecision
      ? "The AI has finished working and is ready for review."
      : `The AI has finished working${hostname ? ` on ${hostname}` : ""}.`;

    playDing();
    showDesktopNotification({ title, body, key: lastCompletionKey });
  }

  function needsApproval({ summary, key, kind, hostname } = {}) {
    if (key && key === lastApprovalKey) return;
    lastApprovalKey = key || `approval-${Date.now()}`;

    const isDecision = kind === "decision";
    const title = isDecision ? "AI needs approval" : "Pi Chat needs approval";
    const snippet = String(summary || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 160);
    const body = snippet
      ? `Approve to continue: ${snippet}`
      : `The AI is waiting for approval${hostname ? ` (${hostname})` : ""}.`;

    playApprovalBong();
    showDesktopNotification({
      title,
      body,
      key: lastApprovalKey,
      force: false,
    });
  }

  function test() {
    playDing({ force: true });
    // Brief gap so both tones are audible as distinct sounds.
    setTimeout(() => playApprovalBong({ force: true }), 500);
    showDesktopNotification({
      title: "AI completion alerts",
      body: "Completion ding + approval bong (and desktop notification) are working.",
      key: `test-${Date.now()}`,
      force: desktopEnabled.value,
    });
  }

  return {
    soundEnabled,
    desktopEnabled,
    onlyWhenUnfocused,
    notificationSupported,
    notificationPermission,
    desktopStatus,
    primeAudio,
    setDesktopEnabled,
    finished,
    needsApproval,
    test,
  };
}
