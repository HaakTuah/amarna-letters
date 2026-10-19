// The installed app starts from cache: every published file is cached at install (checked against the publish
// manifest's hashes), served from cache afterwards, and replaced together when a new version is published.
// Requests to other origins (the Anthropic API) and anything not in the manifest go to the network as usual.
self.importScripts("./service-worker-assets.js");
self.addEventListener("install", event => event.waitUntil(onInstall()));
self.addEventListener("activate", event => event.waitUntil(onActivate()));
self.addEventListener("fetch", event => event.respondWith(onFetch(event)));

const cacheNamePrefix = "offline-cache-";
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [/\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff2?$/, /\.png$/, /\.svg$/, /\.ico$/, /\.blat$/, /\.dat$/, /\.webmanifest$/];
const offlineAssetsExclude = [/^service-worker\.js$/];
// The site may live under a sub-path (GitHub Pages): resolve everything against the worker's own scope.
const baseUrl = new URL(self.registration.scope);
const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);

async function onInstall() {
    const requests = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        // HTML pages are rewritten for the site's base path after publishing, so their hashes are not checked.
        .map(asset => new Request(new URL(asset.url, baseUrl), { integrity: /\.html$/.test(asset.url) ? "" : asset.hash, cache: "no-cache" }));
    const cache = await caches.open(cacheName);
    await cache.addAll(requests);
}

async function onActivate() {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName).map(key => caches.delete(key)));
}

async function onFetch(event) {
    let cached = null;
    if (event.request.method === "GET") {
        // Deep links (/play) are the app's own page.
        const navigate = event.request.mode === "navigate" && !manifestUrlList.some(url => url === event.request.url);
        const request = navigate ? new URL("index.html", baseUrl).href : event.request;
        const cache = await caches.open(cacheName);
        cached = await cache.match(request);
    }
    return cached || fetch(event.request);
}
