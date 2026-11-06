// The phone measurements of the conversion plan: a phone (390x844, touch) with its CPU slowed four times, as Chrome's
// developer tools slow it, over a static server. First load (until the start page can begin a game, nothing cached),
// then one season of a Free game (script kings, envoys and narrator). Any static build of the app can be measured, so the
// same script measured the C# build before the switch and the TypeScript build after it.
//   node src/web/measure.mjs [--site <dir>] [--runs 3] [--throttle 4]     (default site: src/web/dist)
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDist } from "./serve-dist.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const site = resolve(arg("--site", fileURLToPath(new URL("./dist/", import.meta.url)))) + "/";
const runs = Number(arg("--runs", "3"));
const throttle = Number(arg("--throttle", "4"));

// As GitHub Pages serves a preview: under a sub-path, deep links get the app's page, no compression.
let bytes = 0;
const { server, root } = await serveDist(site, { base: "/amarna-letters/pr-0/", onBody: (body) => (bytes += body.length) });
const browser = await chromium.launch();

async function once() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const p = await context.newPage();
  const cdp = await context.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  bytes = 0;
  const t0 = Date.now();
  await p.goto(root);
  await p.getByRole("button", { name: "Begin the age" }).waitFor({ timeout: 180000 });
  const load = Date.now() - t0;
  const loaded = bytes;
  await p.getByRole("button", { name: "Begin the age" }).click();
  await p.waitForSelector(".game .timebar", { timeout: 180000 });
  const before = await p.$eval(".slider", (s) => Number(s.max));
  const t1 = Date.now();
  await p.click('button[aria-label="Play one season"]');
  await p.waitForFunction((b) => Number(document.querySelector(".slider").max) > b, before, { timeout: 180000 });
  const season = Date.now() - t1;
  await context.close();
  return { load, season, loaded };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
try {
  const results = [];
  for (let i = 0; i < runs; i++) results.push(await once());
  const s = (ms) => `${(ms / 1000).toFixed(2)} s`;
  console.log(`site ${site}, phone 390x844, CPU slowed ${throttle}x, ${runs} runs (median, then each)`);
  console.log(`first load: ${s(median(results.map((r) => r.load)))} (${results.map((r) => s(r.load)).join(", ")}); ${(median(results.map((r) => r.loaded)) / 1e6).toFixed(2)} MB served`);
  console.log(`one season of a Free game: ${s(median(results.map((r) => r.season)))} (${results.map((r) => s(r.season)).join(", ")})`);
} finally {
  await browser.close();
  server.close();
}
