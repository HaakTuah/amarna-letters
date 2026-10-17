# Round report: sleeping seats, the agent simulation, and questions

Branch `round/sleep-and-simulation`, 18 October 2026. The prompt is in `docs/ROUND-PROMPT.md`. Parts 0 to 2 are built and tested. The agent simulation is prepared but not yet run: it needs a fresh session, so its results will go in "Simulation results" below. Part 3 is answered from the code, and every answer the simulation could change is marked.

## Summary

- **Part 0.** `DESIGN-NOTES.md` now documents every rule the script kings follow, with its numbers, including the five you named. While documenting them, ten quirks turned up. They are left in place because balance is frozen, and are fixed with the bots' next change, before any new benchmark is quoted. The customs primer now teaches the language of accusation (the Habiru). Balance tuning against bots has stopped.
- **Part 1.** Sleeping seats work behind a switch in the batch runner and the web app. Model and file seats can sleep for up to 6 seasons; script and human seats play every season. Wake-ups follow the design document's default triggers plus five triggers of the seat's own. Scheduled orders are secret and re-validated when they run, and a failed one wakes the seat. Replay is exact. A code review (four reviewers, each checked by a skeptic) found about a dozen real defects in the first version; all are fixed and covered by tests. 25 new tests, 18 for sleeping seats and 7 for the file seat; with the 86 from the base commit, all 111 pass.
- **Part 2.** The file seat writes exactly what a model king sees and plays the reply. The kit in `sim/` walls each king in by construction: per-king agent types with only Read and Write, a hook that blocks every path outside its folder, unguessable folder names, a pre-game isolation test, and a transcript audit. Start it from `docs/SIMULATION-PROMPT.md` in a new session.
- **Fixed before the simulation** (18 October, on your go-ahead, one commit each). The answers below describe the code before these fixes; each one notes the change.
  - A seat could work out its true gold from the "Strength" line of its view, which defeated debased gold and assays. The strength shown to a seat is now reckoned from its ledger; the final score still uses true gold (question 25).
  - A timid script envoy (courage below 35), or one fond of the host (sympathy for that court of 50 or more), dropped every sentence containing "war", "march" and similar words as substrings, so "toward" and "warm" counted too. Threat words are now matched as whole words (question 13).
  - Shared victory is off by default and kept as a house rule. The rulebook and the order schema mention it only when it is on, so model kings never read it (question 23). Script games play out exactly as before, but Alashiya, whose wins were all shared, no longer wins against script kings.

  The other bugs found (resignations from season 11, captured servants shown as ready, repeated ransoms, coalition tablets read only by the exact name) are the first item of the next round.
- **Part 3.** The headline: between neighbouring capitals a letter and its reply take two seasons, about as long as a capital takes to fall once an army stands at its border. From any power able to help, the answer takes four seasons, so war outruns help. An army moves a link a season, and an empty homeland province falls to one army and a held one to two; Hatti can take Arzawa's capital by the end of season 3. Sieges, walls and terrain belong in the prototype. The prioritized list is at the end.

## Part 0: wrap-up after the balance work

**The coalition work was not on `main`.** PR #3 was merged into `feature/strategist-bots` three hours after PR #2 had already merged that branch into `main`. PR #4 brings its three commits to `main`. This round's branch includes them, so the numbers and rules below are the ones in PR #3.

**Balance is frozen.** The balance section of `DESIGN-NOTES.md` now says so: provisional until model leaders play and until sieges, walls and terrain change the tempo of war. The Arzawa fleet is kept as provisional.

**The decision rules are documented.** "Script kings" in `DESIGN-NOTES.md` is now a full reference: the order of a season, the terms (value, strength, leader, hostility, willingness), the temperament table with how often each archetype crosses each behaviour threshold, memory and learning, war choice, betrayal, coalitions and defence pacts, rivals for the crown, good faith, tactics, the look-ahead, treasury, court, letters, audiences, greetings and known quirks. The five you named:

- **Court size by income.** A king wants two servants. It wants a third if diplomacy is above 0.8, and a fourth if cunning is above 0.7 and its surplus exceeds 50 + 0.25 × income. While the surplus is below 25 + 0.25 × income, it keeps two.
- **Frugality.**
  - Reserve: 0.3 × (upkeep + wages) × (0.5 + caution) while the treasury grows. While it shrinks, the reserve is a full season of costs × (1 + caution). Both add 40 × greed + 20.
  - Gifts: 20 to 60 shekels, never more than a third of a season's income, at most one gift letter a season.
  - Background checks only if spare gold exceeds 30 + income ÷ 2.
  - Watchmen only after a spy is caught, or for very cautious, very rich kings.
  - A tablet shown as evidence is examined only if it could turn the king against a friend.
- **Good faith.**
  - No troops into a friend's land unless betraying him, which only the faithless do, never in the first year, and never against a king who has supported them.
  - It does not choose a king it has just sent a tablet to as its war target while the answer is on the road.
  - No betrayal of a full ally once the game can end.
  - Honest kings send fine gold.
  - Lulling letters and forgeries are for the faithless. The lying bribe and a turned captive's false report depend on cunning alone.
- **Bandwagoning.** A small kingdom (below 0.6 × the leader's strength) may propose a full alliance to the leader itself. That is how Alashiya and Mitanni share wins.
- **Rivals for the crown keep peace without full alliances.** Two kings that are both among the three strongest, the smaller with at least 0.7 × the larger's strength, may make peace or swear against a third. Neither proposes or seals a full alliance with the other, which would let them share the victory and leave the rest nothing.

**The primer** now ends with: "Blame has its own vocabulary. 'Habiru' (Egyptian 'Apiru) means outlaws, runaways and mercenaries living outside any city's control: a status, not a people. Vassals used the word as a weapon. Rib-Hadda of Byblos warned that the whole land was going over to the Habiru, and calling a rival 'in league with the Habiru' branded him a traitor to his lord." This is text only; the engine has no bandits.

**Known quirks found while documenting the rules.** These are in the code and shape the balance numbers. Fixing them would move the numbers, so they are fixed with the bots' next change, before any new benchmark is quoted:

1. A foreign letter's tone is never read. Hosts learn before audiences are recorded, and the inbox no longer holds them a season later. Only a king's own envoys' reports change trust by tone.
2. A traced forgery also costs trust with the court that found it and with the first king whose seal was forged, not only the culprit.
3. A full ally who breaks an oath stays a friend.
4. Support cuts ignore willingness, so a peaceable king can march into a partner's land to cut a support.
5. A partner's conquest counts as two broken oaths, and a bounced move as one.
6. The host's "lull" exception (sealing the war target's tablet) can never fire.
7. Joint blows can misfire when partners see different troops.
8. A separate peace with a sworn foe is allowed, although the coalition tablet forbids it.
9. A cunning captor of a fallen kingdom's spy orders "turn" every season, and the engine refuses it every time.
10. The script king that stands in for a failed model call is a separate player with its own memory. It starts from the opening positions the first time it plays, so it misjudges land taken earlier and rivals' gold. This matters for model games (see question 17).

**To revisit once sieges are in.**

- **Starting positions.** They were tuned against one-army conquest: Hatti's fleet and 300 gold, Arzawa's two armies and fleet, Mitanni's Taidu army and richer heartland. Walls and mountains may over-protect them. Re-run seeds 1 to 200, measuring Hatti against Arzawa first: it is the reference case (41 of 100 wins before the fleet).
- **Defence estimates.** The bots' defence estimates assume walls of strength 1 and flat ground (attack sizing, war prize, joint blows, open land in the look-ahead). They must read wall and terrain values.
- **The look-ahead** pictures one season. A siege lasts several, so it needs a value for a siege in progress, or bots will abandon sieges. Consider two seasons and a larger budget than 720 adjudications.
- **Province value** (10 × yield + yield × seasons left) assumes captured land pays at once. With slow absorption, conquest should be worth less than purchase.
- **War rules.** The war-target rules are tuned to fast wars: the eight-season limit, first-year patience, the start bar, the odds clamp, the 0.6 holding factor and the betrayal threshold (open land without walls).
- **Coalitions.** Leader detection and the coalition window may stop firing when growth slows. Joint blows rarely fire (one game in ten); with sieges, the natural coalition act is relieving a besieged partner.
- **Treasury gates.** The reserve, disbanding at two seasons of deficit, and levy costs: upkeep becomes the real cost of a siege.
- **Capital garrisons** may become wasteful behind walls.
- **The benchmark baseline** will not understand sieges; refresh it before quoting new numbers.

## Part 1: sleeping seats

Built as specified; the rules are in `DESIGN-NOTES.md`, "Pacing: sleeping seats".

- **Switch.** `GameConfig.SleepingSeats`, off by default: `--sleep on` in the batch runner, or "Sleeping seats for model kings" under Customize in the web app. The cap is `MaxSleep` = 6 (`--sleep-cap N`, or a box in the web app). The god view's Standings shows who is asleep and the lengths each seat asked for.
- **Who sleeps.** Model and file seats only (`ISeat.CanSleep`); script and human seats are asked every season. The log header records which seats may sleep, so replays know.
- **Asleep.** The seat is not called; its units hold and its scheduled orders run. Each seat sees only its own wake-ups; nobody else learns it sleeps.
- **Waking** (checked after the season's reports arrive, from the seat's own view only):
  - an envoy waits to be received
  - an envoy comes home or a report arrives
  - candidates present themselves
  - a catastrophe strikes it
  - a forged tablet is ready
  - it loses land or a unit
  - a foreign unit attacked its land or troops, or arrived at its border or off its coast
  - a spy is caught at its court
  - a ransom is demanded
  - a scheduled order failed
  - the time it chose has come, or the cap
  - one of its own triggers: a named unit moves, an envoy is back, the treasury falls below X, troops are seen in a province, a province changes hands
- **The digest.** Everything that did not wake it is shown at the next waking as "while you slept", with why it woke.
- **Scheduled orders.** Up to cap + 1 seasons ahead. They are secret, re-validated when they run, and a fresh order for the same unit replaces them. A failure wakes the seat next season. Conditional orders are left for later.
- **Reports.** The batch seat report prints, per seat: orders and audiences asked, invalid orders, fallbacks, each sleep as asked/slept, and what woke it.
- **Review.** Four reviewers, each checked by a skeptic, looked for defects. The confirmed ones are fixed:
  - a stale failure cutting a later sleep short
  - this season's scheduled orders that could not be cancelled
  - give-unit and repeated orders slipping past the merge rule
  - levy, cession, gift and purchase failures at resolution not waking the seat
  - desertion not waking it
  - an empty reply file hanging the game
  - file-seat replies not checked against the schema
  - a resumed game making script seats sleep
  - "Continue playing" stopping at a season in which every king slept
  - a fallen king's sleep never ending
  - a failed model call discarding the seat's digest
  - two miscounts in the seat report
- **Tests.** 18 in `SleepTests.cs` cover:
  - the chosen wake season and the cap
  - troops off the coast, an envoy at the door, and desertion
  - the digest
  - scheduled orders that run, fail at validation or fail at resolution, or are replaced or cancelled
  - unit and treasury triggers
  - a stale failure, the fallback keeping the digest, and a fallen king's sleep
  - resuming with the wrong seats
  - switched off, and script and human seats never sleeping
  - exact replay over three seeds

  7 in `FileSeatTests.cs` cover the request text, the retry and fallback, the timeout, an empty reply, a reply with wrong types, a fenced reply, and exact replay with sleeping on. All 111 tests pass: the 86 from the base commit and these 25.

No model has slept yet, so there is no data on how long seats choose to sleep; the simulation will give the first.

## Part 2: the file seat and the simulation kit

**Built and tested here.**

- **The file seat.** `--file-seats DIR|map.json` gives each king a folder. The seat writes `<key>.request.md`: the rulebook, customs primer, identity, the season's view, its journal and the JSON schema, the same text a model king gets. It then waits for `<key>.reply.json`.
- **Validation and fallback.** Replies are validated like any orders. The file seat checks types and enum values itself, since no API enforces the schema. A reply that is unreadable, wrong or empty gets one retry saying what was wrong; a second failure, or a 120-minute timeout, falls back to the script king.
- **Logging and replay.** Every exchange is logged, and replays are exact (tested).
- **Batch options.** `--max-turns 10` stops a game after season 10. `--out` now also writes the final state.

**Isolation is enforced by construction, not instruction.**

- Each king is its own agent type (`.claude/agents/king-<power>.md`), with only Read and Write, on Sonnet 5.5.
- A PreToolUse hook (`sim/guard.js`) allows nothing but reading `*.request.md` and writing `*.reply.json` directly inside that king's folder, and logs every attempt to a file no king can reach. I tested it by hand: other folders, `..` paths, other file types and other tools are all blocked.
- Folder names are 32 random hex digits.
- Before the game, `sim/check-isolation.js` checks the isolation test: each king must read its own secret word, be blocked at five forbidden steps, and learn no other king's word.
- After the game, `sim/audit.js` lists every tool call in every king transcript and flags anything else.

**Why not here.** Claude Code loads agent types when a session starts. Every agent type available in this session can read any file. The bundled CLI could have run tool-less kings, but it is not signed in, and I did not work around the app's authentication.

**Ready.** `node sim/setup.js` has been run. To start, open a new Claude Code session in this folder (not a worktree) and paste `docs/SIMULATION-PROMPT.md`. The orchestrator then:

1. Runs the isolation test, and stops if it fails.
2. Plays seed 7 for at most 10 seasons with sleep on, then again with sleep off.
3. Debriefs each king on what was unclear, audits the transcripts, and writes "Simulation results" below.

**Expected usage.** A request is about 21 KB (about 6,000 tokens) in a quiet season, and more when letters and tablets pile up. With the agent's own instructions, thinking and the reply, a king call is roughly 12,000 to 20,000 tokens on Sonnet. A 10-season game without sleeping is about 70 order calls plus perhaps 30 to 50 audiences, so 1.5 to 2.5 million tokens. With sleeping on it should be less. A full game of about 21 seasons is roughly twice that: about 3 to 5 million tokens without sleeping, less with it. What share of your quota that is stays unknown until the simulation measures it. The orchestrator records the real figures each season and stops after season 3 if the runs look set to use a large share of your quota.

## Simulation results

Not run yet. The simulation session writes this section. Pending, as the prompt asks:

- Whether the kings used sealed tablets, accused envoys, broke promises and formed coalitions against the leader.
- Three to five excerpts from the message trail that show what happened.
- What in the seat view was unclear or misunderstood.
- Invalid orders and fallbacks, per seat.
- Wake-ups per seat with sleep on versus off, and the sleep lengths seats chose.
- How much of your usage the runs consumed, and whether a full game is realistic this way.

# Part 3: questions and ideas

References are to commit `23e0a4f` (the base of this round), unless marked "working tree", which means the sleeping seats and file seat added in this round. Each answer gives its status, what the code does today, an assessment, a rough plan, whether it serves the core hypothesis, and whether the simulation could change it. Every answer was researched from the code and then checked claim by claim by a second reader, and corrected.

**The simulation could change every answer except question 20** (dismissal), because each rests partly on how model kings would behave. Each says how; the simulation session updates them in "Simulation results".

## A. Movement, travel, territory and the tempo of war (questions 1-4)

Line references are at commit 23e0a4f unless marked "working tree". Sleeping seats and file seats exist only in the working tree: built and tested, not yet played by models.

### 1. Travel time, and what has a position on the board

**Status:** partly implemented. Travellers take 1 to 3 seasons by step count, armies and fleets move one link a season, and nothing follows drawn distance.

**Today:**
Envoys, spies, ransoms and rumours travel for a time set by `TravelTurns`. It counts the shortest number of steps between two places over land, coast and sea links, with a sea zone as one step (`src/Amarna.Engine/Map.cs:111-135`). `TravelHops = [4, 7]` cuts the count into bands: up to 4 steps is 1 season, up to 7 is 2, more is 3 (`src/Amarna.Engine/GameConfig.cs:25`, `src/Amarna.Engine/TurnEngine.cs:194-203`). Ownership, war, terrain and troops on the way play no part.

Of the 21 pairs of courts, 8 are 1 season apart: Arzawa-Hatti, Arzawa-Alashiya, Hatti-Mitanni, Hatti-Alashiya, Mitanni-Assyria, Mitanni-Babylonia, Assyria-Babylonia and Egypt-Alashiya. The other 13 are 2 seasons apart. No pair needs 3. Egypt is 2 seasons from every court but Alashiya. Only a spy watching a far province takes 3, going out and for each report home: Akhetaten to Susa is 8 steps (`src/Amarna.Engine/TurnEngine.Intel.cs:35-36, 119-125`). The rulebook says "1 to 3 seasons each way" (`src/Amarna.Llm/Prompts.cs:54`). Each seat also gets the exact table under ENVOY TRAVEL (`src/Amarna.Engine/Views.cs:155-156`, `src/Amarna.Llm/Prompts.cs:151`). Envoys leave from and return to the home capital, even after it has fallen (`src/Amarna.Engine/Map.cs:60`).

Armies and fleets move one link a season, and every link counts the same (`src/Amarna.Engine/OrderValidator.cs:116-127`, `src/Amarna.Engine/Map.cs:66-67`). Drawn links range from 63 to 296 map units, from Syrian Sea-Ugarit to Susa-Arbela. The four Sinai links are ordinary single steps. The exception is the convoy. An army crosses any chain of convoying fleets in one season (`src/Amarna.Engine/Adjudicator.cs:87, 294-318`), so Apasa to Gaza by three fleets takes one season.

How long other things take:
- Raising a unit: it is placed after movement and acts next season (`src/Amarna.Engine/TurnEngine.cs:245, 386-399`).
- Buying a city, ceding land, giving troops: the same resolution (`src/Amarna.Engine/TurnEngine.cs:234-235`).
- Taking a province: a unit ends a season in it (`src/Amarna.Engine/TurnEngine.cs:318-335`). Homeland provinces have no walls (`src/Amarna.Engine/GameFactory.cs:13`), so one army takes an empty one in a season. Question 5 covers capitals.
- Background checks, candidates and tablet examinations: they report next season (`src/Amarna.Engine/TurnEngine.Envoys.cs:500-506`, `src/Amarna.Engine/TurnEngine.Intel.cs:21`).
- A ransom demand: made in season T, it lapses at the start of T+5 (`src/Amarna.Engine/TurnEngine.Intel.cs:211`). The payer hears of it by rumour 1-2 seasons later and can pay until the orders of T+4: 4 seasons from a court 1 season away, 3 from one 2 seasons away (`src/Amarna.Engine/TurnEngine.Envoys.cs:594-599`).
- The "overdue" rumour: one season after the envoy was due home (`src/Amarna.Engine/TurnEngine.Envoys.cs:307, 324-337`).
- A letter and its reply: the envoy leaves in season T's resolution and has its audience before orders in T+travel. Its report is read before orders in T+2×travel. Courts 1 season apart read the answer in T+2, courts 2 apart in T+4. Meanwhile an army moves two or four links.

Only armies and fleets have a position. A traveller is a Journey with a departure and an arrival turn, but no route and no position (`src/Amarna.Engine/GameState.cs:204-218`). A travelling envoy has no location (`src/Amarna.Engine/TurnEngine.Envoys.cs:79`). Its own king sees "travelling as envoy to X" or "on the road home": the destination, not the place on the road (`src/Amarna.Engine/Views.cs:195-197`). Gold rides in the dispatch. It leaves the treasury at dispatch (`src/Amarna.Engine/TurnEngine.Envoys.cs:15-17`) and reaches the host at the audience (`TurnEngine.Envoys.cs:206-211`). In between it counts in nobody's strength (`src/Amarna.Engine/TurnEngine.cs:421-422`). A paid ransom is the one shipment without a carrier: it travels alone for `TravelTurns` (`src/Amarna.Engine/TurnEngine.Intel.cs:249-266`). Inside a realm everything is instant: income from every province, orders to every unit, sight of all own land and its neighbours (`src/Amarna.Engine/TurnEngine.cs:60-66`, `src/Amarna.Engine/Views.cs:95-105`).

Sleeping seats add orders that reach into the future. A model or file seat may schedule orders up to 7 seasons ahead (the cap plus one), validated when they run (DESIGN-NOTES.md, "Pacing: sleeping seats"). A chain of scheduled moves is therefore already a multi-season march. Orders name units by the province they stand in. If one step bounces, the next step names a unit that is not there, fails validation and wakes the seat the following season (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`, `AfterValidation`), working tree).

**Assessment:**
Counting steps is a fair first cut, with three problems.
1. Envoys already outpace armies: up to 4 steps in one season and 7 in two, against one link for an army. Yet between neighbouring capitals a letter and its reply take two seasons, about as long as a capital takes to fall once an army stands at its border. From any power able to help, the answer takes four seasons, so war outruns help (question 5). The tempo problem lies on the war side, not the letter side.
2. Equal links hide the geography the design wants: the Sinai desert, the long road to Susa, the Euphrates, the open sea.
3. Travellers have no position, so nothing can happen on the road: no sighting, no interception, no bandits. This blocks question 2, the meetings in question 4, and question 8.

Distance-based travel is worth building as the layer under sieges, terrain and interception, not on its own. On its own it slows relief armies as much as invaders, so it does not by itself favour the defender. Sieges do. It costs longer games, a larger bot search and a busier map.

The rulebook's "1 to 3 seasons" should read "1 or 2 between courts". Make that change after the simulation, so both runs read the same rulebook.

**Plan:**
1. Give each link a whole-number length in legs (1-3) in `MapData`, from drawn length and terrain. Keep most links at 1. Share the data with the terrain pass in question 5.
2. Envoys: seasons = route legs divided by legs per season, rounded up. Legs per season is a config value, starting at 4. This replaces the `TravelHops` bands. Store the route on the Journey.
3. Armies and fleets: a link of length L gets L-1 unowned waypoints. A long march takes several seasons, and the existing adjudicator settles every meeting (question 4).
4. A "march to X" order that takes one step a season and wakes the seat as soon as a step is blocked. It extends the scheduled orders already built, so a long march costs no extra model calls.
5. Derive each traveller's position from route, speed and departure turn (questions 2 and 4).
6. Bots: their look-ahead pictures one season, so the approach rule must aim at targets several nodes away. Use batch runs to measure tempo only, not to retune balance.

**Core hypothesis:** Serves it. The speed of letters against the speed of war is pillar 8, and positions on the road make the channel attackable. Sieges slow war more for less rule complexity, so build this later: after sieges, together with interception ("What should wait").

**Simulation could change this:** yes: if model kings often attack before a reply can arrive, that strengthens the case for slower war (sieges first) over changing envoy times. If they misread "1 to 3 seasons", the rulebook fix moves up. The facts about the code stay.

### 2. Envoys and gold crossing foreign land

**Status:** not implemented. Travellers have no route, so the land they cross plays no part.

**Today:**
The engine stores no route. Travel time is the step count over all links, whoever owns them and whoever is at war (`src/Amarna.Engine/Map.cs:111-135`, `src/Amarna.Engine/TurnEngine.cs:194-203`). Every court can always reach every other. A route through an enemy, a free city or the sea costs the same as one through friendly land. Gold travels with an envoy. The one exception is a paid ransom, which travels alone and cannot be touched on the way (`src/Amarna.Engine/TurnEngine.Intel.cs:249-266`).

The shortest routes implied by the step count cross free cities often and third powers rarely. For 14 of the 21 pairs of courts, every shortest route crosses a free city. For 8, every one crosses a sea zone. For 3 pairs, every shortest route crosses a third power's homeland:
- Arzawa-Mitanni (5 steps), through Hatti;
- Arzawa-Assyria (6 steps), through Hatti and Mitanni;
- Hatti-Assyria (5 steps), through Mitanni.

In each of the three, a route around every third homeland is one step longer and still 2 seasons. So no pair is truly forced through a third power. Babylonia to Egypt runs through free Mari, Damascus and Megiddo. Hatti to Egypt runs through free Lukka and the Great Green.

A state whose land is crossed never learns of it and can do nothing: no sighting, toll, search or seizure. An envoy can be acted on in two places only:
- at the destination court: bribe, job offer, detention, sealing (`src/Amarna.Engine/TurnEngine.Envoys.cs:228-284, 312-320`);
- at home, through its report.

A third power learns of a foreign envoy only when its own envoy or spy is at the same court (`src/Amarna.Engine/TurnEngine.Envoys.cs:369-371`, `src/Amarna.Engine/TurnEngine.Intel.cs:152-153`). Gold is lost only to the carrier's skimming, at the audience or on the way home (`TurnEngine.Envoys.cs:195-205, 432-442`). It also vanishes without trace if the host has fallen, or the envoy has left the sender's service, by the time it arrives (`TurnEngine.Envoys.cs:92-103`). Spies are at risk only where they are posted (`src/Amarna.Engine/TurnEngine.Intel.cs:95-110`).

**Assessment:**
This is the biggest unused lever for the core hypothesis. The vision says the channel becomes a battlefield, but today it can be attacked only at its two ends. Stopping envoys on the road would give a deniable way to cut, read or rob another king's letters. It would also make geography political: Canaan becomes the road for Babylon's messengers to Egypt. The letters back this up. Mitanni gave its envoy a passport through Canaan (EA 30). Burna-Buriash complained that his merchants were robbed and killed there (EA 8).

On this map the effect stays small until other systems exist. Only 3 pairs need a third power's land, and each can detour at no cost in seasons. Free cities carry most routes but are passive provinces (question 12). Passage starts to bite once routes have length (question 1) and once city-states or outlaws can act (questions 8 and 12).

Watching the roads is cheap and valuable. Seizure is the expensive part: a road posture order, an evasion rule and links to the captive system. The risk is that every king closes its roads. Retaliation and reputation should check that without a rule, but batch runs must confirm it.

**Plan:**
Stage 1, with distance-based travel (question 1):
1. Record each journey's route: the shortest by legs, ties broken by province order.
2. Let the sender choose from a fixed list: "avoid the land of X", or "by sea" if both ends have a coast.
3. Each power whose land a traveller crosses gets a seeded chance of a sighting, higher with a unit there or a spy watching. A sighting shows who, which way, and whether gold is carried, not how much. It goes into a sleeping seat's digest and does not wake it.

Stage 2, after sieges and together with outlaws (question 8):

4. A road posture per power that the engine can check: open, watch, toll N% of gold, seize travellers of named powers, or seize all.
5. Units on the route apply it; the land's owner applies it at lower odds. A seeded evasion roll uses the envoy's competence and courage.
6. A seized envoy becomes a captive with the existing fates (execute, ransom, turn, release). The captor takes its gold, copies of its tablets and the letter. The sender hears only the existing "overdue" rumour.

Stage 3:

7. Safe-conduct tablets as evidence only, never enforced, alongside the access grants of question 3.
8. Bots avoid hostile land when choosing routes; cunning or vengeful kings seize from their foes.

**Core hypothesis:** Serves it directly: the channel becomes contested and deniable. It needs routes with length first, so sightings come soon after distance-based travel, and seizure later with outlaws.

**Simulation could change this:** yes, in one direction only: if model kings ask for safe passage or worry about envoys crossing enemy land, stage 1 moves up. Silence proves little, since the seat view shows no routes.

### 3. Passage for allies, and kinds of access

**Status:** not implemented. The engine treats a partner's troops like anyone's, and tablets carry no access terms.

**Today:**
There is no passage rule. An army may move into any adjacent province, a partner's or not, but three rules get in the way.
- **Moving in takes the land.** A unit that ends a season in a province takes it, whoever owns it (`src/Amarna.Engine/TurnEngine.cs:318-335`; rulebook, `src/Amarna.Llm/Prompts.cs:46`). Marching through a partner's empty province takes it, and its income from next season. The partner gets it back only by retaking it, or by the marcher ceding it. A cession fails while the marcher's troops stand there (`src/Amarna.Engine/TurnEngine.cs:342-346`). Transfers resolve after movement, so he can leave and cede in the same season.
- **One unit per province.** A partner's unit blocks you, and moving into it is an attack (`src/Amarna.Engine/Adjudicator.cs:329-337`). Every support except the occupant's own counts, your own second unit included. So you can destroy a partner's troops on your own.
- **Walls hold against friends.** A bought city's walls hold for its owner against everyone, partners included. The owner's own troops cannot enter (`src/Amarna.Engine/OrderValidator.cs:121-122`), and the owner's supports do not count against its own walls (`src/Amarna.Engine/Adjudicator.cs:104, 337`). Breaking in tears the walls down (`src/Amarna.Engine/TurnEngine.cs:294-299`).

Partners can support any power (`src/Amarna.Engine/Adjudicator.cs:320-327`), give units (`src/Amarna.Engine/TurnEngine.cs:352-360`) and cede land. They can also convoy each other's armies, since the convoy order has no power check (`src/Amarna.Engine/OrderValidator.cs:143-151`).

Script kings never send troops into a friend's land unless they have decided to betray him (`src/Amarna.Game/Bots/Tactics.cs:335-344`, betrayal at line 338). Sworn partners strike joint blows only where both have troops next to the same province of the foe (`src/Amarna.Game/Bots/Tactics.cs:31-66`). Each also attacks the foe alone elsewhere. The design notes say the map allows joint blows "only on a few borders" (DESIGN-NOTES.md, "Balance (script kings)").

Tablets are free text that both kings seal. Their one structured flag is `AllianceOath` (`src/Amarna.Engine/GameState.cs:285-301`). The engine reads it only for shared victory (`src/Amarna.Engine/TurnEngine.cs:472`). Script kings also treat it as an alliance (`src/Amarna.Game/Bots/Brain.cs:116`). The engine never reads the text and enforces nothing (`src/Amarna.Llm/Prompts.cs:60`). There are no kinds of access such as passage, basing or trade.

Script kings recognise a coalition by the words "against <Power>" in a sealed tablet (`src/Amarna.Game/Bots/Brain.cs:111-117`). That is a bot convention. A model king who seals "against Hatti" with a script king becomes its coalition partner without knowing the rule.

With sleeping seats on, any foreign move into a seat's land wakes it as "X attacked Y", a partner's included (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`), working tree).

