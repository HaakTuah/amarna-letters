# Item 17: How cities become free

Build order item 17 (`docs/intent/build-order/item-17.md`), "Stop for review". Branch `item/free-cities`, PR #198, built on
item 16's branch (#194) as "pipeline, don't wait" asks. Save version 37. Design note: `docs/design/41-free-cities.md`.
Built from the dossier `docs/history/14-courts-and-free-cities.md`, cited below by its sections.

## The check for changes

The live document's Build order (revision 109), War, travel and the seas (66), Land, people and economy (33) and Characters
(21) tabs had no changes since the copy, at the start. Again before the PR: see the end of this report.

## What was built

- **Unrest from conditions** ("Revolt follows conditions, not dice"): every held province's unrest summed each season from
  what the engine sees, each condition of the section with its dossier row ("The conditions ... against the record"):
  hardship (hunger, levies, food troops took, a sack: "the strongest single weight in the letters", Byblos, Lachish, EA
  74-75, 85, 118, 287-288), the newness of the conquest (Sumur, Nuhashshe and Niya turning back), the master's weakness
  (EA 286-288, "if there are no archers this year"), distance ("weak by itself"), a cause to rally to (exiles, a former
  ruler, an ambitious governor or chief there) and outside help (Abdi-Ashirta's "kill your lord", EA 74). Lowered by
  troops, a loyal governor, policing, time and a good harvest (Megiddo with Biridiya present, EA 244). Far higher in the
  homeland ("Home provinces": Great Kings' own land rarely rose). The holder sees words, never the number.
- **Revolts and who leads them** ("How cities become free"): put down where the master's troops stand; else ruled by the man
  of standing who led it, a power with a seat of its own, with the levies he raised there, his band, or the men who rose;
  with nobody, lawless ("A revolt with no leader").
- **Rulers of their own**: one path (`ruleOwn`) for item 13+'s governors, a governor who refuses his recall (the new
  Idrimi with the levies he raised), a revolt's leader, a chief or a commander who holds lawless land long enough
  ("years, not seasons" for a band, "a season or two" for one who kept an army: "A lord who turned, or kept his men"), and
  an elder raised by a walled town without a ruler (Irqata "and its elders", EA 100: "A head rises in time"). The
  chronicle's "A new Idrimi" reads each way.
- **The gate opened from within** ("How long a siege lasts", item 17's part): a starving city holds a season or more,
  longer where its ruler is there and its people content, shorter where restless ("Start from: ... long hunger"; Rib-Hadda
  lost Byblos the one time he left it, EA 136-138).
- **Buying or taking** ("Armies need food as well as pay", Haakon of 29 October 2026, quoted in the item): the king's word to
  each army with gold sent by courier; hunger decides before orders; a commander may keep the gold and take (Rib-Hadda's
  charge against Yanhamu, EA 83, 85); taking raises unrest by how much, the king's own troops included (EA 287); the
  ruler of the land remembers it as a grievance ("Grievances held by the dispossessed").
- **Outside help**: a spy posted with gold spends it among the people he watches, deniable unless he is caught and talks.
- **Script kings** (`bots/freedom.ts`): weigh buying against taking, ease the tax where their governors write of unrest,
  and stir a foe's conquered land when cunning. A script king's book of kings now opens a page for a power risen in play
  (a crash the item's first runs found).
- The rulebook's UNREST AND FREE CITIES (`llm/src/rules-freedom.ts`), the model kings' troops line (buys or takes, gold
  carried, words on the road), orders `buy_food`/`take_food` and `place_spy` with gold; the web's "Buy food, send gold" and
  "Take food" for each army.
- The batch report: revolts by kind and of the homeland, gates opened, spies stirring, words and meals bought or taken,
  commanders who kept the gold, and the seats risen by how.

## The review

The reviewer (Opus, high) found one blocking issue and nine others; all are fixed or answered:

1. **Blocking, fixed**: a recalled governor of the king's court city could take the capital with none of the fall's rules.
   A governor in his king's court city now turns with his levies as a band, as before.
2. Fixed: the view's food words named the army where it truly stood; they keep where the king named it (`SupplyOrder.named`).
3. Fixed: the model kings' troops line shows each army's word on its food, its gold and the words on the road.
4. Fixed: a spy's stirring gold goes to his purse when he leaves his errand any way (caught on the road, dismissed).
5. Fixed: gold sent by a king who fell on the way stays with the land's people where it was carried.
6. Fixed: a chief's band becomes his army before his first notice and his starting strength.
7. Fixed: a new ruler's city starts content (no cause from the old holder, no levy hardship from the rising).
8. Answered: a rising where troops stand is put down whatever their number: reading 5 below.
9. Fixed in part: the scripts now take in quiet homeland when gold is not plentiful; the gold they can spare is reckoned
   before the season's other spending, so the validator may refuse a word (counted in the measures as words sent).
10. Answered: the engine tests use the starting world with no seats played, whose season costs only the engine's (the
    smallest-game rule is about seated script kings); they play at most six seasons.

## Readings taken

1. **The weights and the thresholds** are first guesses from the dossier's table (hardship strongest; weakness next; distance
   weak; a living cause strong; outside help strong). Principle: balance first guesses during the build, tuning in item 18.
2. **"Absorbed land starts loyal"** is read as the holder's homeland (the map's, and a risen power's own city): threshold 250
   against 100. Conquered land's newness fades over twelve seasons. Principle: the item's words ("needs far more to rise").
3. **"The old ruler alive and free"** is the power the province was taken from still standing, and a former ruler character
   (a capital ceded by tablet) standing there; a fallen king never returns as a character ("A fallen player's game is
   over"). Principle: the page's rules on falls.
4. **The court's own city never rises**: a coup at the capital is a different thing the game does not model (the dossier's
   "Home provinces"). Principle: period first; nothing invented.
5. **A rising where the master's troops stand is put down** (some of its people die, its memory halves), whatever the
   troops' number: men with farm tools against a standing unit. Principle: no new combat rule for a rising; "fight them as
   combat says" read as the unit holding the land.
6. **The rising's men** come at no price (they rose of their own accord); the new ruler pays them from the next season.
   His treasury is his purse and a fifth of the province's purse (the elite's gold). Principle: nothing appears or vanishes.
