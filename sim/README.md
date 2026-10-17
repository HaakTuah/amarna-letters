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
