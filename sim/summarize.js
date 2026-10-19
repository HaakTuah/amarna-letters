// After a run: what the kings did, from the batch runner's output folder (--out), as markdown.
//
//   node sim/summarize.js <out folder> [--trails 40]
//
// Reads game-<seed>.final.json (the final state) and game-<seed>.jsonl (the log), and prints the
// result, growth, the success signals, every sealed tablet, the message trail (what each king
// wrote, what the envoy said abroad, what it reported home), the call count per seat, each seat's
// sleep, what woke it and the courts it held (the reopen rate), the size of each kind of request,
// and the characters' own decisions beside the script's with the same traits (the log's shadow lines),
// with every decision where the two differ.
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
out.push("", "## Log", `${decisions} recorded decisions; ${calls.length} king, character and model calls.`);
const roles = {};
for (const c of calls) roles[c.role.replace(/:c\d+$/, ":<character>")] = (roles[c.role.replace(/:c\d+$/, ":<character>")] ?? 0) + 1;
for (const [r, n] of Object.entries(roles).sort()) out.push(`- ${r}: ${n}`);
const failed = calls.filter(c => c.error);
if (failed.length) out.push(`Failed calls (fell back to the script): ${failed.map(c => `${c.key} (${cap(c.error, 80)})`).join("; ")}`);

// Sleep, wake-ups and courts held while orders stood, per seat (the batch log's seat report has the same in a table).
const sleep = Object.entries(s.sleep ?? {});
if (sleep.length > 0) {
  out.push("", "## Seats: sleep, what woke them, and courts held");
  let held = 0, reopened = 0, stood = 0;
  for (const [p, st] of sleep) {
    const spells = (st.history ?? []).map(h => `from t${h.from}${h.named ? ` (named t${h.named})` : ""} ${h.wokeAt ? `woke t${h.wokeAt}` : "still asleep"}${h.reasons?.length ? `: ${h.reasons.map(r => cap(r, 60)).join("; ")}` : ""}`);
    const courts = st.courts ?? [];
    held += courts.length; reopened += courts.filter(c => c.reopened).length; stood += courts.filter(c => c.standIn && !c.reopened).length;
    out.push(`- **${p}**: ${spells.length} spells; courts held ${courts.length}, reopened ${courts.filter(c => c.reopened).length}${courts.some(c => c.standIn) ? `, stand-in at ${courts.filter(c => c.standIn).length}` : ""}`);
    for (const sp of spells) out.push(`  - ${sp}`);
  }
  const decided = held - stood;
  out.push(`Reopen rate: ${held === 0 ? "no courts held while orders stood" : `${reopened} of ${decided} courts where the king chose (${decided ? Math.round(100 * reopened / decided) : 0}%)${stood ? `; ${stood} more where a call failed` : ""}`}.`);
}

// Request sizes by kind: a file request's length (tokens at 3.6 characters a token), or an API call's input tokens.
const kind = c => c.role.startsWith("leader:") ? "king: orders" : c.role.startsWith("host:") ? "king: audience"
  : /\/aud\/present\//.test(c.key) ? "character: speech" : /\/aud\/react\//.test(c.key) ? "character: reply"
  : /\/report\//.test(c.key) ? "character: report" : /\/pitch\//.test(c.key) ? "character: pitch"
  : /\/spy\//.test(c.key) ? "character: spy report" : /\/memory\//.test(c.key) ? "character: memory" : "other: " + c.role.split(":")[0];
const sized = {};
for (const c of calls) (sized[kind(c)] ??= []).push(c);
if (calls.length > 0) {
  out.push("", "## Request sizes by kind", "", "| Kind | Calls | Mean chars | Max chars | Mean tokens |", "|---|---|---|---|---|");
  for (const [k, list] of Object.entries(sized).sort()) {
    const files = list.filter(c => c.requestChars > 0);
    const mean = files.length ? Math.round(files.reduce((n, c) => n + c.requestChars, 0) / files.length) : 0;
    const api = list.filter(c => !c.requestChars && (c.inputTokens || c.cacheReadTokens));
    const tokens = files.length ? Math.round(mean / 3.6) : api.length ? Math.round(api.reduce((n, c) => n + (c.inputTokens ?? 0) + (c.cacheReadTokens ?? 0) + (c.cacheWriteTokens ?? 0), 0) / api.length) : "-";
    out.push(`| ${k} | ${list.length} | ${files.length ? mean : "-"} | ${files.length ? Math.max(...files.map(c => c.requestChars)) : "-"} | ${tokens} |`);
  }
}

