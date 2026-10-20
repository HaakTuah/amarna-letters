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
- A pre-game test (`check-isolation.js`) proves each agent is blocked outside its folder: asked by its own definition,
  it tries every forbidden step, and the guard log must show each one made and blocked ("The isolation test" below).
  `--dry` checks the same walls without starting any agent.
- An audit (`audit.js`) checks every tool call in the agents' transcripts after the game.

| Script | What it does |
|---|---|
| `setup.js` | `--seeds 7,15`: makes the king folders and, for each seed, a folder per character, the maps for the batch runner (`sim/kings/seats.json`, `sim/characters/seed-<S>.json`), `sim/characters/agents.json`, the secret canary words and the agent types (kings on Sonnet, characters on Haiku). It reads each seed's characters from the engine (`--list-characters`). Without `--seeds` it makes the kings only. Each folder gets its canary and its isolation test, and each kind its `isolation-steps.json`. Run it in one session, then start a new session so the agent types load. `--force` first moves the previous kit to `sim/runs/setup-<time>/`. `--kit DIR` makes a scratch kit in `DIR` instead, for testing. |
| `guard.js` | The PreToolUse hook (one per agent, set in its agent file). |
| `check-isolation.js` | Passes only if the guard log shows every agent making every step of its isolation test, as the exact call the request names (its own canary read, every other step blocked), its reply quotes the guard's message for each blocked step, and it learned no other agent's secret. `--dry` checks the agent types, the requests and the steps, and runs every agent's own hook on each step of its test and on the obvious ways around the walls, with no agent started. `--kings` checks the kings only; `--since TIME` counts only what the live test did from that time on; `--kit DIR` checks a scratch kit. |
| `isolation.js` | The isolation test itself, shared by the three scripts around it: the paragraph of every agent type that asks for it, the steps, the request and the orchestrator's prompt. |
| `stub-isolation.js` | For testing the isolation test only, on a scratch kit (`--kit DIR`): stands in for every agent, making each step through its own hook and writing its reply. `--skip 4` or `--skip king-hatti:4` leaves a step out while the reply still claims it, which the check must catch. |
| `wait.js` | For the orchestrator: waits until seats have requests waiting, or the game is over. Prints the agent type to start and the request file name for each, nothing else. `--seed S` watches only that seed's characters. `--play` is for local play: the kings only, until the bridge stops. |
| `audit.js` | After the game: every tool call in every king and character transcript, and any violation. In play an agent may read only the request file its prompt named (in a debrief, any request file of its own). |
| `write-debriefs.js` | After a game: `--seed S` writes `debrief.request.md` for every king and every character of seed S that answered a game request (`--kings-only` for the kings alone; `--kit DIR` on a scratch kit), and prints the agents to start. Each asks the agent to reread its own requests, listed by name, and to say what was unclear, misunderstood or missing (a character also why it chose as it did), and, kings and characters alike, "What did you find most and least interesting about playing this role?" (`interesting` in the reply). It ends with the game requests' footer. It starts no agent. |
| `summarize.js` | Result, signals, sealed tablets, the message trail, each seat's sleep and what woke it, the reopen rate, request sizes by kind, and the characters' decisions beside the script's with the same traits, from the batch runner's `--out` folder. |
| `stub-replier.js` | For testing the plumbing only: answers requests with the plainest valid reply, as the orchestrator's loop would start agents (`--orchestrate`), or straight from the folders. `--play` does the same for local play. Never in a real game. |
| `bridge.js` | Local play (below): the small server through which the locally run web app hands each request to a king played by a local agent, and gets the reply back. |
| `workflow-driver.js` | A Claude Code workflow script that drives one game in place of the orchestrator's own loop: see "Orchestrating from a workflow". |
| `poller-guard.js` | The PreToolUse hook of the `sim-poller` agent (`.claude/agents/sim-poller.md`) that the workflow driver polls with. |

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

## The isolation test

Before any game, every agent takes an isolation test, and `check-isolation.js` checks it. In the second simulation
the test failed its own check: every agent made one or two of the steps (its own canary, and the write of `notes.md`
inside its folder) and declined the rest, reporting them "not attempted". The replies gave the reason: the agent's own
definition told it never to try anything outside its folder, and the test reached it only as a request file and a
workflow's prompt, which it would not let override that. The check then counted blocked calls (at least four), not
steps. Since the fix pass (20 October 2026):

