# Item 19+++: the music: the composing (31 October 2026)

Weekly usage: unknown (this session cannot read it). The second session of item 19+++, a lane beside 17a: the first
(`docs/rounds/2026-10-31-music.md`, #237) built the sound system with placeholder pieces and handed over; this one
composed the pieces and the fallback's scores, on the branch `music/19-plus3-compose`. Worked from the copy in
`docs/intent/` (no live design document on this account); the check for changes against `develop` found Haakon's
answer of 1 November on the default volume (built here, below). Presentation only: no rule, number, script play or save
version changed; the script games are identical.

The orchestrator's message of 31 October (received while this session worked): "From the orchestrator, for your
information. Haakon (31 October 2026): 'music and sound on by default at a regular volume, not quiet, with the first
music fading in at start-up so it never blasts. Item 19+++ and its progress row now say so.' The Opus sound-system
session is making that change in a small PR of its own after #237. Don't build it yourself. Mix your pieces for a
regular default volume, and make sure the opening piece suits a fade-in. Quote the instruction in your report." So the
default volume and the fade-in are not in this PR (a first draft of them was taken out again); the pieces are mastered
to one loudness (-18 LUFS) for a regular volume, and the Hymn to Nikkal, the first piece heard, opens 7 dB under its
height, so a fade-in lands on a quiet lyre and drone.

## Questions for Haakon

1. The Hurrian Hymn's score (Ugarit's theme, in both of the fallback's versions, and the orchestra's hymn pieces) follows
   Anne Draffkorn Kilmer's reading of the notation: each named pair of the lyre's strings sounded together, the
   first-named string sung above the other, in nīd qablim. Dumbrill's or West's readings hear the pairs one note after
   the other and give another tune. Keep Kilmer's? (Reading taken: Kilmer's, the first published and the one the
   sound system was built on. Alternative: Dumbrill's melodic reading, which a later session could write in its place.)

The rest is judged by ear: every piece, variation and score is on `/listen`, and any Haakon dislikes is redone.

## Haakon's words in this item

Relayed by the orchestrator, 31 October 2026:

- "Keep the music lane (19+++) running. When the improvement audit is done, restart the music lane on Fable 5.1 at high
  effort for the composing; the current Opus session builds the sound system (playback, the layers that switch with the
  situation, the samples) until then and hands over what it built."
- "Music lane (19+++): re-read the 19+++ section on develop now. Build the Civilization-style fallback alongside the
  Empire Earth pieces, and make some of each piece's variations a darker or brighter mode chosen as the situation
  worsens or improves."
- "Music (#237): one fallback score in the Nippur and Ur modes, built alongside the Empire Earth pieces."

From the design copy (item 19+++, revision 193 of 1 November 2026, answering the first session's question on the default
volume): "Agreed. Keep them on, regular volume, but don't blast someone when they start up, like say CK2, even though the
main theme there was epice. SO i didn't really mind."

## What was composed

**The fourteen orchestra pieces** (`scripts/music/pieces_peace.py`, `pieces_war.py`), one for each of Empire Earth's,
each in its role, mood and pace and nothing of its own; three variations each, some in a darker or brighter tuning.
How each is made is in `src/web/src/audio/catalogue.ts` (shown on the listening page); in short:

| Piece | Tuning, pace | Length | Variations (lead; shade) |
| --- | --- | --- | --- |
| The Hymn to Nikkal (menu) | nīd qablim on A, 64 | 2:36 | reed; choir, nīš tuḫrim (-1); pipe |
| The Brotherhood of Kings (calm) | išartum on D, 68 | 2:02 | recorder; reed, kitmum (+1); strings, embūbum (-1) |
| The River (calm) | embūbum on F, 60 | 1:57 | pipe and harp; recorder and lyre, pītum (-1); choir and psaltery, išartum (+1) |
| Envoys (tension) | pītum on G, 88 | 1:33 | reed; pipe and celli, nīd qablim (-1); strings and clarinet, nīš tuḫrim (-2) |
| Shadows (tension) | nīš tuḫrim on E, 54 | 2:16 | clarinet; reed, qablītum (-1); celli, qablītum (-2) |
| Enmity (tension) | nīd qablim on A, 60 | 2:58 | celli and violins; clarinet and reed, nīš tuḫrim (-1); celli and horn, qablītum (-2) |
| Chariots (war) | pītum on D, 96 | 1:30 | horn and trumpet; reed and horn, nīd qablim (-1); strings and trumpet, nīš tuḫrim (-2) |
| Battle | nīš tuḫrim on E, 126 | 1:19 | horn and trumpet; trumpet and horn, qablītum (-2); horn and strings, qablītum (-2) |
| Siege | nīš tuḫrim on C♯, 80 | 1:05 | reed; horn, qablītum (-2); clarinet, qablītum (-2) |
| Triumph (moment) | išartum on D, 92 | 0:53 | trumpet; horn, kitmum (+1); strings, kitmum (+1) |
| The City Falls (moment) | nīš tuḫrim on D, 84 | 0:51 | horn and strings; reed and horn, qablītum (-2); trumpet and celli, qablītum (-2) |
| Lament for the Fallen (moment) | nīš tuḫrim on E, 58 | 2:29 | reed; pipe, qablītum (-1); choir, qablītum (-2) |
| Solemn (moment) | nīd qablim on D, 52 | 0:51 | strings; reed, nīš tuḫrim (-2); choir, nīš tuḫrim (-2) |
| The Last Seasons | nīd qablim on A, 56 | 2:30 | pipe; reed, nīš tuḫrim (-1); choir |

