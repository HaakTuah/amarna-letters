// The local bridge, for local play on a Claude subscription: the web app, run on this computer, plays a human seat
// against kings answered by guarded king agents in a Claude Code session. A web page cannot write files, so each
// request to a king played by a local agent comes here: the bridge writes it into that king's own folder (made by
// sim/setup.js) exactly as the batch runner's file seats do (the same text, schema and footer, under the same file
// name), and hands the reply file's contents back to the page once the king's agent has written it. The orchestrating
// session waits on the folders with sim/wait.js --play and starts the agents, as in the simulation (docs/PLAY-PROMPT.md).
//
//   node sim/bridge.js [--port 5190] [--seed S] [--verbose] [--keep]
//
// With --seed S it also keeps the folders of seed S's characters (sim/setup.js --seeds S), so that the game's envoys,
// spies and candidates may be played by local agents too (build order item 8): the page names a character by its id,
// and a game of that seed alone may use them.
// It listens on this computer only (127.0.0.1 and ::1), answers only pages served from this computer (localhost,
// 127.0.0.1 or [::1]), and never tells a page a folder's name: the page names a king, the bridge knows his folder.
// Endpoints (JSON in, JSON or text out):
//   GET  /status                       {"bridge":"amarna-letters","version":2,"seats":["Egypt",...],"seed":S|null,"characters":["c8",...]}
//   POST /ask    {seat,name,text,mark} writes <folder>/<name>.request.md: the text with the one mark replaced by the
//                                      reply file's path; answers {"ok":true,"chars":N}
//   GET  /reply?seat=&name=            204 while there is no reply; 200 with the reply file's text once it has stopped
//                                      changing (an empty reply is handed back after 5 seconds); 404 if no such request
//   POST /cancel {seat,name}           moves a request (and any reply) aside, so that no agent is started for it
// On start it moves requests and replies left by an earlier game into earlier-<time>/ in each folder, as the batch
// runner does (unless --keep: restarting the bridge in the middle of a game keeps that game's waiting requests), and
// writes sim/kings/bridge.json (its process id and port), which sim/wait.js --play reads to know that
// play goes on. Stop it with Ctrl+C when you have finished playing: the orchestrator's next wait then ends the session.
// Quiet by default: which kings are asked would tell the player which kings are awake. --verbose prints every request.
const fs = require("fs");
const path = require("path");
const http = require("http");

const args = process.argv.slice(2);
const opt = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const port = Number(opt("--port", "5190"));
const verbose = args.includes("--verbose");
const keep = args.includes("--keep");
const kings = path.join(__dirname, "kings");
const mapFile = path.join(kings, "seats.json");
const pidFile = path.join(kings, "bridge.json");
const fwd = p => p.replace(/\\/g, "/");
const say = line => console.log(`${new Date().toTimeString().slice(0, 8)} ${line}`);

if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error("--port takes a port number, for example --port 5190"); process.exit(1); }
if (!fs.existsSync(mapFile)) { console.error("No king folders: run node sim/setup.js first (see Local play in sim/README.md)."); process.exit(1); }
const seats = JSON.parse(fs.readFileSync(mapFile, "utf8"));
for (const [power, folder] of Object.entries(seats))
  if (!fs.existsSync(folder)) { console.error(`The folder of ${power} is missing (${folder}): run node sim/setup.js --force.`); process.exit(1); }
// The characters of one seed, by id, when asked for: the kit's map for that seed (sim/setup.js --seeds S).
const seed = opt("--seed", null);
const characters = {};
if (seed !== null) {
  const charMap = path.join(__dirname, "characters", `seed-${seed}.json`);
  if (!/^\d+$/.test(seed) || !fs.existsSync(charMap)) { console.error(`No character folders for seed ${seed}: run node sim/setup.js --seeds ${seed} first.`); process.exit(1); }
  const map = JSON.parse(fs.readFileSync(charMap, "utf8"));
  for (const [id, folder] of Object.entries(map)) {
    if (id === "seed") continue;
    if (!/^c\d+$/.test(id) || !fs.existsSync(folder)) { console.error(`The folder of character ${id} is missing (${folder}): run node sim/setup.js --seeds ${seed} --force.`); process.exit(1); }
    characters[id] = folder;
  }
}
// Kings by name, characters by id: one name space, since a king's name never looks like an id.
const folders = { ...seats, ...characters };

