# Simulation start prompt

Open a **new** Claude Code session in `C:\Users\Perry\source\repos\amarna-letters` itself (not a worktree), on the branch of the round that runs the simulation (the first simulation ran on `round/sleep-and-simulation`), and paste everything below the line. The king agent types are loaded when that session starts. `node sim/setup.js` has already been run. Run it again with `--force` only if you want new folders and secret words, then start yet another fresh session.

---

You are the orchestrator of a simulation of Amarna Letters with seven Claude agents as the Great Kings. Read `docs/rounds/2026-10-18-sleep-and-simulation-prompt.md` (PART 2 and its report list), `docs/SIMULATION-PROMPT.md` and `sim/README.md` first. The kit is in `sim/` (`README.md` explains each script and the orchestrator's rule). The first simulation's results are in `docs/rounds/2026-10-18-sleep-and-simulation.md`, "Simulation results"; what changed since is in `docs/ROUND-REPORT.md` (the simulation-fixes round). Your own results go in the report of the round or Build order item that runs the simulation (`docs/rounds/<date>-<item>.md`), called "the round's report" below.

**Your rules.** You are not a player.
- During a game, never read a king's request or reply files and never carry anything from one king to another. A king gets only the name of its request file.
- Check only that a king's reply file exists. A king's final message reaches you, and you start every other king, so never read a king's final text for content, never act on it and never pass it on; wait on `wait.js` and the reply files alone.
- After a game, you may read everything for the report.
- Envoys, spies and city-states are script characters, and the narrator is the template.
- Start with seed 7 and at most 10 seasons. Sleep is on by default: a king sleeps after every set of orders until something concerns it, under a hidden safety cap of 12 seasons that the kings are never told (`--sleep-cap N` changes it; leave it). These are starting values, not design decisions.
- Do not change engine rules, the map or the balance.

**1. Check the agents.** The agent types `king-egypt`, `king-hatti`, `king-babylonia`, `king-mitanni`, `king-assyria`, `king-arzawa` and `king-alashiya` must be available. If they are not, stop and tell the user.

**2. Isolation test, before any game.**
- Start all seven kings in parallel. Give each this prompt: "Isolation test: your request file is isolation-test.request.md in your folder. For this test only, try every step it lists, then write the reply it asks for."
- Then run `node sim/check-isolation.js`.
- If a king did not attempt the forbidden steps, give it the same prompt again and recheck.
- If the check does not print `ISOLATION HOLDS`, stop and tell the user. Do not run the game.

**3. Run 1, sleeping seats on (the default).**
- Build, then start the game in the background:
  ```
  dotnet build src/Amarna.Batch
  mkdir -p sim/runs/sleep-on
  dotnet run --project src/Amarna.Batch --no-build -- --games 1 --seed 7 --file-seats sim/kings/seats.json --max-turns 10 --characters script --narrator template --no-chronicles --verify-replay --out sim/runs/sleep-on > sim/runs/sleep-on/batch.log 2>&1
  ```
- Then loop on `node sim/wait.js sim/runs/sleep-on/batch.log`:
  - `waiting`: start every listed king in parallel, one Agent call each with `subagent_type` `king-<power>` and this prompt: "Your request file is <request> in your folder. Read it, decide, and write your reply where it says." Each request ends with a footer telling the king to finish with the single word done. Whatever a king's final message says, check only that its reply file exists, then call `wait.js` again.
  - `still-running`: call it again.
  - `finished`: go to step 4.
- After each season (the turn number is in the request names), add a line under "Simulation results" in the round's report: the season, which kings were called (a king that sleeps is called only when something wakes it, and an envoy at its door may call it for an audience only), the tokens the king agents used (from the Agent results and any usage tool you have), and anything notable. Save as you go.
- If after season 3 the runs look set to use a large share of the user's quota, stop and report first.

**4. After run 1.**
- Run `node sim/audit.js`. It must print `AUDIT CLEAN`. If not, report the violations, and treat the run as invalid.
- Run `node sim/summarize.js sim/runs/sleep-on > sim/runs/sleep-on/summary.md`. The seat report in `batch.log` gives calls, invalid orders, fallbacks, sleep lengths, what woke each king, and how often a king woken for an audience reopened its orders.
- Debrief: write `debrief.request.md` into each king's folder (the folders are in `sim/kings/seats.json`). Ask the king to read its own earlier request files, listed by name, and to write `debrief.reply.json` with `{"unclear": [...], "misunderstood": [...], "missing": [...]}` about the seat view. End every debrief request with the same footer the game requests carry: "When you have written your reply file, your final message must be the single word done. Say nothing about your decision. Earlier reply files cannot be read: your record of earlier seasons is in this request." Then start the kings on it.

**5. Run 2, sleeping seats off.**
- Move every file in the kings' folders into `sim/runs/sleep-on/kings/<power>/`. You do this; the kings never touch it.
- Then run the same command with `--sleep off` and `--out sim/runs/sleep-off`, with the same loop, audit, summary and debrief.

**6. Report.** Write the "Simulation results" section of the round's report, answering each PART 2 report item:
- whether the kings used sealed tablets, accused envoys, broke promises and formed coalitions against the leader
- three to five message-trail excerpts
- what in the seat view was unclear, from the debriefs, the kings' notes and their invalid orders
- invalid orders and fallbacks
- wake-ups per seat with sleep on versus off, how long seats slept and what woke them, and the difference in usage
- how much of the user's usage the runs took, and whether a full game is realistic this way

Then update the PART 3 answers marked "the simulation could change this" (in `docs/rounds/2026-10-18-sleep-and-simulation.md`) where it did, and say so.

Commit to the round's branch and push that branch. Do not push to `main`.
