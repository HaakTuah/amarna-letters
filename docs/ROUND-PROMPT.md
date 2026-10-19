Round prompt: fixes from the simulation, default sleep, and a clearer seat view
Before you start: move the previous round's prompt, `docs/ROUND-PROMPT.md`, to `docs/rounds/2026-10-18-sleep-and-simulation-prompt.md`, then save this prompt word for word as `docs/ROUND-PROMPT.md`, so you can reread it if your context gets compacted. Commit both moves first, on your new branch.
The first agent simulation has run. Read `docs/ROUND-REPORT.md` first, especially "Simulation results", "What to do next" and the "Simulation result" paragraph at the end of each Part 3 answer, then `docs/DESIGN-NOTES.md`. The design document is at https://claude.ai/code/artifact/7f857750-39dc-464a-a739-c9f59dfe3dcd. Read its main tab for intent, especially the decided paragraphs under "Pacing: sleeping seats and standing orders" (sleep is the default; what the kings are told; the hidden cap). Its Ideas tab is not in scope this round. This prompt decides what to build; where it and the document differ, follow this prompt and note the difference in the report. If you can't open the document, everything this round needs is in this prompt.
The simulation's main lessons: the kings play the trust game for real (sealed, broke and showed tablets on purpose), but the seat view hid rules they needed, several bugs misled them, sleeping never happened, and the contract cliff is real. This round fixes all of that, so the next model games read true. It adds no new systems: no sieges, no visual overhaul, no new character roles.
Ground rules

