# Neighbours on the map are neighbours in the rules (29 October 2026)

Build order item 11f (`docs/intent/build-order/item-11.md`, the 11f part), the part item 11f left unbuilt
(`docs/rounds/2026-10-29-map-crossings.md`, "Not built here"): item 11f+ in the progress file. Branch
`item/map-neighbours`, PR #185. Save version 32. What was built, by file: `docs/design/36-map-neighbours.md`; the cases
and their evidence: `docs/history/02-geography.md`, "Neighbours on the map". Weekly usage: unknown (`scripts/usage.sh`
cannot read it in this session). Effort: medium, as set. Helpers: one reviewer, in the background; no search helper.

Haakon's words (29 October 2026, the item's own text): "Yes, to all, expertly!" (to the design session's rule, "neighbours
on the map are neighbours in the rules"). Passed on by the orchestrating session the same day: "pull develop before your
pre-PR check for changes; the design copy was refreshed today (build order revision 109)" (done: revision 109 changed
item 13's text, not this item's).

## The check for changes

The copy was cut from Build order revision 108, War 66, The world 36. Asked at the start: nothing had changed in any of
them. Develop's refresh of the copy to Build order revision 109 was merged in while this was built (it changed item
13's text, not this item's). Asked again before the pull request (Build order since 109, War, The world, Victory):
nothing had changed.

## What was built

`scripts/map-borders.ts` listed 56 pairs where the drawn land and the rules' connections disagreed. Each is settled by
the item's rule, and the list is now empty:

- **23 pairs whose land touches are connected**, with a crossing where a real obstacle of 1346 lies between them: the
  Sutean steppe's desert roads to Aleppo, Nuhashshe, Qadesh and Terqa (the Syrian desert) and its road to Harran over
  the Euphrates below Emar; the Jordan by Jericho
  between Jerusalem and Pella and the Shasu's land; the Anti-Taurus between Samuha and Carchemish; the Negev between
  Lachish and the Shasu. The rest are open ground or lesser ridges and streams, as item 11f judged them.
- **24 roads that crossed a third province's land now pass through it**: the direct connection is gone, and the journey
  goes by the province between, at about the same number of days. Among them the Ways of Horus, which now run through the
  Sinai, Egypt's own (Delta to Gaza in 14 days, 12.5 before: Tjaru to Gaza is Thutmose III's 250 km, and the Delta's own
  road to Tjaru is added); the coast road from Gaza and Akko through Gezer and Megiddo; Ashur and Ekallate to the
  Euphrates by Suhu; Nesa to Sapinuwa and Isuwa by Samuha.
- **Seven roads' land redrawn** where the sources give it to one of the pair (`RoadLands` in
  `src/web/src/map/features.ts`): a band about 5 km either side of the road, and any land the band cuts off from its own
  city, go to that province. The Aruna pass to Megiddo; the King's Highway and the land east of the Jordan and the Dead
  Sea to the Shasu; the Upper Land's road to Hayasa to Samuha; the Elam road by Der, and the land east of the Tigris to
  the Zagros, to Dur-Kurigalzu; the mountains north of the Upper Land to the Kaska; the Lower Land's road west to
  Tuwanuwa; and Kumidi in the Beqaa to Damascus.

The rulebook's TERRAIN section and THE MAP, the map's marks and its roads all read the same data, so they follow. The
dossier lists every case with its evidence and grade; the design notes list them by kind.

## Measures

**Before** (`develop` at 1679192, with item 13, in a worktree with its own packages) and **after** (this branch with
`develop` merged in, before and after par was measured again), seeds 1-50, `scripts/sim.sh --games 50 --seed 1
--verify-replay`. 50 of 50 replays exact in all three; 47.3 seasons on average in all three.

