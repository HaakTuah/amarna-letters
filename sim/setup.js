// Prepares a simulation with one Claude agent per Great King and, for the seeds to be played, one per character (every
// envoy, spy and would-be servant in the seed's pool). Run it in the session BEFORE the one that plays the games: Claude
// Code loads agent types only when a session starts.
//
//   node sim/setup.js [--seeds 7,15] [--model sonnet] [--character-model haiku] [--force] [--kit DIR]
//
// Without --seeds it prepares the kings only (as for local play). It creates, all untracked (see .gitignore):
//   sim/kings/<32 hex>/          one folder per king, named so that no other seat can guess it
//   sim/kings/seats.json         the power -> folder map for the batch runner (--file-seats)
//   sim/kings/canaries.json      a secret word per king, for the isolation test
//   sim/kings/isolation-steps.json   each king's isolation test, step by step (for check-isolation.js)
//   sim/kings/guard.log          every tool call each king attempts, allowed or blocked (written by sim/guard.js)
//   .claude/agents/king-<power>.md   the kings' agent types
//   sim/characters/<32 hex>/     one folder per character of each seed
//   sim/characters/seed-<S>.json the character id -> folder map for the batch runner (--file-characters), with the seed
//   sim/characters/agents.json   agent type -> its seed, character id, name and folder (for wait.js, audit.js, check-isolation.js)
//   sim/characters/canaries.json a secret word per character agent
//   sim/characters/isolation-steps.json   each character agent's isolation test, step by step
//   sim/characters/guard.log     the characters' guard log
//   .claude/agents/char-<8 hex>.md   the characters' agent types, named so that the name reveals nothing
// Every agent type has the Read and Write tools only, and a PreToolUse hook (sim/guard.js) that blocks anything but reading
// request files and writing reply files inside its own folder. Each folder gets an isolation test request and a canary,
// and each agent type asks its agent to take that test, every step of it (see sim/isolation.js).
// With --kit DIR it makes a scratch kit instead (DIR/kings, DIR/characters and the agent types in DIR/agents), for
// testing the kit with check-isolation.js and stub-isolation.js; Claude Code never loads its agent types.
// The characters of a seed are read from the engine (the batch runner's --list-characters): the pool is fixed when the
// game is made, so every character that can ever serve as an envoy or a spy in that game gets its agent now.
// With --force, the previous kit (both folders and the agent types it made) is first moved to sim/runs/setup-<time>/.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const isolation = require("./isolation");

const repo = path.resolve(__dirname, "..");
const powers = ["Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya"];
const args = process.argv.slice(2);
const kit = isolation.kitPaths(args);
const { kings, characters, agents } = kit;
const opt = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const model = opt("--model", "sonnet");
const characterModel = opt("--character-model", "haiku");
const seeds = (opt("--seeds", "") ?? "").split(",").map(s => s.trim()).filter(Boolean);
const fwd = p => p.replace(/\\/g, "/");
const hex = n => crypto.randomBytes(n).toString("hex");
const guard = fwd(path.join(repo, "sim", "guard.js"));
const words = ["lapis", "carnelian", "obsidian", "electrum", "malachite", "alabaster", "turquoise", "cedarwood", "ivory", "ebony", "amethyst", "jasper"];
const canary = () => `${words[crypto.randomInt(words.length)]}-${hex(4)}`;

if (seeds.some(s => !/^\d+$/.test(s))) { console.error("--seeds takes seed numbers, for example --seeds 7,15"); process.exit(1); }
const made = [path.join(kings, "seats.json"), path.join(characters, "agents.json")].filter(f => fs.existsSync(f));
if (made.length > 0 && !args.includes("--force")) {
  console.error(`A kit already exists (${fwd(path.dirname(made[0]))}). Use --force to move it to ${fwd(kit.runs)}/setup-<time>/ and make a new one.`);
  process.exit(1);
}

