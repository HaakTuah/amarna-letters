# Round report: fixes from the simulation, default sleep, and a clearer seat view

Branch `round/simulation-fixes`, from `main` after PR #6, 18 and 19 October 2026. The prompt is `docs/ROUND-PROMPT.md`;
the owner's later instructions for this round are in `docs/ROUND-PROMPT-ADDITIONS.md`, word for word.
The previous round's report, which holds the plans for all 27 Part 3 questions, is now
`docs/rounds/2026-10-18-sleep-and-simulation.md`; "question N" below means that report.

## Summary

All eight parts are built, reviewed and committed. 633 tests pass (198 engine, 435 game). Seeds replay exactly within
save version 2, with sleep on and off. No new agent simulation was run, as the prompt says.

- **A. Bugs that made games read wrong.** Every confirmed defect from the simulation and from the previous round's
  list is fixed: gold named in a first exchange is kept, a purchase lost to conquest is reported and costs nothing,
  battle reports say why each move failed, the false "assurances" line is gone, a master learns of a hidden event
  only when word reaches him, one open ransom demand per captive, coalition tablets read for any name of the foe,
  every power's opening position in the rulebook, an oath-breaker is no friend, a seed per script seat, and the rest.
- **B. Contracts.** A season's notice at term end, starting terms staggered from 7 to 13 seasons, a renewal order,
  one rulebook line, and each servant's term in plain words.
- **C. Every rule the king needs.** A "HOW A SEASON RESOLVES" section in the engine's real order; refusals in the
  same words, and every refused or failed order reported with its reason; a standings line; the travel line fixed.
- **D. Default sleep.** A model or file seat sleeps after every orders call, under a hidden cap of 12 seasons.
  Orders follow their unit, a march survives a bounce, and two standing orders exist. On the seed-7 replay, 87 of
  120 seat-seasons would have woken a king (28% quiet), and 101 orders calls replace 134.
- **E. Memory and the primer.** Notes of up to 2,000 characters, shown three seasons in full under a summary in
  the king's own words; a ledger of dealings, one line per court, carried in full; five echoes in the primer
  (+188 words). Measured section by section: Part E adds about 1,000 tokens to an early orders request, is about
  neutral by turn 10 and saves about 500 by turn 20.
- **F. The simulation kit.** A footer only file seats get, and the orchestrator's rule written down.
- **G. Wages on return and triggers on changes.** People away build up back pay, paid when they are back; a
  temporary wake trigger for troops arriving next to the capital; every trigger fires on a change; word of
  captives and executions travels with envoys and spies.
- **H. An envoy wakes a king for an audience only.** The king reads its realm in brief, answers, may send letters,
  and judges whether to reopen its orders. On the replay, if no king reopened, 58 of 101 orders calls would be saved
  (about 35% of king tokens on the simulation's per-call figures, about 21% of request tokens); if every king
  reopened, none. The reopen rate is counted per king; the next simulation measures it.
- **Benchmarks** were rerun and nothing was tuned. Hatti wins a few more games, Mitanni and Arzawa a few fewer;
  against the frozen baseline the current bots do about as before.

For the owner to decide (details in the parts): whether the reopen choice should be made at the orders call's effort
level rather than one lower; if the message-kind fallback is ever built, whether to narrow its "news of war" class;
whether to rename one of the two "ledgers" a king reads; and that the per-call figures of 37.5k and 16k tokens are
what the file-seat agents used, not the size of the request (about 14k and 11k now), which changes how savings read.

Where to look: "What a king now reads" quotes the rulebook and the view as they are now, and "Left out or changed
from the prompt, and why" collects every deviation in one list.

## Usage

This round's work ran out the weekly usage limit once, on 18 October, in the middle of Parts G and E. Work resumed on
19 October from a stock-take (`docs/BUILD-PROGRESS.md`) and from then on followed the design document's Build order,
whose rules ask for one reviewer per part and no extra analyst workflows. On resuming, two duplicate writers ran for a
few minutes and were stopped; nothing was lost.

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
- **Notes.** In the simulation the kings' notes had a median of about 1,990 characters (134 orders replies; 107 longer
  than 1,500), so the prompt's example cap of 1,500 would have cut most of them. Each season's notes are kept up to
  2,000 characters, and the king is told the limit.

