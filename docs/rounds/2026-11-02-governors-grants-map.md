# Item 17++, part C: governors over regions, grants of kingship, the map, the audit's script finds

Branch `item/governors-grants-map`, from part B's branch (`item/counts-and-demands`), as "Pipeline, don't wait" orders.
The item's text: `docs/intent/build-order/item-17.md`, "Then **17++**": "one governor may hold several neighbouring
provinces from one seat ... the script kings weighing one trusted man over a region against several over one province
each"; "the grant of a vassal kingship under oath ... Scripts that grant are played against scripts that never do"; "The
map shows it ... three steps of each power's colour ... the mood of the land as a view of its own"; and the audit's
script-king finds (`docs/rounds/2026-10-31-improvement-audit.md`, finds 3, 3b, 4's script side, 9 and 11). Sections:
"Governors" (War, `docs/intent/war-travel-and-the-seas/command-at-a-distance.md`) and "Who holds what, and the mood of the
land" (Interface, `docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`); and "every change of hands is
taken up, never thrust on anyone" (War, "Whom a province obeys", `docs/intent/war-travel-and-the-seas/territory-and-military-part2.md`;
decided 2 November 2026, Haakon: "Yes ro absolutely all pt these! Extra expertly expertly!"; the item's text: "built in part C,
or in a part of its own if part C has merged"). Save version 42 (the governor's seat, then the declarations).

## Built

1. **The audit's find 11**: a host that seals a vassal tablet answers its requests as the seal does, never refusing in
   words a tribute the sealed tablet records (`statecraft-clauses.ts`, `answerLetter`; test in `vassal-play.test.ts`).
2. **The audit's find 9, in part**: script kings no longer keep walls where no town stands (`works.ts`) nor send runaways
   back to a king with no land (`borders.ts`).
3. **One governor over several neighbouring provinces** (`Governor.seat`, `seatOf`): the same order (`govern`, the model
   action `grant_governorship`, the web's governor row, which now offers a sitting governor for a province beside his)
   gives a governor of ours a province beside one he holds; the word reaches him at his seat and his word goes on from
   there; his letters on a far province's mood reach him late and the king from his seat (`tell`'s `extra`); recalled,
   a disloyal one turns with those of his provinces whose people would follow him, ruling them from the first (his seat if
   it goes), and the rest stay his king's; stepping down from one, he keeps the others and stays at his seat. Rulebook
   (`rules-command.ts`). Tests: `governors-region.test.ts`.
4. **Script kings** give a trusted governor (four seasons in office, his land not written of as restless) the threatened
   province beside his own, rather than a new man (`generals.ts`, `governorOrders`).
5. Found and fixed in part A (#375) and carried here: a recalled governor's own regard was counted for his king.

6. **Grants of kingship under oath** (`crown`; `grant_kingship`; the web's "Grant the kingship"; the "Crown" request):
   design note `docs/design/49-governors-grants-map.md`. Tests: `crowns.test.ts`.
7. **Script kings grant** where the tribute nets more than keeping (`bots/crowns.ts`); `--grant-play-half`.
8. **The map:** three steps of a realm's colour, governors' blocs bounded, the governor or overlord on the province card,
   and the mood of the land (the ◐ button). Test: `web/test/map-holding.test.ts`.
9. **The audit's finds 3, 3b and 4's script side** (`bots/audit-play.ts`, `statecraft-strategy.ts`,
   `statecraft-letters.ts`); `--audit-play-half`.
10. **Taken up, never thrust on anyone** (`GameState.declarations`, `turn/declarations.ts`; design note 49): a province
    whose people favour a power with no army in it, clearly over its holder (or the floor, without one), declares for him;
    word reaches his court; it stays its holder's until his word taking it up (order `answer`, model actions
    `take_up_province` and `refuse_province`, the orders panel's "Take it up" and "Refuse it") reaches it, then passes as
    the next season is reckoned if it still leans his way. Refused, its ledger takes 20 from him; unanswered or no longer
    leaning, it lapses. A cession is a claim the giver holds until the receiver takes it up and the giver's troops are gone
    (his army already there takes it at once, as before). Seat view `declared`, the model's PROVINCES THAT LOOK TO YOU,
    rulebook (UNREST AND FREE CITIES, and the cession line), README. Tests: `declarations.test.ts`.
11. **Script kings take up what pays** (`bots/declarations.ts`): ceded land always; a declaration unless its holder is a
    friend or it lies over three courier seasons from the court, refused at once; `--take-up-play-half` against kings
    that take up everything.
12. **Part B against its sections** (the orchestrator, 2 November 2026: the three sections are in the design copy as bold
    run-in titles, `docs/intent/world-and-history/voice-of-the-age-letters-customs-and-vocabulary.md`, line 54). Four
    gaps, fixed here: a count shows two figures while under a year old and one once older ("some 600,000",
    `countFigures`, `toFigures`); a land never counted only a rough guess, one figure of what its land carries; a king's
    stores and his demand's take as his stewards round them, to two figures ("about 440 measures"); and each court's
    starting counts as its sources suggest (`StartCountAge`: Egypt two seasons old, every other court two years). The
    province card (looking back too: frames keep each count's season), the orders panel, the town marker, the model's
    prompt and the rulebook follow; god view stays exact. Tests: `counts.test.ts`, `map-known.test.ts`,
    `people-play.test.ts` (Hatti's old count now asks a share, Egypt's fresh one an amount).
13. **The corvée as a share** (#411; the owner, 2 November 2026: "Yes, agreed to all expertly!", to the design session's
    take that "the corvée is asked as a share as well as an amount, as the design already says ("for grain, levy and work
    gangs alike")"): order `build` by corvée with a share of the men at home (model action `build_corvee_share`, the
    web's share box), less what the province hides at its count's age; the work goes as fast as the men who come, a
    share short of a project's need doing part of a season's work (`WorkPlan.done`), carried on. Script kings name the
    men by a fresh count and ask a share by an old one (`corveeShares`, within `--count-play-half`). Rulebook
    (`rules-works.ts`), design note 48, README. Test: `works.test.ts`.

## Readings taken

1. **"A governor or any character over the provinces he holds"**: a governor is granted provinces he governs, his seat
   among them; a man at court, neighbouring provinces of the king's, setting out with the word to the first named. Never
   the city the king holds court in (as a governor cannot turn it, item 17). Principle: "Everything is somewhere".
2. **"Its price, tribute and terms are whatever the two sides agree"**: the king names tribute and price; the man answers
   by his stakes (the season after the word reaches him, so a model may answer), and a refusal carries his own terms home
   in his words (a model's reply; a script's "I would take it for N shekels of tribute a year"), which the king may offer
   again as an ordinary order. What he weighs is the yield he can know: a governor of all of it what passed through his
   hands, anyone else what the king's stewards report, to two figures (round 1). Principle: "No menus" and "Requests are
   rules too".
3. **The price travels**: paid from his purse when he takes it, carried to the king by courier from his seat. Principle:
   "Everything is somewhere" and "Nothing appears or vanishes without a cause".
4. **The oath is a vassal tablet like any other** (tribute, service, protection), sealed at the grant, a copy in each
   archive: keeping it is the vassal's order. Principle: "Keeping a promise is an act".
5. **The king's troops left in the land weigh as his** by part A's rule, so granting land where his army stands may bring
   it back to him: no rule forbids it, and the scripts grant only where none stands. Principle: "Don't prohibit; give it its
   real cost".
6. **The script king's sum**: keep = a year's yield less the share hidden at the count's age and distance, halved where
   the land is written restless or went hungry; tribute asked = three quarters of a year's yield (a local king draws more
   than a far overlord). First guesses. Principle: "Whether a grant pays is the king's own sum".
7. **The man's sum** (script): the price within his purse, the tribute and a quarter of the price within the land's yield
   a year, and ambition of 30 or more, or half the yield left him. First guesses. Principle: "Skills set the odds; the
   character decides".
8. **What a seat sees on the map**: its own governors, as it knows them (one whose end has not reached it still stands),
   and the vassal bonds on the tablets in its archive (a third court keeps a bond it was never told was repudiated); others'
   governors are not shown, since no news of them is carried yet. The mood of the land is a dated record each court
   receives (`GameState.moodReads`, round 1): its governors' reports every season (as honest as they are), its spies' of
   the provinces they watch, its envoys' of the city of a court they visit, its scribes' of the province they count, and
   travellers' talk, a blurred word of land within two hops of its court that it has heard nothing of in three seasons,
   a season late, the worst of the province and its neighbours, "near revolt" as "restless"; and its own eyes at its
   court. Each read ages from when it was seen. The map, the model's prompt (THE MOOD OF THE LAND) and the seat view
   (`moods`) show the same. God view: obedience of 900 thousandths loyal, 600 uneasy, below restless. Principle:
   "Information moves in physical time" (pillar 4).
9. **The audit's find 4, script side**: a seat sees a province's gold only summed with the realm's, so a governor's
   skimming cannot be told province by province; the evidence a king has is his governor's own letters, and two restless
   letters in a row with no foe beside the land, and no levies he could turn with, is the recall. Principle: "Deceit is
   information".
10. **The audit's find 9, what remains**: putting mouths out of a city whose siege lifted in the same season, orders for
    troops lost in the season's battles, and errands given with a job offered in the same season are orders given on what
    the king knew; a competent player gives them too, and the engine's refusal is the news. No patch. Principle:
    "Information moves in physical time".

11. **The acts of rule that take a province up**: the item names an order to take or hold it, a governor, a demand and a
    letter accepting it. Troops standing in a province were sent to take or hold it, so they take it by the season's rule
    as before. A governor and a demand can be given only for land one holds, so for land that looks to a king the act is
    the letter accepting it, the order `answer`, which travels to the province as any order does. Principle: "No menus"
    and "Information moves in physical time".
12. **Who may be declared for**: a power with no army standing in the province, by the same weight and margin a rival
    power must clear (or the floor, for land without a ruler); never a court's own city or a besieged one, which change
    hands only to troops within or by the siege. Persons are asked through the "Rising" and "Crown" requests already built,
    and only where they stand. Answered on #431 (below): a province may declare for a favourite who is not there, but the
    offer never arrives by itself; who carries it is part D, built next.
    Principle: "Different data, same rules".
13. **A cession while the giver holds it**: "until then it stays with its old master", so the giver keeps the land, its
    tax and its levies until the receiver takes it up; then the giver's officers withdraw, and it passes if his troops are
    gone and its people accept the receiver (his weight above the floor, as land without a ruler weighs anyone). A capital
    ceded whole (item 11d) is unchanged: both sealed the tablet that gives it, which is his taking it up. Principle: "A lever
    and its counterweight are built together".
14. **The script kings' sum**: taking up land from a friend breaks faith with him, and land past three seasons of road is
    held only by its people's favour, its tax and defence coming late; both cost more than they bring, so the scripts
    refuse them at once rather than leave them hanging. Principle: "Every feature is every seat's".

15. **A share short of the upkeep keeps nothing that season**: upkeep is all or nothing (a level kept or decaying), so
    part of a season's upkeep has nothing to do; only a project goes "as fast as the men who come". Principle: "The
    smallest rule that does the job".
16. **Where a corvée by share stands**: a share asked for one work, not a standing share of every work in a province,
    since each work's order already names its province and its pay. Principle: "No menus".

17. **A court's view waits for word** (round 1, "Hidden information"): a governor's end (death, turning, the land lost,
    his stepping down), a kingship's answer and the oath's copy, a declaration's end and its taking-up each reach the
    court's view, the model's prompt, the map and the script kings only when their word does (`governorsGone`,
    `Crown.heard`, `Declaration.gone` and `takenKnown`). A third court holding a copy of a vassal tablet keeps the bond,
    since only its two parties are told of a repudiation. Principle: "Information moves in physical time".
18. **A regional governor acts from his seat**: he levies against a threat to a far province of his as it stood when word
    of it could reach his seat and his order come back; a turning governor's levies that follow him elsewhere leave the
    king's service where they stand, loose, since they cannot reach him. Principle: "Everything is somewhere".

## First guesses (for item 18)

Tribute asked three quarters of a year's yield; a governor four seasons in office before a script crowns him; the man's
ambition 30; the mood steps 900 and 600; a rich king's muster: ten seasons' pay and food beyond his reserve, at most
half his homeland in armies; recall after two restless letters within six seasons; a refusal's entry in the ledger 20; three courier seasons as the
farthest a script king takes up a declared province; starting counts two seasons old for Egypt and two years for every
other court.

## Design questions

- #431, answered by the owner (2 November 2026, 13:10 UTC, archive item 157): "Yes, expertly, if you think it is best."
  And on who carries the offer (13:14 to 13:19 UTC, archive item 158): "Is the messenger a character it hires then?",
  "But characters don't live anywhere, so it has to be a character who is paid or for some reason takes the mission for
  free on his own accord?", and "Agreed, expertly. Though this is also information he can pass on or sell. I guess even
  just a rumor can spread? Maybe the town must be really into someone and have the means, if they commission a message
  and courier? And this is valuable information for the king of the land, or his enemies." Written into "Whom a
  province obeys" (War, revision 95). Not built here: a declaration's word still reaches its power by `tell` at the
  roads' pace, which the new text replaces with talk, a commissioned courier, a willing character or the claimant's own
  envoy or spy. That is more than an hour's work, so it is part D, built next from `develop` before 17++a (the orchestrator's decision).
  The path is left in C rather than taken out, since a declaration exists only for a power whose troops are not there:
  taking the offer out would empty the taking up, the refusals and the cessions this part builds. D replaces it.

## Benchmarks and use against ignore

"The final head" below is 6e88338, after round 3. Round 4's fixes (4c63038) touch only views, order checks, a repeated
answer and the growth baseline of a risen realm, not the choices these runs measure, so they were not run again.

**Grants** (`--grant-play-half`, 50 games, seed 1, the final head): kings that grant against kings that never do:
**0.94 growth to 0.86, 28 wins to 22: pays.** Use and success: kingships offered in 28 of 50 games (95), 24 taken (20
games), 67 refused. An earlier head measured them even (0.87 to 0.87, 24 wins to 26), and the reading then was that the
land's multiple makes land too dear to give away: a king's strength counts his land at ten seasons of what it produces,
and a grant takes all of that out of his score at once while the tribute joins it only as it arrives. The scripts grant
only where they lose least (restless, hungry or far land), and with the price now riding home with the answer and the
region's seat kept, that pays. The land's multiple against tribute stays a finding for item 18.

**Taking up** (`--take-up-play-half`, 50 games, seed 1, the final head): kings that take up the provinces that look to
them where it pays and refuse the rest, against kings that take up every one: **0.94 growth to 0.86, 26 wins to 24:
pays.** Use and success: provinces declared in 47 of 50 games (884), 845 taken up, 79 refused, 490 passed to the king who
took them up (`obey-taken`); the rest lapsed before his word arrived or were still waiting at the end.

**Governors over regions** (`--region-play-half`, the final head): kings that give a trusted governor the threatened
province beside his own, against kings that never do: **0.96 growth to 0.89, 33 wins to 17: pays.** Regions given in 49 of
50 games (463).

**The audit's finds** (`--audit-play-half`, the final head): **0.94 growth to 0.86, 27 wins to 23: pays.** On an
earlier head (a0c18e5) they paid 0.95 growth to 0.82, 26 wins to 24; without find 3 (raise troops when rich), 0.94 to 0.86, 30 to 20. Find 3 is kept: the
full set gains more growth, and the loss first measured (0.88 to 0.90) was on a head before round 2's fixes.

## The review

- **Claude's fault-finding reviewer** (Opus, high), with "Hidden information" word for word in its brief: round 1, 4
  (findings fixed in the same round); round 2, 6 (the seasons the views waited for one season early); round 3, **10**, nothing open.
- **Fable's design check** (medium): round 1, 7 (findings fixed); round 2, **10**.
- **Codex:** round 1, seven P1s (fixed in 379b716, among them the regional governor's levies and their lag, and a reduced
  world for the feature tests, answered as on part B); round 2, clean; round 3, four P1s (the kingship's price before
  its answer, a far refusal shown at once, a governor's lost seat, a ceded claim ended by a siege), fixed in 6e88338;
  round 4, four P1s (the seat when its province is given up, a moved seat shown before word of it, a repeated taking up
  that put its confirmation off, a granted realm's growth counted from its seat alone), a P2 (a grant refused for a loss
  the court had not heard of) and a CodeQL warning (a backtracking pattern), fixed in 4c63038; the same leak in the
  older `govern` check is filed as #467; round 5, two P1s (a stale grant that set out a governor already gone from his
  post; a governor of two whose rising decisions overwrote each other, so he never rose) and a P2 (a kingship's outcome
  shown in its king's events before its word came), fixed in 746e25a and 6fcc832. A man now decides on a rising once a
  season, for the first province he is asked about; round 6, a P2 (cession events shown to the parties before word
  came), fixed with three tests whose setups the new cession and starting counts outdated; round 7, a P2 (orders on
  governorships checked against live ones while the view keeps those ended out of sight), fixed in 2946e63
  (`governorsKnown`).
- **Escalation** ("Reviews", point 4, in `docs/claude-and-codex.md`: past three rounds, the escalation helper instead of
  an eighth): Opus, high, with every round's findings and fixes in its brief, "History holds" and "Hidden information"
  word for word. It found every earlier fix sound, and two P1s, both fixed in its round: a grant beside a governor whose
  seat had moved out of sight showed the new seat (the record now carries the known seat, and the word goes there and
  on); and round 7's guard refused a man back at court, and let a grant beside a governorship recalled in the same orders
  pass the checks only to fail as it was carried out (now refused at once). Score **10**, nothing open. Its idea: a
  governor's own letter could carry word of his moved seat.

Questions for the owner: none new. #431 is answered (above); it stays open until the carriers are built. Filed: #467
(a bug, outside this part: order checks that reveal a far loss).
