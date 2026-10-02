// Minimal service worker: required for Android to install the site as an app (WebAPK) and
// to hand links in scope (rmm.blueuc.com/*) to the installed app instead of the browser.
// Deliberately caches NOTHING: every request goes to the network, so the app can never show
// a stale AI session. Offline is not a mode this app has - the AI runs on the server.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* network only */ });
