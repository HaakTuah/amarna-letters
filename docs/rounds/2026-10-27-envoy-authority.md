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
12. **Script kings make no winter crossings by sea**: they plan winter on the map without the dangerous crossings and weigh
    strokes over the passes only. The alternative: weigh convoys to Cyprus in winter too.

## Benchmarks, script games and the feature audit

**The audit at the start** (seeds 1-50 and the solo benchmark, from a clean copy of `develop`): the same figures as item
8's after-numbers, signal for signal. Every feature built so far is used by the script players but one: they never post
a spy to watch a province (reading 10). Found while building: what an envoy hears of the host's reply had lost the host's
clauses since item 8 (reading 11), fixed; and a script king could look up the fear of a king it had heard had fallen
while it still remembered his troops, which crashed a game once the item's changes moved the seeds (fixed: he is feared
not at all).

**After the item**, the same seeds (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): 50 of 50 replay exactly.

| | Before 9 | After 9 | After, `--no-winter-play` | After, `--no-authority-play` |
|---|---|---|---|---|
| Capitals fell (games; kingdoms) | 39; 70 | 38; 69 | 40; 67 | 38; 70 |
| First fall, median season | 19 | 19 | | |
| Entry to fall, median seasons | 16 | 15 | | |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 18, 11, 10, 3, 5, 1, 2 | 27, 11, 5, 4, 3, 0, 0 | 29, 11, 4, 3, 3, 0, 0 | 26, 7, 9, 4, 3, 0, 1 |
| Mean growth (same order) | 4.86, 3.87, 3.34, 2.00, 1.32, 0.58, 2.91 | 4.98, 4.03, 2.82, 2.56, 1.00, 0.67, 2.83 | 4.98, 4.05, 2.90, 2.57, 1.02, 0.66, 2.83 | 4.85, 3.26, 3.19, 2.63, 1.07, 0.75, 2.92 |
| Tablets sealed; detentions | 1632; 343 | 1788; 404 | | |
| Sieges begun / won | 1022 / 819 | 979 / 788 | | |

`--versus solo`, 40 seeds (one current king against six baselines): 9.73 growth alone and 1.27 as baseline over all, 91% and 14% of wins. By power, alone / as baseline: Egypt 7.53 / 0.87, Hatti 11.39 / 1.29, Babylonia 11.57 / 1.09, Mitanni 8.12 / 2.49, Assyria 14.57 / 1.17, Arzawa 6.64 / 1.43, Alashiya 8.25 / 0.58 (9.83 growth alone and 1.24 as baseline over all, 91% and 14% of wins, before). The baseline was adapted only as the rules required (winter
closes nothing for it either; it gives no seal and asks no leave).

What moved, and why: **Egypt wins more and Babylonia less** (27 and 5 wins, from 18 and 10). The same seeds with the
script kings' authority play off give Babylonia 9 and Hatti 7: Egypt and Hatti gain most from the seal and from leave
granted (Hatti's growth 4.03 against 3.26), Babylonia loses by them (2.82 against 3.19). The winter's strokes change
little (14 in 50 games). The rest of what moved comes from winter closing nothing: Cyprus and the passes are open to
everyone in every season, and the seeds play otherwise from the first winter. Egypt's lead is a balance matter for item 18.

**Every feature is every seat's.** The script players use each new rule (50 games):
- **The seal**: given with every tablet a trusted envoy carries; 247 tablets sealed by an envoy's hand (in 45 games): a
  host's own tablet in place of the one it would not seal, a stand against its own foe, peace, leave for its troops, or a
  greedy host's ask of gold beyond the envoy's authority.
- **Repudiation**: 16 tablets repudiated (in 14 games), each one an envoy sealed beyond its authority (a careless,
  disloyal or bought envoy sealing a greedy host's ask of gold).
- **Passage**: 98 grants (in 24 games), almost all on the tablets of pleas for relief; 85 accepted and 20 refused in
  answers; 24 revoked when the grantee turned foe. **Basing**: 5 grants (in 5 games): a script king's war target must
  touch its land under its war rule, so it needs a friend's land only against a king it is sworn against.
- **Winter strokes**: 10 armies crossed a snowbound pass in winter, 2 were lost (in 8 games): rare, as the design asks.
  Against the same seeds with no strokes (`--no-winter-play`): mean growth 2.70 with them and 2.72 without; Egypt wins 27
  against 29. They matter little, and the scripts make them only where they pay; they make no winter crossings by sea
  (they plan winter on the safe map), a gap left for item 13's marching by distance, where a crossing's surprise can be
  weighed against its losses over more than one season.
- **Against the same seeds with the authority play off** (`--no-authority-play`): mean growth 2.70 with it, 2.67 without.
  With half the kings playing it (`--authority-play-half`): those that play it grow 2.81 against 2.61, and win 23 games to 27.
  It helps growth a little and the strong most; why it does not win more is not analysed further: each power's two sides
  there are different seeds, and Babylonia alone loses by it in the full comparison.


## The review

One reviewer (the diff and the item's text) found two blocking issues and eleven others; all fixed but three:
- Blocking, fixed: a model envoy was shown only the words of a host's tablet, not the clauses the engine grants by (it
  now reads them, "which are what binds your lord"); passage through one province let the grantee's travellers through
  all the grantor's closed roads (now only the land granted).
- Fixed: a move on the grantor's own troops in granted land was counted a guest's entry (now an attack, recorded and
  woken as one); a guest moving into its host's walled city could storm the walls (guests go in through the gates);
  passage through all one's land covered land won after the tablet was sealed (now the land held then); a revocation of
  one province of such a grant was refused (now it narrows the grant); an army carried over an open crossing between two
  ends a coastal chain also joins risked nothing in winter (now the route its convoy took decides); the host's tablet's
  field description suggested `passage` for leave in the envoy's land (corrected: `askPassage`); a host and envoy were
  asked about a second tablet after one was sealed (no longer); a host's tablet the envoy did not seal reached its king as
  a bare line (its words now go in the trail); a letter whose seal limits named land since lost was refused whole (the
  engine now leaves such provinces out); a revoke could probe a grant the king did not yet know of (it answers only from
  tablets in his archive).
- Not changed: the court reply asks every envoy's answer for a tablet of the host's own, conditioned in words ("Only if
  this envoy carries his king's seal"), so that its schema stays the same for the cache (item 6b's reading); no winter
  sea strokes by script kings (reading 12); the report's placeholder, written since.

## First guesses (item 18 tunes them)

`winterArmyLoss` 30, `winterFleetLoss` 25, `winterPassPercent` 200, `RoadOdds.snow` 6; leave asked for 9 seasons and passage
on a plea for 6; a greedy host asks 50 shekels for his seal; the script thresholds in the design notes.

## Asked again

Before the pull request the live document was asked again (Build order since 55, War, travel and the seas since 37,
Diplomacy and intelligence since 18): "A kingdom falls with its capital" was revised (the realm comes apart province by
province, built in item 13 with governors) and item 13's text says so; "A crowd in a lawless land" gained the seed's
draw of chiefs (item 11b). Nothing this item touches.
