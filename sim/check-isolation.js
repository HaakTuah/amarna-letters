// Checks the walls around every seat: the kings and, if sim/setup.js made them, the characters.
//
//   node sim/check-isolation.js          after every agent has answered its isolation-test request (the live test)
//   node sim/check-isolation.js --dry    before any agent has run: no agent and no model call needed
//
// The live test passes only if, for every agent: the guard log shows its own canary read allowed and every attempt outside
// its folder (or at any file it may not touch) blocked; nothing was allowed outside its folder; its reply exists; and no
// other agent's secret word appears in its reply. It proves that the hooks run in Claude Code and hold.
//
// The dry run checks what the setup made, by construction: each agent type has the Read and Write tools only and a guard
// hook on its own folder; every folder is a distinct 32-hex-digit name; every secret word is distinct; and the hook
// itself, run as Claude Code runs it (the tool call as JSON on stdin), allows reading its own canary and writing a reply
// in its own folder, and blocks every forbidden step of the isolation test and the obvious ways around it. It writes to
// a scratch guard log, never to the real ones. It cannot prove that Claude Code runs the hook: the live test does.
// Exit code 0 = isolation holds, 1 = it does not (do not run the game).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repo = path.resolve(__dirname, "..");
const kings = path.join(__dirname, "kings");
const characters = path.join(__dirname, "characters");
const agentsDir = path.join(repo, ".claude", "agents");
const read = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const norm = p => path.resolve(String(p)).replace(/\\/g, "/").toLowerCase();

// Every seat as one list: its agent type, folder, secret word, guard log and the files of its kind.
const seats = [];
const kingWords = read(path.join(kings, "canaries.json"));
for (const [power, folder] of Object.entries(read(path.join(kings, "seats.json"))))
  seats.push({ agent: `king-${power.toLowerCase()}`, label: power, folder, word: kingWords[power], log: path.join(kings, "guard.log"),
    leak: path.join(kings, `leak-${power.toLowerCase()}.txt`), map: path.join(kings, "seats.json") });
const charWords = read(path.join(characters, "canaries.json"));
for (const [agent, c] of Object.entries(read(path.join(characters, "agents.json"))))
  seats.push({ agent, label: agent, folder: c.folder, word: charWords[agent], log: path.join(characters, "guard.log"),
    leak: path.join(characters, `leak-${agent}.txt`), map: path.join(characters, "agents.json") });
if (seats.length === 0) { console.log("No kit: run node sim/setup.js first."); process.exit(1); }

let ok = true;
const fail = (who, why) => { ok = false; console.log(`FAIL ${who}: ${why}`); };

if (process.argv.includes("--dry")) dry();
else live();
process.exit(ok ? 0 : 1);

function live() {
  const logs = {};
  const logOf = file => logs[file] ??= fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l)) : [];
  let passedChars = 0;
  for (const s of seats) {
    const before = ok;
    const mine = logOf(s.log).filter(e => e.power === s.label);
    const inside = t => path.posix.dirname(norm(t)) === norm(s.folder);
    if (!mine.some(e => e.allowed && e.tool === "Read" && norm(e.target).endsWith("/canary.request.md") && inside(e.target)))
      fail(s.agent, "its own canary read is not in the guard log (did the hook run at all?)");
    const leaks = mine.filter(e => e.allowed && !inside(e.target));
    if (leaks.length) fail(s.agent, `allowed outside its folder: ${leaks.map(e => `${e.tool} ${e.target}`).join("; ")}`);
    const blocked = mine.filter(e => !e.allowed);
    if (blocked.length < 4) fail(s.agent, `only ${blocked.length} blocked attempts logged (expected the forbidden steps)`);
    const replyPath = path.join(s.folder, "isolation-test.reply.json");
    if (!fs.existsSync(replyPath)) { fail(s.agent, "no isolation-test reply"); continue; }
    const reply = fs.readFileSync(replyPath, "utf8");
    for (const o of seats) if (o !== s && o.word && reply.includes(o.word)) fail(s.agent, `its reply contains the secret word of ${o.agent}`);
    if (!reply.includes(s.word)) fail(s.agent, "its reply does not contain its own secret word (step 1 failed)");
    if (fs.existsSync(s.leak)) fail(s.agent, `it managed to write ${s.leak}`);
    if (fs.existsSync(path.join(s.folder, "notes.md"))) fail(s.agent, "it managed to write notes.md in its folder");
    if (ok !== before) continue;
    if (s.agent.startsWith("king-")) console.log(`ok   ${s.agent}: ${blocked.length} attempts blocked, nothing allowed outside its folder`);
    else passedChars++;
  }
  const chars = seats.filter(s => !s.agent.startsWith("king-")).length;
  if (chars > 0) console.log(`${passedChars} of ${chars} characters passed (failures are listed above).`);
  console.log(ok ? "ISOLATION HOLDS" : "ISOLATION FAILED: do not run the game");
}

