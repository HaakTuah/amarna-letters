// For the orchestrator: waits until some seats (kings or characters) have requests waiting, and no new ones have appeared
// for a few seconds, or the game is over. Prints one JSON line and exits.
//
//   node sim/wait.js <batch output file> [max seconds = 540] [--seed S]
//
//   {"status":"waiting","pending":[{"agent":"king-egypt","request":"t3_orders_Egypt.request.md"},
//                                  {"agent":"char-5f0c2a91","request":"t3_aud_present_c20.request.md"}, ...]}
//   {"status":"finished"}      the batch runner printed its summary
//   {"status":"still-running"} nothing to answer yet within the time limit: call again
// "agent" is the agent type to start for that request (subagent_type), and "request" the file name to give it. With
// --seed, only that seed's characters are watched (the kings always are). It lists file names only; it never reads a
// request.
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
let seed = null;
if (args.includes("--seed")) { seed = args[args.indexOf("--seed") + 1]; args.splice(args.indexOf("--seed"), 2); }
const out = args[0];
const maxSeconds = Number(args[1] ?? 540);
const settle = 3000;

const read = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const seats = Object.entries(read(path.resolve(__dirname, "kings", "seats.json"))).map(([power, folder]) => ({ agent: `king-${power.toLowerCase()}`, folder }));
const characters = Object.entries(read(path.resolve(__dirname, "characters", "agents.json")))
  .filter(([, c]) => seed === null || c.seed === seed).map(([agent, c]) => ({ agent, folder: c.folder }));
const all = [...seats, ...characters];

// Game requests only ("t3_orders_Egypt", and a retry "t3_orders_Egypt.retry"): not the canary, the isolation test or a debrief.
function pending() {
  const list = [];
  for (const { agent, folder } of all) {
    if (!fs.existsSync(folder)) continue;
    for (const f of fs.readdirSync(folder).sort()) {
      if (!/^t\d+_.*\.request\.md$/.test(f)) continue;
      const reply = f.slice(0, -".request.md".length) + ".reply.json";
      if (!fs.existsSync(path.join(folder, reply))) list.push({ agent, request: f });
    }
  }
  return list;
}
const finished = () => out && fs.existsSync(out) && /\d+ games?, [\d.]+ turns on average/.test(fs.readFileSync(out, "utf8"));

const start = Date.now();
let last = "";
let since = Date.now();
(function tick() {
  if (finished()) { console.log(JSON.stringify({ status: "finished" })); return; }
  const now = pending();
  const key = JSON.stringify(now);
  if (key !== last) { last = key; since = Date.now(); }
  if (now.length > 0 && Date.now() - since >= settle) { console.log(JSON.stringify({ status: "waiting", pending: now })); return; }
  if (Date.now() - start > maxSeconds * 1000) { console.log(JSON.stringify({ status: "still-running", pending: now })); return; }
  setTimeout(tick, 500);
})();
