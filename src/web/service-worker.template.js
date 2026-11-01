// The installed app starts from cache: every built file is cached at install (checked against its hash), served from
// cache afterwards, and replaced together when a new version is published. Requests to other origins (the Anthropic API)
// and anything not in the list go to the network as usual. The build fills in the list (vite.config.ts). A new version takes
// over when the page asks (src/ui/update.ts).
const assets = __ASSETS__;
const cacheNamePrefix = "offline-cache-";
const cacheName = `${cacheNamePrefix}__VERSION__`;
// The site may live under a sub-path (GitHub Pages): resolve everything against the worker's own scope.
const baseUrl = new URL(self.registration.scope);
const urls = assets.map((a) => new URL(a.url, baseUrl).href);

self.addEventListener("install", (event) => event.waitUntil(onInstall()));
self.addEventListener("activate", (event) => event.waitUntil(onActivate()));
self.addEventListener("fetch", (event) => event.respondWith(onFetch(event)));
// A new version waits until the page asks it to take over: at once on the start screen, after a tap during a game.
self.addEventListener("message", (event) => {
  if (event.data === "take-over") self.skipWaiting();
});

async function onInstall() {
  const requests = assets.map(
    (a) =>
      new Request(new URL(a.url, baseUrl), {
        // HTML pages are rewritten for the site's base path after the build, so their hashes are not checked. Fingerprinted
        // files never change under their name, so the browser's HTTP cache may answer for them; the rest are checked.
        integrity: /\.html$/.test(a.url) ? "" : a.hash,
        cache: /-[A-Za-z0-9_-]{8}\.[a-z]+$/.test(a.url) ? "default" : "no-cache",
      }),
  );
  const cache = await caches.open(cacheName);
  await cache.addAll(requests);
}

// The music's and the sounds' files fetched whole (the sounds, stings and beds) are kept as they are first heard, in a cache
// of their own that outlives versions: each is asked for with its content's hash (src/audio/player.ts), so a new sound is
// a new entry. The music streams in ranges, which the browser's own cache keeps.
const audioCache = "audio-cache-1";

async function onActivate() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(cacheNamePrefix) && key !== cacheName).map((key) => caches.delete(key)));
  await self.clients.claim();
}

async function onFetch(event) {
  // A PR's preview (pr-<n>/ beside the root on GitHub Pages) is another app: leave it to the network.
  const url = event.request.url;
  if (url.startsWith(baseUrl.href) && /^pr-[0-9]+\//.test(url.slice(baseUrl.href.length))) return fetch(event.request);
  if (event.request.method === "GET" && url.startsWith(new URL("audio/", baseUrl).href) && !event.request.headers.has("range")) {
    const cache = await caches.open(audioCache);
    const hit = await cache.match(event.request);
    if (hit) return hit;
    const response = await fetch(event.request);
    if (response.ok && response.status === 200) await cache.put(event.request, response.clone());
    return response;
  }
  let cached = null;
  if (event.request.method === "GET") {
    // Deep links (/play) are the app's own page.
    const navigate = event.request.mode === "navigate" && !urls.some((u) => u === event.request.url);
    const request = navigate ? new URL("index.html", baseUrl).href : event.request;
    const cache = await caches.open(cacheName);
    cached = await cache.match(request);
  }
  return cached || fetch(event.request);
}
