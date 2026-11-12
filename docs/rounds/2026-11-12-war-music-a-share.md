# War music a share, never the whole (19+++c, the polish lane)

Sonnet built this. The design document's 19+++c under Build order (archive items 247 to 249), read from its copy in
`docs/intent/` (Build order, revision 377), which holds it. Presentation only: no engine, game, batch, request or save file
changes, so seeds replay as before, the benchmarks cannot move and the save version stays.

## What changed

- **`draw.ts`** (new): the draw. Each next piece is drawn by chance from the pieces of every mood, weighted toward the
  mood's own: in war, siege and battle one piece in two is a war piece, a quarter tension, a quarter calm; in tension a
  third war, two in five tension, the rest calm; in calm four in five calm, one in five tension, no war; in the last seasons seven in ten
  the last seasons' own. The piece just heard is not drawn again where its family has another (the chariots alone may follow themselves, in another variation, which keeps war's one piece in two). Battle and siege are earned: drawn only in their own mood,
  never two running. Rests of silence, 4 to 30 s, fall after every piece.
- **`crossing.ts`**: a piece stands for the higher of its own mood and the one it was drawn for; only a mood above that is
  a rise. A player's rise crosses at a phrase end within 8 s as before. A spectator's rise crosses so only for something clear
  in front of him; the world's own heat changes the music only at a piece's end; a change of what he watches never cuts a
  piece, which plays on to its end or at most 45 s to the last phrase end within them.
- **`mood.ts`**: a rise is no longer held back (the hold holds back falls only); a siege heats a step less after 3 seasons;
  the world also hears a Great King's capital newly taken and a Great King fallen; `Signal.clear` (a real battle of the
  one listened to, his capital newly attacked) is what a spectator's music rises at once for.
