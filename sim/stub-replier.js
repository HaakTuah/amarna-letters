// A stand-in for the agents, to prove the plumbing without spending a model call: answers waiting requests with the
// plainest reply each schema allows, until the batch runner has finished. Never use it in a real simulation: it reads
// the requests, which only each seat's own agent may do.
//
//   node sim/stub-replier.js <batch output file> --orchestrate [--seed S] [options]
//       Plays the orchestrator's loop: calls sim/wait.js, and for each waiting request "starts" the agent type it names
//       by answering in the folder that agent's own file (.claude/agents/<type>.md) gives it, as the agent would.
//   node sim/stub-replier.js <batch output file> <folder | map.json>... [options]
//       Answers every request that appears in the folders (a seat or character map names every folder in it).
//
// Kings send one of their people who is ready to the nearest court with each set of orders (20 shekels and a threat),
// and ask to be woken the next season.
//   --tempted        characters keep 5 shekels of any gold they carry, take every gift and swap no inventory; hosts
//                    offer each envoy a gift of 10 and a post at 30, and send 15 shekels home with it
//   --skip REGEX     leave requests whose file name matches unanswered (the runner then times out into the script)
//   --bad REGEX      answer requests whose file name matches with text that is not JSON (one retry, then the script)
// It prints what it answered and a count at the end.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repo = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const toggle = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const tempted = toggle("--tempted");
const orchestrate = toggle("--orchestrate");
const skip = flag("--skip");
const bad = flag("--bad");
const seed = flag("--seed");
const [out, ...sources] = args;
if (!out || (!orchestrate && sources.length === 0)) { console.error("usage: node sim/stub-replier.js <batch output file> (--orchestrate [--seed S] | <folder | map.json>...)"); process.exit(1); }

// The plainest value a schema allows: the first of an enum, empty text, zero, false, an empty list.
function plain(schema, name = "") {
  switch (schema.type) {
    case "object": return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([k, v]) => [k, plain(v, k)]));
    case "array": return [];
    case "string": return schema.enum ? schema.enum[0] : ["speech", "report", "pitch", "summary", "notes"].includes(name) ? "(stub)" : "";
    case "integer": return tempted && name === "keep_gold" ? 5 : name === "asking_price" ? 12 : name === "gold_back_purity" ? 100 : 0;
    case "boolean": return tempted && name === "accept_gift" ? true : name === "end_audience";
    default: return null;
  }
}

// The plain reply, with just enough in it to keep the characters busy: a king's orders send one of its people who is
// ready to the nearest court, with a little gold and a threat in the letter; with --tempted a host offers the envoy a
// gift and a post and sends gold home with it.
function stubReply(schema, text, file) {
  const r = plain(schema);
  if (/_orders_/.test(file) && Array.isArray(r.letters) && schema.properties.letters?.items) {
    const ready = /^- (c\d+) [^;]+; at court, ready for a mission/m.exec(text);
    const travel = /^ENVOY TRAVEL: (.*)$/m.exec(text);
    const nearest = travel?.[1].split(";").map(x => /(\w+): (\d+)/.exec(x.trim())).filter(Boolean).sort((a, b) => a[2] - b[2])[0]?.[1];
    if (ready && nearest) r.letters.push({
      ...plain(schema.properties.letters.items), envoy: ready[1], to: nearest, gold: 20, purity: 100, call_brother: true, call_them_great_king: true, claim_great_king: true,
      message: "I send you gold as a sign of my love. If you do not withdraw your troops from my border, there will be war.", mandate: "You may agree to peace and an exchange of gifts.",
    });
  }
  // A king asks to be woken next season, so that it gives orders (and sends someone) every season.
  const season = /^SEASON: turn (\d+)/m.exec(text);
  if (/_orders_/.test(file) && season && r.sleep && "wake_in_turn" in r.sleep) r.sleep.wake_in_turn = Number(season[1]) + 1;
  if (tempted && /_host_/.test(file) && "gift_to_envoy" in r)
    Object.assign(r, { gift_to_envoy: 10, gift_request: "Tell your lord that my armies are few.", offer_service_wage: 30, send_gold_back: 15 });
  return r;
}

const finished = () => fs.existsSync(out) && /\d+ games?, [\d.]+ turns on average/.test(fs.readFileSync(out, "utf8"));
const tally = {};
let written = 0;

// Answers one request in a folder; false if it was left unanswered on purpose.
function answer(folder, file, who) {
  const stem = file.slice(0, -".request.md".length);
  tally[who] = (tally[who] ?? 0) + 1;
  if (skip && new RegExp(skip).test(file)) { console.log(`skipped ${file}`); return false; }
  const text = fs.readFileSync(path.join(folder, file), "utf8").replace(/\r\n/g, "\n");
  const m = /## HOW TO REPLY[\s\S]*?```json\n([\s\S]*?)\n```/.exec(text);
  if (!m) throw new Error(`no schema in ${file}`);
  fs.writeFileSync(path.join(folder, stem + ".reply.json"), bad && new RegExp(bad).test(file) ? "not json" : JSON.stringify(stubReply(JSON.parse(m[1]), text, file)));
  written++;
  console.log(`answered ${file} as ${who}`);
  return true;
}

if (orchestrate) {
  // The folder an agent type is told is its own, read from its agent file as the agent reads its system prompt.
  const folderOf = agent => {
    const body = fs.readFileSync(path.join(repo, ".claude", "agents", `${agent}.md`), "utf8").replace(/\r\n/g, "\n");
    return /request file in your own folder:\n(.+)\n/.exec(body)[1].trim();
  };
  const skipped = new Set();
  for (;;) {
    const r = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, "wait.js"), out, "120", ...(seed ? ["--seed", seed] : [])], { encoding: "utf8" }));
    if (r.status === "finished") break;
    for (const p of r.status === "waiting" ? r.pending : []) {
      const folder = folderOf(p.agent);
      if (!fs.existsSync(path.join(folder, p.request))) throw new Error(`${p.agent} was sent ${p.request}, which is not in its folder`);
      if (skipped.has(p.request)) continue;
      if (!answer(folder, p.request, p.agent.startsWith("king-") ? "king" : "character")) skipped.add(p.request);
    }
  }
} else {
  const folders = [];
  for (const s of sources) {
    if (s.endsWith(".json")) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(s, "utf8")))) { if (k !== "seed") folders.push(v); }
    else if (fs.existsSync(s) && fs.readdirSync(s, { withFileTypes: true }).some(e => e.isDirectory() && !e.name.startsWith("earlier-")))
      for (const e of fs.readdirSync(s, { withFileTypes: true })) { if (e.isDirectory()) folders.push(path.join(s, e.name)); }
    else folders.push(s);
  }
  const done = new Set();
  (function tick() {
    for (const folder of folders) {
      if (!fs.existsSync(folder)) continue;
      for (const f of fs.readdirSync(folder)) {
        if (!/^t\d+_.*\.request\.md$/.test(f)) continue;
        const key = path.join(folder, f) + "@" + fs.statSync(path.join(folder, f)).mtimeMs;
        if (done.has(key) || fs.existsSync(path.join(folder, f.slice(0, -".request.md".length) + ".reply.json"))) continue;
        done.add(key);
        answer(folder, f, "seat");
      }
    }
    if (!finished()) return setTimeout(tick, 150);
    console.log(`finished: ${written} replies written`);
  })();
}
if (orchestrate) console.log(`finished: ${written} replies written (${Object.entries(tally).map(([k, n]) => `${n} ${k} requests`).join(", ")})`);
