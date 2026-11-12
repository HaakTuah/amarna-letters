// The scrub bench of the phone-frames lane (#666): the same seasons drawn again and again, so that a change to the map's
// drawing can be set against another on one machine, which a soak's two minutes of play (about half a point of noise) cannot.
//   node src/web/scrub.mjs [--site <dir>] [--desktop] [--season 30] [--steps 10] [--hide <selectors>] [--css <rules>]
// Plays seed 1 to --season at Fast with no throttle, pauses, slows the CPU four times (the phone profile, 390x844; --desktop:
// 1280x800, not slowed), then steps back --steps seasons and on again, tracing each step for 1.5 s. Prints, per season shown,
// the mean of the main thread's busy time and of the browser's own steps (layerize, style, layout, paint, commit) and of script,
// and the tasks over 50 ms. --hide takes layer names (data-layer) or selectors starting with "." whose drawing is taken away
// (display: none), to find what a drawing costs; --css adds rules. Runs differ by 15% or more: repeat a run before reading a small gap.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDist } from "./serve-dist.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const desktop = process.argv.includes("--desktop");
const target = Number(arg("--season", "30"));
const back = Number(arg("--steps", "10"));
const hide = arg("--hide", "");
const css = arg("--css", "");
const site = resolve(arg("--site", fileURLToPath(new URL("./dist/", import.meta.url)))) + "/";

const { server, root } = await serveDist(site, { base: "/amarna-letters/pr-0/" });
const browser = await chromium.launch();
const viewport = desktop ? { width: 1280, height: 800 } : { width: 390, height: 844 };
const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: !desktop, hasTouch: !desktop, serviceWorkers: "block" });
const p = await context.newPage();
const cdp = await context.newCDPSession(p);
await p.goto(root + "play?watch=1");
await p.waitForSelector(".game .timebar", { timeout: 180000 });
await p.click('summary[aria-label="More"]');
await p.selectOption("select:has(option[value='50'])", "50");
await p.click('summary[aria-label="More"]');
await p.click('button[aria-label="Auto-play"]');
const wait = Date.now() + 600000;
while ((await p.evaluate(() => Number(document.querySelector(".slider")?.max ?? -1))) < target) {
  if (Date.now() > wait) throw new Error(`season ${target} not reached in ten minutes`);
  await p.waitForTimeout(300);
}
await p.click('button[aria-label="Pause"]');
await p.waitForTimeout(3000);
if (!desktop) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const rules = hide.split(",").filter((x) => x !== "").map((x) => `${x.startsWith(".") ? x : `[data-layer=${x}]`}{display:none !important}`).join("") + css;
if (rules !== "") await p.addStyleTag({ content: rules });

const events = [];
cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
const labels = [...Array(back).fill("One season back"), ...Array(back).fill("One season on")];
const rows = [];
for (const label of labels) {
  events.length = 0;
  await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
  await p.click(`button[aria-label="${label}"]`);
  await p.waitForTimeout(1500);
  const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.end");
  await done;
  // The page's main thread, as soak.mjs finds it.
  const thread = events.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
  if (thread === undefined) throw new Error("no CrRendererMain thread in the trace");
  const mine = events.filter((e) => e.ph === "X" && e.pid === thread.pid && e.tid === thread.tid);
  const ms = (...names) => mine.filter((e) => names.includes(e.name)).reduce((a, e) => a + e.dur, 0) / 1000;
  const tasks = mine.filter((e) => e.name === "RunTask" && e.dur > 1000);
  rows.push({
    busy: tasks.reduce((a, t) => a + t.dur, 0) / 1000,
    long: tasks.filter((t) => t.dur > 50000).length,
    layerize: ms("Layerize"),
    style: ms("UpdateLayoutTree"),
    layout: ms("Layout"),
    paint: ms("Paint", "PrePaint"),
    commit: ms("Commit"),
    script: ms("FireAnimationFrame", "TimerFire", "HandlePostMessage"),
  });
}
const mean = (k) => (rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
console.log(
  `${desktop ? "desktop" : "phone"}, season ${target}, ${rows.length} steps${hide !== "" ? `, hiding ${hide}` : ""}${css !== "" ? `, css ${css}` : ""}: per season shown, busy ${mean("busy")} ms, ` +
    `tasks over 50 ms ${rows.reduce((a, r) => a + r.long, 0)}, layerize ${mean("layerize")}, style ${mean("style")}, layout ${mean("layout")}, paint ${mean("paint")}, commit ${mean("commit")}, script ${mean("script")}`,
);
await browser.close();
server.close();