// Model characters beside the script with the same traits, decision by decision in the same situation.
const shadows = log.filter(x => x.type === "shadow");
if (shadows.length > 0) {
  const made = shadows.filter(x => x.model);
  out.push("", "## Characters: their own minds beside the script with the same traits",
    `${made.length} decisions by the characters' own minds${shadows.length > made.length ? `; ${shadows.length - made.length} fell back to the script` : ""}. Columns: mind / script.`, "");
  const both = (list, f) => `${list.filter(x => f(x.model)).length} / ${list.filter(x => f(x.script)).length}`;
  const sum = (list, f) => `${list.reduce((n, x) => n + f(x.model), 0)} / ${list.reduce((n, x) => n + f(x.script), 0)}`;
  const of = k => made.filter(x => x.kind === k);
  const gold = of("present").filter(x => x.goldCarried > 0);
  const gifts = of("react").filter(x => x.giftOffered > 0);
  const posts = of("react").filter(x => x.serviceOffered > 0);
  const reports = of("report");
  const home = reports.filter(x => x.goldCarried > 0);
  out.push(`- Speeches abroad ${of("present").length}, with gold ${gold.length}: kept gold ${both(gold, c => c.kept > 0)} (shekels ${sum(gold, c => c.kept)}), swapped the inventory ${both(gold, c => c.swap)}, softened a threat to the host ${both(of("present"), c => c.flags.includes("softened-threat"))}`);
  out.push(`- Audience replies ${of("react").length}: gifts offered ${gifts.length}, taken ${both(gifts, c => c.acceptGift)}; posts offered ${posts.length}, taken ${both(posts, c => c.acceptService)}; committed its lord ${both(of("react"), c => (c.commitments ?? "").trim().length > 0)}`);
  out.push(`- Reports home ${reports.length}, with gold ${home.length}: kept gold ${both(home, c => c.kept > 0)} (shekels ${sum(home, c => c.kept)}), swapped ${both(home, c => c.swap)}, hid or contradicted something ${both(reports, c => c.flags.length > 0)}`);
  for (const f of [...new Set(reports.flatMap(x => [...x.model.flags, ...x.script.flags]))].sort()) out.push(`  - ${f}: ${both(reports, c => c.flags.includes(f))}`);
  if (of("spy").length) out.push(`- Spy reports ${of("spy").length}: passed on its masters' words ${both(of("spy"), c => c.flags.includes("passed-poison"))}, left out observations ${both(of("spy"), c => c.dropped > 0)}`);
  if (of("pitch").length) out.push(`- Pitches ${of("pitch").length}: mean asking price ${Math.round(of("pitch").reduce((n, x) => n + x.model.price, 0) / of("pitch").length)} / ${Math.round(of("pitch").reduce((n, x) => n + x.script.price, 0) / of("pitch").length)}`);
  out.push("", "| Character (traits L/G/C/A/Co) | Decisions | Gold kept | Gifts taken | Posts taken | Reports flagged |", "|---|---|---|---|---|---|");
  const byChar = {};
  for (const x of made) (byChar[x.character] ??= []).push(x);
  for (const list of Object.values(byChar))
    out.push(`| ${list[0].name} (${list[0].traits}) | ${list.length} | ${sum(list, c => c.kept)} | ${sum(list, c => c.acceptGift ? 1 : 0)} | ${sum(list, c => c.acceptService ? 1 : 0)} | ${both(list.filter(x => x.kind === "report"), c => c.flags.length > 0)} |`);
  // The decisions that differ in what was done or what the words hide, for a reader to check against the texts.
  const differ = made.filter(x => x.model.kept !== x.script.kept || x.model.swap !== x.script.swap || x.model.acceptGift !== x.script.acceptGift
    || x.model.acceptService !== x.script.acceptService || x.model.flags.join() !== x.script.flags.join());
  out.push("", `### Where the two differ (${differ.length}; the first ${Math.min(differ.length, maxTrails)})`);
  for (const x of differ.slice(0, maxTrails)) {
    const what = c => [c.kept ? `kept ${c.kept}` : "", c.swap ? "swapped" : "", c.acceptGift ? "took the gift" : "", c.acceptService ? "went over" : "", ...c.flags].filter(Boolean).join(", ") || "nothing of note";
    out.push(`- ${x.key}, ${x.name} (${x.traits})${x.giftOffered ? `, offered ${x.giftOffered}` : ""}${x.serviceOffered ? `, post at ${x.serviceOffered}` : ""}${x.goldCarried ? `, carrying ${x.goldCarried}` : ""}: mind ${what(x.model)}; script ${what(x.script)}`);
    if (x.known?.length) out.push(`  - Known: ${x.known.map(k => cap(k, 120)).join("; ")}`);
    out.push(`  - Mind: ${cap(x.model.text, 400)}`);
    out.push(`  - Script: ${cap(x.script.text, 300)}`);
  }
}
console.log(out.join("\n"));
