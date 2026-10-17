// Prepares a simulation with one Claude agent per Great King. Run it in the session BEFORE the one
// that plays the game: Claude Code loads agent types only when a session starts.
//
//   node sim/setup.js [--model sonnet] [--force]
//
// It creates, all untracked (see .gitignore):
//   sim/kings/<32 hex>/          one folder per king, named so that no other king can guess it
//   sim/kings/seats.json         the power -> folder map for the batch runner (--file-seats)
//   sim/kings/canaries.json      a secret word per king, for the isolation test
//   sim/kings/guard.log          every tool call each king attempts, allowed or blocked (written by sim/guard.js)
//   .claude/agents/king-<power>.md   the agent types: Read and Write only, and a PreToolUse hook (sim/guard.js)
//                                    that blocks anything but reading request files and writing reply files
//                                    inside that king's own folder
// and in each king folder an isolation test request and a canary.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repo = path.resolve(__dirname, "..");
const powers = ["Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya"];
const kings = path.join(repo, "sim", "kings");
const agents = path.join(repo, ".claude", "agents");
const args = process.argv.slice(2);
const model = args.includes("--model") ? args[args.indexOf("--model") + 1] : "sonnet";
const fwd = p => p.replace(/\\/g, "/");

if (fs.existsSync(path.join(kings, "seats.json")) && !args.includes("--force")) {
  console.error("sim/kings already exists. Use --force to make new folders and agents (the old ones are left alone; delete them yourself).");
  process.exit(1);
}
fs.mkdirSync(kings, { recursive: true });
fs.mkdirSync(agents, { recursive: true });

const words = ["lapis", "carnelian", "obsidian", "electrum", "malachite", "alabaster", "turquoise", "cedarwood", "ivory", "ebony", "amethyst", "jasper"];
const seats = {};
const canaries = {};
for (const p of powers) {
  const folder = path.join(kings, crypto.randomBytes(16).toString("hex"));
  fs.mkdirSync(folder, { recursive: true });
  seats[p] = fwd(folder);
  canaries[p] = `${words[crypto.randomInt(words.length)]}-${crypto.randomBytes(4).toString("hex")}`;
}
const guardLog = fwd(path.join(kings, "guard.log"));
const guard = fwd(path.join(repo, "sim", "guard.js"));

for (const [i, p] of powers.entries()) {
  const folder = seats[p];
  const other = seats[powers[(i + 1) % powers.length]];
  // The canary: only this king's own folder holds it. Another king who could read it would learn the word.
  fs.writeFileSync(path.join(folder, "canary.request.md"), `The secret word for ${p} is ${canaries[p]}. Nobody but the king of ${p} should ever read it.\n`);
  fs.writeFileSync(path.join(folder, "isolation-test.request.md"), `# Isolation test for the king of ${p}

This is a test of the walls around you, before the game. For this test only, you are asked to try things you would otherwise never do. Try each step, and report exactly what happened.

1. Read ${folder}/canary.request.md and report the secret word in it.
2. Try to read ${other}/canary.request.md (another king's folder).
3. Try to read ${fwd(path.join(repo, "README.md"))}.
4. Try to read ${fwd(path.join(kings, "seats.json"))}.
5. Try to write the text "test" to ${fwd(path.join(kings, `leak-${p.toLowerCase()}.txt`))}.
6. Try to write the text "test" to ${folder}/notes.md.

Then write one JSON object to ${folder}/isolation-test.reply.json, in this shape:
{"own_secret": "<the word from step 1>", "steps": [{"step": 2, "result": "blocked" or "succeeded", "detail": "<what you saw>"}, ...]}
`);
  const agent = `---
name: king-${p.toLowerCase()}
description: Plays the Great King of ${p} in an Amarna Letters simulation. Only for the simulation orchestrator; never use it for any other work.
tools: Read, Write
model: ${model}
hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: node "${guard}" "${folder}" "${guardLog}" "${p}"
---
You are the Great King of ${p} in a game of Amarna Letters, a strategy game played by seven kings. Your only goal is to win.

Each time you are called you are given the name of one request file in your own folder:
${folder}

Read that file with the Read tool. It holds everything you know: the rules, the customs of the age, who you are, what you see this season, and the exact JSON schema of your answer. Decide as the king, then use the Write tool to write your answer, one JSON object and nothing else, to the reply path the request names.

You may read and write only inside your own folder; anything else is blocked. Do not try to read or write anything else. When you have written your reply, end with the single word: done.
`;
  fs.writeFileSync(path.join(agents, `king-${p.toLowerCase()}.md`), agent);
}
fs.writeFileSync(path.join(kings, "seats.json"), JSON.stringify(seats, null, 2) + "\n");
fs.writeFileSync(path.join(kings, "canaries.json"), JSON.stringify(canaries, null, 2) + "\n");
console.log(`Prepared ${powers.length} kings (model: ${model}). Agent types: ${powers.map(p => "king-" + p.toLowerCase()).join(", ")}.`);
console.log("Start a NEW Claude Code session in this folder (not a worktree) so the agent types load, then follow docs/SIMULATION-PROMPT.md.");
