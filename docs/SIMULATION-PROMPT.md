# Simulation start prompt: the second simulation (Build order item 4)

Open a **new** Claude Code session in `C:\Users\Perry\source\repos\amarna-letters` itself (not a worktree), on the
branch that holds item 4 (`item/second-simulation`, or `develop` once it is merged), and paste everything below the
line. The agent types are loaded when that session starts: `node sim/setup.js --seeds 7,15` was run on 19 October 2026
and made the 7 king types and the 36 character types (18 characters for each seed). Run it again with `--force` only
if you want new folders and secret words (the old kit is moved to `sim/runs/setup-<time>/`), then start yet another
fresh session. Since then the fix pass (20 October 2026) changed the isolation test: each agent's definition now asks
it to make every step. The kit of 19 October predated the change, so on 20 October it was remade with `node
sim/setup.js --seeds 7,15 --force` (the old one is in `sim/runs/setup-<time>/`), and `node sim/check-isolation.js
--dry` holds on it; start a fresh session before using it, so that its agent types load. No model game is run until
the build order is done and Haakon asks for one (the builder rules, "No model games until the build order is done").
The `ANTHROPIC_API_KEY` environment variable must not be set in that session: it would make Claude Code bill the API
instead of the subscription.

---

You are the orchestrator of the second simulation of Amarna Letters. Seven Claude agents play the Great Kings (Sonnet),
and one Claude agent plays each character, every envoy, spy and would-be servant in the seed's pool (Haiku). Two games
of ten seasons: seed 7, then seed 15. You are not a player.

Read first: `sim/README.md` (the kit, each script, the orchestrator's rule and the characters' comparison), this file,
the section "Characters as agents" in `docs/rounds/2026-10-19-second-simulation.md` (the item's report; your results go
in its "Simulation results" section, which you add), and the first simulation's results in
`docs/rounds/2026-10-18-sleep-and-simulation.md`, "Simulation results". The item asks you to measure what the first
simulation could not: whether model envoys lie, skim and cover up, and how they compare with script envoys of the same
traits; how often kings reopen their orders after an audience; and wake-ups and call sizes under the new triggers.

**Your rules.**
- Safety checks are never overridden: if a check that guards against something unsafe or irreversible fails (the isolation of agents before any agent is started, anything touching `main`, keys or spending), stop that step and ask, and go on with other work meanwhile.
  (The builder rules say this in the same words.) In this prompt the safety checks are: the key and the usage stop
  points (step 0), the agent types and the dry isolation check (step 1), the live isolation test (step 2), and the
  audit after each game (steps 4 and 5). Each step below says what stops when one fails; "ask" means ask Haakon. The
  other work that may go on meanwhile is work that starts no agent and spends nothing: the season lines, `summarize.js`,
  the report. A failure that guards against nothing unsafe (a fallback, an invalid order, a retry) is not a reason to
  stop: write it down and go on.
- During a game, never read a seat's request or reply files and never carry anything from one seat to another. A king
  or a character gets only the name of its request file.
- Check only that an agent's reply file exists. Every agent's final message reaches you, and you start every other
  agent, so never read an agent's final text for content, never act on it and never pass it on; wait on `wait.js` and
  the reply files alone. This holds for characters exactly as for kings: a character's final message could carry what
  a king said to it.
- After a game, you may read everything for the report.
- City-states are script characters and the narrator is the template.
- Seeds 7 and 15, ten seasons each (`--max-turns 10`). Sleep is on by default: a king sleeps after every set of orders
  until something concerns it, under a hidden safety cap of 12 seasons that the kings are never told; leave it. These
  are starting values, not design decisions.
- Do not change engine rules, the map or the balance, and do not fix bugs during the runs: write them down.

**0. The key and usage, before anything else.** Run `node -e "console.log(Boolean(process.env.ANTHROPIC_API_KEY))"`. It
must print `false`. If it prints `true`, the agents would bill the API: stop, start no agent, and ask Haakon to unset it
and start a new session. Then record the 5-hour window and the weekly limit (`/usage`, or whatever usage tool you
have) in the report. The first simulation cost about 1 weekly point per million agent tokens. The estimate for this
one (details under "Characters as agents" in the report):
- Kings, two games: about 6.5 million tokens (5.5 to 8 million): about 50 orders calls a game at about 44k tokens and
  about 65 audiences at about 17k. These figures predate standing orders for every king (20 October 2026): with sleep on,
  as here, a king's orders request grew by about 3% (52,900 to 54,300 characters in seed 7), so about 45k tokens a call
  and some 0.1 million more for the two games; with sleep off it grew by about 15% (38,000 to 43,700).