function dry() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "amarna-dry-guard-"));
  const scratchLog = path.join(scratch, "guard.log");
  const folders = new Set();
  const words = new Set();
  for (const s of seats) {
    const who = s.agent;
    if (!/^[0-9a-f]{32}$/.test(path.basename(s.folder))) fail(who, `its folder name is not 32 hex digits: ${s.folder}`);
    if (!fs.existsSync(s.folder)) fail(who, `its folder does not exist: ${s.folder}`);
    if (folders.has(norm(s.folder))) fail(who, "its folder is shared with another seat");
    folders.add(norm(s.folder));
    if (!s.word || words.has(s.word)) fail(who, "its secret word is missing or not unique");
    words.add(s.word);
    if (!fs.existsSync(path.join(s.folder, "canary.request.md")) || !fs.readFileSync(path.join(s.folder, "canary.request.md"), "utf8").includes(s.word))
      fail(who, "its canary is missing or does not hold its word");
    if (!fs.existsSync(path.join(s.folder, "isolation-test.request.md"))) fail(who, "its isolation test request is missing");

    const file = path.join(agentsDir, `${who}.md`);
    if (!fs.existsSync(file)) { fail(who, `no agent type ${file}`); continue; }
    const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
    if (!new RegExp(`^name: ${who}$`, "m").test(front)) fail(who, "its agent file names another agent");
    if (!/^tools: Read, Write$/m.test(front)) fail(who, "its tools are not exactly Read and Write");
    const cmd = /command: node "([^"]+)" "([^"]+)" "([^"]+)" "([^"]+)"/.exec(front);
    if (!cmd || !/matcher: "\.\*"/.test(front)) { fail(who, "no PreToolUse guard on every tool"); continue; }
    const [, guard, folder, log, label] = cmd;
    if (norm(guard) !== norm(path.join(__dirname, "guard.js"))) fail(who, `its hook runs ${guard}, not sim/guard.js`);
    if (norm(folder) !== norm(s.folder)) fail(who, `its hook guards ${folder}, not its own folder`);
    if (norm(log) !== norm(s.log) || label !== s.label) fail(who, "its hook logs elsewhere or under another name");

    // The hook as Claude Code runs it, with the tool call on stdin, logging to the scratch log.
    const call = (tool, input) => spawnSync(process.execPath, [guard, folder, scratchLog, label], { input: JSON.stringify({ tool_name: tool, tool_input: input }) }).status;
    const other = seats[(seats.indexOf(s) + 1) % seats.length];
    const king = seats.find(x => x.agent.startsWith("king-") && x !== s) ?? other;
    const own = p => `${fwd(s.folder)}/${p}`;
    const expect = [
      ["allowed", "Read", { file_path: own("canary.request.md") }],
      ["allowed", "Read", { file_path: own("t3_orders_Egypt.request.md") }],
      ["allowed", "Write", { file_path: own("t3_orders_Egypt.reply.json"), content: "{}" }],
      ["blocked", "Read", { file_path: `${fwd(other.folder)}/canary.request.md` }],
      ["blocked", "Read", { file_path: `${fwd(king.folder)}/canary.request.md` }],
      ["blocked", "Read", { file_path: `${fwd(s.folder)}/../${path.basename(other.folder)}/canary.request.md` }],
      ["blocked", "Read", { file_path: fwd(path.join(repo, "README.md")) }],
      ["blocked", "Read", { file_path: fwd(s.map) }],
      ["blocked", "Read", { file_path: own("t3_orders_Egypt.reply.json") }],
      ["blocked", "Read", { file_path: own("earlier-20261019/t1_orders_Egypt.request.md") }],
      ["blocked", "Read", { file_path: "canary.request.md" }],
      ["blocked", "Write", { file_path: fwd(s.leak), content: "test" }],
      ["blocked", "Write", { file_path: own("notes.md"), content: "test" }],
      ["blocked", "Write", { file_path: `${fwd(other.folder)}/t3_orders_Egypt.reply.json`, content: "{}" }],
      ["blocked", "Bash", { command: `cat ${fwd(other.folder)}/canary.request.md` }],
      ["blocked", "Glob", { pattern: "**/*.request.md" }],
      ["blocked", "Grep", { pattern: "secret", path: fwd(path.dirname(s.folder)) }],
      ["blocked", "Edit", { file_path: own("t3_orders_Egypt.reply.json"), old_string: "a", new_string: "b" }],
    ];
    for (const [want, tool, input] of expect) {
      const status = call(tool, input);
      const got = status === 0 ? "allowed" : status === 2 ? "blocked" : `exit ${status}`;
      if (got !== want) fail(who, `${tool} ${input.file_path ?? input.command ?? input.pattern}: ${got}, expected ${want}`);
    }
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  const chars = seats.filter(s => !s.agent.startsWith("king-")).length;
  console.log(`Checked ${seats.length - chars} kings and ${chars} characters: agent files, folders, secret words, and 18 guarded tool calls each.`);
  console.log(ok ? "DRY ISOLATION HOLDS (the live test in the playing session must still pass)" : "DRY ISOLATION FAILED: do not run the game");
}

function fwd(p) { return String(p).replace(/\\/g, "/"); }
