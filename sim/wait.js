// For the orchestrator: waits until some kings have requests waiting (and no new ones have appeared
// for a few seconds), or the game is over. Prints one JSON line and exits.
//
//   node sim/wait.js <batch output file> [max seconds = 540]
//
//   {"status":"waiting","pending":[{"power":"Egypt","request":"t3_orders_Egypt.request.md"}, ...]}
//   {"status":"finished"}      the batch runner printed its summary
//   {"status":"still-running"} nothing to answer yet within the time limit: call again
// It lists file names only; it never reads a king's request.
const fs = require("fs");
const path = require("path");

const kings = path.resolve(__dirname, "kings");
const seats = JSON.parse(fs.readFileSync(path.join(kings, "seats.json"), "utf8"));
const out = process.argv[2];
const maxSeconds = Number(process.argv[3] ?? 540);
const settle = 3000;

const skip = new Set(["canary.request.md", "isolation-test.request.md"]);
function pending() {
  const list = [];
  for (const [power, folder] of Object.entries(seats)) {
    if (!fs.existsSync(folder)) continue;
    for (const f of fs.readdirSync(folder).sort()) {
      if (!f.endsWith(".request.md") || skip.has(f)) continue;
      const reply = f.slice(0, -".request.md".length) + ".reply.json";
      if (!fs.existsSync(path.join(folder, reply))) list.push({ power, request: f });
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
