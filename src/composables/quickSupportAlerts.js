// Quick Support: sound + browser notification for NEW help requests.
// Shared by the top-bar button and the queue page. De-duplicated across tabs through
// localStorage, so a tech with three RMM tabs open hears one chime, not three.

const NOTIFIED_KEY = "qs_notified_v1";
const SOUND_KEY = "qs_sound";
const NOTIFY_KEY = "qs_notify";

export function soundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== "off";
}
export function setSoundEnabled(on) {
  localStorage.setItem(SOUND_KEY, on ? "on" : "off");
}
export function notifyEnabled() {
  return (
    localStorage.getItem(NOTIFY_KEY) !== "off" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}
export function notifyPermission() {
  return "Notification" in window ? Notification.permission : "unsupported";
}
export async function enableNotifications() {
  if (!("Notification" in window)) return "unsupported";
  localStorage.setItem(NOTIFY_KEY, "on");
  if (Notification.permission === "default")
    return await Notification.requestPermission();
  return Notification.permission;
}
export function disableNotifications() {
  localStorage.setItem(NOTIFY_KEY, "off");
}

function requestKey(e) {
  return `${e.id}|${e.help_text || ""}`;
}

function loadNotified() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
  } catch {
    return {};
  }
}

let audioCtx = null;
export function chime() {
  try {
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + i * 0.18);
      o.stop(t + i * 0.18 + 0.4);
    });
  } catch {
    /* audio blocked until the user interacts with the page - harmless */
  }
}

// Call with the queue entries after every poll. Requests already alerted (in any tab, within
// a day) are remembered in localStorage, so a refresh does not re-alert; a request that came in
// while no RMM tab was open DOES alert when the tech next opens the RMM.
export function alertNewRequests(entries, router) {
  const notified = loadNotified();
  const now = Date.now();
  const fresh = [];
  for (const e of entries) {
    if (e.status !== "waiting" || !e.help_text) continue;
    const k = requestKey(e);
    if (!notified[k]) {
      notified[k] = now;
      fresh.push(e);
    }
  }
  // forget entries older than a day
  for (const k of Object.keys(notified))
    if (now - notified[k] > 86400000) delete notified[k];
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));

  if (!fresh.length) return;
  if (soundEnabled()) chime();
  if (notifyEnabled()) {
    for (const e of fresh) {
      const n = new Notification("Quick Support: someone needs help", {
        body: `${e.help_text}\n${e.name}`,
        tag: `qs-${e.id}`,
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        if (router)
          router.push({ name: "QuickSupport", query: { device: e.id } });
        n.close();
      };
    }
  }
}