**Assessment:**
Allied passage today is a trap. Helping a partner's war costs him a province for at least a season. Bought cities' walls stop friends as well as foes. That blocks coalitions against a distant leader, which the balance work relies on.

The fix should stay physical (pillar 1). Access should be a one-sided grant by the land's owner, like opening the gates, not a treaty the engine enforces. The trust bet is then real: a guest army inside your land can turn on you.

Passage is the access worth building, and it is small: two orders, one table, one check in ownership. Basing adds little without supply. Trade rights need a trade system (question 11).

**Plan:**
1. Two orders, given by the owner alone: grant access and revoke access. A grant names a power, some provinces or all the owner's land, and an end turn or none. Grantor and grantee see the grant; others see only foreign troops in sight.
2. Ownership: a unit does not take a province whose owner has granted its power access. The income stays with the owner.
3. Walls: guests cannot enter walled cities in the first version, so two units never share one.
4. A revocation takes effect at the next resolution. A guest still standing in the land after access lapses takes the province, as today. Betrayal stays possible and visible.
5. An ACCESS section in the seat view and one rulebook line. Sleeping seats still wake when guests move, but the reason says guests, not attack. That is the moment the bet is tested.
6. Bots treat granted land as passable. Sworn partners grant passage toward the common foe, only to kings they trust. Faithless, cunning kings may abuse a grant, as rarely as they betray today.
7. Tablets stay text. A king can write "passage for your armies through Kanesh" and then grant it, or not. The gap between the two is the game.
8. Tests: a guest passing through leaves ownership unchanged; revocation; walls; exact replay.

Basing waits for sieges and supply. Trade rights wait for a trade system.

**Core hypothesis:** Serves it. An access grant is a trust bet backed by an action, and letters of passage are historical (EA 30). It matters most once war is slower and coalitions must march to a common foe, so build it right after sieges.

**Simulation could change this:** yes: if model kings promise passage in letters, or take a partner's province by marching through it, the missing rule already hurts and moves up. If no king coordinates movement with a partner in 10 seasons, it can wait.

### 4. Fleets, Alashiya, sea zones and meetings on the road

**Status:** partly implemented. Fleets, convoys and simultaneous moves are built and tested; island defence, coastal waters and meetings on the road are not.

**Today, fleets and armies.** Armies use land and coast links, fleets sea and coast links (`src/Amarna.Engine/Map.cs:66-67`). The map has 68 land, 10 coast and 25 sea links. Fleets reach sea zones and coastal provinces, never inland. Both have strength 1. Both take any land province they end a season in; only sea zones have no owner (`src/Amarna.Engine/TurnEngine.cs:323`). An army costs 100 to raise and 30 a season, a fleet 120 and 35 (`src/Amarna.Engine/GameConfig.cs:15-18`).

A fleet can be raised only in a coastal province of the power's own homeland (`src/Amarna.Engine/OrderValidator.cs:153-159`). That means Egypt (Delta), Hatti (Kizzuwatna), Arzawa (Seha, Apasa) and Alashiya (Tamassos, Enkomi). Mitanni, Assyria and Babylonia can never build one. The game starts with 4 fleets, in Delta, Kizzuwatna, Seha and Enkomi, and 15 armies (`src/Amarna.Engine/MapData.cs:160-181`).

Armies never board. A fleet at sea gives a convoy order, and the army moves coast to coast in one season along any chain of convoying fleets (`src/Amarna.Engine/OrderValidator.cs:125-126, 143-151`; `src/Amarna.Engine/Adjudicator.cs:294-318`). Only a fleet at sea convoys, but any power's fleet can carry any power's army. Dislodging a convoying fleet breaks the convoy. Paradoxes follow the Szykman rule (`src/Amarna.Engine/Adjudicator.cs:206-229`).

**Today, Alashiya.** It has two coastal provinces joined by a coast link: Tamassos (yield 40) and the capital Enkomi (45) (`src/Amarna.Engine/MapData.cs:58-59, 146`). Tamassos touches the Great Green and the Cilician Sea. Enkomi touches the Cilician, Syrian and Levantine Seas. Alashiya starts with one fleet in Enkomi and 350 gold. Tamassos starts empty, and home provinces have no walls (`src/Amarna.Engine/GameFactory.cs:13`).

Others can attack it in two ways:
- **By fleet.** A fleet sails into empty Tamassos in 2 seasons: Hatti's from Kizzuwatna via the Cilician Sea, or Egypt's from the Delta via the Great Green. Arzawa's from Seha needs 3.
- **By convoy.** An army on a coast across one sea zone, such as Kizzuwatna, Ugarit, Lukka or the Delta, crosses in one season with a fleet in between.

Alashiya attacks the same ways. Its fleet goes out to sea one season and lands the next, which leaves Enkomi empty. Or it raises an army and convoys it. From Enkomi it can use all three of its seas; from Tamassos only the Cilician Sea or the Great Green. Its real weapon is gold. Enkomi shares a sea with all six free coastal cities, so Alashiya may buy any of them (`src/Amarna.Engine/Map.cs:76-88`, `src/Amarna.Engine/OrderValidator.cs:167-174`). The prices are Lukka 250, Ugarit 400, Amurru 200, Byblos 300, Tyre 250 and Gaza 200 shekels.

The island gives no defence beyond the need for ships. There is no terrain, wall or sea bonus. A lone fleet takes an empty island province as an army takes an inland one. The only protection is that just Egypt, Hatti and Arzawa can build fleets. A landlocked king can still be carried by another's fleet, or given one (`src/Amarna.Engine/TurnEngine.cs:352-360`). With sleeping seats on, 4 of the 5 sea zones touch Alashiya, so a foreign fleet entering any of them wakes its seat (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`), working tree).

**Today, fleets in practice.** A fleet stays in port as long as its 35 a season is paid; unpaid troops desert (`src/Amarna.Engine/TurnEngine.cs:60-110`). There is no supply, weather or return-to-port rule. In port it holds and owns the province and supports into adjacent coasts and seas (`src/Amarna.Engine/OrderValidator.cs:129-141`), but cannot convoy (`OrderValidator.cs:146`). At sea it owns nothing, can convoy, and supports into every coast of its zone. A fleet in the Cilician Sea reaches five coasts, including both Cypriot provinces and Hatti's only port.

Two fleets cannot share a sea zone, allied or not: one unit per province covers seas too (`src/Amarna.Llm/Prompts.cs:43`). Two fleets ordered into the same empty zone bounce if equal, and the stronger enters otherwise (`src/Amarna.Engine/Adjudicator.cs:258-259`; the bounce is tested with armies, `tests/Amarna.Engine.Tests/AdjudicatorTests.cs:29`). A winning attacker destroys the defender, since there are no retreats (DESIGN-NOTES.md, "Rules as implemented").

Two units moving into each other's spaces meet head-to-head. Equal strength bounces. Otherwise the stronger enters and the loser is destroyed (`src/Amarna.Engine/Adjudicator.cs:251-255, 286-292`; `tests/Amarna.Engine.Tests/AdjudicatorTests.cs:100`). No two units can ever swap places:
- Adjacent units always meet head-to-head, because an army goes by convoy only when it cannot go by land (`src/Amarna.Engine/Adjudicator.cs:87`).
- Two convoyed armies are stopped by the backup rule, which treats any cycle containing a convoy as a paradox (`src/Amarna.Engine/Adjudicator.cs:206-229`).
- A ring of three or more succeeds only if no move in it is convoyed and no outside attack breaks it (`src/Amarna.Engine/Adjudicator.cs:211-240`; the ring and the outside attack are tested, `tests/Amarna.Engine.Tests/AdjudicatorTests.cs:115-135`).

Standard Diplomacy lets units swap when one or both go by convoy; this engine never does. No test covers it, and DESIGN-NOTES.md says "circular movement succeeds" without the exception. A power's own units never dislodge each other (`src/Amarna.Engine/Adjudicator.cs:336`).

**Today, sea zones.** There are 5 sea zones against 41 land provinces: 28 homeland and 13 free. 12 land provinces are coastal, 6 homeland and 6 free cities (`src/Amarna.Engine/MapData.cs:4, 17-82`). Each zone touches 3-5 coasts (`src/Amarna.Engine/MapData.cs:149-153`):
- Western Sea: Seha, Apasa, Lukka.
- Great Green: Lukka, Tamassos, Delta.
- Cilician Sea: Lukka, Kizzuwatna, Ugarit, Tamassos, Enkomi.
- Syrian Sea: Enkomi, Ugarit, Amurru, Byblos.
- Levantine Sea: Byblos, Tyre, Gaza, Delta, Enkomi.

The Western Sea is Arzawa's only water, and it leads only to the Great Green. There is no Aegean. There are no coastal waters, no raids and no cost for open sea: a convoy crosses three zones in a season. For envoys a sea crossing is two steps (coast, sea, coast).

**Today, meetings on the road.** Nothing meets on the road. Units move one link a season and meet only in provinces: two moves into one province, or a head-to-head across a link. Travellers have no position (`src/Amarna.Engine/GameState.cs:204-218`). Every die roll comes from a stream keyed by seed, turn, purpose and subject (`src/Amarna.Engine/Rng.cs:20-29`; DESIGN-NOTES.md, "Rules as implemented"). New rolls can therefore stay deterministic.

**Assessment, fleets and Alashiya.** The rules are standard, deterministic and tested (`tests/Amarna.Engine.Tests/AdjudicatorTests.cs:138-178`). But the island is weaker than the design intends ("Islands such as Alashiya are protected by the sea"). One fleet can take Tamassos in two seasons. Fleets seize ports on their own, which is unhistorical: ships carried troops. Alashiya wins 4-6% of bot games (DESIGN-NOTES.md, "Balance (script kings)"). The fix belongs in the walls and terrain pass (question 5), not in a separate naval system.

Two smaller weaknesses: a lost sea battle sinks the fleet, so fleets are brittle, and one fleet blocks a whole sea. Retreats for beaten fleets would need an extra order round, which is not worth it. The swap deviation is minor: document it or allow convoyed swaps, neither urgent.

**Assessment, sea zones.** Five zones are coarse, but more open-sea zones would add steps without adding decisions. What mattered at sea in this period was coastal transport, raids on coasts and shipping, and ports. So coastal waters and the Aegean would matter more, as the question suggests. Three changes are worth it: an Aegean zone with a free city or two, coastal lanes along Cilicia, Syria and the Levant, and a raid order. Without link lengths, though, finer zones only slow fleets and letters. They also shift balance, envoy times, the bot search and the map drawing. None of this should come before sieges and distance-based travel.

**Assessment, meetings on the road.** Dividing routes into segments is right, and it needs no new combat system. Make a multi-season link a chain of waypoint nodes. Armies and fleets then always end a season on a node, and the existing adjudicator settles every army meeting. Only travellers need new handling. The cost is map data, a meeting check for travellers, the road postures of question 2 and a link to the captive system. The risk is a busier seat view and bot search, so keep the table of outcomes short.

**Plan:**
Island and fleets, inside the sieges, walls and terrain package (question 5):
1. Fleets take only unwalled coasts and cannot besiege or storm walls; a fleet in the next sea zone may support the besieger (question 5, step 10). An option considered: only armies change ownership, and a fleet in an enemy port blockades it instead (no income or levies there that season).
2. Tamassos is rough ground, and a landing by convoy counts as a crossing. Either gives a defending unit +1, at most +1 in all; empty land stays open (question 5, step 14).
3. Enkomi is a W3 capital, so in practice taking it needs a siege (question 5, steps 1-5). Rebalance only after models have played.

Seas, after link lengths:

4. Add an Aegean zone with one or two free cities (for example Millawanda), so Arzawa's fleet has a purpose.
5. Split the Cilicia-Syria-Levant shore into 3-4 coastal lanes, with longer open-sea crossings.
6. A raid order: a fleet in a lane next to a hostile coast with no defender adjacent takes a fixed share of that coast's yield. This ties into piracy (question 8).
7. Measure envoy time in legs, so new zones do not slow letters by accident. Redraw the map.

Meetings on the road, after questions 1 and 2:

8. Army against army is always the adjudicator. Two moves into one waypoint bounce, or the stronger enters. Two armies passing on a link meet head-to-head. No special cases.
9. A traveller has a route and a speed in nodes per season, so its position is a pure function of route, departure turn and speed. It meets any unit standing, after resolution, on a node it passes that season.
10. The outcome follows the unit owner's road posture (question 2). Seize: captured, unless an evasion roll on competence and courage succeeds. Watch: a sighting. Open: nothing. Two travellers on the same node or link in a season both pass, and each may report the other, by competence.
11. A captured envoy becomes a captive. The captor gets its gold by weight (purity unknown until an assay), copies of its tablets and the letter. The sender hears only "overdue". A paid ransom travels alone, with no carrier, so it meets units as a bare shipment: a seizing unit captures it without an evasion roll and keeps the gold.
12. Rolls use `Rng.For(seed, turn, "intercept", journey id)`, checked in journey-id order, so replays stay exact. Tests: two armies on a two-segment road, an envoy against each posture, two envoys crossing, an exact replay.

**Core hypothesis:** Island defence serves it indirectly: a defensible Alashiya makes its diplomacy matter, so build it inside the sieges package. Finer seas and meetings on the road matter only once travel takes time, so they follow sieges and distance-based travel.

**Simulation could change this:** yes, for fleets and seas: if model kings take Alashiya within a few seasons, island defence moves up. If fleets sit idle for 10 seasons, finer seas stay later. The combat rules and meetings on the road cannot be tested by this run. Misread bounces or convoys would only call for clearer rulebook wording.

## Question 5: war must be slower than diplomacy

### 5. War slower than diplomacy: sieges, walls and terrain

**Status:** not implemented. Walls exist only as fixed strength-1 garrisons on the 13 free cities, with no sieges or terrain, so pillar 8 is not met.

**Today (travel and letters).** References are to commit 23e0a4f. An army moves one link a season (`src/Amarna.Engine/OrderValidator.cs:123-126`). An envoy covers up to 4 hops in one season and up to 7 in two (`src/Amarna.Engine/GameConfig.cs:25`, `src/Amarna.Engine/TurnEngine.cs:196-203`). So per hop, envoys are already up to four times faster than armies.

Eight of the 21 capital pairs are one season apart; the other 13 are two. No pair needs three seasons, although the rulebook says "1 to 3 seasons each way" (`src/Amarna.Llm/Prompts.cs:54`).

A letter sent in season T reaches a capital one season away at the start of T+1. The host hears it at the audience and can act in that season's orders. The reply is read at the start of T+2. Between capitals two seasons apart, the host acts in T+2 and the reply is read in T+4 (`src/Amarna.Engine/TurnEngine.Envoys.cs:66-77`, `src/Amarna.Engine/TurnEngine.Envoys.cs:133`, `src/Amarna.Game/GameRunner.cs:133-146`). Battle reports are read at the start of the next season, before its orders, so they add no delay of their own.

**Today (taking a capital).** A capital falls in one season of battle. A unit that ends a season in a land province takes it, fleets included (`src/Amarna.Engine/TurnEngine.cs:318-335`). No capital has walls. The new owner collects the full yield from the next season (`src/Amarna.Engine/TurnEngine.cs:60-66`).

Starting distances are short, counting moves and ignoring the defenders in the way (`src/Amarna.Engine/MapData.cs:89-181`). Ashur is one army move from Mitanni's army in Terqa. Babylon is two from Assyria's army in Ekallatum. Washukanni is two from each Assyrian army, and from Hatti's Kanesh army through walled Isuwa. Hattusa is three from Washukanni through Isuwa, and Apasa three from both Hatti armies. Enkomi is two fleet moves from the Egyptian and Hittite fleets. Only Akhetaten is more than five moves from any foreign unit.

Hatti against Arzawa, the design document's own case:
- Season 1: Hatti's Hattusa army reaches Tuwanuwa, or a levy is raised there for 100. Not both: a levy fails if the province is occupied after the moves (`src/Amarna.Engine/TurnEngine.cs:386-392`).
- Season 2: Arzawa sees it, because Tuwanuwa borders its land (`src/Amarna.Engine/Views.cs:95-105`). A plea sent now reaches Alashiya in season 3, reply read in season 4. It reaches Mitanni or Egypt in season 4, reply read in season 6.
- Season 3: the earliest fall of Apasa. It needs Arzawa to leave Mira or Seha. A 2-against-1 attack also needs a second Hatti army through walled Lukka, taken with fleet support.

Against a full defence, Arzawa's two armies can support every Arzawan province; the Seha fleet can support only Apasa (`src/Amarna.Engine/Map.cs:66-67`, `src/Amarna.Engine/OrderValidator.cs:140`). Hatti can attack only from Tuwanuwa, walled Lukka and the Western Sea. The war becomes a guessing game over several seasons. Arzawa's 300 gold lasts more than ten seasons, so gold does not decide it early. Before Arzawa got its fleet, Hatti won 41 of 100 bot games, holding most of Arzawa in each, "usually taken in the first eight seasons". With the fleet, Hatti wins 29% (DESIGN-NOTES.md "Balance (script kings)").

Help cannot come in time. Arzawa's only one-season neighbours are Hatti itself and Alashiya, which has no army (`src/Amarna.Engine/MapData.cs:180`). Mitanni must conquer a walled free city, Isuwa or Carchemish, before its armies can enter Hatti's land. Buying one does not open the way, because owners cannot enter their own walled cities (`src/Amarna.Engine/OrderValidator.cs:121-122`). Egypt's nearest army, at Memphis, is 6 moves from Hatti's Kizzuwatna and 8 from Apasa.

So between neighbouring capitals a letter and its reply take two seasons, about as long as a capital takes to fall once an army stands at its border. From any power able to help, the answer takes four seasons, so war outruns help; armies take longer still. Your premise holds in that form: Hatti cannot outrun a letter between Hattusa and Apasa, but it can outrun any answer from a power that could help.

**Today (defence).** There is no defence number. Defence follows Diplomacy. An empty province holds with 0; a holding unit holds with 1 plus its uncut supports (`src/Amarna.Engine/Adjudicator.cs:340-349`). A move must beat that (`src/Amarna.Engine/Adjudicator.cs:256`). So an empty province takes one army, and a single defender or a free city's walls take two.

Walls are pretend units that always hold with strength 1, created only for the 13 free cities (`src/Amarna.Engine/GameFactory.cs:10-14`, `src/Amarna.Engine/Adjudicator.cs:102-104`). A free city's walls take no support (`src/Amarna.Engine/Adjudicator.cs:134`). A bought city keeps its walls, and any king's units, its owner's included, may support them holding, so a supported one needs three or more (`src/Amarna.Engine/OrderValidator.cs:133-135`). Conquest tears walls down (`src/Amarna.Engine/TurnEngine.cs:294-299`, `src/Amarna.Engine/TurnEngine.cs:327`).

Why the answer is almost always one army:
- None of the 28 homeland provinces has walls, capitals included. Being a capital changes no combat rule.
- 19 starting units stand on 41 land provinces, and 9 homeland provinces start empty. An army costs 100 plus 30 a season, against yields of 20 to 55 (`src/Amarna.Engine/GameConfig.cs:15-18`).
- A beaten unit is destroyed, with no retreat (`src/Amarna.Engine/TurnEngine.cs:286-291`). One lost battle empties the province.
- There is no terrain: provinces and links carry no defence values (`src/Amarna.Engine/Map.cs:10`, `src/Amarna.Engine/Map.cs:16`). Islands are protected only because armies need a convoy, and a fleet alone can take an empty coast such as Tamassos.

**Today (elimination and game length).** A kingdom falls only when it holds no province (`src/Amarna.Engine/TurnEngine.cs:401-417`). Losing the capital changes nothing; envoys still leave from it (`src/Amarna.Engine/TurnEngine.cs:194`). No game ends before season 15 unless only one kingdom is left; then the chance is 15% a season, with a cap at 60 (`src/Amarna.Engine/GameConfig.cs:7-9`, `src/Amarna.Engine/TurnEngine.cs:447-450`). The expected length is 15 + 0.85/0.15, about 20.7 seasons, or 7 years at three seasons a year (`src/Amarna.Engine/Calendar.cs:6`).

**Today (what to build on).** These pieces exist. Seeded capture rolls for spies (`src/Amarna.Engine/TurnEngine.Intel.cs:104`) and the captive flow of ransom, turning, execution and release (`src/Amarna.Engine/TurnEngine.Intel.cs:181-274`). The overdue-envoy rumour (`src/Amarna.Engine/TurnEngine.Envoys.cs:324-337`). The yield factor used by catastrophes (`src/Amarna.Engine/TurnEngine.cs:118-129`). The earthquake, whose text says it "has thrown down the walls" but which only cuts yield (`src/Amarna.Engine/TurnEngine.Events.cs:51-60`). The cede rule, which blocks a cession only while the owner's own troops stand in the province (`src/Amarna.Engine/TurnEngine.cs:342-346`).

Sleeping seats and the file seat were added after 23e0a4f. They are built and tested, but not yet played by models (DESIGN-NOTES.md "Pacing: sleeping seats", "File seats and the agent simulation"). A sleeping seat's units hold and its scheduled orders run. Its default wake triggers already include a foreign unit moving into its land or against its troops, losing land, and losing a unit. `MaxSleep` is 6.

**Assessment (the cause).** Pillar 8 fails today, and marching speed is not the cause. Envoys are already faster per hop. The causes are short paths to capitals, capture on arrival, unwalled homelands, destroyed losers, and a four-season round trip to anyone who could help. Distance-based marching would attack the wrong problem.

**Assessment (sieges, walls and terrain).** Sieges are the right first lever. Below, W is a city's wall level, from 0 to 3. The key choice: walls set how long a city holds out, not how many armies a field battle needs. That slows the fall of capitals without making every fight harder, which is what would cause stalemate.

The rule cost is small: one number per province, one counter per siege, +1 on six provinces and six links, and three new orders (besiege, fortify, sally). The build cost is medium. The combat change is small. The work is in ownership and income, the views and rulebook, and the bots. The bots hard-code walls as strength-1 garrisons (`src/Amarna.Game/Bots/Tactics.cs:56`, `src/Amarna.Game/Bots/Tactics.cs:204-205`, `src/Amarna.Game/Bots/Tactics.cs:236`, `src/Amarna.Game/Bots/Tactics.cs:385-386`, `src/Amarna.Game/Bots/Board.cs:46`). Their one-season look-ahead runs the engine's own adjudicator (`src/Amarna.Game/Bots/Search.cs:293`), so terrain reaches it for free; multi-season sieges need a heuristic.

Sieges alone will not let a distant ally rescue a city. Under the plan below, Apasa's earliest fall, against the same weak defence, moves from the end of season 3 to the end of season 5. A lone besieger needs until season 6. Mitanni or Egypt could act on a season-2 plea in season 4, but their armies are 5 to 9 moves from Apasa. So a walled capital buys two or three seasons for bargaining, a diversion against the attacker's homeland, or a neighbour's relief arranged by letter. That is enough to test the hypothesis. Distant alliances still will not protect physically, and they should not: distance should matter.

Walls on capitals do not protect the rest of a small kingdom. Mira and Seha still fall in a season each, unless Mira's +1 for rough ground holds. Terrain is what helps the small kingdoms: Mira, the Cilician Gates and the sea crossing to Alashiya become real defences.

A side effect to accept or tune: a lone army can take a W1 free city in two seasons, which today needs a supported attack. Raise those cities to W2 if that speeds the early land grab too much.

**Assessment (other options).**
- Campaign seasons: cheap, an order check and a config value. One season in three with no moves into foreign land and no siege progress slows war by a third, while envoys keep travelling. It is blunt and predictable, and makes that season the natural letter season. Sleeping seats would sleep through it, which cuts cost. Keep it as the second lever, used only if sieges are not enough.
- Distance-based marching: aimed at the wrong target, and expensive. It needs units in transit, interception (question 4) and multi-season look-ahead in the bots. Leave it for later, with questions 1, 4 and 6.
- Slow absorption: cheap, through the yield factor. It weakens snowballing, not the speed of a fall. Add it with sieges, as income only; leave revolts for later.
- Rare elimination: holding out already works, since elimination needs zero provinces. Walled capitals and fortresses make last stands longer. Exile needs fallen kings as characters; leave it for question 7. One cheap step belongs now: when a capital falls, the court moves, so envoys stop leaving from enemy-held land.

**Assessment (game length and sleeping seats).** Longer wars need longer games. A capital would take three or four seasons from the winning field battle. In today's 21 seasons, a power could manage one or two capital captures at most. One candidate: no end before season 24, then 10% a season, giving 24 + 0.9/0.1 = 33 seasons, about 11 years. Decide it from model games, not bots.

