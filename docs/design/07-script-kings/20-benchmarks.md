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

The batch runner plays script games side by side on every core; model games run one at a time,
within the budget.

