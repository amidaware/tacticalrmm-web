// Register the (network-only) service worker so Android/Chrome offers "Install app" and the
// installed app captures links to this origin - erp.blueuc.com's "Chat with me" links open
// in the app instead of a browser tab.
export default () => {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/pi-sw.js", { scope: "/" }).catch(() => {});
  }
};