(Readings taken in later parts are given in each part. Every deviation is collected in "Left out or changed from the
prompt, and why" at the end.)

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

That is the line as Part B wrote it. Part G later extended it (a servant still owed back pay gives notice too, and a
renewal is never below the present wage); the current line is under "What a king now reads".

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

## Part D: default sleep

All built, in two halves, each reviewed by three adversarial reviewers (engine, the king's text, hidden information and cost) and fixed. Parts G and H later change the wake list and what an envoy does; the final text a king reads is quoted under "What a king now reads".

1. **Sleep after every orders call.** `SleepingSeats` is on by default (the batch runner's `--sleep off` and the web checkbox still switch it off, so every-season play can be compared). After every set of orders a model or file seat sleeps until something wakes it or the cap is reached; its scheduled orders run in between. It may name a season to be woken (`wake_in_turn`), and is told that a named season lapses if something wakes it first (it names it again with its next orders). A seat whose model call failed, and for which the script stand-in played, is not put to sleep: it is asked again the next season, with the reasons it was woken carried over.
2. **The hidden cap** is 12 seasons (`MaxSleep`, still `--sleep-cap N`), absent from the rulebook, the schema and the view; when it fires the reason reads "your counsellors woke you after a long sleep". A king that reaches it can count the seasons it slept; that is recorded in DESIGN-NOTES. Scheduled orders have no horizon tied to the cap: any later season, at most 24 orders a season and 40 seasons. A first version dropped orders scheduled past the game's hard end (`MaxTurns`) in silence; a reviewer showed the missing entries would reveal the hard end, so they are now kept and listed like any other.
3. **Orders follow their unit.** In a schedule or a standing order the king names each of its units by the province it stands in now; the engine binds the order to that unit (and to its own unit named as the one supported or the army convoyed) and gives it from wherever the unit then stands. An order naming a province where the king has no unit is refused when given. Orders for a unit that is lost are dropped, and the king is told and woken. **A march survives a bounce:** a scheduled move that is stopped is tried again the next season, and the unit's later scheduled orders each wait a season ("A march is held up"); a second failure in a row, or a move the validator refuses, ends the march and drops the unit's remaining orders ("A march ends").
4. **Standing orders**, at most 12, kept until they fire or are cancelled (`cancel_standing`, by id or "all"): `unit_enters` (a unit of the named power, or any foreign unit, seen moving into a province) and `unit_attacked` (a foreign move into the province where one of the king's units stands, the unit still there afterwards). They fire once, the season after the event, before the scheduled orders; orders given that season override them, and they override scheduled orders. Firing does not wake the king (it reads it in its news and the digest); a fired order that fails does. Not shrunk to steps 1-3: the whole of item 4 was built.
5. **The wake list** (as Part D left it, before Parts G and H): an envoy waiting; foreign troops entering its land; land lost; troops lost (destroyed, deserted, killed by plague); a scheduled or standing order refused or failed (a stopped move and a cut support included); a ransom demand; a servant's notice; its own triggers; the season it named; the cap; its kingdom falling. Everything else goes to a digest that is bounded (60 brief lines, 40 news items, with counts of what was left out) and shown when it wakes ("WHILE YOU SLEPT", in brief and then in full; routine treasury notices left out). The batch seat report shows the length of each sleep and groups the wake reasons by kind.
6. **What the kings are told.** The decided paragraph sits right after HOW YOU WIN ("YOU SLEEP BETWEEN YOUR ORDERS"), followed by "PLANNING AHEAD (how sleeping works)" with the mechanics; both are quoted in full under "What a king now reads". One wording change from the prompt: "a failed order" became "a scheduled or standing order that failed", because orders given for the season at hand that fail are read in the next news, not woken for. Every orders and audience request opens with the sleep line ("You slept 3 seasons (you last gave orders in turn 5). You were woken because: …"; "You gave orders last season (turn 5)…" when no whole season was slept; "This is your first season."). Audience requests after a sleep also carry the "while you slept" account.

**Cost noted by the reviewers.** With sleep on, the orders schema grew to about 11,000 characters (compact) because `schedule` and `standing_orders` repeat the unit and other-order shapes; sharing them through `$defs` was not tried, since whether the API's structured output accepts internal references could not be checked without a live call. The file seat now prints the schema more compactly (one line per field). The request-size section below measures the whole request.

**Deviations.** A move refused by the validator ends a march rather than being retried (the brief said retry "refused or bounced"; retrying a refused move cannot succeed). Orders refused when given (no unit there, a limit passed, an unreadable order) wake the king next season, as "a scheduled order refused". There is no web UI for scheduled or standing orders, since human seats never sleep.

### Wake-ups under the new triggers: both seed-7 games replayed

Both recorded games were replayed exactly on the old code (`main` before this round; the final states match `game-7.final.json` byte for byte), and for every king and every season I asked whether a king that slept after every orders call would have been woken there. The harness first reproduced the old analysts' numbers with the old engine's own wake check (56 of 58 and 61 of 62 seat-seasons woken, seasons 2-10 of living seats), so the method is the same.

| | Run 1 (sleep on) | Run 2 (sleep off) | Both |
|---|---|---|---|
| Seat-seasons (seasons 2-10, living seats) | 58 | 62 | 120 |
| Old triggers: woken | 56 (3% quiet) | 61 (2% quiet) | 117 |
| **New triggers: woken** | **43 (26% quiet)** | **44 (29% quiet)** | **87 (28% quiet)** |
| Orders calls, season 1 included: as played / new triggers | 65 / 50 | 69 / 51 | 134 / 101 |
| Longest sleep | 3 | 3 | |
| With Part G's capital trigger added: woken | 43 | 44 | 87 (unchanged) |
| Variant, an envoy waiting does not wake the host (capital trigger included): woken | 18 (69% quiet) | 11 (82% quiet) | 29 |

Seasons each seat would have slept under the new triggers (season 1 is always an orders call):

| Seat | Run 1: called / slept | Run 2: called / slept |
|---|---|---|
| Egypt | 8 / 2 | 10 / 0 |
| Hatti | 9 / 1 | 6 / 3 (fell after season 9) |
| Babylonia | 6 / 4 | 7 / 3 |
| Mitanni | 8 / 2 | 9 / 1 |
| Assyria | 5 / 0 (fell after season 5) | 7 / 3 |
| Arzawa | 6 / 4 | 6 / 4 |
| Alashiya | 8 / 2 | 6 / 4 |
| **All** | **50 / 15** | **51 / 18** |

What woke the kings, over both runs (seat-seasons in which each reason fired; in brackets, where it was the only reason):

| Reason | Fired |
|---|---|
| An envoy waits to be received | 75 (61) |
| Land lost | 22 (0) |
| Foreign troops entered its land | 22 (0), always with land lost |
| Troops lost (destroyed 11, desertion 1, plague 2) | 14 (2) |
| A servant gives notice (with the staggered terms) | 1 (1) |
| Ransom demanded | 0 |
| Foreign troops ended a move next to the capital (Part G) | 12 (0); alone only in the variant (3) |

- **Sleeping now saves something: about a quarter of the orders calls** in these games (33 of 134), against none before. At the measured 37-38k tokens an orders call, that is about 0.55M and 0.68M king tokens, 16-18% of each run.
- **An envoy waiting is almost the whole remaining load**: it fired in 75 of the 87 wakes and was the only reason in 61. Letters go out in odd seasons and are heard in even ones, so most courts are woken every other season, and Egypt, the most visited court, nearly every season. If an audience did not wake the host (it is answered in its own call), three quarters of seat-seasons would be quiet, and four kings (Egypt, Babylonia and Arzawa in run 1, Egypt in run 2) would have given orders once in season 1 and slept through the war. That is the user's call; this round keeps the prompt's rule (an envoy waiting wakes the host).
- **Foreign troops entering its land always came with land lost**: under today's rules a province changes hands as soon as a foreign unit stands in it after the moves.
- **Caveats.** These are the games as played: the kings were called every season and sent envoys nearly every season. A king that really slept would send fewer envoys, so there would be fewer audiences elsewhere, and the quiet share would be higher. The wars would also go differently: a sleeping king is woken only once it has lost land or troops. Scheduled and standing orders, the kings' own triggers and a named wake season are not modelled (the games had one sleep request between them). The cap of 12 cannot fire within 10 seasons.

The harness and its full output (per-season grids and every wake event) are in the session scratchpad, not in the repository (`analysis/wake-replay.md`).

## Part E: memory and the primer

Built in a side worktree (`round/simulation-fixes-memory`) while Part G was under way, then cherry-picked onto the
branch after Part G: `1217987` (notes and summary), `b669f9e` (the ledger), `fa95a79` (the primer), `ddbfb27` (the
ledger written at an audience too), `c3169d3` (DESIGN-NOTES: a king's envoys speak and commit for it with minds of
their own), and `b07b3bc`, which reconciles DESIGN-NOTES with Part G. No code conflicted. One reviewer; nothing
blocking.

1. **Notes.** Each season's notes are kept up to 2,000 characters; longer notes are cut, and the schema says so.
   The simulation's kings wrote a median of about 1,990 characters (134 orders replies: 107 over 1,500, 65 over
   2,000, the longest 3,380), so the prompt's example of 1,500 would have cut most of them. The notes, audiences and
   orders of the last three seasons the king gave orders in are shown in full. Older notes then leave the record,
   and the request warns one season ahead: "Your notes from turn 7 leave this record after this season; keep what
   you need in your summary." Before, the last five seasons' notes were shown uncapped and the eight before them
   cut to 300 characters. So the cap is also a cut for the latest notes, and a king that writes no summary now
   forgets sooner. The next simulation (Build order item 4) should count how often kings write one.
2. **The king's own summary.** Older notes are summarised by the king itself, in its own reply, as decided: a
   `summary` field of up to 2,000 characters replaces the previous one, and an empty one keeps it. It stands above
   the three seasons in full ("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 6): …").
3. **The ledger of dealings.** One line per court, in the king's own words: what was promised, sealed, broken and
   paid. The `ledger` field is a list of court and entry (up to 600 characters each); an entry replaces that court's
   line, an empty entry removes it, and courts left out keep theirs. It is carried in full, first in the record, in
   every orders and audience request, and never leaves. The king may write it in an orders reply or in an audience
   reply, since audiences are where tablets are sealed and gifts given, and since Part H most wakes are audiences.
   Ledger lines written at an audience stay in the seat's own record: the reply the engine applies and the envoy
   reads carries none of them (tested). The owner's term was "ledger of promises"; the king reads "ledger of
   dealings". The view also says "by your ledger" of the treasury's books; the context separates the two, and
   renaming one is left to the owner, since both are pinned by exact-text tests.
4. **Primer.** Five echoes from the archive, in our own wording: rank in the greeting (the Great Kings line,
   rewritten), precedent as a floor (with a successor's broken promise as the same argument from the other side),
   detention answers detention, a messenger's word is not a tablet, and proof needs a witness who knows. The primer
   grew from 298 to 486 words, +188, under the 250 allowed. The lines are quoted under "What a king now reads".
5. Rule text, schema, the web app's Rules tab and DESIGN-NOTES changed in the same commits. Tests: `LeaderMemoryTests`
   (10), file-seat and model-layer tests for the summary, ledger and echoes, and a replay test with summary and
   ledger logged. The save version stays 2: `Summary` and `Ledger` are logged with the orders, and the engine ignores
   them.

### Request size, section by section

**Method.** Both seed-7 games were replayed exactly on the simulation's code, and the state saved at every season's
audiences and orders. All 134 orders requests and all 146 audience requests were then rebuilt on those states by two
builds: before Part E (`470daa0`, Parts A-D) and after it (Part E's head). Each king's record was rebuilt from its
logged notes, orders and audience replies through each version's own journal code; the rebuilt old journal matches
the real requests byte for byte. The simulation's kings wrote no summary or ledger, so "after" comes in three
variants: (a) none written; **(b) realistic**: a 1,800-character summary from the king's fourth orders on, and a
350-character ledger line for each court it has dealt with; (c) the summary and all six ledger lines at their caps
from the first season. Every character of every request is counted in exactly one section. Tokens are characters
divided by 3.6, since no tokenizer was at hand: expect 10-15% error in absolute numbers, the same before and after.
Quiet and busy are the seats with the smallest and largest view, letters and digest; early is turn 3, late turns 9-10.

Orders requests, run 1 (sleep on), as a file seat reads them; tokens before Part E → after (b):

| Section | Early, quiet (Babylonia, t3) | Early, busy (Egypt, t3) | Late, quiet (Babylonia, t10) | Late, busy (Egypt, t9) |
|---|---|---|---|---|
| Rulebook and primer | 5,232 → 5,642 | 5,232 → 5,642 | 5,232 → 5,642 | 5,232 → 5,642 |
| of which the primer | 483 → 764 | 483 → 764 | 483 → 764 | 483 → 764 |
| of which HOW TO ANSWER | 135 → 264 | 135 → 264 | 135 → 264 | 135 → 264 |
| Map and opening positions | 1,670 | 1,670 | 1,670 | 1,670 |
| Schema, as printed | 3,751 → 4,059 | 3,751 → 4,059 | 3,751 → 4,059 | 3,751 → 4,059 |
| Identity | 40 | 38 | 40 | 38 |
| The season's view | 848 | 1,024 | 988 | 1,091 |
| Journal | 788 → 1,137 | 1,048 → 1,294 | 3,491 → 2,931 | 3,386 → 2,880 |
| of which the ledger | 0 → 347 | 0 → 245 | 0 → 552 | 0 → 656 |
| of which the summary | 0 | 0 | 0 → 516 | 0 → 516 |
| of which notes | 652 | 925 | 3,160 → 1,634 | 3,229 → 1,564 |
| Letters and audience history | 546 | 1,533 | 805 → 668 | 2,790 → 2,648 |
| Digest (sleep line, while you slept) | 11 | 29 | 11 | 29 |
| File-seat framing | 217 | 215 | 218 | 215 |
| **Total, file seat** | **13,103 → 14,170 (+1,067)** | **14,541 → 15,505 (+964)** | **16,205 → 16,226 (+21)** | **18,202 → 18,272 (+70)** |
| Total, API king (no framing, compact schema) | 12,209 → 13,245 | 13,649 → 14,583 | 15,311 → 15,301 | 17,310 → 17,349 |
| After, variants (a) / (c), file seat | 13,868 / 15,468 | 15,306 / 16,907 | 15,236 / 16,803 | 17,177 / 18,746 |
| As the simulation's king read it | 9,371 | 10,764 | 12,463 | 14,432 |

Orders requests, run 2 (sleep off), file seat; before → after (b):

| Section | Early, quiet (Arzawa, t3) | Early, busy (Mitanni, t3) | Late, quiet (Alashiya, t10) | Late, busy (Mitanni, t9) |
|---|---|---|---|---|
| Rulebook and primer | 4,095 → 4,505 | 4,095 → 4,505 | 4,095 → 4,505 | 4,095 → 4,505 |
| Map and opening positions | 1,670 | 1,670 | 1,670 | 1,670 |
| Schema, as printed | 1,460 → 1,769 | 1,460 → 1,769 | 1,460 → 1,769 | 1,460 → 1,769 |
| Identity | 31 | 36 | 34 | 36 |
| The season's view | 926 | 1,156 | 791 | 1,124 |
| Journal | 639 → 884 | 888 → 1,339 | 3,272 → 2,644 | 3,899 → 2,938 |
| Letters and audience history | 412 | 1,840 | 366 → 230 | 4,760 → 4,489 |
| Digest | 0 | 0 | 0 | 0 |
| File-seat framing | 203 | 204 | 205 | 204 |
| **Total, file seat** | **9,437 → 10,400 (+963)** | **11,349 → 12,518 (+1,169)** | **11,894 → 11,847 (−47)** | **17,248 → 16,735 (−513)** |
| Total, API king | 9,040 → 9,973 | 10,952 → 12,091 | 11,496 → 11,418 | 16,851 → 16,307 |
| After, variants (a) / (c), file seat | 10,202 / 11,802 | 12,114 / 13,714 | 11,062 / 12,630 | 15,744 / 17,312 |
| As the simulation's king read it | 6,991 | 8,918 | 9,449 | 14,777 |

Audience requests (all 146 calls, rebuilt round by round), file seat; before → after (b):

| Section | Early (turns 2-4, 60 calls) | Late (turns 8-10, 42 calls) | All 146 |
|---|---|---|---|
| Rulebook and primer | 4,626 → 5,036 | 4,528 → 4,938 | 4,594 → 5,003 |
| Map and opening positions | 1,670 | 1,670 | 1,670 |
| Schema, as printed | 374 → 590 | 374 → 590 | 374 → 590 |
| Identity | 37 | 37 | 37 |
| The season's view | 305 | 290 | 291 |
| Journal | 676 → 957 | 1,800 → 2,142 | 1,233 → 1,646 |
| Letters and audience history | 540 | 1,077 | 817 |
| Digest | 13 | 11 | 13 |
| File-seat framing | 178 | 178 | 178 |
| **Total, file seat** | **8,419 → 9,326 (+907)** | **9,967 → 10,934 (+967)** | **9,207 → 10,244 (+1,037)** |
| Total, API king | 8,220 → 9,098 | 9,768 → 10,706 | 9,008 → 10,017 |
| As the simulation's king read it | 5,312 | 6,774 | 6,032 |

Means over every request, file seat, tokens:

| | Simulation | Before E | After (a) | After (b) | After (c) |
|---|---|---|---|---|---|
| Orders request (134) | 10,265 | 13,351 | 13,374 | 13,994 | 14,789 |
| of which the journal and its audience lines | 2,220 | 2,220 | 1,526 | 2,145 | 2,940 |
| Audience request (146) | 6,032 | 9,207 | 9,575 | 10,244 | 11,157 |

**The journal at turn 20** (a projection, not a measurement: each seat's real seasons repeated to fill seasons 1-19),
tokens of journal and journal audience lines:

| Request | Before E | After (a) | After (b) | After (c) |
|---|---|---|---|---|
| Orders, turn 20 | 4,251 | 2,089 | 3,053 | 3,660 |
| Audience, turn 20 | 1,956 | 1,175 | 2,140 | 2,747 |
| Orders, measured at turn 10 | 4,053 | 2,159 | 3,116 | 3,727 |

The new journal becomes smaller than the old one at about turn 7.

**A king woken after three seasons asleep** (synthetic, run 1, turns 5-10, 37 requests; the brief digest lines cannot be
rebuilt): before E 18,295 tokens; after (a) 18,662; after (b) 19,227; the same seats called every season, (b),
16,800. "WHILE YOU SLEPT" alone is 3,377 tokens, of which envoy reports and audiences 2,816.

**Net result.**
- Fixed cost per orders request: primer +281 tokens, HOW TO ANSWER +129, schema +308 as printed (+278 compact):
  about +720 for a file seat, +690 for an API king. Per audience request about +630 (+410 rulebook, +216 schema,
  all of it the audience's ledger field).
- The journal: +250 to +450 early, −500 to −960 at turns 9-10, about −1,200 at turn 20.
- Net per orders request: +960 to +1,170 tokens early (7-10%); −510 to +70 late; over both ten-season games +643
  on average (+4.8%) with variant (b), +23 with (a), +1,438 with (c); at turn 20 about 480 fewer than before.
  Net per audience request +1,037 (+11%).
- Parts A-D had already added about 3,100 tokens per orders request and 3,200 per audience (the rulebook's new
  sections, the sleep fields of the schema, the opening positions and the richer view).

**Since this measurement.** Part G added about 440 tokens to the rulebook (back pay, the capital trigger, triggers on
changes, word of losses) and Part H about 230 more, plus about 1,400 to each audience held while the king's orders
stand (measured under Part H). As the code stands now, the rulebook with primer, map and opening positions is 28,797
characters with sleep on (about 8,000 tokens) and 23,384 with sleep off; the orders schema is 12,134 characters
compact; the audience schema 1,945, or 4,650 at an audience held asleep. So the next simulation's requests will be
about 14.5k-15k tokens for orders, 11k for an ordinary audience and 12k-12.5k for an audience held asleep, before
the agent's own overhead, against about 10k and 6k in the first simulation.

### Set against the 37k and 16k per call

The per-call figures used so far (37.5k tokens an orders call and 16k an audience, from the previous report's usage
table, and the design document's "about 26k to over 60k, almost all of it journal and letters") are what the
file-seat agents used per call, not the size of the request. The request files the simulation's kings read were
about 6k-8k tokens in season 1 and 11.5k-13.5k by seasons 9-10 for orders (means per season), and about 6k for
audiences; the journal grew by about 3.5k tokens over ten seasons. So two thirds to three quarters of each call's usage (orders: a mean request of
10.3k tokens against 37.5k used; audiences: 6k against 16k) was the agent's own overhead: its system prompt and tools,
and most likely each tool round trip re-sending what it had read so far. Both figures are
right for their seat. A file seat (an agent in a Claude Code session) pays that overhead on every call. A model king
called through the API pays only its request, and its rulebook and map (about 8k tokens) are cached at a tenth of the
price after the first call. Three consequences:
- The savings below are shares of the request (an API king's input), not of the 37.5k agent figure.
- "Mostly the journal" should read "mostly the agent's overhead; the journal adds about 3.5k tokens over ten
  seasons". The design document's call-size paragraph and the setup screen's cost estimate (`CostEstimate`, which
  still assumes a 5,000-token cached rulebook and 5,000 fresh tokens an orders call) need restating; both belong to
  Build order item 6.
- Part H's saving, worked out on the 37.5k/16k ratio, is smaller for API kings: an orders request (about 14k) is
  only a fifth to a third larger than an audience (10.7k-11.9k). If no court reopened, it would save about 21% of
  request tokens, against about 35% on the agent figures (see Part H).

### Next-round candidates, not built, with estimated savings

Baseline: after Part E, variant (b). An orders request averages 13,994 tokens (15,163 late, turns 8-10), a king woken
after three seasons asleep 19,227, an audience 10,244. Savings are shares of the request.

| Candidate | What it saves | Estimate |
|---|---|---|
| **Older letters summarised to one line each**, the ledger of promises keeping what matters; the full text kept in the season a letter arrives | Late, a king holds 3.8 tablets of about 87 tokens each, shown in full every season (390 tokens), and its journal's audience lines take 182; after a sleep, "WHILE YOU SLEPT" carries 2,816 tokens of letters | About 270 tokens on average and 400-450 late (2-3%) for a king called every season; about 2,900 per wake after three seasons asleep (15%). Grows with Part H, since every audience held since the last orders call reaches the next orders request. Risk: an old tablet's exact words matter when it is shown as evidence |
| **The journal folding older notes into the summary sooner** (the basic form is built) | Fewer seasons in full | One season in full instead of three: about 1,330 tokens late (9%); two seasons: about 650 (4%). The king must then rewrite its summary every season; merging notes and summary into one rolling memory keeps its output what it writes today. Risk: detail lost in rewriting |
| **A "since you last acted" view** | Late, 667 of the view's 1,211 tokens repeat the previous request; the king does not remember them, so they can be shortened, not dropped | About 200-330 tokens (1.5-2%); after a sleep, one account of what changed instead of each slept season's news saves about 300 beyond the first candidate, about 3,200 per wake after three seasons together (17%) |
| **Terser state tables** | Lands, people and travel written tersely: early 837 → 646 tokens, late 1,211 → 1,033 | About 180 tokens (1.3%); a terse map (1,670 tokens, fixed) saves about 550 more for a file seat (3.6%), little for an API king, whose map is cached |
| **Ordering the request so the stable part is cached** (API kings) | Rulebook, primer and map (7,312 tokens with sleep on at the time, 6,175 off) are already the cached system block; identity, ledger, summary and older tablets (up to about 1,450 tokens late) could go ahead of the view under a second cache mark | Up to 1,300 token-equivalents a call (9%), about 500 realistically (3-4%), since a king that rewrites its ledger or summary pays a cache write. Check first: the seven orders calls of a season are sent at once, and if the cache is cold all seven write the rulebook (1.25 times the price each) instead of one writing and six reading (0.1 times). Sending one call first would save about 7,000 token-equivalents an orders call in such a season. Any API game's log shows whether this happens |
| **Sharing the schema's repeated shapes** (`$defs`; an extra candidate) | With sleep on, `schedule` (3,036 characters) and `standing_orders` (1,944) repeat the unit and other-order shapes | About 850 tokens for an API king and 1,200 for a file seat (6-8%), if strict structured output accepts references |

Together, the first four and the last would take about a fifth off a late orders request (about 3,300 of 15,200
tokens) and about a third off a request after three seasons asleep (about 6,300 of 19,200). Caching comes on top for
API kings. Build order item 6 chooses among them.

### One mind per seat, and where another model decides for a seat

The owner's principle (additions, section 6.3): small models may only sort or condense; the seat's own model makes
every decision. It is recorded in DESIGN-NOTES ("One mind per seat"). The king's summary and ledger are written in
its own reply by its own model. Where a seat's decision is made by something else today:

1. **A failed orders call** (an exception, or a reply unreadable twice): the script king plays that season as a
   shadow that has read every view of the seat. Marked `FromFallback` and logged as an error. The seat is asked
   again the next season.
2. **A failed audience call**: the script king answers the envoy. Since Part H's review fix, at a court held asleep
   its reply decides nothing for the seat: no letters, no choice to sleep on; the king is woken for orders the same
   season ("your counsellors answered an envoy in your place").
3. **A refused call on Sonnet and Opus seats** (`fallbacks: default`): the API's server-side fallback lets another
   model answer a refused orders or audience call. Logged as `UsedFallback`.
4. **The same model at a lower effort:** every audience, including one held while the orders stand and the choice
   to reopen them, runs one effort level below the orders call (high → medium, otherwise low). It is not another
   model, but the reopen choice is a planning decision, so whether it should run at the orders call's effort is left
   to the owner.
5. **By design, people who act for the seat:** envoys are characters (script, Haiku or Sonnet). The host hears the
   envoy's rendering of the king's message in the envoy's own words; the envoy may skim gold, commit its king
   (`commitments`, logged in the message trail), take a gift or another king's service. Spies write their own
   reports. DESIGN-NOTES now says so.
6. **Not another mind:** scheduled and standing orders run by the engine are the seat's own earlier decisions;
   narrator texts (personas, background checks, chronicles) decide nothing; each character condenses its own memory
   with its own model. A resumed game's model king is the same model without its record (memory lost, not replaced).

Not built: Part H's message-kind fallback would only offer the reopen, never make the choice; a minister receiving
routine envoys by standing instructions would be the clearest future case of another mind deciding for a seat; envoy
authority to seal within a mandate (Build order item 9); a cheaper summariser (below).

### How a cheaper summariser could be measured

1. **Material.** The next agent simulation (Build order item 4) logs every orders reply, so each summary a king wrote
   is there, with exactly what it had in front of it: its previous summary, the notes about to leave, the last three
   seasons and the ledger.
2. **The cheap summary.** For each summary a king wrote, ask Haiku for one from the same material, under the same
   cap, told to condense only.
3. **Saving.** The king's summary costs only its output tokens (about 500 a rewrite) inside a call it makes anyway.
   The cheap one costs an extra call (about 2k-3k tokens in, 500 out) at the cheaper price. Compare per game at list
   prices; the saving may well be negative.
4. **Loss of quality**, three ways: *recall*, the facts in the notes that left (promises, amounts, seasons, names,
   suspicions, plans), found by a judge model and plain matching of numbers and names, and how many each summary
   keeps, weighting those the king later relied on; *decision agreement*, the king's next orders and audience calls
   rerun with the cheap summary swapped in, several samples each, against the noise of resampling with its own
   summary; *consistency*, contradictions with the king's ledger and with tablets it sealed, the exploitable failure
   the one-mind principle warns about.
5. **Rule.** Adopt only if all three stay within the noise and the saving is material.

## Part G: wages on return, a trigger next to the capital, triggers on changes, news of losses abroad

The owner's later instructions (additions, sections 1, 3, 4 and 6). Four pieces, each in its own commits with tests,
rulebook text and DESIGN-NOTES: `f1a6a18` and `9fa3f26` (G1), `f03986e` (G2), `b3c492e` (G3), `49a7d5e` (G4). One
reviewer; nothing blocking. The suite went from 589 to 601 tests. The log format did not change, so the save version
stays 2.

### G1: wages are paid on return

- **Back pay.** A servant at its master's court with no task is paid its wage each season, as before. One away (on a
  mission, posted as a spy, detained, or captive with its contract kept) is not paid: its wage builds up as back pay,
  kept per court, and no gold leaves the treasury. Right after the season's arrivals, anyone standing at a court that
  owes it back pay, and not held there, is paid from that court's true treasury as far as it holds. Its master reads
  "Mane is back at your court and was paid 48 shekels of back pay."
- **A shortfall** stays owed and counts as missed pay (loyalty, a memory, the unpaid count, once a season), and turns
  the servant's next term end into a notice: "… is owed 48 shekels of back pay, but the treasury could pay only 20
  shekels: the other 28 shekels stays owed, and counts as missed pay."
- **Whoever never comes back is never paid.** A servant going over to a host forfeits what its old court owed it;
  death clears it; a captive keeps it, since it may be ransomed or let go. When a kingdom falls, everything it owed is
  lost. This replaces Part A's rule that kept paying a covered servant until word of its fate arrived: a cover now
  keeps a believed back pay instead, so the treasury reveals nothing about a servant's fate (a test plays the same
  state with and without a hidden event and compares treasury, ledger, wages, back pay and strength).
- **Strength counts gold minus back pay owed**, through one function, `Scoring.Strength`, used by the engine's
  score, the seat's own strength line and the script kings. The seat sees back pay as it believes it. Back pay still
  owed to someone it dismissed while away, who has not come back, counts in the score but is not shown, since seeing
  it vanish would tell of a death; so the score and the seat's strength line can differ by that amount.
- **What the king reads:** one rulebook line (quoted under "What a king now reads"), steps 2-4 of HOW A SEASON
  RESOLVES, the treasury line ("wages 27 a season (paid to your people at court; for those away they build up as back
  pay). Back pay owed to your people: 109, paid when they are back at your court. Strength 3994 by your ledger (back
  pay owed counted against it)") and each servant's "owed: 39 shekels of back pay".
- **A motive, not a rule.** Script envoys weigh back pay against a host's offer of service: going over forfeits it,
  so the offer must also make it up over six seasons (tempted at 1.5 × wage + back pay ÷ 6, drawn at wage + back pay ÷
  6), unless their lord looks doomed by public facts (fallen, capital lost, or under half his homeland held), when it
  counts for nothing. A model character reads "Your lord owes you 45 shekels of back pay, paid when you return to his
  court." and, facing an offer, "(your lord pays you 12, and owes you 45 shekels of back pay, which you would never be
  paid if you left his service)", and judges for itself. No new character decision was added. Script kings count back
  pay owed as gold already spent.

**The dismissal rule: kept.** A script king dismisses a servant whose line has read "has not returned" for three
seasons (Part B). The owner asked whether it still serves a purpose once an absent servant costs nothing. It does. The
servant still fills a place at court, so without the rule the king would never hire a replacement. And the back pay
the king believes it owes keeps growing in its books, where it counts against its strength and, as gold already spent,
against what it may spend. Dismissing ends both. It is also the only way a script king stops counting an envoy that
went over to its host, whose cover never ends otherwise. Back pay already owed is still paid if the servant ever
comes back.

### G2: troops arriving next to the capital

Foreign troops (an army or a fleet) that end a move in a province next to the seat's capital (one link of any kind),
seen by the seat, while it still holds its capital, wake it the next season: "foreign troops came next to your
capital: Hatti's army moved isuwa -> sapinuwa". Only the arrival wakes it (G3's rule): troops that stay, a failed move,
the seat's own troops and any move once the capital is lost do not. DESIGN-NOTES marks it temporary, to be revisited
with the siege package (Build order item 5 retires it). The rulebook says so in the sleep paragraph and in PLANNING
AHEAD. In the seed-7 replay it fired in 12 seat-seasons, never alone, so the wake counts stay at 87; in the variant
where an envoy does not wake the host it was the only reason in 3 (see the table under Part D). Under Part H it is an
order trigger: it reopens orders directly.

### G3: every trigger fires on a change

The owner's rule (additions, section 3): a trigger fires on a change, not on a standing condition; and "treasury below
X" must be able to fire again after the treasury has risen above X and fallen back (section 4). Three triggers fired on
a standing condition and were changed; all are the king's own (`wake_on`):

| Trigger | Before | Now |
|---|---|---|
| `envoy_returns` | Fired whenever the named person was at court with no errand: one who stayed at court woke the king every season the trigger was set | Fires only once the king has seen the person away since setting it, and the person is back. A person sent out with the same orders wakes the king the season it returns; one who stays at court never does |
| `treasury_below` | Fired whenever the treasury was below the amount, so a king already below it was woken every season | Armed once the king has seen the treasury at or above the amount since setting it (when set, then at each wake check); fires when it is below and armed. Set anew with each set of orders, so it can fire again after every rise and fall |
| `troops_enter` | Fired whenever foreign troops stood in the province within sight | Fires when such troops moved into the province last season and got there, as the king saw the move. Troops already there, a failed move, the king's own troops and another power's do not. The reason reads "Assyria's troops enter ekallatum" |

Unchanged, because they already fired on a change: `unit_moves` (against the occupant seen when it was set) and
`province_changes_hands` (against the owner then). The engine's own reasons are events already: an envoy waiting
(audiences are created only on arrival), foreign troops entering the seat's land and arriving next to its capital
(per move), units destroyed, land lost, plague and desertion, a notice (once per term end), a ransom demand (each new
demand's rumour), failed orders, the named season, the cap and the fall. The armed state lives in the existing
`WakeTrigger.Seen` field, so the log did not change. The rulebook's line and the schema's description are quoted under
"What a king now reads". It changes no replay number: the replay models no king's own triggers.

Left as found, from the review (minor; recorded here, not fixed):
- `troops_enter`, like the capital trigger, counts only moves the king could see (from or into a province in sight),
  but its rulebook line does not say "where you can see it".
- `unit_moves` set on a province out of sight fires the first season that province comes into sight.
- `envoy_returns` set on a person hired in the same orders is armed at once (the hire is settled later that season),
  so the king is woken the next season although the person never left; its wake reason names the person by id
  ("c12 is back at court").
- A foreign levy raised in a watched province, or next to the capital, wakes nobody, since levies are not moves.
  Noted in DESIGN-NOTES for the siege package.

### G4: word of losses abroad reaches other courts

The owner asked (additions, section 6.1) that losses abroad (capture, execution, death) can become rumours that reach
other courts, without building the reputation check. Before: an execution's rumour reached only the dead servant's own
king (and a court that still believed it served there); a spy's capture was known only to its captor until the ransom
demand or the overdue word; detained envoys were already noticed by fellow envoys and spies at the same court.
Executions are the game's only deaths.

**Built.** The engine records each spy caught and each captive put to death: the season, the court, the servant, and
whom it served as that court knows it (known only if the spy confessed). Carriers at that court hear of them, from a
random stream of their own, so nothing else a carrier notices changes:
- an envoy received there hears of each captive the court still holds with a chance of skill/100, and of each
  execution in the 3 seasons after it with a chance of 0.4 + skill/200 (it observes at its audience, before that
  season's captive orders, so not in the season of the death);
- a spy posted there hears of captives with a chance of skill/100, and always of executions, in the season of the
  death and the 3 after.

The lines join the carrier's report: "Assyria holds Mane, a spy of Babylonia, captive (caught in turn 4)."; "Assyria
put Mane, a spy of Babylonia, to death in turn 6."; for a spy that never said whom it served, "a spy who will not say
whom they serve" while held and "a spy who would not say whom they served" once dead. A captive no longer held is not
talked of, so a turned spy is not given away. A court with nobody there hears nothing. A carrier's word does not end
its own master's cover. Nothing reads these lines yet, so script games are unchanged (seeds 1-10 identical).

**What script characters would need to weigh such rumours** (not built):
1. **Hearing the news themselves.** Today it reaches only kings, in their envoys' and spies' reports, and characters
   remember only what happened to them. Carriers would remember what they heard, and servants and free people at a
   court would hear the reports and rumours that arrive there. Each character keeps its own record of the losses it
   has heard, with season and source, so knowledge spreads only by carriers; the engine's record of losses is the
   truth to point at.
2. **Two reputations from one loss**, kept per court and fading with time: the master's (a court whose people are
   caught or die abroad is a dangerous employer) and the host's (a court that catches and executes others' people is
   a dangerous, cruel host).
3. **Weights by kind:** an execution heavier than a capture, a detention lighter. A captive whose master paid the
   ransom should count in the master's favour, which needs word of a ransom paid or a release to travel too; today
   only payer and captor know it.
4. **The decisions it would touch**, all existing (no new decision): the asking price in a pitch (a premium to serve a
   court known for losses), whether a hire offer passes it, the renewal price and the notice at term end, accepting a
   host's offer of service (defection likelier from a court that loses its people), and perhaps accepting a bribe
   from a host known for executions. Refusing a mission to such a court would be a new decision, so it is a later
   candidate only.
5. **Traits:** courage (fear of capture or death), loyalty (staying despite losses), greed (pricing the risk rather
   than refusing), sympathy (excusing a favourite court).
6. **Credibility:** count only engine-carried reports (script characters cannot read letters), weigh first-hand news
   above second-hand, and remember that a bribed carrier may leave things out.
7. **For model characters,** a line in their own view built from the same record, such as "What you have heard of
   the courts: Assyria put two spies to death this year; Egypt has lost three servants abroad."

**Benchmarks after Part G** (the owner asked for them next to the others): they were run at the round's head. Parts E
and H change nothing in script games (no script seat sleeps or reads the text), and G2-G4 left seeds 1-10 identical,
so the numbers under "Benchmarks" are the numbers after Part G.

## Part H: an envoy wakes a king for an audience, and the king judges whether to reopen its orders

The owner's later instruction (additions, section 4, which replaced the audience-only plan of section 3.2). The
principle: a king sleeps while nothing changes, and when something happens he judges whether it alters his plan.
Built in `c05bb98`, then `8dbb007` after one reviewer's two blocking findings (both fixed; see below).

**What was built.**
- **An envoy wakes a sleeping king for its audience only.** When the only reasons a sleeping seat has are envoys
  waiting, it is not woken for orders: it holds court asleep, its orders stand, and its audiences are held as usual,
  one call per exchange, by the seat's own model.
- **The order triggers reopen orders directly, without asking:** foreign troops entering its land or arriving next to
  its capital, land lost, troops lost, a scheduled or standing order that failed or was refused (or dropped with a
  lost unit), a ransom demand, a servant's notice, its own triggers, the season it named, the cap. When one of them
  fires as well as an envoy, the seat wakes as before, and its audiences are ordinary ones.
- **The audience held asleep** opens with the sleep line and "SEASON: turn 6. You hold court.", and gives the king
  "YOUR REALM IN BRIEF" instead of the one line of land and troops: its treasury, land and troops, foreign troops at or
  inside its borders as far as it sees, its scheduled and standing orders, and its people. Not the full map, the
  standings table or the travel table. (The "Lands now" line that opens every audience, a count of every power's
  provinces, stays.) The audience ends with a paragraph on orders standing, letters and reopening.
- **Letters from the audience.** The king may send envoys of its own who are at court and ready, with letters,
  tablets and gifts, in the same shape as the letters of its orders. They set out at the end of the season with
  everyone's orders, are validated as usual and are checked first, so their gold is reserved first. A later letter for
  the same person replaces an earlier one. A refused letter is reported in the news (and the digest if the king sleeps
  on) and does not wake it. The envoy before the king never sees the letters or the choice. A later exchange shows the
  letters already sent and the gold they commit ("Gold already committed by these letters: 40 shekels, not yet taken
  from the treasury you read here; it is reserved first when the season's orders are checked.").
- **The choice.** `reopen_orders`, once true in any exchange that season, holds. After all the season's audiences the
  seat either wakes for a full orders call that same season, as an ordinary wake ("…; you chose at your audience to
  reopen your orders"), with the letters already sent listed and replaceable by an order for the same person; or it
  sleeps on, its spell, triggers and named season unchanged, and the season's events go to its digest.
- **A failed call at court** (review fix): when a model's audience call fails at a court held asleep, the script
  stand-in answers the envoy, but its reply is marked (logged, so replay stays exact) and decides nothing for the
  seat: its letters and choice are ignored, and unless the seat itself chose to reopen at another exchange, it is woken
  for orders the same season ("your counsellors answered an envoy in your place"). This errs toward reopening, as
  before Part H. Such courts are counted apart, not in the reopen rate.
- **The record.** The journal records the letters given at each audience ("…; letters you gave at the audience: send
  c4 to Hatti"), and an audience request shows "AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS", which also shows a
  host its earlier audiences of the same season.
- **The switch stays.** With `--sleep off` (or the web checkbox) every king gives orders every season and audiences
  are exactly as before: same schema, no realm in brief, no letters or choice (tested).

**The rulebook sentence**, the owner's, is in the sleep paragraph: "When you are woken to receive an envoy, reopen your
orders if the news changes your plan; otherwise they stand." PLANNING AHEAD gains a bullet on the audience (both quoted
under "What a king now reads"). The audience's closing paragraph reads:

> YOUR ORDERS STAND WHILE YOU SLEEP. At this audience you may also send envoys of yours who are at court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at the end of this season with everyone's orders and are checked first. Reopen your orders (reopen_orders) if the news changes your plan: you then give orders this season, with your full view, after your audiences. Otherwise your orders stand and you sleep on.

**The reopen counter.** Each court held asleep is recorded (turn, envoys waiting, whether reopened, whether the
stand-in answered). The batch seat report has a `courts` column ("3/1", or "3/1 (1 by stand-in)") and a line under
the table, also printed over all games in the batch summary: "Courts held while orders stood: 5; orders reopened at 2
(40%)." With stand-in courts: "Courts held while orders stood: 5; orders reopened at 1 of the 4 where the king chose
(25%); at 1 a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the
rate)." The web god view adds "Held court with its orders standing 3 times, reopening them 1; asked for orders after a
failed call 1." Script seats never sleep, so the real rate comes from the next agent simulation.

**Audience-call size, before and after.** All 146 logged host calls of both seed-7 games, rebuilt on the same states
(sleep on, the king woken the season after it last gave orders, no summary or ledger written), before Part H
(`b07b3bc`) and after, both as an audience held asleep and as an ordinary one. Tokens are characters / 3.6.

| Mean per call, tokens | Before | Held asleep | Ordinary audience |
|---|---|---|---|
| **Whole request** | **10,460** | **11,870 (+1,400, +13%)** | **10,740 (+280, +3%)** |
| System block (rulebook, primer, map; cached for API kings) | 7,810 | 8,040 | 8,040 |
| Schema | 540 | 1,290 | 540 |
| Realm in brief, or the line of land and troops | 40 | 280 | 40 |
| The audience itself | 520 | 650 | 520 |
| Journal | 980 | 1,030 | 1,030 |
| Not cached (everything but the system block) | 2,650 | 3,830 (+44%) | 2,710 |

The growth at an audience held asleep comes from the schema (+750: the letters and the choice), the realm in brief
(+240), the rulebook (+230, which every orders call pays too, cached), the closing paragraph (+125), the journal
(+55) and the opening line (+20). The realm in brief alone is 650-1,250 characters. Scaled to the owner's working
figures (16k an audience), an audience held asleep is about 18.1k and an ordinary one about 16.4k.

**Tests.** `CourtAsleepTests`, 20 tests: reopening gives an orders call the same season; an order trigger reopens
directly and the audience is ordinary; letters go out, take their gold first, and are never heard by the envoy; a
later letter replaces an earlier one, and a letter replaces a scheduled dispatch for the same person; later exchanges
show the letters and the choice; a refused letter is reported and does not wake the host; the request carries the
realm in brief and the new fields and uses the seat's own model; only foreign troops in or next to the land are listed;
a failed call at court, a failed call after the seat answered itself, and a reopened season whose orders call fails;
two hosts holding court in the same season; the reopen-rate texts; sleep off unchanged; exact replay with letters,
with and without reopening. The suite is now 633 tests.

**Save version.** Part H adds `letters`, `reopen_orders` and `fromFallback` to the logged host reply under version 2,
which is unreleased (`main` is on version 1). Version-2 logs with sleeping seats recorded before `c05bb98` will not
replay; logs recorded since replay exactly.

**For the owner.** The audience call, and so the choice to reopen, runs one effort level below the orders call, as
every audience did before (same model). Whether the choice should run at the orders call's effort is yours to decide.

### Part H on the replay: how much an audience call that may reopen orders saves

The two seed-7 games, replayed exactly on the old code (as for the wake counts above), with this round's order triggers (Part G's capital trigger included; it fires only when foreign troops arrive next to the capital). Calls are priced at the simulation's means: an orders call 37.5k tokens, an audience call 16k.

| Both games together | Orders calls | King tokens (orders + 146 audience calls) | Against this round's triggers |
|---|---|---|---|
| As played (every season) | 134 | 7.36M | |
| This round's triggers (an envoy reopens orders) | 101 | 6.12M | |
| **Part H, if every woken king reopens** | 101 | 6.12M | 0% |
| **Part H, if none reopens** | 43 | 3.95M | about 35% less |
| Fallback (not built), sorted by a small model that errs toward offering, if the king always takes the offer | 96 | 5.94M | about 3% less |
| The same, sorted by a neutral reader instead | 80 | 5.33M | about 13% less |
| The same, neutral reader, without the "news of war" class | 73 | 5.07M | about 17% less |

The real reopen rate comes from the next simulation (Build order item 4); the batch seat report now counts it per king. The compact realm picture makes each audience call for a sleeping host longer (measured in Part H above), paid on every such audience call.

**The fallback's message classes** (estimate only; not built). The sorting pass the owner described is a small, cheap model that labels each audience and errs toward offering the reopen (a false positive costs tokens; a false negative costs the king a decision), on model seats only. Run that way (a small model told to offer whenever in doubt), it offered the reopen for **96 of the 110 audiences** — 41 coalition or alliance, 15 broken-tablet evidence, 1 threat, 17 news of war, 22 borderline — and left 14 as routine. With that bias the fallback offers nearly everything and saves little; the saving has to come from kings choosing to let their orders stand. For comparison, a neutral reader labelled them:

| Class (reopening offered) | Audiences |
|---|---|
| Coalition or alliance tablet (by content: 8 of the 10 marked sworn alliances, plus pacts against a named third king) | 34 |
| Evidence of a broken tablet (copies shown, or a named broken oath) | 16 |
| A threat to the host (mostly veiled and conditional; one explicit) | 4 |
| News of war (a city fallen, armies or fleets moving, a warning of attack) | 50 |
| **Any of these** | **68 of 110** (87 of 146 host calls) |
| Routine, answered in the audience alone (greetings, gifts, grievances, peace renewals, non-aggression pacts) | 42 |

Ransom demands arrive as rumours, not envoys, and already reopen orders. Read from the engine alone (tablet flags and copies shown, no reading of the words), only 18 audiences would offer reopening; a crude word list for "war" flagged 85, so the spoken-word class needs the extraction pass the fallback assumes.

Three notes on these numbers:
- **The counts were re-run** on the Part H engine's own wake check over the dumped states of seasons 2-10. It
  reproduces the Part D/G grid (120 seat-seasons; an envoy waiting in 75, land lost 22, troops lost 14, the capital
  trigger 12), except that run 2 has 43 woken seasons where the Part D table has 44: that one notice-only season came
  from Part B's staggered terms, which the old states lack, and it is no court either way. Courts held asleep: 58
  (25 and 33), with 89 audiences and 118 host exchanges.
- **In request tokens** rather than the agent figures (see Part E, "Set against the 37k and 16k per call"): an orders
  request of about 13.8k and an audience of about 10.5k before Part H; after it, 14k, 10.7k, and 11.9k at an audience
  held asleep. As played, 3.4M; this round's triggers before Part H, 2.9M; Part H if every court reopens, 3.1M (the
  larger requests cost about 0.2M); if none reopens, 2.3M, about 21% less than the triggers alone, against 35% on the
  agent figures.
- **A second labelling**, by hand (one reader, from the letter, mandate, tablet and copies shown), of only the 89
  audiences at the 58 courts that would be held asleep, gives the same picture. Erring toward offering, 46 of the 58
  courts are offered the reopen, so the fallback could cut orders calls from 101 to 89 at most; read literally, 30
  (to 73); from the engine alone (an oath flag or copies shown), 14 (to 57), which would miss 26 audiences whose main
  business was war or a breach. From season 6 on, 26 of 28 courts are offered, and news of war alone covers 36 courts
  of the 58. If the fallback is ever built, narrowing that class (to threats to the host, or war news about its own
  land, troops or allies) is the lever; that needs its own estimate.

## Later candidates, not built: who receives envoys

**The yearly court is dropped as a cost device.** Asked to estimate a king who holds court about once a year plus whenever a pressing matter arrives, the replay showed it saves almost nothing: 37 of the 110 envoys brought a tablet to seal, the sender's troops stood at the host's border for 55 (arrived there last season: 14), so nearly every envoy counted as pressing; with a pressing audience reopening orders it saved 0-2% against this round's triggers, and it adds wake-ups in quiet seasons. Its other purpose, fairness between a human seat (awake every season) and model kings, only arises once someone answers envoys on the king's behalf; until then every king, human or model, receives every envoy himself (with Part H, a sleeping king does so in an audience call). These candidates belong with characters taking on roles. Estimates from the same replay (110 audiences, 146 host calls at about 16k tokens each, 2.3M tokens in all):

| Candidate | What it would do | Estimate on the seed-7 games |
|---|---|---|
| **A minister who receives routine envoys** by the king's standing instructions | Envoys with nothing pressing are answered by a character on the king's instructions, without a call to the king | Routine envoys were 33-59 of the 110 (43-78 host calls), depending on whether "the sender's troops at the border" means standing there or just arrived: about 0.7-1.25M tokens, a fifth to a third of the audience cost |
| **An attention limit, the same for every seat** | A king receives at most N envoys himself a season, pressing ones first; the rest wait or go to the minister | Envoys came to 75 seat-seasons, two or more in only 26 (at most 3). A limit of 1 a season leaves 42 of 146 host calls to the minister (about 0.7M); a limit of 2 leaves only 9. Mainly a fairness rule, not a saving |
| **Tablets pressing only where the instructions do not cover them** ("seal peace with anyone; bring alliances to me") | A tablet to seal counts as pressing only if the king's instructions do not already say what to do with it | 37 audiences carried a tablet (51 host calls); for 17-29 of them (22-41 calls) the tablet was the only pressing matter, so instructions covering them would move up to about 0.35-0.65M tokens to the minister |

All are upper bounds from games as played: kings that sleep send fewer envoys. Each needs a character who receives envoys on the king's behalf and a fair, engine-visible definition of "pressing" for human and model seats alike.

## Benchmarks

Script kings only, shared victory off (the default), every game replayed and checked. **Before** is `main` before this
round (`d3d1325`), rerun on 19 October; **after** is this branch at its head, after Parts G, E and H. All 400 replays
were exact. **Nothing was tuned.** Game lengths are the same seed by seed (the random end is drawn from the engine
seed): 20.9 seasons on average for seeds 1-100 (15-54), 20.4 for 101-200 (15-51).

Seeds 1-100:

| Power | Tier | Wins before | Wins after | Mean growth before | Mean growth after |
|---|---|---|---|---|---|
| Egypt | Strong | 23 | 19 | 2.31 | 2.35 |
| Hatti | Strong | 29 | 34 | 1.98 | 2.07 |
| Babylonia | Strong | 16 | 17 | 2.24 | 2.29 |
| Mitanni | Middle | 3 | 4 | 0.85 | 0.79 |
| Assyria | Middle | 16 | 14 | 1.53 | 1.58 |
| Arzawa | Weak | 13 | 12 | 1.32 | 1.11 |
| Alashiya | Weak | 0 | 0 | 1.11 | 1.10 |
| Won by a weak power | | 13 | 12 | | |

Seeds 101-200:

| Power | Tier | Wins before | Wins after | Mean growth before | Mean growth after |
|---|---|---|---|---|---|
| Egypt | Strong | 22 | 25 | 2.34 | 2.32 |
| Hatti | Strong | 28 | 32 | 1.86 | 1.94 |
| Babylonia | Strong | 12 | 15 | 2.21 | 2.21 |
| Mitanni | Middle | 4 | 1 | 0.87 | 0.78 |
| Assyria | Middle | 20 | 16 | 1.63 | 1.52 |
| Arzawa | Weak | 14 | 11 | 1.31 | 1.31 |
| Alashiya | Weak | 0 | 0 | 1.12 | 1.13 |
| Won by a weak power | | 14 | 11 | | |

The frozen baseline, seeds 1-40: one current king against six baselines (`--versus solo`), against the same seed
played all-baseline:

| Power | Growth alone, before / after | Growth all-baseline, before / after | Wins alone, before / after | Wins all-baseline, before / after |
|---|---|---|---|---|
| Egypt | 2.87 / 2.85 | 1.34 / 1.30 | 88% / 88% | 20% / 18% |
| Hatti | 2.65 / 2.76 | 0.82 / 0.82 | 83% / 83% | 8% / 5% |
| Babylonia | 2.48 / 2.42 | 1.13 / 1.15 | 73% / 83% | 8% / 10% |
| Mitanni | 1.80 / 1.86 | 1.30 / 1.35 | 48% / 50% | 23% / 25% |
| Assyria | 3.18 / 3.81 | 0.96 / 0.96 | 75% / 85% | 10% / 10% |
| Arzawa | 3.24 / 2.96 | 1.46 / 1.40 | 60% / 60% | 25% / 30% |
| Alashiya | 1.98 / 1.84 | 0.87 / 0.91 | 48% / 48% | 8% / 3% |
| All kings | 2.60 / 2.64 | 1.13 / 1.13 | 68% / 71% | 14% / 14% |

Signals (totals over 100 games; seeds 1-100, then 101-200), where they moved:

| Signal | Before | After |
|---|---|---|
| Tablets sealed | 3,442; 3,377 | 3,621; 3,565 |
| Accusations | 1,667; 1,577 | 986; 944 |
| Broken promises | 1,699; 1,584 | 1,190; 1,237 |
| Coalitions (games) | 27 (15); 9 (8) | 10 (7); 5 (4) |
| Bribes | 80; 76 | 106; 98 |
| Detentions | 123; 136 | 175; 164 |
| Spies caught | 40; 43 | 26; 33 |
| Evidence shown | 813; 736 | 909; 860 |

**What moved the bots.** The changes that reach script games:
- **Part A's bot fixes and seat seeds:** a sworn ally who breaks an oath is no friend; coalition tablets read for any
  name of the foe; hosts refuse foreign tablets that give land, gold or tribute away (the script kings' and the frozen
  baseline's own tablets are recognised, so script games seal as before); script captors leave an open ransom demand
  standing; the threat filter aimed at the host, a bribed envoy passing on the host's request, and "assurances" only
  after overreaching; and a seed of its own for every script seat, which shifts every roll a script king makes.
- **Part A's engine changes:** covers (a master learns of a hidden event only when word arrives), one ransom demand
  per captive, nobody moving on dismissal, and catastrophe news only where a court can see it, whose removed rumour
  journeys shift the numbering of everything after them.
- **Part B:** notice at term end, renewals and staggered starting terms (script kings renew servants they still want
  at the price named; 102 servants left unrenewed in 40 games), and the rule giving up a servant overdue for three
  seasons.
- **Part G1:** the cover's believed wage replaced by back pay, script kings counting back pay as gold already spent,
  and envoys weighing it against offers of service.

Parts D, E and H do not reach script games (script seats never sleep and read no text), and G2-G4 left seeds 1-10
identical. The accusation and broken-promise counts fell mostly because Part A changed how they are read (whole words;
a breach counted in the season of sealing, and a king retaking its own homeland no longer counted), not because the
bots changed. The other shifts (fewer coalitions and caught spies, more detentions and bribes) were not traced to single
changes. Even the all-baseline games moved slightly, through the engine changes.

## What a king now reads

Quoted from the code as it is now (`src/Amarna.Llm/Prompts.cs` and `Schemas.cs`), rendered with the default settings:
sleep on, primer on, shared victory off. With sleep off, "YOU SLEEP BETWEEN YOUR ORDERS" and "PLANNING AHEAD" are left
out and the schema has no sleep fields. The opening paragraph, the map and the customs lines unchanged this round are
left out here.

### The rulebook

Where to find what the prompt named: the sleep paragraph and PLANNING AHEAD come right after HOW YOU WIN; the movement
and battle-report lines are under MOVEMENT AND COMBAT; contracts, ransoms, dismissal, back pay, catastrophes and the
odds of checks, spies, examinations and forgeries are under EVIDENCE AND INTELLIGENCE; news of people abroad is under
WHAT YOU SEE; the primer's new and rewritten lines are under CUSTOMS OF THE AGE; the opening positions follow the map.

> HOW YOU WIN
>
> - The winner is the power whose strength grew most relative to its own starting strength. Strength = 10 x (sum of the base yields of the provinces you hold) + the gold in your treasury - the back pay you owe your people. A small kingdom that doubles beats an empire that merely holds its ground.
>
> - No game ends before turn 15. From then on, at the end of every season the game ends with a 15% chance. Nobody knows which season is the last.

> YOU SLEEP BETWEEN YOUR ORDERS
>
> After you give your orders, you sleep. You are woken only when something concerns you: an envoy at your door, foreign troops in your land or next to your capital, land or troops lost, a scheduled or standing order that failed, a servant giving notice, a ransom demanded, or news you asked to hear. When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand. Nothing else wakes you, and you may not be woken again for the rest of the game. Plan as if these orders must carry your kingdom until then: schedule what your armies should do in the seasons ahead, set the triggers you want, and leave your envoys mandates that stand on their own.

> PLANNING AHEAD (how sleeping works)
>
> - While you sleep the world goes on, and nobody is told that you sleep. Your units hold unless you scheduled orders for them or a standing order gives them orders.
>
> - An envoy at your door wakes you for the audience only. You read your realm in brief (your land and troops, foreign troops at or inside your borders, your treasury, your scheduled and standing orders, your people), answer the envoy as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at the end of the season with everyone's orders and are checked like orders you give, before them. Then you choose: reopen your orders, and after your audiences you give orders this season with your full view, as when anything else wakes you; or let them stand and sleep on. Anything else that wakes you reopens your orders without asking (your audiences still come first).
>
> - Foreign troops wake you when they move into your land, and, while you hold your capital, when they end a move in a province next to it (troops there can take it the next season). Troops that only stay where they are do not wake you again.
>
> - Scheduled orders (schedule): orders for any later season, named by its turn number. Name each of your units by the province it stands in now, as you give the orders: the order follows that unit wherever it goes, and is given from where the unit then stands. An order naming a province where you have no unit is refused, so a unit not yet raised cannot be given orders ahead. They are secret and are checked when they run, after the orders you give that season. In a season when you are awake, your scheduled orders for it still run, except where you give the same units or people other orders (a renewal is not a task: a renewal and an errand for the same person both run). To change or cancel them, send an entry for that season: it replaces everything scheduled for it, and an empty one cancels it. You may schedule at most 24 orders for one season, for at most 40 seasons; orders past these limits are refused.
>
> - A unit's scheduled moves are its march. If a scheduled move is stopped, the unit tries that step again the next season, and each of its later scheduled orders waits a season. If the step is stopped a second time, or a scheduled move is refused, the march ends: the unit's remaining scheduled orders are dropped. When you lose a unit, its scheduled and standing orders are dropped, which wakes you.
>
> - Standing orders (standing_orders), at most 12, each with at most 24 orders, kept until they fire or you cancel them (cancel_standing, by id or "all"). One waits for an event you see: a unit of the power you name, or any foreign unit, moving into a province and getting there (unit_enters); or a foreign unit moving against the province where one of your units stands (name it by where it stands now), your unit still standing there afterwards (unit_attacked). Its orders then run the next season, once, before your scheduled orders: they replace scheduled orders for the same units or people, and orders you give that season replace theirs. If two fire in the same season, the one with the lower id goes first: its orders replace the other's for the same units or people. A standing order firing does not wake you: you read it in your news.
>
> - A scheduled or standing order that is refused, or fails as its season resolves (a move that is stopped or a support that is cut among them), wakes you the next season. The orders you give now for this season do not, an entry for this season in your schedule among them: if one is refused or fails, you read why when you are next woken.
>
> - Your own triggers (wake_on), at most 8, set anew with each set of orders. Each wakes you when something changes after you set it, never for a state that merely lasts: a unit moves (name the province it stands in); one of your people comes back to court (one at court when you set it must leave and come back first); your treasury falls below an amount (if it is below that already, it must first rise to the amount again); foreign troops (of one power, or any) move into a province and get there; or a province changes hands.
>
> - To be woken in a particular season, name it (wake_in_turn) with each set of orders, like your triggers: it holds only until you are next woken, so if something wakes you sooner, name it again to keep it.
>
> - Each time you wake, you are told how long you slept and what woke you, then what happened while you slept: first in brief (the troop movements you saw, the reports that came, the orders that failed, the standing orders that fired), then the news of those seasons in full (the routine treasury notices left out).

> HOW A SEASON RESOLVES (one turn; three seasons make a year), step by step:
>
> 1. Departures: a servant whose notice has run out, and who was not renewed, leaves if at your court with no task.
>
> 2. Income, upkeep and wages: your provinces pay their yield in gold; you pay upkeep for every army (30) and fleet (35) and the wages of your people at court; the wages of your people away are added to their back pay. If you cannot pay upkeep, troops desert, the one farthest from your capital first; unpaid people lose loyalty and may leave.
>
> 3. Arrivals: envoys reach the courts they were sent to, or come home and report; spies reach their posts; spies' reports, ransoms and rumours arrive. Then everyone at your court whom you owe back pay is paid it, as far as your treasury allows.
>
> 4. Your court: candidates you sent for last season present themselves; background checks and examinations ordered last season report; terms end (a servant content with the wage serves on, one who wants more or is still owed back pay gives notice); a servant on notice who has come home leaves.
>
> 5. Audiences: you receive the foreign envoys at your court and answer them. Gifts and gold you send back are paid when the audience ends.
>
> 6. Orders: every king gives orders at once, in secret. Yours are checked in the order your reply lists them (units, then letters, then other orders), and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold. There is no "else": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.
>
> 7. Movement and battles: all units move at once.
>
> 8. Land changes hands: a province passes to the power whose unit stands in it after movement.
>
> 9. Cessions and gifts of troops: a cession fails if you no longer hold the province or your own troops stand in it; a gift fails if the unit is gone.
>
> 10. Purchases: a city's price is paid only when it accepts. A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none.
>
> 11. Disbanding.
>
> 12. Levies: a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid.
>
> 13. Envoys set out (their gold and the scribe's fee are paid now), detained envoys are released, servants are dismissed, candidates are sent for and background checks paid for. Then hiring and renewals are settled: a person hired this season enters your service at the end of the season and can be sent on an errand from next season; a person takes the highest offer at or above the price it asks, so when two courts bid for one person the higher wage wins.
>
> 14. Intelligence: watchmen are paid; captors decide their captives' fates; spies set out (a spy must be one of your own people at your court, sent to watch a court or a province) or are recalled; assays, examinations and forgeries are paid for; ransoms set out. Then each posted spy may be caught, or else sends its report home.
>
> 15. Catastrophes strike.
>
> 16. A kingdom with no land left falls.
>
> 17. Strength and growth are reckoned, and from turn 15 the game may end.
>
> Everything that happened is reported to you next season. Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).

> MOVEMENT AND COMBAT (Diplomacy rules, no dice)
>
> - One unit per province. Armies move along land and coast links; fleets along sea and coast links. A fleet in a sea zone may convoy an army from one coast to another.
>
> - A unit is named by the province it stands in. Orders: hold; move to a linked province; support another unit (of any power) holding, or moving into a province your own unit could move into; convoy (fleet at sea only); disband.
>
> - Strength is 1 plus valid supports. A move succeeds only if its strength beats the defender's hold strength and the strength of every other move into the same province. Ties bounce. A support is cut if the supporting unit is attacked from anywhere except the province it supports into. You can never dislodge your own unit.
>
> - A unit dislodged is destroyed; a unit that is destroyed gives no support (your report calls such a support void). A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds. One naming a province you cannot see is never refused for what stands there: if no unit there does what it helps, it is void. A province changes hands when a unit ends a season in it.
>
> - Your battle report says why each of your moves that failed was stopped, with the strengths compared where strength decided it, and why each of your supports or convoys was void. It names the other side's power only if that unit stood, or was moving, where you could see.
>
> - Free city-states have walls that hold with strength 1 and never move: you need at least one support to take one, or you can buy it. A city that accepts a buyer keeps its walls, which then hold for its new owner: the owner cannot station troops inside, but it, or any other king, may support its walls holding.

> ECONOMY
>
> - Gold is counted in shekels (60 shekels make a mina). Raise an army for 100 or a fleet for 120, only in a province of your own homeland that you still hold and that is empty after movement. Buy a free city-state for 10 x its yield if it borders your land or troops, or shares a sea zone with one of your coasts. You may cede provinces or give troops to another power.
>
> - Gold sent abroad travels with an envoy and arrives late. You may send it debased (purity below 100%): the receiver sees its weight, not its fineness, until they pay 10 for an assay. Your own treasury figure counts unassayed gold at its weight.

> ENVOYS: THE ONLY WAY KINGS COMMUNICATE
>
> - You never speak to another king directly. You give an envoy a spoken message, a mandate (what the envoy may agree to) and optionally gold and a tablet. Envoys take 1 or 2 seasons each way between courts (the table in your view gives each court); a spy sent to watch a distant province may take up to 3 seasons to reach it, and its reports as long to come home.
>
> - The greeting is written by your scribes from your choices and sealed: it arrives exactly as written. The message itself is spoken by the envoy in their own words. Envoys have motives of their own (greed, fear, ambition, sympathies) and may soften, embellish, omit, take bribes, skim gold, exceed their mandate, stay too long, or defect. Their reports home are written to their own advantage.
>
> - When a foreign envoy stands before you, you may answer, offer them a gift (a bribe), offer them service at a wage, detain them, seal a tablet they bring, or send gold back with them. An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.
>
> - At most 3 envoys may leave your court in one season.

> EVIDENCE AND INTELLIGENCE
>
> - Tablets: free text that both kings seal (the scribe costs 20). A sealed tablet obliges nobody and the engine never enforces it, but a copy can be shown to a third court as proof.
>
> - Forgery: a skilled servant can forge a tablet bearing other kings' seals (40; one without the skill ruins the clay, which you still pay for). Any court can pay at least 10 to have a tablet examined, and hears the result next season. Examination is never certain: a genuine tablet reads genuine 95% of the time (otherwise the scribes cannot agree); a forgery is found with a chance of 20% + shekels paid/200 - (the forger's skill, 0-100)/150, between 5% and 95%, and once found is traced to the forger's court with a chance of 30% + shekels paid/400, between 30% and 80%, which is announced to every court.
>
> - Spies watch a court or a province and send a report every season, which reaches you as long after as the journey takes. Each season a spy is caught with a chance of 5% + (what the court it watches, or the one holding the province it watches, spends on watchmen that season)/300 - (the spy's skill, 0-100)/400, between 2% and 60%; a spy watching a province that no power holds, or one you hold yourself, is never caught, nor is one still watching a court that has fallen. Watchmen (counter_intelligence) are paid for one season at a time. A caught spy may confess whom it serves. Caught spies can be executed, ransomed, turned into double agents, or released. Ransoming or turning a captive whose kingdom has fallen is refused, and so is turning one whose king has dismissed them: nobody is left to pay or to deceive.
>
> - Ransoms: a demand reaches the captive's king (for a captive dismissed while held, the king who dismissed them) as a rumour, and can be paid (pay_ransom) only once it has reached you. A captive has one demand at a time: a new demand replaces the old one once its word reaches you, and until then the old one can still be paid. A demand not paid within four seasons of being made lapses. The ransom travels on its own and is never refunded; the captor frees the captive if they still hold them. pay_ransom is refused before the demand has reached you, once you know the captive is no longer held by the court that asked, and while a ransom for them is already on its way.
>
> - Background checks (at least 10 shekels) report next season: every public fact about the person, each hidden fact with a chance of shekels paid/150 (at most 90%), and each deep secret with a chance of shekels paid/400 (at most 60%). Never the whole truth for certain.
>
> - Ask for candidates to meet up to three people seeking service; each names a price, as does anyone free at your court. Hire them for a wage per season.
>
> - Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more, or whom you still owe back pay, gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term; they never take less than their present wage (below their price they refuse, and you are told the price); hire is only for people not in your service.
>
> - People away from your court (on a mission, watching as a spy, held or captive) are not paid while away: their wages build up as back pay, paid in gold when they are back at your court. If your treasury cannot pay it all, the rest stays owed and counts as missed pay. Anyone who never comes back is never paid, and if your kingdom falls, what it owed is lost. Back pay owed counts against your strength.
>
> - Dismissal (dismiss) ends a servant's wage at once, wherever they are; back pay you already owe them is still paid if they ever stand at your court again. Anyone dismissed while away keeps going where they were going and is free when they get there: an envoy on the way out arrives as a free person with no audience, and the gold it carried is its own; one on the way home still reports and hands over what it carries; a spy watching a court, or on its way to one, is free at that court; one watching a province, or on its way to one, walks back to your court and is free there. A held envoy or captive stays held.
>
> - Catastrophes (drought, plague, flood, earthquake) are known exactly only to the power they strike. A court that can see the stricken land hears of it the next season (a drought or plague: any province of that realm in sight; a flood or earthquake: that province in sight). Other courts learn of it only from their envoys and spies.

> WHAT YOU SEE
>
> - Who holds each province is public. You see troops only in your own land, where your troops stand and in the provinces your spies watch, and one link of any kind (land, coast or sea) from those. Troops two links away, or an army carried across the sea by fleets, can still arrive next season without being seen first. Rivals' treasuries are private. What you know of others comes through your envoys, spies and rumours, and any of them may be wrong.
>
> - News of your people abroad reaches you only by rumour or when they return: a servant who is held, changes sides or dies abroad still appears on its mission until word comes, and its back pay builds up in your books as for anyone away.
>
> - Word of captives and executions travels with people: an envoy received at a court, or a spy posted there, may hear which servants of other courts it holds captive and whom it has put to death within the last 3 seasons, and brings that home in its report. Other courts' envoys and spies hear the same at yours.

> CUSTOMS OF THE AGE (knowledge, not instructions)
>
> Every king knows these customs, and knows that every other king knows them. They carry no obligation and historical accuracy is not a goal: follow a custom when it improves your chances, break it when breaking it serves you better. Following one can build trust cheaply; breaking one will be noticed.
>
> - Great Kings address each other as "brother" and wish well to each other's household, wives, sons, chariots, horses and country. Vassals instead "fall at the feet of their lord seven times and seven times". Between Great Kings, "brother" claims equal rank, and withholding it is a slight: when the king of Assyria first wrote to the pharaoh as a brother, he was claiming a place beside Mitanni and Babylon. Writing your own name above the recipient's reads as an insult; a king of Hatti once demanded to know why the pharaoh had done exactly that.
>
> - Precedent is a floor. A king asks for more than was given to his father, so anything less reads as a demotion. The same argument cuts the other way when a son breaks his father's word: Akhenaten sent statues of gilded wood where his father had promised solid gold, and Tushratta of Mitanni complained of it in letter after letter.
>
> - Detention answers detention: Tushratta kept the pharaoh's envoy Mane at his court until his own messengers, held in Egypt, were let go.
>
> - A messenger's word is not a tablet. The king of Arzawa would not trust what the pharaoh's messenger told him until a tablet said the same.
>
> - Proof needs a witness who knows. When the king of Babylon asked whether his sister in the pharaoh's household still lived, he was told that the men he had sent were nobodies who had never known her, and that he should send someone who could recognise her.

> OPENING POSITIONS (known to every court)
>
> Each king began with these troops and this treasury, holding its whole homeland. Its starting strength is 10 x its homeland yield + its treasury, and its growth is measured against it.
>
> - Egypt: armies in memphis and akhetaten, a fleet in delta; treasury 600 shekels; homeland yield 190; starting strength 2500.
>
> - Hatti: armies in hattusa and kanesh, a fleet in kizzuwatna; treasury 300 shekels; homeland yield 180; starting strength 2100.
>
> - Babylonia: armies in babylon, sippar and durkurigalzu; treasury 650 shekels; homeland yield 195; starting strength 2600.
>
> - Mitanni: armies in washukanni, taidu and terqa; treasury 500 shekels; homeland yield 145; starting strength 1950.
>
> - Assyria: armies in ashur, nineveh and ekallatum; treasury 350 shekels; homeland yield 135; starting strength 1700.
>
> - Arzawa: armies in mira and apasa, a fleet in seha; treasury 300 shekels; homeland yield 100; starting strength 1300.
>
> - Alashiya: a fleet in enkomi; treasury 350 shekels; homeland yield 85; starting strength 1200.

> HOW TO ANSWER
>
> Reply with one JSON object that matches the schema. Use province ids (like "memphis") and person ids (like "c12") exactly as given. Units you give no order hold. Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders. Keep each message under 1,500 characters. Your notes are private: nobody else ever reads them, so record your plans, your promises and your suspicions there. Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders, in full; older notes then leave your record, so keep what you still need in your summary, which you write in your own words and which stays until you replace it. Your ledger of dealings keeps one line per court in your own words (what was promised, sealed, broken and paid), shown in full whenever you give orders or hold an audience, until you change or remove that line; you may write it in either reply.

### The schema's new and changed fields

Orders reply:
- `notes`: "Private notes to yourself, at most 2,000 characters (longer notes are cut): plans, promises made, suspicions. They are shown in full the next 3 times you give orders, then leave your record."
- `summary`: "Your own summary of the seasons before those shown in full: plans, promises, what you have learned. At most 2,000 characters. It replaces your previous summary; leave it empty to keep it."
- `ledger` (orders and audience replies; each line a court and an entry, "At most 600 characters; empty removes that court's line."): "Your ledger of dealings, in your own words, per court: what was promised, sealed, broken and paid. An entry replaces that court's line, an empty entry removes it, and courts you leave out keep their lines. It is shown in full whenever you give orders or hold an audience, and you may write it in either reply."
- `term` (other orders): "hire, renew: the seasons of service, 1-30 (0 means 6). Hire is only for people not in your service; renew keeps one of your own on, at your court or once they have given notice; else 0."
- `sleep` (sleep on only): "You sleep after these orders, until something concerns you. What else should wake you." `wake_in_turn`: "A later season (turn number) to be woken in, or 0 for none. Something that concerns you may wake you sooner. Like wake_on, it holds only until you are next woken: name it again to keep it." `wake_on`: "Your own reasons to be woken, on top of the usual ones (at most 8). Each fires on a change after you set it, not on a state that lasts. They hold until you are next woken."
- `schedule`: "Orders for later seasons (or this one). Secret, and checked when they run, after the orders you give that season. An entry for a season replaces everything you scheduled for it; an entry with no orders cancels it. At most 24 orders a season, for at most 40 seasons. A scheduled order that is refused or fails wakes you; a scheduled move that is stopped is tried once more (see the rulebook)." Its units: "Name each of your units by the province it stands in now: the order follows that unit, and is given from wherever it then stands."
- `standing_orders`: "New standing orders, kept until they fire or you cancel them (at most 12 in all, each with at most 24 orders). When you see the event, the orders run the next season, once, before your scheduled orders; orders you give that season replace them. Firing does not wake you; an order of it that fails does." `cancel_standing`: "Ids of your standing orders to cancel (like s3), or "all"."

Audience reply:
- `gift_to_envoy`: "A personal gift (bribe) to the envoy in shekels, or 0. An envoy takes one gift per audience: once one is accepted, a later gift is not given."
- `send_gold_back`: "Gold sent home with the envoy for their king, or 0. In a later exchange of the same audience, a new amount replaces the one you named before, and 0 keeps it."
- At an audience held while the orders stand only: `letters`: "Envoys of yours to send from this audience, as the letters of your orders: they set out at the end of this season with everyone's orders and are checked like them, before any orders you give. A new letter for a person you already sent this season replaces it. Empty for none." `reopen_orders`: "True if the news changes your plan: after your audiences you give orders this season with your full view, as when anything else wakes you. False: your orders stand and you sleep on. Once true, it holds for the season."

### The view: examples

**The sleep line** that opens every orders and audience request of a king that sleeps (from the tests and the code):

> This is your first season.
>
> You gave orders last season (turn 5).
>
> You slept 2 seasons (you last gave orders in turn 1). You were woken because: foreign troops entered your land: Assyria's army moved ekallatum -> sippar; foreign troops came next to your capital: Assyria's army moved ekallatum -> sippar; land lost: Sippar has been taken by Assyria.
>
> You slept 3 seasons (you last gave orders in turn 1). You were woken because: your counsellors woke you after a long sleep.
>
> You slept 2 seasons (you last gave orders in turn 5). You were woken to receive an envoy: an envoy of Egypt waits to be received. Your orders stand unless you reopen them at your audience.
>
> You slept 2 seasons (you last gave orders in turn 5). You were woken because: an envoy of Egypt waits to be received; you chose at your audience to reopen your orders.

**The season, treasury and standings lines**, rendered from the code for Egypt in turn 7 of a script game on seed 7:

> SEASON: turn 7, Akhet (inundation), year 3 by your court's reckoning.
>
> TREASURY: 203 shekels by your ledger. Income 390, upkeep 95, wages 27 a season (paid to your people at court; for those away they build up as back pay). Back pay owed to your people: 109, paid when they are back at your court. Strength 3994 by your ledger (back pay owed counted against it), against a starting 2500 (growth 1.60).
>
> STANDINGS (an estimate from who holds what; treasuries are left out): Egypt (you) 2.05 (land yield 390, at the start 190); Hatti 1.53 (land yield 275, at the start 180); Babylonia 1.51 (land yield 295, at the start 195); Arzawa 1.30 (land yield 130, at the start 100); Assyria 1.22 (land yield 165, at the start 135); Alashiya 0.76 (land yield 65, at the start 85); Mitanni 0.55 (land yield 80, at the start 145).

**Person lines**, the same game:

> - c20 Mane of Thebes; on the road home; set out in turn 3 for Arzawa; due back about turn 7; serves at 13 a season through turn 12; if content they then renew themselves, otherwise they give a season's notice and name a price; owed: 39 shekels of back pay; known: Born in Thebes. Served as a palace steward. Known by name at more than one royal court.
> - c27 Ashur-nadin of Ashur; watching Alashiya; serves at 14 a season through turn 8; if content they then renew themselves, otherwise they give a season's notice and name a price; owed: 70 shekels of back pay; known: Born in Ashur. Served as a temple scribe.
> - c95 Ili-iddina of Babylon; employed; known: Born in Babylon. Served as a soldier. Has a brother serving in the army of Egypt.

Other forms of the same parts (from the tests): "at court, ready for a mission"; "held captive at the court of Assyria; Assyria demands 1 mina 30 shekels for their return (order pay_ransom)"; "serves at 12 a season; has given notice: asks 33 a season to serve on; leaves at the start of turn 3 unless renewed" (or "leaves when next at your court unless renewed"); a free person at your court ends "asks 20 a season".

**The realm in brief**, as Egypt would read it at an audience held while its orders stand (same game):

> YOUR REALM IN BRIEF (enough to judge whether the news changes your plan; you see the full map only if you reopen your orders):
> - Treasury: 203 shekels by your ledger; income 390, upkeep 95, wages 27 a season; back pay owed to your people 109.
> - Your land: akhetaten, byblos, damascus, delta, gaza, megiddo, memphis, sinai, tamassos, thebes, tyre, ugarit.
> - Your troops: army in gaza, army in sinai, fleet in tamassos.
> - Foreign troops at or inside your borders, as far as you can see: Hatti army in carchemish (next to your ugarit).
> - Your scheduled orders: none; your units hold where they stand.
> - Your standing orders: none.
> - Your people at court and ready to be sent: nobody.
> - Your other people: c20 Mane (on the road home; set out in turn 3 for Arzawa; due back about turn 7); c27 Ashur-nadin (watching Alashiya).

**The king's record** (Part E), in an orders request after the view: "YOUR LEDGER OF DEALINGS (your own words, per
court: what was promised, sealed, broken and paid; each line with the season you last wrote it):" with one line per
court ("- Egypt (turn 5): …", or ": nothing written yet."); then "YOUR RECORD OF EARLIER SEASONS (yours alone: nobody
else ever reads it):", "YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 6): …" (or "you have written none, and
your notes from turn 6 and before have left this record."), and for each of the last three seasons "turn N notes: …",
"turn N audiences: Mitanni's envoy Ubaru: you said "…"" and "turn N orders: …"; last, "Your notes from turn 7 leave
this record after this season; keep what you need in your summary." Audience requests carry the ledger, the summary,
the last two seasons' notes and the audiences held since the king last gave orders.

## Left out or changed from the prompt, and why

Every deviation from `docs/ROUND-PROMPT.md` and `docs/ROUND-PROMPT-ADDITIONS.md`, and every known gap, in one place.
Most are also noted in their part.

**Readings and the round as a whole**
- The prompt's own question numbers are left as written: it is saved word for word, and it says itself that "question
  N" means the old report. Every other reference points to the old report's new path.
- Sleep is on by default in the engine, the batch runner and the web app (the design document decides it); the
  switch stays (`--sleep off`, the web checkbox). Script and human seats still play every season.
- What wakes a king follows the prompt's list, not the design document's ("foreign troops at your border"); Parts G and
  H then changed it as the owner asked. The design document's differences are in DESIGN-NOTES.
- From 19 October the round followed the design document's Build order: one reviewer per part (earlier parts had two
  or three), no extra analyst workflows, progress in `docs/BUILD-PROGRESS.md`, and this report moved to
  `docs/rounds/2026-10-19-simulation-fixes.md` when the item was done.
