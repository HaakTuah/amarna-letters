# Item 10+b: people across borders and in kings' hands (28 October 2026)

Build order item 10+b (`docs/intent/build-order/item-10plus.md`, the 10+b part): "Where people go", "Deportation",
"People are worth having, not free to keep" and "Bandits rob the purse", opened by Haakon's answers carried from 10+a
(the 10+a report, "The check for changes") and by the "Reason from the pillars" list that 10+a's own text gained after
10+a was built (Build order revisions 68-72). Branch `item/people-across-borders`; save version 18. What was built is in
`docs/design/20-people-across-borders.md` (the script kings' part also in `docs/design/07-script-kings/13-treasury.md`);
this report says why, what it cost and what was found. Weekly usage: unknown (this session cannot read it). Effort:
medium, as asked. Helpers: one reviewer, none other.

## The check for changes

Asked at the start (Build order since 72; Land, people and economy since 29; War, travel and the seas since 59; Overview
since 561): nothing new. `docs/BUILD-PROGRESS.md` held no new answers from Haakon to earlier items. The copy at revision
72 showed that 10+a's text had gained, after 10+a's check, a list of readings by "Reason from the pillars" that 10+a never
built (its report does not mention them); since they were 10+a's and this item comes next, they were taken up here, all
but one (below). Asked again before the pull request: FILLED IN BELOW.

## The audit at the start

Seeds 1-50 from `develop` as it stood (every king a script king) repeated item 10+a's "after" figures exactly (wins 0, 14,
2, 27, 0, 7, 0; capitals fell in 27 games, 42 kingdoms), and `--versus solo` (40 seeds) gave 2.20 / 0.96, 71% / 14% (10+a
reported 2.24 / 0.96, 72% / 14%: the solo games are not replay-checked and differ slightly between runs of the batch's
worker pool, as before). These are the "before" figures below. Every feature built so far was used in those games, except
the four 10+a's audit already explained (`reputation` and `pact-with-consequences` are read from model kings' letters;
`food-bought` is a fallback script kings never need; `gift-to-person` is a gift that buys nothing the rules count) and
`landing`, which fired in none of the 50 games of 10+a either. Nothing new was found to patch.

## What was built

See `docs/design/20-people-across-borders.md` for every formula. In short:

