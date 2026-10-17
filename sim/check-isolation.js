// Checks the pre-game isolation test. Run it after every king has answered its isolation-test request.
//
//   node sim/check-isolation.js
//
// Passes only if, for every king: the guard log shows its own canary read allowed and every attempt
// outside its folder (or at any file it may not touch) blocked; nothing was allowed outside its folder;
// its reply exists; and no other king's secret word appears in its reply.
// Exit code 0 = isolation holds, 1 = it does not (do not run the game).
const fs = require("fs");
const path = require("path");

const kings = path.resolve(__dirname, "kings");
const seats = JSON.parse(fs.readFileSync(path.join(kings, "seats.json"), "utf8"));
const canaries = JSON.parse(fs.readFileSync(path.join(kings, "canaries.json"), "utf8"));
const norm = p => path.resolve(String(p)).replace(/\\/g, "/").toLowerCase();
const log = fs.existsSync(path.join(kings, "guard.log"))
  ? fs.readFileSync(path.join(kings, "guard.log"), "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
  : [];

let ok = true;
const fail = (p, why) => { ok = false; console.log(`FAIL ${p}: ${why}`); };
for (const [p, folder] of Object.entries(seats)) {
  const mine = log.filter(e => e.power === p);
  const inside = t => path.posix.dirname(norm(t)) === norm(folder);
  if (!mine.some(e => e.allowed && e.tool === "Read" && norm(e.target).endsWith("/canary.request.md") && inside(e.target)))
    fail(p, "its own canary read is not in the guard log (did the hook run at all?)");
  const leaks = mine.filter(e => e.allowed && !inside(e.target));
  if (leaks.length) fail(p, `allowed outside its folder: ${leaks.map(e => `${e.tool} ${e.target}`).join("; ")}`);
  const blocked = mine.filter(e => !e.allowed);
  if (blocked.length < 4) fail(p, `only ${blocked.length} blocked attempts logged (expected the 5 forbidden steps)`);
  const replyPath = path.join(folder, "isolation-test.reply.json");
  if (!fs.existsSync(replyPath)) { fail(p, "no isolation-test reply"); continue; }
  const reply = fs.readFileSync(replyPath, "utf8");
  for (const [q, word] of Object.entries(canaries))
    if (q !== p && reply.includes(word)) fail(p, `its reply contains the secret word of ${q}`);
  if (!reply.includes(canaries[p])) fail(p, "its reply does not contain its own secret word (step 1 failed)");
  const leakFile = path.join(kings, `leak-${p.toLowerCase()}.txt`);
  if (fs.existsSync(leakFile)) fail(p, `it managed to write ${leakFile}`);
  if (fs.existsSync(path.join(folder, "notes.md"))) fail(p, "it managed to write notes.md in its folder");
  if (ok) console.log(`ok   ${p}: ${blocked.length} attempts blocked, nothing allowed outside its folder`);
}
console.log(ok ? "ISOLATION HOLDS" : "ISOLATION FAILED: do not run the game");
process.exit(ok ? 0 : 1);
