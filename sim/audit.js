// After the game: audits every file access in the agents' transcripts, kings and characters alike.
//
//   node sim/audit.js [subagents folder]
//
// The folder defaults to this session's subagent transcripts:
//   ~/.claude/projects/<this folder, slugged>/<CLAUDE_CODE_SESSION_ID>/subagents
// For each transcript whose agent type is king-<power> or one of the character agents (sim/characters/agents.json), it
// lists every tool call. A call is a violation if it uses a tool other than Read or Write, or names a path outside that
// agent's folder, or reads anything but a request file, or writes anything but a reply file. In play, the one request
// file it may read is the one its prompt named ("Your request file is <name> in your folder"): a character could
// otherwise read an older or a newer request of its own, and learn what has happened since the season it writes of.
// A debrief names earlier requests for the agent to reread, so in a debrief any of its own request files may be read.
// Calls the guard blocked are counted separately (they are attempts, and also violations unless they belong to the
// isolation test). It also checks that no transcript contains another agent's secret word.
// Exit code 0 = clean, 1 = a violation was found.
const fs = require("fs");
const path = require("path");
const os = require("os");

const repo = path.resolve(__dirname, "..");
const read = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const seats = read(path.join(repo, "sim", "kings", "seats.json"));
const kingWords = read(path.join(repo, "sim", "kings", "canaries.json"));
const charAgents = read(path.join(repo, "sim", "characters", "agents.json"));
const charWords = read(path.join(repo, "sim", "characters", "canaries.json"));
const slug = repo.replace(/[:\\/]/g, "-");
const root = process.argv[2] ?? path.join(os.homedir(), ".claude", "projects", slug, process.env.CLAUDE_CODE_SESSION_ID ?? "", "subagents");
const norm = p => path.resolve(String(p)).replace(/\\/g, "/").toLowerCase();

// Every agent type the kit made: its folder, its secret word and how the report names it.
const agents = {};
for (const [p, folder] of Object.entries(seats)) agents[`king-${p.toLowerCase()}`] = { folder, word: kingWords[p], label: p };
for (const [name, c] of Object.entries(charAgents)) agents[name] = { folder: c.folder, word: charWords[name], label: `${name} (seed ${c.seed}, ${c.name})` };

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".meta.json")) yield p;
  }
}

const stats = {};
let violations = 0;
for (const meta of walk(root)) {
  const info = JSON.parse(fs.readFileSync(meta, "utf8"));
  const name = info.agentType ?? "";
  if (!agents[name]) continue;
  const folder = norm(agents[name].folder);
  const transcript = meta.replace(/\.meta\.json$/, ".jsonl");
  const text = fs.existsSync(transcript) ? fs.readFileSync(transcript, "utf8") : "";
  const s = (stats[name] ??= { transcripts: 0, reads: 0, writes: 0, blocked: 0, testBlocked: 0, violations: [] });
  s.transcripts++;
  const results = new Map();
  const uses = [];
  let prompt = null;
  for (const line of text.split("\n").filter(Boolean)) {
    const j = JSON.parse(line);
    // The prompt it was started with: the first message of its transcript.
    if (prompt === null && j.type === "user") {
      const c = j.message?.content;
      prompt = typeof c === "string" ? c : Array.isArray(c) ? c.filter(b => b.type === "text").map(b => b.text).join("\n") : "";
    }
    for (const b of Array.isArray(j.message?.content) ? j.message.content : []) {
      if (b.type === "tool_use") uses.push(b);
      if (b.type === "tool_result") results.set(b.tool_use_id, JSON.stringify(b.content ?? ""));
    }
  }
  const named = /request file is (\S+\.request\.md)/i.exec(prompt ?? "")?.[1].toLowerCase() ?? null;
  // A transcript whose prompt names no request file (not one of the prompts the start prompts give) is judged as before.
  const isTest = named ? named === "isolation-test.request.md" : text.includes("isolation-test.request.md");
  const anyRequest = !named || isTest || named === "debrief.request.md";
  for (const u of uses) {
    const file = u.input?.file_path;
    const blocked = /Blocked:/.test(results.get(u.id) ?? "");
    const inside = typeof file === "string" && path.posix.dirname(norm(file)) === folder;
    const request = inside && norm(file).endsWith(".request.md");
    const okShape = (u.name === "Read" && request && (anyRequest || path.posix.basename(norm(file)) === named))
                 || (u.name === "Write" && inside && norm(file).endsWith(".reply.json"));
    if (blocked) { if (isTest) s.testBlocked++; else s.blocked++; }
    else if (u.name === "Read") s.reads++;
    else if (u.name === "Write") s.writes++;
    if (!okShape && !(blocked && isTest)) {
      const why = u.name === "Read" && request ? ` (not the request its prompt named, ${named})` : "";
      s.violations.push(`${path.basename(transcript)}: ${u.name} ${file ?? JSON.stringify(u.input).slice(0, 120)}${blocked ? " (blocked)" : " (NOT BLOCKED)"}${why}`);
      violations++;
    }
  }
  for (const [other, a] of Object.entries(agents))
    if (other !== name && a.word && text.includes(a.word)) { s.violations.push(`${path.basename(transcript)}: contains the secret word of ${other}`); violations++; }
}

console.log(`Transcripts under ${root}`);
const line = (name, s) => `${s.transcripts} transcripts, ${s.reads} reads, ${s.writes} writes, ${s.blocked} blocked attempts in play, ${s.testBlocked} blocked in the isolation test, ${s.violations.length} violations`;
for (const p of Object.keys(seats)) {
  const name = `king-${p.toLowerCase()}`;
  const s = stats[name];
  console.log(s ? `  ${p.padEnd(10)} ${line(name, s)}` : `  ${p.padEnd(10)} no transcripts found`);
  for (const v of s?.violations ?? []) console.log(`      ${v}`);
}
const chars = Object.keys(charAgents);
if (chars.length > 0) {
  const seen = chars.filter(n => stats[n]);
  const total = k => seen.reduce((n, c) => n + (k === "violations" ? stats[c].violations.length : stats[c][k]), 0);
  console.log(`  Characters: ${seen.length} of ${chars.length} have transcripts: ${total("transcripts")} transcripts, ${total("reads")} reads, ${total("writes")} writes, `
    + `${total("blocked")} blocked attempts in play, ${total("testBlocked")} blocked in the isolation test, ${total("violations")} violations`);
  for (const n of seen) for (const v of stats[n].violations) console.log(`      ${agents[n].label}: ${v}`);
}
console.log(violations === 0 ? "AUDIT CLEAN: every agent touched only its own request and reply files" : `AUDIT FOUND ${violations} VIOLATIONS`);
process.exit(violations === 0 ? 0 : 1);
