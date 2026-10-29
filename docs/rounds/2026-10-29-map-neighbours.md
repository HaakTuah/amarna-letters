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
them. Asked again before the pull request: see the PR (develop's refresh to Build order 109 merged in; item 11's text
unchanged).

## What was built

`scripts/map-borders.ts` listed 56 pairs where the drawn land and the rules' connections disagreed. Each is settled by
the item's rule, and the list is now empty:

- **23 pairs whose land touches are connected**, with a crossing where a real obstacle of 1346 lies between them: the
  Sutean steppe's desert roads to Aleppo, Harran, Nuhashshe, Qadesh and Terqa (the Syrian desert); the Jordan by Jericho
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

MEASURES

## Use against ignore

The item adds no lever a king can choose to use or not: it changes which provinces are next to which. So there is no
use-against-ignore run; what is measured instead is whether the script kings and characters use the new connections
(below), and the progress file's running table says so in one row.

## Use of the item's features

USE

## Readings taken

1. **Touching land is connected, however short the border.** Five pairs touch for less than 10 km (Amurru-Qatna,
   Niya-Qatna, Gezer-Hebron, Ashur-Taidu, and Samuha-Carchemish after the redrawing); they are connected like the rest.
   (One rule for every case, the item's own; a length below which land does not count would be a rule of its own.)
2. **A crossing only where 1346 had an obstacle.** Between touching provinces a crossing goes on only for a pass, a great
   river or a desert edge that held armies, as item 11f judged them; Isuwa-Taidu over the south-eastern Taurus stays
   open ground, as Isuwa-Washukanni over the same range is (Suppiluliuma went that way without the range being named).
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
   on each half (the Ways of Horus, the north Sinai) and Thutmose III's 250 km split 150 and 130 [G for the split]. (The
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

QUESTIONS