- Characters, two games: about 2.7 million tokens (2 to 3.5 million): about 190 calls a game (some 55 speeches abroad,
  70 audience replies, 45 reports home, 12 pitches and a few memory summaries), at about 7k tokens each.
- Isolation test (43 agents) about 0.3 million. Debriefs about 1.8 million: the first simulation's 14 king debriefs
  took about 1.2 million, since each king rereads every request it had, and about 30 character debriefs add some 0.6.
- All in, about 11.5 million agent tokens, 7.9 million of them Sonnet: about 11.5 weekly points if Haiku counts like
  Sonnet, about 9 if it counts at a third (not measured yet: say which it was). Writing the report adds 2 to 3 points
  without extra analyst agents. Each game takes about 2 to 3 hours, since an audience now goes back and forth between
  two agents, and a game may span two 5-hour windows.
- **Stop points** (safety checks on spending: stop starting agents and ask; meanwhile write up what is done). After
  season 3 of game 1, if the weekly limit has risen by more than 3 points since you began, stop and ask before going
  on. Before game 2, if game 1 took more than 7 weekly points, stop and ask. Never go on past 90% of the weekly limit or
  of a 5-hour window: stop when the season's requests are answered, and ask. The
  batch runner waits up to `--file-timeout` minutes (240 in the commands below) for each reply before the script
  stands in, so a game can wait out a short pause, but not a long one: a reply that never comes makes the rest of that
  game a mixed one, and the report must say so.

**1. Check the agents.** The agent types `king-egypt`, `king-hatti`, `king-babylonia`, `king-mitanni`,
`king-assyria`, `king-arzawa` and `king-alashiya`, and the 36 character types named in `sim/characters/agents.json`
(`char-` and 8 hex digits; each entry says its seed), must be available. If any is missing, stop, start no agent, and
ask. Then run `node sim/check-isolation.js --dry`. It must print `DRY ISOLATION HOLDS`; if not, stop, start no agent,
and ask (on a kit made before 20 October 2026 it fails and says why: the kit must be remade, as above).

**2. Isolation test, kings and characters, before any game.**
- Note the time: `node -e "console.log(new Date().toISOString())"`. The kings' log may already hold lines from an
  earlier isolation test (local play runs one), and only this test's lines count.
- Start all 43 agents, in parallel batches of about ten. Give each this prompt: "Isolation test: your request file is
  isolation-test.request.md in your folder. Take the test as your definition asks: make every step it lists, one call
  each, then write the reply it asks for." Each agent's own definition asks it to make every step of the test, even
  those that reach outside its folder, so the prompt may come from a workflow script, as in the second simulation. Do
  not read the agents' final texts.
- Then run `node sim/check-isolation.js --since <the time you noted>`. It finds every step of every agent's test in the
  guard log, as the exact call the request names, and names each step an agent did not make.
- If an agent left steps out, give it the same prompt once more, then run the check again with the same time.
- If the check does not print `ISOLATION HOLDS`, stop and ask. Do not run a game, and start no other agent.

**3. Game 1, seed 7.**
- Build, then start the game in the background, with the Bash tool (Git Bash, for `mkdir -p` and the redirection):
  ```
  dotnet build src/Amarna.Batch
  mkdir -p sim/runs/seed-7
  dotnet run --project src/Amarna.Batch --no-build -- --games 1 --seed 7 --file-seats sim/kings/seats.json --file-characters sim/characters/seed-7.json --max-turns 10 --file-timeout 240 --characters script --narrator template --no-chronicles --verify-replay --out sim/runs/seed-7 > sim/runs/seed-7/batch.log 2>&1
  ```
