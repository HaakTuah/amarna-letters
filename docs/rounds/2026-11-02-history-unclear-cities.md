# The unclear lines: people and towns, water, walls and harbours (2 November 2026)

Part of the second point of "What remains" under the full history check ("Follow-ups" in `docs/BUILD-PROGRESS.md`;
archive items 167 and 170): the lines the check left unclear in `04-people-and-settlement.md`, `10-water.md` and
`12-walls-roads-harbours.md`, found as the anchored lines with no quote of their source, mostly where the excavation
reports were out of reach. Sourced by an Opus helper at high effort; the water of Jerusalem, Arwad, Hattusa, Harran and
Kizzuwatna was left to the lane answering #492.

| Dossier | Unclear | Sourced | Estimated [G], by the published estimates | Marked invented, with what was searched | Still unclear |
| --- | --- | --- | --- | --- | --- |
| 04-people-and-settlement | 28 | the lines #523 does not change: Dur-Kurigalzu, Washukanni, Megiddo, Jerusalem, Kalavasos, Apasa, Thebes and Memphis | Thebes and Memphis | the rest went to #523 | 0 |
| 10-water | 13 | 8 | 0 | 6 | 0 |
| 12-walls-roads-harbours | 48 | 26 | 0 | the walls rows with no report found, the roads, stations, beaches and harbour levels | 5 (Akhetaten's open city, Byblos's walls, Kalavasos, RS 20.212, the harbour studies) |

## What changes in the game (a new save version)

By the estimate rule ("History holds": the published estimates, their middle, each cited, graded [G]):

- **Waset (Thebes):** about 70,000 (Morris about 75,000 by 1500 BC; Seshat's largest Thutmosid settlement 30,000-100,000),
  not "tens of thousands". `ProvinceEconomies` in `src/engine/src/model/economy.ts`: 30 -> 70 thousand. Memphis stays at
  30,000 (Chandler). Egypt's starting strength rises from 17,975 to 19,775.
- **Nesa's walls:** "there are no indications that it was inhabited in the Late Bronze Age" (Livius, "Kaneš"): its walls
  start at none, not one (`StartWalls` in `src/engine/src/model/map.ts`).

The lines the owner's-answers lane (#523) changes at the same time (Hatti's and Susa's people among them, 21 rows of
these three dossiers) are left to it; what this lane's helper found for them is in a comment on #523.

## Tests changed, each forced by the data and keeping its check

- `engine.test.ts`: 54 walled provinces, not 55 (Nesa).
- `map-crossings.test.ts`: the siege at Nesa gives Nesa a wall in the test, as the test needs troops shut inside walls.
- `rulebook-text.test.ts`: Egypt's starting strength 19,775.
- `save-version.test.ts`: the new version.

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay` before and after: in the PR.

## Other facts that changed

- Washukanni is not located: a neutron activation test "appeared to rule out Tell Fakhariya".
- Enkomi: a fort from Late Cypriot I; its cyclopean town wall only after 1200. Ugarit's rampart traced on the south-west
  (IFEA 2026). Qatna's rampart about 18 m round about 110 ha. Qadesh's Middle Bronze enclosure about 40 ha [C].
  Jerusalem's Spring Tower disputed. Sapinuwa's fortifications reported [C]. Aleppo's walls [S].

## Flagged, not changed

- Sapinuwa's water came "from these hills" (Outside rather than Cisterns?), and Mira's candidate capitals stand on rivers
  (River rather than Cisterns?). Each would change a city's siege; both rest on unlocated or unsure sites, so the game's
  kinds stay, the lines say so.

## Questions for the owner

None.
