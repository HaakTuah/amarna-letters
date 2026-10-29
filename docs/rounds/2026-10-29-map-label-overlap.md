# Side lane: map labels overlapping (29 October 2026)

PR #196, branch `fix/map-label-overlap`. Web app drawing only; the rule is items 11c+ and 11c++
(`docs/intent/build-order/item-11.md`): a name or marker is shown at a zoom step only where it touches no more important
name and no marker.

## What was wrong

The smoke test (`src/web/smoke.mjs`) failed now and then with names over markers: "akhetaten over" a crossing mark,
"babylon over badge of susa", "byblos over" an envoy on the road, "alalakh over badge of ugarit". It passed four runs in
a row at rest and failed about one run in two with every core busy, so it showed on a loaded machine and not on a quiet
one. CPU throttling in Chromium alone did not bring it out; load on the machine did.

The rule was not at fault. Its timing was. `SvgRenderer.placeNames` measures every box as drawn on screen and gives way
by importance. It ran at once and then once more on a timer: 320 ms after a zoom settled and 700 ms after a render. Those
times were guessed from the stylesheet's transitions: the zoom's glide (.25 s) and the units' and travellers' slide
(.6 s). But a transition only starts at the next style recalculation, which comes late on a busy device. Taking the glide's
class away after 260 ms (`zoom.ts`) does not stop a glide already running either, because `transition-property` falls back
to `all`. So the last pass could measure the map mid-glide or mid-slide, and nothing placed it again. A pass with debug
output showed the last placement holding Seha's name at 58×8 px, the size it had at the old zoom; by then the name was
92×12 px.

## The fix

- `src/web/src/map/svg-renderer.ts`: the markers and names are placed again on `transitionend` and `transitioncancel` of
  a transform on `.mapzoom`, `.unit` and `.traveller`, which is the motion's real end. The two timers are removed.
  Several ends in one frame are folded into one pass, as before (`placing`). With reduced motion there are no
  transitions, and the pass made at once is already final.
- `src/web/smoke.mjs`:
  - It waits until no transition is running in the map, twice and more than a zoom's settle apart, and then two frames.
    The fixed 1.1 s wait is gone.
  - From four seasons in, it plays with the transitions slowed: glide 1 s, slides 2 s. That makes a late start certain
    instead of a matter of luck.
  - Before the fix this failed on every run, on the same cases: Akhetaten over a crossing mark (desktop, at 1.00), Babylon
    over Susa's badge (phone, 1.60), Arrapha over Ekallate's badge, a counter at Ashur on Nineveh's badge, and Akhetaten
    again in Hatti's view at 2.56. After the fix it passes, at rest and with every core busy.

## The guard

No unit test covers this. Placement needs a real layout, which Vitest's environment does not have, and the check that
items 11c+ and 11c++ grew lives in the smoke test (`namesClear`). That check is the one changed here.

## Readings taken

- **The guard is the smoke test.** The brief speaks of "the unit test that guards this (the one 11c+ and 11c++ grew)",
  and the test those items grew is the smoke test, so that is the one made to fail before the fix. Principle: one fact,
  one place. The rule's test stays where its items put it.

## Smoke test in CI

It would cost about 4 to 5 minutes in a job of its own, running beside the four test shards: install Chromium, build,
and play eight seasons on two screens. Code PR checks take about 2 minutes today, after the small test world, so
running it in parallel would lengthen every code PR's checks to about 5 minutes. That is more than a fifth, so it is not
added. Running it only when `src/web/` changes would make it cheap; that choice is the design session's.

Weekly usage: unknown (this session cannot read it).
