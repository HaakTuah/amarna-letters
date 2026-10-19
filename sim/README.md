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

## The orchestrator's rule

**Check only that the reply file exists.** A king's final message reaches the orchestrator, which also starts every other king, so anything in it is hidden information in the one place that talks to all seven kings. The orchestrator never reads a king's final text for content, never acts on it and never passes it on; it waits on `wait.js` and the reply files alone. This is a rule the orchestrator follows, not a wall the kit builds (see "Not built" below).

## Kit lessons (from the run of 18 October), and what was done

The results are in `docs/rounds/2026-10-18-sleep-and-simulation.md`, "Simulation results". What was done is Part F of the simulation-fixes round, `docs/rounds/2026-10-19-simulation-fixes.md`.

- **"Your final message must be the single word done."** The agent file already said so, and it was not enough: 24 of the 280 game calls ended with a summary of the king's decision or plans, and 4 more with the reply path. *Done:* every file-seat request now ends with a footer, `FileExchange.Footer`: "When you have written your reply file, your final message must be the single word done. Say nothing about your decision. Earlier reply files cannot be read: your record of earlier seasons is in this request." Only file seats get it; a model king called through the API sees no such line (tested in `FileSeatTests`).
- **Reply files cannot be read.** The guard lets a king read only `*.request.md`. In run 1's debrief, four kings tried to open their own earlier replies; the guard blocked all six attempts, and `audit.js` counted them as violations. Run 2's debrief request said reply files are closed, and nobody tried. *Done* for game requests by the same footer. A debrief request is written by the orchestrator, so it must end with the same footer.
- **The orchestrator-leak weakness.** The walls keep kings out of each other's files, but not out of the orchestrator's context. In the run nothing was passed on, but that was the rule above being followed. *Not built*; see below.

## Not built: a launcher that returns nothing

The structural fix is to start kings from something that returns nothing to the orchestrator. A small launcher process (for example `sim/launch.js`) would take a king and a request file name, start that king's agent itself (headless, with the king's agent type and the same guard hook), wait for the reply file, discard the agent's final message, and print only "reply written" or "no reply". The orchestrator would call the launcher instead of starting kings directly, so no king's words ever reach a context that starts other kings. It needs a way to start an agent outside the orchestrating session (a signed-in headless Claude Code CLI) and a per-launch transcript for `audit.js`. Until it exists, the orchestrator's rule above is what keeps the kings apart.

Also: `audit.js <folder>` audits one run on its own if you copy that run's `*.meta.json` and `*.jsonl` transcripts into a folder. That keeps one run's debrief from mixing into the next run's audit.
