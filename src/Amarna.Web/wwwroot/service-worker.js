// In development the app is always fetched from the network: the offline cache is only in the published build
// (service-worker.published.js, which the publish step puts in this file's place).
self.addEventListener("fetch", () => { });