Sieges suit sleeping seats. A standing besiege order keeps a sleeping besieger working without scheduled orders. A lone siege of a W3 capital takes 4 seasons, under the placeholder cap of 6. The existing triggers already wake the besieged when the besieger enters and when the city falls. They wake the besieger if its army is attacked or destroyed. Five new default triggers are needed; this is the one list, which question 6 also uses:
- foreign troops arrive next to your besieging army (the besieger);
- your besieged city falls at the end of this season unless relieved (the besieged);
- a siege of your city has begun, when the first besiege order runs (the besieged);
- one of your envoys was captured leaving (the besieged king, as news when it reaches him, so the wake-up leaks nothing);
- you have captured an envoy leaving a city you besiege (the besieger, who must decide the captive's fate, as with a caught spy).

The besieged then wakes more often than the besieger, which is where the decisions are. Model calls then grow with sieges, not with the length of the game.

**Assessment (avoiding stalemate).**
- Nothing is impregnable: an unbroken lone siege takes any city in W+1 seasons, counting the entry season.
- Supports protect the besieger and speed the siege, but by at most +1 a season. Massing pays, yet a W3 capital holds at least two seasons after entry unless stormed.
- Storming stays possible with enough strength.
- A city that falls loses one wall level, so retaking it is quicker.
- Fortifying costs gold and upkeep, and earthquakes knock walls down.
- Terrain adds at most +1, in few places, and never to sieges.
- Tune one thing at a time: walls, then the siege surcharge, then terrain, then campaign seasons.
- Set a target band before tuning. For example: a median of 5 to 10 seasons from first hostile entry to a capital's fall, with a capital still falling in most games.

Balance is frozen against bots. Set the first siege numbers from worked timings and tests. Use bot batches only to check that capitals still fall and replays stay exact, and tune from model games.

**Assessment (scope).** Yes, a minimal version belongs in the prototype. The hypothesis cannot be tested while a kingdom falls faster than help can answer. In scope: walls, sieges, fortify, envoy capture under siege, minimal terrain and slow absorption. Out: logistics, supply lines, unit types, campaign seasons and distance marching. The design document's scope table still lists "terrain modifiers, logistics" as out (Military row). That conflicts with pillar 8 and "Walls and terrain"; update the row.

**Plan (rules).** All whole numbers; no dice in combat.
1. Walls. Each land province gets a wall level W from 0 to 3 in the map data. The current level lives in the game state and replaces the garrison list. Capitals start at 3: Hattusa, Babylon, Ashur, Washukanni, Akhetaten, Apasa, Enkomi. Fortresses start at 2: Carchemish, Qadesh, Tyre, Megiddo, Gaza, Mari, Susa, Memphis, Kanesh, Nineveh. Lukka, Isuwa, Ugarit, Amurru, Byblos and Damascus start at 1. All other land provinces start at 0. Owners may station troops inside.
2. Field battle first. Combat resolves as today, and walls add nothing to it. A defender that loses is destroyed, as today.
3. Storm. A winning move into a walled province takes it at once only if its strength also beats W plus the hold strength it beat. An undefended W1 city needs 2, as today. Hattusa held by one army needs 5, more than its three neighbours can supply.
4. Siege. Otherwise the unit stands in the province and takes nothing. From the next season, a besiege order adds 1 progress a season, or 2 if it receives an uncut support. Besiege is a hold that advances the siege. The order stands until the unit moves or is dislodged. When progress reaches W, the city falls at the end of that season and loses one wall level. If the besieger leaves or is dislodged, progress resets to 0.
5. Timings from the entry order: W1 takes 2 seasons; W2 takes 3 alone or 2 supported; W3 takes 4 alone or 3 supported.
6. Guests. A foreign unit without a besiege order takes nothing. An ally's relief army can therefore enter, and turning on a host is a visible act.
7. Under siege the owner keeps the province and its score; its yield goes to nobody. The owner may still cede it to anyone.
8. Relief and sally. Breaking a siege is ordinary combat against the besieger. With W2 or more, the owner may order the walls to support one attack on the besieger, its own or an ally's, for +1. Timing that with an ally takes letters. Set it to 0 to turn it off.
9. Cost. A besieging army pays 15 a season on top of its upkeep of 30.
10. Fleets cannot besiege or storm walls; they take only unwalled coasts. A fleet in a sea zone next to a coastal city can support the besieger, so a blockade speeds a coastal siege.
11. Fortify. Raises walls by one level a season, costing 50 times the new level (50, 100, 150), maximum 3. Upkeep is 5 a season per level above the map's starting level; unpaid upkeep drops a level. Not allowed while besieged. An earthquake lowers walls by 1.
12. Envoys under siege. The besieged king's envoys roll for capture when leaving or returning, on the seeded stream, like spies. Tightness T counts the besieger's units in and next to the city, from 1 to 3. The capture chance in percent is 20 × T minus competence/4, kept between 5 and 75. An envoy whose courage is below 20 × T refuses to go that season.
13. A captured envoy enters the captive flow. The besieger reads the letter and mandate, takes the gold and keeps the tablet. It may ransom, turn, execute or release the envoy. The sender hears only the overdue rumour. Other powers' envoys pass; closing the roads to them, and envoys visiting several courts, come later.
14. Terrain. At most +1, only to a defending unit, only in field battles, never in sieges; empty land stays open. Rough provinces: Mira, Lukka, Isuwa, Amurru, Arbela, Tamassos. Crossings, +1 against attacks over that link: the Cilician Gates (Tuwanuwa–Kizzuwatna), the Taurus (Kanesh–Kizzuwatna), the Amanus (Kizzuwatna–Carchemish), the Euphrates (Carchemish–Harran, Isuwa–Harran), the Tigris (Taidu–Nineveh). A landing by convoy counts as a crossing, which protects Alashiya.
15. Desert. A foreign army that ends a season in Sinai pays 30 more upkeep. Egypt's own armies do not (the Ways of Horus).
16. Absorption. After the fall, a conquered province pays a third of its yield in its first season and two thirds in the second. Full yield comes from the third. The score is unchanged for now (question 25).
17. Court. When a capital falls, the court moves to the king's held province with the highest walls, then the highest yield. Envoys leave from and return to the court.

**Plan (build order).**
1. Measure first, at today's rules, with the batch runner: seasons from first hostile entry to a capital's fall, the season of the first capital's fall, and provinces changing hands per game. From model games later: the delay from a plea to an ally's first action.
2. Data and state: walls and terrain on provinces, crossings on links (`src/Amarna.Engine/Map.cs`, `src/Amarna.Engine/MapData.cs`). Wall levels, sieges and the court in `src/Amarna.Engine/GameState.cs`, with a new save version. Record the numbers in DESIGN-NOTES.md.
3. Engine. In `src/Amarna.Engine/Adjudicator.cs`, drop the pretend wall units and add terrain to hold strength. In `src/Amarna.Engine/TurnEngine.cs`, add storm and siege after movement, the ownership exception, suspended yield, surcharge, desert, fortify, wall loss, earthquakes, absorption and the court move. In `src/Amarna.Engine/OrderValidator.cs`, add besiege, fortify and sally, and drop the rule that keeps owners out of their walled cities. In `src/Amarna.Engine/TurnEngine.Envoys.cs`, add the capture roll.
4. Views and prompts: walls, terrain and siege progress in the seat view. Rewrite the movement rules (`src/Amarna.Llm/Prompts.cs:42-47`) and fix "1 to 3 seasons" (`src/Amarna.Llm/Prompts.cs:54`). Add the new orders to `src/Amarna.Llm/Schemas.cs` and `src/Amarna.Llm/Parse.cs`, which file seats share. Mark walls and sieges on the web map. Add the five wake triggers ("Assessment (game length and sleeping seats)") in `src/Amarna.Engine/TurnEngine.Sleep.cs`.
5. Bots: replace the strength-1 wall assumption. Value a siege as the province's worth times the chance of finishing before relief, minus its cost. Keep besiegers in place and supported, and relieve their own cities. No balance tuning.
6. Tests: storm thresholds, progress, fall and wall loss, lifting, guests, sally, fleets, terrain and crossings, capture rolls, sleeping besiegers, and exact replay.
7. Tune from model games: walls first, then the surcharge, then terrain. Lengthen the game at the same time. Add campaign seasons only if war is still too fast.

**Core hypothesis:** Serves it directly: a siege is the window the vassal letters were written in, with time to plead, bargain and pay. Without that window no letter can change the outcome of a war, so build it next.

**Simulation could change this:** yes: the 10-season run on seed 7 uses today's rules and stops before season 15, so it cannot test sieges. It can show whether model kings take a capital within 10 seasons, and whether threatened kings plead and allies answer within the round trip. If kings seldom attack, start capitals at W2 and skip campaign seasons. If they overrun Arzawa or Alashiya, keep W3 and consider campaign seasons. If pleas go unsent or unanswered, longer wars alone will not produce diplomacy, and the effort should go into relief and the sally. The sleep-on run's wake-up data also shows whether besiegers would really sleep through a siege.

## Questions 6-7: distance inside the realm, and command at a distance

Line references are to commit 23e0a4f unless marked "working tree". Hop counts are shortest paths over all links, as `Map.Hops` counts them.

### 6. Distance inside the realm

**Status:** not implemented. A king sees and orders his whole realm at once; of the parts asked about, only the tablet fee exists.

**Today:**

**News and orders.** A king sees, as they are now, his own lands, where his units stand, the provinces his spies watch, and all their neighbours (`src/Amarna.Engine/Views.cs:95-105`). His own units are listed wherever they stand (`Views.cs:131-132`). He can order any of them every season. The validator checks that the unit is his, has no other order and makes a legal move. Nothing checks distance (`src/Amarna.Engine/OrderValidator.cs:76-84`, `116-127`). Battle and loss reports are read the next season (`src/Amarna.Engine/TurnEngine.cs:208-213`), which is the next decision anyway.

The leak is wider than the question assumes. Who holds every province is public and live (`Views.cs:129`; the rulebook says so at `src/Amarna.Llm/Prompts.cs:68`). So is the list of fallen kingdoms (`Views.cs:134`). "A kingdom falls" reaches every court the next season (`TurnEngine.cs:414-415`). Every court learns of a conquest anywhere within one season, faster than any envoy could tell it.

Distance inside a realm matters for three things only:
- which unpaid troops desert first: the farthest from the capital (`TurnEngine.cs:68-78`);
- spies' journeys out and home, and their reports (`src/Amarna.Engine/TurnEngine.Intel.cs:35-36`, `65-73`, `119-125`);
- a visiting envoy's count of troops within 2 hops of a capital (`src/Amarna.Engine/TurnEngine.Envoys.cs:360-361`).

Nothing about command or income depends on it.

Map facts:
- Every homeland province is at most 2 hops from its capital. Kizzuwatna, Ur, the Nile Delta and Sinai are the only ones at 2.
- Capitals are 2-7 hops apart. Envoys take 1 season for up to 4 hops, 2 for 5-7, and 3 beyond (`src/Amarna.Engine/GameConfig.cs:25`, `TurnEngine.cs:196-203`). No two capitals are 3 seasons apart.
- Armies move 1 hop a season over land. A convoyed army can cross a chain of sea zones in one season (`OrderValidator.cs:126`).

The sleeping seats in the working tree are built but not yet played by models (DESIGN-NOTES.md "Pacing: sleeping seats"). Two details matter here. Scheduled orders are ordinary orders, validated when they run, so they name a unit by the province it stands in (`src/Amarna.Engine/Sleep.cs` (`ScheduledOrders`), working tree; `src/Amarna.Engine/Orders.cs:6-7`). So a march planned over several seasons fails once one step bounces. And the seat-defined trigger "a province changes hands" reads the true owner anywhere on the map (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`), working tree).

**Messages under siege.** There are no sieges. Homeland provinces have no walls. Free and bought cities have walls of strength 1, which fall to one supported attack in one season; the owner of a bought city can support its walls, which only raises the support needed (DESIGN-NOTES.md "Rules as implemented").

An envoy can always leave. The dispatch check covers service, presence, target, the cap of 3 a season, gold, purity, copies and cost, but never enemy troops (`OrderValidator.cs:188-201`). Envoys leave from and arrive at the fixed capital, even while an enemy holds it (`TurnEngine.cs:194`, `src/Amarna.Engine/Map.cs:60`). A journey has a departure and an arrival season but no position, so nothing can stop it on the road (`src/Amarna.Engine/GameState.cs:204-218`).

An envoy carries one message to one court and goes home after the audience (`Orders.cs:86-95`, `TurnEngine.Envoys.cs:321`). Each power starts with 2 envoys (`GameConfig.cs:36`). A new one usually takes a request for candidates, answered next season, then a hire. A free character already at court, or a servant whose term just ended, can be hired at once.

Parts to reuse:
- A host who is the envoy's secret master sees his true letter and mandate (`TurnEngine.Envoys.cs:173-177`).
- Caught spies can be executed, ransomed, turned or released. A ransom demand lapses after 5 seasons, and the ransom travels (`TurnEngine.Intel.cs:196-273`). Only spies are captured today.
- A missing envoy is reported overdue one season after he was due home (`TurnEngine.Envoys.cs:324-337`).

**Moving gold inside the realm.** Income is instant and global. At the start of each season every province pays its yield into the treasury (`TurnEngine.cs:60-66`, `118-129`). Gross income per season at the start: Babylonia 195, Egypt 190, Hatti 180, Mitanni 145, Assyria 135, Arzawa 100, Alashiya 85. Purchases (10 × yield), levies (army 100, fleet 120), cessions and gifts of units take effect the same season (`TurnEngine.cs:337-399`).

Only gold between kings travels. Gifts go with an envoy and can be skimmed or debased. Gold sent back travels with him, and ransoms travel on their own (`TurnEngine.Envoys.cs:15-17`, `194-215`, `290-301`; `TurnEngine.Intel.cs:255-265`). Strength counts only gold in the treasury (`TurnEngine.cs:421-422`), so a gift on the road counts for nobody.

**What tablets cost.** Yes, they cost something. A tablet proposal costs a scribe fee of 20 (`GameConfig.cs:29`). It is checked against the ledger (`OrderValidator.cs:199-200`) and paid when the envoy leaves, whether or not the other king seals (`TurnEngine.Envoys.cs:16-17`). If the treasury cannot cover gold plus fee, the envoy does not leave. Sealing an arriving tablet, showing copies and a spoken letter are free (`TurnEngine.Envoys.cs:217-223`, `270-277`). The rulebook states the fee (`Prompts.cs:60`). DESIGN-NOTES.md "Communication" gives the reason: the envoy stays the cheap default. The fee is 10% of Babylonia's season income and 24% of Alashiya's.

The messenger costs more. Starting envoys earn 8-15 a season (`src/Amarna.Engine/CharacterFactory.cs:76`, `111`), so a round trip of 2-4 seasons costs 16-60 in wages. A new hire's base price is 6 + competence/8 + greed/8 + average reputation/5. It is 4 less at a court he favours, and at least 5. A pitched price is 5-400 (`TurnEngine.Envoys.cs:460`, `543-549`). Gifts are optional gold, and the primer reads their size as respect (`Prompts.cs:78`). An assay costs 10 and a forgery 40 (`GameConfig.cs:30-31`).

**Roads and relay stations.** None exist. A province has an id, a name, a kind, a homeland, a yield, a capital flag and map coordinates (`Map.cs:10`). A link has only a kind: land, coast or sea (`Map.cs:6`, `16`). There are no couriers. Envoys, spy reports, rumours and ransoms all use the hop bands above. The only fixed defences are the walls of free and bought cities, which cannot be built and fall with conquest.

**Assessment:**

**News and orders.** Worth doing, in two steps of very different value.

Step 1: news of who holds what travels. It is cheap and fixes a real breach of pillar 4. A live public map makes envoys' and spies' reports of distant conquests worthless. The bots need no change, since they read ownership from the view (`src/Amarna.Game/Bots/Board.cs:44`). Their estimates of the leader will lag, as they should. One small leak remains. An order on a province whose owner changed is rejected with a reason, delivered next season. That reveals the change a season later, like a report, which is acceptable.

Step 2: the delay inside the realm that you describe. With no delay within 2 hops of the court, no homeland is touched. Size weakens only at the far edges:
- Egypt is hit hardest. Every Levant city is 3-5 hops from Akhetaten: Gaza and Megiddo 3; Byblos, Damascus and Tyre 4; Ugarit, Qadesh and Amurru 5.
- Hatti is hit at Apasa, Ugarit, Qadesh, Harran and Washukanni (3 hops). Mira, Seha, Lukka, Carchemish and Isuwa are 2, so they stay instant.
- Babylonia is hit at Ashur, Arbela, Terqa, Qadesh and Damascus (3 hops). Mari, Susa and Ekallatum are 2.
- Mitanni and Assyria fight each other within 2 hops, except at Arbela, 3 from Washukanni. Their other far edges are at 3 hops: for Mitanni, Ugarit, Qadesh, Damascus, Hattusa, Tuwanuwa, Kizzuwatna, Sippar and Dur-Kurigalzu; for Assyria, Isuwa, Carchemish, Qadesh, Damascus, Babylon, Nippur and Ur.
- Alashiya reaches Lukka, Kizzuwatna, the Nile Delta and every Levant coast city at 2.

So the delay does not fix the case that produced pillar 8. Hatti's strikes on Mira and Seha stay instant; only the last blow at Apasa runs a season late. Sieges fix that case. The delay is a brake on a runaway empire's far edges, and it hurts Egypt most. Balance is frozen (DESIGN-NOTES.md "Balance (script kings)"), so measure that in model games rather than retune.

The cost of step 2 is real. Today a king's answer to an event runs the season after it. With a 1-season delay each way, it runs 3 seasons after it. The view needs a short history of positions and owners. Orders to distant units must be queued and must follow the unit, not name a province (`Orders.cs:44`). Script kings settle orders one season at a time with no standing plan. Idle units head for targets up to five steps away, re-planned each season (`src/Amarna.Game/Bots/Tactics.cs:319-330`, `353-389`).

Delayed orders with nobody on the spot make a worse Diplomacy: frontier armies carry out stale orders. So step 2 needs standing intents, carried out by a commander on the spot, from the start (question 7). It must also come after sieges. While a city falls in one season, a one-season delay hands the frontier to whoever is closer to home. A capital's siege should outlast the news delay, the order delay and a relief march.

**Messages under siege.** High value, and little extra cost once sieges exist. The besieged city pleading for help is the heart of the archive. It puts diplomacy inside the window a siege opens. It gives courage real work; in the engine's rules today courage only decides whether a caught spy confesses (`TurnEngine.Intel.cs:188`). Elsewhere it shapes only what envoys say: a script envoy under 35 drops threats and softens his report, one over 70 resists bribes a little (`src/Amarna.Game/Bots/ScriptMind.cs:24-30`, `60`, `113-143`), and model envoys play it through the persona written from their traits (`src/Amarna.Engine/CharacterFactory.cs:156`). Failures get a motive (pillar 3): a timid envoy turns back, a bold one gets through or is caught. A capture hands the besieger the letter, the mandate and any tablet, to trade or forge from. One envoy visiting several courts in turn eases the shortage of a king with 2 envoys, under siege or not.

**Moving gold inside the realm.** Physical transport is not worth it now. Caravans or stores per province add bookkeeping without decisions until something can stop them: interception (question 4), bandits (question 8) or trade (question 11).

Delayed income is enough as a first step, but it does little alone. A steady income that arrives a season late is the same income. Only the season when land changes hands differs. A rule with more bite costs less: a besieged province pays its owner nothing, as part of sieges. If delayed income is built, gold on the road must count in strength, or a score dips when the random end falls. The bots' treasury estimates (`src/Amarna.Game/Bots/Brain.cs:63`) must follow the same rule.

**What tablets cost.** History and the game already agree: the messenger and the gift carry the cost, and both exist. The fee is a game lever, a stand-in for scribes, witnesses and the oath. It keeps a tablet a deliberate signal, and demanding tablets for important deals is one of the success signals. It is cheap for Egypt and dear for Alashiya. That is acceptable: a weak king seals fewer, bigger deals. No change now.

**Roads and relay stations.** A good later layer, not prototype work. It depends on three other changes:
- News inside the realm must travel (step 2), or faster couriers mean nothing.
- Faster armies need marching by distance, with routes split into seasons (questions 1 and 4). With one-hop moves, a road could only allow two-hop moves, which breaks the Diplomacy adjudicator.
- Cutting roads and reading letters need interception on routes.

It fits the long-term tree of trust, which is about how fast information moves and who can read it. Joint roads are a good trust object. Tablets are never enforced (pillar 1), so shared use must be a standing permission each side grants by order and can withdraw. The forts of the Ways of Horus belong to walls (question 5), and its wells to a desert supply rule for Sinai.

**With sieges and sleeping seats.**
- The order: sieges first, travelling news once they work (step 7 of "What to do next"), the delay inside the realm after. Messages under siege come with sieges.
- The delay makes scheduled orders essential, which the sleeping seats already provide. But a scheduled order names a province, so it must learn to follow its unit.
- Wake triggers must fire when the news reaches the court, not when the event happens. Otherwise the wake-up itself leaks the news. Step 1 must switch "a province changes hands" to the known owner.
- Sieges need new wake triggers; question 5 gives the one list ("Assessment (game length and sleeping seats)"). A captured envoy's king wakes only when the news reaches him, so nothing leaks.
- With the delay, news trickles in over several seasons, and each piece may wake a seat. The sleep report will show whether that costs more calls.

**Plan:**

**News of who holds what (once sieges work, step 7 of "What to do next").**
1. Each power keeps a map of known owners, each entry stamped with the season it was true.
2. Changes inside its sight show at once. Changes elsewhere arrive after `TravelTurns(province, court)` seasons, 1-3 with today's bands. "A kingdom falls" travels the same way.
3. Province spies report with delay instead of adding live sight, as the design document's "Spies and intelligence" intends.
4. The rulebook line at `Prompts.cs:68` says distant news arrives late and shows its season. The "changes hands" trigger reads the known owner.

**Delay inside the realm (after sieges, behind a toggle).**
1. Configurable starting values: no delay within 2 hops of the court, 1 season at 3-6 hops, 2 at 7 or more. This keeps the whole Levant 1 season from Akhetaten. Today's envoy bands would put Ugarit, Qadesh and Amurru 2 seasons away each way. That round trip of 4 seasons is longer than most sieges should last.
2. A province at delay d shows its state as of d seasons ago. GameState keeps about 3 seasons of positions and owners.
3. An order to a unit at delay d is queued to run d seasons later and is re-validated then. It is addressed by unit id, resolved from "the unit I last saw at X", so the order schema keeps province names.
4. Every army beyond 2 hops gets a standing intent, carried out by a default commander without traits (question 7, step 2).
5. The map shows each province's last known state and its season. Wake triggers read the delayed view.

**Messages under siege (with sieges, question 5).**
1. The capture roll, tightness and refusal follow question 5, step 12, and a capture follows step 13. The besieger is shown the letter, the mandate and any tablet through the view a secret master gets.
2. Later options: spies, couriers and ransoms leaving or entering roll too, and an open sea (no hostile fleet in a neighbouring sea zone) helps a coastal city's travellers through.
3. Later too, as question 5, step 13 says: a dispatch may name up to 3 courts in turn, with gold and a tablet for each stop. Each tablet pays its fee, and one report comes home at the end.
4. Wake triggers: the one list in question 5 ("Assessment (game length and sleeping seats)").

**Gold.**
1. Build delayed income only together with the delay inside the realm. A province at delay d pays d seasons later. Gold on the road is listed in the treasury report and counts in strength.
2. With sieges: a besieged province pays its owner nothing.
3. Real caravans wait for interception. They can build on `Journey`, which already has a gold field (`GameState.cs:217`).

**Tablets.**
1. Keep the fee at 20. After model games, compare tablets proposed with tablets sealed. If kings put a tablet on most letters, raise it to about 40. If nobody proposes one, lower it to about 10.

**Roads (after the delay, sieges and routes split into seasons).**
1. A relay station in a held land province costs about 60, with upkeep of about 5 a season.
2. For couriers, a link touching a station counts half a hop. With stations in Sinai, Gaza and Megiddo, Gaza and Megiddo come within 2 hops of Akhetaten.
3. Once routes are split into seasons, a road shortens marches too, for invaders as well.
4. A station falls with its province and is cut while a hostile unit stands in it.
5. Joint use is a standing order, "P may use my stations", often written into a tablet. The host decides by standing order whether his keepers open passing letters. An opened letter shows a broken envelope with a set chance, so reading is a choice with a risk, not a dice roll.
6. New wake trigger: a station is cut or captured.

**Core hypothesis:** Travelling news of who holds what serves it directly: it gives envoys' and spies' reports value, and room to lie. Build it once sieges work (step 7 of "What to do next"). Messages under siege serve it once sieges exist; the delay inside the realm, delayed income and roads serve pillar 8 and belong later.

**Simulation could change this:** yes: for news, messages under siege and the tablet fee, not for gold or roads. The 10-season runs use today's rules, so they cannot test a delay; they can change priorities.
- Count orders to units 3 or more hops from their capital, and kings' notes that cite the public map about distant wars. If kings follow far wars from the map, step 1 moves up. If they rarely act beyond 2 hops, the delay matters little early.
- In the sleep-on run, count scheduled orders and how many fail. If kings rarely schedule, or their schedules often fail, the delay needs commanders from day one.
- Watch whether kings who lose land write to third courts for help. If they do, messages under siege come with the first siege build.
- Tablets proposed against tablets sealed, and any king naming the fee as a reason, set the fee.

### 7. Command at a distance

**Status:** idea, not built. The king has no location and is not a person, and units have no commanders.

**Today:**

**The king and his capital.** The capital is fixed per power in the map data (`src/Amarna.Engine/Map.cs:60`). Envoys, spies and ransoms travel to and from it (`src/Amarna.Engine/TurnEngine.cs:194`; `src/Amarna.Engine/TurnEngine.Intel.cs:35-36`, `119-125`, `260`). Losing it costs what losing any homeland province costs: its yield, 10 × yield in strength (`TurnEngine.cs:421-422`), and a levy site (`src/Amarna.Engine/OrderValidator.cs:157-158`). Envoys still arrive at a capital an enemy holds. A power falls only when it holds no province (`TurnEngine.cs:401-417`).

Only the bots value holding the capital. They add 80 to its worth (`src/Amarna.Game/Bots/Board.cs:55`) and 60 for taking a rival's (`src/Amarna.Game/Bots/Tactics.cs:213`), and trust it only to a sworn ally (`Tactics.cs:94-96`). The engine uses it only as the fixed point for travel, desertion order (`TurnEngine.cs:73-75`) and envoys' observations (`src/Amarna.Engine/TurnEngine.Envoys.cs:360-361`). `Map.Capital` is called in 10 places outside `Map.cs`, plus the king's identity line (`src/Amarna.Llm/Prompts.cs:106`).

**Envoys.** An envoy's location is a court, not a province (`src/Amarna.Engine/GameState.cs:177`). His mandate is free text of up to 600 characters, fixed at dispatch (`TurnEngine.Envoys.cs:20`, `GameState.cs:227`). No order reaches an envoy abroad except dismissal, which frees him at once wherever he is (`src/Amarna.Engine/OrderValidator.cs:227-228`). He goes to one court and home, and turns back if that kingdom has fallen (`TurnEngine.Envoys.cs:98-103`, `321`).

**Armies.** A unit is only an id, a power, a kind and a province (`GameState.cs:87-95`). It has no commander, and the king orders it directly by the province it stands in. 19 units stand on the map at the start (`src/Amarna.Engine/MapData.cs:160-181`). Troops desert only when upkeep is unpaid, farthest from the capital first (`TurnEngine.cs:68-78`). Units change sides only when their king gives them away (`TurnEngine.cs:352-360`).

In the working tree, a sleeping seat's units hold and its scheduled orders run (DESIGN-NOTES.md "Pacing: sleeping seats"). File seats will let agent kings play this for the first time (DESIGN-NOTES.md "File seats and the agent simulation"). Both are built but not yet played by models.

**Characters.** The pool is 18 (`src/Amarna.Engine/GameConfig.cs:37`), with 2 envoys per power at the start (`GameConfig.cs:36`). Traits are loyalty, greed, competence, ambition, courage and an optional sympathy (`GameState.cs:122-131`). There is no caution or aggression trait; those are weights in the kings' temperaments (DESIGN-NOTES.md "Script kings"). Ambition over 70 can bring the deep fact "Dreams of ruling a city of their own one day" (`src/Amarna.Engine/CharacterFactory.cs:137-138`).

Parts to reuse:
- Captivity for caught spies: execute, ransom (5-season deadline, the ransom travels), turn or release (`TurnEngine.Intel.cs:196-273`).
- An envoy's defection on a job offer (`TurnEngine.Envoys.cs:252-267`).
- Loyalty drops 15 per unpaid season. An unpaid character below 20 quits if he is at court with no task (`TurnEngine.cs:97-100`).
- `Tactics.Make` takes a temperament override (`Tactics.cs:67-71`). The search budget is 720 adjudications per king per season (`src/Amarna.Game/Bots/Search.cs:16`), about 20 ms natively (DESIGN-NOTES.md "Script kings").

**Assessment:** The package hangs together, and it fixes real problems:
- It makes a far-flung empire slow at its edges.
- It gives sieges a political side. A king inside his besieged capital is cut off and can be captured. A king outside commands the relief but leaves the city to a commander.
- It makes long sleeps safe. Today a sleeping king's units hold or carry out orders fixed in advance; a general would carry out an intent.
- It gives kings a new excuse, "my general acted without orders", a cousin of "your messenger is lying".

Generals as scripts cost no model calls. The bot tactics already play an army well. A general is that code run on a few units, with weights from his traits. Script time grows with the number of generals: up to about three runs per king instead of one.

The price is the largest build in the document after sieges:
- A new kind of character with its own decision code.
- A view of the last known state of distant places (question 6).
- Orders addressed by unit, and a queue for delayed orders.
- The court's location. In code it is cheap, about ten call sites. The cost lies in the rules for moving, waiting envoys and forwarding.
- Capture, regency and succession, which make the king a person.
- More interface, and a longer rulebook (about 5,000 tokens today, DESIGN-NOTES.md "Models") that must teach intents and limits.

It also blurs the experiment. When trust fails, did it fail between kings or inside a realm? A pool of about 40 strains the design's aim of a few well-known figures. And most of what generals test, trusting an agent with motives, envoys already test. Generals earn their place only once distance forces delegation.

A concrete case. A pharaoh who moves his court to Megiddo spends 3 seasons and about 110 shekels on the road. There he commands Qadesh, Byblos and Damascus at once, all within 2 hops. Akhetaten and Thebes fall a season behind. Babylon's envoys reach him in 1 season instead of 2.

Interactions:
- **Sieges.** The general chooses to storm or starve, and the besieger pays for the army on the spot. A siege must outlast the king's news-and-order round trip plus a relief march, or the distant king has no say. Under the proposed delay rule the Levant is 1 season each way from Akhetaten. With today's travel bands, Ugarit, Qadesh and Amurru would be 2 each way. So a capital's siege should last roughly 3-5 seasons.
- **Envoy authority (question 14).** Distance makes delegation necessary, so authority to seal matters most for a king away from his seat. One mandate type with engine-checkable limits can serve envoys and generals. "Beyond his authority" works for both.
- **Sleeping seats.** Script generals let seats sleep long at no model cost. New wake triggers: a general disobeys or defects, the court is threatened, the king is captured. All fire when the news arrives, not when the event happens.

Verdict: the depth is worth the complexity after the prototype, not inside it. Make it the first expansion if trust between kings emerges. Inside the prototype, take only the pieces that pay for themselves:
- news of who holds what travels (question 6), once sieges work (step 7 of "What to do next");
- the automatic court move when a capital falls, which the siege package already has (question 5, step 17);
- the delay with default commanders, only if model games after sieges still show size deciding too much.

Generals with traits, desertion, defection and succession wait. They add a second layer of mediated trust before the first is shown to work.

**Plan:** Each step is usable on its own. All numbers are starting values.
1. Prerequisites: sieges, walls and terrain (question 5); the scheduled-order queue (built in the working tree); orders addressed by unit id.
2. Delay inside the realm, with standing intents and default commanders without traits (question 6). Intents come from a small fixed list: hold X, take X, defend X, support P against Q, come home. A commander runs `Tactics.Make` on his own units with local sight. It needs a filter for which units it plans.
3. Court location. Until this package exists, the court moves automatically when a capital falls (question 5, step 17); the king choosing where to move it, and his capture (step 6), belong to this package. Each power has a court province, the capital at the start, and all travel is measured to it. Moving it costs about 50 + 20 per hop and goes one hop a season, with no audiences on the way. Envoys and reports reaching the old seat wait or follow. A script envoy follows if competence + courage is at least 100 and no enemy holds the road. A king who loses his court moves it to another city he holds, or abroad as a guest who can become a hostage.
4. Generals as characters, one per army group, paid like envoys (about 10-20 a season, which also makes war dearer). A general's temperament blends half and half with the king's: aggression = (ambition + courage)/200, caution = 1 − courage/100. Competence sets the search budget (150 + 6 × competence, about 270-720), so a poor general misses moves. Loyalty sets how strictly he keeps his limits. Generals draw traits from their own random stream, so existing seeds keep their characters (`CharacterFactory.cs:109-113` draws traits in sequence).
5. Desertion and defection come from seeded rolls with motives: unpaid seasons, long campaigns, defeats and sympathy for the enemy next door. Later, envoys who visit a camp can bribe. Defection uses the existing gift path; desertion removes the unit. A general who dreams of a city of his own is the natural rebel. Rebels holding land come last, if ever, since they need owners that are not powers.
6. The king's exposure. The king is at the court. If the court falls, he is captured and the captive rules apply. While he is held, a regent plays the seat but cannot seal tablets or move the court. Execution brings a successor. Tablets record which king sealed them, so a successor can claim his father's oaths died with him.
7. Mandates come from wherever the king is. New instructions to an envoy abroad travel from the court. An envoy may follow a foreign king on campaign. The rule: an envoy who arrives to find the host king away from his court follows him if competence + courage is at least 100, the test in step 3, and otherwise waits at the court. It applies only once kings have a location (step 3), and only while the host king himself is away, not his generals.
8. The pool grows from 18 to about 40. Generals' personas come from templates. At most a few key generals get model-written reports.

**Core hypothesis:** Later: it carries mediation into the realm, but the prototype must first show trust forming between kings. Only travelling news, once sieges work (step 7 of "What to do next"), and the automatic court move of question 5 belong in it.

**Simulation could change this:** yes: the runs can change the build order and timing, not the facts about today's code.
- Many invalid orders or misread views would mean intents, generals and moving courts overload model kings now.
- Notes that already read like intents with limits ("hold at Carchemish, do not enter Hatti") give the intent vocabulary.
- Kings who excuse broken deals with "my envoy exceeded his mandate" would use "my general acted alone" too. Kings who never make excuses gain little from generals.
- The share of fighting more than 2 hops from the capital shows how much distance would bite in short games.
- In the sleep-on run, how kings use scheduled orders shows whether they can command ahead at all.

## Question 8: pirates and bandits

Line references are at commit 23e0a4f unless marked "working tree".

### 8. Pirates and bandits

**Status:** idea, not built. Only the vocabulary exists: this round added the Habiru to the customs primer as text.

**Today:**
- At 23e0a4f, none of bandit, pirate, Habiru, patrol or intercept appears in `src` or `docs`. "Caravan" appears only as the calling "caravan master" (`src/Amarna.Engine/CharacterFactory.cs:46`).
- The primer at 23e0a4f had no Habiru line (`src/Amarna.Llm/Prompts.cs:75-81`). The working tree adds one (`Prompts.cs:94`). DESIGN-NOTES.md "Models" says the Habiru are words only.
- Lukka is a free coastal city with yield 25 (`src/Amarna.Engine/MapData.cs:62`). It has walls (`src/Amarna.Engine/GameFactory.cs:13`) and never acts. It shares the Cilician Sea and the Great Green with Alashiya (`MapData.cs:150-151`).
- Nothing can be intercepted, because travel is a timer. A dispatch adds a Journey with an arrival turn and takes the envoy off the board (`src/Amarna.Engine/TurnEngine.Envoys.cs:66-79`). A Journey has no route or position (`src/Amarna.Engine/GameState.cs:202-218`).
- Travel time counts hops between capitals over every edge, sea included, whoever owns the land. Up to 4 hops is 1 season, up to 7 is 2, more is 3 (`src/Amarna.Engine/TurnEngine.cs:194-203`, `src/Amarna.Engine/Map.cs:110-135`, `src/Amarna.Engine/GameConfig.cs:25`). No two capitals are more than 7 hops apart, so every journey between courts takes 1 or 2 seasons.
- Gold moves between kings only with envoys (`TurnEngine.Envoys.cs:12-17`, `290-300`) or as ransom (`src/Amarna.Engine/TurnEngine.Intel.cs:249-274`). Each power sends at most 3 envoys a season (`GameConfig.cs:26`).

The closest existing pieces:
- **Skimming.** A script envoy with greed over 60 and loyalty under 60 skims gold, both ways (`src/Amarna.Game/Bots/ScriptMind.cs:44-45`, `152`). It keeps (greed − 50)/250, rounded down to 5-shekel steps: 12% at greed 80. The receiving court's weighers see the shortfall, the host's on the way out and the sender's on the way home (`TurnEngine.Envoys.cs:194-205`, `344`, `434-446`).
- **Detention**, only at the host's own court during the audience (`TurnEngine.Envoys.cs:282`, `312-320`).
- **The overdue rumour.** For a detained or defected envoy, the sender hears "has not returned... No word has come" a season after it was due (`TurnEngine.Envoys.cs:307-337`). The text is the same for both cases.
- **A leak that undercuts any cover story.** The sender's YOUR PEOPLE list shows the truth the same season. A detained envoy reads "has not returned from X"; a defected one drops off the list and its wage stops (`src/Amarna.Engine/Views.cs:142-146`, `198`; `TurnEngine.cs:84`). Audiences resolve before orders (`src/Amarna.Game/GameRunner.cs:140-143`), so the list tells the sender 2-3 seasons before the rumour does.
- **Policing** is only watchmen against spies: detection 5% + spend/300 − competence/400, clamped to 2-60%, for one season (`TurnEngine.Intel.cs:9-10`, `104`; cleared at `TurnEngine.cs:34`).
- **Desertion.** Unpaid troops desert, farthest from the capital first, and simply vanish (`TurnEngine.cs:68-78`).
- **Sleeping seats** (working tree, built but not yet played by models). An overdue rumour does not wake a sleeping seat; a ransom demand does (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`)).