// Read every seed's pool before touching anything, so a failure leaves the old kit in place.
const pools = {};
for (const seed of seeds) {
  const out = execFileSync("dotnet", ["run", "--project", path.join(repo, "src", "Amarna.Batch"), "--", "--seed", seed, "--list-characters"], { cwd: repo, encoding: "utf8" });
  const list = JSON.parse(out.slice(out.indexOf("{")));
  if (list.seed !== seed || !Array.isArray(list.characters) || list.characters.length === 0) { console.error(`Could not read the characters of seed ${seed}.`); process.exit(1); }
  pools[seed] = list.characters;
}

// Move the previous kit aside, never deleting it: its folders hold the requests and replies of earlier games.
if (args.includes("--force")) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const aside = path.join(kit.runs, `setup-${stamp}`);
  fs.mkdirSync(path.join(aside, "agents"), { recursive: true });
  for (const dir of [kings, characters]) if (fs.existsSync(dir)) fs.renameSync(dir, path.join(aside, path.basename(dir)));
  if (fs.existsSync(agents))
    for (const f of fs.readdirSync(agents).filter(f => /^(king|char)-[\w-]+\.md$/.test(f))) fs.renameSync(path.join(agents, f), path.join(aside, "agents", f));
  console.log(`Moved the previous kit to ${fwd(aside)}/.`);
}
fs.mkdirSync(kings, { recursive: true });
fs.mkdirSync(agents, { recursive: true });

function hook(folder, log, label) {
  return `hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: node "${guard}" "${folder}" "${log}" "${label}"`;
}

// The isolation test of one agent: its request in its folder, and its steps for check-isolation.js.
const testSteps = { kings: {}, characters: {} };
function isolationTest(kind, label, who, folder, others, mapFile, leakFile) {
  const list = isolation.steps({ folder, others, map: mapFile, leak: leakFile });
  testSteps[kind][label] = { who, steps: list };
  fs.writeFileSync(path.join(folder, "isolation-test.request.md"), isolation.request(who, folder, list));
}

// What every agent type says about its folder, and the test its definition asks it to take.
const walls = `You may read and write only inside your own folder; anything else is blocked. In the game, never try to read or write anything else.

${isolation.clause}

When you have written your reply, end with the single word: done.`;

// Kings.
const seats = {};
const kingWords = {};
for (const p of powers) {
  const folder = path.join(kings, hex(16));
  fs.mkdirSync(folder, { recursive: true });
  seats[p] = fwd(folder);
  kingWords[p] = canary();
}
const kingLog = fwd(path.join(kings, "guard.log"));

// Characters: one folder and one agent per character of each seed.
const charAgents = {};
const charWords = {};
for (const seed of seeds) {
  const map = { seed };
  for (const c of pools[seed]) {
    let name;
    do name = `char-${hex(4)}`; while (charAgents[name]);
    const folder = fwd(path.join(characters, hex(16)));
    fs.mkdirSync(folder, { recursive: true });
    charAgents[name] = { seed, id: c.id, name: c.name, startsAs: c.startsAs, folder };
    charWords[name] = canary();
    map[c.id] = folder;
  }
  fs.writeFileSync(path.join(characters, `seed-${seed}.json`), JSON.stringify(map, null, 2) + "\n");
}
const charLog = fwd(path.join(characters, "guard.log"));
const charNames = Object.keys(charAgents);

