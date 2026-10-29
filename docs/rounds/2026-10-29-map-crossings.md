# The rest of the map: its crossings and its missing places (29 October 2026)

Build order item 11f (`docs/intent/build-order/item-11.md`, the 11f part), added by Haakon's PR #160, with his two
logistics answers of PR #163. Branch `item/map-crossings`, PR #169. Save version 30 (item 12 takes 29). What was built,
by file: `docs/design/33-the-rest-of-the-map.md`. Weekly usage: unknown (`scripts/usage.sh` cannot read it in this
session). Effort: medium, as set. Helpers: one reviewer, in the background; no search helper.

Haakon's words (29 October 2026, the item's own text): "Yes, every crossing like this should be included, and such that
both the map and the game physics reflect the actual terrain that was at the time."; to the design session's list of the
places the map lacks: "Yes, do it expertly!"; to its takes on logistics: "Yes, agreed with all, expertly!"; and on the
countryside round a siege: "Yes to all, expertly!".

## The check for changes

The copy was cut from Build order revision 103, War 66, The world 36, Land 33. Asked at the start: nothing had changed
in any of them. Asked again before the pull request (Build order, War, The world, Land, Characters, Victory): Haakon's PR #174 added
his answers to items 11e and 12 to this item while it was built, and they are built here; nothing else changed.

## What was built

- **The crossings of 1346**, each with the dossier it comes from (`Crossing.source`): the upper Euphrates into Isuwa
  from the plateau and the Upper Land; the Marassantiya ringing the Hittite heartland; the Orontes where armies are
  recorded fording it, at Shabtuna and below Niya; the Jordan between Canaan and the cities east of it; the Lebanon on
  Beirut's road; the Western Desert to Libya and the Negev to the Shasu. Rivers crossed but not sailed
  (`CrossedRivers`) slow a company at their fords and close them in their flood, as the great rivers' do. The rulebook's
  TERRAIN and NEWS AND TRAVEL, the map's marks and tap cards and the About page read them from the data. The geography
  dossier lists each with its evidence and grade, and what was checked and left out.