* Branch from `main` after PR #6 is merged. Commit each part separately, open a PR, and don't merge without my approval.
* Balance stays frozen. This round changes bot behaviour in a few places (Part A), so rerun the benchmarks afterwards and report them, without tuning anything.
* New rules mean a new save version. Seeds must still replay exactly within the new version; test that.
* Every rule a king needs must be in the rulebook or the seat view. If you change a rule, change the text the king reads in the same commit.
* `docs/DESIGN-NOTES.md` records what is built. Update it in the same commit as each rule you change (sleeping seats, contracts, ransoms, triggers, the cap and so on), and at the end refresh its "Where the code differs from the design document" section against the design document as it stands today. Also refresh "Not built yet" so it lists every decided direction that isn't built, one line each with a pointer to where it is decided (design document main tab, Ideas tab "Chosen direction" and "decided" paragraphs, or the round report), not a specification: for example sieges, walls and terrain; slow absorption; news that travels; envoy authority and passage grants; errands and generalist characters with a living pool; skills hard-coded and decisions left to the character, with engine rolls as a switch; full and structured press; date labels; the visual overhaul. Don't build any of these this round.
* Write a new round report as `docs/ROUND-REPORT.md`, and move the current one to `docs/rounds/2026-10-18-sleep-and-simulation.md`. That old report holds the plans for all 27 Part 3 questions, which stay the reference for future rounds, so update every reference to it (in `DESIGN-NOTES.md`, `sim/README.md`, code comments and this prompt's question numbers) to the new path. In this prompt, "the round report" and "question N" mean that old report.
* I'm asleep while you work. Don't stop to ask: where something is ambiguous, take the most reasonable reading, write it down in the report, and carry on. Stop only before anything that can't be undone, such as merging or pushing to `main`.
* Save the report as you go, so nothing depends on your context surviving.

Part A: bugs that make games read wrong
From the simulation (see "Simulation results", defects):

1. Gold sent back in round 1 of an audience is lost if round 2 resets it.
2. A purchase disappears without notice when its city is conquered in the same season. The buyer must be told, and the gold must not vanish.
3. Battle reports hide a move from out of sight that bounces the king's own move. The king must learn that his move was bounced, and from which province, even if he cannot see who did it.
4. A report line claims assurances that were never given. Find and fix it.
5. Any other confirmed defect in the report's list.

From the previous round's list (report, "What to do next", item 1): 6. A captured servant shown in its master's view as "at court, ready for a mission" (question 19, plan step 2). 7. Repeated ransoms: one open demand per captive, a new demand replaces the old, and a payment is refused once the captive is free or a payment is already on the road (question 19, step 1). 8. Coalition tablets read only for "against " plus the exact enum name: match any name of the foe, ignoring case (question 17, step 1). 9. Every power's opening units and treasury given to model and human kings, as bots already have them (question 16, step 3). 10. A sworn ally who breaks an oath stays a friend (`IsFriend`, question 16, step 1). 11. The remaining small fixes in that list: the hidden-state test for bots (question 16, step 2), a derived seed per script seat (question 16, step 4), bots refusing foreign tablets that mention land, gold or tribute (question 17, step 2), a shadow brain so a fallback king remembers (question 17, step 4), the dead cunning clause (question 17, step 5), the court-list leak (question 8, step 1), no catastrophe rumour reaching every court without a carrier (question 9, step 3), a bribed envoy repeating the host's request (question 13, step 2), the threat filter aimed at the host (question 13, step 1), telling the host when a captive order does nothing (question 19, step 4), and the dismissal edge cases (question 20, step 5).
Part B: contracts
13 of 14 debriefs asked what "wage N until turn 10" means, and 11 of 14 starting envoys would quit at their first renewal.

1. Notice period (question 22, step 1): at term end the character names its price and stays one more season; the king accepts with a renewal order or the character leaves. The notice wakes a sleeping seat.
2. Staggered starting terms, 7-13 seasons by seed, drawn from their own random stream so existing characters keep their traits (question 22, step 2).
3. A renewal order (character, wage, term) usable at any time, so "hire" is never needed to renew one's own servant. Kings tried exactly that and were refused.
4. One rulebook line on terms, notice and renewal, and the seat view shows each servant's term in plain words.

Part C: say every rule the king needs
None of the 43 refused orders was a unit order; they all came from rules the view never states. Add a short "How a season resolves" section to the rulebook, in order, and make the view and the refusal messages use the same words:

* what happens when (audiences, orders, movement, levies placed after movement, purchases, transfers, reports);
* that a person hired this season cannot be sent on an errand until next season;
* that gold is reserved in the order the reply lists it, so a later order can fail for lack of gold;
* what happens when two kings buy the same city, and that a fallback purchase is refused if the first succeeds;
* that a levy needs a province you still hold and is empty after movement;
* what `place_spy` needs as its target.

Feedback the kings asked for:

* A refused or failed order is reported next season with the reason in plain words, every time.
* A standings line as the court sees it: each power's land-based growth from public ownership, marked as an estimate that leaves out treasuries. 13 of 14 debriefs asked for rival standings.
* Fix the travel line in the rulebook: "1 or 2 seasons between courts", not "1 to 3".

Part D: default sleep
Decided: a seat never asks to sleep. In the simulation only one king asked, once, and it was woken the same season; replaying both games, the default triggers would have woken a sleeping king in 117 of 120 seasons.

1. Sleep after every order call. After giving orders, a model or file seat sleeps automatically until a wake trigger fires or the cap is reached, and its scheduled orders run in between. It may still name an earlier season to be woken. The switch stays, so seats called every season can still be compared.
2. The cap is hidden. Raise it to 12 seasons as a placeholder and leave it out of the rulebook and the seat view, so it doesn't anchor the kings' planning horizon. Scheduled orders get no horizon tied to the cap.
3. Orders follow their unit. A scheduled order names the unit by id, resolved from "the unit I saw at X" when it is given, so a planned march survives a bounce. Units with no orders hold.
4. Conditional orders, minimal set: "if a unit of power P enters province X, then <order>", and "if this unit is attacked, then <order>". Keep the vocabulary small and engine-checkable. If this grows too large for the round, do steps 1-3 and say so.
5. Tune the triggers:
   * An envoy coming home, or a routine report, goes to the digest, unless the king asked to be woken when that envoy returns (the seat-defined trigger already exists).
   * An envoy waiting for an audience still wakes the host.
   * Foreign troops entering the seat's land, land or units lost, a failed scheduled order, a ransom demand and a contract notice still wake it.
   * Replay both seed-7 games from `sim/runs` through the engine under the new triggers, as the report's analysts did, and report how many seasons each seat would have slept.
6. What the kings are told. Put this, or a tighter version of it, near the top of the rulebook, not in a footnote:
After you give your orders, you sleep. You are woken only when something concerns you: an envoy at your door, foreign troops in your land, land or troops lost, a failed order, news you asked to hear. Nothing else wakes you, and you may not be woken again for the rest of the game. Plan as if these orders must carry your kingdom until then: schedule what your armies should do in the seasons ahead, set the triggers you want, and leave your envoys mandates that stand on their own.
Each request opens with how long the king slept and what woke it.

Part E: memory and the primer

1. Notes. Raise the 300-character cap on journal notes enough to keep a real plan (for example 1,500 characters for the latest notes), and summarise older ones rather than cutting them. Measure the effect on request size and report it.
2. A ledger of promises. Give each king a section of its journal, carried in full, listing per court what was promised, sealed, broken and paid, written by the king in its own words. It is the per-court ledger from the design document's risk table.
3. Primer. Add five lines from the design document's "Echoes from the archive", in your own wording, and keep the primer's growth under about 250 words:
   * rank in the greeting ("brother" between Great Kings; vassals fall at the feet seven times and seven times; one's name above the recipient's is an insult);
   * detention answers detention (Tushratta held Mane until his own envoys were released);
   * words are not a tablet (Arzawa would not trust a messenger's word until a tablet confirmed it);
   * proof needs a witness who knows (send someone who can recognise the princess);
   * precedent as a floor (ask for more than was given to one's father; a successor's broken promise is the same argument from the other side).

Part F: the simulation kit
Apply the "Kit lessons" in `sim/README.md`:

* A footer that only file seats get: the final message must be only "done", and earlier reply files cannot be read. API kings keep seeing exactly the text they see today.
* Note in the kit that the orchestrator should only check that a reply file exists, and describe the structural fix (starting kings from something that returns nothing to the orchestrator) without building it.

Don't run a new agent simulation this round.
Verification and report

* All existing tests pass, and new tests cover every fix and rule above: the gold reset, the lost purchase, the hidden bounce, ransoms, contracts and notice, the renewal order, default sleep, the hidden cap, unit-following and conditional orders, the new triggers, and exact replay with sleep on and off.
* Rerun the bot benchmarks (seeds 1-100 and 101-200, and the frozen baseline) and report the numbers next to the old ones, without tuning.
* Report the wake-up counts under the new triggers for both seed-7 games.
* Report the request size before and after the memory changes, for a quiet season and a busy one.
* Quote the new rulebook sections in the report, so I can read exactly what a king now reads.
* List anything you left out or changed from this prompt, and why.
