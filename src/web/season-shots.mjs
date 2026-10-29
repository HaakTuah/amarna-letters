// Pictures of the map through one year (item 19): the whole board in each of the three seasons, a phone (390 pixels, CPU
// slowed 4x) and a desktop, light and dark; and how long the season's redraw takes on the phone. Serves dist/ (after a build).
//   node src/web/season-shots.mjs <dir> [--view Hatti] [--zoom 2] [--play 8] [--only phone-light]
// --play: seasons played first, so the pictures show a game under way (bands, sieges, battles).
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");
const dist = fileURLToPath(new URL("./dist/", import.meta.url));
const out = process.argv[2] ?? "shots";
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const view = arg("--view", null);
const zoom = Number(arg("--zoom", "0"));
const only = arg("--only", null);
const play = Number(arg("--play", "0"));
// --at fx,fy: zoom in with the wheel at that point of the map (fractions of its width and height), in place of the buttons.
const at = arg("--at", null)?.split(",").map(Number) ?? null;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(dist, path.slice(1) || "index.html"));
  if (!file.startsWith(dist)) return void res.writeHead(403).end();
  let body;
  try { body = await readFile(file); } catch { file = join(dist, "index.html"); body = await readFile(file); }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
});
await new Promise((r) => server.listen(0, r));
const root = `http://localhost:${server.address().port}/`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const timings = [];
for (const [name, viewport] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 800 }]])
  for (const scheme of ["light", "dark"]) {
    if (only !== null && only !== `${name}-${scheme}`) continue;
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: name === "phone" ? 2 : 1, isMobile: name === "phone", hasTouch: name === "phone", colorScheme: scheme });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => console.log(`${name}: page error: ${e.message}`));
    if (name === "phone") await (await ctx.newCDPSession(p)).send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.goto(root);
    await p.getByRole("button", { name: "Begin the age" }).click();
    await p.waitForSelector(".game .timebar", { timeout: 120000 });
    for (let k = 0; k < play; k++) {
      const before = await p.$eval(".slider", (s) => Number(s.max));
      await p.click('button[aria-label="Play one season"]');
      await p.waitForFunction((b) => Number(document.querySelector(".slider").max) > b, before, { timeout: 120000 });
    }
    if (view !== null) await p.selectOption(".viewsel", view);
    await p.evaluate(() => document.querySelector('[aria-label="Show the whole map"]')?.click());
    if (at === null) for (let z = 0; z < zoom; z++) await p.evaluate(() => document.querySelector('[aria-label="Zoom in"]').click());
    else {
      await p.waitForTimeout(800);
      const r = await p.$eval(".mapview", (e) => e.getBoundingClientRect().toJSON());
      await p.mouse.move(r.x + r.width * at[0], r.y + r.height * at[1]);
      for (let z = 0; z < zoom; z++) {
        await p.mouse.wheel(0, -240);
        await p.waitForTimeout(250);
      }
    }
    await p.waitForTimeout(1500);
    // The main thread's long tasks, gathered from here on and read after each step.
    await p.evaluate(() => {
      window.__long = [];
      new PerformanceObserver((l) => window.__long.push(...l.getEntries().map((e) => e.duration))).observe({ type: "longtask" });
    });
    for (let season = 0; season < 3; season++) {
      if (season > 0) {
        const before = await p.$eval(".slider", (s) => Number(s.max));
        await p.evaluate(() => (window.__long = []));
        await p.click('button[aria-label="Play one season"]');
        await p.waitForFunction((b) => Number(document.querySelector(".slider").max) > b, before, { timeout: 120000 });
        await p.waitForTimeout(2000);
        const long = await p.evaluate(() => window.__long);
        timings.push(`${name} ${scheme}: season ${season + 1} played and drawn, long tasks ${long.length ? long.map((d) => Math.round(d)).join(", ") + " ms" : "none"}`);
      }
      await p.screenshot({ path: join(out, `${name}-${scheme}-season${season + 1}.png`) });
    }
    // Stepping back a season (the timeline): only the drawing, nothing played.
    await p.evaluate(() => (window.__long = []));
    await p.click('button[aria-label="One season back"]');
    await p.waitForTimeout(1500);
    const long = await p.evaluate(() => window.__long);
    timings.push(`${name} ${scheme}: one season back on the timeline, long tasks ${long.length ? long.map((d) => Math.round(d)).join(", ") + " ms" : "none"}`);
    await ctx.close();
  }
await browser.close();
server.close();
console.log(timings.join("\n"));