- **Nine places**: Azzi-Hayasa under Hukkana, Niya under Takuwa, Tunip (its elders, no king named), Beirut under
  Ammunira, Pella under Mut-Bahlu, Ashtaroth under Ayyab, Samuha (Hatti's own), and the chiefs' lands of Libya and the
  Shasu; each with its ruler, walls, yield, people, water, climate, market, name style, personality, colour and opening
  bond, checked against the dossiers and added to them where thin (politics, geography, attested people). Shechem's ruler
  is Labaya (reading 1).
- **Caravans go anywhere, at risk**: a kingdom's caravan crosses land closed to its king, sneaking, found there with a
  smuggler's odds; one that meets closed roads it had not heard of is turned back, then goes on sneaking. Troops shut
  inside walls by a siege seize nothing beyond them.
- **The desert sentence**: the rulebook already said the desert feeds nobody; the About page still gave item 5's flat
  desert cost, and now says what the rule is (and two code comments too).
- **Script kings** send caravans to their armies through foreign land, weighing tolls, the risk where the roads are
  closed, and hostile troops on the way (`--caravan-play-half` measures it).
- **The drawing** (11c+'s rules, merged while this was built): the nine places' borders traced by `scripts/map-borders.ts`,
  the edge lands' empty-place point west of the Delta moved so Libya has its land, and the crossing cards' flood text for
  the crossed rivers.
- **Split first** (the workshop check, the orchestrator's ask): `tactics.ts` (50.0 KB) split by responsibility in its
  own PR (#171), behaviour proven unchanged, and merged into this branch.

## Where the drawing and the connections disagree

`scripts/map-borders.ts` lists 56 pairs after item 11c++'s smoothing (item 11c+ listed 47 before this item). For the
nine new places, whose roads this item chose, they were first matched to the drawing where the sources allow (Samuha to
Hattusa, Tunip to Sumur by the Eleutheros road, Pella to Hazor across the Jordan, the Shasu to Gaza across the Negev;
Aleppo to Niya left out). The cases left, for the new places and the old, belong to the live text's rule of revision
106 ("Not built here").

## The audit at the start

The 50 script games on `develop` before this item (seeds 1-50, with item 12) used every feature built so far but those
earlier audits leave to later items (captives, smuggling, winter crossings, gifts to persons, false envoys paid, fees
withheld, characters' own dealings, secrets caught, hiring abroad, reputation, pacts with consequences, coalitions,
forgeries, basing) and, rare or absent there and none of this item's: a shared victory, food bought, passage granted by
order, reports sold, a mute envoy and newcomers through the doors (0 on these seeds). After it, the new caravans
were used in 48 games of 50 (below).

## Measures

**Before** (`develop` at e07985d, with item 12) and **after** (this branch at c2bb98b, with Haakon's answers to 11e and
12), seeds 1-50, `scripts/sim.sh --games 25 --seed 1 --verify-replay` and `--seed 26` (two halves, one machine). 50 of
50 replays exact in both; 47.3 seasons on average in both.

| | Before | After |
|---|---|---|
| Kingdoms fallen | 579 | 690 (47 powers, 39 before) |
| Games with a kingdom fallen in the first two seasons | 1 of 50 | 6 of 50 (the Suteans 5, taken by Damascus; Suhu 1) |
| Wins, Great Kings / city-states and chiefs | 49 / 1 | 27 / 23 (size weighs 5 in a hundred, 50 before) |
| Wins by power | Egypt 20, Babylonia 17, Hatti 8, Assyria 4, Qadesh 1 | Egypt 21, Babylonia 3, Arwad 3, Suhu 3, 14 others 1 or 2 each |
| Growth, Great Kings | Egypt 0.86, Hatti 1.39, Babylonia 0.99, Mitanni 0.70, Assyria 1.00, Arzawa 0.67, Alashiya 0.96 | 0.93, 1.18, 0.94, 0.81, 1.04, 0.82, 1.01 |
| Falls, most often | Arrapha 50, Lukka 41, Nuhashshe 39, Terqa 38, Isuwa 36 | Arrapha 49, Lukka 39, Seha 39, the Shasu 38, the Suteans 34 |
| Envoys not understood on arrival, in a hundred, by sending court | Egypt 31, Alashiya 28, Hatti 22, Babylonia 22, Assyria 14, Mitanni 10, Arzawa 6; the cities 3 to 15, the Kaska 42 | Egypt 28, Alashiya 27, Hatti 24, Babylonia 19, Assyria 11, Mitanni 11, Arzawa 7; the cities 1 to 20, Azzi 19 |
| An envoy heard through a servant of the court | 189 | 644 (anyone in the court's service bridges; the Akkadian scribes) |
| Defenders held by the ground / beaten despite it | 265 / 68 | 281 / 77 (the new crossings) |
| Caravans out | 7,287 | 8,442; 348 slipped through closed land, 90 found and seized there; 183 taken by troops (144 before) |

The early falls: as first built, Libya and the Shasu, unwalled desert next to Egypt's armies with 20,000 people each,
fell to Egypt in their first season in 6 of 25 games; at 60,000 and 40,000 (first guesses: Libya's herders came on in
tens of thousands a century later) they hold. What is left is the Sutean steppe, taken by Damascus in its second season
in 5 games of 50 (none on `develop`): Damascus now has Ashtaroth and Beirut beside it, and Biryawaza did call them "my
Suteans" (EA 195). 44 games of 50 see no kingdom fall in their first two seasons ("on most seeds"); item 18 weighs it.

The wins: with size at 5 in a hundred, Great Kings win 27 of 50 and the city-states and chiefs 23, spread over 17 of
them; Egypt alone wins 21, as rich in growth as in size. Item 11e measured 12 / 38 by performance alone and 29 / 21 at
15 in a hundred.

## Use against ignore

Half the script kings send their caravans through foreign land, sneaking where the roads are closed to them; half keep
them to their own land (`--caravan-play-half`, seeds 1-50): growth 0.79 against 0.77, wins 20 against 30. Not paying
yet in wins: supplying an army deep in foreign land costs the porters and the grain found and seized (90 caravans in 50
games), and wins move by about five either way in 50 games (an earlier measure on this branch, before the review's
open-roads-first fix, gave 24 against 26). Re-measure with command at a distance (item 13), which gives an army deep in
foreign land something to do. Row in the progress file.

## Use of the item's features

- **Crossings**: a defender held by the ground 281 times (265 before), beaten despite it 77; every new crossing's effect
  on travel is in every journey's pace (tests: `map-crossings.test.ts`, one scene for each kind).
- **Caravans through closed land**: 438 entered closed land in 48 games of 50, 90 of them found; troops shut in by a
  siege took none (the engine skips them; tested).
- **The new places**: every one plays as any city-state or chief; the Shasu fell 38 times, Tunip 31, Ashtaroth 29, and
  Libya rarely (after the fix). Their envoys are understood as often as their neighbours' (Beirut 0 in a hundred, Azzi 19).
- **The Akkadian scribes and anyone bridging**: 644 envoys heard through a servant of the court (189 before).

## Not built here

The live text gained, at revision 106 while this was measured, a third part: the disagreements between the drawing and
the connections are settled "by one rule, neighbours on the map are neighbours in the rules", each case with its
dossier. `scripts/map-borders.ts` lists 56 such pairs; each needs a road or a redrawn border from the sources, and the
rules' change a measure of its own. That is large, so, as the builder rules say, it goes to the start of the next item
that touches the map's connections, and the progress file says so.

## Readings taken

1. **Shechem under Labaya, Pella under Mut-Bahlu.** The item gives Pella to Mut-Bahlu, the son of Labaya whom the game
   gave Shechem; "What earns a place" says Labaya starts the game though probably dead by 1346. (The world as the
   sources give it; one man in one place.)
2. **Tunip's ruler is "the king of Tunip"**: EA 59 is from its citizens as one, and the dossiers' rule for an unnamed
   ruler gives "the king of ..."; its character's description names the elders. (The sources first.)
3. **Azzi starts as Hatti's vassal**: Hukkana's treaty with Suppiluliuma (Beckman no. 3) is early in the reign, its date
   not certain; the reading takes it sealed by 1346. Alternative: start Azzi free, its treaty a later event.
4. **Niya starts as Mitanni's vassal**: Takuwa submits to Suppiluliuma only in the first Syrian war. (Opening relations
   as they were.)
5. **Yields carved and added** (first guesses, item 18): Samuha 25 from Sapinuwa's and Nesa's land (5 each), Niya 15 and
   Tunip 15 (5 from Alalakh, 5 from Nuhashshe), Beirut 10 from Byblos and Sidon (5 each); Azzi 20, Pella and Ashtaroth 10
   each, Libya and the Shasu 10 each as new land. People: Pella and Ashtaroth 15,000 together, Azzi 30,000, Libya and the
   Shasu 20,000 each [G]. (Balance frozen: first guesses, listed.)
6. **A crossing only where the sources show an obstacle**: the Orontes only at Shabtuna and below Niya, not on every
   road over it; the Halys between the bend and the plateau; the Khabur, the Zabs, the Diyala, the Litani, the Aruna
   pass, the Zagros edge, the cataracts and straits left out, each for its reason. ("Terrain": "a lesser stream or ridge
   that stopped no army is drawn but is not a crossing".)
7. **Rivers crossed are not sailed**: no boats, no harvest floods; only fords and their flood, all in Shemu. (One rule:
   a river crossing costs the same everywhere; only what the sources give is added.)
8. **Only a kingdom's caravans sneak where closed**: a trader keeps its own choice to go openly or smuggle, which it
   already had (item 9+b); the item's text is about supplying a kingdom and its armies. Alternative: traders too.
9. **Open roads first**: a kingdom's caravan sneaks through closed land only where no open road reaches, so a king's
   caravan never takes the risk while a safe road exists (the order names only its ends; "may still go" is a means, not a
   preference). From the review; before it the engine took the shorter way.
10. **Turned back, then on**: a caravan that meets closed roads it had not heard of is turned back at the border, as
   before, then goes on to its destination sneaking, since it "may still go". (Nothing happens unless ordered: it does
   what it was sent to do; Everything travels.)
11. **Hostile troops are as before**: a king who closed his roads to the caravan's king with no passage there. (A road is
    denied by holding it.)
12. **Shut in means any power but the besieger** in a besieged province, for caravans only; travellers' road check is
    unchanged, as the decision is about supply. Alternative: travellers too. The besieged holder keeps no border there
   either (no turning back, toll or search), so nothing seized at it feeds the besieged city (the review's one blocking
   finding: before the fix, grain found at the border went into the besieged city's stores).
13. **Libya and the Shasu have no market**: a town of 0, so their market buys and sells nothing; no rule names them.
    (Different data, same rules.)
14. **The edge lands' centres** are their herders' land, not a site: Libya west of the Delta (30.95 N, 28.6 E), the
    Shasu in the Arabah by Edom (30.6 N, 35.3 E) [G].
15. **Connections for the new places** follow the roads the dossiers give, then the drawing where the sources allow.

## Questions for Haakon

None: "The game in one page" and the item's sections settled every reading (readings 1-15 above).