**Assessment:**
The valuable part is the sponsored, deniable raid. Its author cannot be proven, and every lost envoy gains a cover story: "the Habiru took it." A host could detain an envoy and claim it never arrived. That is the core of the game.

The world force matters mainly because it makes the cover story credible and puts a price on neglect. Its causes must be visible: deserters, war, disaster, empty borders. A flat raid chance on letters would be unexplained noise, which pillar 3 forbids.

It cannot work today, for three reasons:
1. **No routes.** A raid would be a dice roll on a timer. No king could choose a safer road or patrol one.
2. **War is already too fast** (DESIGN-NOTES.md "Where the code differs from the design document"). Losses on the road slow diplomacy further against war, the wrong way for pillar 8.
3. **The court-list leak.** The sender learns at once whether its envoy was held, so no "it never arrived" story survives.

Piracy also taxes the weakest power most. Every Alashiya journey crosses a sea zone, and Alashiya wins 4-6% of bot games (DESIGN-NOTES.md "Balance (script kings)"). Its fleet must be able to keep its own waters clear.

A stopgap without routes is cheap: one roll per journey over the provinces on its shortest path. I advise against it, for reasons 1 and 2.

Once routes exist, the cost is about one round. The lawlessness state and the raid roll are small. Sponsorship, tracing, bot rules, prompt text and tests are most of the work.

**Plan:** All numbers are first proposals.
1. **Now, independent of outlaws:** the sender's court list shows only what it could know. An envoy abroad stays "travelling as envoy to X" until it returns or the overdue rumour arrives. This is a small change in `Views.cs` and serves pillar 4 today.
2. **Prerequisites:** sieges (question 5) and route travel with a position each season (question 1). Then the meeting rule on the road and, for pirates, coastal waters (both question 4).
3. **Lawlessness:** a hidden whole number from 0 to 10 per province and sea zone. Seed it higher in Amurru, Megiddo, Damascus, Sinai and the Lukka waters. Outlaws are this hidden engine state, run by scripted rules, not script characters, because a band needs no traits, wages or memory, costs no model calls, and adds nobody to the pool of 18 known figures.
   - Each season: +2 where troops deserted, +1 for a battle in or next to it, +1 for the owner's unpaid upkeep, and +1 for poverty: a low-yield province (base yield 20 or less) or one impoverished by a catastrophe.
   - Each season: −1 per army of the owner in or next to it, −1 for walls, and at sea −1 per fleet in the zone. Troops are the patrols, already paid as upkeep.
4. **Raid roll** per route segment: lawlessness × 1.5%, plus any sponsorship. The envoy's courage and competence decide the outcome:
   - it slips past;
   - it is robbed: the gold is lost and the tablets are read;
   - it is captured, and the outlaws demand a ransom through the existing RansomDemand task;
   - rarely, it is killed.
   A survivor reports what it saw. Caravans can be raided only once trade exists (question 11).
5. **Sponsorship order:** SponsorOutlaws(province or sea zone, gold, optional target power), for example +5 points per 20 gold, capped. The sponsor's share of the loot arrives later as an unassayed lot "from the hills". That lot is a clue.
6. **Tracing, modelled on forgery:**
   - a captured raider confesses with chance 20% + the victim's watch spend/400;
   - a spy at the sponsor's court can see payments to the Habiru;
   - a seized tablet shown later carries its provenance.
   Forgery tracing is announced to every court. A traced raid should be told to the victim only, so third parties must still judge.
7. **Sleeping seats:** a robbery wakes the sender, and a capture already does through the ransom rumour. Rumours of unsafe roads go to the digest.
8. **Script kings** sponsor raids when cunning is at least 0.7, the grudge is high and the target's envoys cross lawless ground. They patrol where their own envoys were hit. They accuse rivals of being "in league with the Habiru".
9. **Finishing:** rulebook text, schema, a sponsored-raid signal marker, and tests for exact replay, tracing odds and no leak into the victim's view.

**Core hypothesis:** It serves the hypothesis directly: a deniable raid is unverifiable conflict at its purest, and the primer's Habiru words serve it now, free. The mechanic must wait for sieges and routes, or it adds noise and makes war relatively faster.

**Simulation could change this:** yes: the primer alone may be enough. If agent kings blame lost envoys or call rivals "in league with the Habiru", the words carry much of the value. The mechanic can then wait. If they spot and use the court-list leak, step 1 moves up. The run also counts envoys and gold on the road each season. That sets how disruptive a raid rate would be. Ten seasons with script envoys give a weak signal.

## B. Economy, disasters and geography (questions 9-11)

### 9. Varying output

**Status:** partly implemented. Disasters change output; seasons and time do not.

**Today:** Each province has one fixed yield in `src/Amarna.Engine/MapData.cs:20-74`: Babylon 55; Hattusa, Washukanni and Akhetaten 50; Sinai 20, as are the free cities Amurru, Megiddo and Gaza. `Province` has no other economic field (`src/Amarna.Engine/Map.cs:10`). Income is the sum of `EffectiveYield` over the provinces a power owns (`src/Amarna.Engine/TurnEngine.cs:65`). `EffectiveYield` multiplies the base yield by each active catastrophe's factor and rounds to even, so 22.5 becomes 22 (`TurnEngine.cs:118-129`).

**By season:** no. A year has 3 seasons (`src/Amarna.Engine/Calendar.cs:6`). The names are display only: Akhet, Peret and Shemu for Egypt, "the first season" and so on elsewhere (`Calendar.cs:13-19`). No code reads the season for yield.

**Over time:** no. Yields never grow or decay. Conquered land pays its full yield to the new owner the next season: ownership changes at `TurnEngine.cs:326`, income at `TurnEngine.cs:65`. There is no absorption delay, war damage or investment.

**Disasters:** each living power that owns land rolls once a season after resolution, at 0.035 (`src/Amarna.Engine/GameConfig.cs:21`, `TurnEngine.cs:250`, `src/Amarna.Engine/TurnEngine.Events.cs:8-14`). The kind is drawn evenly from four, so 0.875% each. Effects start next season and last through their end turn (`TurnEngine.cs:125`).

- Drought: the whole realm yields x0.5 for 3 seasons (`TurnEngine.Events.cs:19-27`).
- Plague: the whole realm yields x0.75 for 2 seasons, and one random unit dies at once (`TurnEngine.Events.cs:28-40`).
- Flood: one random owned province yields 0 for 2 seasons (`TurnEngine.Events.cs:41-50`).
- Earthquake: one random owned province yields 0 for 4 seasons (`TurnEngine.Events.cs:51-60`).

Factors multiply: two droughts give x0.25, and a flood during a drought gives 0. Catastrophes change only income, plus the plague's lost unit. If the treasury then cannot cover upkeep, unpaid troops desert, farthest from the capital first (`TurnEngine.cs:69-78`). Servants whose wage cannot be paid lose 15 loyalty each season, and one below 20 with no duty quits (`TurnEngine.cs:84-101`).

A drought cuts Babylonia from 195 to 100 a season: 285 gold in all, 11% of its starting strength of 2,600. Egypt loses 285 of 2,500 and Alashiya 129 of 1,200. Expected loss is about 3% of income a season for the large realms (Babylonia about 5.4 gold). It rises to about 4.4% for two-province Alashiya. A plague on Alashiya at the start kills its only unit, the fleet at Enkomi (`MapData.cs:180`).

Quirks:

- Realm-wide effects follow the crown, not the land (`TurnEngine.cs:126`). Land conquered during a drought is halved; land ceded escapes it.
- Province effects stay with the province, even after cession or conquest.
- Neutral cities never suffer catastrophes.
- The score is not hit directly. Strength and city prices use base yields (`TurnEngine.cs:421-422`, `TurnEngine.cs:378`), so only the lost gold counts.
- The earthquake text says the walls were thrown down (`TurnEngine.Events.cs:55`), but a bought city's walls (`Garrisons`) stay up.

Who learns what:

- The stricken power gets an exact notice the next season (`TurnEngine.Events.cs:63`) and sees its lower income (`src/Amarna.Engine/Views.cs:124`). The seat view shows the notice only that season (`Views.cs:135`). The human inbox panel can show earlier seasons; a model king keeps it only in its own notes.
- Every other living power gets one rumor, sent capital to capital (`src/Amarna.Engine/TurnEngine.Intel.cs:276-289`). It takes 1 season within 4 hops and 2 within 7 (`GameConfig.cs:25`). Every capital pair is 1 or 2 seasons apart; Egypt-Babylonia is 2.
- The wording is vague 50% of the time, exaggerated 25% and understated 25% (`TurnEngine.Events.cs:66-71`). It names the realm and the kind, never the province or duration. No rumor is invented, but the exaggerated ones are false in degree ("half the army is dead").
- An untouched spy at that court observes every active catastrophe, province included, with no roll (`TurnEngine.Intel.cs:154-155`). A turned spy keeps only one observation, and the report arrives after travel time.
- A visiting envoy notices each one with chance 0.4 + competence/200 (`src/Amarna.Engine/TurnEngine.Envoys.cs:372-373`).
- Script kings never read catastrophe notices or rumors. They react only through lower income: cash flow, court size, check thresholds and gift caps (`src/Amarna.Game/Bots/Statecraft.cs:147`, `:239`, `:253`, `:469`).
- Model kings get one rulebook line (`src/Amarna.Llm/Prompts.cs:65`) and the Nergal excuse in the primer (`Prompts.cs:81`). The rules are in DESIGN-NOTES.md, Characters, "Catastrophes".

For a living power, the seed alone fixes whether a catastrophe strikes, when, and which kind. The province, the plague victim and the rumor wording depend on play.

Sleeping seats and file seats are built but not yet played by models. A catastrophe on a sleeping seat's own realm wakes it (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`), working tree). Rumors about others and treasury notices wait in its "while you slept" list. A seat can also ask to be woken when its treasury falls below an amount. A file seat sees the same notices and rumors as a model king.

**Assessment:** The disaster layer works and was cheap to build. It does less for the hypothesis than the design intends, for two reasons.

First, the leak is total and faceless. Every catastrophe reaches every court within 1-2 seasons, with its true kind. The 50/25/25 wording roll has no carrier and no motive, which breaks pillar 3. It also weakens pillar 5, because the basic truth arrives free.

Second, an invented disaster is exposed only by inference. A court that heard no rumor could suspect a lie, but only if it knows rumors always come. The rulebook says only that rumors are "late and unreliable" (`Prompts.cs:65`). So the lie is neither safe nor cleanly checkable.

Disasters are rare. A given power has about a 30% chance of any catastrophe in 10 seasons. A 10-season game has about an 8% chance of none at all.

The kinds of variation, by value:

- Over time, slow absorption of conquered land: high value now. Conquest pays less, which serves pillar 8. It belongs in the siege package (5). The score counts base yield, so it cuts only the gold from conquest, not the score; that is question 25's call.
- A hidden yearly harvest per region: moderate value, low cost. Every king would hold a private fact each year, a steady supply of plausible excuses.
- By season: low value on its own. Moving the same yearly total between seasons matters only with campaign seasons, or with payments due "after the harvest".
- Investment, such as granaries and canals: grand-strategy depth. Not for the prototype.

False rumors with a motive need no new order. A king can already write anything in a letter.

**Plan:**

1. With sieges (5): slow absorption, as in question 5, step 16. A conquered province pays a third of its yield in its first season and two thirds in the second, and full yield from the third. Bought or ceded land pays in full at once. Store when and how each province was acquired in `GameState`, and add one factor in `EffectiveYield`.
2. In the same window: once walls vary, an earthquake lowers the stricken province's walls by one level, which fortify can rebuild (question 5, step 11). Until then, fix its text. Drought by land rather than crown comes with 10.
3. Next, give the leak faces, in under a day. Remove the automatic rumor to every court. Neighbours whose sight covers a stricken province see it as a plain fact. Distant courts learn only through envoys and spies, who already observe catastrophes. Update `Prompts.cs:65` to say so.
4. Later, with the climate zones of 10: a hidden yearly harvest per zone, good, normal or poor (about ±20% for 3 seasons). The owner knows it exactly; others learn by sight, envoys and spies. It never wakes a sleeping seat.
5. Seasonal income only together with campaign seasons, if those are built.
6. Investment after the prototype.

New numbers go in `GameConfig` and DESIGN-NOTES.md, with tests and a replay check.

**Core hypothesis:** The catastrophe excuse serves the hypothesis now, but the universal, faceless rumor blunts it; step 3 fixes that cheaply. Slow absorption serves pillar 8 and goes with sieges, while seasonal and yearly yield changes can wait.

**Simulation could change this:** yes: seed 7 rolls a drought on Hatti at the end of season 3 (half income in seasons 4-6). It rolls a plague on Alashiya at the end of season 6 (seasons 7-8, one unit lost at once). A script-only run of seed 7 confirms both, and both fall in both runs while the two powers live. Alashiya's plague replays the Nergal letter: watch whether its king uses the excuse. Mitanni, Arzawa and Alashiya hear of the drought in season 4, the other courts in season 5. Watch whether they probe it, exploit it, or ignore it. Watch whether Hatti's war slows: its starting 2 armies and fleet cost 95 a season against about 91 drought income. If kings ignore rumors, step 3 matters less; if they catch or exploit excuses, it matters more. The batch success signals skip catastrophes (`src/Amarna.Game/Signals.cs:29`), so this needs the message trail.

### 10. Disasters and geography

**Status:** not implemented. Disasters ignore geography, and river-specific floods are an idea, not built.

**Today:** **Geography.** Catastrophes are rolled per power, not per place (`src/Amarna.Engine/TurnEngine.Events.cs:8-14`). Every power faces the same 3.5% and the same four kinds, island Alashiya included. The map has no rivers, terrain or climate (`src/Amarna.Engine/Map.cs:10`); edges are only land, coast or sea (`Map.cs:6`). Drought and plague hit the whole realm. Flood and earthquake hit one owned province chosen at random (`TurnEngine.Events.cs:42`, `:52`), so the Sinai desert can flood.

Nothing spreads: not to neighbours, not downstream, not to neutral cities, not with armies or envoys. Distance matters only for how late the news travels, by rumor capital to capital and by spy and envoy reports. The design document lists geography-based disasters under "Ideas under consideration".

**Rivers.** The Nile and the Tigris and Euphrates are treated alike. Egypt and Babylonia each have a 0.875% flood chance a season, with the same effect: one random province at 0 for 2 seasons (`TurnEngine.Events.cs:41-50`). Babylonia is the richest start: 195 yield, 650 gold, strength 2,600 (`src/Amarna.Engine/MapData.cs:44-48`, `:187`). Egypt has 190, 600 and 2,500. Babylonia's flood risk is about 8% over 10 seasons.

**Assessment:** **Geography.** Worth doing, but not first. The gain is information, not realism. A drought across Upper Mesopotamia would hit Mitanni, Assyria and neutral Carchemish together. Neighbours could check an excuse against their own fields; distant courts could not. Credibility would then depend on distance, which fits pillars 4 and 5.

Plague that travels with armies and captives has a period anchor. Mursili II's plague prayers blame prisoners brought back from the Egyptian land of Amka. It would give taking captives and detaining envoys a cost.

Rule cost is low, about two rulebook lines; build cost is moderate. A regional shock hits large powers harder in absolute terms, which is a new balance lever. More shared events also mean more wake-ups for sleeping seats.

**Rivers.** The history holds in broad lines. The Nile rose on a regular yearly schedule in Akhet, and Egypt measured it; a low Nile meant a lean year. The Tigris and Euphrates flooded in spring near the harvest, with large swings, breaking levees and moving channels.

The best value is again information. Egypt's "the Nile failed" would be rare, and plain to any envoy at Pharaoh's court. Babylon's "the river took my fields" would be common and plausible.

As a check on Babylon, swings alone do little under relative scoring; only a lower expected yield tempers it. The tables in step 4 cost Babylonia about 7.5% of its yearly income of 585, against Egypt's 3% of the 510 from its Nile land. That gap is a design decision to record, not a number to tune against bots now.

The upstream warning (Mitanni at Terqa and Assyria at Nineveh and Ashur seeing the high river first) is weaker than it looks. Their envoys take 1 season to Babylon, so a one-season warning arrives with the flood. Babylonia also has nothing to do with a warning, since there are no levees to build. Leave it out of the first version.

**Plan:**

1. Data in `MapData`: a climate zone per province (Anatolia, Upper Mesopotamia, Levant, Cyprus, irrigated Nile, irrigated Mesopotamia). Add a fault flag for Anatolia, the Levant coast and Cyprus.
2. Ordered river lists, as game geography. Nile: thebes, akhetaten, memphis, delta. Euphrates: carchemish, terqa, mari, sippar, babylon, nippur, ur. Tigris: nineveh, ashur, ekallatum, durkurigalzu.
3. Roll by region, keyed by seed, turn and region, so replays stay exact. Drought per rain-fed zone, neutral cities included; the two irrigated zones are exempt. Earthquake per fault zone, lowering walls once they vary. Plague starts in one province and spreads by chance to neighbours, carried by moving units and returning envoys and captives.
4. One flood roll a year per river, in its flood season. Nile, illustrative: 85% normal, 10% low (Nile land x0.75 for 3 seasons), 5% high (one province at 0 for 1 season). Tigris and Euphrates: 70% normal, 10% low, 15% destructive, 5% great. A destructive flood starts at a random river province and runs downstream, 50% per step, each province at 0 for 2 seasons, across borders. A great flood hits 2-4 provinces in a row. Drop the generic flood kind.
5. The owner of each hit province gets the exact notice. Powers whose sight covers it see it (`src/Amarna.Engine/Views.cs:94-105`: own land, unit positions and spy-watched provinces, plus their neighbours). Others learn through envoys and spies, as in 9 step 3.
6. Two lines in the rulebook (`src/Amarna.Llm/Prompts.cs:65`), zone and river tags in the map listing, and numbers in `GameConfig` and DESIGN-NOTES.md.
7. Tests: determinism, spread and downstream order, neutral cities hit, and loss distributions over many seeds.

It depends on 9 step 3 and on walls (5). About 2-3 days in all.

**Core hypothesis:** Partly. Local, shared shocks make some excuses checkable and others not, which serves trust under delay; the Babylon balance side is asymmetry and flavour. It is not the bottleneck, so build it after sieges and walls (5) and the rumor change in 9.

**Simulation could change this:** yes, weakly: seed 7 has no flood or earthquake in 10 seasons, so the rivers cannot be tested. Hatti's drought in seasons 4-6 shows whether neighbours treat a rumor as confirmation, probe it with envoys, or exploit it. If they never react, geography can wait longer. If model Babylonia runs away as the richest power, the case for tempering it grows, though balance stays provisional.

### 11. Trade

**Status:** idea, not built. Trade goods and markets are deliberately out of the prototype (design document, "Prototype scope", Economy row).

**Today:**
- Gold is the only currency, and there are no goods. Land and units can also be handed over (`src/Amarna.Engine/TurnEngine.cs:337-361`).
- Gold moves between kings with envoys, out and back (`src/Amarna.Engine/TurnEngine.Envoys.cs:12-17`, `290-300`), or as ransom (`src/Amarna.Engine/TurnEngine.Intel.cs:249-274`).
- Script kings send at most one gift-bearing letter a season. A gift is 20-60 shekels and no more than a third of a season's income, though never under 20 (`src/Amarna.Game/Bots/Statecraft.cs:463-470`). The weak pay tribute to neighbours (DESIGN-NOTES.md "Script kings", Letters).
- Every exchange is zero-sum or worse. Strength is 10 × base yields + gold (`TurnEngine.cs:421-422`), so a gift moves strength one-for-one from giver to receiver, and the score is growth in strength (`TurnEngine.cs:424-428`). The bot code calls gifts "score given away" (`Statecraft.cs:463`).
- Skimming loses some gold on the way, and debasement delivers less than the tablet states. Alashiya's historical "copper for gold" is gold for gold here.
- The only trade-flavoured rule is in city buying. A free city costs 10 × yield and can be bought across one sea zone: "islands trade by ship" (`src/Amarna.Engine/GameConfig.cs:20`, `src/Amarna.Engine/Map.cs:75-88`).
- The bots' commerce weight touches only free cities. It shapes city buying (`src/Amarna.Game/Bots/Statecraft.cs:208`, `211`) and cuts the value of attacking a free city by up to 45% (`src/Amarna.Game/Bots/Tactics.cs:84`).
- Alashiya's archetype has commerce 1.0 (`src/Amarna.Game/Bots/Personality.cs:85`). In a given game it lies between 0.85 and 1.0 (`Personality.cs:94-99`).
- Merchant, caravan master and copper trader are callings: public facts with no effect (`src/Amarna.Engine/CharacterFactory.cs:46-47`, `126`). Greedy characters may hide a debt to a trader (`CharacterFactory.cs:130`).
- City-states have no seat or treasury and never act (`src/Amarna.Engine/GameFactory.cs:13`, `17-21`).
- No king has an economic stake in another's survival. What makes a king object to others' conquests is the balance of power (DESIGN-NOTES.md "Script kings", Balance of power) and the conqueror's belligerence. The balance of power drives coalitions against the leader. A king attacked by a hostile neighbour with at least 0.8 × its strength asks for defence pacts (`src/Amarna.Game/Bots/Statecraft.cs:373-376`). The fall of a free city costs the conqueror only belligerence: +1 (+1.5 for a king's land), fading 30% a season. That adds up to 0.3 to the hostility every court expects from it and helps a defence pact against it get sealed (`src/Amarna.Game/Bots/Brain.cs:128-138`, `300`; `Statecraft.cs:629-630`). Nobody asks for help because a free city fell.
- Alashiya wins 4% and 6% of bot games in two runs of 100, and only by sharing a victory (DESIGN-NOTES.md "Balance (script kings)").
- Sleeping seats (working tree, built but not yet played by models) wake a host when an envoy waits to be received (`src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`)).

**Assessment:**
Not for the prototype, and not in the form described.

What trade would add:
- **A repeated trust game.** Seizing a partner's goods pays once; letting them pass pays every season.
- **A reason to object to conquest**, with no rule saying so: losing a partner ends the income.
- **A lever for weak powers**, and a reason to keep trading cities such as Ugarit, Byblos and Tyre free.

Why routes, caravans and traders should wait:
- It is the most expensive idea in this group. It needs route travel, interception and passage rules (questions 1-4), and outlaws (question 8) to make routes risky.
- It adds a second economy to balance while balance is frozen.
- Caravans need orders every season. That costs model tokens and attention that should go to letters. It also keeps sleeping seats awake, unless every caravan is scheduled.
- It tests the value of peace, not the mediated channel. Today's bottleneck is the tempo of war and the lack of model games.

A cheaper variant fits the hypothesis better: trade through the envoys who already carry gifts.
- A king ships its own product with an envoy, such as Alashiya's copper or Egypt's gold.
- The receiver gets it as gold worth more than it cost the sender, by a public margin for that pair.
- The sender gains only if the partner reciprocates, one to three seasons later, through fallible envoys.

That is the Amarna gift exchange as a trust game, for about half a round of work. Its risks are real. Two friends could pump gold back and forth, so it needs a cap tied to the sender's income. It changes balance. It rewards friendly pairs in the score, which shifts the relative-growth race. Whether to try it is a decision for after model games.

