# Round report: fixes from the simulation, default sleep, and a clearer seat view

Branch `round/simulation-fixes`, from `main` after PR #6, 18 October 2026. The prompt is `docs/ROUND-PROMPT.md`.
The previous round's report, which holds the plans for all 27 Part 3 questions, is now
`docs/rounds/2026-10-18-sleep-and-simulation.md`; "question N" below means that report.

*Work in progress: this report is saved as the round goes. Done so far: Parts A, B, C and F.*

## How I read the prompt

Where the prompt left room, I took these readings and carried on:

- **Old references.** The prompt asks to update "this prompt's question numbers" to the old report's new path. The
  prompt is saved word for word, and its own sentence already says that "question N" means the old report, so its
  text is unchanged; every other reference (`DESIGN-NOTES.md`, `sim/README.md`, `docs/SIMULATION-PROMPT.md`) points
  to the new path. No code comment named the report.
- **Sleep is on by default.** The design document decides "sleep is the default", and the prompt says the switch
  stays for comparison. So `SleepingSeats` now defaults to on in the engine, the batch runner and the web app;
  `--sleep off` and the web checkbox turn it off. Script and human seats still play every season.
- **What wakes a king.** The prompt's list (Part D.5) replaces the old one. Where it differs from the design
  document ("foreign troops at your border"), I followed the prompt: troops at the border, failed attacks that did
  not get in, candidates, catastrophes that kill no unit, spies caught and forgeries ready now go to the digest.
  The text the kings read names exactly what still wakes them.
- **Notes.** In the simulation the kings' notes had a median of 1,989 characters (134 orders replies; 107 longer
  than 1,500), so the prompt's example cap of 1,500 would have cut most of them. Each season's notes are kept up to
  2,000 characters, and the king is told the limit.

(More readings are added below as each part is built.)

## Part A: bugs that make games read wrong

All built, one commit per group, each reviewed by two or three adversarial reviewers and fixed. The script-bot fixes were built in parallel in their own worktree and cherry-picked onto the branch.

**Save version 2.** `GameState.CurrentVersion` = 2, written in every new log header. Replaying or resuming a log of another version is refused with a plain message ("This game was saved under an earlier version of the rules (version 1) and cannot be replayed by this version."), in the batch runner and the web app's saved-games card. For analysis only, `GameRunner.ForReplay(log, anyVersion: true)` still feeds an old log through the new rules (it may diverge).

From the simulation:

1. **Gold sent back in round 1 is kept.** The gold sent back is the amount named in the latest exchange that names any; 0 later keeps it, a new amount replaces it, at that exchange's purity. Round 2 tells the host: "You have already named N shekels to send home with the envoy; a new amount replaces it, 0 keeps it." An envoy takes one gift per audience: a second gift is not given, and the outcome says so ("a second gift was not given: an envoy takes one gift per audience"); a gift accepted but unpaid (empty treasury) still counts as the one gift.
2. **A purchase of a city taken by troops that season** is no longer silent. Every bidder is told ("Purchase failed: Mari was taken by Babylonia's troops last season before its elders could accept your gold. No gold was paid." / "Your own troops took Mari last season; no gold was paid."), the scheduled-order failure fires, and a test proves no gold moves. The rival-bid and foreign-troops refusals end "No gold was paid." too.
3. **Battle reports say why.** Foreign moves are shown when the unit's origin or its target was in sight (as `LastSeen` already counted), so a move from out of sight into a visible province is reported. Every own move that failed says why, with the strengths where strength decided it, and names the other power only if that unit stood or moved where the king could see (in practice the target of one's own move is always in sight, so only a convoy to a coast out of sight hides the name):
   - "A ekallatum -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 2 against 3"
   - "it met a move into Y from Z; your strength 1 against 1" (a bounce), "the unit holding Y kept its place", walls that held
   - supports and convoys that did not count: "void: the supporting unit was destroyed", "void: no unit moved from durkurigalzu to nippur", "void: the unit in durkurigalzu was ordered to move, not to hold"; a cut support says where it was attacked from.
   The adjudicator explains only for the engine; the bots' look-ahead (720 adjudications a king a season) runs without it, so its cost is unchanged.