// One bridge at a time: a second would hand the same folders to two games.
if (fs.existsSync(pidFile)) {
  const other = JSON.parse(fs.readFileSync(pidFile, "utf8"));
  let alive = false;
  try { process.kill(other.pid, 0); alive = true; } catch { /* gone */ }
  if (alive) { console.error(`A bridge is already running (process ${other.pid}, port ${other.port}).`); process.exit(1); }
}

// Requests and replies of an earlier game would look live to wait.js: move them aside, never delete them.
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
const gameFile = /^t\d+_.*\.(request\.md|reply\.json|tmp)$/;
function moveAside(folder, files) {
  if (files.length === 0) return;
  const aside = path.join(folder, `earlier-${stamp()}`);
  fs.mkdirSync(aside, { recursive: true });
  for (const f of files) fs.renameSync(path.join(folder, f), path.join(aside, f));
}
let moved = 0;
if (!keep) for (const folder of Object.values(folders)) {
  const old = fs.readdirSync(folder).filter(f => gameFile.test(f));
  moved += old.length;
  moveAside(folder, old);
}
if (moved > 0) say(`moved ${moved} files of an earlier game aside`);

// A request's name is the batch runner's: "t3_orders_Egypt", "t3_aud_a12_host_1", and ".retry" for a second try.
const nameOk = n => typeof n === "string" && n.length < 200 && /^t\d+_[A-Za-z0-9_-]+(\.retry)?$/.test(n);
const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const hostOk = h => [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`].includes(String(h).toLowerCase());
const seen = new Map(); // reply path -> { size, emptySince }

function files(seat, name) {
  const folder = folders[seat];
  return { folder, request: path.join(folder, `${name}.request.md`), reply: path.join(folder, `${name}.reply.json`) };
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => { size += c.length; if (size > 8 * 1024 * 1024) { reject(new Error("request too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error("not JSON")); } });
    req.on("error", reject);
  });
}

async function handle(req, res) {
  // Only this computer, and only pages served from it: a page on any other site gets nothing.
  if (!hostOk(req.headers.host)) return send(res, 403, { error: "this bridge answers only on this computer" });
  const origin = req.headers.origin;
  if (origin !== undefined && !local.test(origin)) return send(res, 403, { error: "this bridge answers only pages served from this computer" });
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.headers["access-control-request-private-network"]) res.setHeader("Access-Control-Allow-Private-Network", "true");
    return send(res, 204);
  }
  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === "GET" && url.pathname === "/status")
    return send(res, 200, { bridge: "amarna-letters", version: 2, seats: Object.keys(seats), seed: seed === null ? null : Number(seed), characters: Object.keys(characters) });

  if (req.method === "GET" && url.pathname === "/reply") {
    const seat = url.searchParams.get("seat");
    const name = url.searchParams.get("name");
    if (!Object.hasOwn(folders, String(seat)) || !nameOk(name)) return send(res, 400, { error: "unknown king, character or request name" });
    const f = files(seat, name);
    if (!fs.existsSync(f.request)) return send(res, 404, { error: "no such request" });
    let size;
    try { size = fs.existsSync(f.reply) ? fs.statSync(f.reply).size : -1; } catch { return send(res, 204); }
    if (size < 0) { seen.delete(f.reply); return send(res, 204); }
    const last = seen.get(f.reply) ?? { size: -1, emptySince: null };
    if (size === 0) {
      // A reply that stays empty is handed back as it stands (and fails the check), rather than waited on forever.
      last.emptySince ??= Date.now();
      seen.set(f.reply, last);
      if (Date.now() - last.emptySince < 5000) return send(res, 204);
      seen.delete(f.reply);
      return send(res, 200, "", "text/plain; charset=utf-8");
    }
    // Hand the reply back once it has stopped changing for one poll.
    if (size !== last.size) { seen.set(f.reply, { size, emptySince: null }); return send(res, 204); }
    let text;
    try { text = fs.readFileSync(f.reply, "utf8"); } catch { return send(res, 204); }
    seen.delete(f.reply);
    if (verbose) say(`${seat}: reply ${name} read`);
    return send(res, 200, text, "text/plain; charset=utf-8");
  }

  if (req.method === "POST" && (url.pathname === "/ask" || url.pathname === "/cancel")) {
    // JSON only: a page elsewhere cannot send it without asking first, and the answer to that is no.
    if (!String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) return send(res, 415, { error: "send JSON" });
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, 400, { error: e.message }); }
    const { seat, name } = body ?? {};
    if (!Object.hasOwn(folders, String(seat)) || !nameOk(name)) return send(res, 400, { error: "unknown king, character or request name" });
    const f = files(seat, name);

    if (url.pathname === "/cancel") {
      const there = [f.request, f.reply].filter(p => fs.existsSync(p)).map(p => path.basename(p));
      moveAside(f.folder, there);
      seen.delete(f.reply);
      if (verbose && there.length > 0) say(`${seat}: request ${name} withdrawn`);
      return send(res, 200, { ok: true });
    }

    const { text, mark } = body;
    if (typeof text !== "string" || typeof mark !== "string" || mark.length < 10 || mark.length > 100)
      return send(res, 400, { error: "a request needs its text and the mark where the reply's path goes" });
    const at = text.indexOf(mark);
    if (at < 0 || text.indexOf(mark, at + 1) >= 0) return send(res, 400, { error: "the mark must appear exactly once" });
    // The same text a file seat writes: the reply's full path, with forward slashes.
    const full = text.slice(0, at) + fwd(path.resolve(f.reply)) + text.slice(at + mark.length);
    try {
      if (fs.existsSync(f.reply)) fs.unlinkSync(f.reply);
      seen.delete(f.reply);
      fs.writeFileSync(f.request + ".tmp", full, "utf8");
      fs.renameSync(f.request + ".tmp", f.request);
    } catch (e) { return send(res, 500, { error: `could not write the request: ${e.message}` }); }
    if (verbose) say(`${seat}: request ${name} written`);
    return send(res, 200, { ok: true, chars: full.length });
  }

  return send(res, 404, { error: "no such endpoint" });
}

const servers = [];
let listening = 0;
for (const host of ["127.0.0.1", "::1"]) {
  const server = http.createServer((req, res) => handle(req, res).catch(e => { try { send(res, 500, { error: e.message }); } catch { /* closed */ } }));
  server.on("error", e => {
    // No IPv6 on this computer is fine; a port in use is not.
    if (host === "::1" && (e.code === "EADDRNOTAVAIL" || e.code === "EAFNOSUPPORT")) return;
    console.error(`The bridge could not listen on ${host}:${port}: ${e.message}`);
    stop(1);
  });
  server.listen(port, host, () => {
    if (++listening > 1) return;
    fs.writeFileSync(pidFile, JSON.stringify({ pid: process.pid, port, seed: seed === null ? null : seed, started: new Date().toISOString() }) + "\n");
    say(`The bridge is running at http://localhost:${port} for ${Object.keys(seats).join(", ")}${seed !== null ? `, and the ${Object.keys(characters).length} characters of seed ${seed}` : ""}.`);
    say("Start the web app and the Claude Code session (docs/PLAY-PROMPT.md). Press Ctrl+C here when you have finished playing.");
  });
  servers.push(server);
}

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  try {
    const mine = fs.existsSync(pidFile) && JSON.parse(fs.readFileSync(pidFile, "utf8")).pid === process.pid;
    if (mine) fs.unlinkSync(pidFile);
  } catch { /* already gone */ }
  for (const s of servers) s.close();
  if (code === 0) say("The bridge has stopped.");
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
process.on("SIGBREAK", () => stop(0));
