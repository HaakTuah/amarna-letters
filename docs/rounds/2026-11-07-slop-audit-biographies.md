# The slop audit, part 6: the cast's biographies

Branch `slop/biographies`, from `develop`. This lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178), its next kind of text: the lines a king may learn of a person (its public,
hidden and deep facts), written when the game starts by `rules/factory.ts` from the data in `rules/cast.ts`. Parts 1-5
are #558, #585, #605, #730 and #749; the seat view's review (#749) left three stock lines here.

## How it was read

The fresh reader (Opus, high effort) read every starting biography of one game (seed 3, 122 people, 45 KB) with the
audit's brief and nothing else, and listed its worst lines. Most of what it found is fixed here; the rest is below.

## What changed

- **The stock lines are gone or rewritten.** "Known by name at more than one royal court." is dropped: the sources'
  own lines already say what each is known for. "Holds a stake in the love of the people of X: a claim, or a town of his
  own." is now "Many of the people of X would have him as their lord." The commissioner's two lines ("Served as a
  commissioner." and "Pharaoh's commissioner, resident in X: known to all as his man, reporting home.") are one.
- **The drawn lines are in the period's voice,** each template once: "Has a beloved at the court of X", "Has a brother
  among the fighting men of X", "Was put out of an office for …", "Once ran from a battle, and has kept it hidden",
  "Would serve X before any other, and tells no one", "Wants a city of his own to rule".
- **The calling's line is what the person is,** not "Served as …", which put people still in office in the past and
  read as "Served as a son of Abdi-Ashirta". Offices and kin read as titles ("Governor of Nippur.", "Son of
  Abdi-Ashirta."), trades with their article ("A charioteer."). Where the sources' first line already gives the calling,
  it is said once, there.
- **Untrue lines corrected.**
  - A post given at the opening rewrites the calling's line, so a governor no longer says "Served as a merchant".
  - The eight envoys of the letters are royal envoys, not a drawn trade: Mane was Pharaoh's envoy to Mitanni, not "a
    priest of Shamash" at Akhetaten. The draw is still taken, so no later draw moves.
  - A governor whose name is lost is one of his court's own name style where any is free, not a stranger a lover drew
    to that court.
  - "a Ashkelonite trader" and its kin: a debt is now to "a merchant of Ashqaluna", by the game's own names.
  - "A Nubian in Egypt's service, who speaks a Nubian tongue as well as Egyptian." said again what the tongues show.
- **The sources' lines lose their scholars' numbers.** "(EA 62)", "(the Shattiwaza treaty)", "(his tomb at Amarna)"
  stay in the data and never reach a king, who could seal them into a tablet ("Requests are rules too"). Their hedges
  ("most take him for", "kin or not no letter says") read as men at court would say them, and Tahmaya's and Hatip's
  lines are about Tahmaya and Hatip.
- **A guard:** `src/engine/test/biography-text.test.ts` fails on a bracket, a wrong article, a line said twice in one
  biography, or a calling the sources' line repeats.

## Ten lines, before and after

| Before | After |
| --- | --- |
| `Known by name at more than one royal court.` | (dropped) |
| `Holds a stake in the love of the people of Washukanni: a claim, or a town of his own.` | `Many of the people of Washukanni would have him as their lord.` |
| `Served as a commissioner.` / `Pharaoh's commissioner, resident in Amurru: known to all as his man, reporting home.` | `Pharaoh's commissioner in Amurru, known to all as his man, who sends word home to Pharaoh.` |
| `Served as a son of Abdi-Ashirta.` | `Son of Abdi-Ashirta.` |
| `Served as a priest of Shamash.` (Mane, of Akhetaten) | `A royal envoy.` |
| `Owes 270 shekels to a Ashkelonite trader.` | `Owes 270 shekels to a merchant of Ashqaluna.` |
| `Keeps a lover at the court of Alashiya.` | `Has a beloved at the court of Alashiya.` |
| `Secretly sympathizes with Kaska.` | `Would serve Kaska before any other, and tells no one.` |
| `Dreams of ruling a city of their own one day.` | `Wants a city of his own to rule.` |
| `Writes to Pharaoh with the town of Gubla after Rib-Hadda's fall (EA 139-140); most take him for the younger brother …` | `Writes to Pharaoh with the town of Gubla after Rib-Hadda's fall; men say he is the younger brother …` |

## Left for later

- **The same few drawn lines for everyone.** The reader's main point: about eight templates, drawn for herdsmen and
  viziers alike, make the cast read as a list. Drawing them by calling (a coward's flight only for fighting men, a lost
  office only for officials) and varying their wording moves who has which tie, so it is a change to the cast, not to
  its words; filed as an idea.
- **A governor of another people where his court's run out** (Yapa-ilu, of Hazzatu, over Urim on seed 3): the pool has
  too few free people of some courts' styles; filed as a bug.
- **Place names** ("Born in Sutu", "Edom", "Shushan") belong to the open game-wide decision on names the seat view left.

## Readings taken

- A source's bracketed citation is the builders' record, not the person's story: kept in the data, stripped from the
  text (one fact, one place; "Requests are rules too").
- The calling's line says what the person is now: the opening posts are what they hold in 1346 (no description left
  untrue).
- The eight attested envoys of the first draw are royal envoys, as the letters show them and as the attested envoys of
  the larger pool already were (`docs/history/06-attested-people.md`).

## Tests and benchmarks

- `scripts/test.sh`: the governors' test reads Pharaoh's residents by their line's tag, which the one line keeps; the
  starting cast's fingerprint (`starting-term.test.ts`) is taken again, since the lines and the envoys' callings changed.
  CI green on every shard.
- `scripts/sim.sh --games 20 --seed 1 --verify-replay`: 20 games, every replay verified; winners Egypt 6, Hatti 5,
  Babylonia 5, Lukka 2, Niya 1, Amurru 1. A regression check only: no script reads the lines changed here.
- Save version 71 (70 is #760's): the opening's callings, governors and lines move every seed.

Questions for the owner: none. Filed: #765 (bug), #766 (idea).