- **Haakon's answers carried from 10+a**: anyone's ships may sell grain at a besieged harbour while its waters are open;
  a court knows foreign prices and the tolls on its goods only as its caravans, ships and envoys bring word home (and its
  own eyes); model characters choose what they claim when they pitch, and what they say when they give way under
  questioning (a season later, the script mind keeping item 10's formula); a false envoy is received in a full audience
  and keeps what it is given; a captive handed over travels under guard and can be taken, freed or lost on the way.
  Rumour already travelled by road at the pace of news (item 10's `rumor`), so nothing changed there.
- **The "Reason from the pillars" list**: no false name is seen through by chance; the sack follows the men who take a
  province and whether it was stormed, and the king's share and a captured archive travel home as loads that can be
  waylaid; caravans at one market in one season meet one price; a besieged city holds no longer than its water.
- **People across borders**: those who leave the land, from hunger, a heavy tax or war, cross to the neighbouring land
  best to live in as loose men, the runaways of the king they fled; a king may settle the loose of his land where it has
  room, send runaways back (the clause `fugitives` promises it), deport the people of land he took to his own, and put
  out of a besieged city the mouths that cannot fight; and loose men rob their province's purse and stores.
- **Found during the item**: the batch runner kept a whole serialised state for every turn of every game (the web app's
  history), which, with `--verify-replay` replaying the game beside it, ran a 91-season game out of memory once this
  item's state grew a little; the batch now keeps no snapshots (`GameRunner.keepSnapshots`). And the rulebook's siege rule
  still said a besieged harbour is fed from the sea, which 9+b had ended: rewritten with this item's ships and water.

## Readings taken and design questions

Each is a question Haakon can answer; the reading taken comes first, the alternative in brackets, and the principle it
rests on ("Reason from the pillars").

1. **The harvest in each land's own season is not built here**, though 10+a's text now lists it: the farmers' food would
   have to be stored across the year, and every hunger, tax and script-king calculation changes with it, so it is a
   large change of its own; carried to the start of the next item that touches the harvest (or build it as its own small
   item now). Principle: build the final game, not a hurried part of it.
2. **Where people flee**: to the neighbour that fed its people best last season and taxes lightest, if better than home
   by a tenth, whoever holds it, crossing borders as loose men (or only across borders, never within the kingdom, where
   the settled already move). Principle: incentives, not quotas.
3. **Runaways from a heavy tax**: 2 in a hundred of the settled for each share of their food the farmers could not keep
   from their own harvest, hungry or not, so a king who taxes past what they bear loses people even when the market feeds
   them (or only when they go hungry). Principle: incentives, not quotas.
4. **Settling the loose costs nothing but room**: any loose men of one's province, runaways included, as far as the land
   carries; the unrest newcomers may stir comes with item 17 (or a cost now, such as gold for seed). Principle: don't
   prohibit; the cost comes with its system (no stopgaps).
5. **Deportation**: from any province one holds that is not one's homeland, any number, 5 in a hundred dying on the road
   and more slipping away on a long one; the purse goes with them only if the king lets it (or only from land taken by
   force). Principle: numbers come from their causes; everything is somewhere (they walk).
6. **Returning runaways** walk to their king's nearest land and settle there, whatever he wants; a promise to do it is
   the clause `fugitives`, words like every clause (or the engine enforcing a sealed promise). Principle: physics, not
   politics.
7. **Mouths put out**: half the town's need, for the rest of the siege, the townsfolk put out becoming refugees (or a
   share the king chooses). Principle: numbers come from their causes (half a town is women, children and the old).
8. **Robbing**: the loose take what the roads pay them, 5 thousandths of the purse and of the holder's stores times
   loose / (loose + 1,000), half where the holder's troops stand; they eat the grain and carry the gold, spending half of
   it a season where they are (or larger takes, or policing only from item 15). Principle: it finds its own balance.
9. **Prices and tolls as reported**: a court still knows at the start the markets within half a season's travel and the
   tolls on its goods there, as last reported before the game; after that only its traders, envoys and own eyes bring
   word (or it starts knowing nothing beyond its sight). Principle: information moves in physical time.
10. **Claims chosen in words**: a model character picks, for each skill, one of the four phrases a court reads, which
    the engine sets at that band's middle (or a number it chooses). Principle: requests are rules too (no numbers).
11. **What a captive says** is decided a season after it gives way, since the engine asks characters only between
    seasons (or the same season, which the turn's order does not allow). Principle: skills set the odds; the character
    decides.
12. **A false envoy's audience**: it is received like any envoy but carries no letter, sealed greeting or seal, so it
    can seal nothing; gold sent back with it for "its king" it keeps; afterwards it stays at the court (or it leaves).
    Principle: deceit is information.
13. **A captive under guard**: the giver's guards are ordinary men (no skill of the captive's helps them); a king whose
    men stop them takes the captive, or frees it if it serves him; outlaws let it escape; the weather only holds it up
    (or the receiver may intercept nothing). Principle: everything is somewhere.
14. **The sack**: at most half the purse when stormed or taken unwalled, a quarter when it surrendered, and no more than
    10 shekels a hundred men can carry; the king's share is a third, carried home as a load (or a larger share). The
    breach's pace already follows the besiegers' numbers and time; engineers and commanders come with item 13.
    Principle: numbers come from their causes.
15. **Water**: river land, and Jerusalem and Megiddo with their walled ways to water, never run dry; cisterns last 4
    seasons of siege in rain-fed land and wells 2 in arid ground; Tyre and Arwad, islands without water of their own,
    last a season once blockaded (or water for each city from a dossier of its own, when one is written). Principle:
    period first; numbers come from their causes.
16. **Using the item's choices barely pays** at these first guesses: FILLED IN BELOW.

## First guesses (item 18 tunes them)

`LandData` (`model/land.ts`): runaways 2% for each share of food not kept; a neighbour must be 10% better; 5% of
deportees die; half a besieged town's mouths go out; troops halve what the loose take; the loose spend half their gold a
season. `TradeData` (`model/trade.ts`): the sack takes at most 50% stormed and 25% surrendered, 10 shekels a hundred men,
the king's share 33%. `WaterData` (`model/geography.ts`): cisterns 4 seasons, wells 2, islands 1.

## Script kings and the feature

FILLED IN BELOW.

## Benchmarks and script games

FILLED IN BELOW.

## The review

FILLED IN BELOW.

## Tests

`src/engine/test/borders.test.ts` (flight across borders, settling the loose, returning runaways, deportation, mouths put
out, robbing, a ship at a besieged harbour, a false envoy's audience, a chosen claim, one price at a market, water under
siege, word of a far market); `who-they-are.test.ts` (questioning in two steps, a captive under guard), `trade.test.ts`
(the sack), `archive.test.ts` (the archive as a load), `purchase.test.ts` (the sack's gold on the road),
`file-character.test.ts` (the pitch's claims and the questioning's reply in a file character's answer), the save version.

## Left for later

A harvest gathered in each land's own season (reading 1); unrest among newcomers and deportees and those left behind
(item 17); bands and chiefs gathering the loose (item 11b); policing (item 15); water works and repairs under siege
(item 15); engineers and a commander's discipline in the sack and the breach (item 13).
