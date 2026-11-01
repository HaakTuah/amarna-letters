# Item 17++, part A: whom a province obeys

Branch `item/whom-a-province-obeys`, from `develop` at `f1de2cd` (17+ merged, then the review-rule docs). The item's text:
`docs/intent/build-order/item-17.md`, "Then **17++**"; this part's sections: "Whom a province obeys", "Loyalty is a
ledger", "Revolt follows conditions, not dice" and "The people defend their land" ("A handful holds nothing by itself")
under War, and "Governors" (the commissioners and the town rulers as characters). Design note:
`docs/design/47-whom-a-province-obeys.md`. Save version 39.

This account cannot reach the live design document (the docs connector refused the read: "forbidden", role). The copy on
`develop` was read instead, and its diff since `f1de2cd` checked before the pull request: nothing changed.

**17++ in parts.** The item is the largest in the order (the census, the king's demands, counts as the scribes knew them,
governors over several provinces, grants of kingship, the map's three steps and the mood of the land, besides this
part). Each part is its own pull request, reviewed as the rules say, so that each review sees a whole that can be judged:
A (this), B (counts, the census, share or amount, the province card's town and land), C (governors over several
provinces, grants, the map, the audit's script finds). Nothing in A waits on B or C to be played: the tax rate stays until
B replaces it, as the item's text orders.

## What was built

1. **The ledger** (`GameState.ledger`): each province's people remember what each actor gave and took, fading a tenth a
   season; takings and givings as the note lists. It replaces item 17's unrest stocks and slow absorption.
2. **Whom a province obeys** (`obeySeason`): force plus love, changes of hands by a clear margin, degrees of obedience
   (the tax and strength by them), lawless land, risings led by the man the people favour, put down or overwhelming a
   handful; news with its cause ("Gubla now answers to Amurru: ...").
3. **A handful holds nothing**: a far weaker unit is destroyed even where its land held the attacker out; order `fold` for
   every seat (engine, rulebook, model actions, the web orders panel); script kings fold or disband remnants.
4. **The loyalties of 1346**: home and held land, the stakes, Aziru's house at Gubla; the governors of 1346 in office as
   grants; Pharaoh's commissioners as open residents; town rulers as characters with their following.
5. **The seat view follows what the court knows** (the sound lane's find): its own provinces as it knows it holds them.

## Readings taken

Each with the principle it rests on.

1. **Conquest is the season's rule alone** (round 2, design point 9; "conquest is force tipping it", "Every way a province
   changes hands is this one rule"): marching in takes nothing; storming walls breaks in (the walls a level lower) and the
   stormers stand within them; as the next season begins the province answers to whoever its rule finds. A siege's
   surrender stays the city's own act ("How long a siege lasts": the gate opened from within by its starving people), as
   cession and a kingdom's fall stay their own sections' rules. Replaces round 1's "conquest on entry stands".
2. **Next door counts for everyone, a quarter and only a little in all** (round 2, design point 5; "troops standing in it
   or near enough to answer it"; No rule checks which power it is): men next door, or standing before walls they have not
   stormed, weigh a quarter of men within, at most `nearMost` 25 [G] in all, for holder and rival alike, so a neighbour's
   army at home is a pressure but never takes a loved province by itself (round 1 found an uncapped next door flipped
   Hazzatu and Ṣumur in the first season). A rival is still a power with troops standing in it, or a man of standing there.
3. **The people rise against troops they hate, and fight them** (round 2, design points 8 and 13): a province below what
   its people accept falls lawless whether or not its master's troops stand there: if they do, the people rise and fight
   them as a battle goes first (`risingWins`).
4. **Native or held at the start, by tongue** (Different data, same rules): a king stands `home` 100 where his court's
   tongue is its people's, `held` 40 elsewhere (Luwian Kizzuwatna, Nesa and Tuwanuwa under a Hittite court; Canaanite
   Hazzatu and Ṣumur, Amorite Sinai and Nubian Kush under Pharaoh; Dilmun and Suhu under Babylon) [C: the tongue as the
   measure of whom a house grew from].
5. **Famine counts against the hand they see** (Loyalty is a ledger: "credit goes to the hand they see"): a famine under a
   holder who takes his tax is his failing in their eyes, his governor's where he has one.
6. **The tax above or below the usual third is the exchange** ("A fair exchange is neutral"): the usual tax is what
   protection is worth; a point above it takes, below it gives. Item B replaces the tax rate, and with it this entry.
7. **The governors of 1346 hold no levy mandate at the start** (No menus; the king's orders): a mandate is the king's to
   give; with one, Hatti's border lords levied against the Kaska in the first season of every game.
8. **Invented governors are ordinary people of the court's region already in the pool** (Nothing appears without a cause;
   every seed keeps its first eighteen): Hatti's lords of the watchtower and Babylonia's provincial governors, their names
   lost, are drawn from the pool's free people at those courts, so the pool and its draws stay as they were.
9. **A person of 1346 taken from another court's service into his post is replaced there** (staff by size, item 11+):
   one of the free people beyond the first eighteen takes the job, with a public fact saying whom he replaced.
10. **Commissioners are open residents: a watcher nobody hunts, staying years** (the text: "an open resident", "the errand
    'stay and report, as a resident'"): a posted watcher's job as a spy has, with `openly` set; his term runs to turn 16-24
    [G] at the same fee a season; he does not walk home with his reports when no carrier comes.
11. **A town ruler's men are his town's following, counted in his share of love** (Everything is somewhere; one unit to a
    province): Tagi has no unit of his own, since a band would be outlaws and a second unit in Magidda cannot stand.
12. **A remnant is fewer men than a quarter of a full levy** [G], and folds into a larger unit of its kind next to it that
    stays put; a fold takes the season, after the moves; not a unit under a commander or with a hired band, whose terms are
    their own.
13. **The force scale: as many troops as its men weigh `force` 100** (round 2, the early falls; "Numbers come from their
    causes"; "weighed against its own men of fighting age ('The people defend their land')"): combat counts the people's
    men one for one with soldiers, so fear does too; twice the men in hill land and half on open plain, as the people
    defend by their ground. Round 1's first guess, a tenth of the men for 100, let one army cow any province at once
    (below, "The early falls"). At most `forceMost` 100 [G], what a native house's standing in its own land starts at
    (`home`): fear alone never outweighs a house's long credit with its own people until that credit fades or is spent
    ("land a power has fully absorbed starts loyal, its ledger long in credit, and needs far more to rise"). Round 1's cap,
    200, let a full army take a native land the season after it beat its army: the first guess was wrong, not the rule.

14. **A court's own city changes hands only to a foe's troops standing within it** (a coup is not modelled, as item 17
    read it): it waits for item 17b ("A realm holds by its ledger"), which makes the capital wherever the court is.
15. **Aziru's house stands for the villages gone over to the Habiru at Gubla** [B]: the Habiru there were the Amurru
    brothers' men in the letters (EA 74-91), and the bands of the map are not a power that can hold land, so the share goes
    to the house that led them.
16. **The seat view's leak rides here** because the orchestrator's brief put it in 17++: it is the same question, which
    provinces a court knows it holds, that this part's changes of hands make common.
17. **A man of standing is asked, and his choice is taken the next season** (round 2, design point 7; "Persons ... choose by
    their stakes"; Skills set the odds, the character decides): each man whose following would clear the master's weight
    is asked ("Rising"); a script answers by the strategy his traits give him (ambition at least 50 and not loyal to the
    holder, as before), a model for himself; a rising he chose breaks out the next season if they would still follow him.
    The season between is the moment ripening, and keeps a rising from coming faster than word of it (pillar 8).
18. **A rising's men are the land's men as far as they lean to the leader over their master** (round 2, design point 8;
    "troops of the master in the province fight them as combat says"): its men of fighting age by his standing less the
    master's (at least `riseLeast` 10 in a hundred [G]), and his band; against the troops and, as far as they love the
    master, one in `loyalShare` 4 [G] of its men ("they fight beside it"); counted as units' men are (`LandData.armyMen` a
    full unit) and settled by `battleLosses`. Beaten troops stay where they stand, as a beaten unit with nowhere to fall back
    does not vanish; the next season's rule weighs them.
19. **The people's hostility to an invader is 100, plus half their standing with the master he comes against, less half
    their standing with him, from 0 to 200** (round 2, design point 8; "how hostile they are to the invader ... follows what
    the taker has done to them"): a king come back to a homeland that loves him (100) meets half the hostility, as item
    11e's `hostileHome` 50 did, which this replaces.
20. **Grain handed out gives, most in a famine, to the hand they see unless in the king's own name** (round 2, design point
    2; "Credit goes to the hand they see ... unless it comes in the king's own name, by his envoy, his stela or his
    proclamation"): `grain` 20 [G] for a season's need where the people went hungry, a quarter in plenty; `feed` with `own`
    (models: `feed_town_in_own_name`; the web: "Feed the town in your own name"), proclaimed by the courier who carries the
    order, so it costs the order's journey and nothing more. A siege lifted by the holder's troops gives `relief` 20 [G]
    with the victory. A band's robbing takes, against its chief.
21. **Script kings give by the ledger where their governors write of unrest** (round 2, design point 2): beside the tax
    relief item 17 built, they hand grain from the stores to a restless province's town, in their own name where a governor
    stands (the wary king of the text); measured with `--freedom-play-half`.
22. **An army's ledger: pay, plunder and victories to the hand they see, wages unpaid to the king** (round 2, design point
    3; "For an army, pay, plunder shared and victories give; wages unpaid, defeats and hunger take"): the hand they see is
    the commander, or the governor of the province a levy was raised from while it stands there, else the king; the king
    withholds or cannot pay, so missed pay is held against him. The armies of 1346 start at `held` 40 with their king
    ("Starting data can still say what history did"); a new levy at nothing ("It starts low").
23. **Men follow a leader against their king as far as 50 in a hundred, plus his standing less the king's** [G]: the
    middle when neither has given them anything, all of them once he stands 50 above the king. A commander refusing his
    recall, and a governor rising or refusing his, take only those; a governor whose province would not follow him turns
    with them as a band (as he did in his court's city before), ruling it only if its people would follow him.
24. **Mutiny for missing pay stays item 17+'s count of seasons** (the item's text names turning governors and commanders'
    armies, not mutiny): it is the men's own act at their limit, which item 18 may read through the army's ledger.
25. **A cession failing because the land was lost after movement is now a siege's case only** (conquest at the season's
    start): the test for it was removed with the case that cannot arise; a siege's surrender in the same season still
    reaches it.
26. **The master's weakness weighs only against a rising** ("the master's weakness ... not an entry in the ledger but the
    moment, when a low standing becomes a rising"): against a foreign king's troops, his beaten armies already count as the
    force he has left, so his losses are not counted twice.

## Design questions

None. Everything the sections left open was settled by "The game in one page" and the pillars (readings above).

## Benchmarks and use against ignore

20 games, seed 1, `--verify-replay`, every replay exact.

| | Before (17+ as merged) | Round 1 (`5e72ff3`) | Round 2 |
| --- | --- | --- | --- |
| Games where a capital fell | 20 of 20 | 20 of 20 | 20 of 20 |
| Kingdoms fallen in all | 373 | 602 | 318 |
| First fall, median season | 1.5 | 1.5 | 4 (range 4-7) |
| Games with a kingdom fallen in its first two seasons | 11 (Kaska 6, Lukka 5, Shasu 2) | 20 (Carchemish 11, Megiddo 7, ...) | **0** |
| Revolts (led, lawless; put down) | | 41 (26, 15; 1) | 73 (1, 72; 37) |
| Seats risen in play | | 90 | 21 (19 elders, a governor, a revolt) |

Winners, round 2: Egypt 5, Babylonia 4, Hatti 2, Azzi 2, Akko 2, Assyria, Kaska, Lukka, Tyre and Gezer 1 each.

**The early falls, and pillar 8.** Round 1's falls had two causes. (1) *The rule as built, not as designed:* the season's
reckoning let an army standing before a city's walls cow the city, with no storm and no siege, so a walled capital whose
garrison was beaten fell the next season (Carchemish, Megiddo, Aijalon, Qatna); the design's walls and its people on them
hold such an army out ("The people defend their land"), so troops before walls they have not stormed now weigh as troops
next door, and conquest is the season's rule alone (readings 1-2). The master's weakness was also counted against a
foreign king's troops, on top of his beaten armies' lost force (reading 26). (2) *A first guess, not the rule:* one army
weighed 100 for a tenth of a province's men, and up to 200, more than a native house's own standing (100), so a full
army cowed any homeland the season after it beat its army, the hill chiefs' lands most of all (Kaska and Lukka, the
finding 17+ sent here); now as many troops as its men weigh 100, and fear alone weighs at most what a native house's
standing starts at (reading 13). With both, no kingdom falls before its fourth season in twenty games, about the time a
letter and its answer take between neighbours, and the Kaska won a game. The revolts are now nearly all leaderless risings
in land whose people the holder's troops have stripped (armies by leave took their food 482 unit-seasons and bought it in
none): the ledger at work, and 37 of them were put down by troops. The scripts' taking is a weakness of their play
(item 17's buy-or-take rule buys only where a market holds grain to spare and gold is plentiful), listed for part C with
the audit's script finds.

USE

## The review

**Round 1, both started together on `5e72ff3`.**

The design check (Claude, Opus, medium): **5**, with these points (B blocking, N not):
1. B: the rulebook's "works built, a battle won there" had no entries. **Fixed** (`work` on a work completed in gold,
   `victory` on a battle won in a province by its holder's troops).
2. B: the ledger has no way to give: grain in a famine, a siege lifted, giving in the king's own name, and the script
   kings and characters giving and taking by it. **Open.**
3. B: the men of every army have no ledger ("an army follows its commander only as far as its ledger stands with him").
   **Open.**
4. B: use against ignore and benchmarks. **In progress** (above); the ledger's own use against ignore needs a script
   play that gives and takes by it (point 2).
5. B: next door counting only for the holder (reading 2) is a rule of a role; a smaller next-door weight for everyone
   instead. **Open.**
6. B: a governor gaining regard for holding his post (`rule`). **Fixed** (removed; his credit comes through his hand).
7. B: the engine acts for characters: a rising led by a trait threshold, not the character's choice (model characters
   never choose). **Open.**
8. B: a rising against troops settled by a formula, not as combat says; the land's resistance still by `isHome`, not
   the ledger ("a garrison keeps a town only as its people let it: they fight beside it"). **Open.**
9. B: conquest on entry (reading 1) is a second way to change hands; the season rule should decide. **Open.**
10. N: the court-city exception unstated. **Fixed** (reading 14).
11. N: the Habiru's share at Gubla. **Answered** (reading 15).
12. N: the seat-view fix outside the item. **Answered** (reading 16).
13. N: reading 3 adds a case to the floor rule; it should come out of combat once point 8 is built. **Open with 8.**

Codex (code review; security review clean): **P1×6**:
1. `wantsIt` returned the governor first and never weighed a more loved claimant. **Fixed**: every eligible man, the one
   the people would follow most.
2. `fold` accepted neighbours a unit cannot march between (two fleets across land). **Fixed**: `Map.canMove`, in the
   validator, the scripts and the web panel.
3. The lost province's last report was taken after the loss had changed it. **Fixed**: taken before.
4. Works and victories unrecorded. **Fixed** (as design point 1).
5. The new tests build the whole world (the smallest-game rule). **Open.**
6. A province changing hands kept the old holder's obedience until the season's end. **Fixed**: `reckonObedience` at
   every change of hands.

Review: rules · Claude · 5 (round 1); Codex P1×6 (round 1). Not merged: the open points are more than an hour's work,
so they go to a session of their own ("Bigger review fixes in a session of their own").

**Round 1's open points, answered in round 2** (`007bb65` to `52c266c`):

- Design 2 (ways to give, scripts by the ledger): **fixed**. Grain handed out (`feed`, in the king's own name with `own`),
  a siege lifted (`relief`), a band's robbing as a taking; script kings hand grain to restless provinces, in their own
  name where a governor stands (readings 20, 21). Measured with `--freedom-play-half` (below).
- Design 3 (an army's ledger): **fixed** (`turn/army-ledger.ts`; readings 22, 23).
- Design 4 (use against ignore, benchmarks): **done** (above); round 1's `--remnant-play-half` run had played both halves
  alike (`play.ts` left it out of the halves' list), fixed with its report line and a `fold` signal row.
- Design 5 (next door for everyone): **fixed** (reading 2).
- Design 7 (characters choose to lead): **fixed**, the "Rising" request (reading 17).
- Design 8 and 13 (risings as combat; resistance by the ledger; the floor's case): **fixed** (readings 3, 18, 19).
- Design 9 (conquest by the season's rule alone): **fixed** (reading 1); a siege's surrender stays the city's own act.
- Codex 5 (the smallest game): the new tests call the season's steps they test (`obeySeason`, `updateOwnership`,
  `settleMarkets`) on the starting world, as `works.test.ts` does, and play no season they do not need; the one full
  season left (the handful test) is the battle rule's.
- The early falls: **fixed** (above, "The early falls, and pillar 8").
- The doubled risen names: **fixed** (`nameFrom`: a name that already says its place is not given it twice).
- CI's smoke: passes on this head (`node src/web/smoke.mjs`); the marker that touched Gezer's badge came of round 1's
  game, and the layout is unchanged.
- Found on the way: land lost by the season's rule did not wake a sleeping seat (`sleep.ts`, `LandLostTitles`); fixed.

## History: round 1's hand-off (1 November 2026), done in round 2

Kept as written then; every point in it is answered above ("Round 1's open points, answered in round 2").


The builder's context is large, so this session stops here with the PR open. The next session takes PR #375 with this
report's review lists and nothing else, at high effort: build design points 2, 3, 5, 7, 8 and 9 and Codex's 5, fix the
early falls and the doubled risen names, add the batch report's line for `--remnant-play-half` and a `fold` signal row, rerun the benchmarks and the use-against-ignore (remnants; the ledger once the
scripts give by it), and ask both reviewers for round 2. Also fix CI's `smoke`: an open resident's marker at Gazru touches the city's badge at zoom 24 (`src/web/src/map/scene.ts`, the `SpyPosted` branch, or the marker layout). Then parts B and C of 17++ (the report's opening paragraph).