| | Before | After, old par | After, par measured again |
|---|---|---|---|
| Kingdoms fallen | 684 | 704 | 713 |
| Games with a kingdom fallen in the first two seasons | 17 of 50 (Lukka 12, the Shasu 3, Niya, Suhu, the Suteans) | 19 (Lukka 12, the Suteans 4, Niya, Pella, the Shasu, Suhu) | 19 (the same) |
| Wins, Great Kings / city-states and chiefs | 24 / 26 | 24 / 26 | 13 / 37 |
| Wins by power | Egypt 16, Ugarit 8, Arzawa 4, the Suteans 4, Suhu 3, 12 others 1 or 2 | Egypt 18, Arrapha 10, Ugarit 8, Babylonia 3, 8 others 1 or 2 | Qadesh 5, Egypt 4, Akko 4, Ugarit 3, Babylonia 3, 23 others 1 or 2 (28 powers) |
| Growth, Great Kings | Egypt 0.90, Hatti 1.24, Babylonia 0.92, Mitanni 0.83, Assyria 0.93, Arzawa 0.70, Alashiya 1.00 | 0.91, 1.14, 0.94, 0.84, 0.87, 0.97, 0.98 | 0.91, 1.09, 0.96, 0.83, 0.83, 1.00, 0.98 |
| Falls, most changed | Arrapha 49, Suhu 25, the Suteans 22, Arzawa 19, Pella 9 | Arrapha 20, Suhu 50, the Suteans 48, Arzawa 6, Pella 25 | Arrapha 20, Suhu 50, the Suteans 49, Arzawa 3, Pella 27 |
| Defenders held by the ground / beaten despite it | 382 / 132 | 462 / 116 | 528 / 103 (the Jordan, the Anti-Taurus) |
| Envoys not understood on arrival, in a hundred (Egypt, Hatti, Babylonia) | 32, 28, 20 | 29, 20, 13 | 30, 24, 14 |
| Standing orders fired | 43 in 28 games | 55 in 28 | 58 in 26 |

The new neighbours move who is in danger: Arrapha, which had Assyria's Ekallate and Ashur and Elam's Susa beside it,
now has Dur-Kurigalzu and Ekallate and falls in 20 games of 50 rather than 49; Suhu, now beside Ashur, Ekallate,
Sippar, Dur-Kurigalzu and Terqa, falls in every game; the Sutean steppe, now bordering seven lands by its desert roads,
in 49; Pella and Ashtaroth, on the Shasu's new road, more often; Arzawa, whose Mira no longer has Tuwanuwa and Seha both
on its road, far less. The wins: with the old par, Arrapha surviving at all ranked at the top of its position's results
(it had always fallen), and won 10 games; par measured again from seeds 101-150 (reading 7), wins spread over 28 powers,
and the Great Kings win 13 of 50 against a fair share of about 7 (7 of 47 powers). On `develop` par was itself stale
(it lacked item 11f's eight places), so the before column's 24 / 26 is not the measure to compare the last column with;
the spread across powers is.

Playable: 31 games of 50 see no kingdom fall in its first two seasons ("on most seeds"), against 33 before. The early
falls are Lukka's, as before (item 13's armies; unwalled and alone beside Hatti and Arzawa), and the Sutean steppe's,
now in 4 games (1 before): no capital of a king or of a walled city falls early. Balance is frozen; item 18 weighs them.

## Use against ignore

The item adds no lever a king can choose to use or not: it changes which provinces are next to which. So there is no
use-against-ignore run; what is measured instead is whether the script kings and characters use the new connections
(below), and the progress file's running table says so in one row.

## Use of the item's features

- **The new connections**: the script kings ordered 3,512 moves of 19,505 (18 in a hundred) over the 23 new
  connections, in all 50 games, and every one of them was used: Ashur-Suhu 674 times in 50 games, Qadesh-steppe 377 in
  45, Durkurigalzu-Suhu 214, Alalakh-Nuhashshe 206, Aleppo-steppe 200, Niya-Qatna 198, Terqa-steppe 198, the least
  Hazor-Sidon 27 in 8 games. Their pathfinding, the envoys' and caravans' roads and the bots' threat reckoning all read
  the map's neighbours, so nothing in the scripts names a connection (checked: no script code names a pair of provinces);
  no weakness was found that needed a patch. A defender was held by the new crossings' ground more often (528 against
  382).
- **The roads that now pass through a province**: armies and caravans going Gaza to Megiddo or the Delta to Gaza pass
  through the province between, its passage and its watch; caravans taken by troops rose from 234 to 331.
- **The redrawn land**: drawing only; the map shows each band as the province's land, and the borders follow it.

## The review

