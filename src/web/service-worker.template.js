// The installed app starts from cache: every built file is cached at install (checked against its hash), served from
// cache afterwards, and replaced together when a new version is published. Requests to other origins (the Anthropic API)
// and anything not in the list go to the network as usual. The build fills in the list (vite.config.ts).
const assets = __ASSETS__;
const cacheNamePrefix = "offline-cache-";
const cacheName = `${cacheNamePrefix}__VERSION__`;
// The site may live under a sub-path (GitHub Pages): resolve everything against the worker's own scope.
const baseUrl = new URL(self.registration.scope);
const urls = assets.map((a) => new URL(a.url, baseUrl).href);

self.addEventListener("install", (event) => event.waitUntil(onInstall()));
self.addEventListener("activate", (event) => event.waitUntil(onActivate()));
self.addEventListener("fetch", (event) => event.respondWith(onFetch(event)));

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

async function onActivate() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(cacheNamePrefix) && key !== cacheName).map((key) => caches.delete(key)));
}

async function onFetch(event) {
  // A PR's preview (pr-<n>/ beside the root on GitHub Pages) is another app: leave it to the network.
  const url = event.request.url;
  if (url.startsWith(baseUrl.href) && /^pr-[0-9]+\//.test(url.slice(baseUrl.href.length))) return fetch(event.request);
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