- **`listening.ts`** (new): whose ears. A player hears his seat. A spectator hears the character he follows (his battles,
  his danger, his captivity, in his realm's music), else the realm he watches, else, drifting in god view, the world's
  heat in the music of the realm doing the most, kept until another clearly does more. Never the middle of the view.
- **`player.ts`, `use-game-audio.ts`, `Play.tsx`**: the player draws, rests, crosses by these rules; the fallback's
  versions (Lyre and reed, chip) draw their pieces and rest between passes too. `map/scene.ts` gained `stepAt` (one season's
  place of a character, which `pathOf` now loops over), behaviour unchanged.
- **The Music page and the catalogue's "when"** say how the game now chooses; **`docs/design/45-the-music-and-the-sounds.md`**
  has every rule and number; **`scripts/music-moods.ts`** plays the draw and the rests through the script games.

## Measured in script games

Seeds 1 to 3 (103, 115 and 26 seasons), all seven Great Kings script kings, paces as in the 19+++b report. The draw and the
rests are played through each mood timeline with the manifest's piece lengths. "War pieces" is the share of the music's time
in the war family's pieces (chariots, siege, battle). First guesses: under a third of god view, and under half of a seat's
play while it is at war. Fast and Simulate (a whole game under two minutes, one piece) are in the script's output and show the opening only.

| Who, pace | mood changes a minute | time in the war moods | heard as | war pieces | war pieces while the mood is war | silence | pieces a minute |
| --- | --- | --- | --- | --- | --- | --- | --- |
| god view, by hand | 0.22 | 72% | a spectator drifting | 23% | 32% | 13% | 0.46 |
| a seat, by hand | 0.12 | 45% | a player | 24% | 41% | 12% | 0.47 |
| a seat, by hand | 0.12 | 45% | a spectator of the realm | 23% | 38% | 13% | 0.46 |
| god view, Slow | 0.53 | 75% | a spectator drifting | 29% | 35% | 13% | 0.49 |
| a seat, Slow | 0.32 | 49% | a player | 27% | 46% | 12% | 0.54 |
| a seat, Slow | 0.32 | 49% | a spectator of the realm | 24% | 40% | 12% | 0.51 |
| god view, Normal | 0.83 | 82% | a spectator drifting | 30% | 36% | 13% | 0.52 |
| a seat, Normal | 0.54 | 55% | a player | 32% | 53% | 11% | 0.63 |
| a seat, Normal | 0.54 | 55% | a spectator of the realm | 29% | 48% | 12% | 0.58 |

- **God view** hears war pieces 23 to 30% of the time, under the first guess of a third, though the script games keep
  the mood in the war family 72 to 82% of the time (Babylonia's capital sieged for seasons, three or more kings fighting).
  The mood is no longer the music: this is what 19+++c answers of 19+++b's question for the owner (#877).
- **A seat while its mood is war** hears war pieces 41 to 46% by hand and Slow, 53% at Normal, where rises cross to the
  war pieces more often than the draw alone would. Just over the guess at Normal; the draw's one in two is the spec's.
- **Mood changes a minute** moved little from 19+++b (god view 0.16, 0.43, 0.68 before; a seat 0.15, 0.34, 0.56): the
  siege's ageing and the world's newly taken capitals nudged them.
- **Rests**: 11 to 13% of the time is silence, a piece every two minutes or so by hand.
- The games' play, the seeds' replays and the benchmarks are as before: no engine, game or batch file is touched, so
  `scripts/sim.sh` was not rerun.

## Readings taken

Unsure first:

1. **"In tension one in three"** read as one war piece in three, parallel to war's one in two ("the rest tension or calm").
   So tension draws a third war, two in five tension and the rest calm; calm draws no war piece and a fifth tension; the last seasons seven
   in ten their own. Principle: the spec's "weighted toward the mood's own" and "mostly the game's calm and its age".
2. **A character's captivity** is unease (the tension's music), not war: a servant held for years would otherwise play war
   music for years. His fights and the siege of his place are battle, foreign troops in his place unease.
3. **A change of eyes is not an event.** After it even a battle in the new view waits the ease (at most 45 s to a phrase end),
   since "a change of what he watches never cuts a piece"; clear things are those that happen while he watches.
4. **A player is the viewer who holds a human seat of the table**; anyone else, including a fallen player in god view, is a
   spectator. A player who follows a character keeps his seat's music; a spectator who follows one hears the character, not
   the seat he looks through.
5. **The realm doing the most** (the fallback's court only; the orchestra's pieces are one voice for every court): blows
   struck and taken and sieges laid and borne over six seasons, fading by 0.6 a season, kept until another has one and a half
   times as much and two more. The fallback changes its court with a new pass.
6. **Rests** are 4 to 30 s by chance after every piece, none before a moment's piece nor after a piece a rise has outgrown
   (heard at once). The fallback rests between passes now; it had none.
7. **A siege that drags on** heats a step less after 3 seasons, for a seat's own land and a siege it lays as for the world;
   "newly" attacked or besieged means those first 3 seasons.
8. **Sure:** a rise is no longer held back (19+++c: the hold holds back falls only), replacing 19+++b's reading 1; no Great King
   can be captured as the game stands, so none is counted; the stings and moments stay as they were ("the world's wars still
   sound in their stings").

## Finds not fixed

- A spectator's music in the fallback versions changes its court only with a new pass (its mood turns over within 45 s).
- A character the viewer knows no place for (on the road) tells the music nothing; his arrival does, with the next season.

## Helpers

An Opus design check (high effort) read the readings and the code. Its findings, built: a change of eyes that asked nothing of
the piece no longer stays on to cut a later piece (it is forgotten once answered, or after 60 s); a siege that drags on past
3 seasons heats the world little, a capital's too; the fallback ends its pass within 45 s of a change of eyes; tension's rest
is weighted toward tension (two in five) over calm. Left: god view still raises war heat for three Great Kings at war (19+++b's,
not named in 19+++c's list of what raises the world's heat, kept as the 19+++b report took it); the chariots may follow
themselves, in another variation, so war keeps its one piece in two.
