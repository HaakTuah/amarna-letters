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

## PR 2: the soundscape, three layers with the music leading (`sound/soundscape`)

- **Layers** (`mix.ts`, `player.ts`): the music on its bus at 0.9; the event sounds on theirs at 0.6 (was 0.8 for every
  sound); the world's placed sounds on a bus of their own at 0.5; the bed at 0.45 (was 0.55). `schedule()` marks each
  sound's layer: the seat's own (`Cues.sounds`) are events, the map's placed sounds (`Cues.map`) are the world's.
- **Event sounds for one seat only:** `cuesAt` gives god view no event sounds; it still hears the world's sounds near the
  view (a battle zoomed in on is a world sound there) and the music with its stings. A spectator watching through a seat
  is that seat's viewer and hears what its player hears. The screen's clicks (the stylus, the seal, the envelope, the
  envoy's lyre) come only from a seat's own orders, so they are event sounds by default.
- **The caps** (`Mixer`): at most three sounds of a layer sounding at once, the same sound not again within 4 s (events)
  or 3 s (world), judged at the moment it is to be heard, by the file's length; each sound rises in over 0.06 s. Before,
  only a quarter second kept the same sound apart, and the map's four nearest plus three of the court's could all sound
  together, every season, at top speed every 1.2 s.
- **The bed heard only zoomed in** (`bedLevel`): silent below zoom 1.5, whole at 3, as the placed sounds rise.
- Tests: `audio-mix.test.ts` (the caps, the levels, the bed by zoom, god view without event sounds).

### The review

One reviewer (Opus, high effort): nothing blocking; fixed all the same: the at-once cap now counts every sound a new
one's span would overlap, so a click at once after a season's sounds booked a few seconds ahead cannot make a fourth or
fifth; the mixer forgets the past by the present, not by a sound booked ahead, so the repeat window holds; a zoom change
during a new bed's 4 s fade now takes (the fade's end had undone it); an envoy arriving no longer sounds in god view with
the board revealed (realm news); a stale comment. The player's own clicks (the stylus, the seal, the envelope) stay heard
when a human seat acts with the board revealed: they are that seat's own acts.

### Readings taken

3. **The bed is silent zoomed out.** Item 19+++ said on 31 October that zoomed out "you hear the world's bed and the great
   moments"; the 1 November text puts the market and the wind among the world's sounds "heard only near the view when
   zoomed in". The later words win (the builder rules: where they differ, the newer document wins). Zoomed out, the music
   speaks for the board, as in Crusader Kings II.
4. **The seat's own battle and siege stay placed** (heard by zoom near where they happen), as event sounds; the war horn,
   land taken or lost, a courier and the season's stroke stay unplaced, heard at any zoom. Principle: "a change in choosing
   and mixing, not in the sounds"; what was placed stays placed.
5. **God view keeps the music's stings** (a great king's capital fallen, a great king's fall, the age's end): they are the
   music's layer, not event sounds. Principle: Haakon's three layers put only the event sounds out of god view.
6. **The caps' numbers** (three at once, 4 s and 3 s, a 0.06 s rise, the bus levels) are first guesses in Haakon's range
   ("two or three", "a few seconds"); presentation only, so tuned by ear, not in item 18.

## PR 3: nothing heard reveals the fog of war; a seat hears its own map (`sound/fog`)

