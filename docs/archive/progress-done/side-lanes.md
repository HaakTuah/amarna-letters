# Progress, done: side lanes

Part of `docs/archive/progress-done.md` (its index), split from it word for word on 2 November 2026 (the workshop check: files over
about 50 KB are split).

## Side lanes

- **Done (sound lane, #350): the soundtracks and the Music page** (Haakon, 1 November 2026: "I am actaully impressed! Didn't expect much
  from the music actually! But it is good! ... I want to keep all of it, even "The tuning's scale (a test)"", then
  "Yes, please, expertly!"): keep every piece. The three soundtracks in this order everywhere, in the game's sound menu
  and on the Music page: Orchestra (the default), Lyre and reed, 8-bit last. "The tuning's scale (a test)" moves to
  the end of the Music page under "Extras". If the orchestra's files cannot load (offline, a slow phone), Lyre and reed
  plays instead of silence, since it needs no download. And on the Music page, the game's own music (the menu theme)
  fades out on entering the page and stays out while you are on it, so only what you press plays; leaving the page fades
  the theme back in. Nothing else on the page changes. Today the
  theme comes back by itself after a piece ends and plays over the sounds.
- **Done (sound lane, #351 and #352; `docs/rounds/2026-11-01-sound-lane.md`): the soundscape** (Haakon, 1 November 2026: "your ears are being assaulted now. It plays dozens of sound effects
  at any one time", then "But all the event stuff is for players only, or if you spectate a player, you hear
  specifically what they hear"): three layers, the music leading, as item 19+++ now says. The world's sounds where
  things happen (a battle's clash, a siege, a plague, a storm, a market), heard only near the view when zoomed in,
  softer with distance, for every viewer; event sounds only for one seat, its clicks and what happens to its realm, for
  its player or a spectator watching through it, never in god view; both mixed under the music, never sudden or loud,
  at most two or three event sounds at once and none repeated within a few seconds. A change in how sounds are chosen
  and mixed, not in the sounds; now, not in 17+++. And nothing heard reveals what lies beyond the fog of war (Haakon,
  1 November 2026: "Important! The music must never reveal what's outside the fog of war."): in a seat the mood, its
  shade, the stings, the great moments, the world's sounds and the event sounds follow only what the seat knows as it
  learns it; a battle or fall it has not heard of plays nothing, even zoomed in on it; a seat whose sight is missing
  from the record counts as seeing nothing, not everything (today `sight === undefined` is read as seeing all in
  `src/web/src/audio/situation.ts`); a test proves a hidden battle, siege or fall changes nothing a seat hears. What a seat hears is what its own map shows
  (Haakon, 1 November 2026: "you know where a sea is, so some things you can zoom in on and hear, without it revealing
  anything"): seas, rivers, deserts and the wind are heard anywhere the view goes; a place sounds as the seat last knew
  it, so a city burned seasons ago that the seat still believes thriving plays its market's bustle until the news
  arrives, then its ruin.

Moved here from `docs/BUILD-PROGRESS.md` on 1 November 2026 ("The workshop check").

Side lane, a smaller default world for tests (29 Oct, #136): test games play a few seated powers among idle ones
(`src/game/test/small-world.ts`); suite 2264 s to 955 s, a code PR's CI about 4 min 50 s to 1 min 52 s
(`docs/rounds/2026-10-29-small-test-world.md`).

Side lane, map labels overlapping on a busy machine (29 Oct, #196): names and markers are placed again when a zoom's
glide or a piece's slide really ends, not on timers guessed from their length; the smoke test waits for a still map and
plays a game in slow motion (`docs/rounds/2026-10-29-map-label-overlap.md`).

Side lane, the smoke test in CI (29 Oct, #199): a `smoke` job beside the test shards, only when a PR changes what the
app bundles; it caught names still overlapping after #196: Chromium re-sized map text after placement, now laid out at its own size
(`docs/rounds/2026-10-29-ci-smoke.md`).
| 17a (#321) | 1. The throttled phone's frames: the 50 ms bar is met on desktop (69 and 110 frames over 50 ms a game, none over 117 ms in play; 327 to 337 before) but not on the phone profile (a few frames of 200 to 300 ms a season, the rendering of the season's layer writes). Merge 17a and take the phone's frames up in 17+++, which redraws the season textures ("merge"), or hold 17a and rebuild the season drawing now ("hold")? | Reading: merge; readings 1-7 in `docs/rounds/2026-10-31-crash-and-speed.md` | Answered by Haakon, 1 November 2026 ("Agreed to all!"): merge; the phone's frames wait for item 17+++, which redraws the season drawing and is held to the same 50 ms bar |

Polish lane briefs, done (#256, #259, #293; moved 2 November 2026, word for word):

- **First, the README** (Haakon, 31 October 2026: "Yes, expertly to both!"): bring `README.md` up to the game as
  built: "How to play" through every item since it was written (characters and errands, the economy and hunger,
  command at a distance, city-states, the living map), the numbers the improvement audit found stale, and the
  developer section's commands; one PR, docs only. It gets a second, smaller pass in the PRs of items 17+ and 17++,
  which change the opening and how a king asks and counts ("A change a player sees updates the README" in
  `AGENTS.md`).
- **Also first, the far-zoom edge** (Haakon, 31 October 2026: "if you zoom far enough out, the world ends with just
  water to the east and west, since the map is longer on the north-south axis"; then "Yes, expertly to all!"): zooming
  out stops where the map fills the screen, and the lands beyond the game are drawn out to every edge of the frame (the
  Zagros and the Iranian plateau to the east; Greece, Crete and Libya to the west), so the map never ends at a bare edge,
  as "The map in true geography" already says.
- **Also first, Space and the speed keys** (Haakon, 31 October 2026: "pressing spacebar really needs to pause and
  unpause the game", then "Agreed to all, expertly!"): on a computer, Space pauses and unpauses, even mid-playout;
  three watching speeds, not five, since seasons are turns as in Civilization and no clock runs between them (Haakon,
  1 November 2026: "I don't feel we should introduce 5, just to have 5."): 1 Slow, 2 Normal, 3 Fast, and 4 Simulate once
  item 17+++ keeps every season ("Pace of play" under Interface); + and −, on the main keys and the number pad, step
  between Slow, Normal and Fast, by the character typed; never while a letter or a name is being typed; each shown in
  its button's tooltip. PR #293's added Very slow and fifth speed go before it merges. The rest of the keys come in item 17+++a.
