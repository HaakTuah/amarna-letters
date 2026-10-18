# Simulation kit: Claude agents as the Great Kings

Plays a game with one Claude Code agent per king. It uses no API credits: the kings run as subagents in a Claude Code session. Each king is a file seat in the batch runner (`--file-seats`). The seat writes the exact text a model king would get to the king's folder and waits for a reply file. The engine validates the reply like any other orders, and the log records it, so the game replays exactly.

The whole game depends on hidden information, so each king is walled in by construction:

- It is its own agent type, `.claude/agents/king-<power>.md`, with only the Read and Write tools.
- A PreToolUse hook (`guard.js`) runs before every tool call. It allows only reading `*.request.md` and writing `*.reply.json` inside that king's folder, and blocks everything else.
- Folder names are 32 random hex digits, so no king can guess another's.
- The guard logs every attempt to `sim/kings/guard.log`, outside every king folder.
- A pre-game test (`check-isolation.js`) proves each king is blocked outside its folder.
- An audit (`audit.js`) checks every tool call in the kings' transcripts after the game.

| Script | What it does |
|---|---|
| `setup.js` | Makes the king folders, `seats.json`, the secret canary words and the agent types. Run it in one session, then start a new session so the agent types load. |
| `guard.js` | The PreToolUse hook (one per king, set in its agent file). |
| `check-isolation.js` | Passes only if every king read its own canary, was blocked at every forbidden step, and learned no other king's secret. |
| `wait.js` | For the orchestrator: waits until kings have requests waiting, or the game is over. Prints file names only. |
| `audit.js` | After the game: every tool call in every king transcript, and any violation. |
| `summarize.js` | Result, signals, sealed tablets and the message trail, from the batch runner's `--out` folder. |

`docs/SIMULATION-PROMPT.md` is the start prompt for the orchestrating session. Everything `setup.js` makes is git-ignored: `sim/kings/`, `sim/runs/` and `.claude/agents/king-*.md`.

## Kit lessons (from the run of 18 October)

The results are in `docs/ROUND-REPORT.md`, "Simulation results". For the next run:

- **Tell kings in every request that their final message must be only "done".** The agent file already says so, and it was not enough: 24 of the 280 game calls ended with a summary of the king's decision or plans, and 4 more with the reply path. Put the line in each request as well, for example "Your final message must be the single word done; say nothing about your decision." The file seat writes exactly what a model king sees, so add it as a footer only file seats get, or in the orchestrator's prompt to each king.
- **Say in each request that reply files can't be read.** The guard allows a king to read only `*.request.md`. In run 1's debrief, four kings tried to open their own earlier replies to recall their orders. The guard blocked all six attempts, and `audit.js` then counts them as violations. Run 2's debrief request said reply files are closed, and nobody tried. Say it in game requests and debriefs alike, and point kings to the record of earlier seasons in the request instead.
- **The orchestrator-leak weakness.** The walls keep kings out of each other's files, but a king's final message reaches the orchestrator, which also starts every other king. A summary of private plans there is hidden information in the one place that talks to all seven kings. Only the orchestrator's discipline keeps it from passing them on; nothing in the kit prevents it. In this run nothing was passed on, but that is a rule followed, not a wall. Until the kit enforces it, the orchestrator should check only that the reply file exists and not act on a king's final text. A structural fix is to start kings from something that returns nothing to the orchestrator.

Also: `audit.js <folder>` audits one run on its own if you copy that run's `*.meta.json` and `*.jsonl` transcripts into a folder. That keeps one run's debrief from mixing into the next run's audit.
