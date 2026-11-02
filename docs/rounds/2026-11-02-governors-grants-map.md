# Item 17++, part C: governors over regions, grants of kingship, the map, the audit's script finds

Branch `item/governors-grants-map`, from part B's branch (`item/counts-and-demands`), as "Pipeline, don't wait" orders.
The item's text: `docs/intent/build-order/item-17.md`, "Then **17++**": "one governor may hold several neighbouring
provinces from one seat ... the script kings weighing one trusted man over a region against several over one province
each"; "the grant of a vassal kingship under oath ... Scripts that grant are played against scripts that never do"; "The
map shows it ... three steps of each power's colour ... the mood of the land as a view of its own"; and the audit's
script-king finds (`docs/rounds/2026-10-31-improvement-audit.md`, finds 3, 3b, 4's script side, 9 and 11). Sections:
"Governors" (War, `docs/intent/war-travel-and-the-seas/command-at-a-distance.md`) and "Who holds what, and the mood of the
land" (Interface, `docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`). Save version 40 so far (part
B's); the governor's seat is a new field, so part C's PR takes save version 41.

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

## First guesses (for item 18)

Tribute asked three quarters of a year's yield; a governor four seasons in office before a script crowns him; the man's
ambition 30; the mood steps 900 and 600; a rich king's muster: ten seasons' pay and food beyond his reserve, at most
half his homeland in armies; recall after two restless letters within six seasons.

## Design questions

None.

## Benchmarks and use against ignore

(Running.)

## The review

(To come.)

Questions for Haakon: none.
