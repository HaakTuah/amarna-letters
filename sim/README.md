# Simulation kit: Claude agents as the Great Kings and their envoys

Plays a game with one Claude Code agent per king and, since item 4 of the Build order, one per character: every envoy,
spy and would-be servant in the seed's pool. It uses no API credits: every seat runs as a subagent in a Claude Code
session. Each king is a file seat in the batch runner (`--file-seats`), each character a file character
(`--file-characters`). A seat writes the exact text a model king or model character would get to its own folder and
waits for a reply file. The engine validates the reply like any other decision, and the log records it, so the game
replays exactly. City-states stay scripts and the narrator stays the template.

The whole game depends on hidden information, so every agent is walled in by construction:

- It is its own agent type with only the Read and Write tools: `.claude/agents/king-<power>.md` for a king,
  `.claude/agents/char-<8 hex>.md` for a character (a name that says nothing about who it is).
- A PreToolUse hook (`guard.js`) runs before every tool call. It allows only reading `*.request.md` and writing
  `*.reply.json` inside that agent's own folder, and blocks everything else.
- Folder names are 32 random hex digits, so no agent can guess another's.
- The guard logs every attempt to `sim/kings/guard.log` or `sim/characters/guard.log`, outside every agent's folder.
- A pre-game test (`check-isolation.js`) proves each agent is blocked outside its folder; `--dry` checks the same walls
  without starting any agent.
- An audit (`audit.js`) checks every tool call in the agents' transcripts after the game.

| Script | What it does |
|---|---|
| `setup.js` | `--seeds 7,15`: makes the king folders and, for each seed, a folder per character, the maps for the batch runner (`sim/kings/seats.json`, `sim/characters/seed-<S>.json`), `sim/characters/agents.json`, the secret canary words and the agent types (kings on Sonnet, characters on Haiku). It reads each seed's characters from the engine (`--list-characters`). Without `--seeds` it makes the kings only. Run it in one session, then start a new session so the agent types load. `--force` first moves the previous kit to `sim/runs/setup-<time>/`. |
| `guard.js` | The PreToolUse hook (one per agent, set in its agent file). |
| `check-isolation.js` | Passes only if every agent read its own canary, was blocked at every forbidden step, and learned no other agent's secret. `--dry` runs every agent's own hook on the isolation test's steps and the obvious ways around them, with no agent started. |
| `wait.js` | For the orchestrator: waits until seats have requests waiting, or the game is over. Prints the agent type to start and the request file name for each, nothing else. `--seed S` watches only that seed's characters. |
| `audit.js` | After the game: every tool call in every king and character transcript, and any violation. |
| `summarize.js` | Result, signals, sealed tablets, the message trail, each seat's sleep and what woke it, the reopen rate, request sizes by kind, and the characters' decisions beside the script's with the same traits, from the batch runner's `--out` folder. |
| `stub-replier.js` | For testing the plumbing only: answers requests with the plainest valid reply, as the orchestrator's loop would start agents (`--orchestrate`), or straight from the folders. Never in a real game. |

`docs/SIMULATION-PROMPT.md` is the start prompt for the orchestrating session. Everything `setup.js` makes is
git-ignored: `sim/kings/`, `sim/characters/`, `sim/runs/` and `.claude/agents/king-*.md` and `char-*.md`. The first
simulation's files (its king folders, guard log, seat map, canaries, agent types and both runs) are in
`sim/runs/first-simulation/`.

## The orchestrator's rule

**Check only that the reply file exists.** An agent's final message reaches the orchestrator, which also starts every
other agent, so anything in it is hidden information in the one place that talks to all seven kings and every
character. The orchestrator never reads an agent's final text for content, never acts on it and never passes it on; it
waits on `wait.js` and the reply files alone. This is a rule the orchestrator follows, not a wall the kit builds (see
"Not built" below). It holds for characters exactly as for kings: a character's final message could carry what a
king told it in an audience.

## The characters' comparison

Every decision a character makes is logged beside what the script mind with the same traits decides in the same
situation (the log's `shadow` lines; `ScriptMind` draws no dice of the game's own, so this changes nothing). The batch
log's seat report is followed by a table of both (gold kept and how much, inventories swapped, gifts and posts taken
or refused, commitments, what reports hide or contradict, spies' reports, pitches, and the same per character) and the
size of every kind of request. `summarize.js` prints the same, plus every decision where the two differ, with both
texts, for a reader to check. The checks of what a report hides read words, not meaning (`CharacterChecks` in
`src/Amarna.Game`): they flag a gift taken and never mentioned, a detention, gold kept on the way out, a threat to the
lord that the report drops, a declined offer of service, a seal claimed that never happened, a spy passing on its
secret masters' words and observations it left out. Read the flagged reports before counting them as lies.

## Kit lessons (from the run of 18 October), and what was done

The results are in `docs/rounds/2026-10-18-sleep-and-simulation.md`, "Simulation results". What was done is Part F of
the simulation-fixes round, `docs/rounds/2026-10-19-simulation-fixes.md`.

- **"Your final message must be the single word done."** The agent file already said so, and it was not enough: 24 of
  the 280 game calls ended with a summary of the king's decision or plans, and 4 more with the reply path. *Done:*
  every file-seat request now ends with a footer, `FileExchange.Footer`: "When you have written your reply file, your
  final message must be the single word done. Say nothing about your decision. Earlier reply files cannot be read:
  your record of earlier seasons is in this request." Only file seats and file characters get it; a model called
  through the API sees no such line (tested in `FileSeatTests`).
- **Reply files cannot be read.** The guard lets an agent read only `*.request.md`. In run 1's debrief, four kings
  tried to open their own earlier replies; the guard blocked all six attempts, and `audit.js` counted them as
  violations. Run 2's debrief request said reply files are closed, and nobody tried. *Done* for game requests by the
  same footer. A debrief request is written by the orchestrator, so it must end with the same footer.
- **The orchestrator-leak weakness.** The walls keep agents out of each other's files, but not out of the
  orchestrator's context. In the run nothing was passed on, but that was the rule above being followed. *Not built*;
  see below.

## Not built: a launcher that returns nothing

The structural fix is to start agents from something that returns nothing to the orchestrator. A small launcher
process (for example `sim/launch.js`) would take an agent type and a request file name, start that agent itself
(headless, with its agent type and the same guard hook), wait for the reply file, discard the agent's final message,
and print only "reply written" or "no reply". The orchestrator would call the launcher instead of starting agents
directly, so no seat's words ever reach a context that starts other seats. It needs a way to start an agent outside
the orchestrating session (a signed-in headless Claude Code CLI) and a per-launch transcript for `audit.js`. Until it
exists, the orchestrator's rule above is what keeps the seats apart.

Also: `audit.js <folder>` audits one run on its own if you copy that run's `*.meta.json` and `*.jsonl` transcripts into
a folder. That keeps one run's debrief from mixing into the next run's audit.
