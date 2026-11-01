# The sound lane (1 November 2026)

A side lane beside the item lane (17+), owning `src/web/src/audio/`, the Music page and the game's sound menu. Presentation
only: no rule, number, script play or save version changes; the script games and replays are identical. Weekly usage:
unknown (`scripts/usage.sh` cannot read it in this session).

The check for changes: this account has no live document, so the copy on `develop` was read by its diff from the lane's
start (`57c9c8b`, which already carries the design session's two sound entries, "Three layers, the music leading" and
"What a seat hears is what its own map shows", in item 19+++).

## Haakon's words (1 November 2026), passed on by the orchestrator

1. **Answers to the music questions:**
   - Keep Kilmer's reading of the Hurrian Hymn, with one line on the Music page saying it is her reading, one of several
     modern reconstructions.
   - The Music page shows our own pieces' names and moods only. Take Empire Earth's name, track titles and lengths off it.
     The repository's docs may still say Empire Earth was the template; only the player's view changes.
   - Move both questions to answered in the "For Haakon" table.
2. **The soundtracks and the Music page:**
   - Keep every piece, the tuning test included.
   - The order everywhere is Orchestra (the default), then Lyre and reed, then 8-bit last.
   - "The tuning's scale (a test)" goes to the end of the Music page under "Extras".
   - If the orchestra's files cannot load, play Lyre and reed instead of silence.
   - On the Music page, fade the menu theme out on entering and keep it out while the player is there. Today it comes back
     after a piece and plays over the sounds. Leaving the page fades it back in.
   - Nothing else on the page changes.
3. **The soundscape. Do it now, not in 17+++.** Today there are far too many sound effects at once. Follow Crusader Kings
   II, with three layers and the music leading:
   - **The music.**
   - **The world's sounds** (battle, siege, plague, storm, market, wind): heard only near the view when zoomed in, softer
     with distance.
   - **Event sounds, for one seat only:** its clicks and what happens to its realm. Its player hears them, or a spectator
     watching through that seat; never god view.
   - **The mix:** both sound layers sit under the music, never sudden or loud. At most two or three event sounds at once,
     and none repeated within a few seconds.
   - This is a change in choosing and mixing, not in the sounds.
4. **Nothing heard reveals the fog of war:**
   - In a seat, the mood, its shade, stings, great moments, world sounds and event sounds follow only what the seat knows,
     as it learns it.
   - A battle or fall the seat hasn't heard of plays nothing, even zoomed in on it.
   - A seat with no sight in the record counts as seeing nothing. Today `src/web/src/audio/situation.ts` reads
     `sight === undefined` as seeing all.
   - Add a test that a hidden battle, siege or fall changes nothing a seat hears.
5. **What a seat hears is what its own map shows:**
   - Seas, rivers, deserts and the wind are heard anywhere.
   - A place sounds as the seat last knew it. A city burned seasons ago that the seat still believes thriving plays its
     market until the news arrives, then its ruin.

Haakon's words behind them, as the progress file and item 19+++ quote them: "I am actaully impressed! Didn't expect much
from the music actually! But it is good! ... I want to keep all of it, even "The tuning's scale (a test)"", then "Yes,
please, expertly!"; "your ears are being assaulted now. It plays dozens of sound effects at any one time", then "But all
the event stuff is for players only, or if you spectate a player, you hear specifically what they hear"; "Important! The
music must never reveal what's outside the fog of war."; "you know where a sea is, so some things you can zoom in on and
hear, without it revealing anything".

## PR 1: the music answers and the Music page (`sound/music-page`)

- **The page** (`pages/Listen.tsx`): the column "After Empire Earth's" became "Mood" (each piece's own mood line), and the
  introduction no longer names the other game; the template stays in `catalogue.ts` and design note 45, unseen. One line
  under the side-by-side section: the Hurrian Hymn is heard in Kilmer's reading, one of several modern reconstructions.
  "The tuning's scale (a test)" moved from the side-by-side table to "Extras" at the page's end, with its two buttons.
- **The order** Orchestra, Lyre and reed, 8-bit: the sound menu's select (`AudioSwitches.tsx`), the side-by-side table's
  columns and the Extras buttons, and `Styles` in `settings.ts`, tested.
- **The orchestra's fallback** (`player.ts`, `style()`): Lyre and reed plays when an orchestra file fails to load (the
  element's `error`), when the browser reports itself offline as a piece is chosen, or when a stream asked for is not
  heard within 12 s while the audio runs (a slow phone). It lasts until the browser comes back online or the player picks
  another version. Checked in Chromium with the music files blocked: the status reads `period`, the synth playing.
- **The theme hushed on the Music page** (`Player.hush`): entering fades the game's music out over 1.5 s and keeps the
  director from starting anything while the page is open; a piece ending or a button released no longer brings the theme
  back. Leaving fades it in over 3 s on the opening stage. Checked in Chromium through the top bar's link and back.
- The two answered rows moved from "For Haakon" to `docs/archive/progress-done.md`.

### The review

One reviewer (Opus, high effort). Blocking, fixed: the stall watch counted page time while the director was not running
(a hidden tab, the music off, a sting), so a stream re-asked after a long pause could be judged stalled at once; now the
wait restarts whenever a paused stream is asked again, a sting clears it, and none is set with the music off. Not
blocking, fixed: coming back online now hands the music back to the orchestra at once (no two versions overlapping); the
synthesised versions fade out on entering the page instead of cutting; the return after the page fades in from the
moment the music is actually heard, however slowly its stream loads. Noted: the page's text also no longer names the
original Civilization ("the fallback after the original Civilization"), another game's name, in the spirit of the answer.

### Readings taken

1. **"Cannot load" is a failed file, an offline browser, or a stream silent for 12 s while the audio runs**, and the
   fallback holds until the browser is back online or the version is chosen again rather than retrying the orchestra at
   every piece (a phone that cannot stream would otherwise fall silent between pieces). Principle: the answer's own aim,
   music instead of silence.
2. **The template field stays in `catalogue.ts`** (unrendered), since the repository's docs may keep it. Principle: one
   fact, one place; only the player's view changes.
