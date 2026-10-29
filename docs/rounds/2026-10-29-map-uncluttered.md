# Item 11c++: the map uncluttered (29 October 2026)

A lane beside item 11f (#169), PR #180, branch `item/map-uncluttered`. The item's text is
`docs/intent/build-order/item-11.md` ("11c++"), with Haakon's words there ("Yes, to all, expertly!"; "Yes, please!
Expertly!"; "Yes, please, expertly! If it needs access to something it can't get right now, then we will get it as soon as
I am home."). Item 11c+'s report is [`2026-10-29-map-at-a-glance.md`](2026-10-29-map-at-a-glance.md). As built:
[`docs/design/34-the-map-uncluttered.md`](../design/34-the-map-uncluttered.md); the land drawn and its sources:
[`docs/history/13-the-land-drawn.md`](../history/13-the-land-drawn.md).

Web app and its drawing scripts only (`src/web`, `scripts/map-*`): no rule, number, save version or engine file changed,
so the script benchmarks are unchanged by construction (no file the engine, the script kings or the batch runner read was
touched). Weekly usage could not be read in this session ("unknown"). No model games.

**The check for changes.** The live design document was asked for changes to the Build order tab since the copy's
revision 108, at the start and again before the PR was readied: none.

## What was built

1. **Markers never overlap.** After every render and zoom the renderer places every marker as drawn, most important
   first (the cities by the order names give way by): a city shows its full badge, counters, people and news where none
   touches a marker already placed; else its small seal (a dark rim when its troops are hidden), its counters, people and
   news giving way, all returning as the map is zoomed in; else nothing of it (its province's colour still says who holds
   it). Then fleets at sea, units destroyed, travellers and the marks of crossings, each where it touches nothing placed.
   Counters stand clear of their own city's outermost ring, people to its left and news to its right, so a city's own
   markers never touch each other.
2. **The phone opens a step closer on the Levant** (6.7x, from 4.2x).
3. **The test grows**: the smoke test fails if any marker shown touches another, besides the names, at 390 and 1280
   pixels, at all eight zoom steps, at the opening and four seasons in. It passed (twice, the second time with all parts
   of the item in).
4. **Borders as natural lines**: each traced border simplified past its grid's steps and its corners rounded, ends fixed.
5. **Relief from real elevation**, soft shading in place of the hand-placed chevrons (115 KB).
6. **Every river that mattered from real data**: Natural Earth's where it has them (now with Anatolia's Hermos, Kaystros,
   Saros, Kalykadnos, Iris, Sangarios and Arsanias), the rest traced down their valleys on the elevation: the Orontes,
   the Litani (new), the Khabur, the Balikh, the two Zabs, the Diyala, the Karun (new). The borders were traced again,
   since a lesser river between two cities is a border (item 11c+'s rule).
7. **The lakes and marshes of 1346**: Lake Huleh and its swamp, the Lake of Antioch, the Faiyum's larger lake, Lake
   Mareotis and the Delta's lagoons, the marshes at the Gulf's head. Legend rows for relief, marsh and the small seals.
8. **Finer geography close up**: Natural Earth's finest coasts, small islands, lakes and rivers for the Levant and Cyprus,
   the Nile and its Delta, and the Aegean coast, in a chunk of their own (103 KB, 40 KB compressed) imported the first time
   the map passes 6x, and swapped back below 4.5x.

No data had to be fetched by Haakon: the elevation (AWS Open Data terrain tiles) and Natural Earth's files were reachable
from the session.

## Readings taken

Each with the principle it rests on ("Reason from the pillars").

1. **A small seal's counters, people and news give way with its badge**, and a dark rim on the seal says troops stand
   there. (The item's words: "its full badge and counters returning as the map is zoomed in"; the map read at a glance.)
2. **A small seal that would still touch gives way altogether**, the province's colour still showing who holds it, since
   at the whole board a phone has five pixels between the Levant's cities. (The item's "Markers never overlap, at any
   zoom step".)
3. **A city's own counters may not touch its own badge**, so the counters stand clear of its outermost ring. (The item:
   "fail on any marker touching another".)
4. **After the cities, the rest by their own weight**: fleets at sea, units destroyed, travellers, then the marks of the
   crossings, each giving way where it touches. (The same order of importance names give way by.)
5. **"A step closer" is one press of the zoom button** (1.6x). (The map's own step.)
6. **Finer geography above 6x, back below 4.5x**, so it does not flicker at the threshold; since a phone opens at 6.7x,
   the fine Levant loads at a phone's opening, and the whole board stays light. The installed app's offline cache stores
   the chunk with the rest, so it works offline; it is drawn only close up. (The item: "loaded only as the map is zoomed
   in (above about 6x)"; item 11c+'s phone opening.)
7. **Rivers from data where data exists**: Natural Earth's courses, else traced on the elevation; the Delta's old branches
   and the Euphrates' old bed stay drawn from the dossier, since no dataset holds courses of 1346. (Period first; the
   item: "with the land of 1346 where it differs from today's".)
8. **The lakes and marshes of 1346 are traced by hand** from a new dossier, each line graded (outlines C), as no
   public dataset draws them. (Period first.)
9. **The relief lies over the holders' colours**, in soft light, so the ranges read on tinted land too. (The map read at a
   glance.)
10. **The ridges the border tracer follows (`RangeLines`) stay**: they lie along the relief now drawn, and changing them
    would move borders without a source. (Borders and crossings follow the same land; item 11f's lane owns crossings.)

## Measured

- Smoke test: at the opening, 22 names and 61 markers shown on a phone's whole board (24 cities as small seals), 73 names
  and 133 markers at 24x (3 small seals); on desktop 38 and 92 at 1x (18 small), 83 and 137 at 24x (none).
- A phone at 390 pixels with the CPU slowed 4x, one zoom step's long tasks: before 151, 82 and 73 ms (4.2x to 6.7x);
  after 110, 167 and 156 ms (6.7x to 10.7x, the relief and the fine coasts drawn). Desktop: 105 ms before, 154 ms after.
- Where the drawing and the connections disagree: 45 pairs (47 before; the Litani now parts Sidon from Qadesh and joins
  Byblos's land to Damascus's). Listed by `scripts/map-borders.ts`; item 11f settles them.
- Use against ignore: none (drawing only; no feature a king uses).
- Benchmarks: unchanged by construction (no engine, script king or batch file touched).

## Overlap with item 11f

Item 11f (#169) also changes `border-data.ts` (generated by `scripts/map-borders.ts`) and one line of `features.ts`
(`Wastes`). This item changes other lines of `features.ts` (the rivers) and regenerates `border-data.ts`; whichever merges
second runs `node --experimental-strip-types scripts/map-borders.ts` again (17 seconds) rather than merging the data by hand.

## Pictures

Before and after, phone and desktop, light and dark, at the opening and four seasons in: in the PR (branch
`pictures/item-11c-plus-plus`). `node src/web/shots.mjs <dir>` takes them again from a build.

## Questions for Haakon

1. On a phone's opening view of the Levant, the lesser coast cities (Sidon, Tyre, Gaza's neighbours) show as small seals
   and their armies are hidden until you zoom in one more step, as the item says. Reading taken: hide them, with a dark
   rim on the seal where troops stand. Alternative: keep a lesser city's counters shown as one small gathered token even
   while its badge is a seal, accepting that they may then crowd the coast.
