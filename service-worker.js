// The installed app starts from cache: every built file is cached at install (checked against its hash), served from
// cache afterwards, and replaced together when a new version is published. Requests to other origins (the Anthropic API)
// and anything not in the list go to the network as usual. The build fills in the list (vite.config.ts). A new version takes
// over when the page asks (src/ui/update.ts).
const assets = [{"url":"assets/fine-geo-DPkrZT8I.js","hash":"sha256-QQmnwinN0rGXN1itwPpJCCcZV3rCa3xuDRUmHdGST0w="},{"url":"assets/index-c2DWru6T.css","hash":"sha256-ACn+wL1Mypmk9WMpwJy+maeJgzPvY5wEpX5NLj/F0h0="},{"url":"assets/index-xAciTens.js","hash":"sha256-ssEkj14EE8n0dqkc+Mn9H/rPYejUIuFKc6td2E4Mwqk="},{"url":"assets/node.browser-CBprXF6C.js","hash":"sha256-bMY1KEBfg6G+FM7mLJSVG9JyslZJIMzJek80zY6E/B8="},{"url":"assets/node.browser-q9lQolUX.js","hash":"sha256-/MIoZ5nevLmUwRoWhwYE9DWjNetF6ynH5U4sfGY1fbQ="},{"url":"assets/relief-9R4bI593.jpg","hash":"sha256-wImEeU3/9jgeQ4MqXNB+L2rgDr0LsH7dDz1IOGZDsrQ="},{"url":"assets/snow-DWkiKA2A.png","hash":"sha256-9gqOMQmUK+6tAu3v0PdAPspAY09/M5P07/vSjNfvtjI="},{"url":"assets/worker-CdrlqFx5.js","hash":"sha256-rf41viG2wjnmZmUPJMBQ4gDBr5dLzmjjBjoTsv/DL/M="},{"url":"icon-192.png","hash":"sha256-peOLY5mpOacJ0QOeBLqOSTm8JzC7wZ+Y44SjiwSPw2o="},{"url":"icon-512.png","hash":"sha256-cmkPRxrtPOiFKSkdVbJ0mrzpd8CflpY29H9Qu57pdOs="},{"url":"icon-maskable-512.png","hash":"sha256-UUP3E70PM9Mos4wwpkUqn1E1AV8e0epINC4P3Gyq6aM="},{"url":"icon.svg","hash":"sha256-r81pW5FaLkH7rCRVz/07A9iT2GA5DhlY/uM6RIgymrk="},{"url":"index.html","hash":"sha256-rIVHPjF2EBRut8ckPNA70yhsMiVWdLf5c+kPnbwfkY8="},{"url":"manifest.webmanifest","hash":"sha256-/1+sLyVvYgeLLcskUWrLN1AcuTbnRsFVLh3hU+AA5+0="}];
const cacheNamePrefix = "offline-cache-";
const cacheName = `${cacheNamePrefix}7e99f9f013f68fb4`;
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

async function onActivate() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(cacheNamePrefix) && key !== cacheName).map((key) => caches.delete(key)));
  await self.clients.claim();
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
