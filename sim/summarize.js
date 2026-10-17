// After a run: what the kings did, from the batch runner's output folder (--out), as markdown.
//
//   node sim/summarize.js <out folder> [--trails 40]
//
// Reads game-<seed>.final.json (the final state) and game-<seed>.jsonl (the log), and prints the
// result, growth, the success signals, every sealed tablet, the message trail (what each king
// wrote, what the envoy said abroad, what it reported home), and the model-call count per seat.
const fs = require("fs");
const path = require("path");

const dir = process.argv[2];
const maxTrails = process.argv.includes("--trails") ? Number(process.argv[process.argv.indexOf("--trails") + 1]) : 40;
const stateFile = fs.readdirSync(dir).find(f => /^game-\d+\.final\.json$/.test(f));
if (!stateFile) { console.error("no game-<seed>.final.json in " + dir); process.exit(1); }
const s = JSON.parse(fs.readFileSync(path.join(dir, stateFile), "utf8"));
const logFile = path.join(dir, stateFile.replace(".final.json", ".jsonl"));
const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").trim().split("\n").map(l => JSON.parse(l)) : [];
const cap = (t, n = 300) => { t = String(t ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };
const out = [];

out.push(`## Result (seed ${s.seed}, ${s.turn} turns, ${s.endReason ?? "running"})`);
out.push(`Winners: ${(s.winners ?? []).join(" and ") || "none yet"}`);
const last = {};
for (const r of s.scores ?? []) last[r.power] = r;
out.push("");
out.push("| Power | Growth | Provinces | Units | Gold |");
out.push("|---|---|---|---|---|");
for (const [p, r] of Object.entries(last)) out.push(`| ${p} | ${r.growth.toFixed(2)} | ${r.provinces} | ${r.units} | ${r.gold} |`);

const signals = {};
for (const e of s.events ?? []) if (e.signal) (signals[e.signal.split(":")[0]] ??= []).push(e);
out.push("", "## Signals");
for (const [k, list] of Object.entries(signals)) {
  out.push(`- **${k}**: ${list.length}`);
  for (const e of list.slice(0, 6)) out.push(`  - turn ${e.turn}: ${cap(e.text, 220)}`);
}

out.push("", "## Sealed tablets");
for (const t of (s.tablets ?? []).filter(t => t.sealedTurn != null))
  out.push(`- turn ${t.sealedTurn}, ${t.seals.join(" + ")}${t.allianceOath ? " (sworn alliance)" : ""}${t.forged ? " (FORGED)" : ""}: "${cap(t.text, 260)}"`);

out.push("", "## Message trail (written / said abroad / reported home)");
for (const t of (s.trails ?? []).slice(0, maxTrails)) {
  out.push(`### ${t.id}: turn ${t.turn}, ${t.from} -> ${t.to}, envoy ${t.envoyName}`);
  out.push(`- Wrote: ${cap(t.leaderLetter, 500)}`);
  if (t.mandate) out.push(`- Mandate: ${cap(t.mandate, 200)}`);
  if (t.goldStated) out.push(`- Gold: stated ${t.goldStated}, delivered ${t.goldDelivered}, fine ${t.goldFine}`);
  if (t.proposalText) out.push(`- Tablet offered: ${cap(t.proposalText, 260)}`);
  if (t.delivered) out.push(`- Said abroad (turn ${t.audienceTurn}): ${cap(t.delivered, 500)}`);
  for (const x of t.exchanges ?? []) out.push(`  - Host: ${cap(x.host, 300)} / Envoy: ${cap(x.envoy, 200)}`);
  if ((t.outcomes ?? []).length) out.push(`- Outcomes: ${t.outcomes.join("; ")}`);
  if (t.report) out.push(`- Reported home (turn ${t.reportTurn}): ${cap(t.report, 500)}`);
}
if ((s.trails ?? []).length > maxTrails) out.push(`(${s.trails.length - maxTrails} more trails not shown; pass --trails N)`);

const decisions = log.filter(x => x.type === "decision").length;
const calls = log.filter(x => x.type === "call");
out.push("", "## Log", `${decisions} recorded decisions; ${calls.length} king and model calls.`);
const roles = {};
for (const c of calls) roles[c.role] = (roles[c.role] ?? 0) + 1;
for (const [r, n] of Object.entries(roles).sort()) out.push(`- ${r}: ${n}`);
const failed = calls.filter(c => c.error);
if (failed.length) out.push(`Failed calls (fell back to the script king): ${failed.map(c => `${c.key} (${cap(c.error, 80)})`).join("; ")}`);
console.log(out.join("\n"));
