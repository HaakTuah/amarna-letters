# The music and the sounds (item 19+++)

Presentation only: no rule, number, script play or save version changes, and the script games are identical. The game
had no sound before this item.

Haakon, 31 October 2026 (relayed by the orchestrator): "Keep the music lane (19+++) running. When the improvement audit
is done, restart the music lane on Fable 5.1 at high effort for the composing; the current Opus session builds the sound
system (playback, the layers that switch with the situation, the samples) until then and hands over what it built." The
sound system was built first with placeholder pieces (handover in `docs/rounds/2026-10-31-music.md`); the pieces and
the fallback's scores were then composed in a session of their own (`docs/rounds/2026-10-31-music-composing.md`).

## The template: Empire Earth's music

Empire Earth (2001; music by Steve Maitland and Ed Lima; Wikipedia's infobox) shipped eighteen music files, which are
fourteen pieces, four of them in two versions (the track list as fan uploads of the game's files give it, with lengths):
Main Theme 3:41, Balance of Power 6:18, Battle 2:09, Arthurian 1:32, Emnity 11:04, Guillotine 1:49, Honor 1:53 (and an
alternative, 2:44), Pawns 4:09 (and 5:57), Rivers 5:28, Shadows 6:04 (and 6:19), Siege 1:22, Solemn 0:53, The Fallen
6:47 (and 3:27), Time 3:31. No source found says exactly when the game played each; the roles below are read from the
titles, lengths and the item's own list of situations (calm, rising tension, war, siege, battle, triumph, loss, the
age's last seasons), and are listed as a reading. Ours: one piece for each, the same roles, three variations each, in
`src/web/src/audio/catalogue.ts`. The player never sees the template: the Music page shows our own pieces' names and moods
only (Haakon, 1 November 2026, answering the polish lane's question: our piece names and moods only; the template stays
in these notes).

**The pieces** (`scripts/music/pieces_peace.py`, `pieces_war.py`; the idiom in `idiom.py`): the melodies are the
Hurrian Hymn's (the Hymn to Nikkal, The River, Triumph, The Last Seasons, and a line of it in the Lament) and themes of
our own in the tunings (the rest), over the period's harmony: drones, open fifths and fourths, a third only where it
colours. Each piece has a rise and a fall marked on the score (`Score.level`, in dB), so a quiet opening and a height
stand 10 to 18 dB apart after mastering; each variation has another lead and course, and one or two of the three are the
piece in a darker or brighter tuning (below). Where a tuning's fifth above a degree is diminished (the tonic's own in
qablītum, the fourth degree's in kitmum), the open chord takes the fourth instead (`Mode.chord`, `idiom.fifth` for a
pad's or a horn's held fifth), and a progression moves off that root (`parts.roots`). Lengths run from about 50 s (Triumph, The City Falls, Solemn) to 3 minutes (Enmity),
shorter than Empire Earth's long pieces, since the music changes with the situation and rests between quiet pieces.

| Empire Earth's | Ours | Mood or moment |
| --- | --- | --- |
| Main Theme | The Hymn to Nikkal (`hymn`) | menu: the first screen and the start page |
| Balance of Power, Rivers | The Brotherhood of Kings (`kings`), The River (`river`) | calm |
| Pawns, Shadows, Emnity | Envoys (`envoys`), Shadows (`shadows`), Enmity (`enmity`) | tension |
| Honor | Chariots (`chariots`) | war |
| Battle | Battle (`battle`) | battle |
| Siege | Siege (`siege`) | siege |
| Arthurian | Triumph (`triumph`) | moment: land or a capital taken |
| Guillotine | The City Falls (`fall`) | moment: the seat's capital lost (after the capital's sting) |
| The Fallen | Lament for the Fallen (`fallen`) | moment: land lost |
| Solemn | Solemn (`solemn`) | moment: a king fallen (after the king's sting) |
| Time | The Last Seasons (`last`) | the last seasons, and after the age's end (after its sting) |

## How the music chooses (src/web/src/audio/situation.ts, player.ts)

- **Only what the seat knows** (pillar 4): its own sight, the moves it saw resolve, the owners as it knows them, the news
  that reached it. God view hears the whole map.
- **The mood**, first that holds: the age ended or the omens of the end read grave, borrowed or darkest (the last
  seasons, below war); a battle the seat's troops fought this season; a siege it lays or suffers; war, if it fought in the
  last three seasons (god view: anyone, the last two); troubled omens, foreign troops in its land in its sight, a
  province of its own in its sight past 60% of the unrest at which land rises, or a rumour in the last two seasons (tension); calm.
- **A change waits for a phrase end**: each file carries its phrase ends (seconds); a change starts 0.4 s before the
  next one and crosses over 3 s; a phrase end more than 20 s away is not waited for, the cross starting at once; the
  page's clock keeps the same deadline, so a stalled stream still changes, and a stream the browser refused is asked again
  every 2 s.
- **Variations**: a piece plays one of its three, never the one it played last, never the file just heard; within a
  mood the next piece is another of the mood's when it has several. Calm, tension, the menu and the last seasons rest 4
  to 12 s between pieces; war, siege and battle do not.
- **Moments**: a sting (2 to 5 s) silences the music, then the moment's piece plays once to its end, then the mood's music
  again. Stings: a great king's capital changing hands (or one the seat lost or took), a king fallen (the seat's own;
  in god view any), the age's end.