4. **The false "assurances" line** ("I gave him such assurances as you would wish") is said only after a real overreach, and no empty line is added otherwise.
5. **Other confirmed defects from the list:**
   - The batch seat report counts every refusal and failure notice (failed levies included) and lists every reason a sleeper woke. Failure notices are now all `Rejected` notices ("Purchase failed", "Not enough gold", "Not hired", "Levy failed", validator refusals), so they are counted the same way everywhere.
   - "a Egypt fleet" now reads "Egypt's fleet" in wake and digest text.
   - Signals: `broken-promise` counts a breach in the season of sealing and no longer counts a king taking back his own homeland; `accusation` is one whole-word reader ("lie" only as an untruth, denials and "your messenger" excluded). On the two seed-7 games it now finds 9 and 10 accusations, every one a real charge of oath-breaking, against 35 and 30 before.
   - Notices are worded for when they are read: "Movements last season", "X set out for Hatti last season; the journey takes 1 season(s)", and the treasury notice says gold received at audiences is added later. Validator refusals say "that season" and "an earlier order".
   - The rulebook gains the dislodgement rule, the void-support rule, the desertion rule and the battle-report rule (quoted in "What a king now reads").

From the previous round's list:

6. **A captured servant is no longer "at court, ready for a mission"**, and **7. ransoms** — see the second half of Part A below.
8. **Coalition tablets are read for any name of the foe** (`Bots/Names.cs`): the enum name, the land (Karduniash), the king, the adjective and its plural (Hittites, Babylonians…), Babylon, Pharaoh, Cypriots; whole words, any case, with "the" and "the king/land/people/armies of" allowed after "against". Wider phrasing ("strike Assyria together", "the Assyrian is the foe of both") is still not read.
9. **Every power's opening troops, treasury and starting strength** are in the rulebook as a static section after the map (so it stays in the cached block), and in the web app's standings panel for every seat.
10. **A sworn ally who breaks an oath is no friend** (`Brain.IsFriend` = no broken oath, and allied or a trusted treaty partner).
11. The remaining small fixes:
    - **Hidden state** (true gold, own lots' fineness, rivals' inboxes, unseen troops, character traits, seat labels) changes nothing in a script king's orders (`BlindnessTests`; the test fails if a visible field changes).
    - **A seed per script seat**: the first 8 bytes of SHA-256 over the game seed and "seat:<power>", so no script seat holds the engine seed and the seed cannot be recovered from it (a plain `Rng.For` derivation could be inverted; a reviewer showed it). Pictured rivals use the picturing king's own stream. The web god view's temperaments use the same seeds.
    - **Bots refuse foreign tablets that give land, gold or tribute away**, or name one of their own provinces; a capital that is also a power's name (Babylon, Ashur, Hattusa) counts only in a sentence that hands it over. The host says why: "I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine." The script kings' own tablets, and the frozen baseline's, are recognised exactly, so script games seal as before.
    - **A shadow brain**: each season the stand-in script king learns from every model or file seat's view, asleep or awake, so a fallback remembers trust, grudges and lost land.
    - **The dead cunning clause** is gone (no behaviour change).
    - **The court-list leak**, **catastrophe rumours**, **telling the host when a captive order does nothing** and **the dismissal edge cases** — see the second half of Part A below.
    - **A bribed envoy passes on the host's request**: "At the court of Hatti the king told me "My armies are few and my thoughts are of peace", and I saw for myself that it is so." (or, asked to speak well of a third king, "…I saw for myself that Egypt is a true friend to you").
    - **The threat filter is aimed at the host**: a timid or fond envoy now drops only a sentence that threatens the host (a threat word that is not denied, with the host as its object, its victim, or the one whose deed sets it off). On the seed-7 letters it flags none of the 57 sentences the old filter cut (none of which threatened the host); 17 real threats in the tests are caught. The report home uses the same reading against the envoy's own lord.
    - **Script captors leave an open ransom demand standing** instead of re-issuing it every season.

Deviations: notices read next season say "last season" (the brief had "this season"); the gift rule counts a gift as given once accepted, even if the treasury could not pay it, to match what the host is told; whitelisting the frozen baseline's tablets keeps the benchmarks comparable.

### The second half of Part A: news of people abroad, ransoms, catastrophes, dismissals

