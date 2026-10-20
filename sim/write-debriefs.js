// Writes the debriefs after a game (docs/SIMULATION-PROMPT.md, steps 4 and 5): debrief.request.md in the folder of every
// king, and of every character of the seed that answered at least one game request. Each asks the agent to reread its own
// earlier request files, listed by name, and to write debrief.reply.json in the shape the request gives: what was unclear,
// what it misunderstood and what was missing (a character also says why it chose as it did), and, for kings and
// characters alike, the question the builder rules ask of every debrief since 20 October 2026 ("No model games until the
// build order is done"): "What did you find most and least interesting about playing this role?" A role an agent finds
// dull probably has too few real choices, so the answers are design data. Every request ends with the footer every game
// request carries (FileExchange.Footer; a test in tests/Amarna.Game.Tests checks the two stay the same).
//
//   node sim/write-debriefs.js --seed S [--kings-only] [--kit DIR]
//
//   --seed S       the characters of seed S, as sim/characters/agents.json names them (and every king)
//   --kings-only   the kings only: local play, or a game without file characters (no --seed needed)
//   --kit DIR      a scratch kit made by setup.js --kit DIR, for testing
//
// It writes nothing but debrief.request.md in the agents' own folders (an earlier one is replaced), reads no reply and
// starts no agent. An agent with no game request in its folder is left out. It prints, as one JSON line, the agents to
// start, each with the request to name in its prompt:
//   [{"agent":"king-egypt","request":"debrief.request.md"},{"agent":"char-5f0c2a91","request":"debrief.request.md"}, ...]
// Start each with: "Your request file is debrief.request.md in your folder. Read it, and write your reply where it says."
const fs = require("fs");
const path = require("path");
const isolation = require("./isolation");

const args = process.argv.slice(2);
const { kings, characters } = isolation.kitPaths(args);
const opt = name => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const seed = opt("--seed");
const kingsOnly = args.includes("--kings-only");
if (!kingsOnly && !/^\d+$/.test(seed ?? "")) {
  console.error("usage: node sim/write-debriefs.js --seed S [--kit DIR], or --kings-only");
  process.exit(1);
}

// The footer of every game request (FileExchange.Footer, word for word).
const FOOTER = "When you have written your reply file, your final message must be the single word done. Say nothing about your decision. Earlier reply files cannot be read: your record of earlier seasons is in this request.";

// The question of every debrief, kings' and characters' alike, word for word as the builder rules give it.
const QUESTION = "What did you find most and least interesting about playing this role?";

const fwd = p => p.replace(/\\/g, "/");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));

// The agent's own game requests, oldest first ("t3_orders_Egypt.request.md", a retry "t3_orders_Egypt.retry.request.md").
const requests = folder => fs.existsSync(folder)
  ? fs.readdirSync(folder).filter(f => /^t\d+_.*\.request\.md$/.test(f)).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10) || a.localeCompare(b))
  : [];

const interesting = `"interesting": {"most": "what you found most interesting about playing this role, and why", "least": "what you found least interesting about playing this role, and why"}`;

function debrief({ folder, files, purpose, record, shape, extra }) {
  return `# Debrief after the game

The game is over. This is not a game request: nothing you write now changes the game. ${purpose}

Your own earlier request files, in this folder, are: ${files.join(", ")}.
Read as many of them as you need; ${record} Then write one JSON object to ${fwd(folder)}/debrief.reply.json, in this shape:
${shape}
${extra}In "interesting", answer this question: "${QUESTION}" There is no right answer: say what you found, as you found it.

${FOOTER}
`;
}

const started = [];
const seats = read(path.join(kings, "seats.json"));
for (const [power, folder] of Object.entries(seats)) {
  const files = requests(folder);
  if (files.length === 0) { console.error(`king-${power.toLowerCase()}: no game request in its folder, left out`); continue; }
  fs.writeFileSync(path.join(folder, "debrief.request.md"), debrief({
    folder, files,
    purpose: "We want to improve what a king is shown each season (the seat view and the rulebook), and to learn what the role is like to play.",
    record: "the last one holds your record of the earlier seasons.",
    shape: `{"unclear": ["what in the seat view or the rules was unclear"], "misunderstood": ["what you think you misunderstood, and what made you misunderstand it"], "missing": ["what you needed to know and were not shown"], ${interesting}}`,
    extra: "",
  }));
  started.push({ agent: `king-${power.toLowerCase()}`, request: "debrief.request.md" });
}

if (!kingsOnly) {
  const agents = read(path.join(characters, "agents.json"));
  for (const [agent, c] of Object.entries(agents)) {
    if (String(c.seed) !== seed) continue;
    const files = requests(c.folder);
    if (files.length === 0) continue;
    fs.writeFileSync(path.join(c.folder, "debrief.request.md"), debrief({
      folder: c.folder, files,
      purpose: "We want to understand how you decided, to improve what you are shown, and to learn what the role is like to play.",
      // A character's last request may be a memory summary or a report: each holds what it remembered when it was written.
      record: "each holds what you remembered when it was written, and what was in front of you then.",
      shape: `{"unclear": ["what in what you were shown was unclear"], "misunderstood": ["what you think you misunderstood"], "missing": ["what you needed to know and were not shown"], "choices": [{"request": "<file name>", "why": "<a sentence or two>"}], ${interesting}}`,
      extra: `In "choices", for each time you carried gold, were offered a gift or a post, or reported home, say why you chose as you did and what you told or left out.\n`,
    }));
    started.push({ agent, request: "debrief.request.md" });
  }
}

const count = prefix => started.filter(s => s.agent.startsWith(prefix)).length;
console.error(`${started.length} debriefs written: ${count("king-")} kings, ${count("char-")} characters`);
console.log(JSON.stringify(started));
