# Visual overhaul (build order item 2)

Before I start testing with model leaders myself, the interface needs a graphical makeover. I watch the game in spectator mode, and right now it's too hard to follow. This round is presentation only: don't change the engine, rules or balance. Treat phone and desktop as equally important, as described under platforms in the design document.

Keep all existing panels, statistics and tracking. Don't remove any information; only make it easier to read and navigate.

## Ground rules

- This is item 2 of the build order in the design document. Branch from `develop` after item 1 is merged there, so you build on its rules and seat view, and follow the builder rules in "Build order" (merge into `develop` when tests pass and one reviewer finds nothing blocking; never into `main`).
- You may add map data to the engine project (terrain, rivers, crossings), but nothing in the engine may read it. Seeds, replays and the test suite must give exactly the same results as before, and every existing test must pass.

## Style

- Aim for the spirit of a museum map or an archaeological board game, polished and atmospheric. Dimensions, animation, rendering approach and visual details are up to you; surprise me.
- Use a Late Bronze Age palette (lapis blue, carnelian red, gold, ochre, clay and bitumen black) that still gives each power a clearly distinct color. Keep the existing clay-and-parchment feel, with light and dark modes.
- Each power must also be distinguishable without color, for example by a pattern or emblem on its units and borders, so the map works for color-blind players.
- Use original icons with period character: chariots for armies, ships for fleets, a small clay tablet or traveller for envoys, and oxhide ingots for gold shipments. Seal-inspired patterns may be used as ornament, but don't reproduce any specific ancient artwork.
- Readability comes first: a clear serif for headings and a highly legible typeface for body text and labels.

## Geography

