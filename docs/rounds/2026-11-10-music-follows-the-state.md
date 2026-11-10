# The music follows the state (19+++b, the polish lane)

The design document's 19+++b under Build order (archive item 241), read from the live document (Build order, revision
361); the copy in `docs/intent/` predates it. Presentation only: no engine, game, batch or save file changes, so seeds
replay as before and the benchmarks cannot move.

## What changed

- **`src/web/src/audio/mood.ts`** (new): the season's signal (`signalAt`), the `MoodDirector` that keeps the heat and
  the mood across seasons and seconds, and the shade (`shadeAt`, moved here from `situation.ts`). `moodAt`, which read
  each season alone, is gone; `situation.ts` keeps the cues, the bed and the hearing.
- **`crossing.ts`** (new): when the music may change piece, pure and tested; **`player.ts`** asks it: a rise crosses at the next phrase end within 8 s; a fall, or a change within a step, never cuts a
  piece and rests 4 to 12 s before the calmer music; the shade picks the next piece's variation and never cuts one. The
  fallback holds a pass's mood through a fall until the pass ends.
- **`use-game-audio.ts`:** the director is told each season shown and asked every 2 s.
- **`scripts/music-moods.ts`:** the measurement below, rerunnable for the owner's tuning (`--cache` keeps the games).
- **`docs/design/45-the-music-and-the-sounds.md`:** "How the music chooses" and the shade, as built, with every number.

## Measured in script games

Seeds 1 to 3 (103, 115 and 26 seasons), all seven Great Kings script kings; "a seat" is the seven Great Kings' seats
together. "War family" is war, siege and battle. Before is `main`'s per-season mood on the same games. A season lasts
as Slow, Normal and Fast play it (`session/pacing.ts`: its moments and the time on its result), about a minute by hand,
and about 0.3 s at Simulate.

| Who, pace | changes a minute, before | after | war family, before | after | battle, before | after |
| --- | --- | --- | --- | --- | --- | --- |
| god view, by hand (60 s a season) | 0.11 | 0.16 | 98% | 79% | 93% | 21% |
| a seat, by hand | 0.33 | 0.15 | 49% | 57% | 32% | 35% |
| god view, Slow (19 s) | 0.34 | 0.43 | 98% | 82% | 93% | 23% |
| a seat, Slow | 1.03 | 0.34 | 49% | 60% | 32% | 32% |
| god view, Normal (8 s) | 0.80 | 0.68 | 98% | 80% | 93% | 21% |
| a seat, Normal | 2.45 | 0.56 | 49% | 63% | 32% | 34% |
| god view, Fast (1 s) | 6.39 | 1.97 | 98% | 12% | 93% | 0% |
| a seat, Fast | 19.57 | 1.93 | 49% | 67% | 32% | 55% |
| god view, Simulate (0.3 s) | 21.31 | 4.92 | 98% | 0% | 93% | 0% |
| a seat, Simulate | 65.22 | 5.39 | 49% | 66% | 32% | 59% |

- **Changes:** a seat at Slow and Normal is near the first guess of one change in two minutes (0.34 and 0.56 a minute,
  from 1.03 and 2.45); by hand fewer, since a season is a minute. At Fast and Simulate a whole game lasts under two
  minutes, one or two holds, so their rows show the opening of a game more than its course.
- **God view** no longer plays battle nearly all the time (93% to 21–23%), but its war family stays at 79–82% against
  the first guess of under two fifths. The cause is the script games, not the music's rules: a Great King's capital is
  besieged in 23% of their seasons (Babylonia before Ashur and Washukanni, five to ten seasons at a time), which the
  rules make siege music, and three or more Great Kings fight one another in most of the rest. The cooling barely
  matters: halving the time constants moved the share by at most 2 points; counting four kings, not three, as
  "several" brought it to 66–69%. Question for the owner: #877.
- **A seat** at war half the time or more is the script kings' play (Babylonia fights in 60% of its seasons); its music
  now stays there instead of flickering.

## Readings taken

1. **The hold applies to every change, rises too, except the seat's own capital attacked:** the spec's exception
   means nothing otherwise. A rise held off comes at the hold's end if the heat is still there. The alternative, rises
   never held, is a matter of the ear (in the question). Principle: the spec's words, read so each one does something.
2. **A sizeable battle** is two or more units attacking, or four or more on both sides, as far as the seat saw: the
   script kings' armies fight one on one in most clashes, so "three in all" fired in two seasons of five. Principle:
   battle music is earned (the spec).
3. **A siege the seat lays is war, not the siege's music,** which is for its own land besieged (the spec: "much by its
   own army in a real battle or its land besieged"); a Great King's own capital besieged is the siege's music in god
   view, as the spec says.
4. **A skirmish** is any fight of the seat's own that is not a real battle (abroad, small, against a city-state): it
   adds 1.5 a season up to war, so one alone leaves the music calm (its drums are heard), two in a row bring tension and
   a run of them (three seasons at Fast, five by hand) war, never battle ("little by a skirmish with a city-state";
   "smaller fights bring their drums and at most war").
5. **God view's "several Great Kings at war"** is three or more who fought one another in the last three seasons; two
   are tension, as is a Great King's other city besieged; the city-states' wars raise the heat to 1.5, short of tension.
6. **Seconds of play** are the seconds the game screen is open, paused or not: paused on a season, the heat cools only
   by seasons, the slower clock, so a long look at a battle keeps its music.
7. **A jump through the seasons or a change of eyes** starts afresh from the eight seasons before, cooled by seasons,
   at the step their heat enters, with no hold to wait out.
8. **The last seasons** (grave, borrowed or darkest omens) stay below war as before; a change between them and tension
   waits the hold.
9. **The fallback** (Lyre and reed, chip) has no rests between passes, as before; a fall waits for the pass to end.
10. **The shade** reads the season's heat, not the old mood: -2 at a real battle or its own land besieged, -1 with war
    heat or a skirmish in the last three seasons. A siege it lays was -2 and is -1 now.

## Finds not fixed

None.

## Helpers

None for the build; the design check as the reviews ask.