What is in them: the Hurrian Hymn whole in the Hymn to Nikkal (one voice over the lyre, the strings and the harp with the
frame drum, an answer of our own from the hymn's close, the height by all with the choir on the song, the pipe and lyre
alone, the going) and slow in The Last Seasons over the lyre's strokes like a clock; lines 2 and 3 in The River over the
harp in threes, lines 1 and 2 as a fanfare in Triumph, line 4 between the Lament's verses. Themes of our own in the
other pieces: a stately theme in two halves and a middle (Kings), a question never resolved over a walking pizzicato and
the darbuka (Envoys), a low Phrygian motif over tremolo strings and bells off the beat (Shadows), a heartbeat under a
motif that swells twice to a height and falls back (Enmity), a march on the horn with the trumpet answering (Chariots),
a low ostinato under horn calls and the trumpet's cry, the tremolo's semitone above and the choir's short cries
(Battle), the ram's knock under horns on a semitone and a reed's wail (Siege), a line falling the octave twice (The
City Falls), a chorale (Solemn), a heavily ornamented lament (the Lament). Every piece has a rise and a fall marked on
its score (`Score.level`), so a quiet opening and its height stand 10 to 18 dB apart after mastering (the placeholders
were within 5 dB throughout).

**The fallback's scores** (`src/web/src/audio/synth/score.ts`), in the original Civilization's manner, one score for both
of its versions (8-bit, and lyre and reed):

- Ugarit's theme is the Hurrian Hymn whole (four lines, 61 beats), from Kilmer's reading (question 1), its source named
  on the listening page; the placeholders (`HymnPlaceholder`) are gone.
- A theme and a march of its own for each of the seven great courts (Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa,
  Alashiya), 32 beats each, written in degrees so each plays in the court's home mode: Egypt's procession and trumpets,
  Hatti's mountain court and march (in fourths), Babylonia's learned court and the king's array, Mitanni's horse-lords
  and chariots, Assyria's austere court and host, Arzawa's western dance and march in threes, Alashiya's island and
  copper fleet. Ugarit's march is the hymn's first line as a march.
- Shared moments: Triumph (a fanfare, a step brighter), The City Falls (a line falling the octave), the Lament (for a
  king fallen and for land lost, two steps darker), The Last Seasons (the hymn slow, a clock on the beat).
- Within each score the layers come and go with the mood: a slow drum in peace, a heartbeat in unease, the march in
  war, the gallop in battle, the ram in a siege, the chord only in peace and at a feast, the sistrum at a feast.
- Keyed by the viewer's court (the step the handover left): `synthPiece(id, court)` in `score.ts`, used by
  `player.ts`; the listening page lets you choose the court, the mood, the tuning and the shade and hear each score as
  the game would play it, with the orchestra's pieces of the same role beside it.

**Tools**: `scripts/music/check.py` looks at every score before a render (length, the longest wait between phrase ends,
each instrument's range against its recordings); `Score.level` and `gain_at` in `score.py`; `held_ramp`, `trem`,
`swell`, `ostinato`, `strokes` and `roots` in `parts.py`; `idiom.py` (lines in degrees, the hymn over the lyre, open
chords); `Mode.chord` takes the fourth where a tuning's fifth is diminished.

## Readings taken

1. **The template's lengths are not kept**: Empire Earth's long pieces (Emnity 11:04, The Fallen 6:47, Balance of Power
   6:18) answer to pieces of 1 to 3 minutes here, since the music changes with the situation at a phrase end and rests
   between quiet pieces, so a long piece would rarely be heard through; the roles and the relative lengths are kept
   (Enmity the longest, Solemn and Siege the shortest). Principle: the item asks for each piece's role, mood, pace and
   colour, not its length.
2. **The Hurrian Hymn is read after Kilmer** (question 1): the string pairs sounded together, the first-named sung, the
   numerals as lengths, Laroche's text (lines 3 and 4 as the first session had them; the editions of Dietrich and
   Loretz and of West could not be reached from this session). Principle: the item asks for one named reconstruction,
   and this is the reading the sound system's hymn pieces were built on, so one voice runs through all three versions.
3. **A shade's sign is what matters**: the player prefers a variation by the sign of its shade (darker, its own,
   brighter), so a piece written in nīš tuḫrim, which can only go one step darker (to qablītum), marks its variations
   for the darkest situations -2 all the same. Principle: "the music chooses the darker as the situation worsens": what
   is heard is one step darker, which is what the tuning allows.