7. **Only a walled town raises an elder**; thin land waits for a chief. Principle: "A head rises in time"'s words.
8. **No word means take**: an army buys only on its king's word and with gold it carries. Abroad by leave its king no longer
   buys from his treasury at a distance, as item 9+b had it. Principle: nothing happens unless someone orders it; everything
   travels.
9. **The gold for food rides with the courier** and leaves the treasury when sent; it comes back if the army is gone.
   Carried in the men's packs within their savings, so it goes where their savings go. Principle: everything is somewhere.
10. **A commander keeps the gold** when his greed times his disloyalty reaches 5,000 (a script commander's formula, as
    item 13's skims are). Principle: skills set the odds, characters decide.
11. **Taking raises unrest whoever takes**, against the land's holder; a foreign ruler hears of it as a grievance ("Troops
    took food", a wrong to a script king), his own people complain to their king. Principle: the item's words.
12. **The governor reports the mood when it changes**, in four words; one who wants the province writes "quiet". Spies
    report it of what they watch; travellers carry the revolt itself as news. Principle: information moves in physical time.
13. **Outside help is a spy's errand with gold**: half a season at least 50, keeping what greed beyond loyalty lets him.
    Principle: no menus; deceit is information (found by catching the spy).
14. **A governor who turns** on his recall rules his province unless other troops of the king stand there or it is the
    king's court city, where he takes his levies off as a band as before. Principle: the item's words, and reading 4.
15. **Script kings buy** in a friend's land whenever they can spare it, in their own land where restless or not homeland,
    and in quiet homeland only with plenty of gold. Principle: incentives, not quotas.

## First guesses (for item 18)

All in `UnrestData`: hunger 40, levy 60, taken 400, sacked 30, fade 15%, stir 25 a hundred shekels, fresh 60 fading 5 a
season, besieged 20, weakness up to 40, distance 5 a season (at most 20), cause 20 each, troops 40, near 10, governor 20,
policing 10 a level, harvest 10; thresholds 100 and 250, margin 10; wants ambition 50, disloyal below 50; crushed 1%;
elite 20%; elder 8% a wall level plus 1 a season; chief 8 seasons, captain 2, a fifth of the men; gate 1 season; keep food
5,000. The scripts' own: three seasons of food, plenty six times, tax relief 15 points, stir 50 to 200.

## Script players: use and success

On 50 games (`--freedom-play-half`, before #194's merge; the final run below):

- **Words on food**: 270 words to buy, none to take. Armies by leave bought food in 8 army-seasons and took it in 437.
  The markets where armies stand hold little grain once the towns have eaten, and armies at home eat from their own stores
  first, so there is rarely anything to buy. Commanders kept the gold 33 times.
- **Revolts**: 21 (7 led, 14 lawless), none of the homeland; 10 more put down by troops. Gates opened from within: 83.
- **Seats risen**: 17 in 10 of 50 games (7 by revolt, 10 elders; no governor, turned governor or chief), against none
  before the item. 10 still ruled at the end; their seats sent 13 envoys and sealed 15 tablets, 3 of them vassal tablets.
- **Stirring**: 7 seasons. Few spies are posted in a foe's conquered land, and the scripts post one at a time.

A homeland province rose 0 times in 50 games.

## Use against ignore

`--freedom-play-half`, 50 games: mean growth 0.79 to 0.79, 26 wins to 24. **Even.** The buying lever cannot pay while the
markets where armies stand by leave are nearly empty, which is the economy's first guesses (item 18), not the scripts'
play. Tax relief and stirring are used too rarely to move the score.

## Benchmarks and script games

Before (item 16's branch, 50 games, `--verify-replay`): every replay exact; 47.3 seasons on average; a capital fell in 50
of 50 games (621 kingdoms); no governor rose; `siege-starved` 160. The final after-run, once #194 has merged, is below.

## The audit at the start

Item 13+'s governors' seats, the one feature never seen in play ("no governor rose in 50 script games"), now rise by every
path the item adds: 17 seats rose in 50 games. The other features were audited by items 15 and 16 at their starts; nothing
new was found to patch here beyond the script king's book of kings.

## Questions for Haakon

None. "The game in one page", the item and its sections settled every reading. The two observations for the balance pass
are not questions: buying rarely finds grain, and no homeland province rose in 50 games.