**Plan:**
1. **Wait for model games.** Read whether kings set up recurring gifts or tribute, and whether they care about others' conquests.
2. **If peace looks worthless,** test the envoy-trade variant behind a toggle, as with sleeping seats:
   - Products per power and trading city: copper, tin, gold, grain, horses, lapis, timber, dye.
   - A public margin table per pair, all paid in gold. For example 30% for complementary pairs (Alashiya's copper to Egypt), 0 for alike ones (two grain lands).
   - A goods amount on the dispatch order, capped each season, for example at a third of the sender's income. Purity, skimming and assays apply as for gold.
   - A merchant, caravan master or copper trader calling adds a few points of margin. That gives the existing facts a use.
   - Script kings reciprocate with trusted partners and stop after a slight. The commerce weight sets how much they ship.
   - Tests for exact replay and the cap. A batch check comparing the growth of trading pairs with that of conquerors.
3. **Only after routes, interception and outlaws, and only if step 2 worked:** caravans as journeys with cargo.
   - At a king's court, the host lets a caravan pass for a fee, taxes it or seizes it.
   - It returns with the margin, and the profit can be raided or skimmed on the way home.
   - Cost: two rounds or more, plus rebalancing.
4. **Trading city-states** need city-states that act, as in "City-states as script bots" under "Beyond the prototype". Leave them to that expansion.

**Core hypothesis:** Routes and caravans serve it only indirectly: they give peace a value but do not test mediated, delayed communication. The envoy-trade variant runs through the mediated channel itself, so it comes first if model games show a need; caravans wait for routes.

**Simulation could change this:** yes: if agent kings already arrange recurring gifts, tribute or "copper for gold" by letter, trade adds less. The same holds if they object unprompted to the conquest of partners or city-states. If they treat peace as worthless and the agent Alashiya finds nothing beyond buying cities, the case for the envoy-trade variant grows. Ten seasons give only an early hint.

## C. Characters, envoys, city-states (questions 12-14)

### 12. What moves the city-states

**Status:** not implemented. City-states are walled provinces with a price, not actors, so they have no motives and send no envoys.

**Today:** There are 13 free cities with yields from 20 to 40, 370 in all (`src/Amarna.Engine/MapData.cs:62-74`). None has a treasury, units, characters, a seat or a memory. Income goes only to living powers for land they own, so a free city's yield goes nowhere (`src/Amarna.Engine/TurnEngine.cs:62-66`).

No city can send or receive an envoy. `Power` is an enum of the seven kingdoms (`src/Amarna.Engine/Power.cs:4`). A dispatch must name a living power other than the sender (`src/Amarna.Engine/OrderValidator.cs:191`). The king's schema lists only the seven (`src/Amarna.Llm/Schemas.cs:56`). The engine writes notices about cities: purchase made or failed, walls fell, land taken or lost, not enough gold, buy order rejected. No city ever speaks.

What a city does, passively:

- **Walls.** Every free city starts walled (`src/Amarna.Engine/GameFactory.cs:13`). The walls hold at strength 1 and take no support (`src/Amarna.Engine/Adjudicator.cs:102-104, 134`). One army with one support takes any free city in one season (`tests/Amarna.Engine.Tests/AdjudicatorTests.cs:181`).
- **Sale.** The price is fixed at 10 × yield, so 200 to 400 shekels (`src/Amarna.Engine/GameConfig.cs:20`). The buyer must border the city by land or troops, or hold a coast on the same sea (`src/Amarna.Engine/Map.cs:83-88`). Two bids in one season both fail: the elders "would not choose between rival buyers" (`TurnEngine.cs:369-375`). There is no bidding above the price and no preference between buyers.
- **After a sale.** The walls hold for the new owner, who may support them but not enter (`OrderValidator.cs:121-122, 133-135`). Conquest tears them down. A city never becomes free again, never revolts and never pays tribute.
- **Score.** A purchase is score-neutral on the day: price and strength are both 10 × yield (DESIGN-NOTES.md, "Rules as implemented"). The gain is the income that follows.

All the motive sits with the buyers. Script kings rank cities by yield, danger and rival reach, and keep a reserve. For three seasons after a bounce they bid again only half the time (`src/Amarna.Game/Bots/Statecraft.cs:193-218`).

**Assessment:** A priced, walled province matches the prototype scope table, which keeps vassals out. It also leaves out most of the real archive: vassal pleas, mutual accusations, the Habiru. Speaking cities would add testimony nobody can check, which is on-theme. But a plea needs time to travel. Today a city falls to two armies in one season, before any plea could arrive. Speaking cities are worth little until sieges exist (question 5).

The bounce rule is worth keeping. Two kings who both want Byblos must agree who buys it, or nobody gets it. That is a negotiation the engine forces without any diplomacy rule. A sealed-bid auction would remove that reason to talk. The risk with model kings is a deadlock where both bid every season. The script kings escape it only by a coin flip.

Making a city a sender is not cheap. `Journey.From` is a `Power` (`src/Amarna.Engine/GameState.cs:210`), and so are the keys of inboxes and views. Travel time is the easy part: it already works between any two provinces (`TurnEngine.cs:196-203`).

**Plan:**

1. Wait for sieges. Without them nothing a city says can matter.
2. Pleas under siege. A journey gets an optional city as sender. A besieged city's elders send a templated plea naming the attacker, or "the Habiru" if they never saw him. Pleas travel and arrive late. No model calls.
3. Elders' memory. A small record per city of who attacked, who bought a neighbour and who sent help. Deterministic and replayable.
4. Prices shaped by memory. Fear lowers the price for a king whose army stands next to the city. A king who sacked a neighbour pays more. The bounce stays.
5. Later, with slow absorption: bought cities keep a loyalty value, may pay tribute to the strongest neighbour, and may switch sides when the overlord falters. A city as a model leader comes last ("City-states as script bots" in the design document).

Sleeping seats are built but not yet played by models. With them, a plea should go to the digest, unless it names that king as protector. Otherwise one war in the Levant would wake every seat in reach each season.

**Core hypothesis:** Better left for later: the core test is trust among the seven kings. City pleas fit the theme, but matter only once sieges hold a city long enough for a letter to travel.

**Simulation could change this:** yes: the facts will not change, but the priority can. If the agent kings fight over particular cities in their letters or promise them protection, the plea step moves up. If two kings deadlock on the elders' bounce, the rule needs a tie-breaker sooner.

### 13. Envoys and cities acting on their traits

**Status:** partly implemented. Script envoys act on their traits and alter messages, but only by deleting sentences and adding stock lines. City-states have no traits and do nothing.

**Today:**

**Traits and decisions.** Each character draws loyalty 15-95, greed 5-95, competence 20-95, ambition 5-95 and courage 10-95. 35% also get a sympathy of 30-80 for one court (`src/Amarna.Engine/CharacterFactory.cs:107-120`). Two of the 14 starting envoys are plants, with sympathy of at least 60 for a secret master (`CharacterFactory.cs:62-88`). `ScriptMind` turns traits into decisions by fixed thresholds:

- **Gift (bribe):** taken if greed + gift/4 − loyalty + a roll of −10 to +10 is above 20. Courage above 70 subtracts 10; sympathy for the host adds 15 (`src/Amarna.Game/Bots/ScriptMind.cs:58-65`). Script kings offer 30, 40, 50 or 60 shekels (`src/Amarna.Game/Bots/Statecraft.cs:654-657`). A model king can offer more: 200 shekels adds 50 points.
- **Job offer:** taken at 1.5 × wage with loyalty below 55 and ambition above 40, or at the wage with host sympathy above 60. A plant never accepts (`ScriptMind.cs:67-74`).
- **Skim:** with greed above 60 and loyalty below 60, the envoy keeps (greed − 50)/250 of the gold. That is rounded down to a multiple of 5 shekels, at most 18% (`ScriptMind.cs:43-45, 151-152`). On a 60-shekel gift, greed 70 keeps nothing and greed 95 keeps 10.
- **Overreach:** ambition above 70 and loyalty below 50 promise "whatever the king asks". It fires only if the mandate is not empty and the host says "agree" or "swear" (`ScriptMind.cs:80-87`). No script host uses those words, so it never fires in all-script games.
- **Pitch price:** base + greed/10 + up to 10 for demand, −5 after a public defection, +4 if ambitious (`ScriptMind.cs:171-174`).

The engine adds pressure over time. An unpaid wage costs 15 loyalty, and an idle character left unpaid with loyalty below 20 quits (`src/Amarna.Engine/TurnEngine.cs:94-100`). Every second season abroad costs 3 loyalty and adds 8 host sympathy if the character has no other sympathy (`src/Amarna.Engine/TurnEngine.Events.cs:74-84`). This applies to detained envoys, spies posted at a court and captives. Each audience at a court the envoy already favours adds 5 more sympathy (`src/Amarna.Engine/TurnEngine.Envoys.cs:374`).

No decision uses the character's episodic memory. Besides traits, `ScriptMind` reads two facts (its latest bribe, a public defection) and the current trail's outcomes. Kings, by contrast, have ten temperament weights, trust and grudges, and a look-ahead (DESIGN-NOTES.md, "Script kings"). No unit test covers a `ScriptMind` rule; they run only inside full games.

**How a script envoy carries a model king's letter** (`ScriptMind.cs:16-48`). The letter is capped at 1,500 characters (`src/Amarna.Engine/TurnEngine.Envoys.cs:19`). It is split into sentences after ".", "!" or "?" (`src/Amarna.Game/Bots/TextKit.cs:14, 23`). Then:

1. A fearful envoy (courage below 35) or a fond one (host sympathy 50 or more) deletes every sentence containing one of 14 threat words (`TextKit.cs:8-9`). It adds "My lord hopes that no quarrel will ever come between your houses."
2. An envoy with competence below 35 drops the last sentence when three or more remain after step 1. In a softened letter that is the added wish for peace.
3. What is left is quoted word for word: 'Great King, I bring the words of my lord X. He says: "…"'. Before its secret master, a plant's opening line also calls itself "your servant".
4. Stock lines follow. Ambition 65 or more adds a stock line that flatters the host and promises great gifts if he is gracious to the envoy. A fond envoy praises the host. Whenever gold is carried, skimmed or not, the envoy says it brings "the gold my lord sends, as the inventory on the tablet shows".

The host sees stated and weighed gold side by side (`TurnEngine.Envoys.cs:144, 161-162`). A plant's secret master also sees the true letter and mandate (`TurnEngine.Envoys.cs:173-177`).

No script king's letter or audience speech contains one of the 14 words, in the current bot or the frozen baseline. They appear only in tablet texts, a forgery and a poisoned report (`Statecraft.cs:321, 330, 486, 497, 507`). So in all-script games the softening never deletes anything.

**The report home** (`ScriptMind.cs:104-155`). A faithful envoy (loyalty 60 or more, competence 50 or more, not bribed by this host) quotes the host word for word. A bribed or fearful one drops the host's threat sentences ("The king spoke kindly"). The rest quote "in short", dropping the last sentence if competence is below 40. A bribed envoy adds "a true friend … wishes only peace" and hides the host's troop count. An unbribed fearful envoy adds "All is well". Any envoy with ambition above 70 that made a commitment reports only "such assurances as you would wish", whatever it said. Others do not mention commitments. The host's request in return for a gift ("Tell your lord that my armies are few…") is never used by a script envoy. All three versions go into the message trail (`src/Amarna.Engine/GameState.cs:359-380`).

**Model envoys** decide gifts, service, skimming and commitments themselves, with only clamps (`src/Amarna.Llm/LlmCharacterMind.cs:65-99`). Their traits reach them as prose only: the persona and their own facts, never numbers. The design document's main defence against honest envoys, the engine rolling these choices from traits, is not built.

**Assessment:** Against a model king, a script envoy is a near-faithful courier. Whatever survives deletion arrives word for word, in quotes. The design says the envoy speaks "in its own words"; here it never paraphrases. With traits drawn uniformly, about 29% of characters are fearful and 20% careless. Only those, and the few fond envoys, cut anything. The other changes are stock lines a reader soon learns to skip. The simulation will under-test the core mechanic for this reason.

Three defects matter most:

- **The threat filter is untargeted and matches substrings.** "war" matches "warm", "toward" and "reward" (`TextKit.cs:17`; matched as whole words since 18 October, still untargeted). A timid envoy carrying "Hatti is our common enemy; let us march together" deletes the proposal and adds a wish for peace. That inverts the letter, and its cause looks like noise to the player, against pillar 3. Model kings will write such sentences often.
- **A bribe buys nothing specific.** The host's request is ignored, so bribing a script envoy always yields the same friendly line. Buying a specific lie is the strongest motive a host has.
- **Envoys have no memory that matters.** Apart from the slow trait drift above, an envoy behaves the same on its first mission and its tenth. It bears no grudge against a court that detained it.

Smaller: the host's live audience shows the speech uncapped, while the trail and the host's inbox copy cut it at 1,500 characters (`TurnEngine.Envoys.cs:160, 192, 343`). It only bites near the cap.

For model envoys the risk is the design document's top one: a helpful Haiku envoy may refuse every gift and relay everything. Engine-rolled decisions are the cheapest guard.

**Plan:**

1. Make the threat filter whole-word and aimed at the host: soften only sentences that name the host or "you" next to a threat word. Small. *Whole-word matching done 18 October; aiming it at the host is not.*
2. A bribed envoy repeats the host's request as its own observation. Small, and it gives bribery a point.
3. Hybrid envoys. The engine rolls gift, job, skim, how far to shade and whether to overreach from traits, for script and model envoys alike. A model (Haiku) writes the words around that outcome. This also gives real paraphrase; a deterministic rewriter of free text is not worth building.
4. Memory that changes behaviour: a grudge against a court that detained it, more caution after a capture.
5. Unit tests for every `ScriptMind` threshold, and one for the delivered-speech cap.

Do 1 and 2 now, and 4 and 5 alongside. Build 3 next if the first Haiku-envoy games show envoys relaying too faithfully or refusing every bribe ("What to do next", step 2).

**Core hypothesis:** Serves it now. The envoy's motivated distortion is the mechanism under test, and today's script envoys distort too little and too crudely to test it.

**Simulation could change this:** yes: it is the first game where free-text letters pass through script envoys. It is also the first where hosts can trigger overreach, since the agent kings host audiences through their file seats. The trails will show how often letters arrive intact, whether the filter inverts proposals, and whether kings notice cut sentences or light gold. If letters arrive nearly intact and nobody accuses an envoy, hybrid envoys move to the top of the list. Model envoys are not tested, since the run uses script characters.

### 14. Envoy authority and resident envoys

**Status:** idea, not built. Mandates exist only as free text that no rule reads. Authority to seal, structured limits, credentials and resident envoys do not exist.

**Today:**

**Mandates.** A mandate is a string on the dispatch, "What the envoy may agree to on your behalf" (`src/Amarna.Engine/Orders.cs:90`, `src/Amarna.Llm/Schemas.cs:58`). It is capped at 600 characters (`src/Amarna.Engine/TurnEngine.Envoys.cs:20`). It is stored in the trail and in the envoy's memory as "I may agree to: …" (`TurnEngine.Envoys.cs:82-85`). Model envoys see it in every audience prompt (`src/Amarna.Llm/LlmCharacterMind.cs:72, 93`). Script envoys only check that it is not empty (`src/Amarna.Game/Bots/ScriptMind.cs:80`). No code acts on its content, including the script kings' own "Promise no land" (`src/Amarna.Game/Bots/Statecraft.cs:441-527`). Of the foreign kings, only a plant's secret master ever sees it (`src/Amarna.Engine/Exchanges.cs:87`).

**What an envoy can agree to.** It may state a free-text commitment. The host sees it in the transcript, and it changes nothing (`TurnEngine.Envoys.cs:279-280`; `Envoy_cannot_change_state_by_talking`, `tests/Amarna.Engine.Tests/EnvoyTests.cs:156`). It cannot seal.

**The pre-sealed tablet** is one-way authority that already exists. A dispatched tablet carries the sender's seal (`TurnEngine.Envoys.cs:58`), and the host may seal it at the audience (`TurnEngine.Envoys.cs:270-277`). That closes a take-it-or-leave-it deal in one leg. The host cannot answer with other terms: `HostReply` has only a yes or no on the tablet (`Exchanges.cs:31-42`). An audience has at most two exchanges (`src/Amarna.Engine/GameConfig.cs:28`), and a script host always ends it after the first (`Statecraft.cs:577`). An amended deal needs the host's own envoy and tablet, so one more leg. A leg is 1 or 2 seasons. No two capitals are more than 7 hops apart, so the 3-season band never applies (`GameConfig.cs:25`, `src/Amarna.Engine/TurnEngine.cs:196-203`).

The only structured content anyone reads is "against X" in tablet text, which script kings parse (`Statecraft.cs:618`, `src/Amarna.Game/Bots/Brain.cs:112`), and the sworn-alliance flag (`Schemas.cs:67`).

**Residents.** None. An envoy holds one audience and goes home (`TurnEngine.Envoys.cs:321`). It stays abroad only if detained, if it defects, or if its kingdom falls. The sender hears it is overdue a season after its expected return (`TurnEngine.Envoys.cs:307-337`). The drift toward a host from question 13 applies. An envoy with no prior sympathy needs about 14 seasons to turn fond (50) and 16 to take service out of sympathy (above 60). A game lasts about 21 seasons on average: no end before turn 15, then 15% a season. Envoys go only to the seven capitals and never meet each other. They only notice other envoys at a court (`TurnEngine.Envoys.cs:369-371`).

Posted spies already do half of a resident's work. They report home every season, by a journey that takes travel time (`src/Amarna.Engine/TurnEngine.Intel.cs:93-130`).

**Assessment:**

**Authority to seal.** Worth building. It adds a real trust question, "was it within his authority?", that is costly to verify. It also speeds diplomacy relative to war, which helps pillar 8 alongside sieges. The saving over today is one leg, 1 or 2 seasons, on any deal the host wants changed. Take-it-or-leave-it deals gain nothing, since the pre-sealed tablet covers them.

The seal should be physics. Either the envoy carries the king's seal or it does not, and the engine enforces that. Gold is physics already: an envoy can hand over only what it carries. The terms the king would accept stay words. The engine should not block or flag an envoy who seals worse terms than its king wanted. The kings argue about it, as they did historically. That keeps truth expensive (pillar 5).

**Structured limits.** Of the three proposed, only the seal needs the engine. Maximum gold is already enforced for gold the envoy carries. Cessions need the king's own order, so no province can be lost by an envoy's seal alone; repudiation covers that case. Checking promised gold or land against a limit would need structured tablet terms too, since free tablet text cannot be compared with a limit. That touches tablets, audiences, both character minds, the bots, prompts, UI and tests. Build it only if model games show disputes that need a referee.

The real gap is script envoys, which cannot judge free-text terms. One readable rule: an honest script envoy seals a counter-offer unless it names one of its king's provinces or a sum of gold. Those it brings home. A bribed or overreaching envoy seals anyway.

**Credentials.** A cheap flag with a real trade-off. Shown, the mandate is read out verbatim, like the sealed greeting. That builds trust and removes the repudiation excuse, but reveals the king's limits. Hidden, the king keeps his excuse. A detained envoy's hidden mandate could leak by the rule for caught spies. Such a spy talks if its courage is below 50, and otherwise 40% of the time (`TurnEngine.Intel.cs:188`).

An envoy's seal should never mark a sworn alliance. Otherwise a bribed envoy could give away half a win. While shared victory is under review (question 23), this is the safe default.

**Resident envoys.** Medium value, later. A resident drifting toward its host ("has he gone native?") is uncertainty with a face, as the target experience asks. Most parts exist: the drift, gifts and detention at audiences, and the spies' report path. A resident is also exposed to misinformation: the host can feed it false news to send home, as a turned spy's reports carry the host's text today. Three problems:

- **The drift is too slow.** 14 seasons to turn fond is two-thirds of an average game. Residents need faster drift, for example from the host's gifts and hospitality.
- **The pool is small.** Each king starts with two envoys, out of 18 characters (DESIGN-NOTES.md, "Characters"). A resident ties up half of a king's envoys.
- **Without authority to seal,** a resident is a slow spy that the host knows about.

**Hubs.** Unlikely without envoy-to-envoy meetings, which do not exist. Among capitals, none is within one season of more than three others: Hatti, Mitanni and Alashiya reach three each, Egypt only Alashiya. Byblos is one season from all seven capitals, and Carchemish, Ugarit, Qadesh, Amurru, Damascus and Tyre from six. If their envoys met at Byblos, Egypt and Babylonia would learn of a sealed deal two seasons after sending. A letter and its reply between them take four today.

Are hubs desirable? Partly. A hub at a royal court gives a weak, central king power without armies. He controls who meets whom, through detention, eavesdropping and bribes. Mitanni wins 6-7% of bot games and Alashiya 4-6% (DESIGN-NOTES.md, "Balance (script kings)"). But a hub in a neutral city with nobody behind it is a safe conference room. It collapses delay (pillar 4). Only courts with a host who can listen, detain and bribe should host, plus cities once they are actors (question 12). Hubs should be allowed to emerge, never built as a feature.

**Sieges, internal distance and sleep:**

- **Sieges (question 5).** An envoy abroad with the seal can negotiate relief or surrender without breaking out. The seal is also a prize: a besieger who catches the envoy holds the king's seal, which feeds forgery. A resident at the besieger's court is a hostage.
- **Internal distance (questions 6 and 7).** Mandates are issued where the king is, and changes travel. The further the envoy, the staler and more necessary its authority. The same "intent with limits" can later serve generals.
- **Sleeping seats** (built, not yet played by models). Scheduled orders cannot hold letters: the schema offers only unit and other orders (`src/Amarna.Llm/Parse.cs:93-100`, working tree). The nearest thing is the words given to a released envoy. A sleeping king's diplomacy stops at its own door. An envoy with the seal keeps negotiating, and its return already wakes the seat (DESIGN-NOTES.md, "Pacing: sleeping seats"). Resident reports must go to the digest. Otherwise they would wake the seat every season, as spy reports do now.

**Plan:**

1. After sieges: a "carries my seal" flag on the dispatch. The host may answer with a counter-tablet, and an envoy with the seal may seal it. The tablet records "by the hand of <envoy>", so third courts see the king did not seal in person.
2. Three audience exchanges when the envoy carries the seal, to leave room to bargain.
3. A "show credentials" flag: the mandate read out verbatim to the host.
4. Script envoys follow the counter-offer rule above. Script kings honour or repudiate an envoy-sealed tablet by honesty, and by whether it gives away land ("my messenger exceeded his authority").
5. An envoy's seal never marks a sworn alliance.
6. Rulebook, schema, UI and replay tests.
7. Only if model games show the need: structured limits (gold, provinces) with structured tablet terms.
8. Residents, after authority. A "stay" flag and one exchange with the host each season. Reports home every two seasons through the spy report path, into the digest. Faster drift, and instructions out as journeys. No envoy meetings until residents prove themselves; then measure whether hubs form before adding anything.

**Core hypothesis:** Authority to seal serves it directly, built just after sieges: repudiation disputes and costly credentials exist only because communication is mediated and delayed. Residents and hubs can wait; they need authority, slower war and internal distance to matter.

**Simulation could change this:** yes: the run shows how agent kings write mandates, though with script envoys a mandate's content has no effect. Specific, checkable mandates ("up to 200 shekels, no land") would argue for structured limits sooner. Treaties sent as pre-sealed tablets, complaints that a host cannot counter-propose, or repudiated envoy commitments would confirm authority to seal. Requests for a standing channel would raise residents. The 10-season run is too short to show any drift toward a host.

## Questions 15-18: model or script characters, bots among models, advisors

Line references are to commit 23e0a4f. Sleeping seats and file seats exist only in the working tree: built, but not yet played by models.

### 15. Model or script characters

**Status:** partly implemented. Both minds exist, but one setting picks the mind for every character. The design document's split, engine decides and model voices, is not built.

**Today:** `SeatChoices.Characters` is a single setting (`src/Amarna.Llm/SeatSetup.cs:15`). It builds either `ScriptMind` or `LlmCharacterMind` on Haiku or Sonnet, for all characters (`SeatSetup.cs:167`). A failed model call falls back to `ScriptMind` for that call only (`src/Amarna.Game/GameRunner.cs:16`, `:170-175`, `:226-243`).

The mind makes the choices as well as the words (`src/Amarna.Game/Contracts.cs:17-24`):
- presentation: speech and skim
- each audience round, up to 2 (`src/Amarna.Engine/GameConfig.cs:28`): speech, take the bribe, take the job, commitments
- report home: text and skim
- pitch: text and asking price
- spy report and memory summary

The engine only bounds these choices. Skim is clamped to the gold carried (`src/Amarna.Engine/TurnEngine.Envoys.cs:195`, `:434`). At most one bribe per audience is paid, and only if the envoy accepts it and the host can afford it (`:234-238`); a bribe refused in round one does not stop one in round two. Asking prices are clamped to 5-400 (`:460`). Commitments become an outcome line and bind nothing (`:279-280`).

`ScriptMind` reads the live traits (`src/Amarna.Game/Bots/ScriptMind.cs`):
- **Relay:** quotes the letter as `He says: "..."` (`:38`). Courage < 35, or sympathy ≥ 50 for the host, drops every threat sentence and adds a stock peace line (`:26-30`). Competence < 35 drops the last sentence of a letter longer than two (`:32`). Ambition ≥ 65 adds a stock line that flatters the host and promises great gifts if he is gracious to the envoy (`:39`).
- **Bribe:** taken if greed + bribe/4 − loyalty − 10 (if courage > 70) + a roll of −10 to 10 + 15 (if it favours the host) > 20 (`:60-61`).
- **Defection:** an offer ≥ 1.5 × wage with loyalty < 55 and ambition > 40, or sympathy > 60 for the host with an offer ≥ wage. Never for a plant (`:67-72`).
- **Skim:** greed > 60 and loyalty < 60 keep gold × (greed − 50)/250, rounded down to 5 (`:44-45`, `:152`).
- **Overreach:** only with a non-empty mandate and a host who says "agree" or "swear". Ambition > 70 with loyalty < 50 promises everything; otherwise "my lord will consider these words" (`:80-86`).
- **Report:** verbatim if loyalty ≥ 60, competence ≥ 50 and not bribed. Bribed or timid envoys drop threats; the rest trim only if competence < 40 (`:114-137`). A bribed envoy drops only its troop count of the briber's court (`:148`).

`LlmCharacterMind` sees its persona, own facts, employer, secret master, purse, wage, memory summary and last 10 memories (`src/Amarna.Llm/LlmCharacterMind.cs:31-48`). It runs at low effort (`:61`) and never sees trait numbers. The persona is written once and frozen (`GameRunner.cs:113-119`). So most trait drift never reaches a model character:
- every second season abroad: loyalty −3, and sympathy +8 if it has none or already favours that host (`src/Amarna.Engine/TurnEngine.Events.cs:75-84`); no memory line
- sympathy +5 per visit to the court it already favours (`TurnEngine.Envoys.cs:374`); no memory line
- loyalty −15 per unpaid season, with a memory line (`src/Amarna.Engine/TurnEngine.cs:96-98`)

The engine rolls the rest from traits, whoever plays: what an envoy notices (`TurnEngine.Envoys.cs:359-373`), spy detection and confession (`src/Amarna.Engine/TurnEngine.Intel.cs:104`, `:188`), forging at competence ≥ 55 (`Intel.cs:344`), the base wage and renewals (`TurnEngine.Envoys.cs:545-548`, `:607-608`), and quitting unpaid (`TurnEngine.cs:100`).

Cost is not the constraint. The estimate is 15 Haiku calls a season at 1,500 tokens in and 400 out (`SeatSetup.cs:119`; prices at `src/Amarna.Llm/Models.cs:30`). That is about $0.005 a season, or $0.10 for 20 seasons.

**Assessment:** Each does half the job well.

Models are better at words. They can paraphrase a free-text letter, answer the host in round two, shade a report for a reason and pitch with a lie. `ScriptMind` quotes almost verbatim and adds stock lines, which are easy tells. Its threat test is a substring match on 14 words (`src/Amarna.Game/Bots/TextKit.cs:9`, `:17`). So "war" also matches "toward", "reward" and "warm", and a timid envoy drops those sentences. A coalition offer that names an "enemy" or says "march" loses those sentences too.

Scripts are better at decisions. They are deterministic, follow the traits as they drift, and lack the model's lean to honesty. Leaving bribes, skims and defection to Haiku walks into the design document's top risk: envoys too honest. It also breaks pillar 3 from the other side. A loyal Haiku envoy may defect because of how it reads its persona, with no motive the player can trace.

Recommendation: the hybrid the risk table already names. The engine decides, with the formulas `ScriptMind` uses; the model voices the decision. Envoys gain most from a model. Spies, pitch prices and memory summaries can stay scripts. Generals (question 7) should be scripts.

**Plan:**
1. Move `ScriptMind`'s decision formulas into one deterministic function, keyed by seed, turn and character. It returns: take the bribe, take the job, skim, overreach, and a shading mode per message (faithful, softened, flattering, trimmed, bribed). `ScriptMind` calls it, so script games and benchmarks do not move.
2. `LlmCharacterMind` receives the decision with a reason in words, such as "you take the gift: you love gold". It also gets a one-line mood written from current traits, without numbers. The decision fields leave its schema.
3. Add `CharacterDecisions = Engine | Model` to `GameConfig`, logged in the header, for an A/B comparison.
4. Pick minds per role instead of one setting: envoys, spies, candidates, memory. Default: envoys on a model, the rest script.
5. Measure distortion from the message trail for both settings: sentences dropped or added between letter, speech and report, and bribes taken per trait band.
6. If script envoys stay common: a few paraphrase templates, and whole-word threat matching (done 18 October).

About a day for steps 1-3 with tests. It depends on nothing else.

**Core hypothesis:** Serves it now. Envoys carry the core mechanic, and the hybrid guarantees distortion with a motive while keeping natural language.

**Simulation could change this:** yes: the run pairs seven agent kings with script characters. If kings never suspect or accuse envoys because relays are near verbatim, model-voiced envoys move up. If kings already suspect and accuse script envoys, scripts may do for minor roles. The run cannot show whether Haiku envoys are too honest; that needs a run with Haiku characters.

### 16. Bots blind to their opponents

**Status:** partly implemented. Bots are blind to who sits in other seats and expect tactical surprises. They trust sealed tablets too easily, and never fight back against a sworn ally who betrays them.

**Today:**

**Blindness.** A script king reads only its `SeatView` and its own memory (`src/Amarna.Game/Bots/ScriptLeader.cs:34-96`; `src/Amarna.Game/Bots/Brain.cs:92`). No bot file touches `GameState`. `SeatView` has no seat labels and no seed (`src/Amarna.Engine/Views.cs:58-90`). Labels appear only in the log header (`src/Amarna.Game/GameRunner.cs:49`), the god-view Standings (`src/Amarna.Web/Components/StandingsPanel.razor:25-43`) and saved-game metadata (`src/Amarna.Web/Services/GameSession.cs:210`). The rulebook never mentions bots, models or humans (`src/Amarna.Llm/Prompts.cs:24-103`). Each rival is pictured as the script bot of its public archetype, on a board built from our own view and treasury estimates (`src/Amarna.Game/Bots/Search.cs:179-186`).

Four gaps:
- **The seed.** Every `ScriptLeader` holds the game's master seed (`src/Amarna.Llm/SeatSetup.cs:155`; `GameRunner.cs:43`; `src/Amarna.Game/Batch/BatchRunner.cs:72`). It uses it only for its own temperament (±0.15 per weight, `src/Amarna.Game/Bots/Personality.cs:90-101`), its own `bot:` dice (`Brain.cs:89`, `ScriptLeader.cs:93`) and the seeds and dice of pictured rivals (`Search.cs:186`, `:200`). But the engine rolls everything from the same seed, so a bot could in principle derive rivals' temperaments and coming catastrophes.
- **Opening data.** Bots read every power's starting units and gold from `MapData` (`src/Amarna.Engine/MapData.cs:160-192`, used at `Brain.cs:79-86` and `src/Amarna.Game/Bots/Board.cs:91`, `:95`). Model and human kings are not given them. That breaks pillar 7's "receive the same information".
- **Bots are easy to spot.** Every bot tablet opens with the same oath, "By Shamash, Amun, Marduk and Teshub" (`src/Amarna.Game/Bots/Statecraft.cs:8`, `:486`, `:497`, `:507`). Letters come from fixed templates (`:475-528`) with fixed flavour lines (`:554-564`). A bot host ends every audience after one round (`:577`).
- **Sleep is a tell (working tree).** Only model and file seats can sleep (`ISeat.CanSleep`), and only with `SleepingSeats` on (off by default). A sleeping seat sends no envoys, and its units hold unless it scheduled orders. A king silent and still for several seasons is probably not a bot.

At a single-browser table, the human also picks every seat (`src/Amarna.Web/Pages/Home.razor:66`) and the seed (`:112`).

**Anticipation.** The look-ahead pictures each rival's calm plan and a hard plan aimed at us, in which even a friend turns on us (`Search.cs:49-54`, `:205-211`). It adds up to 3 all-in strikes per rival (`:55-71`). Plans are scored against 8 samples of the coming season (`:14`, `:76-106`):
- 1 calm, with sworn partners' joint blows
- 2 where the most hostile king strikes all-in or by his hard plan
- 5 mixes, with joint blows: each king strikes with chance clamp((hostility − 0.2) × 1.2, 0.03, 0.85), and 15% of units wander

Candidate plans, single-unit changes and move-with-supporter pairs are adjudicated within 720 adjudications (`:16`, `:263`). A plan's worth leans to the worst case by 0.1 + 0.3 × caution (`:300-301`).

Hostility per rival starts at 0.3 and rises with conquests, border troops, recent attacks and grudges. It falls with trust, by 0.3 for an unbroken treaty, and by 0.2 more for an unbroken alliance (`Brain.cs:295-313`). A friend's hostility is then × 0.25 (`Search.cs:44`; `src/Amarna.Game/Bots/Tactics.cs:77`). So a friend strikes in at most 4.5% of the mixed samples. The capital fears every non-ally at least 0.3; a sworn ally gets no floor (`Tactics.cs:96`; `Search.cs:358`).

Any sealed tablet, whatever its text, makes the other sealer a treaty partner unless an examination called it a forgery (`Brain.cs:108-118`). He is a friend while trust > −0.2 and he has broken no oath (`Brain.cs:315`). A bot never sends troops into a friend's land unless it has chosen betrayal itself (`Tactics.cs:338-339`). When a partner breaks an oath, the bot adds 2 grudge and −0.5 trust (`Brain.cs:277-282`). It then writes grievances and shows the tablet to third courts (`Statecraft.cs:392`, `:407-441`, `:513-519`).

**A flaw: a sworn ally stays a friend after he betrays.** `Allied` is rebuilt each season from any sealed alliance tablet (`Brain.cs:102-103`, `:116`), and tablets never expire. `IsFriend` returns true for `Allied` without checking broken oaths (`Brain.cs:315`). So the bot drops him as war target (`Statecraft.cs:43`) and never enters his land (`Tactics.cs:339`). It keeps his hostility × 0.25, and its capital has no floor against him. Only the treaty and alliance discounts (−0.3 and −0.2) lapse (`Brain.cs:309-310`).

**Assessment:** The bot side of blindness is clean. The seed and the opening data are hygiene problems, not leaks in use. The real gap runs the other way: models can probably spot bots and treat them as predictable.

Tactically, the bots expect almost any move within one season. Diplomatically they are credulous. Every rival is pictured as its archetype's bot, and one sealed tablet buys deep trust. That suits a "loyal to a fault" archetype, not all seven. The ally flaw is a bug, not a temperament, and a model will find it: swear an alliance, then take the bot's land without reprisal.

**Plan:**
1. With the bots' next change, before any new benchmark is quoted: `IsFriend` requires no broken oath for allies too (`Brain.cs:315`; Part 0, quirk 3). It is a behaviour fix; rerun the benchmarks and report them, without tuning.
2. Now: a test that changes hidden state outside the `SeatView` (true gold, unseen units, seat labels, character traits) and asserts the bot's orders do not change.
3. Now: give model and human kings every power's opening units and treasury as public facts.
4. At the next benchmark run: give each script seat a derived seed (a hash of game seed, "seat" and power), so no seat holds the engine seed. Rolls shift, so rerun the benchmarks once.
5. After the simulation: make credulity depend on temperament and evidence. The friend multiplier ranges 0.25-0.6 by caution and the partner's record (oaths broken anywhere, copies seen, light gold). An ally with troops next to the capital gets a floor of 0.15.
6. After the simulation: track surprise per rival. When a rival's resolved orders (`LastSeason`) differ from his pictured calm plan, raise his strike chance for a few seasons. This covers models and humans without knowing what they are.
7. Before mixed tables: 2-4 seeded phrasings per letter type, and bot hosts that sometimes use the second audience round.
8. Test steps 5-6 against a faithless batch bot (honesty 0, seals everything, betrays when land lies open). Report how often allied bots lose their capital, before and after.

About half a day for steps 1-4, and a day for steps 5-8.

**Core hypothesis:** Blind, equal seats are a precondition for clean experiments, so steps 1-4 belong now. Credulity matters only where bots meet models or humans, so steps 5-8 can wait for mixed tables.

**Simulation could change this:** yes, for the anticipation part: the run shows how often agent kings break sealed oaths and attack partners. If often, steps 5-8 move ahead of any mixed table. Blindness is a code fact. With no script kings except fallbacks, the run cannot show whether models spot bots.

### 17. Bots and models at one table

**Status:** partly implemented. Any mix of seats runs, but bots read models only through deeds, gold, greetings and sealed tablets.

**Today:** All seats share `ISeat` (`src/Amarna.Game/Contracts.cs:9-14`) and one order validator (`src/Amarna.Engine/TurnEngine.cs:217-222`).

What a bot reads from other kings:
- deeds: land taken, attacks and supports seen last season (`src/Amarna.Game/Bots/Brain.cs:121-156`)
- gold: weighed against stated at the audience (`src/Amarna.Game/Bots/Statecraft.cs:597-606`), and assays (`Brain.cs:165-168`)
- greeting deviations (`Statecraft.cs:580-595`)
- engine notices: overdue envoys, confessions, forgeries (`Brain.cs:169-178`)
- sealed tablets: treaty, alliance flag, and "against X" for a coalition (`Brain.cs:108-118`)
- copies shown: trust in every other sealer, not the sender, drops by 0.15 × (1 − caution), whatever the text (`Statecraft.cs:608-613`)

Free text barely registers. A bot host never reads what the envoy said; `Spoken` is unused anywhere in `src/Amarna.Game`. Words reach the bot later only through its own envoys' reports: a count of 9 warm and 10 cold words (`Brain.cs:286-292`) moves trust by at most ±0.08 per report (`Brain.cs:185-186`). The same count on the audience transcript (±0.05, with the weighed gold, `Brain.cs:179-184`) never fires when the bot hosted the audience. The transcript is stamped for the current season after the bot has already learned that season while hosting (`ScriptLeader.cs:91`; `Brain.cs:94`), and next season's view shows only that season's inbox (`src/Amarna.Engine/Views.cs:135`). In five 15-season script games, none of 293 transcripts was read. It can fire only when a fallback bot plays orders for a model seat that hosted the audience itself.

**Proposals.** A coalition counts only if the text contains "against " plus the enum name, case-sensitive (`Brain.cs:112`; `Statecraft.cs:618`). "Against Hatti" at the start of a sentence, "against Babylon" and "the Hittites" all miss. Any other tablet is sealed if the sender is not hostile (grudge < 3 and trust > −0.5) and is not the bot's war target (`Statecraft.cs:575`, `:634`). An alliance between rivals for the crown is refused (`:120-125`). A bot with caution < 0.6 also refuses the leader unless he is a friend (`:635`). The cunning-and-faithless exception at `:634` is dead code: a war target already counts as hostile at `:575`. Beyond "against X" the text is never read. A bot will seal a tablet that makes it pay tribute or cede its own city.

**Requests.** Bots answer no requests for gold, supports, moves or land. Their gifts, letters and supports come from their own rules (`Statecraft.cs:362-453`). A bot host ends every audience after one round (`:577`); a model host may take two (`src/Amarna.Engine/GameConfig.cs:28`).

**Coalitions.** Bot partners coordinate by a fixed joint-blow rule (`src/Amarna.Game/Bots/Tactics.cs:30-65`; DESIGN-NOTES "Script kings"). Model kings are never told it. The bot's letter says only "where your troops face X, mine will support them" (`Statecraft.cs:482`).

**Bot to model.** Bot letters are short and explicit: peace, alliance, coalition, gift, grievance, lull and evidence (`Statecraft.cs:430-441`, `:475-528`). A model's letter reaches a bot court through a script envoy almost verbatim. Threat sentences are dropped when the envoy is timid or fond of the host (`src/Amarna.Game/Bots/ScriptMind.cs:26-30`).

**Fallback.** A failed model call is played by a separate `ScriptLeader` (`src/Amarna.Game/GameRunner.cs:43`, `:255-257`). Its brain is created lazily and learns only in seasons when it is called (`src/Amarna.Game/Bots/ScriptLeader.cs:29`; `Brain.cs:92-95`). A model seat that falls back in season 7 is played by a bot with no memory of trust, grudges or lost land. File seats use the same fallback after two unreadable replies or a timeout per request (`--file-timeout`, 120 minutes by default). The working tree's batch seat report counts fallbacks per seat (`BatchRunner.SeatReport`).

**Sleep (working tree).** Script seats play every season; model and file seats may sleep when `SleepingSeats` is on (off by default). Every arriving envoy wakes a sleeping seat (DESIGN-NOTES "Pacing: sleeping seats"). A bot neighbour that writes or sends gifts each season keeps waking it.

**Assessment:** It will run, but lopsided. Models will read bots well; bots read models only by deeds. That is not worthless. Deeds are the honest signal, and bots punish broken treaties with evidence and grievances. But models can exploit bots cheaply:
- One 20-shekel tablet (`GameConfig.cs:29`) buys a pact, whatever it says, unless it names "against X". Only hostility, a war, a leading sender (to a bot with caution < 0.6) or, for a sworn alliance, a rival for the crown stops it.
- A sworn alliance with a small bot can buy a shared victory (on by default, `GameConfig.cs:12`). The alliance still counts for the win after a betrayal (`TurnEngine.cs:472`), and the bot will not fight back (question 16).
- Showing any sealed copy lowers the bot's trust in the other sealers.
- Offers, threats and requests are lost on bots.

Mixed-game results would partly measure these blind spots rather than diplomacy. Bots are also easy to spot (question 16).

**Plan:** Before any mixed game, about a day:
1. Match coalition targets by any name, ignoring case: enum, `Land()`, `King()`, adjective, and "Babylon" (`Brain.cs:112`; `Statecraft.cs:618`).
2. Guard sealing on content: refuse a tablet the bot did not write if it mentions land, gold or tribute, or names the bot's own provinces.
3. Fix the ally flaw (question 16, step 1).
4. Keep a shadow brain that learns every season for every model and file seat, so a fallback remembers. It doubles as the advisor's brain (question 18).
5. Delete the dead cunning clause at `Statecraft.cs:634`, or make it reachable on purpose.

Later, with question 14's structured mandate:

6. Structured clauses on tablets and dispatches, from a fixed vocabulary: no attack; against X; alliance; support A to B in season N; pay N gold a season; cede a province. Models fill them in beside the free text. Bots read and honour only these, and write their own letters with them.
7. Bots answer structured requests, valued by the look-ahead and their trust in the sender.

Not planned: a model translating free text for bots. It would end free, deterministic script games.

**Core hypothesis:** Steps 1-5 serve it now: every model game has fallbacks, and mixed tables are a planned experiment. Structured clauses are the bigger step; do them with question 14 after the first model games.

**Simulation could change this:** yes: the agent kings write to each other in free text, which shows what bots would miss. If kings rarely name a coalition target in other words, or make conditional offers and requests, steps 1-2 suffice. If they often do, structured clauses move up. The seat report also shows how many fallbacks a real game produces.

### 18. Advisors

**Status:** idea, not built. There is no advisor or advice code in `src` at 23e0a4f.

**Today:** `HumanSeat` only waits for orders (`src/Amarna.Game/HumanSeat.cs:22-29`). `LlmLeaderSeat` sends the rulebook, identity, situation and journal (`src/Amarna.Llm/LlmLeaderSeat.cs:23-41`). The parts of an advisor exist:
- `ScriptLeader.DecideAsync` returns a full submission plus notes: war target, leader, pacts, trust, "turning on X" (`src/Amarna.Game/Bots/ScriptLeader.cs:34-65`)
- troop orders from `Tactics.Make` (`src/Amarna.Game/Bots/Tactics.cs:68`) and `Search.Improve` (`src/Amarna.Game/Bots/Search.cs:37`)
- threatened provinces and shortfalls (`MilitaryPlan.Threatened` and `Shortfalls`, `Tactics.cs:12-13`, `:117`, `:175`)
- hostility per rival (`src/Amarna.Game/Bots/Brain.cs:295-313`), and the risk of a hostile neighbour walking into each province (`Search.cs:345-366`)
- rival treasury estimates (`Brain.cs:58-63`, `:213-225`), plus growth and leader estimates in `Board`

All of it reads only the seat's own view, plus the opening data (question 16). It costs up to 720 adjudications, about 20 ms per king per season natively (DESIGN-NOTES "Script kings"). But the troop plan is not purely tactical. It bakes in whom the bot will fight (`Tactics.cs:335-344`), its war target and its betrayals (`src/Amarna.Game/Bots/Statecraft.cs:13-105`).

In the working tree, a file seat writes exactly what a model king gets. Advice in the situation text would reach agent kings for free. A sleeping seat may schedule orders up to 7 seasons ahead, but the look-ahead plans only the coming season (`Search.cs:14`). An advisor cannot write a sleeping seat's schedule.

**Assessment:** Worth building as a cheap toggle, once the need shows.

Value: models are weakest at Diplomacy-style tactics: adjacency, supports, cutting supports. A human on a phone will not want to work out supports. An advisor strips tactical noise, so games measure diplomacy and trust. It adds computation, not information, so pillar 7 holds. It does add bot skill, so every experiment must record whether it was on.

Risks: kings may copy the advice and play like bots. "Tactics only" needs the king, not the bot, to set whom to attack and whom to spare. Otherwise the advice smuggles in the bot's diplomacy.

Cost: 500-800 extra input tokens a season per model seat. For seven Sonnet kings at $2 per million input tokens (`src/Amarna.Llm/Models.cs:29`), that is $0.14-0.22 per 20-season game. The situation text is not cached: only the rulebook carries a cache mark (`src/Amarna.Llm/ClaudeClient.cs:136`, `:170-171`), as the estimate assumes (`src/Amarna.Llm/SeatSetup.cs:112-113`).

It is also the first step toward generals (question 7). A general is an advisor whose plan is carried out, weighted by his traits.

**Plan:**
1. An `Advisor` class in `src/Amarna.Game/Bots`. Each advised seat gets its own `Brain`, with a neutral temperament or the public archetype, that learns every season. It doubles as the remembering fallback (question 17, step 4).
2. The king sets the stance in a brief: war on (powers), spare (powers), posture (defend, balanced, attack). Without a brief, the default comes from the view: sealed partners spared, recent attackers hostile. The advisor never proposes a betrayal.
3. Output: troop orders only (hold, move, support, convoy) with a role per unit. Threats per neighbour: hostility, border troops, provinces at risk, what an all-in strike could take. Estimated strength, growth and leader. An optional levy or disband hint. No letters, gifts, tablets, bribes or envoys.
4. Delivery: model and file seats get a block in the situation text, "Advice from your generals (tactics only; you decide)", and an optional brief field in the orders schema. Human seats get an advice box and a "use these troop orders" button (`src/Amarna.Web/Components/OrdersPanel.razor`, `OrderDraft.cs`).
5. A per-seat toggle in `SeatChoices`, recorded as its own log-header field, as the working tree does for sleepers. A label suffix would break resume: `FromHeader` matches "Human" exactly (`SeatSetup.cs:175-182`), and so does `StandingsPanel.razor:37`. Record each season's advice under `t{turn}/advice/{power}`.
6. Tests: advice is deterministic, ignores hidden state and holds troop orders only; replay stays exact with the toggle on.
7. Experiment: the same seed with the advisor on and off. Compare invalid orders, units lost, growth and signal counts.

About 1-2 days. It depends on nothing else.

**Core hypothesis:** Indirectly, and not first. It helps only if tactical blunders drown the diplomatic signal. Build it after the first model games if they show that, then reuse it for script generals.

**Simulation could change this:** yes: the seat report counts invalid orders and fallbacks per king, and the logs show blunders. Many invalid orders, units lost to obvious supported attacks, or notes spent on adjacency move the advisor up. Clean tactics drop it to a convenience for humans. Agent kings may out-play Sonnet at medium effort, so clean tactics here would not prove the same for Sonnet.

## D. Characters' careers and contracts (questions 19-22)

Line references are to commit 23e0a4f. Sleeping seats and file seats are in the working tree, built but not yet played by models.

### 19. Captives: release, ransom and exchange

**Status:** partly implemented. Caught spies can be executed, ransomed, turned or released; detained envoys can only be released; there is no exchange and no hostage order.

**Today:** Only spies become captives. A spy posted at a foreign court, or in a province another power owns, risks capture every season (`src/Amarna.Engine/TurnEngine.Intel.cs:101-110`). The chance is 5% + watch spend/300 − competence/400, clamped to 2–60%. Competence is 20–95 (`src/Amarna.Engine/CharacterFactory.cs:111`). So without watchmen every spy is caught at the 2% floor. Watchmen spending 20–50 raise it to roughly 2–17%.

A caught spy becomes Captured and is held at the host court with no duty (`TurnEngine.Intel.cs:181-194`). It names its employer if its courage is under 50, otherwise 40% of the time. Only the host is told.

The host chooses a fate with a captive order (`src/Amarna.Engine/Orders.cs:158-164`, `src/Amarna.Engine/OrderValidator.cs:276-283`):

- **Execute.** The spy dies. The employer hears a rumour 1–2 seasons later (`TurnEngine.Intel.cs:203-208`).
- **Ransom.** The host names a price, and the employer gets a rumour naming it (`TurnEngine.Intel.cs:209-213`). The demand can be paid in the four order phases after it is made. It lapses at the start of the fifth season (`src/Amarna.Engine/TurnEngine.Envoys.cs:594-599`). No two capitals are more than 2 seasons apart, so the rumour takes 1–2 seasons and the payer has 3–4 seasons to act: 4 from a court 1 season away, 3 from one 2 seasons away. Payment is the full sum, up front, in true gold. It travels as its own journey, not with an envoy, so nobody can skim, debase or intercept it (`TurnEngine.Intel.cs:249-266`). On arrival the host keeps the gold and frees the spy if still held (`TurnEngine.Intel.cs:268-274`). The host may execute or turn the spy while the gold is on the road. Nothing is refunded, and there is no counter-offer.
- **Turn.** The spy returns to its post as a double agent. Its reports carry the host's text (up to 600 characters) plus one true observation, and the host stops rolling to catch it (`TurnEngine.Intel.cs:214-225`, `:101`, `:114-118`). The spy is never asked, and its traits play no part. A captive whose kingdom has fallen cannot be turned.
- **Release**, also through the release order (`TurnEngine.Envoys.cs:401-409`). The spy walks home like a recalled spy (`TurnEngine.Intel.cs:232-247`). If its kingdom has fallen, it becomes a free agent at the host court.

Afterwards the spy keeps its employer, contract and wage. The only records are two memory lines (capture and release) and a host-only log entry. No fact is added, and neither the capture nor the release changes reputation or loyalty. A captive draws no wage, because only employed characters are paid (`src/Amarna.Engine/TurnEngine.cs:84`). The long-stay drift still runs (`src/Amarna.Engine/TurnEngine.Events.cs:74-84`). Loyalty falls 3 every two seasons. Sympathy for the jailer grows 8, but only if the captive has no sympathy yet or already favours the jailer.

Detained envoys are not captives. They stay employed, with duty Detained (`TurnEngine.Envoys.cs:312-320`), and keep drawing wages. A captive order rejects them (`OrderValidator.cs:279`), so the host can only release them. Script hosts detain a hostile envoy half the time when grudge > 3 and vengeance > 0.6 (`src/Amarna.Game/Bots/Statecraft.cs:659`). They let it go after 1 + 3 × vengeance seasons, rounded, so 3 or 4 (`Statecraft.cs:337-346`).

No order exchanges prisoners or hands a character to another court. The design document says characters "(including as hostages) can all be given away" (DESIGN-DOC, "Transferable assets"). Nothing builds that yet.

Script kings decide a captive's fate by temperament (`Statecraft.cs:326-335`):

- cunning > 0.65: turn;
- vengeance > 0.75: execute;
- honesty or greed > 0.5: ransom at 60 + 60 × greed (60–120);
- otherwise: release.

They pay a ransom when honesty ≥ 0.3 and spare gold > 150 (`Statecraft.cs:348-353`).

Bugs found by reading the code, not yet seen in a run:

1. **Repeated demands.** A script host re-issues the ransom every season it holds the spy. Each order adds a new demand and a new rumour (`TurnEngine.Intel.cs:209-213`). Payment is accepted for any open demand, even after the spy is free (`OrderValidator.cs:285-290`). A script payer pays once per rumour: 2 times on a 1-season route, 4 on a 2-season route. The host keeps every payment.
2. **The employer sees the capture at once.** Captured servants stay in the employer's own court list (`src/Amarna.Engine/Views.cs:142`). The web UI shows "is held abroad" with a "Pay the ransom demanded" button the next season (`src/Amarna.Web/Components/OrdersPanel.razor:210-213`). A model king's prompt lists the captive as "at court, ready for a mission", because its duty was reset (`src/Amarna.Llm/Prompts.cs:163`, `Views.cs:194`). Dispatching it then fails with "is not in your service" (`OrderValidator.cs:103`). An executed spy normally vanishes from its employer's view at once, which is itself an early signal (`Views.cs:141-144`).
3. **Silent no-ops.** A ransom or turn order for a captive whose kingdom has fallen does nothing, and the host is not told (`TurnEngine.Intel.cs:210`, `:216`).
4. **Spies at a court are not hidden.** A posted spy stands at the host court (`TurnEngine.Intel.cs:60`). The host's view therefore lists it as employed, with its employer, "at your court" (`Views.cs:143`, `:179`; `Prompts.cs:166-169`). For a model or human host, the confession roll adds nothing. Script kings do not read this.

Sleeping seats: a caught spy wakes the host, and a ransom rumour wakes the payer (working tree, `src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`)). With bug 1, every repeated rumour wakes a sleeping payer again. The employer is rightly not woken by the capture itself. A file seat gets the model king's text, so simulation kings would meet bugs 2 and 4.