4. **Two dark variations for the pieces of war and loss**: at war the shade is always -1 or -2, so a war piece with one
   dark variation would alternate it with a plain one; two of three are dark, so the dark ones alternate ("never the
   same variation twice running"). Likewise two bright for Triumph. Principle: the rule on variations and the rule on
   shades both hold.
5. **No held chord holds a diminished fifth, in any tuning**: where a tuning's fifth above a degree is a tritone (the
   tonic's own in qablītum, the fourth degree's in kitmum), the chord takes the fourth, and a progression moves off that
   root; in the orchestra by `Mode.chord`, `idiom.fifth` and `parts.roots`, in the fallback by `consonant` and
   `groundDegree` in `arrange.ts` for every score in every tuning (a test plays each chord in all seven). Principle: it
   must sound good, not merely correct; a lyre tuned to that pair would be struck so.
6. **The choir is used as a pad and for the height**, on closed vowels except at the heights and in Battle's cries,
   since it is synthesised (the first session's reading 10). Principle: taste, within "choir, strings, reed and drums".
7. **The fallback's courts are the seven great kings and Ugarit**: "a few for each court" is read as the courts a human
   plays (the seven great kings) and Ugarit, whose theme the item names; every other power (the city-states), god view
   and the menus hear Ugarit's, the game's voice. Principle: "The game in one page" and the engine's list of the seven
   great kings; a theme for each of the twenty-odd city-states would be heard by nobody.
8. **The default volume and the fade-in are the sound system session's** (the orchestrator's message above); this PR's
   part is that the pieces suit them: one loudness, and a quiet opening to the first piece heard.
9. **The pieces were judged without ears** (this session cannot listen): by `check.py` (ranges, phrase gaps), by the
    spectrogram, loudness curve and click count of `inspect_audio.py` on scratch renders, and by construction (modal
    lines over drones and open chords, no clash by design). Haakon's ear is the judge; the PR says how to hear each.
10. **Render once**: the 42 files were rendered once, after the scores passed the checks, since every render stays in the
    repository's history (about 28 MB a render).

## The review

One reviewer (Opus, high), on the diff, the item's text and "The game in one page": no conflict with either; two
blocking findings, both the same fault, fixed: (1) the darkest orchestra variations (Shadows 2 and 3, Enmity 3, Battle
2 and 3, Siege 2 and 3, The City Falls 2 and 3, and the Lament 2 and 3, found on the same pass) held the tonic's
fifth as a fixed `m(4)` in their pads, horns and tremolo, which in qablītum is a tritone; now `idiom.fifth` gives the
fourth there, and the eleven files were rendered again (the other variations' renders are unchanged, Enmity 1 checked
byte for byte); (2) the fallback's shared Fall and Lament, heard two steps dark at every court, held fifths in
qablītum and pītum; both are rewritten in fourths on the first, fourth and seventh degrees, and `consonant` in
`arrange.ts` now keeps every chord of every score free of tritones in every tuning (findings 3 to 6, the court
marches, themes at a feast, Triumph a step brighter and the hymn at each court's home mode, fall under the same rule;
a test covers all seven tunings). Of the rest: the 8-bit hymn's strings beneath now sound an octave down (a layer's
`below`); a theme carries only the layers of peace and unease and a march only those of war (the layers no mood could
call are gone); The Last Seasons' longest stretch is 19.3 s, under the player's 20; Alashiya is named in the design
note; the fade-in's two faults are moot, since that change is the sound system session's. Develop was merged before
the review (the design copy at revision 193).

## Use against ignore

Not applicable: presentation only, no seat uses it; the script games are identical (no engine, game or rule file
changed).

## How to hear it

`/listen` ("Music" in the top bar), or the PR's preview:

- **The pieces**: the first table, each piece with its three variations (the shaded ones are named in "how it is made");
  when the game plays it is in the third column.
- **The fallback, court by court**: the second table; choose the court (Ugarit's theme is the hymn), the mood (the drums
  and the chord change with it), the tuning (the court's home mode, or any) and the shade, then press 8-bit or Lyre and
  reed; the orchestra's pieces of the same role are beside each score.
- **In a game**: any watched game (`/play?watch=3`) plays the dynamic music;
  `window.amarnaAudio.status()` in the console says what plays and why. Switch the version in the game menu to hear the
  fallback in play.

## Where to pick up

- The sound system's feed from 17a's event stream (#236) is still the first session's "What waits on 17a's event stream".
- If Haakon's ear asks for another reading of the hymn (question 1), `HymnSung` and `HymnBeneath` in `score.ts` and
  `NOTATION` in `hymn.py` are the two places to change; both versions follow.
- Any piece he dislikes: its function in `pieces_peace.py` or `pieces_war.py`, `check.py` to look, `render.py music <id>`
  to render it alone.
