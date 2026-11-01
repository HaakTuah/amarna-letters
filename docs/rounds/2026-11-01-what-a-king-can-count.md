# Item 17++: what a king can count (in progress)

Branch `item/what-a-king-can-count`, from item 17+'s branch (pipelined, as "The next item on top" says). Weekly usage:
unknown to the session that began it (`scripts/usage.sh`).

## Built so far

1. **A handful holds nothing by itself** (War, "The people defend their land"; `029e8d6`). The ground multiplies the men
   who hold it: as much again as their own strength (with the supports holding them), at most `terrainDefence` of a full
   unit, instead of a full unit's strength added to any holder (`rules/adjudicator.ts`, `groundBonus`). Seven men on
   Mira's hills no longer stop an army of 4,000. A new order, `join` (models: `join`, the target the neighbouring
   province), folds a unit that held into a unit of its king's next door that stood its ground: men, grain, savings and
   the gold for food added, the longest hunger and arrears kept (`turn/resolve.ts`, `joinUnit`). Script kings fold a
   remnant (under a fifth of a full levy, a bots' guess) into the largest unit of theirs next door that is not moving, or
   disband it in their own land with no foe beside it, except at their court's city (`bots/remnants.ts`). Rulebook (war,
   terrain), schema, parse, test (`handful.test.ts`).
2. **A court's books list the land it knows it holds** (the sound lane's find, through the orchestrator, 1 November 2026:
   "make the seat view follow the same rule" as `src/web/src/map/known.ts`; `books-by-word.test.ts`): the seat view's
   provinces are those its sight and the word that has reached it say it holds, so a province lost out of sight stays on
   its books until word comes, and one gained unbeknown is not on them yet. Its figures are the province's as they stand;
   the works list and the income still read the true holdings (a leftover, below).
3. **The province card shows the town and its land apart** ("about 18,000 in the town; about 840,000 on its land"), to
   two figures, from the town's size the engine already keeps (`economyOf(p).town`) and the settled people. README.

## Readings taken

1. **Remnants join, they do not merge in place** (Everything is somewhere; one unit to a province): a unit joins another
   by marching into its province after the season's battles, so both must be next to each other and the one joined must
   have stood its ground; nothing joins at a distance.
2. **The ground's help is a multiple of the holders, capped as before** (Numbers come from their causes): the old flat
   bonus was what let 2 to 15 men hold cities in the improvement audit.

## Where to pick up (this session stopped here at about 450K tokens of context)

Left, in this order, each its own commit, the benchmarks and the use-against-ignore for each script feature at the end:

1. **The governors of 1346 take their grants** (moved here from 17+'s review, reading 34 of its report): Thutmose over
   Kush, Enlil-kidinni over Nippur, Ili-ippashra over Dilmun, Alashiya's governor (EA 40) over the copper hills, and
   Egypt's commissioners where Egypt holds the province (Addaya at Gaza, Pahanate at Sumur); the commissioners over
   vassals' lands (Maya, Haya, Rianap, Tahmashshi, Yanhamu, the commissioner at Kumidi) as open residents in Pharaoh's
   service in those provinces; Hatti's border lords and Babylonia's provincial governors, names drawn and marked
   invented; Tagi and the other town rulers as characters with a share of the province's love. A first attempt in 17+
   (`GovernorsOf1346` in `rules/cast.ts`, a `newGovernor` per name in `rules/factory.ts`'s `more`, status Free, duty
   Governing) moved staff counts, starting terms and every test of an empty governor list (19 failures): expect those,
   and fix each by what changed.
2. **Loyalty is a ledger** and **whom a province obeys** (War; the heart of the item): a per-province, per-actor ledger
   (give and take, credit to the hand seen, fading, starting low, seeded from 1346), replacing item 17's unrest and item
   5's slow absorption; the season's holder by force plus love, with a clear margin, no one below the floor; obedience by
   margin; changes as news with their cause. It also answers 17+'s finding that the chiefs' lands (Kaska 6 of 20 games,
   Lukka 5) fall in the first two seasons, and 17+'s use-against-ignore for holding back pay (level, 0.74 to 0.74), since
   unpaid men remember it in their ledger.
3. **Counts as the scribes knew them**, the census, and **the king says how much he wants** (share or amount), replacing
   item 10+a's tax rate; the seat view and requests showing counts as dated estimates.
4. **One governor over several provinces**, and **a vassal kingship granted** to a governor or any character.
5. **The map**: three steps of each power's colour (direct, governed, vassal), governors' inner borders, the mood of the
   land as a view of its own.
6. Leftovers: the seat view's works list and income from true holdings; sleep digests and wake reasons naming provinces by
   id; treasury and press lines naming powers by id; `svg-renderer.ts` at 52 KB (split in its own PR).

**Stop for review** at the end: the item is marked so.
