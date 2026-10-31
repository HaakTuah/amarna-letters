# The music and the sounds (item 19+++)

Presentation only: no rule, number, script play or save version changes, and the script games are identical. The game
had no sound before this item.

Haakon, 31 October 2026 (relayed by the orchestrator): "Keep the music lane (19+++) running. When the improvement audit
is done, restart the music lane on Fable 5.1 at high effort for the composing; the current Opus session builds the sound
system (playback, the layers that switch with the situation, the samples) until then and hands over what it built." So
the fourteen pieces now shipped are **placeholders** that exercise the system (marked so on the listening page and in
`src/web/src/audio/catalogue.ts`); the composer replaces them. The handover is in `docs/rounds/2026-10-31-music.md`.

## The template: Empire Earth's music

Empire Earth (2001; music by Steve Maitland and Ed Lima; Wikipedia's infobox) shipped eighteen music files, which are
fourteen pieces, four of them in two versions (the track list as fan uploads of the game's files give it, with lengths):
Main Theme 3:41, Balance of Power 6:18, Battle 2:09, Arthurian 1:32, Emnity 11:04, Guillotine 1:49, Honor 1:53 (and an
alternative, 2:44), Pawns 4:09 (and 5:57), Rivers 5:28, Shadows 6:04 (and 6:19), Siege 1:22, Solemn 0:53, The Fallen
6:47 (and 3:27), Time 3:31. No source found says exactly when the game played each; the roles below are read from the
titles, lengths and the item's own list of situations (calm, rising tension, war, siege, battle, triumph, loss, the
age's last seasons), and are listed as a reading. Ours: one piece for each, the same roles, three variations each, in
`src/web/src/audio/catalogue.ts` (which the listening page shows beside every piece).

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

In the manner of Crusader Kings II, its approach only: twenty-one short sounds, each in three slight variations, played
with a little more variation of pitch (±3%) and level each time; at most three a season, the most telling first, and the
same sound not twice within a quarter second. What plays them (`cuesAt`, and the screen's own hooks):

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
are always heard. `hearing()` in `situation.ts`.

**The world's bed**, under the music and very low, from the province at the map's centre, at every zoom (zoomed out, the bed and the great moments are what is
heard); a siege camp where a siege in the seat's sight is near; a city's market close in (zoom 4 and more) on a town;
water on the great rivers' course, the coasts and the sea close in; wind on the steppe, the desert, the mountains and the
open land and the open sea seen from afar. It crosses over 3 to 4 s, looping seamlessly.

**Not yet**: the event stream that items 17a and 17+++ build (a season played out on the map, each event at its moment)
is not on `develop` yet; until it is, a season's sounds play together as it arrives, read from the frame's own events,
moves, sieges and owners. When it lands, `cuesAt` is fed by the stream instead, each sound at its event's moment and place.

## Files and loading

- `src/web/public/audio/`: music (42 files, AAC in .m4a at 64 kb/s, about 26 MB), sounds (63, 48 kb/s), stings (3), beds
  (4); every file mastered by the EBU R128 meter: music and stings -18 and -19 LUFS, sounds -26, beds -30, true peak
  under -1.5 dBFS. AAC plays in every current browser (checked: Chromium decodes and streams them).
- Nothing is installed with the app (the service worker's precache leaves `audio/` out) and nothing loads before it
  plays: the music streams through two audio elements (crossing between them), the sounds and beds are fetched whole on
  first use and kept in the worker's `audio-cache-1`, asked for with their content's hash so a re-rendered file is new.
- Nothing sounds before the reader's first touch (the browsers' rule); the music pauses while the tab is hidden.
- **Switches**: Music and Sound, each with a volume, in the game's menu and on the listening page, kept in this browser
  (`amarna-audio`). Quiet by default: both on, music at 35%, sound at 45%.
- **The listening page**, `/listen` (the top bar's "Music"): every piece and variation with the template and when it
  plays, every sting, sound and bed.

## How it is made (scripts/music/)

`render.py` renders `pieces.py` (scores written with `parts.py` on `hymn.py`'s tunings and the Hurrian Hymn) and
`sounds.py` through `score.py` (placing notes in beats, the hall, mastering, encoding), on `samples.py`'s instruments
(each recording measured for its true pitch and brought to one level) and `voice.py`'s synthesised choir. Samples:
`docs/audio/SOURCES.md`. `inspect_audio.py` draws a spectrogram and loudness curve and counts clicks, for a look without
ears.