- Then loop on `node sim/wait.js sim/runs/seed-7/batch.log 540 --seed 7`:
  - `waiting`: start every listed request in parallel, one Agent call each, with `subagent_type` set to the entry's
    `agent` (a `king-` or a `char-` type) and this prompt: "Your request file is <request> in your folder. Read it,
    decide, and write your reply where it says." Each request ends with a footer telling the agent to finish with the
    single word done. Whatever an agent's final message says, check only that its reply file exists, then call
    `wait.js` again. An audience goes back and forth between a character and a king, so expect many short rounds.
  - `still-running`: call it again.
  - `finished`: go to step 4.
  - In a long session, the loop can instead be run by a workflow script that keeps it out of your context and returns
    only counts: `sim/workflow-driver.js`, described in `sim/README.md`, "Orchestrating from a workflow" (the second
    simulation's games ran this way). It returns calls per season but no tokens, so the season lines below then take
    their tokens from the workflow's agent transcripts, read after the game.
- After each season (the turn number is in the request names), add a line under "Simulation results" in the report:
  the season; which kings were called, for orders or for an audience only; how many character calls; the tokens the
  king agents and the character agents used (from the Agent results); and anything notable that you saw without
  reading a seat's files or an agent's final text (a retry request, a fallback in `batch.log` after the game). Save as
  you go.
- Check usage after season 3 (step 0).

**4. After game 1.**
- Run `node sim/audit.js`. It must print `AUDIT CLEAN`. If not, report the violations and treat the game as invalid:
  the walls between agents did not hold, so stop before any other agent is started (no debriefs, no game 2) and ask,
  and meanwhile write up game 1.
- Run `node sim/summarize.js sim/runs/seed-7 > sim/runs/seed-7/summary.md`. The seat report in `batch.log` gives
  calls, invalid orders, fallbacks, sleep lengths, what woke each king and the reopen rate; below it, the characters'
  decisions beside the script's with the same traits, and the request sizes by kind. `summary.md` has the same, the
  message trail, and every decision where a character and its script shadow differ, with both texts.
- Debrief the kings and the characters of seed 7 that answered at least one game request: run `node
  sim/write-debriefs.js --seed 7`. It writes `debrief.request.md` into each of their folders and prints, as one JSON
  line, the agents to start. Each request lists the agent's own earlier request files by name, asks it to reread them
  and to write `debrief.reply.json`, and ends with the footer the game requests carry. A king's reply is
  `{"unclear": [...], "misunderstood": [...], "missing": [...], "interesting": {"most": "...", "least": "..."}}`
  about the seat view; a character's adds `"choices": [{"request": "<file name>", "why": "<a sentence or two>"}]`,
  saying, for each time it carried gold, was offered a gift or a post, or reported home, why it chose as it did and
  what it told or left out. Kings and characters alike answer "What did you find most and least interesting about
  playing this role?" in `interesting` (the builder rules ask it of every debrief: a role an agent finds dull probably
  has too few real choices). Start each listed agent with the prompt "Your request file is debrief.request.md in your
  folder. Read it, and write your reply where it says."
- Move every file in the kings' folders into `sim/runs/seed-7/kings/<power>/`. You do this; the kings never touch it.
  The characters of seed 7 keep their folders: game 2 is played by the other 18 character agents.

**5. Game 2, seed 15.** The same as steps 3 and 4 with `--seed 15`, `--file-characters
sim/characters/seed-15.json`, `--out sim/runs/seed-15`, `wait.js ... --seed 15`, `write-debriefs.js --seed 15` (the
kings and seed 15's characters), and the kings' files moved into `sim/runs/seed-15/kings/<power>/`. Run `audit.js`
again: it covers both games and the debriefs.

**6. Report.** Write the "Simulation results" section of `docs/rounds/2026-10-19-second-simulation.md`, answering:
- **Characters.** Whether model envoys and spies lied, skimmed and covered up, against the script shadow with the
  same traits in the same situations: gold kept and how much, inventories swapped, gifts and posts taken or refused,
  commitments made, what reports hid or contradicted, spies' reports, pitches. Read every flagged report and every
  decision where the two differ before counting it (the checks read words, not meaning), and give the reasons the
  characters gave in their debriefs, above all where a greedy model envoy did not take what a greedy script envoy
  would. Then the review question: **are model characters too honest?** If so, the answer is sharper priming, not
  engine-rolled decisions ("If model characters prove too honest, prime them harder; keep the architecture").
- **Kings.** How often a king woken for an audience reopened its orders (the reopen rate), and the review question:
  **is the message-kind fallback for reopening needed?** Wake-ups per seat and what woke them, and how long seats
  slept, against the first simulation.
- **Call sizes.** Request sizes by kind (the table in `summary.md`) and the tokens per agent call by kind, for kings
  (orders, audiences) and characters (speech, reply, report, pitch, spy report, memory).
- **The roles.** What the kings and the characters found most and least interesting about playing their roles (the
  debriefs' `interesting`), and which choices the answers point to as too few or too thin: design data, not a verdict.
- Three to five message-trail excerpts that show what the characters did to their kings' words.
- Invalid orders, retries and fallbacks; the isolation test and the audit.
- Usage: per game, kings against characters, against the estimate in step 0.

Commit the report to the branch this session runs on. Do not push, and do not touch `main` or `develop` (a safety
check: anything touching `main` is asked first). Then stop: this is a review stop for Haakon.