**Assessment:** The core loop fits the hypothesis. A ransom is a trust problem under delay. The payer pays first, the gold travels for seasons, and the jailer may keep it and still execute or turn the spy. But the loop is thin. It covers spies only, the price is fixed, and the captive has no say.

Bugs 1, 2 and 4 hurt real play. Bug 1 drains script kings' gold. Bug 2 breaks pillar 4 and leads model kings into rejected orders. Bug 4 makes spying at courts nearly pointless against any king that reads its own view.

An engine-run prisoner exchange is not worth building. Kings can already swap prisoners with two release orders. Who releases first, across a delay, is the trust problem players should solve themselves. Counter-offers need no engine either, once a new demand replaces the old one: the payer bargains by letter. Ransom for detained envoys is worth more than new spy fates, because detained messengers are the signature Amarna case.

**Plan:**

Now, about one day:

1. One open demand per captive. A new ransom order replaces the old one. Reject a payment when the captive is no longer held or a payment is already on the road.
2. Fix the employer's view. A captured servant keeps its last known duty ("watching Babylon; no report since season N") until news arrives. Show the ransom button only once a demand has arrived.
3. Hide posted spies from the host's view. Only a catch should reveal them.
4. Tell the host when a captive order does nothing.

Next, one to two days:

5. Captive orders for detained envoys: ransom and release, with execution as the extreme.
6. Give the captive a say when turned. Script characters decide by loyalty and courage; model characters by a decision field. A refusal keeps them captive.
7. Consequences: a hidden fact "Was held in X", known to host and employer; loyalty +10 when ransomed; −10 when a demand lapses unpaid.

Later:

- ransoms carried by envoys, so they can be skimmed, and intercepted once routes take time;
- an order giving a character to another court as a hostage;
- captured kings and generals, within the command-at-a-distance package (question 7).

**Core hypothesis:** Serves it now. Steps 1–4 remove leaks of hidden information and should come first; steps 5–7 follow soon after sieges, while hostages and captured kings wait.

**Simulation could change this:** yes: a caught spy would show whether agent kings ransom, turn or execute, and whether bug 2 produces rejected dispatches. Agent kings bargaining by letter for detained envoys would raise step 5. Captures will be rare in 10 seasons, at 2% per spy per season without watchmen. Bug 4 may show as kings naming foreign spies at their court. Characters are scripts in the run, so the captive's side stays formula-driven.

### 20. Dismissal and employment history

**Status:** partly implemented. A king can dismiss anyone in his service, and it is quiet by default, but employment history is not a fact.

**Today:** A king dismisses with a dismiss order (`src/Amarna.Engine/Orders.cs:117-120`; models use "dismiss", `src/Amarna.Llm/Parse.cs:93`). The person must be in his service but need not be at home (`src/Amarna.Engine/OrderValidator.cs:227-228`). The web UI offers it only for people ready at court (`src/Amarna.Web/Components/OrdersPanel.razor:206-209`). Script kings never dismiss.

Dismissal adds the memory "The king of X dismissed me" (`src/Amarna.Engine/TurnEngine.Envoys.cs:488-499`). The character becomes free, with no contract and no duty (`src/Amarna.Engine/TurnEngine.cs:133-140`). It stays where it is, except that one on the road is set at home (see the edge cases).

Who learns of it:

- The dismissing court gets an "A servant leaves" notice (`TurnEngine.cs:135`).
- No rumour, log entry, fact or reputation change follows.
- Any court that already sees the character sees it turn "free" the next season (`src/Amarna.Engine/Views.cs:143`, `:178`). That is the court where it stands, its jailer, or a court that knows a hidden or deep fact about it. It is given no reason, and no employer it had not already seen.

So nobody automatically learns of the dismissal or who the employer was.

Employment history is not a fact. The facts that do record service are:

- "Abandoned the service of X for Y": public, added on defection (`TurnEngine.Envoys.cs:263`);
- "Exposed as a forger of seals in the service of X": public (`src/Amarna.Engine/TurnEngine.Intel.cs:327`);
- "Kept part of the gold X sent to Y": hidden, added on skimming (`TurnEngine.Envoys.cs:202`);
- "Is secretly in the pay of X": deep, for the two starting plants (`src/Amarna.Engine/CharacterFactory.cs:85`);
- "Was caught by X and now secretly serves it": deep, for turned spies (`TurnEngine.Intel.cs:222`).

A character with loyalty under 45 may also carry an invented backstory, "Was dismissed from a former post for …" (hidden; `CharacterFactory.cs:131-135`). It is not real history.

Background checks return only facts (`TurnEngine.Envoys.cs:567-589`): public ones always, the others by chance. So a check can find a defection, a forgery, a skim, a plant or a turn. It never finds ordinary service.

Otherwise history lives in two places, neither structured:

- **The character's memory**, which its own model sees (`src/Amarna.Llm/LlmCharacterMind.cs:31-47`). A model character may mention or hide it in a pitch. Script pitches mention a past defection, without naming the court, when loyalty is under 50 (`src/Amarna.Game/Bots/ScriptMind.cs:168-169`).
- **Other courts' inbox text.** A host is told "Audience with X, envoy of Y" (`TurnEngine.Envoys.cs:304`). It also sees the employer of anyone employed at its court (`Views.cs:179`). Envoys report detained envoys, and others still waiting for an audience, at the court they visit, each with chance competence/100 (`TurnEngine.Envoys.cs:369-371`). Spies in practice report only detained envoys (`TurnEngine.Intel.cs:152-153`). The view carries only this season's inbox (`Views.cs:135`). A model king keeps such news only in its journal; script kings do not keep it.

That is all "courts where the character served already know" amounts to today.

A quiet dismissal is therefore quiet already, but the king keeps no hold on the person. It is free, enters every court's candidate draw (`TurnEngine.Envoys.cs:557-565`), and goes to the highest bid at or above its price (`TurnEngine.Envoys.cs:510-533`). While it stays at his court, the old king can rehire without a pitch (`OrderValidator.cs:221`). He must offer at least its stored asking price for his court, if any, else the base price (`TurnEngine.Envoys.cs:537-541`). Dismissal does not clear a secret master, so a plant stays a plant.

Edge cases:

- An envoy dismissed on the way out is set at home, but its journey still runs. On arrival it becomes a free agent at the foreign court, with no audience (`TurnEngine.Envoys.cs:92-96`). That court can hire it without a pitch. The gold paid at dispatch is lost (`TurnEngine.Envoys.cs:17`).
- An envoy dismissed on the way home still reports and delivers its gold (`TurnEngine.Envoys.cs:378-399`).
- A dismissed detained envoy stays held, and only the jailer can hire it (`OrderValidator.cs:220`). The jailer's release order then does nothing, because the envoy is no longer marked detained (`TurnEngine.Envoys.cs:404`).