- **What the record lacks is unknown** (`situation.ts`): `sightOf` reads a seat with no sight in the frame as seeing
  nothing (it was read as seeing all in `besieged`, `threatened`, the unrest check and the bed's siege camp); `owners`
  reads a seat with no known owners as knowing none (it fell back to the true owners, which drove the capital stings,
  land taken or lost and their moments). The rest already read only the seat's knowledge: the moves it saw (`seenBy`),
  the events it was shown (`visibleTo`), its own inbox and news, its own fall; the omens and the age's end are told to
  every court alike.
- **A town as the seat last knew it:** `bedAt` takes the cities the seat knows in ruins (`knownRuins`) and plays the wind
  there instead of the market; the sea, rivers, deserts and mountains are static and heard anywhere. A sack counts from
  when the seat learns of it: shown it, the city in its sight as it happened, or its dated word of the city (`knownOwner`)
  from after the sack; it is rebuilt for the seat only when it sees it so.
- **Sounds only where the seat saw:** a move is seen when either end was in sight; its march, waves and battle are now
  placed only at an end the seat saw (its own troops' anywhere).
- **The test** (`audio-fog.test.ts`): two runs of the same seasons, one quiet and one with Hatti's assault, siege and sack
  of a great king's capital and that king's fall, none of it in Egypt's sight: everything Egypt hears (mood, shade, sting,
  moment, event sounds, the map's sounds zoomed in on the place and zoomed out, the bed there) is identical; god view hears
  the sting and the battle. Also: a seat with no sight hears no foreign troops; one with no known owners hears no capital
  fall; a sack Egypt was not told of leaves the market, and once told, the wind.

### Readings taken

7. **"Its ruin" is the wind over the town**, since there is no ruin sound and the change is in choosing, not in sounds:
   the market falls silent. Alternative: a ruin bed of its own (a new sound, so a sound PR, not this lane's brief).
8. **The ruins are reckoned by the audio from the seat's knowledge** (`knownRuins`), not from the map's memory
   (`map/memory.ts`, `remember`), which counts a sack as known and a city as seen by the true owner (`ownerOf`): a seat
   whose distant city, out of its sight, is sacked and taken "knows" of it at once there, and the true unrest shows its
   rebuilding. The review found it (below). That file is the map's (the polish lane's), so the leak is reported to the
   orchestrator, not changed here; until it is fixed, ear and eye can disagree on a distant ruin, the ear being the right
   one. Word of a sack comes only by sight or by dated word of the city's holder, since the engine shows a sack only to
   its taker; the dated word is taken from the season after the sack (`turn >= frame.turn`), a season late at worst,
   never early.

### The review

One reviewer (Opus, high effort). Blocking, fixed: the ruins taken from the map's memory read the true owner, so a
seat's distant city, sacked and taken out of its sight, went silent before word came (reading 8; `knownRuins` and a test
of exactly that case). Not blocking, fixed: a march or battle placed at an end of a move the seat did not see (its goal in
sight, its start not); the hook's unclamped index. Noted: the test's "shown the sack" case is synthetic (the engine shows
a sack only to its taker), so the word-dated path is tested too.

## PR 4: the map's memory by the seat's own record (`sound/map-memory`)

The orchestrator, 1 November 2026, passed the leak found in PR 3 to this lane once the polish lane had stopped: "make
remember's sacksOf and sees decide what a seat knows of a city's sack, ruin and rebuilding from the seat's own record, by
the same rule as knownRuins, never from the true owner or the true unrest. Share one helper between the map and the
audio rather than two copies. Add a test that a distant sack the seat hasn't heard of draws nothing on its map."

- **One helper** (`src/web/src/map/known.ts`): `knownRuins` (moved from `situation.ts`), `sacksSeen`, `sackedCity` and
  `seesNow`; each season's sacks read once and kept with its frame. `map/memory.ts`'s `remember` takes its ruins from
  `knownRuins` (its own `sacksOf`, which read the true owner, is gone), its `sees` from `seesNow` (sight, or its own land
  by who it knows holds it), and draws land as wild where it knows no ruler; the audio's hook imports the same function.
- **Tests** (`map-known.test.ts`): Egypt's own distant city, sacked and taken out of its sight, the sack shown to Hatti
  only: no ruin and no wild land on Egypt's map until word dated after the sack arrives, then the ruin; map and ear agree
  every season; a known ruin out of sight stays a ruin however the city truly mends, and is seen rebuilt in sight. The
  map-scene test's own-land check now reads the seat's record too.
- Presentation only: no engine file, rule or save change; the replays are untouched (the map reads frames only).

### The review

One reviewer (Opus, high effort). Blocking, fixed: deportees were drawn on roads out of land the seat only believes it
holds, so people led out of a city it had lost unawares told it of the loss; now only on roads in its sight. Not blocking,
left: word of a city dated the sack's own season already postdates the sack, so the word path draws a ruin a season late
(never early; safe as built); a city seen rebuilt counts as a ruin again once out of sight (stale, as before); `counts`
in `memory.ts` and the bands and stores in `scene.ts` still use the true owner for a court's own famine, towns, bands and
stores, as the engine's own view does (out of this PR's task; a lost distant city's houses vanish the season it is lost).

## PR 5: a court's own land as it knows it holds it (`sound/own-land`)

The orchestrator, 1 November 2026: "memory.ts's counts and scene.ts's bands and stores use the true owner for a court's
own famine, towns, bands and stores, so a lost distant city's houses vanish the season it is lost. Make them follow the
seat's own record through known.ts, the same way #356 does. Where a court's own true figures are what its seat view
legitimately shows, keep them, and say which in the PR. Add a test that a city lost out of sight keeps its houses on the
seat's map until word arrives."

- **`ownFiguresAt`** (`map/known.ts`): the season whose own-land figures a seat's map shows for a province: none unless
  its record says it holds it; now where it truly holds it too; else the last season it truly held it. God view: now.
- **Uses:** `remember`'s towns and famine (`memory.ts`), and the scene's stores and bands (`scene.ts`): bands in its sight
  as they are, and in its own land as that land's figures stand.
- **Kept as true figures, legitimately:** the engine's own view of a court (`src/engine/src/rules/views.ts`) shows it the
  economy of every province it holds (stores, people, how they ate), the bands in its own land and the sieges of its own
  cities, read from the true owner; the map shows the same for land it holds and knows it holds. The scene's sieges keep
  the true owner (a siege of a city it holds is shown to it by the engine; a city lost has no siege left to show).
- **Not changed, the engine's:** that seat view itself drops a lost province's economy the season it is lost and lists a
  province gained unawares; that is an engine rule, outside this lane's bounds (no engine files), reported to the
  orchestrator.
- **Test** (`map-known.test.ts`): Egypt's city taken out of its sight keeps its houses and its hunger as of the last
  season Egypt held it until word arrives, then leaves its map; held and known, as it is; god view and the taker, as it is.
- **Review** (Codex, `@codex review`, the first PR of this lane reviewed by the other company's model,
  `docs/claude-and-codex.md`): round 1, 9/10, one blocking point: the README did not yet say what the player now sees;
  fixed (the living map: a distant city stands as you last knew it until the news reaches you). Round 2: no issues.
  `Review: interface · Claude · 9, 10`.

## PR 6: the province card by the seat's own record (`sound/panel-leak`)

The orchestrator, 1 November 2026, from the weekly blind re-review of #359 (7/10, one blocking point, a miss under
"Reviews" point 5): "src/web/src/components/ProvinceInfo.tsx:116-133 shows stores, market, purse, people, tax, granaries,
crop and fed from the live GameState (Play.tsx:160, s.state). It gates only on owner === scene.viewer, the known owner.
So for a city lost out of sight, the seat clicks it and reads the new holder's current economy: it learns of the loss
before word arrives, and another court's economy too. [...] Make the panel read the frame ownFiguresAt gives, and add a
test." With, not blocking: the test to assert stores and bands for a lost city; bands from old word drawn with no age;
`built` by the true owner; the fallbacks differing (`ownerFor` against `ownFiguresAt` and `seesNow`).