- No new agent simulation was run, as the prompt says.

**Part A**
- Notices read the next season say "last season" and refusals "that season" (the brief had "this season").
- A gift counts as the envoy's one gift once accepted, even if the treasury could not pay it, to match what the host
  is told.
- The frozen baseline's tablets are recognised by the hosts' new tablet filter, so the benchmarks stay comparable.
- Coalition tablets are read for any name of the foe, but wider phrasing ("strike Assyria together") is still not read.
- A cover cannot hide everything: a caught spy's reports stop; a background check still finds a public defection; a
  spy posted at a court is still listed in its host's view (question 19, bug 4, not in this round's list).
- Removing the catastrophe rumour journeys shifts id numbering, so script games from a seed play out differently than
  before (replay within version 2 stays exact).

**Part B**
- A renewal's term counts from the next season, like a hire's; a servant on notice leaves before that season's wages,
  so a king pays exactly one season past the term. An early renewal is priced at the renewal formula or the present
  wage, whichever is higher (a reviewer found a wage of 60 could otherwise be cut to 9).
- Script kings renew only servants on notice, never early, and a rule was added for them to give up a servant overdue
  for three seasons, needed because of Part A's covers (kept after Part G; see G1).
- The rulebook line quoted in Part B was later extended: a servant still owed back pay gives notice too (Part G), and
  "they never take less than their present wage". The current line is under "What a king now reads".