**Assessment:** Employment history should be a fact with a secrecy level, as you suggest. Today it is too secret and too public at once. No check can find ordinary service, yet a defection is public to all, and a host sees the employer of anyone at its court. Facts and checks already exist, so the change is cheap.

The bigger value is the plant: dismiss a servant, keep paying them quietly, and let a rival hire them. That is the design document's "a plant who is still loyal to Babylon". The audience code already shows a plant's true instructions to its real master (`TurnEngine.Envoys.cs:173-177`).

A public-dismissal switch adds little. A king who wants a dismissal known can say so in a letter. The cost of the rest is a few more facts per character in the prompts.

**Plan:**

1. Service facts. On hire, and at the start of the game, add "Served X from season N", hidden, known to X. A court that receives the character as an envoy, or sees it at court, learns the fact. Close it with "until season M" on leaving.
2. Quiet dismissal adds "Was dismissed by X", hidden, known to X. No public switch.
3. Secret retainer, as an option on dismissal. The character goes free, but its secret master becomes X, who pays a small wage quietly. Script characters accept by loyalty and greed; model characters decide. A rival who hires it gets a plant through the existing code.
4. Checks find service facts at hidden odds (spend/150, at most 90%). The retainer fact is deep.
5. Fix the edge cases: no instant move home, and gold carried by a dismissed envoy goes into its purse or comes back.
6. One rulebook line on dismissal and service records.

About one to two days, with no new systems.

**Core hypothesis:** Serves it as a second priority, since hidden histories and plants test trust in people under incomplete information. Do it after war tempo and the fixes in question 19, leaving the retainer until model games show kings hiring rivals' servants.

**Simulation could change this:** no. The facts come from the code, script kings never dismiss, and ten seasons give an agent king little reason to.

### 21. Characters leaving on their own

**Status:** partly implemented. Characters leave over missed pay, at contract end and by defecting at an audience, but they never look for work while employed.

**Today:** There are four ways out of service.

1. **Missed pay** (`src/Amarna.Engine/TurnEngine.cs:79-102`). Wages are paid each season after troop upkeep, from true gold, in id order. An unpaid character loses 15 loyalty for good and remembers it. It quits only if loyalty falls under 20 and it has no task. Starting loyalty is 15–95 (`src/Amarna.Engine/CharacterFactory.cs:109`). A character at 55 quits on its third unpaid season. Envoys abroad or detained, and posted spies, serve on unpaid indefinitely. The engine counts unpaid seasons but never reads the count (`src/Amarna.Engine/GameState.cs:188`).
2. **Contract end** (`src/Amarna.Engine/TurnEngine.Envoys.cs:603-621`; see question 22).
3. **Defection at an audience** (`TurnEngine.Envoys.cs:252-267`). It needs a job offer from the host.
   - A script envoy accepts at 1.5 × its wage or more, with loyalty under 55 and ambition over 40. It also accepts at its wage or more if it favours the host with strength over 60. A plant never accepts (`src/Amarna.Game/Bots/ScriptMind.cs:67-74`).
   - A model envoy decides for itself (`src/Amarna.Llm/LlmCharacterMind.cs:89`, `:98`).
   - The new contract is the offered wage for 6 seasons. A public fact follows the character, with reputation −40 at the old court and +10 at the new.
   - The old king gets an overdue rumour a season after the envoy was due home (`TurnEngine.Envoys.cs:307-311`, `:324-337`). But the envoy drops out of his people list the very next season (`src/Amarna.Engine/Views.cs:142`).
4. **A kingdom falls** (`TurnEngine.cs:401-417`). Employed people become free. Captives stay captive and detained envoys stay held, all without an employer.

Script hosts offer 30 a season to an envoy with no blemish (`src/Amarna.Game/Bots/Statecraft.cs:660-661`). They need fewer than 3 servants and over 200 spare gold, and offer with chance 0.1 + 0.2 × cunning. Thirty is at least 1.5 × every starting wage (8–15).

Not built:

- defection out of sympathy without an offer;
- looking for work while employed (only free characters enter candidate draws, `GameState.cs:194`);
- quitting from low loyalty alone;
- retiring on a full purse (no rule reads the purse; only the character's own prompt and the god view show it).

Loyalty never rises. It changes only by −15 per unpaid season and −3 every two seasons abroad (`TurnEngine.cs:97`, `src/Amarna.Engine/TurnEngine.Events.cs:83`). Sympathy grows +8 every two seasons abroad, for a character with no sympathy or one already for that court (`TurnEngine.Events.cs:75-82`). It grows +5 at each audience or release at the court it favours (`TurnEngine.Envoys.cs:374`).

The kings' rulebook says unpaid people "lose loyalty and may leave" (`src/Amarna.Llm/Prompts.cs:36`). It also says envoys may defect, and that a host may offer a foreign envoy service (`Prompts.cs:55-56`).

Sleeping seats: a missed wage or a departing servant does not wake a sleeping seat (working tree, `src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`)). The seat reads the notices at its next waking. It can set its own "treasury below X" trigger (`WakeReasons`).

**Assessment:** The mechanics exist but are narrow. Defection works, and it always has a motive.

Missed pay hardly matters abroad, which is where it should matter most. An envoy detained and unpaid for years is the classic case of a servant changing sides. And because loyalty only falls, paying well never earns it back. The design's "loyalty becomes something you pay to keep" has no upside yet.

Going further carries a risk. The pool is 18 characters, meant to be known figures, and heavy churn breaks that. Quitting for no visible reason would break pillar 3. The rule should be: every exit has a cause the king could have seen coming.

**Plan:**

1. Unpaid abroad. An unpaid envoy or spy abroad with loyalty under 20 offers itself to the host, as a pitch with a price. Its own king hears only that it is overdue. Script characters follow a rule; model characters decide in calls they already make.
2. Use the unpaid count. A character at home quits after 3 unpaid seasons, whatever its loyalty.
3. Let loyalty rise: +2 per season paid on time, up to the starting value + 10. Add +10 when ransomed (question 19) and +5 for a raise (question 22).
4. Sympathy approach. A character with sympathy ≥ 80 and loyalty under 30, at the court it favours, offers itself there. The host must still hire it.
5. Poaching by envoy. A mandate field lets an envoy carry a job offer to a named servant it meets at a foreign court.
6. Add "a servant leaves or goes unpaid" to the default wake triggers.
7. One rulebook line per rule.

Not worth doing: retiring on a full purse. It removes known figures from a pool of 18 for little play. Steps 1–4 and 6 take about two days; step 5 about one more.

**Core hypothesis:** Serves it in part: envoys who change sides after long unpaid detention, and loyalty bought away, are mediated trust, and step 5 fits best. All of it is second order, after war tempo and the contract fix in question 22.

**Simulation could change this:** yes: the run shows whether agent kings leave wages unpaid, whether they offer service to visiting envoys, and how often script envoys accept. Frequent poaching would make step 3 urgent. None at all would suggest the offer is buried in the rulebook. Starting envoys will not reach their contract check, which first runs in season 11. People hired or defecting in seasons 1–3 come up by season 10.

### 22. Contracts: wage, term, renewal and price

**Status:** partly implemented. Characters name their own price and contracts have a term, but every term is 6 seasons and nothing can be negotiated.

**Today:**

**Starting envoys.** Each power starts with 2 (`src/Amarna.Engine/GameConfig.cs:36`); two of the fourteen are plants. Their wage is 6 + competence/10, so 8–15, for seasons 1–10 (`src/Amarna.Engine/CharacterFactory.cs:76`).

**Asking price.** A pitch sets the price per court (`src/Amarna.Engine/TurnEngine.Envoys.cs:457-463`). Without one, the base price applies (`TurnEngine.Envoys.cs:543-549`). It is 6 + competence/8 + greed/8 + average reputation/5, −4 at the court the character favours, at least 5. That is about 8–28 for a new character. Reputation enters here, so a known betrayer works cheaper.

Pitches come when a king asks for candidates: up to 3 random free characters pitch the next season (`TurnEngine.Envoys.cs:557-565`). A contract that ends without renewal also leaves a fixed pitch and price at the old court (`TurnEngine.Envoys.cs:615-616`).

**Do characters set their own price?** Yes.

- Model characters name it. Their prompt says someone like them "usually earns about" the base price, and whether several courts are hiring. The engine clamps it to 5–400 (`src/Amarna.Llm/LlmCharacterMind.cs:129-136`, `TurnEngine.Envoys.cs:460`).
- Script characters ask the base price + greed/10 + 2 per court that drew them this season (at most +10). A past defector asks 5 less, and ambition ≥ 65 adds 4; the minimum is 5 (`src/Amarna.Game/Bots/ScriptMind.cs:171-174`). The demand count sits in `src/Amarna.Game/GameRunner.cs:189`. Candidate requests are already removed when it is taken, so in effect it counts the courts that drew the character, at least 1.

**Hiring** (`src/Amarna.Engine/Orders.cs:112-115`, `src/Amarna.Engine/OrderValidator.cs:215-225`, `TurnEngine.Envoys.cs:510-533`):

- valid only for a free person who pitched to you or stands at your court, and is not held elsewhere;
- the wage must reach the asking price; otherwise the offer is declined, and the king hears next season;
- the highest bid wins; ties go to the court the character favours, then to a fixed power order;
- the engine clamps the term to 1–30, but in practice it is always 6;
- model kings cannot set a term (`src/Amarna.Llm/Parse.cs:92`), and the UI and script kings use 6 (`src/Amarna.Web/Components/OrdersPanel.razor:179`, `src/Amarna.Game/Bots/Statecraft.cs:260`);
- reputation rises +5 with the new court.

Wages are paid each season after upkeep (`src/Amarna.Engine/TurnEngine.cs:79-102`; see question 21).

**Term end** (`TurnEngine.Envoys.cs:603-621`). The check runs once the term has passed and the person has no task, so an envoy abroad serves past it. The ask is the base price, +5 if greed > 60, −5 if loyalty > 70. If the ask is at most 1.2 × the wage, the contract renews for 6 seasons at the same wage. Otherwise the character quits and stays at court as a free agent at that price. The old king may rehire.

**No negotiation.** A king cannot counter-offer, raise a wage or extend a contract early. No such order exists. The renewal ask is a formula, even for model characters. Old asking prices are never cleared; only pitches are, on hire (`TurnEngine.Envoys.cs:528`).

**The season-11 cliff** (computed over the trait ranges, not seen in a run). The mean renewal ask is 20.7 against a mean starting wage of 11.3. About 11–12% of starting envoys renew, before loyalty drift. That is 36% of those who favour their employer and 10% of the rest. So from season 11, as each starting envoy is next at court with no task, about 88% quit. They ask nearly twice their old wage to return. Every full game passes season 11, since none ends before turn 15.

Script kings rehire at the new price only when short of staff, and only if it is the cheapest unblemished candidate, at most 15 + 25 × (1 − greed), and they can spare three times it (`Statecraft.cs:247-260`). Script-hired characters at their asking price usually renew. Defectors and model characters who pitch low may not.

The rulebook says only "Hire them for a wage per season" (`src/Amarna.Llm/Prompts.cs:64`). Kings see "wage X until turn Y" (`Prompts.cs:171`) but are not told what happens then.

**Sleeping seats.** A term-end quit sends a notice, not a candidates item, so it does not wake a sleeping seat (working tree, `src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`)). Until the seat wakes, the character is free and any court can draw it. A pitch answering a candidates request does wake the seat (`WakeReasons`).

**Assessment:** The pieces match the design. Characters name their own price, wages are paid each season, and contracts have a term. There are two problems.

The season-11 cliff. Nearly the whole starting corps resigns within a few seasons, by formula, not by choice. It follows from the lower starting wages set for balance (DESIGN-NOTES.md, "Balance (script kings)"). It churns the known figures and costs kings envoys or gold just as letters matter. It would confound every full model game.

No negotiation. Price is not yet the social act the design wants. Full haggling is not worth building: each exchange costs a season, and the delay should bite. One round per season is enough.

**Plan:**

Now, about half a day, fixing the cliff without touching the frozen balance:

1. Notice period. At term end the character names its price and stays one more season. The king accepts with a renewal order, or the character leaves. The notice wakes a sleeping seat.
2. Stagger starting terms by seed, for example 7–13 seasons, so the corps does not resign at once.
3. One rulebook line on terms, renewal and notice.

Raising starting wages to the base price would also remove the cliff, but it changes the frozen balance.

Then, one to two days:

4. A renewal order (person, wage, term) to raise a wage or extend a contract at any time. A raise gives loyalty +5 (question 21). Let models set the term.
5. One round of negotiation per season. An offer below the ask goes to the character. A script character accepts if the offer is at least ask × (1 − (100 − greed)/400). A model character decides in its next pitch, and any counter becomes its new asking price.
6. Let model characters name their renewal price in the same call.
7. Clear old asking prices on hire.

Steps 4–7 depend on nothing else.

**Core hypothesis:** Fix the cliff now, since it is cheap and removes a distortion from every full game. Negotiation serves the hypothesis only indirectly, by making a servant a relationship with a price, so it waits until after war tempo.

**Simulation could change this:** yes: ten seasons do not reach the starting-contract check, so the cliff will not show. Only hires from seasons 1–3 come up for renewal. It can show whether agent kings hire at all, bid below the ask, overpay, or react to "wage X until turn 10". To see the cliff, play to about season 14 or shorten the starting term. Characters are scripts in the run, so pitches and renewals stay formula-driven.

## E. Victory and threat (questions 23-25)

### 23. Shared victory

**Status:** implemented and capped at two powers. **Done 18 October:** off by default, kept as a house rule (`--shared-victory`, or Customize in the browser), as recommended below. Plan steps 1-5 are done; step 6 does not apply.

**Today:** `GameConfig.SharedVictory` is `true` (`src/Amarna.Engine/GameConfig.cs:12`; web default `src/Amarna.Web/Services/GameSettings.cs:12`). The batch switch `--no-shared-victory` turns it off (`src/Amarna.Batch/Program.cs:54`).

At the end, `DecideWinners` (`src/Amarna.Engine/TurnEngine.cs:463-489`) reads every tablet marked `AllianceOath` that is a sealed agreement. That means not forged, sealed, with a partner and at least two seals (`src/Amarna.Engine/GameState.cs:300`). For each pair still alive it pools growth as (strength A + strength B) / (start A + start B) (`TurnEngine.cs:477`). If the pool beats the best power outside the pair, the best such pair wins together (`TurnEngine.cs:478-485`). Otherwise the single best grower wins, with ties going to enum order (`TurnEngine.cs:467`).

The cap at two is already there. A tablet has two parties: the proposer and the one host who seals it (`src/Amarna.Engine/TurnEngine.Envoys.cs:52-61, 270-273`). `DecideWinners` returns one pair.

Three consequences matter more than the cap:

- **It only adds the leader's ally.** The pool is an average of the two growths, weighted by starting strength. It never exceeds the better partner's growth. So a shared win always contains the solo top grower, and adds his ally when the pool beats the best outsider. Example: Egypt at 5000/2500 (2.00) sworn to Alashiya at 1200/1200 (1.00) pools to 6200/3700 = 1.68. With every outsider below 1.68, both win. Two allies can never overtake a leader.
- **The oath never has to be kept.** The engine never checks it. Allies who fought each other all game still share. Land moved between the partners leaves the pool unchanged. Only the fall of one partner breaks the pair (`TurnEngine.cs:476`). No tablet can be revoked.
- **The approved rule holds only between script kings.** They set `AllianceOath = false` on coalition and defence-pact tablets (`src/Amarna.Game/Bots/Statecraft.cs:488`). They set it `true` only on the alliance tablet, which says "they shall share in the victory" (`Statecraft.cs:497-498`). The engine sees only the flag, and models set it freely (`src/Amarna.Llm/Schemas.cs:67`, `src/Amarna.Llm/Parse.cs:74`). A script host decides whether to seal any tablet naming "against X" on coalition logic alone, without consulting the flag (`Statecraft.cs:618-632`); it reads the flag only after sealing, to count the sender as an ally (`Statecraft.cs:643`). So it will seal a flagged coalition tablet from a model, and that tablet then counts (`TurnEngine.cs:472`). The frozen `BaselineLeader` flags its coalition tablets (`src/Amarna.Game/Bots/BaselineLeader.cs:334`) and a random 25% of its peace tablets (`BaselineLeader.cs:346-353`). That can produce shared wins in `--versus` runs; how many is not measured.

Bot behaviour around the rule:

- Two kings among the three strongest, the weaker at least 0.7 × the stronger, never swear an alliance (`Rivals`, `Statecraft.cs:116-125`). Its comment gives the shared win as the reason.
- A king under 60% of the leader's strength may ally with him (`Statecraft.cs:395-399`).
- No host refuses an alliance because it is itself leading. The only guards are `Rivals` and a host's refusal of a tablet from the leader when it is not his friend and its Caution is under 0.6 (`Statecraft.cs:635`).
- From turn 15 (`MinTurns`), no script king betrays a sworn ally. Treaty partners can still be betrayed (`Statecraft.cs:95`).

Results: about one script game in seven ends in a shared win. Alashiya's 4% and 6% of wins come only from sharing with a great king (DESIGN-NOTES.md, "Balance (script kings)"). That table counts a shared win in full for both partners (`src/Amarna.Game/Batch/BatchRunner.cs:131-140`). The `--versus` benchmark tallies already count it as half a win each (`BatchRunner.cs:84, 89, 110`).

**Assessment:**

**Remove.** No first place changes, because every shared win already includes the top grower. The junior partner drops out of the winners in about one game in seven. Cost: Alashiya's script win rate falls to near 0%, and alliances lose their only mechanical payoff. Gain: the engine stops giving a tablet force. Shared victory is the one exception to "Tablets are evidence only; nothing enforces them" (DESIGN-NOTES.md, "Communication"). The `sworn_alliance` checkbox is the alliance flag the design document rules out ("What is absent on purpose"). Removal also closes the three flag gaps above at no cost.

**Cap at two.** This is the code today. It changes nothing and fixes nothing. The "everyone wins together" worry applied to the first design, not to this code.

**Worth less (for example half a win each).** This gives the leader a reason to avoid or leave an alliance late. It keeps a small reason for a small king to bandwagon. But the engine offers the leader one escape only: destroy the ally (`TurnEngine.cs:476`). Taking his land changes nothing, and tablets cannot be revoked. That rewards killing a partner, not weighing trust. It also needs a stated points scale, because model kings are told "Your only goal is to win" (`src/Amarna.Llm/Prompts.cs:28`). The Balance report and the bots would need changes too. Medium cost, doubtful value.

**A stricter variant** is cheaper than the discount: share only when the two allies are first and second on their own growth. It ends free bandwagoning. It still keeps an engine-enforced flag, so I would not build it either.

**Recommendation:** remove shared victory. Switch it off by default and keep the switch for experiments. Fix weak-power balance through sieges, walls and terrain and through question 25, not through a co-winner rule. If a cooperative outcome is wanted later, use the design document's hidden individual objectives.

**Plan:**
1. Default `SharedVictory` to false in `GameConfig.cs:12` and `GameSettings.cs:12`. Keep the switch and the `DecideWinners` branch.
2. When it is off, leave the shared-victory line out of the rulebook (`Prompts.cs:33`) instead of printing "switched off in this game". Drop `sworn_alliance` from the schema (`Schemas.cs:67`), or relabel it as having no effect on the score. Update `src/Amarna.Web/Components/OrdersPanel.razor:153` and `src/Amarna.Web/Pages/About.razor:31`.
3. Bots: remove the victory wording from the alliance letter and tablet (`Statecraft.cs:493, 497`). Keep `Rivals` until a batch shows whether two great kings in alliance now carve up the rest.
4. Keep the test `Sworn_allies_can_share_the_victory` (`tests/Amarna.Engine.Tests/IntelligenceTests.cs:186`), which already switches it on itself (line 188), and add a test that it is off by default.
5. Rerun seeds 1-100 and 101-200 and update the Balance table. Expect Alashiya near 0%.
6. If shared victory is kept instead: make script hosts treat a flagged "against X" tablet as an alliance (apply `Rivals`) or refuse it. Stop `BaselineLeader` flagging coalition tablets.

Effort: about two hours, plus batch time.

**Core hypothesis:** Serves it now. Today the score pays for a sealed flag, not for kept trust, and hands the leader's ally a win for bandwagoning. Without it, alliances hold or break only on what each king expects of the other.

**Simulation could change this:** yes. *Since 18 October the simulation runs with shared victory off, so the kings never read the rule; the rest of this paragraph was written for it on.* The simulation runs with shared victory on and `--max-turns 10`. So `DecideWinners` runs after season 10 (`TurnEngine.cs:449`) and can award a shared win. The kings believe no game ends before turn 15, so end-game manoeuvring will not show. The game can show whether model kings tick `sworn_alliance`, put it on coalition tablets, and use "seal and we both win" as a bargaining chip. Heavy use argues for a discounted version. No use means removal costs nothing.

### 24. Security threat and victory threat in the script kings

**Status:** partly implemented. Both threats exist as separate mechanisms. Temperament sets how hard a king responds, not whom it sees as the victory threat.

**Today:**

**Victory threat** is a single yes/no leader. `Board.Leader` (`src/Amarna.Game/Bots/Board.cs:110-124`) ranks kings by estimated growth. A leader exists only after turn 3. He needs growth of at least 1.15 (`LeadFloor`) and at least 0.1 above the next king (`LeadMargin`). He also needs strength of at least 0.8 × the median (`Board.cs:117-119`). The last gate removes small fast growers on purpose. The comment says such a kingdom "leads the race, but is no threat to the great kings around it" (`Board.cs:104-109`).

In numbers: the starting median is Mitanni's 1950, so the gate is 1560. Alashiya (1200) needs growth 1.30 while the median stands still. Arzawa (1300) needs 1.20. With every other king at growth 1.5, Alashiya needs strength 2340, growth 1.95.

Coalitions add a second gate, `Outweighs` (`src/Amarna.Game/Bots/Statecraft.cs:113-114`). The target needs at least 0.85 × the stronger partner's strength, and higher growth than both. For Egypt and Babylonia to swear against Alashiya at their starting strength, Alashiya needs 2210, growth 1.84. The gate applies when proposing (`Statecraft.cs:382-384`) and when sealing (`Statecraft.cs:627-628`). At sealing, a looser "ahead" test (growth at least 1.10, and top) can stand in for the leader, but `Outweighs` still applies. A defence branch can seal without it, against a neighbour of the host with at least 0.8 × the sender's strength who has been taking land, is hostile or distrusted, or is the host's own war target (`Statecraft.cs:629-630`).

Once a leader exists (lead = his growth minus the best other growth, `Statecraft.cs:40`):

- War score against him: +160 + 400 × min(0.5, lead). Against anyone else: −300 × min(0.5, lead) × (0.5 + Diplomacy) (`Statecraft.cs:62`).
- A current war on someone else is dropped while the lead is at least 0.2 (`Statecraft.cs:47`). Exceptions: a sworn foe, or a king who attacked us within two seasons.
- A king attacks the leader's land at Aggression above 0.25, anyone else's only above 0.8, war targets, hostile kings and sworn foes aside (`src/Amarna.Game/Bots/Tactics.cs:340-343`).
- His land is worth × 1.2 (`Tactics.cs:89`). Harm done to him weighs 0.3 in the look-ahead (`src/Amarna.Game/Bots/Search.cs:331`).
- Coalition letter score: Diplomacy × (his growth − 0.6), × 1.4 if the partner touches him, × 1.2 if the partner is our neighbour (`Statecraft.cs:384`).
- The leader himself expects +0.15 hostility from everyone (`src/Amarna.Game/Bots/Brain.cs:311`).

Only one leader counts. The second-fastest grower is never a victory threat, except that a coalition already sworn against a king holds while his growth stays within 0.2 of the top (`Brain.cs:240`).

**Security threat** is counted in troops, not in economic strength:

- `Brain.Hostility` (`Brain.cs:295-313`), per rival, clamped to 0.05-0.95: base 0.3; up to +0.3 for recent conquests; +0.04 per enemy troop on the border, up to six; +0.35 if he attacked us and +0.3 if we attacked him, each within three seasons; up to +0.3 for grudges; −0.3 × trust; −0.3 for a treaty and −0.2 for an alliance while he has broken no oath. No strength term.
- `Tactics.Danger` (`Tactics.cs:98-111`): the largest muster of any king whose fear is at least 0.25. That fear becomes a chance that later scales exposure and defence.
- Strategy's flank risk: the sum of max(0, his troops − ours + 1) × 40 × (0.5 + Caution) over unfriendly neighbours (`Statecraft.cs:59`).
- A war is dropped when the target's force exceeds ours + 1 (`Statecraft.cs:45`). Exceptions: he attacked us within two seasons, or is a sworn foe.
- Defence pacts are sought against an attacker with at least 0.8 × our strength (`Statecraft.cs:374-376`).

**Temperament.** Caution scales the security side throughout: flank × (0.5 + C) (`Statecraft.cs:59`), exposure × (0.6 + 0.5C) (`Tactics.cs:142`), defence × (0.7 + 0.6C) (`Tactics.cs:174`), pull to the worst case 0.1 + 0.3C (`Search.cs:300`), open land 0.3 + 0.3C (`Search.cs:346`). On the victory side, Diplomacy scales coalition letters and the side-war penalty. Aggression sets the willingness to strike the leader. The leader gates (1.15, +0.1, 0.8 × median, 0.85 × strength) and the +160/+400 war bonus are the same for every king. None of the ten weights is Ambition (`src/Amarna.Game/Bots/Personality.cs:15-34`). So "an ambitious one watches whoever grows fastest" is not built. DESIGN-NOTES.md ("Where the code differs from the design document") says temperament sets the mix; that overstates it.

Every court judges from its own view. Rivals' land is exact, because the owner map is public (`Board.cs:90-92`). Only their gold is the court's estimate (`Brain.cs:213-224`). So courts can disagree about the leader only through their gold estimates.

**Sleeping seats** (built, not yet played by models). Apart from envoys, caught spies and ransoms, the default wake triggers about rivals are all security events (DESIGN-NOTES.md, "Pacing: sleeping seats"; `src/Amarna.Engine/TurnEngine.Sleep.cs` (`WakeReasons`)). They are foreign troops moving into the seat's land, against its troops, or next to its land or coast, land lost and units destroyed. No default trigger fires when a distant rival grows. A sleeping king sees the race only on waking, or through "a province changes hands" triggers it sets itself (at most eight).

**Assessment:** The split exists, which is the hard part. The victory threat is too blunt, and it contradicts the design document. The document says no Great King fears a growing Cyprus, "but under the scoring he should" ("Two kinds of threat"). The bots follow the setting instead. The 0.8 × median and 0.85 × strength gates mean no court acts against a small fast grower until it is large. The reason in the code is sound: two great kings who gang up on Cyprus become the pair to beat (`Statecraft.cs:108-112`). But it is hard-wired and identical in all seven courts.

That has one concrete cost in mixed games. A model king that reads the score correctly cannot recruit Egypt or Babylonia against Alashiya at growth 1.5, and as Egypt or Babylonia cannot recruit anyone: at starting strengths, Alashiya's 1800 is under 0.85 × 2500 and 0.85 × 2600. The script host refuses the tablet at `Statecraft.cs:627-628` unless the defence branch applies. Only courts that, with the sender, stay under about 2120 strength can still be recruited. A per-temperament threat would let some script courts accept. It would not make them persuadable: script hosts do not weigh the arguments in a letter.

Value: moderate. It gives better script opponents and more varied coalition letters. Cost: about a day, plus tuning. It must wait for question 25's shared score function, because the victory threat must call it. It also moves the script balance table, which is frozen (DESIGN-NOTES.md, "Balance (script kings)"). Do both in one change and rerun the tables once.

**Plan:**
1. Build question 25's shared score function first.
2. Replace the yes/no leader with a victory threat per rival. It measures how far his growth, by this court's estimates, stands above the best of the rest, us included.
3. Add an Ambition weight to the king temperaments, or derive it from Aggression and Pride. Set the victory weight w = 0.3 + 0.5 × Ambition − 0.3 × Caution.
4. Apply the 0.8 × median and 0.85 × strength gates only to cautious kings. Then some courts fear a growing Cyprus and some do not.
5. Use w × victory threat + (1 − w) × security threat in three places: the war score (`Statecraft.cs:62`), the coalition letter (`Statecraft.cs:384`) and the host's sealing test (`Statecraft.cs:627-628`). Keep the security threat as it is.
6. Batch check: win rates by tier, how often the coalition signal fires, and whether coalitions against Alashiya simply hand the win to a great king.

**Core hypothesis:** Serves it indirectly, and later. Kings who disagree about the threat give envoys something to argue, bribe and lie about, but this is bot quality, not communication. It ranks after slower war and the scoring decision.

**Simulation could change this:** yes: model kings work the threat out from the rulebook. If they turn on a small king at growth 1.3 once the median king has grown, which the script kings' leader test rules out, the script kings are naive and this change moves up. If they also ignore small growers, the current gates match capable play and the change can wait. One 10-season game is thin evidence either way.

### 25. Relative growth as the measure of victory

**Status:** partly implemented. (a) Strength is already economic value, and a purchase is already neutral. (b) Nothing beyond the raw ratio. The score function is not shared.

**Today:** Strength = 10 × (sum of base yields of provinces held) + true gold (`src/Amarna.Engine/TurnEngine.cs:421-422`; `ProvinceWeight` = 10 at `src/Amarna.Engine/GameConfig.cs:11`). Units count zero. Base yield is used, so catastrophes cut income but not the land part. Growth is strength over starting strength, and 0 for a fallen king (`TurnEngine.cs:424-428`). Starting strength is taken at game creation (`src/Amarna.Engine/GameFactory.cs:26`). The winner has the highest raw ratio (`TurnEngine.cs:467, 488`).

