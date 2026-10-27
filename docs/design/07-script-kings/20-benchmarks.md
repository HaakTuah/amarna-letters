### Benchmarks

`BaselineLeader` is a frozen copy of the first script bot. `--versus solo` plays each king on the
current bot against six baselines and compares it with the same seed played all-baseline;
`--versus baseline` gives half the kings to each side; `--focus <Power>` plays one king on the
current bot. Seeds 1–40, one current king against six baselines, rerun at the end of Build order item 5 (20 October 2026,
shared victory off: its walls, sieges and capitals, its terrain, and the script players' audit of it; the numbers before
it, and why they moved, are in its report, `docs/archive/rounds/2026-10-20-sieges.md`, and the items and rounds before in theirs).
The baseline was adapted only as far as the siege package's rules required (terrain required nothing of it), so the
current bot gains more over it than before item 5. Terrain made conquest harder for it (its growth alone fell from 3.10 to
2.80), and the audit's walls against fleets and its care for the capital cost it a little more against a baseline that
seldom presses either (2.74). After the review of the siege package (walls seen only in sight, among other fixes) the
table was rerun: the same growth over all, 86% of wins instead of 85%:

| Power | Growth alone | Growth as baseline | Wins alone | Wins as baseline |
|---|---|---|---|---|
| Egypt | 2.83 | 1.07 | 100% | 3% |
| Hatti | 3.05 | 0.85 | 100% | 3% |
| Babylonia | 3.31 | 1.06 | 100% | 5% |
| Mitanni | 2.68 | 1.25 | 95% | 25% |
| Assyria | 3.34 | 1.02 | 73% | 10% |
| Arzawa | 2.05 | 1.38 | 60% | 45% |
| Alashiya | 1.90 | 0.99 | 75% | 10% |
| All kings | 2.74 | 1.09 | 86% | 14% |

The conversion to TypeScript (build order item 5+) changed the dice (a 32-bit generator, save version 7) and nothing
else, so the same benchmark gave other numbers, the same in both builds: 3.06 growth alone and 1.08 as baseline over
all, 91% of wins alone and 14% as baseline (by power in `docs/rounds/2026-10-27-conversion.md`).

Build order item 6a (the random ending: half of all ages over by season 44, so games run about twice as long, median
42 seasons in 50 script games against about 20 before) raised growth with game length: 8.26 alone and 1.25 as baseline
over all, 94% of wins alone and 14% as baseline (by power, and the same seeds with script kings that ignore the new
ending or cap their planning, in `docs/rounds/2026-10-27-ending-and-table.md`). The baseline was adapted only as far as
the rules required (it reads no ending).

Build order item 7a (the map and the seas: 54 provinces, each coast's waters, the blockade; save version 10) made wars
slower (a harbour is supplied by sea unless blockaded) and Egypt richer: 9.49 growth alone and 1.45 as baseline over
all, 96% of wins alone and 14% as baseline (by power, and the same seeds with the script kings' sea play off,
`--no-sea-play`, in `docs/rounds/2026-10-27-map-and-seas.md`). The baseline was adapted only as the rules required (it
convoys over one zone at most and never blockades).

Build order item 7b (travel and news: routes in days, the road check, closed roads, news that travels; save version 11)
made Egypt less dominant and Arzawa alone weaker: 9.30 growth alone and 1.38 as baseline over all, 89% of wins alone and
14% as baseline (by power, and the same seeds with half the kings closing their roads, `--road-play-half`, in
`docs/rounds/2026-10-27-travel-and-news.md`). The baseline was adapted only as the rules required (it never closes its
roads).

Build order item 8 (structured press, which script games are now played in; gold without an inventory; Lukka a land
without a king; save version 12) left the benchmark nearly where it was: 9.83 growth alone and 1.24 as baseline over all,
91% of wins alone and 14% as baseline (by power, and the same seeds with half the kings acting on the clauses they read,
`--clause-play-half`, in `docs/rounds/2026-10-27-structured-press.md`). The baseline was adapted only as the rules required
(it writes its letters, tablets and forgeries in clauses).

The batch runner plays script games side by side on every core; model games run one at a time,
within the budget.


Build order item 9 (envoy authority and passage; winter dangerous, never closed; save version 13) left the benchmark
about where it was: 9.73 growth alone and 1.27 as baseline over all, 91% of wins alone and 14% as baseline (by power, and the same seeds with the authority play or the winter strokes off,
`--no-authority-play`, `--no-winter-play`, in `docs/rounds/2026-10-27-envoy-authority.md`). The baseline was adapted only
as the rules required (winter closes nothing for it either; it gives no seal and asks no leave).

Build order item 9+a (the economy at home: grain, stores, markets and purses, troops' pay and food, caravans, the siege's
clock, and strength as the wealth of the realm; save version 14) changed the measure itself, so its numbers are not
comparable with those above: 2.12 growth alone and 0.99 as baseline over all, 60% of wins alone and 14% as baseline (by
power, and the same seeds with half the kings playing the economy plainly, `--plain-economy-half`, in
`docs/rounds/2026-10-27-economy-at-home.md`). The baseline was adapted only as the rules required (it sells all its
grain every season and sends no caravans).