**Part C**
- The travel line is worked out from the map ("1 or 2 seasons between courts" today), not hard-coded.
- The spy-odds sentence says a spy watching a free province, or one of the king's own, is never caught: the engine
  rolls no catch there.
- Beyond the scope: the web app gained a Rules tab with the same rulebook, since human seats had none.

**Part D**
- One wording change in the decided paragraph: "a failed order" became "a scheduled or standing order that failed",
  since orders given for the season at hand that fail are read in the next news, not woken for; the list also names
  a servant giving notice, a ransom demanded and, since Parts G and H, the capital and the envoy sentence.
- A move refused by the validator ends a march rather than being retried; orders refused when given wake the king the
  next season.
- A king that reaches the hidden cap can count the seasons it slept; recorded in DESIGN-NOTES.
- The schema's repeated shapes were not shared through `$defs`, since whether strict structured output accepts them
  could not be checked without a live call.
- No web UI for scheduled or standing orders, since human seats never sleep.
- Step 4 (conditional orders) was built whole, not shrunk; the wider condition vocabulary of the design document
  ("unless", treasury, envoy returned, tablet sealed) was not.

**Part E**
- Notes are capped at 2,000 characters a season, not the prompt's example of 1,500, since the simulation's median was
  about 1,990. Three seasons are shown in full, then notes leave the record for the king's summary; before, five were
  shown uncapped and eight more cut to 300 characters, so a king that writes no summary forgets sooner.
