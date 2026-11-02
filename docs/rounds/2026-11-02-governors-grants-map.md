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
   by his stakes (the season after the word reaches him, so a model may answer); no counter-offer in this part, since a
   refused grant may be offered again on other terms, an ordinary order. Principle: "No menus" (one thing happens by rule,
   then ordinary actions).
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
8. **What a seat sees on the map**: its own governors, and the vassal bonds on the tablets in its archive; others'
   governors are not shown, since no news of them is carried yet. The mood read comes from its governors' letters, dated,
   and its own eyes at its court; travellers' talk, spies, envoys and a census give no mood read yet, since none of them
   carries one in the engine. God view: obedience of 900 thousandths loyal, 600 uneasy, below restless. Principle:
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
    hands only to troops within or by the siege. Persons are never declared for: they choose by their stakes, as the
    section says, through the "Rising" and "Crown" requests already built. Principle: "Different data, same rules".
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

## First guesses (for item 18)

Tribute asked three quarters of a year's yield; a governor four seasons in office before a script crowns him; the man's
ambition 30; the mood steps 900 and 600; a rich king's muster: ten seasons' pay and food beyond his reserve, at most
half his homeland in armies; recall after two restless letters within six seasons; a refusal's entry in the ledger 20; three courier seasons as the
farthest a script king takes up a declared province; starting counts two seasons old for Egypt and two years for every
other court.

## Design questions

None.

## Benchmarks and use against ignore

**Grants** (`--grant-play-half`, 50 games, seed 1): kings that grant against kings that never do: **0.87 growth to 0.87,
24 wins to 26: even.** Use and success: grants offered in 32 of 50 games (85), 25 taken (17 games), 58 refused, 2 no
longer possible when the word came; every taken grant became a seat of its own (`risen-granted` 25). Which of the item's
two answers: **the land's multiple makes land too dear to give away**, rather than bad play. A king's strength counts his
land at ten seasons of what it produces, as far as it obeys him, and a grant takes all of that out of his score at once,
while the tribute joins it only as it arrives, three quarters of a year's yield a year; the scripts grant only where they
lose least (restless, hungry or far land), and the refusals (ambitious men take three-quarter tribute, others only half)
keep it rare. A finding for item 18: the land's multiple against tribute, and the men's terms.

**The audit's finds** (`--audit-play-half`): running.

## The review

(To come.)

Questions for Haakon: none.
