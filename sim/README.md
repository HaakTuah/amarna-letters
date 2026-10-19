# Simulation kit: Claude agents as the Great Kings and their envoys

Plays a game with one Claude Code agent per king and, since item 4 of the Build order, one per character: every envoy,
spy and would-be servant in the seed's pool. It uses no API credits: every seat runs as a subagent in a Claude Code
session. Each king is a file seat in the batch runner (`--file-seats`), each character a file character
(`--file-characters`). A seat writes the exact text a model king or model character would get to its own folder and
waits for a reply file. The engine validates the reply like any other decision, and the log records it, so the game
replays exactly. City-states stay scripts and the narrator stays the template. The same king agents also play against
you in the web app on your own computer: see "Local play" below.

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
| `check-isolation.js` | Passes only if every agent read its own canary, was blocked at every forbidden step, and learned no other agent's secret. `--dry` runs every agent's own hook on the isolation test's steps and the obvious ways around them, with no agent started. `--kings` checks the kings only; `--since TIME` counts only what the live test did from that time on. |
| `wait.js` | For the orchestrator: waits until seats have requests waiting, or the game is over. Prints the agent type to start and the request file name for each, nothing else. `--seed S` watches only that seed's characters. `--play` is for local play: the kings only, until the bridge stops. |
| `audit.js` | After the game: every tool call in every king and character transcript, and any violation. In play an agent may read only the request file its prompt named (in a debrief, any request file of its own). |
| `summarize.js` | Result, signals, sealed tablets, the message trail, each seat's sleep and what woke it, the reopen rate, request sizes by kind, and the characters' decisions beside the script's with the same traits, from the batch runner's `--out` folder. |
| `stub-replier.js` | For testing the plumbing only: answers requests with the plainest valid reply, as the orchestrator's loop would start agents (`--orchestrate`), or straight from the folders. `--play` does the same for local play. Never in a real game. |
| `bridge.js` | Local play (below): the small server through which the locally run web app hands each request to a king played by a local agent, and gets the reply back. |

`docs/SIMULATION-PROMPT.md` is the start prompt for the orchestrating session; `docs/PLAY-PROMPT.md` is the one for
local play. Everything `setup.js` makes is
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

## Local play

Local play on a Claude subscription: you play one king in the web app, run on your own computer, and the other kings
are played by the same guarded, isolated king agents as in the simulation, answered in a Claude Code session on your
Claude subscription instead of through paid API calls. For your own games only: games other people play use the
bring-your-own-key API path (the Standard preset and its kin).

**How it fits together.** The web app runs the whole game in the browser, as always. A king set to **Local agent** is a
file seat whose files are written by `sim/bridge.js`, a small server on this computer, since a web page cannot write
files: for each decision the page sends the bridge the request text (exactly a file seat's: the same rules, view,
schema and footer), the bridge writes it as `<name>.request.md` into that king's own folder, and hands the page the
`<name>.reply.json` its agent writes. The orchestrating Claude Code session, started from `docs/PLAY-PROMPT.md`, waits on
the folders with `wait.js --play` and starts the king agents exactly as in the simulation, under the same orchestrator's
rule. Envoys, spies and the narrator are scripts. Every exchange is logged as a call, so the game saves and replays
exactly like any other.

**Isolation, as in the simulation.** One agent type per king with only Read and Write, the guard hook that blocks any
path outside its own folder, folder names of 32 random hex digits, and a pre-game check: `check-isolation.js --dry
--kings` with no agent started, then the live isolation test of the seven kings in the playing session
(`check-isolation.js --kings --since <time>`). The bridge never tells the page a folder's name: the page names a king,
and the bridge knows his folder. It listens on this computer only (127.0.0.1 and ::1) and answers only pages served from
this computer, so a web site you visit cannot reach it. It is quiet by default: which kings are asked would tell you
which kings are awake (`--verbose` prints every request, for debugging).

**What you can see that a king cannot.** The orchestrating session shows which king agents it starts, so you can tell
which kings were woken; the folders under `sim/kings/` hold the other kings' requests; and the god view and "Reveal
all" in the game show everything, as in any game. None of it reaches the other kings. Look away if you want a fair
game.

**Sleeping kings keep usage down.** Sleeping seats are on by default: after its orders a king sleeps until something
concerns it (an envoy at the door, troops at the border, the season it named), so usage grows with events, not with
seasons. A woken king's orders call took about 44,000 agent tokens and an audience about 17,000 in the estimates for the
second simulation (`docs/rounds/2026-10-19-second-simulation.md`). A season in which all six other kings are woken for
orders and two or three audiences costs about 0.3 million tokens; a quiet season far less. A 20-season game is
roughly 4 to 6 million tokens: about 4 to 6 weekly points at the first simulation's rate of about one point per million
(a first guess from the simulation's estimates, not a measurement). Expect a few minutes for a season in which kings are
woken: slow, asynchronous play.

**Subscription limits apply.** Usage is shared with the Claude apps (claude.ai, the desktop and mobile apps); check it
with `/usage` in the session. The `ANTHROPIC_API_KEY` environment variable must **not** be set where you start the
Claude Code session: with it set, Claude Code bills the API instead of the subscription.

### Steps

1. **Once: the king agents.** If `sim/kings/seats.json` exists (the simulation's `node sim/setup.js --seeds 7,15` made
   it), the kings are ready. Otherwise run `node sim/setup.js` (kings only). It makes the seven agent types
   `.claude/agents/king-<power>.md` (Sonnet), their folders and their isolation tests. Agent types load only when a
   Claude Code session starts, so any session you start afterwards (step 4) sees them.
2. **Start the bridge,** in a terminal of its own, in the repository folder:
   `node sim/bridge.js` (port 5190; `--port N` for another, which you then also enter in the game's setup). It moves any
   requests and replies left by an earlier game into an `earlier-<time>` folder in each king's folder, and prints that
   it is running. If you restart it in the middle of a game, use `node sim/bridge.js --keep`, which leaves that game's
   waiting requests in place.
3. **Start the web app,** in another terminal: `dotnet run --project src/Amarna.Web --launch-profile http`, then open
   <http://localhost:5183>. The **Local agents** preset and the "Local agent (Claude Code)" choice under "Customize the
   table" appear only when the app runs on this computer, not on the published site.
4. **Start the orchestrating session.** Check that `ANTHROPIC_API_KEY` is not set (PowerShell:
   `echo $env:ANTHROPIC_API_KEY` prints nothing). Open a **new** Claude Code session in this folder (not a worktree) and
   paste `docs/PLAY-PROMPT.md` below its line. It checks the agents and the walls (the dry check, then the live isolation
   test of the seven kings, a small amount of usage), checks that the bridge runs, and tells you when it is waiting.
5. **Play.** In the browser choose **Local agents**, pick your seat under "Your seat", press **Check the bridge**, then
   **Begin the age**. Give your orders and hold your audiences as in any game. While the other kings decide, the page says
   so. A king whose agent has not answered within the wait you set (60 minutes by default) is played by the script king
   for that one decision. Keep the game's tab open: the page asks the bridge for replies, and a browser checks timers in
   a hidden tab only about once a minute after a while, so a season may then take a minute longer.
6. **Stop.** Your game is saved in the browser after every season, like any game, and continues from "Saved games"
   while the bridge runs. When you have finished, press Ctrl+C in the bridge's terminal: the orchestrator's next wait
   reports `bridge-stopped`, and it runs the audit (`node sim/audit.js`) and reports the usage.

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
