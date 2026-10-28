# Item 10+a: people at home (28 October 2026)

Build order item 10+a (`docs/intent/build-order/item-10plus.md`, the 10+a part): "People of the land" (the three
groups and the flows between them, births, disbanded men walking home or settled as colonists, settled people moving
within their kingdom with their share of the purse, the loose drifting), "Land and climate", "Rivers" and "Seasons"
(capacity, drought, flood, fields and winter in the field), the pace terms for water, fodder and the season ("What sets
a company's pace"), the king's tax rate with hunger answering in the season it bites ("How a king lives", "The wealth of
a realm"), every use of men drawing on the men of fighting age, yield changing during a game, "The people defend their
land", and the loose men's numbers following what the roads pay against the land ("Bandits rob the purse"). Per PR #76
the starting people come from the sources (`docs/history/04-people-and-settlement.md`, `03-environment-and-seasons.md`).
Branch `item/people-at-home`; save version 17. What was built is in `docs/design/19-people-at-home.md` (the script
kings' part in `docs/design/07-script-kings/13-treasury.md`, "People at home"); this report says why, what it cost and
what was found. Weekly usage: unknown (this session cannot read it). Effort: medium, as asked. Helpers: one reviewer,
none other.

## The check for changes

Asked at the start (Build order since 64; Land, people and economy since 24; War, travel and the seas since 53; Victory
and the ending since 9; Work, money and lending since 11): nothing new. Haakon had not answered the questions of items 8,
9, 9+a, 9+b or 10 in `docs/BUILD-PROGRESS.md`, so their readings stand. Asked again before the pull request: nothing newer
than the copy, and nothing new on `develop`.

## The audit at the start

Seeds 1-50 from `develop` as it stood (every king a script king) and `--versus solo` (40 seeds). The 50 games did not
repeat item 10's after-numbers exactly (wins 2, 9, 9, 21, 2, 7, 0 against item 10's reported 2, 11, 11, 17, 4, 5, 0):
probably item 10's last change to its script kings (they question only captives of kings they are at odds with,
`fe0ca7a`) came after its benchmarks were run; `--versus solo` gave 2.51 / 1.00, 66% / 14% (item 10: 2.50 / 1.00, 67% /
14%). These, measured on `develop`'s head, are the "before" figures below.

Four signals never fired. `reputation` and `pact-with-consequences` are read from model kings' letters, which script
kings do not write. `food-bought` is the engine's own fallback for troops abroad by leave with nothing in their baggage
or depot; script kings keep such troops fed by caravan, so it is never needed (not a choice they miss). `gift-to-person`
is item 10's `gift` order given to someone who is not a false envoy: script kings give it only to false envoys (fired 3
times in 2 games, as `false-envoy-paid`), since a gift to anyone else buys nothing the rules count (it earns the person
gold and a memory; loyalty to a court comes from wages and treatment). That is a reading, not a gap: patching it would
mean inventing a use. No other feature went unused, so nothing was patched.
