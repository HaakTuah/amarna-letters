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
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };

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

/**
 * Waits until the map is still: no glide or slide running, then two frames for the renderer's placement after it. A fixed
 * wait measured a pass still due on a busy machine.
 */
async function still(p) {
  // Twice, a little longer apart than a zoom takes to settle (140 ms, zoom.ts), so slides it starts are waited for too.
  for (let i = 0; i < 2; i++) {
    await p.waitForFunction(() => !document.getAnimations().some((a) => a instanceof CSSTransition && a.playState === "running" && a.effect?.target?.closest(".mapview")), null, { timeout: 15000 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (i === 0) await p.waitForTimeout(200);
  }
}

/**
 * Slow motion: the zoom's glide and the pieces' slides run longer than the renderer would guess from the stylesheet, as
 * they do on a busy phone, where a transition starts only at the next frame drawn. Placement must follow the motion's
 * real end, not a timer. It stays on for the rest of that page (the game in progress and the seat's view after it).
 */
const slowMotion = (p) =>
  p.addStyleTag({ content: ".mapzoom.glide { transition-duration: 1s !important; } .map .unit, .map .traveller { transition-duration: 2s !important; }" });

/**
 * Names give way (item 11c+), the provinces' and the land's: at every zoom step from the whole board to the closest, no name shown may overlap another
 * name or any marker (a city's badge other than its own, a counter, a ship, an envoy or other person, news, a mark).
 * And markers never overlap (item 11c++): no marker shown may touch another, a city's badge its own counters included.
 */
async function namesClear(p, name) {
  await p.evaluate(() => document.querySelector('[aria-label="Show the whole map"], [aria-label="Back to where you were"]')?.click());
  if (await p.$('[aria-label="Back to where you were"]')) await p.evaluate(() => document.querySelector('[aria-label="Back to where you were"]').click());
  await p.evaluate(() => document.querySelector('[aria-label="Show the whole map"]')?.click());
  let first = null;
  for (let step = 0; step < 8; step++) {
    if (step > 0) await p.evaluate(() => document.querySelector('[aria-label="Zoom in"]').click());
    await p.waitForTimeout(300);
    await still(p);
    const bad = await p.evaluate(() => {
      const touch = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      const names = [...document.querySelectorAll(".labels g[data-label]")]
        .map((g) => ({ id: g.dataset.label, t: g.querySelector("text") }))
        .filter((x) => !x.t.classList.contains("off"))
        .map((x) => ({ id: x.id, r: x.t.getBoundingClientRect() }))
        .concat([...document.querySelectorAll(".base text.geo:not(.off)")].map((t) => ({ id: t.textContent, r: t.getBoundingClientRect() })));
      const seen = (e) => getComputedStyle(e).visibility !== "hidden";
      const markers = [];
      for (const e of document.querySelectorAll(".map-upper .unit > .sym, .map-upper .traveller > .sym, .map-upper .person, .map-upper .person-more, .map-upper .news-bg, .map-upper .destroyed > .sym, .map-upper .band-mark > .sym, .map-upper .works-at .wk-bg, .xmarks .xm-bg"))
        if (seen(e)) markers.push({ own: null, group: e, what: `${e.closest("[class]:not(.sym)").getAttribute("class")} at ${e.closest("[data-province], [data-court]")?.getAttribute("data-province") ?? e.closest("[data-court]")?.getAttribute("data-court") ?? "?"}`, r: e.getBoundingClientRect() });
      for (const c of document.querySelectorAll(".cities .city")) {
        // A badge is one marker: its seal and its rings.
        const parts = [...c.querySelectorAll(".seal, .walls, .cap-ring, .tent")].filter(seen).map((e) => e.getBoundingClientRect());
        if (parts.length === 0) continue;
        const r = new DOMRect(Math.min(...parts.map((p) => p.left)), Math.min(...parts.map((p) => p.top)), 0, 0);
        r.width = Math.max(...parts.map((p) => p.right)) - r.left;
        r.height = Math.max(...parts.map((p) => p.bottom)) - r.top;
        markers.push({ own: c.dataset.province, what: `badge of ${c.dataset.province}`, r });
      }
      const out = [];
      names.forEach((a, i) => {
        for (const b of names.slice(i + 1)) if (touch(a.r, b.r)) out.push(`${a.id} over ${b.id}`);
        for (const m of markers) if (m.own !== a.id && m.r.width > 0 && touch(a.r, m.r)) out.push(`${a.id} over ${m.what}`);
      });
      const crowded = [];
      markers.forEach((a, i) => {
        for (const b of markers.slice(i + 1)) if (a.r.width > 0 && b.r.width > 0 && touch(a.r, b.r)) crowded.push(`${a.what} on ${b.what}`);
      });
      const small = document.querySelectorAll(".cities .city.small").length;
      return { zoom: document.querySelector(".mapview").dataset.zoom, shown: names.length, markers: markers.length, small, out: out.slice(0, 5), crowded: crowded.slice(0, 5), many: crowded.length };
    });
    if (bad.out.length > 0) failures.push(`${name}: at zoom ${bad.zoom}, names overlap: ${bad.out.join("; ")}`);
    if (bad.crowded.length > 0) failures.push(`${name}: at zoom ${bad.zoom}, ${bad.many} markers touch: ${bad.crowded.join("; ")}`);
    // Zoomed in, the badges and counters come back: fewer small seals and more markers than on the whole board.
    if (step === 0) first = bad;
    if (step === 7 && !(bad.small < first.small && bad.markers > first.markers))
      failures.push(`${name}: zoomed in, the badges did not come back (${bad.small} small seals and ${bad.markers} markers, against ${first.small} and ${first.markers} on the whole board)`);
    if (step === 0 || step === 7) report.push(`${name}: ${bad.shown} names and ${bad.markers} markers shown at zoom ${bad.zoom}, ${bad.small} cities as small seals`);
  }
}

async function watch(viewport, name) {
  const p = await page(viewport, name);
  await p.goto(root);
  await p.getByRole("button", { name: "Begin the age" }).click();
  await p.waitForSelector(".game .timebar", { timeout: 60000 });
  await shot(p, `${name}-start`);
  await namesClear(p, `${name}, the opening`);
  await slowMotion(p);
  const t0 = Date.now();
  for (let i = 0; i < 4; i++) {
    const before = await seasons(p);
    await p.click('button[aria-label="Play one season"]');
    await p.waitForFunction((b) => Number(document.querySelector(".slider").max) > b, before, { timeout: 60000 });
  }
  report.push(`${name}: 4 script seasons in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await namesClear(p, `${name}, a game in progress, in slow motion`);
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
  // A seat's view too: its news, its ghosts and its believed people drawn (item 11c++).
  await namesClear(p, `${name}, Hatti's view`);
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
