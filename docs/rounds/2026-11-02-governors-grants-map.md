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

## Built so far

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

## Where to pick up (2 November 2026)

- **Not yet built:** (a) the grant of a vassal kingship under oath: an order naming a governor (or a character at court)
  and the provinces he holds, the price and the tribute as agreed between the two (the character's acceptance by his
  stakes, a "Grant" request for model characters as part A's "Rising" request does), the land becoming his power bound as a
  vassal by item 11+'s tablet, tribute in place of the yield; script kings grant only where tribute and price net more
  than keeping, after distance's frictions (part B's `hiddenIn`) and the risk of losing it; `--grant-play-half` against
  scripts that never grant. (b) The map's three colour steps (ruled, governed, vassal) with thin inner borders round each
  governor's provinces and his name and seat on the province card; the mood of the land as its own view, four coarse
  steps from what the seat was told, dated. (c) The rest of the audit's finds: 3 (rich kings hoarding while their armies
  dwindle), 3b (threats never followed: threaten only what they will do, or do it), 4's script side (scripts never
  unseating a governor: part B's counts give them a way to see a shortfall), and 9's remaining refusals (expelling where no
  siege stands, errands to people not hired, orders for troops no longer held).
- **Then:** the design note (`docs/design/49-...`), README, save version 41, the benchmarks and use against ignore
  (granting; the governor's region by `--command-play-half`), the feature-use counts, and the PR with Codex's review and
  the design check started together.

Questions for Haakon: none yet.
