// The web app's smoke test: builds nothing itself; serves dist/ (after `npm run build`), opens it in Chromium at a desktop
// and a phone size, plays script kings for a few seasons and a human seat for one, and fails on any page error.
//   node src/web/smoke.mjs [--shots <dir>]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// Playwright is the machine's own (cloud sessions have it installed globally), not a dependency of the project.
const { chromium } = createRequire(import.meta.url)("playwright");
const dist = fileURLToPath(new URL("./dist/", import.meta.url));
const shotsAt = process.argv.indexOf("--shots");
const shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };

// A static server under a sub-path, as GitHub Pages serves a preview: deep links get the app's page.
const base = "/amarna-letters/pr-0/";
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!path.startsWith(base)) return void res.writeHead(404).end();
  let file = normalize(join(dist, path.slice(base.length) || "index.html"));
  if (!file.startsWith(dist)) return void res.writeHead(403).end();
  let body;
  try {
    body = await readFile(file);
  } catch {
    file = join(dist, "index.html");
    body = await readFile(file);
  }
  if (file.endsWith("index.html")) body = Buffer.from(body.toString().replace('<base href="/" />', `<base href="${base}" />`));
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
});
await new Promise((r) => server.listen(0, r));
const root = `http://localhost:${server.address().port}${base}`;

const browser = await chromium.launch();
const failures = [];
const report = [];

async function page(viewport, name) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  const p = await context.newPage();
  p.on("pageerror", (e) => failures.push(`${name}: page error: ${e.message}`));
  p.on("console", (m) => {
    if (m.type() === "error") failures.push(`${name}: console error: ${m.text()}`);
  });
  return p;
}

async function shot(p, name) {
  if (shots === null) return;
  await mkdir(shots, { recursive: true });
  await p.screenshot({ path: join(shots, `${name}.png`) });
}

/** Seasons shown on the timeline (the slider's maximum). */
const seasons = (p) => p.$eval(".slider", (s) => Number(s.max));

async function watch(viewport, name) {
  const p = await page(viewport, name);
  await p.goto(root);
  await p.getByRole("button", { name: "Begin the age" }).click();
  await p.waitForSelector(".game .timebar", { timeout: 60000 });
  await shot(p, `${name}-start`);
  const t0 = Date.now();
  for (let i = 0; i < 4; i++) {
    const before = await seasons(p);
    await p.click('button[aria-label="Play one season"]');
    await p.waitForFunction((b) => Number(document.querySelector(".slider").max) > b, before, { timeout: 60000 });
  }
  report.push(`${name}: 4 script seasons in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // Every tab opens without an error.
  for (const tab of ["Trail", "People", "Provinces", "Standings", "Events", "Rules", "Season"]) {
    await p.getByRole("button", { name: tab, exact: true }).click();
    await p.waitForTimeout(150);
  }
  await p.getByRole("button", { name: "Provinces", exact: true }).click();
  await p.locator(".prow").first().click();
  await p.getByRole("button", { name: "Season", exact: true }).click();
  // History: one season back, then the replay control.
  await p.click('button[aria-label="One season back"]');
  await p.waitForSelector(".hist");
  await p.getByRole("button", { name: "Standings", exact: true }).click();
  await p.waitForTimeout(300);
  await p.click(".tb.now");
  // Whose eyes: one king's view.
  await p.selectOption(".viewsel", "Hatti");
  await p.getByRole("button", { name: "Inbox", exact: true }).click();
  await p.waitForTimeout(200);
  await shot(p, `${name}-hatti`);
  const m = await p.evaluate(() => {
    const r = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      width: innerWidth,
      height: innerHeight,
      map: r(".mapview"),
      side: r(".side"),
      timebar: r(".timebar"),
      header: r(".ghead"),
    };
  });
  const f = (b) => (b ? `${Math.round(b.width)}x${Math.round(b.height)} at ${Math.round(b.x)},${Math.round(b.y)}` : "missing");
  report.push(`${name} ${m.width}x${m.height}: page scroll width ${m.scrollWidth}; header ${f(m.header)}; map ${f(m.map)}; panel ${f(m.side)}; timebar ${f(m.timebar)}`);
  if (m.scrollWidth > m.width + 1) failures.push(`${name}: the page scrolls sideways (${m.scrollWidth} > ${m.width})`);
  await p.context().close();
}

async function human(viewport, name) {
  const p = await page(viewport, name);
  await p.goto(root);
  await p.selectOption("select >> nth=0", "Egypt");
  await p.getByRole("button", { name: "Begin the age" }).click();
  await p.waitForSelector(".game .timebar", { timeout: 60000 });
  await p.waitForSelector(".orders", { timeout: 60000 });
  await shot(p, `${name}-orders`);
  // A move by tapping the map: one of our units, then a destination.
  const before = await seasons(p);
  await p.getByRole("button", { name: "Seal the orders for this season" }).click();
  // Audiences may come before the season ends: answer each.
  const deadline = Date.now() + 90000;
  while (Number(await seasons(p)) <= before && Date.now() < deadline) {
    const answer = p.getByRole("button", { name: "Answer", exact: true });
    if (await answer.count()) await answer.click();
    await p.waitForTimeout(200);
  }
  if ((await seasons(p)) <= before) failures.push(`${name}: the season did not end after the human seat's orders`);
  else report.push(`${name}: a human seat sealed its orders and the season was played`);
  await p.context().close();
}

try {
  await watch({ width: 1280, height: 800 }, "desktop");
  await watch({ width: 390, height: 844 }, "phone");
  await human({ width: 1280, height: 800 }, "human");
} catch (e) {
  failures.push(`smoke test stopped: ${e.message.split("\n")[0]}`);
} finally {
  await browser.close();
  server.close();
}
for (const line of report) console.log(line);
if (failures.length > 0) {
  for (const f of failures) console.log("FAIL " + f);
  process.exit(1);
}
console.log("smoke test passed");
