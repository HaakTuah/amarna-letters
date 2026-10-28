# City-states as powers (28 October 2026)

Build order item 11+, "City-states as powers" (`docs/intent/build-order/item-11plus.md`), built from the politics dossier
(`docs/history/01-politics.md`). Branch `item/city-states`, begun on `item/answers-to-11b` (#125) as the pipelined start
asked. Save version 24. What was built, by file: `docs/design/26-city-states-as-powers.md`. Weekly usage: unknown
(`scripts/usage.sh` cannot read it in this session). Effort: medium, as set.

## The check for changes

The copy was cut from Build order revision 81, World and history 34, Victory 9, Characters 20, Overview 566. Asked at the
start: nothing had changed in any of them. Asked again before the pull request: see the PR.

Carried over to 11+ on its row of `docs/BUILD-PROGRESS.md`: nothing. #125 (the rest of 11b+) was still open when this
began; its builder left no model chief's own request on the 11+ row.

## The audit at the start

The 50 script games before this item (seeds 1-50, on #125's branch) used every feature built so far except three: no hire
abroad (11b+'s open finding: a court does not know where free people stand at other courts), no character's dealing
without a loan (`character-deal`: script characters only lend), and no servant caught selling its own court's secrets
(`secrets-caught`: script servants sell only what they heard of other courts). All three are characters' or 11b+'s, none
a king's feature this item touches; they are listed for item 18's audit rather than patched here.

## What was built

- **Twenty-three city-states and chiefs are powers** with the kings' rules, orders, envoys, characters and goal: Kaska,
  Lukka, Isuwa, Carchemish, Alalakh, Aleppo, Ugarit, Nuhashshe, Qadesh, Qatna, Arwad, Amurru, Byblos, Sidon, Damascus,
  Tyre, Megiddo, Shechem, Jerusalem, Suhu, the Suteans, Arrapha and Elam. Each holds its city as its capital and falls
  with it. Their rulers are the dossier's (Aziru, Rib-Hadda, Abdi-Heba, Mut-Baal son of Labaya, Akizzi, Aitakama,
  Biryawaza, Zimrida, Abi-Milku, Biridiya, Niqmaddu, Addu-nirari, Itur-Addu; "the king of ..." where it names none).
  Gaza and Sumur, Egypt's commissioners' towns, are Egypt's own land. The Kaska lands, Lukka and the Sutean steppe are
  under one leader each and taxed like any land held ("Land without a ruler").
- **Today's purchase of a city is gone**: a city comes under another's power by conquest, or by agreement as his vassal.
- **Vassalage in words**: a tablet may be marked as a vassal treaty naming the vassal; four new clauses (`protect`,
  `serve`, `askProtect`, `askServe`) with `tribute` make its template, which script players read.
- **Opening relations as they were**: seventeen sealed vassal tablets at the start (Egypt's eleven, Mitanni's six), each
  with its tribute a year; Arwad, Isuwa, Elam and the three chiefs serve nobody.
- **The scoreboard**: par for each starting position (see "Par" below), the winner the power with the highest growth
  against its par; the scripts reckon rivals by the same measure. Land against gold stays the fixed multiple.
- **When one power is left** the game ends, as before; a vassal is a power of its own.
- **The state of the realm**: a notice in each court's inbox at the start, by one rule for all.
- **Characters**: staff by size (two servants for a Great King, one for a city-state), the pool recounted to 100, new name
  styles for the Levant, Syria, Nuzi, Elam and the edges.
- **Minds follow what is at stake**: the city-states are seats like any other, on the same ladder and budget (script,
  file, human or model); nothing of their own. A budget game of model seats costs about $1.34 now, a standard one about
  $21 (the cost estimate: thirty seats, not seven).
- **The rulebook** says all of it (HOW YOU WIN with PAR, VASSALS with the opening bonds, the map's lands without a town,
  no purchase), and the web app's envoy form can mark a tablet as a vassal treaty and write the new clauses.
- **Fixed on the way**: a new claim to Great King rank counted every living power's greetings; it counts the Great Kings'.

## Script players

Script city-states play by the same brain as the kings (`ScriptLeader`), with personalities from the letters (Rib-Hadda
pleading and loyal, Aziru cunning, Labaya's sons expansionist, the Lukka and Kaska raiders), and the same expected-growth
logic: they reckon every rival by growth against par, the engine's measure. A city's ruler writes as a ruler, to a king
as his servant. What `bots/vassals.ts` adds (`docs/design/26-city-states-as-powers.md`, "Script players"): a vassal
weighs its bond once a year and pays the year's tribute while it is worth it, and never makes war on the overlord it
pays; an overlord counts what arrives, treats a paying vassal as a friend worth more than a conquest, and demands of one
in arrears; a strong king offers a weak neighbour vassalage, a threatened power offers itself; a third king weighs the
overlord's troops before falling on a vassal.

**How they used it** (50 games, seeds 1-50, before the strongholds; the after run is close): tribute sent 1,712 times,
delivered 1,661 (25,335 shekels in all, about 500 a game); 888 vassal tablets offered in play, 175 sealed, 170 of them
offered by the overlord (kings build vassal networks: Egypt and Mitanni keep theirs, Hatti, Assyria and Babylonia add
the cities and chiefs on their borders) and 5 by a threatened vassal. Demands of vassals in arrears: about 1,600, the
largest share of the press, since a city-state with one servant often has nobody free to carry its tribute that year.

**Weaknesses found and patched**: the scripts first bought nothing and took the open lands at once (the chiefs' lands
fell in season 1); their tribute went to the last bond of a vassal of two (now one a season, each in turn); a renewed bond
did not replace the old one (now the newest wins); small-power play (peace offers, tribute to a great neighbour) and a
proud king's greeting looked only at the "Weak" Great Kings (now city-states too); city-states claimed the Great King's
title in their greetings (now they write as rulers). **Left open**: a vassal does not notice an overlord who fails to
defend it against a third king, nor answers a call for troops ("serve"); offers are many and seldom sealed (888 to 175).

## Benchmarks and script games

**Before** (`develop` after 11b+, its report's "after") and **after** (this branch, before the merge of #128), seeds
1-50, `scripts/sim.sh --games 50 --seed 1 --verify-replay`: 50 of 50 replays exact. Winners after are by growth against
par; the city-states win 37 of 50 games, the Great Kings 13 (a Great King's par is 0.85-1.15, and the city-states' growth
spreads wider). A capital fell in 23 games before (seven powers), in 48 of 50 after (thirty powers; 157 kingdoms in all,
most of them Elam, Arrapha, Suhu, Jerusalem and Lukka); the first fall of a game came in season 8 on the median (range
2-13). In the run before the chiefs' strongholds the first fall came in season 2 on the median and Lukka fell in all 50.

| Power | Wins before | Wins after | Growth before | Growth after |
|---|---|---|---|---|
| Egypt | 1 | 0 | 1.13 | 0.85 |
| Hatti | 27 | 3 | 1.57 | 0.84 |
| Babylonia | 4 | 1 | 1.31 | 1.02 |
| Mitanni | 14 | 4 | 1.32 | 0.90 |
| Assyria | 0 | 4 | 0.56 | 0.84 |
| Arzawa | 4 | 1 | 1.02 | 1.05 |
| Alashiya | 0 | 0 | 0.99 | 0.97 |

The Great Kings grow less: no free city is left to buy or walk into, every city has a capital's walls and an army, and
the overlords' gain from tribute is a few hundred shekels a game. Wins after by city-state: Suteans 9, Lukka 8 (both at
par 1 in that run, unmeasured; their par is now set), Kaska 3, Carchemish, Megiddo and Suhu 2, eleven others 1.

## The review

One reviewer (Opus, high effort) read the source diff against the item and "The game in one page": nothing makes the
engine act for anyone, binds by words or delivers at a distance; replay holds. **Blocking, fixed**: Lukka (and in some
games the Kaska) fell in the first two seasons, the builder rules' own example of an unplayable start; the three lands
without a town now start with their chiefs' strongholds (walls 2) and no capital fell before season 2 in 50 games (one
fell in season 2, the median first fall is season 8). **Fixed besides**: the scripts' small-power checks and greetings
for city-states; a vassal of two paying only one; a renewed bond not replacing the old; the vassal mark's refusal told
to its writer ("Requests are rules too"); land nobody holds keeps its whole harvest (it was taxed into its stores) while
a chief's land held bears the season's catastrophes; stale "buy a city" text in the web app, the rulebook and a
personality; a debug probe committed by mistake; a servant's `met` list replaced instead of added to. **Kept**: the
recognisers of a claim to Great King rank are the seven (`isGreatKing`, reading 11); a vassal's own reading of the
template's other breaches (an overlord failing to defend, a call for troops) is left open ("Script players"); counter
tablets and forgeries carry no vassal mark (words like any tablet; a model or human may mark the tablets it writes).

## Readings taken and design questions

1. **Which places become powers** (Opening relations as they were): every place outside the seven's land in the table but
   Gaza and Sumur (Egypt's own, its commissioners' towns); 23 in all. Terqa, Mira and Seha stay their kings' own land as
   drawn: the dossier calls Hana (Terqa) a land "within Mitanni's reach" under local kings [B] and Mira a kingdom of its
   own only in later Hittite treaties, so neither is certain for 1346 (question 5). (Starting positions come from the sources.)
2. **Rulers by the dossier**: Shechem under Mut-Baal, a son of Labaya, as item 7 read it; "the king of ..." where the
   letters name none; the three chiefs as chiefs. Power ids are the province's name but for Elam (Susa) and the Suteans.
3. **Troops and gold** (first guesses): an army of 50 men a shekel of yield, Arwad a fleet, the chiefs' lands 250 men a
   shekel (every man fights); four seasons' yield in gold.
4. **A city-state's city has a capital's walls (3)**, as the rulebook's walls rule ("every capital 3") says of capitals;
   at their old 1-2 a neighbour stormed one in season 1 (question 2).
5. **The chiefs' lands have strongholds (walls 2) [G]**, from the review; without them Lukka fell in seasons 1-3 in every
   game (question 1).
6. **"By agreement" is vassalage**: a capital still cannot be ceded, so no city-state hands itself over whole (question 6).
7. **Tribute a year**: half a season's yield of the vassal's land, rounded to 5 shekels (Byblos 15, Ugarit 20).
8. **Par** (One scoreboard for every power): a power's mean growth in the 50 script games it survived (a fallen power
   cannot win), at least five survivals, else par 1; never below 0.1. The chiefs' lands from the second run (question 3).
9. **The land against gold and goods**: the fixed multiple (10 × a season's worth) stays; the alternative, the gold a land
   can still yield in the seasons likely left, is for item 18 (question 4).
10. **Staff by size**: a Great King's two servants, a city-state's one; the pool of 100 (60 + the city-states' 23 servants
    and about as many free people); the rulers have no households (How many characters).
11. **Recognition among the seven**: a claim to Great King rank is established by most of the other Great Kings, not by
    every living power (the rule's own words; the city-states would otherwise outvote them).
12. **The state of the realm** says what the land brings in, what it lacks (grain, mines, a coast, a market trading
    abroad), whose land its roads lead into, its rank in wealth and its vassal bonds; nothing of goals.
13. **Land nobody holds pays no tax** ("Land without a ruler"); a chief's land held is taxed like any.
14. **The scripts' first guesses**: a vassal keeps paying while its awe of the overlord, his protection against a third
    king, its honesty and caution outweigh its greed (re-weighed yearly); arrears after a year and two seasons; offers at
    three times the strength (`bots/vassals.ts`).

Model games: a budget game of model seats is estimated at about $1.34 now (under $1 before) and a standard one at about $21: thirty seats, each on the same ladder and budget (Minds follow what is at stake).
