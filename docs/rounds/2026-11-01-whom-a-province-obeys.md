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

1. **Conquest on entry stands** ("Whom a province obeys": "conquest is force tipping it"; Physics, not politics): an army
   that beat its way in, past the old master's troops and the land's own men ("The people defend their land"), has tipped
   the province by force at that moment; the one rule then decides each season whether it holds. Gating entry on the
   rule as well was tried first and made most conquests of homelands fail outright, which the text does not ask.
2. **A rival king weighs only with troops standing in the province; next door counts for its holder alone** ("Gubla now
   answers to Aziru: his men stand at its gates"; Everything is somewhere): a neighbour's army at home next door is no
   fear to people it does not stand among, and counting it flipped Hazzatu and Ṣumur to the Shasu and Amurru in the first
   season. His love counts with his men there: a rival's gold among a people (`stir`) tells when his troops come.
3. **A province falls lawless only with none of its holder's troops in it** (the text: "no one if nobody's weight clears
   what its people accept"): a province with the master's men standing in it is not nobody's; it rises behind a man, or
   waits.
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
13. **The force scale**: troops as many as a tenth of a province's men of fighting age weigh `force` 100, at most 200 [G];
    a full army (5,000) clears a median province (5,900 men) at the cap.

14. **A court's own city changes hands only to a foe's troops standing in it** (a coup is not modelled, as item 17 read
    it): it waits for item 17b ("A realm holds by its ledger"), which makes the capital wherever the court is.
15. **Aziru's house stands for the villages gone over to the Habiru at Gubla** [B]: the Habiru there were the Amurru
    brothers' men in the letters (EA 74-91), and the bands of the map are not a power that can hold land, so the share goes
    to the house that led them.
16. **The seat view's leak rides here** because the orchestrator's brief put it in 17++: it is the same question, which
    provinces a court knows it holds, that this part's changes of hands make common.

## Design questions

None. Everything the sections left open was settled by "The game in one page" and the pillars (readings above).

## Benchmarks and use against ignore

20 games, seed 1, `--verify-replay`, every replay exact. Before (17+ as merged, its report): a capital fell in 20 of 20
games, 373 kingdoms fell in all, the first fall in season 1.5 on the median, a kingdom fallen in the first two seasons in
11 of 20. After (this branch at `5e72ff3`): a capital fell in 20 of 20, **602 kingdoms fell in all** (risen powers among
them: 90 rose, 60 of them elders in lawless land, 26 by revolt, 4 governors), the first fall in season 1.5, **a kingdom
fallen in the first two seasons in 20 of 20** (Carchemish 11, Megiddo 7, Aijalon 6, Kaska 6, Qatna 6, Lukka 5). Winners:
Egypt 7, Hatti 4, Babylonia 4, Mitanni 2, Libya, Terqa and Qadesh 1 each. Revolts 41 (26 led, 15 lawless), 1 put down.
This is a finding the next round must answer before merge (pillar 8): why the city-states' capitals fall faster under
the one rule, and whether the rising elders (60) come from land falling lawless too easily. Risen names double their
place ("Nabu-zuqup of Nippur of Nippur"), a leftover of `risenName` the next round fixes.

Use against ignore for remnants (`--remnant-play-half`, 50 games, seed 1): the games ran (171 seats rose in 45 of 50), but the batch report has no line comparing the two halves and its signals table no `fold` row yet (as `--upkeep-play-half` has at `src/batch/src/main.ts` line 677): the next round adds both and reruns it.

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

## Where to pick up (hand-off, 1 November 2026, context)

The builder's context is large, so this session stops here with the PR open. The next session takes PR #375 with this
report's review lists and nothing else, at high effort: build design points 2, 3, 5, 7, 8 and 9 and Codex's 5, fix the
early falls and the doubled risen names, add the batch report's line for `--remnant-play-half` and a `fold` signal row, rerun the benchmarks and the use-against-ignore (remnants; the ledger once the
scripts give by it), and ask both reviewers for round 2. Also fix CI's `smoke`: an open resident's marker at Gazru touches the city's badge at zoom 24 (`src/web/src/map/scene.ts`, the `SpyPosted` branch, or the marker layout). Then parts B and C of 17++ (the report's opening paragraph).