One reviewer (Opus, high), in the background. Blocking: the older design notes (`01-rules-as-implemented.md`,
`12-the-map-and-the-seas.md`) and the dossiers' older tables still named the removed connections; fixed, each pointing
to this item's note. Not blocking, and fixed: the "a marching troop is no helper" test lost its positive check (it now
asserts the army in Nippur is the helper); the Delta-Sinai part of the Ways of Horus was shorter than the straight line
between its towns (now 160 and 120 km, the same 14 days in all); the steppe's road to Harran crosses the Euphrates below
Emar, where the drawing makes it a frontier (now a river crossing, not a desert one); and Isuwa-Taidu's upper Tigris is
now in reading 2. These last two changes came after the measures above, which they move little (one connection's
crossing, one road's split).

## Readings taken

1. **Touching land is connected, however short the border.** Five pairs touch for less than 10 km (Amurru-Qatna,
   Niya-Qatna, Gezer-Hebron, Ashur-Taidu, and Samuha-Carchemish after the redrawing); they are connected like the rest.
   (One rule for every case, the item's own; a length below which land does not count would be a rule of its own.)
2. **A crossing only where 1346 had an obstacle.** Between touching provinces a crossing goes on only for a pass, a great
   river or a desert edge that held armies, as item 11f judged them; Isuwa-Taidu over the south-eastern Taurus stays
   open ground, as Isuwa-Washukanni over the same range is (Suppiluliuma went that way without the range being named),
   and so is the upper Tigris it crosses (no source of the period names a crossing of it there; Taidu-Nineveh's Tigris
   is the one armies were held at). The steppe's road to Harran crosses the Euphrates below Emar, where the river was a
   frontier: that one is a river crossing, the Euphrates below Emar, not a desert one.
   ("Terrain" under War; item 11f's readings.)
3. **Redrawn only where a source gives the road's land.** Every other road over a third province's land passes through
   it. (The item: "either passes through that province, or the border is redrawn where the sources give the road's land
   to one of the pair".)
4. **Nesa to Isuwa passes through Samuha** rather than giving the Kanesh-Malatya road's land to Nesa: drawn as a band, it
   cut Samuha's land in two. Samuha is Hatti's own, so the road stays within Hatti's land either way. (The world as the
   sources give it; a province is one piece of land.)
5. **Land a band cuts off goes with the band.** Der's land east of the Tigris goes with Dur-Kurigalzu, and the Shasu's band
   takes the land east of the Jordan and the Dead Sea that the old drawing gave to Pella and Jerusalem. (A province is one
   piece of land; the Jordan is the period's frontier there.)
6. **The Ways of Horus are the Sinai's road.** Delta to Gaza goes by the Sinai, Egypt's own, with the desert crossing
   on each half (the Ways of Horus, the north Sinai) and the 250 km from Tjaru to Gaza with the Delta's road to Tjaru, 280 km in all, split 160 and 120 so that neither
   part is shorter than the straight line between its towns [G for the split]. (The
   dossier: "the only army road between Egypt and Canaan", across north Sinai.)
7. **The par table is refreshed.** Item 11e ranks each power among its own starting position's results in script games
   (`par-results.ts`, "refreshed when the rules change who falls and grows"). The new neighbours change that (Arrapha
   fell in 49 games of 50 and now in 20; Suhu in 25 and now in 50), so it was measured again from seeds 101-150, as
   item 11e did. (One scoreboard for every power: par must be the game's par.)
8. **Tests set up their scenes on the new map.** The many tests that set Assyria against Mitanni across Ashur and Terqa
   now meet at Suhu, which `formerHome` (test support) hands to Mitanni as `formerHomes` hands it Terqa; a scene whose
   road is gone takes the nearest road that still is. Scenes keep the powers, numbers and rule they test. (The smallest
   game that tests the rule.)

## Questions for Haakon

1. **The lands east of the Jordan.** Reading taken: the King's Highway and the land east of the Jordan and the Dead Sea,
   from Edom up to the Bashan, are the Shasu's (their pastures in Seir and Edom are attested; north of Edom it is a
   guess, graded G), so the Shasu border Ashtaroth, Pella and Jerusalem. Alternative: leave Moab, Ammon and Gilead no
   one's, as the empty land between, and let the King's Highway pass through no one's land (no Shasu-Ashtaroth,
   Shasu-Pella or Shasu-Jerusalem connections).