6 and 11 (the court-list leak). **A master learns of a hidden event only when word reaches him.** Before, a master's list showed the truth at once: a caught spy read "at court, ready for a mission", a detained envoy "has not returned" the same season, a defector dropped off the list and its wage stopped, an executed spy vanished. Now each servant can carry a *cover* per court: what that court still believes, frozen when the hidden event happens (a spy caught, an envoy detained or going over to its host, a captive executed). The master's list keeps it on its mission ("watching Assyria"; an envoy "on the road home"), never ready, and the master keeps paying its wage, until the news arrives: the overdue rumour, the ransom demand, the rumour of a death, the servant standing at the master's court, the master dismissing it or falling. Orders naming it are refused only as for a servant who is away ("Mane is not at your court"). A known captive reads "held captive at the court of Assyria; Assyria demands 1 mina 30 shekels for their return (order pay_ransom)". The web app shows the ransom button only once a demand has arrived. What a cover cannot hide is listed in `DESIGN-NOTES.md` (a caught spy's reports stop; a background check still finds a public defection; a spy posted at a court is still listed in its host's view, question 19 bug 4, not in this round's list). The reviewers found that one cover per character was not enough (a defector's old master and new master both need one); it is now one per court.

7. **Ransoms.** One open demand per captive: a new demand replaces the old one once its word reaches the payer, and until then the old one can still be paid. A demand can be paid only after its rumour has arrived; `pay_ransom` is refused before that, once the payer knows the captive is no longer held, and while a payment is already on its way, and checked again at resolution ("Ransom not sent": "The ransom for Mane could not be sent: Mane is no longer held by Mitanni."). Captive orders now resolve before ransom payments, so the outcome no longer depends on power order. Script captors no longer re-issue an open demand (first half).

11 (captive orders that do nothing). A ransom or turn order for a captive whose kingdom has fallen is refused with the reason: "Mane's kingdom has fallen: nobody is left to pay. Mane remains your captive." A captive dismissed by its king can still be ransomed, by the king who dismissed it.

11 (catastrophe rumours). **No rumour reaches every court without a carrier.** A court that can see the stricken land hears of it the next season as plain news ("News from nearby": "Travellers say the harvest has failed in Hatti."); others learn of it only from their envoys and spies, who already observed catastrophes. No script king read the old rumours. Removing the rumour journeys shifts id numbering, so script games from a seed play out differently than before (replay within version 2 stays exact).

11 (the dismissal edge cases). **Nobody moves on dismissal.** Anyone dismissed while away keeps going and is free when they get there: an envoy on the way out arrives as a free person with no audience and keeps the gold it carried (its king is told); one on the way home still reports and hands over what it carries; a spy watching a court is free at that court, one watching a province walks back to the old court. A held envoy or captive stays held (before, dismissing a captive set it free, and the jailer's release of a dismissed detained envoy did nothing). Human kings can now dismiss a servant who is away.

All with tests that fail without the fix: the implementer checked each of 31 fixes by removing it and running the suite. The test suite is now 405 tests.

## Part F: the simulation kit

Done (commit f21cc7d). Every file-seat request ends with a footer that only file seats get: "When you have written your reply file, your final message must be the single word done. Say nothing about your decision. Earlier reply files cannot be read: your record of earlier seasons is in this request." A model king called through the API sees no such line (tested). `sim/README.md` now states the orchestrator's rule (check only that the reply file exists; never read, act on or pass on a king's final text) and describes the structural fix without building it: a launcher that starts each king itself, waits for the reply file, discards the agent's final message and returns only "reply written" or "no reply". A debrief request, which the orchestrator writes, must end with the same footer.

## Part B: contracts

All built (six commits, then review fixes). The rulebook line, word for word:

> Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term (below their price they refuse, and you are told the price); hire is only for people not in your service.

1. **Notice period.** A content servant still renews itself for 6 seasons at the same wage. One who wants more gives notice when its term has ended and it is at court with no task: "Mane's term has ended. They ask 33 shekels a season to serve on: renew them this season (order renew), or they leave at the start of turn 12 (or, if you send them out first, when they are next at your court)." It serves one more season at its old wage, and the notice wakes a sleeping king. Unrenewed, it leaves at the start of that turn, before wages, and stands free at court asking its price. A servant on notice can still be sent on errands; away at the deadline, it leaves when next at court. A servant abroad under a cover keeps its notice in its master's eyes.
2. **Staggered starting terms.** Each starting envoy's term ends at a turn drawn from 7 to 13 from its own stream, `Rng.For(seed, 0, "start-term", id)`. A test shows every starting character's traits, facts, wage, post, plant status and persona are unchanged for seeds 1, 7 and 42.
3. **The renewal order** (`renew`: person, wage, term). Valid for one's own servant at court, or one on notice wherever it is; it is not a task, so the servant can be renewed and sent out the same season. Settled with hiring, at the end of the season. The price is the price named in the notice, or for an early renewal the renewal formula **or the present wage, whichever is higher** (a reviewer found that an early renewal could otherwise cut a wage of 60 to 9). Below the price: "Mane will not serve on for 20 shekels a season; they ask 33 shekels." Hire naming one's own servant: "Mane is already in your service; to keep them on, order renew." `hire` and `renew` both take a term (1-30; 0 means 6), so model kings can now set a term.
4. **What kings read.** The rulebook line above. Each servant's term in plain words: "serves at 12 a season through turn 10; if content they then renew themselves, otherwise they give a season's notice and name a price"; on notice: "has given notice: asks 33 a season to serve on; leaves at the start of turn 12 unless renewed". Free people at your court show their asking price. The web app has a renew button, a term field, and hire buttons for anyone free at court.

**Script kings.** They answer a notice with a 6-season renewal at the price named when they still want the servant (fewer servants not on notice than their court-size rule wants) and the price passes their existing hiring test; they never renew early. Over 40 script games: 407 notices, 258 renewals, 102 servants who left unrenewed.

**One more bot rule, needed because of Part A's covers.** A defector now stays on its old master's list, paid, until dismissed, and script kings never dismissed anyone. So a script king now dismisses a servant whose line has read "has not returned" for three full seasons, and counts its court one short that season (27 such dismissals in the 40 games). Envoys held by script jailers come home before that.

Deviations: a renewal's term counts from the next season, like a hire's (this season's wage was already paid at the old rate); a servant on notice leaves before that season's wages, so a king pays exactly one season past the term.

## Part C: say every rule the king needs

All built (five commits, then review fixes). The new rulebook section "HOW A SEASON RESOLVES" replaces the old "EACH SEASON" list, in the engine's real order (checked against the runner and the engine); it is quoted in full under "What a king now reads". It says, among the rest:
- orders are checked in the order the reply lists them (units, then letters, then other orders), gold is reserved as each is accepted, so a later order can be refused for lack of gold, and there is no "else";
- a person hired this season enters service at the end of the season and can be sent on an errand from the next;
- two or more bids for one city: its elders accept none; a city taken by troops that season is not sold; a fallback purchase is refused when the gold is already reserved;
- a levy needs a province of your homeland you still hold that is empty after movement;
- `place_spy` needs one of your own people at your court, and a court or a province to watch.

**Refusals and notices use the same words**: "not enough gold: it needs 100 shekels; orders listed before it had reserved 100, and 50 was left"; "Mane was to be hired that season: a person hired enters your service only at the end of the season, and can be sent on an errand from the next season"; "a spy must be one of your own people at your court: you named nobody"; "No army was raised in Thebes: Thebes was not empty after movement. No gold was paid."; "The elders of Gaza would not choose between 2 buyers last season. No gold was paid."

**Every refused or failed order is reported next season with the reason, every time.** A `Failed` helper sends a Rejected notice and wakes a sleeping seat if the order was scheduled. The paths that were silent before now report: a cession of land no longer held or with one's own troops in it, a gift of troops or a disband of a unit that is gone, a botched forgery, a duplicate assay, every payment that could not be made (dispatch, check, watchmen, assay, examination, forgery, ransom, gold sent back), and a declined hire now says why ("they ask 20 shekels", "another court offered more"). The parser no longer drops malformed unit orders or a `place_spy` with nothing to watch in silence; the validator refuses them with the reason. One test plays every reachable failing order (20 paths), as a fresh order and as a sleeping seat's scheduled order.

**Feedback the kings asked for:**
- **Standings**, after the treasury line: "STANDINGS (an estimate from who holds what; treasuries are left out): Mitanni 1.93 (land yield 280, at the start 145); Egypt (you) 1.11 (land yield 210, at the start 190); … Fallen: Assyria." The web standings panel shows the same estimate, and now shows a human seat its own gold and growth by its ledger (it showed true figures, which leaked debased gold).
- **Travel**, computed from the map: "Envoys take 1 or 2 seasons each way between courts (the table in your view gives each court); a spy sent to watch a distant province may take up to 3 seasons to reach it, and its reports as long to come home."

**The rest of the simulation's view table, also done:** each servant away shows when it set out and is due back ("set out in turn 1 for Hatti; due there about turn 3; due back about turn 5", with the same words under a cover); the sight line explains "one link of any kind" and that troops two links away can arrive unseen; the odds and fees of checks, spies, examinations and assays are in the rulebook; the schema describes supporting a city's walls and every greeting flag; audience requests carry the host's land, troops and the season's news. Beyond the scope, the web app gained a Rules tab with the same rulebook, since human seats had none.

Deviations: refusals are read the season after they are given, so they say "that season"; the travel line is computed rather than hard-coded; the spy-odds sentence says a spy watching a free or one's own province is never caught (the engine rolls no catch there).
