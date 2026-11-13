// The scrub bench of the phone-frames lane (#666): the same seasons drawn again and again, so that a change to the map's
// drawing can be set against another on one machine, which a soak's two minutes of play (about half a point of noise) cannot.
//   node src/web/scrub.mjs [--site <dir>] [--desktop] [--season 30] [--steps 10] [--hide <selectors>] [--css <rules>]
// Plays seed 1 to --season at Fast with no throttle, pauses, slows the CPU four times (the phone profile, 390x844; --desktop:
// 1280x800, not slowed), then steps back --steps seasons and on again, tracing each step for 1.5 s. Prints, per season shown,
// the mean of the main thread's busy time and of the browser's own steps (layerize, style, layout, paint, commit) and of script,
// and the tasks over 50 ms. --hide takes layer names (data-layer) or selectors starting with "." whose drawing is taken away
// (display: none), to find what a drawing costs; --css adds rules. Runs differ by 15% or more: repeat a run before reading a small gap.
// --holes, in place of the timing: proves that what the map leaves out far off the view (map/in-view.ts) never lies on the
// screen, at rest, mid-drag, between wheel steps, mid-glide (the zoom buttons and the pan keys, also with the page busy as a
// slow phone's is) and while the pieces slide after a season is stepped: at each, every element left out is measured as if
// drawn. Prints the checks with one on the screen, and fails (exit 1) if there is one; with --shots <prefix>, a picture at
// rest, after the drags and at the end.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { serveDist } from "./serve-dist.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const flag = (name) => process.argv.indexOf(name);
const arg = (name, fallback) => (flag(name) > 0 ? process.argv[flag(name) + 1] : fallback);
const desktop = flag("--desktop") > 0;
const target = Number(arg("--season", "30"));
const back = Number(arg("--steps", "10"));
const hide = arg("--hide", "");
const css = arg("--css", "");
const holes = flag("--holes") > 0;
const shots = arg("--shots", "");
const site = resolve(arg("--site", `${import.meta.dirname}/dist`)) + "/";

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
if (holes) {
  const found = await checkHoles();
  await browser.close();
  server.close();
  process.exit(found ? 1 : 0);
}
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

/** The --holes checks (see the head of this file). */
async function checkHoles() {
  const check = (label) =>
    p.evaluate((label) => {
      const v = document.querySelector(".mapview").getBoundingClientRect();
      const out = [...document.querySelectorAll("[data-out]")];
      for (const e of out) e.removeAttribute("data-out");
      const bad = out
        .map((e) => [e, e.getBoundingClientRect()])
        .filter(([, r]) => r.width + r.height > 0 && r.right > v.left && r.left < v.right && r.bottom > v.top && r.top < v.bottom)
        .map(([e, r]) => `${e.getAttribute("class") ?? e.tagName} at ${Math.round(r.left)},${Math.round(r.top)}`);
      for (const e of out) e.setAttribute("data-out", "");
      return { label, zoom: document.querySelector(".mapview").dataset.zoom, out: out.length, bad };
    }, label);
  const shot = (name) => (shots !== "" ? p.screenshot({ path: `${shots}-${name}.png` }) : null);
  const results = [await check("at rest")];
  await shot("rest");
  const box = await p.evaluate(() => {
    const r = document.querySelector(".mapview").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    await p.mouse.move(box.x, box.y);
    await p.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await p.mouse.move(box.x + dx * i * box.w * 0.18, box.y + dy * i * box.h * 0.18);
      await p.waitForTimeout(40);
      results.push(await check(`dragging ${dx},${dy}, step ${i}`));
    }
    await p.mouse.up();
    await p.waitForTimeout(500);
    results.push(await check(`dragged ${dx},${dy}`));
  }
  await shot("dragged");
  for (const dy of [300, 300, 300, -300, -300, -300, -300]) {
    await p.mouse.move(box.x + box.w * 0.2, box.y - box.h * 0.1);
    await p.mouse.wheel(0, dy);
    await p.waitForTimeout(60);
    results.push(await check(`wheel ${dy}`));
  }
  // A busy page as a slow phone has it, in the task of the gesture itself: the camera's glide starts late, after the glide's
  // own timer has run.
  const busyNext = (ms) =>
    ms > 0 &&
    p.evaluate((ms) => {
      const block = () => {
        const end = performance.now() + ms;
        while (performance.now() < end);
      };
      for (const kind of ["click", "keydown"]) window.addEventListener(kind, block, { once: true, capture: false });
    }, ms);
  for (const [label, busy] of [["Zoom out", 0], ["Zoom out", 0], ["Zoom in", 0], ["Zoom in", 0], ["Zoom in", 0], ["Zoom out", 200], ["Zoom in", 200]]) {
    await busyNext(busy);
    // On a phone the buttons are tucked away: clicked as a script would.
    await p.locator(`button[aria-label="${label}"]`).first().evaluate((b) => b.click());
    for (const ms of busy > 0 ? [180, 60, 60, 60] : [40, 80, 80]) {
      await p.waitForTimeout(ms);
      results.push(await check(`${label}${busy > 0 ? ", the page busy" : ""}, gliding`));
    }
    await p.waitForTimeout(400);
    results.push(await check(`${label}, done`));
  }
  for (const [key, busy] of [["d", 0], ["d", 0], ["s", 0], ["a", 0], ["w", 0], ["d", 200], ["a", 200]]) {
    await busyNext(busy);
    await p.keyboard.press(key);
    for (const ms of busy > 0 ? [40, 50, 50, 50] : [50, 100]) {
      await p.waitForTimeout(ms);
      results.push(await check(`key ${key}${busy > 0 ? ", the page busy" : ""}, gliding`));
    }
    await p.waitForTimeout(400);
  }
  await shot("end");
  // A season stepped: the pieces slide to their places (mid-slide, and after).
  for (const label of ["One season back", "One season back", "One season on", "One season on"]) {
    await p.click(`button[aria-label="${label}"]`);
    for (const ms of [150, 150, 1200]) {
      await p.waitForTimeout(ms);
      results.push(await check(label));
    }
  }
  const bad = results.filter((r) => r.bad.length > 0);
  console.log(`${desktop ? "desktop" : "phone"}: ${results.length} checks, ${bad.length} with something left out on the screen`);
  for (const r of bad.slice(0, 8)) console.log(`  ${r.label} (zoom ${r.zoom}): ${r.bad.slice(0, 4).join("; ")}`);
  return bad.length > 0;
}