- Show the local geography on the map: seas and coastlines, the Nile, Euphrates and Tigris and other important rivers, mountains, desert, and fertility (for example how rich a province's land is, based on its yield). Keep provinces roughly where they are.
- Store terrain as map data, per province and per connection, even though it has no game effect yet. Walls and terrain affecting defense are planned, so use the lists already decided in `docs/rounds/2026-10-18-sleep-and-simulation.md` (the report of the sleep-and-simulation round), and the siege round can reuse your data unchanged:
  - rough provinces and the river and mountain crossings: question 5, plan step 14;
  - the Sinai desert: question 5, plan step 15;
  - the ordered courses of the Nile, Euphrates and Tigris: question 10, plan step 2.
- Don't add any game effects now.
- Design the map so infrastructure (roads, relay stations), walls and sieges, and generals leading armies can be shown later. They aren't in the game yet, so don't draw them now.

## Map

- The whole map must fit the available space without scrolling, on both desktop and phone, with pinch-zoom and pan on touch screens.
- Units must be readable at a glance: clear, distinct symbols for armies and fleets, colored by owner, large enough to see, with a count if several are stacked. A province's owner and the units standing in it must be visually distinct.
- Mark capitals, neutral cities and sea zones clearly, avoid overlapping labels, and add a compact legend.
- Show what happened this season: movement, attacks, supports, bounces and captured provinces, stepped through with the timeline.

## Characters and what's on the road

- Show characters where they are: envoys on the road and at foreign courts, and spies at their posts.
- Each view shows only what that seat knows. In a power's view, show its own envoys and spies, and foreign envoys only while they are at its court. God view shows everyone.
- Show what's on the road: envoys and gold shipments along their routes, with where they're going and when they arrive. A paid ransom travels on its own, without an envoy; show it as a gold shipment too.
- The engine stores no route or position for travellers, only a departure and an arrival season. Draw each one along the shortest path between the two courts, at a position interpolated by season, and make it look approximate rather than exact.
- Add a "follow this character" view: select a person and see their path on the map across the timeline, their employers, missions, what they said and reported, and their fate, within what the current view is allowed to know. Characters will take on more roles and lives of their own later, so build it to grow.

## Fog of war as a gradient

- In a power's view, the map should show how old and how certain its knowledge is, not just visible or hidden. Areas seen this season are fully clear; areas last seen long ago fade, with the season they were last seen.
- Uncertain information, such as units last seen long ago, spy reports and rumors, should look uncertain, for example as ghost outlines, so the player can tell what they know from what they believe.
- Derive this from the seat's own earlier views and reports, without changing the engine. If the data you need isn't available, tell me what's missing instead of changing the engine.
- Be honest about ownership. Who holds each province is still public and live in the engine, because news that travels isn't built yet. Show ownership as known; don't invent an age for it. Apply the gradient to units, spy reports and rumors, and list in the report what the gradient will need once news travels.
- God view shows the true state of everything.

## Dates and status

- Implement question 26, plan steps 1-3, in `docs/rounds/2026-10-18-sleep-and-simulation.md` (the report of the sleep-and-simulation round): one date-label helper used for every date in the interface (the court's season and year, with the turn), and an ending line in the header ("the age cannot end before …", then "any season may now be the last"). Replace every bare "turn N" in the interface with it.
- In the message trail, show a status such as "on the road, arrives in the second season, year 3 (turn 8)" instead of empty dashes when an envoy hasn't arrived yet.
- In god view, show which seats are asleep, when each wakes at the latest, and what woke it, with the same date labels.

## Phone first: watching is the first milestone

Watching a game on a phone is the first and most important milestone of this item. Get it right before anything else, and treat the rest of this prompt as building on it.

- A whole bot game can be followed on a phone in portrait, one-handed: the map, who moved where, who attacked whom, where the envoys are, and the message trail.
- The map fits the phone screen, with pinch-zoom and pan; the timeline and season controls are reachable with a thumb.
- Panels open from the map and close back to it without losing the map's place or zoom.
- Landscape works too, and the layout respects the phone's safe areas (notches, the home bar).
- Measure on a throttled phone first, and judge every later choice against the phone build.

## Playing on a phone (after watching works)

Then make a human seat playable on a phone, as the design document's platform section describes:

- Touch targets large enough for a finger. Small provinces are hard to tap, so add a province list as an alternative to tapping the map, as the design document suggests.
- The order screen and the letter composer work with a phone keyboard: short fields, no layout jumping when the keyboard opens, and letters kept short, as the design document wants.
- The web app can be installed to the home screen and starts fast from cache (an installable web app). Push notifications can wait.

## Layout

- On desktop: map and panels side by side, with the map always fully visible.
- On phones: the map first, with the panels (message trail, people, standings, events, chronicles) easy to reach.

## Credits

On the About page and in the README, credit the game's inspiration: Irving Finkel, *Curator's Corner* episode 100, "Reading the Pharaoh's private mail with Irving Finkel", The British Museum (https://www.youtube.com/watch?v=3MZq_ZQDhJA), with William L. Moran's *The Amarna Letters* for the translations.

## Performance

- Whatever you choose, it must be extremely well optimized without sacrificing fidelity.
- Measure, don't guess: profile in the browser with mobile CPU and network throttling, and include the numbers in the report: first load, time to interactive, smoothness of anything that moves, and time to switch seasons in the timeline.
- Interactions should respond instantly and anything that moves should stay smooth, also on a throttled phone. If a target can't be met, say what is limiting it.
- Techniques worth considering: keep the static map separate from what changes each season, reuse icons rather than redrawing them, and make sure Blazor doesn't re-render the whole map every season (ShouldRender, keys, small components).
- Respect the system's reduced-motion setting.

## Verification

- Check the result in the browser at phone width first, in portrait and landscape, then at desktop width; take screenshots of each and include them in your report.
- Confirm the phone milestone separately: a whole bot game followed on a phone-sized viewport in portrait, without scrolling the page.
- Run a whole bot game in spectator mode and confirm that I can follow who moved where, who attacked whom and where the envoys are, without scrolling.
- Show the fog-of-war gradient in a power's view in the screenshots, and confirm that a power's view shows no envoy or spy it shouldn't know about.
- Confirm that replays of existing seeds are unchanged and all tests pass.
- Include the performance measurements described above.
