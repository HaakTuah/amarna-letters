# Item 9: envoy authority and passage (27 October 2026)

Build order item 9 ("Envoy authority and passage"): first what item 8 began too early to build of Haakon's answers to item
7b (winter dangerous, never closed; a spy's report from a watched province by road), then mandates with engine-checkable
limits, the authority to seal within them, credentials shown or hidden, and passage and basing on sealed tablets
("Envoy authority and resident envoys", "Passage and access"; questions 2, 3 and 14 of the old round report). Branch
`item/envoy-authority`; save version 13. What was built is in `docs/design/15-envoy-authority-and-passage.md`; this report
says why, what it cost and what was found. Weekly usage: unknown (this session cannot read it). Effort: medium, as asked.

## The check for changes

The live design document, asked at the start for changes since the copy (Build order 49, War, travel and the seas 24,
Diplomacy and intelligence 18): one new paragraph, "Land without a ruler" (War, travel and the seas, revision 25): land
nobody governs is what the general rules make of it, with nobody to deal with, its loose men robbing the roads, and a head
rising in time, each part built with its own item (10+, 11b, 15, 17). For this item it means only that nothing there can
be "bought, promised or agreed" until someone rules it: no grant of passage can come from such land, since a grant needs
a king to seal it, and a land without a ruler needs no passage (anyone may march in). Nothing to build. Asked again before
the pull request: see "Asked again" at the end.

## What was built

- **Winter is dangerous, never closed.** No pass and no sea closes (the validator and adjudicator use the whole map in every
  season). An army crossing a pass in winter, or carried over the open sea then, is lost with a chance of 30 in 100; a
  fleet crossing the open sea in winter, 25. A traveller takes twice as long over a snowbound pass and meets the snow
  (6 in 100) on the road; word goes by the fastest road in winter too, an island's included. Size, supplies and the
  commander are neutral until 9+a, 10+a and 13, as the design says.
- **A spy's report from a watched province travels home by road**: no live sight of the province; the report brings the
  troops the spy saw and who held the land, dated when it wrote.
- **Authority**: a king may give an envoy his seal with limits the engine checks (the most gold, the provinces it may cede,
  the provinces it may open to the other king's troops), and show them (credentials) or not. A host may offer an envoy
  that carries the seal a tablet of his own; the envoy may seal it in its king's name, by its hand, and the engine marks
  it within or beyond its authority. The envoy's king may repudiate it, ending what it granted, and the other king is told;
  only credentials shown let him judge whether that was true. An envoy's seal never swears a sworn alliance.
- **Passage and basing on sealed tablets** (`passage`, `basing`, `askPassage`, `askBasing` clauses): passage lets the
  grantee's troops move through the land without taking it (a troop that does not move on overstays and takes it), and
  its travellers through closed roads; basing lets them stand in a province season after season. A grant ends at the
  season named, when revoked (from the next season), when the grantor closes his roads to the grantee, or when the tablet
  is repudiated. A guest's entry is no invasion and wakes a sleeping grantor as guests. Allies relieve a besieged city by
  the passage its holder grants on his plea, with no rule of their own (decided 20 October 2026).
- **Every seat**: the rulebook (AUTHORITY AND PASSAGE, and the winter in NEWS AND TRAVEL and THE SEA), the model schemas
  (the letter's seal and limits, the host's tablet, the envoy's choice to seal, revoke and repudiate), the model's view
  (PASSAGE AND BASING; tablets "sealed by the hand of"), and the web app (the seal on a letter, the host's tablet at an
  audience, the grants with Revoke, Repudiate, the archive's mark).

## Readings taken and design questions

1. **Winter losses for a unit with no size.** Units have no men until 9+a and 13, so "an army loses men for each season in
   the crossing" is read as a chance of losing the whole troop (30% for an army, 25% for a fleet), size neutral. The
   alternative: no loss at all until armies have men, only the slower pace.
2. **Basing and passage told apart by time.** Passage covers a troop only in a season it moved into the province; one that
   holds there overstays and takes the land, as any troop does. Basing covers standing there. The alternative: passage
   covers standing too, for a set number of seasons.
3. **Trade rights wait for 9+b**, where caravans first trade at foreign markets: a trade right before then would oblige
   nothing, and a clause that implies a right nobody can use breaks "Requests are rules too".
4. **A grant on a tablet, not an order.** Passage and basing come only from a sealed tablet's clauses, as the item says;
   the grantor alone can end them, by revoking or closing his roads. The alternative: also a one-sided grant by order.
5. **Passage lets travellers through closed roads**, and closing one's roads to a king ends what one granted him.
6. **The engine never blocks an envoy who seals beyond its authority**: it marks it, and the king may repudiate. A careless,
   disloyal or bought script envoy seals beyond it; a faithful one does not.
7. **The other king learns whether a repudiated tablet lay within the limits only from credentials shown**; the engine tells
   nobody else.
8. **Audiences keep two exchanges** with the seal (the old plan's third was not needed: the host offers and the envoy seals
   in one exchange).
9. **A guest's troops are not sheltered or betrayed by any new rule**: the grantor's troops may still attack them, which is
   the trust bet.
10. **Script kings never post a spy to watch a province** (they spy on courts, whose reports cover the court's land and its
    borders): found by the audit at the start, not patched, since a court spy does what a province spy does for them and
    more. The alternative: a script rule for watching a province.
11. **`asHeard` fixed**: what an envoy hears of the host's reply now carries the host's clauses, which item 8 dropped, so a
    script envoy never heard a call for an oath given in clauses; and the host's tablet.

BENCHMARKS_AND_AUDIT

## First guesses (item 18 tunes them)

`winterArmyLoss` 30, `winterFleetLoss` 25, `winterPassPercent` 200, `RoadOdds.snow` 6; leave asked for 9 seasons and passage
on a plea for 6; a greedy host asks 50 shekels for his seal; the script thresholds in the design notes.
