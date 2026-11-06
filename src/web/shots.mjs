// Pictures of the map for a pull request (item 11c++): a phone (390 pixels, CPU slowed 4x) and a desktop, light and
// dark, at the opening and four seasons in, at the opening view and one step closer. Serves dist/ (after a build).
//   node src/web/shots.mjs <dir>
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { serveDist } from "./serve-dist.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const out = process.argv[2] ?? "shots";
const { server, root } = await serveDist();
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const timings = [];
for (const [name, viewport] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 800 }]])
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: name === "phone" ? 2 : 1, isMobile: name === "phone", hasTouch: name === "phone", colorScheme: scheme });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => console.log(`${name}: page error: ${e.message}`));
    if (name === "phone") (await ctx.newCDPSession(p)).send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.goto(root);
    await p.getByRole("button", { name: "Begin the age" }).click();
    await p.waitForSelector(".game .timebar", { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: join(out, `${name}-${scheme}-opening.png`) });
    // The main thread's long tasks during one zoom step (the redraw, and the markers and names placed again).
    await p.evaluate(() => {
      window.__long = [];
      new PerformanceObserver((l) => window.__long.push(...l.getEntries().map((e) => e.duration))).observe({ type: "longtask" });
    });
    await p.evaluate(() => document.querySelector('[aria-label="Zoom in"]').click());
    await p.waitForTimeout(1500);
    const long = await p.evaluate(() => window.__long);
    timings.push(`${name} ${scheme}: one zoom step, long tasks ${long.length ? long.map((d) => Math.round(d)).join(", ") + " ms" : "none"}`);
    await p.screenshot({ path: join(out, `${name}-${scheme}-opening-closer.png`) });
    for (let i = 0; i < 2; i++) await p.evaluate(() => document.querySelector('[aria-label="Zoom in"]').click());
    await p.waitForTimeout(2000);
    await p.screenshot({ path: join(out, `${name}-${scheme}-opening-close.png`) });
    for (let i = 0; i < 3; i++) await p.evaluate(() => document.querySelector('[aria-label="Zoom out"]').click());
    {
      for (let i = 0; i < 4; i++) {
        const before = await p.$eval(".slider", (s) => Number(s.max));
        await p.click('button[aria-label="Play one season"]');
        await p.waitForFunction((b) => Number(document.querySelector(".slider").max) > b, before, { timeout: 120000 });
      }
      await p.waitForTimeout(1500);
      await p.screenshot({ path: join(out, `${name}-${scheme}-four-seasons.png`) });
      await p.evaluate(() => document.querySelector('[aria-label="Show the whole map"]')?.click());
      await p.waitForTimeout(1500);
      await p.screenshot({ path: join(out, `${name}-${scheme}-whole.png`) });
    }
    await ctx.close();
  }
await browser.close();
server.close();
console.log(timings.join("\n"));
