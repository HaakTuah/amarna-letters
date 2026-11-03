# The unclear lines: geography, environment, the land drawn (2 November 2026)

Part of the second point of "What remains" under the full history check ("Follow-ups" in `docs/BUILD-PROGRESS.md`;
archive items 167 and 170): the lines the check left unclear in `02-geography.md`, `03-environment-and-seasons.md` and
`13-the-land-drawn.md`, found as the anchored lines with no quote of their source. Sourced by an Opus helper at high
effort. Fixes #482.

| Dossier | Unclear | Sourced | Estimated [G] | Marked invented | Still unclear |
| --- | --- | --- | --- | --- | --- |
| 02-geography | 82 | 50 | 30 (27 road distances by the dossier's own rule, straight line plus a quarter, from Pleiades' coordinates) | 1 (the Western Desert roads) | 1 (the Lebanon crossing at Beirut, the builder's reading of the relief), and six smaller parts |
| 03-environment-and-seasons | 8 | 7 (rainfall from climate tables; the current up the Levant from Marcus) | 1 | 0 | 0 (the Nile flood's rate, unclear here, has since an estimate from the owner's-answers lane, #523) |
| 13-the-land-drawn | 2 | 2 (the Litani, the Maeander) | 0 | 0 | 0 |

The Gulf's head (`02-gulf-head`, `OldGulfShore`) is the owner's-answers lane's (#523, from #527) and is left as it is.

## What changes in the game (a new save version)

Four attested distances (`AttestedKm` in `src/engine/src/model/distance.ts`) to the dossier's rule and Pleiades'
coordinates, as #482 asked:

| Road | Before | Now | Basis |
| --- | --- | --- | --- |
| Megiddo - Hazor - Damascus | 60 + 100 | 75 + 110 | 60 and 88 km straight, and a quarter |
| Harran - Washukanni | 180 | 120 | 93 km straight to Tell Fakhariya, the likeliest site [C], and a quarter |
| Nesa - Kizzuwatna | 230 | 290 | 232 km to Tarsus by the Cilician Gates, and a quarter |
| Sinai - the Red Sea | 200 | 270 [G] | the Ways of Horus to Serabit el-Khadim and el-Markha, about 210-230 straight, and a quarter |

Cyprus to Ugarit stays 130 km, from Cyprus's eastern cape (109 straight), now said to be the dossier's estimate [G]
rather than "Ugarit's letters", which no reader reached. Other route rows the helper recomputed (Qadesh-Carchemish,
Ugarit-Carchemish, Mari-Damascus, Kizzuwatna-Ugarit, the sea to Byblos) are not `AttestedKm` entries: the game already
reckons them by the same rule.

Test changed, forced by the data and keeping its check: `map-and-seas.test.ts`, the Sinai to the Red Sea 23.5 days
(270 km at the desert's pace and the voyage), the routes it checks unchanged. And the version.

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay` before and after: in the PR.

## Other facts that changed

- The Orontes' name *Arantu* is attested only in the 9th century; Egypt's name for it was Yernet.
- Coasting ships' paces are estimates [C] (Casson, the Kyrenia II trials, as Marcus quotes them); the game's paces stay.
- The caravan from Ashur to Kanesh: about 1,000 km in about six weeks.
- Crete to Egypt 550-600 km in 3-5 days (Strabo 10.4.5; *Odyssey* 14).

## Questions for the owner

None.