- The audience reply can write the ledger too, beyond the letter of E.2, since audiences are where tablets are sealed.
- The king reads "ledger of dealings" (the owner's term was "ledger of promises"), and "by your ledger" still names the
  treasury's books; not renamed (owner's call). The ledger's list of courts includes the king's own (harmless).
- The request-size measurement compares the round just before Part E (`470daa0`) with Part E's head; Parts G and H are
  added separately. Tokens are characters / 3.6; the long-sleep case is synthetic; the turn-20 figures are a
  projection.
- The committed replay test of a model king writing a summary and ledger runs with sleep off; the reviewer ran the
  sleep-on case as a scratch test and it passed, but it is not committed.
- Old, unchanged: a resumed game's model king starts its record afresh, ledger included, and reads "none yet; these
  are the first orders you give", which is then untrue.
- Not built, as asked: the compaction candidates and a cheaper summariser (estimates and a method above).

**Part F**
- The launcher that returns nothing to the orchestrator is described, not built, as asked.

**Part G**
- "Risen above X" (the treasury trigger) is read as "at or above X", the exact complement of "below X".
- The two condition triggers keep their armed state in an existing field, so the log and save version 2 are unchanged.
- Triggers count only moves the king saw; a foreign levy raised in a watched province or next to the capital wakes
  nobody (noted for the siege package).
