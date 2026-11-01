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

## Design questions

None. Everything the sections left open was settled by "The game in one page" and the pillars (readings above).

## Benchmarks and use against ignore

(Run after the suites; filled in below.)

## The review

(Codex's review and the design check, started together.)