- Watching at speed: a season's cues play only when it follows the one heard before, at most one season's every 1.2 s.

## The sounds

**Three layers, the music leading** (Haakon, 1 November 2026: "your ears are being assaulted now. It plays dozens of
sound effects at any one time", then "But all the event stuff is for players only, or if you spectate a player, you hear
specifically what they hear"; the sound lane, `docs/rounds/2026-11-01-sound-lane.md`), in the manner of Crusader Kings II:

1. **The music**, above everything (bus level 0.9).
2. **The world's sounds**: what happens on the map (a battle's clash, a siege, a storm, a march, the waves) and the bed (a
   market, the wind, the water, a siege camp), heard only near the view when zoomed in, softer with distance
   (`hearing()`; the bed by `bedLevel`, silent below zoom 1.5, whole at 3). The same for every viewer, of what that viewer
   knows. Bus level 0.5, the bed 0.45.
3. **The event sounds**, for one seat only: its own clicks and what happens to its realm (its letters, envoys, armies,
   provinces). Its player hears them, or a spectator watching through it; god view never (`cuesAt` gives god view no
   event sounds). Bus level 0.6.

**The mix** (`mix.ts`, `Mixer`): both sound layers under the music (the sounds are also mastered 8 dB under it, below),
each sound rising in over 0.06 s, never sudden; each layer at most three sounding at once, and the same sound not again
within 4 s (event) or 3 s (world), judged by the moment it is to be heard. A change in how sounds are chosen and mixed,
not in the sounds.

Twenty-six short sounds, each in three slight variations, played with a little more variation of pitch (±3%) and level
each time; of the seat's own, at most three a season, the most telling first. What plays them (`cuesAt`, and the screen's
own hooks):

- the player's own acts: a letter sent with an envoy (the stylus, then the envelope), the season's orders submitted (the
  seal), an answer given to an envoy (the envelope), an envoy before the throne (the lyre);
- what a season brings: a war's first blow (Egypt's trumpets in Egypt's seat, a war horn in the others: voice may differ
  by power), a battle, a siege laid, land taken or lost, a revolt, a death, hunger, a catastrophe or the omens changing (the
  sistrum), a harvest, a caravan or sale, gold given, lent, repaid, collected or paid for hire, a courier (the court's
  inbox grew), a spy's report, and the season's turn.

**Placed on the map, heard by zoom** (item 17+++'s "zoom shapes what you see and hear"): a sound with a place (a battle at
the province attacked, a siege at a city the seat is party to or can see; a siege out of its sight is never placed) is silent zoomed out below
1.5, rises in to whole at 3, is whole within half a screen of the view's centre and fades to nothing a screen and a half
away, panned to its side. A court's own sounds (its acts, a courier, a report, the war horn, land taken or lost, the season) have no place and
are always heard. `hearing()` in `situation.ts`; the map's own sounds below are placed the same way.