- Left from the review, minor: the `troops_enter` line does not say "where you can see it"; `unit_moves` set out of
  sight fires when the province comes into sight; `envoy_returns` set on a person hired that season is armed at once;
  its wake reason names the person by id.
- Losses recorded are spies caught and captives executed (the game's only deaths); detained envoys were already
  noticed. An envoy hears of an execution only in the 3 seasons after it, a spy also in the season of it. The window
  is a constant (3), not a setting, to keep the log header unchanged. A carrier's word does not end its own master's
  cover.
- Back pay, from the review, not fixed: a foreign spy posted secretly at a court that still owes it back pay (it served
  there before) is paid by that court, and the court reads the payment. It tells nothing new today, since question 19's
  bug 4 already lists a posted spy in its host's view, but it will leak once that bug is fixed.
- The score counts back pay owed to someone dismissed while away who has not come back; the seat's strength line does
  not show it (seeing it vanish would tell of a death), so the two can differ by that amount. The opening positions
  compute starting strength directly rather than through `Scoring.Strength` (the same, since nothing is owed then).
- The reputation check against the back-pay loophole is not built, as asked; what it would need is listed in G4.

**Part H**
- The section 3.2 plan (an audience without an orders call, never reopening) was replaced by section 4 before it was
  built; the yearly court was dropped as the owner decided (see "Later candidates").
- "The switch" is the existing sleep switch: there is no second switch between Part G's behaviour (an envoy always
  reopens orders) and Part H's.