- **The card** (`ProvinceInfo.tsx`, `ownEconomy` in `scene.ts`): god view and land held and known show the whole economy
  from the live state, as before and as the engine's own view of a court shows it; land lost unawares shows only what
  its stewards last sent (stores, people, how they ate, from the frame `ownFiguresAt` gives) with its age; elsewhere
  nothing. The tax line reads the live harvest only where the economy is live.
- **The scene** carries `own` (each province the court knows it holds, with the season its map shows and that season's
  age); stores and bands come from it, and each band carries an `age`, drawn faded (`ghost ageN`, as a unit last seen) and
  titled "as your people last told of it, N seasons ago".
- **`built`** in a seat view: its own land by its record (`ownFiguresAt`) or as last seen, whichever is newer; never by the
  true owner.
- **`ownerFor`** (`session/frames.ts`): as the record has it. Its fallback `?? ownerOf(...)` also fired when the record
  knew a province as ownerless (owner `null`), so such a province showed its true owner; now known ownerless stays so, and
  a province the record lacks is no one's, as in `known.ts` and the audio.
- **Tests** (`map-known.test.ts`): the card and the scene for a city lost out of sight (the stewards' last report with
  its age, stores and a faded band as last held; nothing once word arrives; everything in god view and for the holder that
  knows it); `ownerFor` by the record.
- The calibration row is added to `docs/claude-and-codex.md`. The engine's seat view still drops a lost province's
  economy at once (`views.ts`, `ownedBy`): item 17++'s, as the orchestrator says.
- **Review** (Codex): round 1, P1×1: the README did not yet tell of the card's dated report and the faded bands; fixed.
  Round 2: clean; the security review found nothing. `Review: interface · Claude · P1×1, clean`.