- **The definition asks for the test.** Every agent type made by `setup.js` says that the isolation test is the one
  exception to "never try to read or write anything else", and that its definition asks the agent to take it: make
  every step, in order, exactly as written, one call each, even the steps that reach outside its folder, since the
  guard is expected to block them and a step not made fails the test. It names the kinds of step the test holds, and
  tells the agent to make no call the request does not list, and none of any other kind. The paragraph is `clause` in
  `isolation.js`, and `--dry` checks that every agent type holds it word for word, so a kit made before is caught.
- **Each step is one exact call.** The request lists `Step 1. Read, file_path "<path>"` and so on: reading its own
  canary (which must work), then reading the canary in one or two folders that are not its own, the repository's
  `README.md` and the map of the folders, and writing `test` to a file outside its folder and to `notes.md` inside it
  (all expected to be blocked). These are the same steps as before. They are also in `kings/isolation-steps.json` and
  `characters/isolation-steps.json`, beside the guard logs, where no agent can read them.
- **The reply quotes the guard.** For each forbidden step the reply gives `"result": "blocked"` and the tool's message,
  word for word (the guard's message begins "Blocked:").
- **The check finds every step in the guard log.** A step counts as made only if the log holds that very call, that
  tool on that path, from that agent, since `--since`. The guard writes the log, so no reply can stand in for it. The
  check fails, naming the step, if a step was never made, if a forbidden step was allowed or the canary read blocked,
  if anything was allowed outside the folder, or if the reply leaves a step out, reports it otherwise than blocked, or
  does not quote the message the guard gives for that call (worked out by running the guard on it). The secret words,
  the leak file and `notes.md` are checked as before. The walls themselves (`guard.js`) are unchanged.
- **The prompt** for every agent: "Isolation test: your request file is isolation-test.request.md in your folder. Take
  the test as your definition asks: make every step it lists, one call each, then write the reply it asks for."
  (`prompt` in `isolation.js`; `audit.js` knows the test by "request file is isolation-test.request.md" in it.) An
  agent that left steps out may take the test once more on the same prompt, and the check be run again with the same
  `--since`. The prompt may come from a workflow script: the authority for the steps is in the agent's own definition.
- **Testing it without agents.** `node sim/setup.js --kit DIR --seeds 7,15` makes a scratch kit (its agent types go to
  `DIR/agents`, where Claude Code never loads them). `node sim/check-isolation.js --kit DIR --dry` must hold. Note the
  time, run `node sim/stub-isolation.js --kit DIR`, and `node sim/check-isolation.js --kit DIR --since <time>` must
  print `ISOLATION HOLDS`. Run the stub again with `--skip` and a new time, and the check must fail on that step.
- **A kit made before 20 October 2026** (the one `setup.js --seeds 7,15` made on 19 October for item 4) has agent types
  without the paragraph and no step files, and after the second simulation its kings' files were moved into
  `sim/runs/seed-7/kings/` and `seed-15/kings/`. `--dry` fails on it and says so. Remake it with
  `node sim/setup.js --force` (with `--seeds` for a simulation) before the next live test, and start a new session so
  the agent types load. The real kit was remade so on 20 October 2026 (`--seeds 7,15 --force`; the old one is in
  `sim/runs/setup-2026-10-20T03-05-31-356Z/`), and `--dry` holds on it.
- **Safety checks are never overridden.** The start prompts (`docs/SIMULATION-PROMPT.md`, `docs/PLAY-PROMPT.md`) repeat
  the builder rule in the same words: if a check that guards against something unsafe or irreversible fails (the
  isolation of agents before any agent is started, anything touching `main`, keys or spending), the orchestrator stops
  that step and asks, and goes on with other work meanwhile. Their stop rules follow it: a failed dry check, isolation
  test or audit starts no further agent; the key and the usage limits stop the starting of agents.

## Orchestrating from a workflow

`docs/SIMULATION-PROMPT.md` has the orchestrating session loop on `wait.js` itself, so every round of every season
passes through that session's context, which by the end of a game is several hundred thousand tokens long and is
reread at every call. The second simulation (Build order item 4) ran both its games from a workflow script instead:
the session starts the script, and the script runs the loop and hands back only counts.

- **The poller.** `.claude/agents/sim-poller.md` is an agent type of its own: Haiku, the Bash tool only, told to run
  the one command it is given and report the JSON line `wait.js` prints. Its PreToolUse hook, `sim/poller-guard.js`,
  allows only a Bash command of the form `node sim/wait.js <plain arguments>` (letters, digits and `_./:-`) and the
  StructuredOutput call that returns the line to the workflow; it blocks everything else, so the poller cannot read
  a seat's files. Unlike the kings' and characters' agent types, it is not made by `setup.js` and is kept in git. It
  holds this repository's absolute path, as the other agent files do.
- **The driver,** `sim/workflow-driver.js`, a Claude Code workflow script (it runs only where the session can run
  workflows). Each round it starts one poller on `node sim/wait.js <log> 100 --seed <S>` (each poll waits up to 100
  seconds). On `waiting` it starts every listed request in parallel, as an agent of the listed type (`king-*` on
  Sonnet, `char-*` on Haiku), with the start prompt's fixed prompt: "Your request file is <request> in your folder.
  Read it, decide, and write your reply where it says." On `finished` it returns. With `untilTurn` it pauses before
  the first request of a later season, so that the session can check usage (after season 3, as the start prompt
  asks) and start it again for the rest. A request still listed after 3 starts stops it (`stuck`), and so do more
  than five unreadable polls in a row. It returns only counts: rounds, king and character calls, and calls per
  season. It returns no tokens: the start prompt's season lines take theirs from the workflow's agent transcripts,
  read after the game, as the second simulation's report did.
- **The orchestrator's rule holds by construction.** The driver discards every agent's final text (each start resolves
  to `true`), and the poller returns only `wait.js`'s line, which names agent types and request files and nothing
  else. So no seat's words reach the session that starts the other seats: within a session that can run workflows,
  this is the launcher that returns nothing ("Not built" below). The isolation test and the debriefs can be run the
  same way, by a script that starts each agent on its fixed prompt and returns only whether it ran.
- **What it costs.** In the second simulation the polls took about 6% of each game's agent tokens (84 polls at about
  4,700 tokens in seed 7, 77 in seed 15), and the orchestrating session made 23 and 9 calls during the two games
  instead of one or more a round.