- From an audience held asleep the king can send letters only. A king that detains an envoy while its orders stand can
  release it only at its next orders call. A letter cannot be cancelled after reopening, only replaced by an order for
  the same person.
- The realm in brief, the letters and the choice come only at a court held asleep; when an order trigger fires too,
  the audience is ordinary.
- Beyond the list: the journal shows audiences held since the last orders, and the web god view counts courts held.
- A failed call at a court held asleep wakes the king for orders that same season (erring toward reopening), and such
  courts are left out of the reopen rate.
- The audience, and so the choice, runs one effort level below orders, as every audience did: left as built, for the
  owner to decide. The "Lands now" line, a count of every power's provinces, stays at such an audience.
- Gold sent back or given as gifts at an earlier audience of the same season is not subtracted from the treasury shown
  at a later one (older behaviour); gold committed by letters is now stated.
- Part H changes the logged host reply within unreleased version 2: version-2 logs with sleeping seats recorded before
  `c05bb98` will not replay.
- The message-kind fallback is not built, as asked; it is estimated twice (a small model's labels and a hand
  labelling), both with the bias toward offering.

**Additions, for the report only**
- The audience estimate was redone under the owner's correction (a yearly court plus pressing matters), then the
  yearly court was dropped as a cost device; the minister, the attention limit and tablets pressing only outside the
  instructions are recorded as later candidates with estimates.
