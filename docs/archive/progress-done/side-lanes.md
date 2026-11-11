# Progress, done: side lanes

Part of `docs/archive/progress-done.md` (its index), split from it word for word on 2 November 2026 (the workshop check: files over
about 50 KB are split).

## Side lanes

- **Done (sound lane, #350): the soundtracks and the Music page** (the owner, 1 November 2026: "I am actaully impressed! Didn't expect much
  from the music actually! But it is good! ... I want to keep all of it, even "The tuning's scale (a test)"", then
  "Yes, please, expertly!"): keep every piece. The three soundtracks in this order everywhere, in the game's sound menu
  and on the Music page: Orchestra (the default), Lyre and reed, 8-bit last. "The tuning's scale (a test)" moves to
  the end of the Music page under "Extras". If the orchestra's files cannot load (offline, a slow phone), Lyre and reed
  plays instead of silence, since it needs no download. And on the Music page, the game's own music (the menu theme)
  fades out on entering the page and stays out while you are on it, so only what you press plays; leaving the page fades
  the theme back in. Nothing else on the page changes. Today the
  theme comes back by itself after a piece ends and plays over the sounds.
- **Done (sound lane, #351 and #352; `docs/rounds/2026-11-01-sound-lane.md`): the soundscape** (the owner, 1 November 2026: "your ears are being assaulted now. It plays dozens of sound effects
  at any one time", then "But all the event stuff is for players only, or if you spectate a player, you hear
  specifically what they hear"): three layers, the music leading, as item 19+++ now says. The world's sounds where
  things happen (a battle's clash, a siege, a plague, a storm, a market), heard only near the view when zoomed in,
  softer with distance, for every viewer; event sounds only for one seat, its clicks and what happens to its realm, for
  its player or a spectator watching through it, never in god view; both mixed under the music, never sudden or loud,
  at most two or three event sounds at once and none repeated within a few seconds. A change in how sounds are chosen
  and mixed, not in the sounds; now, not in 17+++. And nothing heard reveals what lies beyond the fog of war (the owner,
  1 November 2026: "Important! The music must never reveal what's outside the fog of war."): in a seat the mood, its
  shade, the stings, the great moments, the world's sounds and the event sounds follow only what the seat knows as it
  learns it; a battle or fall it has not heard of plays nothing, even zoomed in on it; a seat whose sight is missing
  from the record counts as seeing nothing, not everything (today `sight === undefined` is read as seeing all in
  `src/web/src/audio/situation.ts`); a test proves a hidden battle, siege or fall changes nothing a seat hears. What a seat hears is what its own map shows
  (the owner, 1 November 2026: "you know where a sea is, so some things you can zoom in on and hear, without it revealing
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
| 17a (#321) | 1. The throttled phone's frames: the 50 ms bar is met on desktop (69 and 110 frames over 50 ms a game, none over 117 ms in play; 327 to 337 before) but not on the phone profile (a few frames of 200 to 300 ms a season, the rendering of the season's layer writes). Merge 17a and take the phone's frames up in 17+++, which redraws the season textures ("merge"), or hold 17a and rebuild the season drawing now ("hold")? | Reading: merge; readings 1-7 in `docs/rounds/2026-10-31-crash-and-speed.md` | Answered by the owner, 1 November 2026 ("Agreed to all!"): merge; the phone's frames wait for item 17+++, which redraws the season drawing and is held to the same 50 ms bar |

Polish lane briefs, done (#256, #259, #293; moved 2 November 2026, word for word):

- **First, the README** (the owner, 31 October 2026: "Yes, expertly to both!"): bring `README.md` up to the game as
  built: "How to play" through every item since it was written (characters and errands, the economy and hunger,
  command at a distance, city-states, the living map), the numbers the improvement audit found stale, and the
  developer section's commands; one PR, docs only. It gets a second, smaller pass in the PRs of items 17+ and 17++,
  which change the opening and how a king asks and counts ("A change a player sees updates the README" in
  `AGENTS.md`).
- **Also first, the far-zoom edge** (the owner, 31 October 2026: "if you zoom far enough out, the world ends with just
  water to the east and west, since the map is longer on the north-south axis"; then "Yes, expertly to all!"): zooming
  out stops where the map fills the screen, and the lands beyond the game are drawn out to every edge of the frame (the
  Zagros and the Iranian plateau to the east; Greece, Crete and Libya to the west), so the map never ends at a bare edge,
  as "The map in true geography" already says.
- **Also first, Space and the speed keys** (the owner, 31 October 2026: "pressing spacebar really needs to pause and
  unpause the game", then "Agreed to all, expertly!"): on a computer, Space pauses and unpauses, even mid-playout;
  three watching speeds, not five, since seasons are turns as in Civilization and no clock runs between them (the owner,
  1 November 2026: "I don't feel we should introduce 5, just to have 5."): 1 Slow, 2 Normal, 3 Fast, and 4 Simulate once
  item 17+++ keeps every season ("Pace of play" under Interface); + and −, on the main keys and the number pad, step
  between Slow, Normal and Fast, by the character typed; never while a letter or a name is being typed; each shown in
  its button's tooltip. PR #293's added Very slow and fifth speed go before it merges. The rest of the keys come in item 17+++a.
- **The shared core** (archive items 223 and 224), first among the side lanes and before the rule-file audit. The rules
  common to every project move to one public repository, `HaakTuah/agent-core` (renamed from `agent-rules`),
  and each project carries an exact copy of it under `core/`, pinned to one of its commits, generated and never edited
  by hand, as this repository treats `docs/intent/`. It comes in two layers (archive item 240): a safety floor every project takes whole and can never edit
  or leave out, and practice modules each project picks in a small manifest of its own; this game takes them all. What moves: the security baseline, the four pillars, the one inbox,
  keeping the owner's words, the roles and reviews, helpers, models and effort, the Git flow, usage, updates and "No
  description left untrue". What stays here: what the game is, its build order and builder rules, its commands and
  whatever only it has, each rule file cut to that, with pointers into `core/`. The steps: (1) the owner creates the
  repository and adds it to Claude's and Codex's GitHub access, which only he can do; (2) a fresh session the owner
  starts in the core repository at high effort writes the core from both games' rule files (it reads them, as they are
  public, and writes only to the core), from this brief: (a) read both games' rule files whole on `main`, as they stood
  before step 3; (b) a rule goes into the core
  if it holds in both games and would hold in any project, and one that differs only in names, paths or examples goes in
  once, with the difference left as a slot each project fills; a rule only one game has stays in that game; (c) every
  rule keeps its reason, and the owner's words behind the common rules move word for word into the core's own archive,
  never rewritten; (d) the four pillars hold for the core itself, so it comes out shorter than the two games' copies
  together; (e) nothing personal, as both games' `SECURITY.md` say; (f) done when a table lists every rule of both games
  and where it went (the core, one game, or dropped with its reason), and a fresh reviewer given only the two games'
  files and the core finds nothing lost. The design session then checks the result against both games before any game
  takes a copy; (3) each project, in a PR of its own, adds the copy, cuts its rule files to what is its own, and adds a
  check on every PR that the copy matches the core at its pin (a workflow, so the owner's yes in that PR); (4) from then
  on a core change reaches a project only through a sync PR in it, reviewed as any other. No session writes to more than
  one repository. Then the rule-file audit runs once on the core and once on each project's own rules. The same in
  Barkstreet Snakes. **Steps 1 to 3 are done** (step 3: `develop` dropped in #870, then this game took the core at
  `31f3d51`, as the core's `reports/2026-11-10-step-3-now.md` lists; report `docs/rounds/2026-11-10-shared-core-step-3.md`).
  Left: the rule-file audit (the builder rules are cut at the source and back in the copies check, and `develop` is
  gone). What the game does not yet do of the core's rules is its own queue, by way of the design session (that
  report, "What each game does not yet do").
  Moved here when done, on 11 November 2026: the rule-file audit it left ran too (#732 and the commits before it), and
  what the game does not yet do of the core's rules is the follow-up "Use against ignore, the third group".
- **Trim what every session reads** (archive item 239; a routine docs lane, for Sonnet): this file back under about
  20 KB, finished items and done follow-ups moved to the archive with a pointer.
  Done on 11 November 2026: the file is under 20 KB, its mark in `scripts/sizes.json` back to 20 KB.
