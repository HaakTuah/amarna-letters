// The soak test of item 17a: watches a whole Free game (script kings) at the top speed in the built app, as Haakon did when
// the page went white, and records as it goes the season reached, the page's and the worker's heap, the frame times and
// the time each season took. Any page error, console error or blank page is reported with the season it came at.
//   node src/web/soak.mjs [--phone] [--throttle 4] [--heap 512] [--seed 1] [--minutes 30] [--log <file>] [--site <dir>] [--profile]
// With --profile, the page and the worker are sampled for 30 s from about season 15, and the hottest functions of each listed.
// Serves dist/ (after `npm run build`) as smoke.mjs does. Prints one line every few seconds, and a summary at the end.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { appendFile, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const phone = process.argv.includes("--phone");
const throttle = Number(arg("--throttle", phone ? "4" : "1"));
const seed = Number(arg("--seed", "1"));
const minutes = Number(arg("--minutes", "30"));
const logFile = arg("--log", null);
// A phone's memory: V8's old space capped (MB) for the page and the worker alike, as a phone's browser caps them.
const heapMb = Number(arg("--heap", "0"));
const profile = process.argv.includes("--profile");
const site = resolve(arg("--site", fileURLToPath(new URL("./dist/", import.meta.url)))) + "/";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".webmanifest": "application/manifest+json" };

const base = "/amarna-letters/pr-0/";
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!path.startsWith(base)) return void res.writeHead(404).end();
  let file = normalize(join(site, path.slice(base.length) || "index.html"));
  if (!file.startsWith(site)) return void res.writeHead(403).end();
  let body;
  try {
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    body = await readFile(file);
  } catch {
    file = join(site, "index.html");
    body = await readFile(file);
  }
  if (file.endsWith("index.html")) body = Buffer.from(body.toString().replace('<base href="/" />', `<base href="${base}" />`));
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
});
await new Promise((r) => server.listen(0, r));
const root = `http://localhost:${server.address().port}${base}`;

const out = async (line) => {
  console.log(line);
  if (logFile !== null) await appendFile(logFile, line + "\n");
};
if (logFile !== null) await writeFile(logFile, "");

// Precise heap numbers for the page and the worker (performance.memory).
const browser = await chromium.launch({ args: ["--enable-precise-memory-info", ...(heapMb > 0 ? [`--js-flags=--max-old-space-size=${heapMb}`] : [])] });
const viewport = phone ? { width: 390, height: 844 } : { width: 1280, height: 800 };
const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, serviceWorkers: "block" });
const p = await context.newPage();
const problems = [];
let worker = null;
p.on("pageerror", (e) => problems.push({ when: Date.now(), what: `page error: ${e.message}\n${e.stack ?? ""}` }));
p.on("console", (m) => {
  if ((m.type() === "error" || m.type() === "warning") && !m.text().includes("blocked by Playwright")) problems.push({ when: Date.now(), what: `console ${m.type()}: ${m.text()}` });
});
let finished = false;
p.on("worker", (w) => {
  worker = w;
  w.on("close", () => {
    if (!finished) problems.push({ when: Date.now(), what: "the worker closed" });
  });
});
p.on("crash", () => problems.push({ when: Date.now(), what: "the page crashed (renderer gone)" }));
const cdp = await context.newCDPSession(p);
if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });

// The worker's heap, asked through the devtools protocol (performance.memory is the window's only): the worker target is
// attached once a game runs, and each reading is one Runtime.getHeapUsage sent to it.
let workerSession = null;
let nextAsk = 1;
const asks = new Map();
cdp.on("Target.receivedMessageFromTarget", (e) => {
  const m = JSON.parse(e.message);
  if (m.id !== undefined && asks.has(m.id)) {
    asks.get(m.id)(m.result ?? null);
    asks.delete(m.id);
  }
});
async function askWorker(method, params = {}, timeout = 4000) {
  if (workerSession === null) {
    const { targetInfos } = await cdp.send("Target.getTargets");
    const w = targetInfos.find((t) => t.type === "worker");
    if (w === undefined) return null;
    workerSession = (await cdp.send("Target.attachToTarget", { targetId: w.targetId, flatten: false })).sessionId;
  }
  const id = nextAsk++;
  const reply = new Promise((r) => {
    asks.set(id, r);
    setTimeout(() => {
      if (asks.has(id)) {
        asks.delete(id);
        r(null);
      }
    }, timeout);
  });
  await cdp.send("Target.sendMessageToTarget", { sessionId: workerSession, message: JSON.stringify({ id, method, params }) });
  return reply;
}
async function workerHeapBytes() {
  const r = await askWorker("Runtime.getHeapUsage");
  return r === null ? -1 : r.usedSize;
}

/** The hottest functions of a CPU profile by self time: "ms  function (file:line)". */
function hottest(profile, top = 18) {
  const self = new Map();
  const dt = new Map();
  const deltas = profile.timeDeltas ?? [];
  profile.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (deltas[i] ?? 0)));
  let total = 0;
  for (const n of profile.nodes) {
    const us = dt.get(n.id) ?? 0;
    total += us;
    const f = n.callFrame;
    const name = `${f.functionName || "(anonymous)"} (${(f.url || "").split("/").pop()}:${f.lineNumber + 1})`;
    self.set(name, (self.get(name) ?? 0) + us);
  }
  return [...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, us]) => `${(us / 1000).toFixed(0).padStart(6)} ms ${((100 * us) / total).toFixed(1).padStart(5)}%  ${name}`);
}
let profiling = null;
async function startProfiles() {
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.start");
  await askWorker("Profiler.enable");
  await askWorker("Profiler.start");
  profiling = Date.now();
}
async function stopProfiles() {
  const page = await cdp.send("Profiler.stop");
  const worker = await askWorker("Profiler.stop", {}, 20000);
  await out(`profile of the page over ${((Date.now() - profiling) / 1000).toFixed(0)} s, by self time:`);
  for (const line of hottest(page.profile)) await out("  " + line);
  if (worker !== null) {
    await out(`profile of the worker over the same stretch, by self time:`);
    for (const line of hottest(worker.profile)) await out("  " + line);
  }
  profiling = null;
}