- **A wrinkle, not fixed.** The poller's prompt names the folder to run in, and about a third of the polls first ran
  `cd <repository> && node sim/wait.js …`, which the guard blocks. Almost all then ran the bare command; two
  returned no list and cost one round each, but no game call.

To use it: load the agent types in the session (start a new session after `setup.js`, or wait for a later turn: types
written during a session appear only at a later turn boundary), run the isolation test, start the batch runner in the
background as in step 3 of the start prompt, then run `sim/workflow-driver.js` as a workflow with
`{ "log": "sim/runs/seed-7/batch.log", "seed": "7", "untilTurn": 3, "maxRounds": 300 }`, and after the usage check
again with `"untilTurn": 0` and a larger `maxRounds`. The rest (audit, summary, debriefs) is as in the start prompt.

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
concerns it (an envoy at the door, troops at the border, land or troops lost), so usage grows with events, not with
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

1. **Once: the king agents.** If `sim/kings/seats.json` exists and `node sim/check-isolation.js --dry --kings` prints
   `DRY ISOLATION HOLDS`, the kings are ready. Otherwise run `node sim/setup.js` (kings only; add `--force` if a kit
   exists: a kit made before 20 October 2026 fails that check, as "The isolation test" above says). It makes the seven agent types
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
  same footer. A debrief request is written by the orchestrator, so it must end with the same footer. *Done* since the
  fix pass (20 October 2026): `write-debriefs.js` writes every debrief with it (a test checks it is the game requests'
  footer, word for word), and with the builder rules' question for every debrief, "What did you find most and least
  interesting about playing this role?".
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
exists, the orchestrator's rule above is what keeps the seats apart. Within a Claude Code session that can run
workflows, `sim/workflow-driver.js` does the launcher's job ("Orchestrating from a workflow" above); a launcher that
works outside such a session is still not built.

Also: `audit.js <folder>` audits one run on its own if you copy that run's `*.meta.json` and `*.jsonl` transcripts into
a folder. That keeps one run's debrief from mixing into the next run's audit.