**The world's bed**, under the music and very low, from the province at the map's centre, heard only zoomed in, rising
from zoom 1.5 to whole at 3 (zoomed out, the music speaks for the whole board; before 1 November it was heard at every
zoom); a siege camp where a siege in the seat's sight is near; a city's market close in (zoom 4 and more) on a town;
water on the great rivers' course, the coasts and the sea close in; wind on the steppe, the desert, the mountains and the
open land and the open sea seen from afar. It crosses over 3 to 4 s, looping seamlessly.

**The map's sounds** (fed by item 17a's stream, `Cues.map`): an army's march (feet on the dust, a chariot's wheels) at
the province it moved on, a fleet in the waves (a swell on the hull, the wind in the rope) where it sailed or lies at sea,
a battle at every province fought over that the seat saw (the one the court's own sounds carry is not heard twice), new
weather in the seat's sight (a flood's rains and far thunder, a drought's dry gust), and a winter crossing it was shown:
the wind on a snowbound pass, an avalanche's thunder where the pass cost the army men, the storm on the open sea. As many
as the season had; only those the view hears are played, the nearest four (`MapHeard`). Moves are read as the viewer saw
them resolve (`seenBy`), fleets at sea in its sight, weather where it sees it.

**Each at its moment** (`Cue.t`, 0 to 1 of the season, `Moments`): the arrivals that opened the season (a courier, a
report, the season's stroke) first, then the march and the waves, the weather, the winter crossings, the clash (the war's
first horn, the battles), the sieges and land taken or lost, then what followed in the stream's own order of events, the
omens last. `schedule()` (`schedule.ts`) spreads them over three quarters of the time since the season before arrived,
between 1 and 3 s, after the sting where there is one, never two starting within a quarter second.

### Fed by the stream: how audio subscribes

Audio reads the stream, never writes it. The worker's `update` messages (`session/protocol.ts`) bring one `SeasonFrame`
a season into `Session.frames` (`client.ts`); the game page passes `Session.frames` and the season shown to
`useGameAudio` (`pages/Play.tsx`), which on a season newly arrived (index one past the last heard, at most one every
1.2 s, never on a jump or a change of eyes) calls `cuesAt(frames, index, viewer)` and plays `schedule(...)`. A season's
sounds come from its frame and the one before: `events` (each `GameEvent` filtered by `visibleTo`), `moves` and
`seenBy`, `units`, `sieges`, `climate`, `news`, `inboxCount`, the owners as known. An event carries no place, so a
placed sound takes its place from the move, unit, siege or climate it belongs to (a winter event by the goal its words name, matched by
the province's whole name). Item 17+++, which plays the season out on the map, reads the same frames; when it gives each event a
moment of its own on screen, `Cue.t` is the one number to take from it instead of `Moments`.

## The shade: a darker or brighter mode within a piece

Haakon, 31 October 2026 (relayed): "Build the Civilization-style fallback alongside the Empire Earth pieces, and make
some of each piece's variations a darker or brighter mode chosen as the situation worsens or improves." `shadeAt` gives
the shade from what the seat knows: -2 in a battle or a siege, or within three seasons of its own capital or king fallen
(mourning); -1 at war, on grave omens, or with hunger in its land; +1 at a feast, read as a season that brought it land
(a triumph) or a harvest it saw with no war and no hunger; 0 otherwise. A piece's variation may carry a shade (`shade` in
the manifest, from `Score.shade` in the pieces): the player prefers the variation in the shade asked for (by its sign:
darker, its own, brighter), and when only the shade changes it stays in the piece and moves to that variation at the next
phrase end, never the same file twice running. Every piece has one or two shaded variations: the calm pieces one brighter
and one darker (Kings: kitmum and embūbum; The River: išartum and pītum), the tension pieces one and two steps darker,
the war pieces, the moments of loss and Solemn their darker ones in the next tuning down (two of three, so the dark
variations alternate), Triumph two brighter (kitmum), the Hymn and The Last Seasons one darker (nīš tuḫrim). A piece
written in nīš tuḫrim can only go one step darker, to qablītum; its variations for the darkest situations are marked -2
all the same, since the sign is what the player reads.

## The fallback: after the original Civilization (src/web/src/audio/synth/, tunings.ts)

Three versions, chosen in the switches, in this order everywhere: "Orchestra" (the default), "Lyre and reed", "8-bit"
(Haakon, 1 November 2026); the same moods, moments, stings, sounds, beds, placement and hearing by zoom serve all three, so
only the pieces change. **If the orchestra cannot load**, Lyre and reed plays instead of silence, since it needs no
download (`Player.style()`): when an orchestra file fails (the element's `error`), when the browser says it is offline as a
piece is chosen, or when a stream asked for is not heard within 12 s while the audio runs. It lasts until the browser is
back online or another version is chosen.

- **One score, written once** (`synth/score.ts`): notes in degrees of a tuning, in layers (melody, counter, chord, bass,
  drum, jingle), each with a cue (moods, shades) that switches it on; phrase ends where a change may come. A compact
  notation (`line("0:2 -3:1 0+2+4:4 D:1 T:0.5")`).
- **Two arrangements** (`synth/arrange.ts`, pure): pure 8-bit (a square lead echoed a dotted eighth behind, a thin square
  counter, held chords spread into sixteenth arpeggios, a triangle bass, noise drums); period timbres (a reed pipe lead
  with a scoop and vibrato, a lyre for counter, chords and bass, struck one string after another and let ring, a frame
  drum and a sistrum, the timing loosened by up to 0.04 beats and the levels by 10%). Three variations per pass (as
  written; the lead an octave up and the counter silent; sparse), never the same twice running.
- **The engine** (`synth/engine.ts`): oscillators, pulse waves from their Fourier series and noise, no samples; a look-ahead
  scheduler that asks at each phrase's end what comes next (piece, tuning, situation), so a change of piece or of mode is
  heard only there; a small room for the period version, none for 8-bit.
- **The tunings** (`tunings.ts`): the seven Babylonian lyre tunings of the Nippur (CBS 10996) and Ur (UET VII 126) texts
  read as the seven diatonic modes after Kilmer and Crocker, brightest to darkest kitmum, išartum, embūbum, pītum, nīd
  qablim, nīš tuḫrim, qablītum; one step darker lowers one degree a semitone. A score plays in its own tuning or in the
  court's home mode moved by the shade.
- **The courts' home modes** (presentation only): Ugarit and Mitanni nīd qablim (the hymn's own), Babylonia išartum,
  Hatti nīš tuḫrim, Assyria pītum, Arzawa and Alashiya embūbum, Egypt kitmum (a reading: how Egypt's harps were tuned is
  unknown), every other court nīd qablim; god view and the menus nīd qablim.
- **The scores** (`synth/score.ts`, composed 31 October 2026), in the original Civilization's manner, a tune for each
  people: **Ugarit's theme is the Hurrian Hymn** whole (h.6, four lines, 61 beats), after Anne Draffkorn Kilmer's
  reading of the notation (Kilmer 1974; Kilmer, Crocker and Brown, *Sounds from Silence*, 1976): the strings of each
  named pair sound together in nīd qablim, the first-named sung above the other; the numerals are taken as lengths and
  the text is Laroche's edition (the listening page names this). Each of the seven great courts (Egypt, Hatti,
  Babylonia, Mitanni, Assyria, Arzawa, Alashiya) has **a theme and a march of its own**, 32 beats each, written in
  degrees so they play in the court's home mode; a court without music of its own (the city-states), god view and the
  menus hear Ugarit's. The **moments are shared**:
  Triumph (a fanfare), The City Falls (a line falling the octave), the Lament (for a king fallen and for land lost) and
  The Last Seasons (the hymn slow, a clock on the beat). Within each score the layers come and go with the mood (a slow
  drum in peace, a heartbeat in unease, the march in war, the gallop in battle, the ram in a siege, the chord only in
  peace and at a feast, the sistrum at a feast), so one score serves calm, tension, war, battle and siege.
  `synthPiece(id, court)` maps a piece id and a court to the score: the moments' ids to the shared scores, the calm and
  tension ids to the court's theme, the war ids to its march. A theme carries only the layers of peace and unease, a
  march only those of war, battle and siege; the hymn, heard in every mood, carries all. **No chord holds a tritone in
  any tuning**: `consonant` in `arrange.ts` steps the upper note of a tritone pair down a degree (the tonic's fifth in
  qablītum becomes a fourth, the fourth degree's octave in kitmum likewise) and moves a chord rooted on qablītum's fifth
  degree, itself a tritone over the tonic, up to the sixth, and `groundDegree` does the same for the bass; the scores
  most exposed (Hatti's, which reach qablītum in every war, Fall and the Lament, heard two steps dark at every court)
  are written in fourths on the first, fourth and seventh degrees besides. A test plays every chord of every score in
  all seven tunings. `ModeTest` (every role in sixteen beats) stays on the listening page as a test for
  hearing each tuning.

## Files and loading

- `src/web/public/audio/`: music (42 files, AAC in .m4a at 64 kb/s, about 26 MB), sounds (63, 48 kb/s), stings (3), beds
  (4); every file mastered by the EBU R128 meter: music and stings -18 and -19 LUFS, sounds -26, beds -30, true peak
  under -1.5 dBFS. AAC plays in every current browser (checked: Chromium decodes and streams them).
- Nothing is installed with the app (the service worker's precache leaves `audio/` out) and nothing loads before it
  plays: the music streams through two audio elements (crossing between them), the sounds and beds are fetched whole on
  first use and kept in the worker's `audio-cache-1`, asked for with their content's hash so a re-rendered file is new.
- Nothing sounds before the reader's first touch (the browsers' rule); the music pauses while the tab is hidden.
- **Switches**: Music and Sound, each with a volume, in the game's menu and on the listening page, kept in this browser
  (`amarna-audio`). On by default at a regular volume (both at 70%), the first music of a visit rising from
  silence over six seconds from the moment it is first heard (a stage of its own, so the switches never undo it; the
  listening page plays at once), so it never blasts at start-up (Haakon, 1 November 2026: "Agreed. Keep them on, regular
  volume, but don't blast someone when they start up, like say CK2, even though the main theme there was epice. SO i
  didn't really mind."). A browser that saved other volumes on an earlier visit keeps them. The pieces are
  mastered to one loudness for it, and the Hymn to Nikkal, the first piece heard, opens 7 dB under its height, so the
  fade lands on a quiet lyre and drone.
- **The listening page**, `/listen` (the top bar's "Music"): every piece and variation with its mood and when it plays;
  the scores side by side in the three versions, with one line saying the Hurrian Hymn is Kilmer's reading, one of several
  modern reconstructions (Haakon, 1 November 2026: keep Kilmer's reading, with that line); every sting, sound and bed; and
  under "Extras" at the end, "The tuning's scale (a test)". The game's own music (the menu theme) fades out over 1.5 s on
  entering the page and stays out while it is open (`Player.hush`), so only what is pressed plays; leaving the page fades
  it back in over 3 s.

## How it is made (scripts/music/)

`render.py` renders `pieces.py` (the fourteen pieces in `pieces_peace.py` and `pieces_war.py`, written with `parts.py`
and `idiom.py` on `hymn.py`'s tunings and the Hurrian Hymn) and `sounds.py` through `score.py` (placing notes in beats,
the piece's rise and fall, the hall, mastering, encoding), on `samples.py`'s instruments (each recording measured for its
true pitch and brought to one level) and `voice.py`'s synthesised choir. Samples: `docs/audio/SOURCES.md`. `check.py`
looks at every score before a render (length, the longest wait between phrase ends, each instrument's range against its
recordings); `inspect_audio.py` draws a spectrogram and loudness curve and counts clicks, for a look without ears.
Render once a piece is settled: every render stays in the repository's history.