// Frame times: a requestAnimationFrame loop in the page, counting frames and the long ones since the last reading.
await p.addInitScript(() => {
  const f = { frames: 0, long: 0, worst: 0, total: 0, last: performance.now() };
  window.__frames = f;
  const tick = (now) => {
    const dt = now - f.last;
    f.last = now;
    f.frames++;
    f.total += dt;
    if (dt > f.worst) f.worst = dt;
    if (dt > 100) f.long++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.goto(root + `play?watch=${seed}`);
// The spectator link starts a Free game by itself; set the top speed and auto-play.
await p.waitForSelector(".game .timebar", { timeout: 180000 });
// The speed select is in the "More" menu: open it, pick Fast, close it.
await p.click('summary[aria-label="More"]');
await p.selectOption("select:has(option[value='50'])", "50");
await p.click('summary[aria-label="More"]');
await p.click('button[aria-label="Auto-play"]');
const t0 = Date.now();
await out(`${phone ? "phone 390x844" : "desktop 1280x800"}, CPU slowed ${throttle}x${heapMb > 0 ? `, heap capped at ${heapMb} MB` : ""}, seed ${seed}: the game at Fast speed`);
await out("elapsed s | season | page heap MB | worker heap MB | s/season | frames (long >100 ms, worst ms) | DOM nodes");

const mb = (n) => (n / 1048576).toFixed(0);
let lastSeason = 0;
let lastAt = t0;
let lastFrames = null;
let rows = 0;
let ended = false;
let profiled = false;
const deadline = t0 + minutes * 60000;
for (;;) {
  await p.waitForTimeout(5000);
  let page;
  try {
    page = await p.evaluate(() => {
      const slider = document.querySelector(".slider");
      const f = window.__frames;
      const r = { frames: f.frames, long: f.long, worst: f.worst, total: f.total };
      f.frames = 0;
      f.long = 0;
      f.worst = 0;
      f.total = 0;
      return {
        season: slider ? Number(slider.max) : -1,
        heap: performance.memory?.usedJSHeapSize ?? 0,
        nodes: document.getElementsByTagName("*").length,
        blank: (document.getElementById("app")?.children.length ?? 0) === 0,
        ended: !!document.querySelector('button[aria-label="Replay the seasons"]') && !document.querySelector('button[aria-label="Pause"]'),
        text: document.body.innerText.slice(0, 300),
        frames: r,
      };
    });
  } catch (e) {
    problems.push({ when: Date.now(), what: `the page could not be read: ${e.message.split("\n")[0]}` });
    break;
  }
  let workerHeap = -1;
  try {
    workerHeap = await workerHeapBytes();
  } catch {
    workerHeap = -1;
  }
  const now = Date.now();
  const perSeason = page.season > lastSeason ? ((now - lastAt) / 1000 / (page.season - lastSeason)).toFixed(2) : "-";
  if (page.season > lastSeason) {
    lastSeason = page.season;
    lastAt = now;
  }
  const fr = page.frames;
  const mean = fr.frames > 0 ? (fr.total / fr.frames).toFixed(0) : "-";
  await out(`${((now - t0) / 1000).toFixed(0).padStart(6)} | ${String(page.season).padStart(3)} | ${mb(page.heap).padStart(5)} | ${(workerHeap < 0 ? "?" : mb(workerHeap)).padStart(5)} | ${perSeason.padStart(6)} | ${fr.frames} frames, mean ${mean} ms (${fr.long} long, worst ${fr.worst.toFixed(0)}) | ${page.nodes}`);
  lastFrames = fr;
  rows++;
  if (page.blank) {
    problems.push({ when: now, what: `the page went blank at season ${page.season}: "${page.text}"` });
    break;
  }
  if (page.ended) {
    ended = true;
    break;
  }
  if (profile && profiling === null && page.season >= 15 && !profiled) {
    profiled = true;
    await startProfiles();
  } else if (profiling !== null && Date.now() - profiling >= 30000) await stopProfiles();
  if (problems.some((x) => x.what.startsWith("page error") || x.what.startsWith("the worker") || x.what.startsWith("the page crashed"))) break;
  if (now > deadline) {
    await out(`stopped after ${minutes} minutes, at season ${page.season}`);
    break;
  }
}
finished = true;
if (profiling !== null) await stopProfiles();
await out(ended ? `the game ended at season ${lastSeason} after ${((Date.now() - t0) / 1000).toFixed(0)} s` : `not ended; last season ${lastSeason}`);
if (problems.length > 0) {
  await out(`${problems.length} problems:`);
  for (const x of problems.slice(0, 20)) await out(`  at ${((x.when - t0) / 1000).toFixed(0)} s: ${x.what.slice(0, 1500)}`);
}
try {
  await p.screenshot({ path: (logFile ?? "soak") + ".png" });
} catch {
  /* the page may be gone */
}
await browser.close();
server.close();
process.exit(problems.length > 0 ? 1 : 0);