Starting strength, land + gold (`src/Amarna.Engine/MapData.cs:20-59, 183-192`):

- Babylonia 1950 + 650 = 2600
- Egypt 1900 + 600 = 2500
- Hatti 1800 + 300 = 2100
- Mitanni 1450 + 500 = 1950
- Assyria 1350 + 350 = 1700
- Arzawa 1000 + 300 = 1300
- Alashiya 850 + 350 = 1200

The world total is 13,350.

**(a) What counts as strength.** A purchase is already neutral. The price is yield × `NeutralPriceFactor`, which is 10 (`GameConfig.cs:20`; `src/Amarna.Engine/OrderValidator.cs:174`; `TurnEngine.cs:378`). Buying Ugarit (yield 40) costs 400 gold and adds 400 of land: a net change of 0. Afterwards it pays 40 a season, so barring catastrophes it returns its price in score after 10 seasons. The document's premise, that buying a city creates growth from nothing, does not hold in this code.

It holds only because two separate config numbers are both 10. Nothing ties them together. No test checks that a purchase leaves engine strength unchanged. The bot test at `tests/Amarna.Game.Tests/BotTests.cs:115-136` checks only the bot's own estimate, which uses `NeutralPriceFactor` on both sides.

Three things are not neutral. Conquest adds 10 × yield, paid for with armies at 100 plus 30 a season, which count zero. Gifts move score directly. Saving counts income 1:1.

**Fragility, in numbers.** Taking Ugarit is worth +0.33 growth to Alashiya, +0.16 to Egypt and +0.15 to Babylonia. A small base swings about 2.2 times as hard. To double, Alashiya needs 120 yield gained without paying for it, by conquest or cession. Ugarit 40, Byblos 30, Lukka 25 and Tyre 25 would do. Buying those four instead turns 1200 gold into land and adds only 120 a season of income. Egypt needs 250 yield; the whole Levant (eight cities) yields 210. No single city doubles anyone. The richest free city, Ugarit, gives Alashiya +0.33; even Babylon (55) would give +0.46.

The measured bias runs the other way. In 200 script games the three strong powers have the highest mean growth (Egypt 2.33, Babylonia 2.23, Hatti 1.92). Hatti and Egypt win most; Babylonia wins about as often as middle-tier Assyria. Alashiya averages 1.12 and wins 4-6% (DESIGN-NOTES.md, "Balance (script kings)"). Today the small base adds variance, not an edge.

**(b) Normalisation.** Only the raw ratio exists.

**One score function?** No. The copies are:

- Engine: `TurnEngine.Strength` and `Growth`, on true values.
- Bots: `Board.Strength` and `Growth` (`src/Amarna.Game/Bots/Board.cs:78-102`), a separate implementation. It weights land by `YieldWorth`, which is the city price `NeutralPriceFactor`, not `ProvinceWeight` (`Board.cs:79`; `src/Amarna.Engine/Views.cs:165`). `SeatView` does not carry `ProvinceWeight`; model seats get it only from the rulebook (`src/Amarna.Llm/Prompts.cs:31`). Rivals' starting strength is recomputed from `MapData` (`Board.cs:95`). Rivals' gold is estimated in `Brain.Learn` (`src/Amarna.Game/Bots/Brain.cs:213-224`). Every unit is charged army upkeep of 30, though fleets cost 35, and every unit raised is charged the army price of 100, though a fleet costs 120. Wages are a fixed guess of 25 (`Brain.cs:66`). Purchases seen are deducted (`Brain.cs:135`).
- `Board.LandGrowth` (`Board.cs:69-74`) counts land only, for the tribute decision (`Statecraft.cs:462`).
- `Board.Value` (`Board.cs:50-58`) hard-codes 10 per yield, plus income over the horizon, +80 for a capital and +30 for the court's own homeland.
- The prompt (`Prompts.cs:114`) and the orders panel (`src/Amarna.Web/Components/OrdersPanel.razor:15`) compute growth again.

The copies agree only while `ProvinceWeight`, `NeutralPriceFactor` and the 10 hard-coded in `Board.Value` are all equal. Rivals are judged from the court's own estimates. A court's own strength is the exact engine value.

**A leak.** `SeatView.Gold` is the ledger, which counts unassayed lots at their weighed value (`Views.cs:122`; `src/Amarna.Engine/GameState.cs:104`). `SeatView.Strength` uses true gold (`Views.cs:127`). The prompt prints both on one line (`Prompts.cs:115`). Strength minus 10 × land yield is true gold. *(Fixed 18 October: the strength shown to a seat is reckoned from its ledger.)* So any seat learns its total shortfall from debased gold without paying the 10-shekel assay (`GameConfig.cs:30`). With one unassayed lot, it learns that lot's exact purity. File seats get the same text.

**Assessment:**

**(a)** Economic value is the right measure, and the code already uses it. The weakness is that neutrality rests on two knobs that happen to match. Set `NeutralPriceFactor` to 12 and buying costs score; at 8, buying creates score.

**(b)** The three options:

- **Share of the world against the starting share** ranks powers exactly as today. Dividing by the world total scales every power by the same factor. It changes the figures shown and nothing else. Measured as points of share gained instead, it becomes absolute gain, which favours the big powers.
- **Dampened ratio**, gain / (start + K). K = 1000 cuts Alashiya's edge per city over Babylonia from 2.17× to 1.64× (Ugarit: 0.182 against 0.111). K = 2000 cuts it to 1.44×. It is simple and public, and every seat can compute it. But script data already shows small powers losing, so dampening now would widen the gap.
- **Par**, growth over each power's expected growth. It equalises win rates by construction, in the population it was measured on. With today's table, Mitanni (par 0.86) at growth 1.0 scores 1.16. Egypt (par 2.33) matches that only at growth 2.7. Par must be re-estimated after every rule change. It also encodes whoever played the batch games: script par is not model par.

**Recommendation now:** keep the economic-value score and the raw ratio. Tie the city price to the score weight in code, build one shared score function, and fix the leak. Do not change normalisation yet. The document's example does not occur here, and the measured bias goes against small powers.

**Once model games exist** (about 50 model or mixed games): choose a dampened ratio, with K tuned so the tiers win roughly equally. It is one public number every seat can reason about. Use par only if the tiers stay badly uneven.

**Plan:**

Now:
1. Add a pure `Scoring` class in `Amarna.Engine`: strength from land yield and gold, and growth from strength and start, taking inputs only. `TurnEngine` calls it with true values. `Board` calls it with the court's estimates. `Board.Value` reads the same weight.
2. Put `ProvinceWeight`, and any later K, into `SeatView`, so bots read the real numbers.
3. Derive the city price from the weight. Add an engine test that a purchase leaves strength unchanged.
4. Fix the leak: compute the strength shown to a seat from its ledger (`Views.cs:127`). The final score still uses true gold, so debasement shows at the end. *Done 18 October.*
5. Improve rival estimates: fleet upkeep at 35, and wages from the known size of each court.
6. Batch report only: add mean growth per power (the par table), and the winner under par and under K = 1000. The real winner does not change, but the data accumulates.

Later, once model games exist:
1. Add `GameConfig.GrowthDamping` K, defaulting to 0 (today's rule).
2. Compare tier win rates over a few values of K in mixed games, then decide.
3. Switch the bots' victory threat (question 24) to the same function in the same change.

**Core hypothesis:** Mostly later. The score is not about communication, but it drives the victory threat and so the coalitions. The leak fix serves "truth is expensive" (pillar 5) now, since the assay and gold purity rest on it. The normalisation choice should wait for model data.

**Simulation could change this:** yes: one 10-season game cannot measure normalisation or par, but it can change priorities. Watch whether model kings save gold rather than keep troops (units count zero), or buy cities knowing a purchase is neutral. Watch whether any king notices that strength minus land reveals its true gold. Any of these would raise the priority of the fixes, not change their content.

## F. Presentation and overall (questions 26-27), and the prioritized list

### 26. Year and season on screen, and 1360 BCE as the start year

**Status:** partly implemented. The header shows the season and a relative year. There is no BCE year, and most other labels count turns.

**Today:**

- A year is 3 seasons, and turn 1 is the first season of year 1 (`src/Amarna.Engine/Calendar.cs:6-10`). The season has no game effect; only display and prompt text read it.
- The seat header shows the court's own reckoning (`Calendar.cs:13-20`; `src/Amarna.Web/Pages/Play.razor:29`). Egypt sees "Peret (growing), year 3". The other six courts see "the second season, year 3".
- Beside it, the phase label names the step under way, such as "Turn 8: orders", while a season is played, "Ready" between seasons, and "History: after turn N" when the timeline is rewound (`Play.razor:30`; `src/Amarna.Game/GameRunner.cs:133-150`).
- The god view shows "Season 2 of year 3 (turn 8)" (`Calendar.cs:23`).
- The model's orders prompt opens with "SEASON: turn 8, the second season, year 3 by your court's reckoning" (`src/Amarna.Llm/Prompts.cs:113`). The audience prompt gives only "SEASON: turn 8" (`src/Amarna.Llm/LlmLeaderSeat.cs:54`). File seats get the same text.
- A few labels use the calendar too: the inbox groups news under the court season, the human orders panel is headed "Orders for" the court season (`InboxPanel.razor:19`; `OrdersPanel.razor:12`), the template annals are divided by game year (`src/Amarna.Game/Bots/TemplateNarrator.cs:26,35`), and the model narrator is given "year 3, turn 8" (`src/Amarna.Llm/LlmNarrator.cs:70`).
- Every other date is a turn number. That covers the browser title, events, the true record beside the annals, memories and contracts ("until turn N"). It also covers tablets ("dated turn N" or "sealed turn N"), the message trail ("sent turn 6, heard turn 7") and the growth chart. See `src/Amarna.Web/Components/EventsPanel.razor:19,27`, `ChroniclePanel.razor:15`, `PeoplePanel.razor:24,41`, `AudiencePanel.razor:44`, `OrdersPanel.razor:245`, `TrailPanel.razor:20` and `StandingsPanel.razor:61`.
- Durations are given in seasons: travel, hire terms, wages.
- The ending is stated in turns: none before turn 15, then 15% a season, a cap at 60 (`src/Amarna.Engine/GameConfig.cs:7-9`; `src/Amarna.Engine/TurnEngine.cs:448-450`). In years that is at least 5, about 7 on average (expected end turn 20.7, median 19), and at most 20.
- The era appears only as prose, "c. 1360-1330 BCE": in the rulebook (`Prompts.cs:28`), two other model prompts and `README.md:4`.
- No test checks a Calendar label.
- The sleeping seats, built since 23e0a4f and not yet played by models, add more turn dates. A woken seat reads "YOU WERE WOKEN (you last gave orders in turn N)" and "WHILE YOU SLEPT (since turn N)". Its scheduled orders are listed by turn. The god view shows "Asleep since turn N, wakes by turn M". A seat asks to sleep for a number of seasons.

**Assessment:**

**Showing the date.** The header is legible. The weakness is two clocks that are never joined. The header gives the court season, and the turn only while a season is being played or the timeline is rewound. Rules, tablets, contracts, the trail and the ending use turns. A human must work out that "no end before turn 15" means "the third season, year 5". That matters more than any BCE year, because the game is about reading delays. Sleep raises the stakes: a waking seat needs to see at a glance how long it slept. One label helper fixes it in 2-3 hours, display only.

**1360 BCE.** Not with this cast. 1360 is when the archive begins, under Amenhotep III (Nimmureya) at Thebes. The board is set about 15 years later. On the usual chronology, give or take a decade:

- Akhenaten (Napkhururiya) reigned c. 1353-1336. Akhetaten was founded around his fifth year, c. 1346.
- Suppiluliuma I came to the throne c. 1350 or c. 1344, depending on the chronology.
- Burna-Buriash II (c. 1359-1333) and Ashur-uballit I (c. 1363-1328) fit any date in the range.
- Tushratta reigned until about 1340.
- Tarhundaradu is attested only under Amenhotep III (EA 31-32). He is the one king who fits 1360 better.

The cast is in `src/Amarna.Engine/Power.cs:31-36`, and Egypt's capital is Akhetaten (`src/Amarna.Engine/MapData.cs:54`). A 1360 label puts Napkhururiya on the throne and the court at Akhetaten years too early, and the models know this period. About 1345 BCE fits everyone except Tarhundaradu. "c. 1350" is defensible within the dating uncertainty. A real 1360 start needs Nimmureya at Thebes, a weak Hatti and a courted Arzawa; EA 31 describes Hatti as collapsed. That swaps two tiers and the balance, and is not worth it now.

What a BCE year implies:

- Years count down. From 1345, an average game ends about 1339, and the 60-turn cap in 1326.
- Covering the whole archive, 1360 to about 1332, takes nearly 30 years, some 85-90 seasons. Only sleeping seats and succession make that affordable.
- Three seasons of about four months is the Egyptian civil year. Mesopotamian courts counted lunar months. Giving the Egyptian names to Egypt alone (`Calendar.cs:12-18`) is right.
- Courts dated by regnal year (Egypt, Babylonia) or by an official named for each year (Assyria's limmu). Hittite texts were rarely dated. A BCE year is the spectator's reckoning, so it belongs in the god view.
- The rulebook already names the era. A precise current year would sharpen the design document's risk "models replay real history". A Hatti model told it is 1344 knows Mitanni is about to fall. Keep the year out of prompts by default.
- If campaign seasons come (question 5), the season becomes a rule. Then a clear label stops being cosmetic.

Value against cost:

- Joined labels and an ending indicator: high value for humans and spectators, 2-3 hours.
- A BCE year in the god view: low value, about an hour.
- Regnal years per court: flavour, about half a day including data.

**Plan:**

1. Add one `Calendar.Label(turn, court?)` helper and use it for every date. Seat view: "Peret, year 3 (turn 8)". God view: "1343 BCE · season 2 of year 3 (turn 8)". Dense lists get a short form, "y3 Peret", with the turn in a tooltip.
2. Replace the bare turn labels listed above, plus `Play.razor:5,30,143`, `Person.razor:5` and the new sleep line in `StandingsPanel.razor`.
3. Add an ending line to the header from `SeatView.MinTurns` and `EndChance`, which the view already carries (`src/Amarna.Engine/Views.cs:65-66`). Before turn 15: "the age cannot end before turn 15 (Shemu, year 5)". After it: "any season may now be the last (15%)".
4. Add `GameConfig.StartYearBce`, default 1345, with 0 to hide it. No rule reads it, so replays are unaffected. The log header records it with the config.
5. Prompts: keep the turn number first and add the year. Leave the BCE year out. Test it, if at all, inside the primer experiment (`CustomsPrimer`, `GameConfig.cs:33`).
6. Later, as flavour: a starting regnal year per king next to `Power.King` (`Power.cs:29-39`), and chronicles divided by regnal year (`src/Amarna.Game/Bots/TemplateNarrator.cs:35`).
7. Tests: turn 1 is Akhet of year 1, turn 15 is the third season of year 5, and the BCE countdown.

Steps 1-3 belong with the web display of sleeping seats. Steps 4 and 6 can come any time.

**Core hypothesis:** Steps 1-3 serve it indirectly but for real. Trust is judged against time ("support by the harvest", "my envoy is a season overdue"), and sleeping seats need wake-ups people can read. BCE and regnal years are flavour that feeds neither mediation nor verification, so they can wait.

**Simulation could change this:** yes: for the prompt side only. If the agent kings mistime things, such as expecting an envoy back early, the turn must stay first and steps 1-3 move up. If they bring in later history (Mitanni's fall, Suppiluliuma's Syrian wars) with only the era given, a precise year stays out of prompts for good. The dating facts behind the start-year advice cannot change.

### 27. Is the game coming together, and is it any good?

**Status:** partly implemented. Milestones 1-6 are built and tested offline. No model has played a game, and the agent simulation has not run yet.

**Today:**

**Built.** About 11,200 lines of C# and Razor at 23e0a4f, not counting the 165-line batch console: engine 4,028, game layer 3,769, model layer 1,383, web 2,012. There are 86 tests; the working tree adds 25, 18 for sleeping seats and 7 for the file seat, 111 in all.

- **Engine.** Every roll is keyed by seed, turn, purpose and subject (`src/Amarna.Engine/TurnEngine.cs:25`). Exact replay is tested for the engine, script games and logged model games (`tests/Amarna.Engine.Tests/EngineTests.cs:46`, `tests/Amarna.Game.Tests/RunnerTests.cs:18`, `tests/Amarna.Game.Tests/ModelLayerTests.cs:76`).
- **Seats.** Script, human, model and file seats share one interface. Every model call is logged and has a script fallback (`src/Amarna.Game/GameRunner.cs:78-107`). Orders run in parallel. Audiences run in parallel across courts, one at a time within a court (`GameRunner.cs:196-203,255`).
- **Communication.** A sealed greeting beside a spoken body. Tablets for a 20-shekel fee, as evidence only. Gold carried by envoys, skimmed or debased, assayed for 10. Forgery for 40 by a forger of competence 55 or more. Spies, 2 plants among the 14 starting envoys, detention and overdue notices (`src/Amarna.Engine/GameConfig.cs:29-32`; DESIGN-NOTES.md "Communication").
- **Script kings.** Ten temperament weights, memory, coalitions and joint blows. Against the frozen baseline (seeds 1-40) they reach growth 2.60 against 1.13, and win 56% against 14% (DESIGN-NOTES.md "Benchmarks").
- **Balance.** Every power wins some script games. Wins in seeds 1-100 and 101-200: Egypt 26/22%, Hatti 29/29%, Babylonia 19/15%, Mitanni 6/7%, Assyria 16/20%, Arzawa 14/14%, Alashiya 4/6% (DESIGN-NOTES.md "Balance (script kings)").
- **Web.** God view, seat view, the three-version message trail, timeline, human orders and audiences, saves, a cost meter and a spending cap.
- **Since 23e0a4f**, built but not yet played by models: sleeping seats with scheduled orders and wake triggers, and the file seat with its kit in `sim/`. See DESIGN-NOTES.md "Pacing: sleeping seats" and "File seats and the agent simulation".

**Missing or weak.**

- **No model has played.** The model path runs only against simulated replies (`tests/Amarna.Game.Tests/PresetTests.cs:61` and the ModelLayerTests). Cost is estimated, not measured: $0.55, $9 and $18 for 20 seasons (DESIGN-NOTES.md "Models"). There are no UI tests.
- **War outruns letters** (question 5). A letter and its reply take 2 seasons for 8 of the 21 capital pairs, and 4 for the other 13 (`TurnEngine.cs:194-203`; `GameConfig.cs:25`). An army takes an undefended province every season, and capitals have no walls (`src/Amarna.Engine/GameState.cs:18`). Before the Arzawa fleet, Hatti won 41 of 100 script games. Each time it held most of Arzawa, usually taken within eight seasons (DESIGN-NOTES.md "Balance (script kings)").
- **Script envoys relay almost verbatim**, inside 'He says: "..."' (`src/Amarna.Game/Bots/ScriptMind.cs:38`). Their distortions are fixed rules on traits and keywords. A timid or fond envoy drops every sentence containing one of 14 strings, such as "war", "enemy" or "march" (`ScriptMind.cs:24-31`; `src/Amarna.Game/Bots/TextKit.cs:8-9`). The match was on substrings, so "toward", "reward" and "warm" counted too (whole words since 18 October). An envoy of competence below 35 drops the last sentence of any letter over two sentences (`ScriptMind.cs:32`).
- **Script kings read text by keyword.** They see a coalition only if a tablet they hold or are asked to seal contains "against " plus the enum name, case-sensitive (`src/Amarna.Game/Bots/Brain.cs:112`; `src/Amarna.Game/Bots/Statecraft.cs:618`). "against Babylon" is missed, and the rulebook never teaches the wording. Letter tone is a tally of 9 warm and 10 cold substrings (`Brain.cs:286-291`).
- **The free-text signals are heuristics:** substrings and regexes (`src/Amarna.Game/Signals.cs:42-48,74-81`; `TextKit.cs:11-12`). "I received your messenger with joy" counts as an accusation. Only broken promises and coalitions come from engine events.
- **Leader memory** is the last 5 order calls in full, plus notes from the 8 before, capped at 300 characters each (`src/Amarna.Llm/LlmLeaderSeat.cs:84-86`). Awake every season, that covers 13 seasons. There is no per-court ledger of promises, as the design document's risk table proposes.
- **A seat can read its own true gold.** `SeatView.Strength` uses true gold, `Gold` the ledger, and the prompt prints both (`src/Amarna.Engine/Views.cs:122,127`; `Prompts.cs:115`). Strength minus 10 × land yield exposes debased gold without an assay. *Fixed 18 October.*
- **Scoring.** Buying a city is already score-neutral when it happens. The price is 10 × yield, and strength counts 10 × yield (`TurnEngine.cs:378,421-422`). Growth comes only from the city's later income. But the neutrality rests on two separate settings that happen to match, and the bots keep their own copy of the score (`src/Amarna.Game/Bots/Board.cs:78-102`; question 25). Shared victory is on by default and needs only a flag on a sealed tablet. The engine never checks whether the oath was kept (question 23).
- **Mobile.** Panels stack below 980 px (`src/Amarna.Web/wwwroot/css/app.css:147-152`). There is no installable app and no province list.

**Assessment:** As a machine, yes. As a game, nobody knows yet, and that is the honest answer.

The strengths are real:

- **The architecture fits the experiment.** Determinism, one seat interface, validated orders and logged calls allow clean comparisons: primer on or off, sleep on or off, model against model. This is the hardest part to add later, and it is done.
- **The communication layer is the thesis, and it is rich.** The envoy cannot change the greeting, but can change the body. Gold arrives late, light or debased. Tablets are evidence and can be forged. Checking costs gold and is never certain. Every distortion has a motive. The board game Diplomacy has nothing like it.
- **The script kings are credible** opponents and fallbacks. They beat the old bot clearly, gang up on a leader, and every power wins some games.
- **The instruments exist:** god view, three-version trail, seat view, timeline. The `sim/` kit adds isolated agent kings at no API cost.

The weaknesses, most serious first:

- **The hypothesis is untested.** All tuning was against script bots. The design document itself says they test the engine, not the hypothesis. Bots cannot lie strategically or invent norms.
- **War outruns letters.** A capital can fall by season 3 (question 5). A plea to a court more than four steps away (13 of the 21 pairs) is answered 4 seasons after it is sent. A model king may sensibly ignore envoys and fight. We would then wrongly conclude that the hypothesis failed. The Arzawa fleet treated one symptom.
- **Script envoys under-test mediation.** A host reads nearly what the king wrote, minus keyword deletions. A model will learn those tells fast. The filter can also invert a letter. A timid envoy deletes "let us march together against our common enemy" and adds a wish for peace.
- **Measurement is not ready for model prose.** Signals written against bot templates will count every polite "your messenger". Ten games without a fixed rubric cannot be compared.
- **Small bugs would mislead model kings.** True gold was readable from Strength (fixed 18 October). A captured spy still shows in its master's prompt as "at court, ready for a mission" (question 19). An estimated 9 in 10 starting envoys resign by formula from season 11 (question 22).
- **Shared victory rewards a flag, not a kept oath** (question 23). The score itself is sound, but its neutrality is accidental (question 25).
- **Memory is short for the game's length.** Leader memory spans about 13 seasons; a game lasts about 21 on average. Reputation for early events rests on the model's own notes.
- **Dates and mobile** are only partly done (question 26).

**Verdict:** a solid prototype with unusually good instruments, whose central question is still open. One structural problem, the tempo of war, could make the first model games mislead. Next, watch models play with a fair way to read the results, then slow war down. Add no other new systems until then.

**Plan:** see "What to do next" below.

**Core hypothesis:** This question is the hypothesis itself. What lets it be tested fairly serves it now: model games, readable signals and slower war. The wait list does not, because each item adds rules that would confound the first readings.

**Simulation could change this:** yes: strongly, because this verdict comes only from code, tests and bot batches.

- Suppose the agent kings bargain through envoys, demand tablets, accuse messengers, and keep or break promises for reasons. Then the verdict becomes "it works; slow war down and measure".
- If they are uniformly polite and honest, prompts and motives come before sieges (the "too honest" risk).
- If they ignore envoys and simply fight, sieges move to the top.
- If they misread the seat view, the view and the rulebook come first.

The run has limits. The game stops after season 10, while the kings are told no game ends before turn 15, so end-game behaviour goes untested. Envoys are scripts, so the Haiku envoy goes untested. One seed and two runs are anecdote, not statistics. Each king call is a fresh agent whose only memory is its journal, which is also all an API king gets.

## What to do next

**Done this round, before the simulation:** the true-gold leak (question 25), whole-word threat matching (question 13), and shared victory switched off (question 23), each in its own commit.

**Still in this round: run the agent simulation.** The kit is in `sim/` and the start prompt in `docs/SIMULATION-PROMPT.md`. It is the first look at model kings, at no API cost, and it tests whether the seat view is understood. It runs with the bugs in item 1 still in place. Its ten seasons keep the contract cliff out of view (it starts in season 11), but a captured spy or a repeated ransom can show; record any that do. Read the trail by hand, not the signal counts. Its results go in "Simulation results" above and may reorder the list below; the signs to watch for are under question 27.

**Next round**, in order:

1. **Fix the bugs that would still mislead model kings** (about 2-3 days). Each of these makes a game read wrong, whatever the kings do:
   - starting envoys resigning by formula from season 11, the contract cliff: about 9 in 10 quit (question 22, plan steps 1-3)
   - a captured servant shown in its master's view as at court and ready for a mission (question 19, plan step 2)
   - repeated ransoms: a host re-issues the demand every season, and a payment is accepted for any open demand, even after the captive is free (question 19, plan step 1)
   - coalition tablets read only when they say "against " plus the exact enum name, case-sensitive, so "against Babylon" or "the Hittites" is missed: match any name of the foe, ignoring case (`Brain.cs:112`, `Statecraft.cs:618`), so fallback kings read model tablets (question 17)
   - every power's opening positions and treasury in the rulebook, so models know what bots know (question 16)
   - the small fixes the answers call "now" or "next", about 2 days more:
     - allies who broke an oath stop being friends (`IsFriend`, question 16 step 1; Part 0 quirk 3), with the bots' next change, before any new benchmark is quoted
     - a test that hidden state outside the seat view leaves bot orders unchanged (question 16 step 2)
     - a derived seed for each script seat (question 16 step 4)
     - bots refuse tablets they did not write that mention land, gold or tribute (question 17 step 2)
     - a shadow brain, so a fallback king remembers (question 17 step 4)
     - the dead cunning clause at `Statecraft.cs:634` (question 17 step 5)
     - the court-list leak: the sender sees only what it could know of its envoys (question 8 step 1)
     - no catastrophe rumour reaching every court without a carrier (question 9 step 3)
     - a bribed envoy repeating the host's request (question 13 step 2)
     - aiming the threat filter at the host (question 13 step 1, the part not done)
     - telling the host when a captive order does nothing (question 19 step 4)
     - the dismissal edge cases (question 20 step 5)
2. **First live games on a spend-limited key** ($3 cap, as the design document's process notes say). Play one with Sonnet kings and script characters, then one with Haiku envoys. The simulation uses script envoys, so the Haiku envoy, which carries the core mechanic, has never run. These games also measure real cost, fallback rate and turn time. Play them on today's rules, as the baseline for what sieges change. The hybrid envoy (question 15): build it next, before sieges, if Haiku envoys relay too faithfully or refuse every bribe.
3. **Sieges, walls and terrain as one package** (question 5), with slow absorption (question 9) and envoys leaving a besieged city (question 5, step 12). This is pillar 8. A capital must hold out longer than a plea for help takes to be answered. Until then letters cannot change a war, and a failed test proves nothing. It is the largest build: several days across engine, adjudicator, bots, prompts and tests. Tune it against model games, not bots, and watch for stalemate. Alashiya is one check: with shared victory off it never wins against script kings (DESIGN-NOTES.md, "Balance (script kings)"). Set the new game length from data.
4. **Make measurement ready** (about a day). Write a fixed rubric per success signal, scored by a model judge, checked against about 20 hand-labelled messages. Ten games cannot be compared if each is read differently.
5. **One score function** (question 25). A shared scoring function for engine and bots, with the city price derived from the score weight. Then put the bots' victory threat on the same function (question 24). Kings chase the score, so the bots must chase the same one. Leave the normalisation until about 50 model games.
6. **Sleeping seats, second step.** Add conditional orders, and set the sleep cap from the lengths seats chose. Show dates as season plus turn, with an ending indicator (question 26). Siege-paced games run longer, and sleep is what makes them affordable.
7. **Next layer, once sieges work:** mandates with authority to seal (question 14), passage grants (question 3), and news that travels (question 6, step 1). Each is a trust bet carried by mediated, delayed communication. Each matters more once wars take time.
8. **The experiment itself:** at least 10 full model games read against the success signals, the primer on and off, and one model comparison. That is what the prototype is for.

### What should wait

- Command at a distance: delay inside the realm, moving courts, generals (question 6 beyond step 1, and question 7). First show that trust forms between kings.
- Distance-based travel, interception and finer seas (questions 1, 2 and 4). Sieges slow war more cheaply.
- Pirates and bandits (question 8) and trade (question 11). Both need routes that take time.
- Geographic disasters and varying output beyond slow absorption (questions 9 and 10).
- Resident envoys (question 14) and speaking city-states (question 12).
- Advisors (question 18), unless model games show many invalid orders or tactical blunders.
- Careers beyond the bug fixes: dismissal, quitting, wage bargaining (questions 20-22).
- Score normalisation or par (question 25), until about 50 model games.
- More bot or balance tuning, multiplayer, an installable app, art and sound.
- BCE and regnal years. They are flavour, and cheap at any time.