for (const [i, p] of powers.entries()) {
  const folder = seats[p];
  const other = seats[powers[(i + 1) % powers.length]];
  const others = [`${other}/canary.request.md`];
  // A king also tries a character's folder, when there are characters.
  if (charNames.length > 0) others.push(`${charAgents[charNames[i % charNames.length]].folder}/canary.request.md`);
  // The canary: only this king's own folder holds it. Another seat that could read it would learn the word.
  fs.writeFileSync(path.join(folder, "canary.request.md"), `The secret word for ${p} is ${kingWords[p]}. Nobody but the king of ${p} should ever read it.\n`);
  isolationTest("kings", p, `the king of ${p}`, folder, others, path.join(kings, "seats.json"), path.join(kings, `leak-${p.toLowerCase()}.txt`));
  fs.writeFileSync(path.join(agents, `king-${p.toLowerCase()}.md`), `---
name: king-${p.toLowerCase()}
description: Plays the Great King of ${p} in an Amarna Letters simulation. Only for the simulation orchestrator; never use it for any other work.
tools: Read, Write
model: ${model}
${hook(folder, kingLog, p)}
---
You are the Great King of ${p} in a game of Amarna Letters, a strategy game played by seven kings. Your only goal is to win.

Each time you are called you are given the name of one request file in your own folder:
${folder}

Read that file with the Read tool. It holds everything you know: the rules, the customs of the age, who you are, what you see this season, and the exact JSON schema of your answer. Decide as the king, then use the Write tool to write your answer, one JSON object and nothing else, to the reply path the request names.

${walls}
`);
}

for (const [i, name] of charNames.entries()) {
  const { folder } = charAgents[name];
  const other = charAgents[charNames[(i + 1) % charNames.length]].folder;
  const others = charNames.length > 1 ? [`${other}/canary.request.md`] : [];
  others.push(`${seats[powers[i % powers.length]]}/canary.request.md`);
  fs.writeFileSync(path.join(folder, "canary.request.md"), `The secret word for ${name} is ${charWords[name]}. Nobody else should ever read it.\n`);
  isolationTest("characters", name, name, folder, others, path.join(characters, "agents.json"), path.join(characters, `leak-${name}.txt`));
  fs.writeFileSync(path.join(agents, `${name}.md`), `---
name: ${name}
description: Plays one person (an envoy, spy or would-be servant) in an Amarna Letters simulation. Only for the simulation orchestrator; never use it for any other work.
tools: Read, Write
model: ${characterModel}
${hook(folder, charLog, name)}
---
You are one of the people of the Amarna age in a game of Amarna Letters: a messenger, envoy, agent or would-be servant of the Great Kings. Who you are, what you remember and what is in front of you are in each request.

Each time you are called you are given the name of one request file in your own folder:
${folder}

Read that file with the Read tool. It holds everything you know. Decide as yourself, then use the Write tool to write your answer, one JSON object and nothing else, to the reply path the request names.

${walls}
`);
}

fs.writeFileSync(path.join(kings, "seats.json"), JSON.stringify(seats, null, 2) + "\n");
fs.writeFileSync(path.join(kings, "canaries.json"), JSON.stringify(kingWords, null, 2) + "\n");
fs.writeFileSync(path.join(kings, "isolation-steps.json"), JSON.stringify(testSteps.kings, null, 2) + "\n");
if (seeds.length > 0) {
  fs.writeFileSync(path.join(characters, "agents.json"), JSON.stringify(charAgents, null, 2) + "\n");
  fs.writeFileSync(path.join(characters, "canaries.json"), JSON.stringify(charWords, null, 2) + "\n");
  fs.writeFileSync(path.join(characters, "isolation-steps.json"), JSON.stringify(testSteps.characters, null, 2) + "\n");
}
console.log(`Prepared ${powers.length} kings (model: ${model}): ${powers.map(p => "king-" + p.toLowerCase()).join(", ")}.`);
for (const seed of seeds)
  console.log(`Prepared ${pools[seed].length} characters of seed ${seed} (model: ${characterModel}): ${fwd(path.join(characters, `seed-${seed}.json`))}.`);
if (kit.scratch) console.log(`A scratch kit in ${fwd(path.dirname(kings))}: test it with node sim/check-isolation.js --kit and node sim/stub-isolation.js --kit; no agent can be started on it.`);
else console.log("Start a NEW Claude Code session in this folder (not a worktree) so the agent types load, then follow docs/SIMULATION-PROMPT.md.");
