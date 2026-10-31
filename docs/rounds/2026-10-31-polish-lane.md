# Polish lane, 31 October 2026 (second account)

Brief: "The polish lane" in `docs/BUILD-PROGRESS.md`. Worked from the copy of the design document in `docs/intent/`
(no live document on this account). Weekly usage: unknown (this session cannot read it).

Each fix is its own PR from `develop`; this file keeps the running list.

## Fixed

- #238: the Counsel card named Sonnet as its kings; it now says Haiku, with Sonnet planning.
- #239: gold in the panels showed the treasury's fractions; rounded to the whole shekel.
- #240: the empty Play page kept no top bar and offered no way to load a log; both fixed.

Pictures for the PRs live on the branch `polish/pictures`, which never merges.

## Finds not yet fixed

- **For the item lane (changes a request to a model):** the seat view's travel line reads "Hatti: 1 season(s) each way"
  for every power (`src/engine/src/rules/views.ts:356`); the orders panel shows it as is. Fractional treasuries also
  reach the engine's `formatMoney` (`src/engine/src/rules/calendar.ts:91`), so model kings may read "10.53… shekels".
- The seat menu at 390 px cuts "Egypt (you)" to "Egypt (you" (`.viewsel` max-width 7.6rem, `app.css:351`).
- The timeline reads "s1 1345 BCE · now" while the header names the season about to be played ("Season 2"): the label
  is the last season played, and "now" beside it reads as the current one.
- Workshop check: `who-decides.test.ts` "Planning" takes 111 s against a 120 s limit, and timed out once on a busy
  machine.
- The Local agents card's footer pills wrap to two lines at desktop width ("your Claude subscription").

