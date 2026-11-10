# What every game shares (10 November 2026)

Which principles, rules and practices either game holds today would hold for every game the owner makes, and are not
yet in the core. Earlier passes asked whether both games had a rule; this one asks whether it would hold for any game
of his, so a principle only one game has written down, or only his words state, counts. Both games were read on
`develop` (Amarna Letters at `550a0d1`, Barkstreet Snakes at `95d35f8`) and nothing was written to either: Amarna
Letters' `docs/intent/overview/`, `docs/builder-rules.md` and its design notes (`docs/design/`, searched); Barkstreet
Snakes' `AGENTS.md` ("Rules that stand"), `DESIGN.md` and `docs/design/` (searched); both archives of the owner's words,
searched by theme. Compared against the core on `main`.

While this ran, PR #34 merged six principles into `modules/game-design.md` with the owner's yes (core archive 102 to
105): "Reality first", "Effects from causes, as deep as pays", "Different data, same rules", "The order of resolution
never decides", "Everything new belongs" and "Code decides facts; models phrase them". They are counted below as
already the core's; this PR is built on them.

## The test

A candidate is added only when all three hold:

1. **It holds for every game of his,** or every game that meets a condition it states, and does not rest on one game's
   setting or look.
2. **It changes what a builder does** in the other game or a new one, beyond what the core already says (the lean
   standard, core archive 95).
3. **The owner's words behind it come with it** into `archive/instructions.md` (`AGENTS.md`, "How changes are made
   here"). A candidate with none waits for his word.

## Every candidate

| Candidate | Where it stands today | His words | Verdict |
| --- | --- | --- | --- |
| **No stopgaps:** nothing for the meantime; a lever and its counterweight together | Amarna Letters, builder rules, "No stopgaps" | Amarna item 13 (core archive 107) | **added.** Any game built in steps meets it; Barkstreet Snakes has nothing like it. The lever built with its counterweight is Amarna's own form of his words: a lever built alone would need a stand-in to hold it in check |
| **Numbers are first guesses until play tunes them** | Amarna Letters, "Balance: first guesses during the build, tuning at the end"; Barkstreet Snakes marks first guesses and measures each change on fresh seeds (`docs/design/39-the-rivals.md`) | Barkstreet's polish brief (core archive 108); core archive 86 | **added,** worded so both fit: a number waits for tuning only while the systems that change its effect are still being built, so Amarna's balance pass and Barkstreet's tuning on arrival (its systems stand) are the same rule; only a number neither reality nor its causes fix is a guess ("Reality first", "Effects from causes") |
| **Same seed, same game:** a game replays exactly; a change that changes no play proves it by the replay; one that does says so | both: Amarna's "Seeds replay exactly within a save version" and its determinism lint (`docs/intent/engine-and-models/tech-stack.md`); Barkstreet's fingerprints and "Optimizations may change decisions only if nothing noticeable is lost" | none found on determinism | **held for his word, then added on it** (#36; core archive 112): replays within one version of a game's rules |
| **A visible cue for every rule;** every death says why | Barkstreet Snakes, "Every new rule needs a visible cue and a lesson"; `docs/design/41-crashes.md` | core archive 84 and 90 | **folded into "No rule untaught":** when a rule acts on a player, the game shows it where and when that player could know it (Amarna's delayed and hidden news stay so); nothing the game itself shows implies what is untrue |
| **Requests are rules too; uncertainty about how uncertain something is, is not part of the game** (and the careful-player test of model mistakes) | Amarna Letters, builder rules | core archive 90 | **general part added** to "No rule untaught" (nothing the game shows implies what is untrue; no player errs because of how the game told it something); **the rest stays in Amarna Letters:** for a model, a request is part of what the game shows it, and keeping outcomes apart from a character's words is "Code decides facts" (core archive 105), so what is left is how one game writes its requests. The careful-player test holds for people too: **added** to "No rule untaught" for every game, on his answer (core archive 112) |
| **Models only where they matter** | Amarna Letters, its pillars' list | none found | **left in Amarna Letters, then added on his answer** to "Code decides facts" (core archive 112) |
| **Who wrote it, fallbacks never silent; models are settings; the debrief question; no model games until the build is done** | Amarna Letters, `docs/design/04-models.md`, `06-file-seats-and-the-agent-simulation.md`, builder rules | none found | **stay in Amarna Letters:** how one game builds, runs and pays for its model layer |
| **Never samier:** a stronger computer player is never a samier one | core archive 83 (already the core's words); Barkstreet's trademarks; Amarna's script kings' temperaments | core archive 83 | **added** to "Strong computer players", checked before and after; Barkstreet's `--signatures` measure stays its own |
| **Levers, not luck:** where chance enters, players have levers to prepare for it or answer it | Amarna Letters, "Players read people, not dice" and pillar 3; Barkstreet Snakes' woodpecker endgame | Amarna item 65 and Barkstreet 31 October (core archive 110 and 111) | **added:** his words in both games reject an outcome no lever answers; it needs no warning, so Amarna's unwarned catastrophes still fit |
| **Online stays in step,** with a protocol version | Barkstreet Snakes, "Rules that stand" | Barkstreet 13 October (core archive 106) | **added, in a game played online:** Amarna Letters plans live multiplayer ("Path to multiplayer" in its tech stack), so it binds it then |
| **The newest version, by itself** | both: Amarna's `src/web/src/ui/update.ts` (item 17a), Barkstreet's `docs/design/36-updating.md` | Amarna item 70 and Barkstreet 30 October, the same words (core archive 109) | **added, in a game players keep installed or cached** |
| Everything new belongs; different data, same rules; the order of resolution never decides; code decides facts | Barkstreet Snakes; Amarna Letters | core archive 105 | **already the core's** (PR #34). Amarna's "special cases bother me" (its item 112) is "Different data, same rules", so it was not added again |
| Period first; numbers from their causes; every error has a motive; nothing appears or vanishes without a cause | Amarna Letters | core archive 102 to 104 | **already the core's** (PR #34) |
| Fairness to reactions: hazards that warn, no shutting in, forgiving first moves | Barkstreet Snakes, `docs/design/38-the-woodpecker.md`, `05-weather.md`, the polish brief's "Fair rules" | the polish brief | **stays in Barkstreet Snakes:** a real-time game's fairness; Amarna's catastrophes strike unwarned by design. The shared part is "Levers, not luck" |
| No refuges | Barkstreet Snakes, "No ability only people use" | none | **stays:** its shared part is "No solutions, only trade-offs" |
| Accessibility: nothing by hue alone; reduced motion keeps what informs | Barkstreet Snakes, `docs/design/02-…`, `34-…`; the polish brief | the polish brief | **left in Barkstreet Snakes, then added on his answer** as "Readable by every player" (core archive 112) |
| One word for each thing | Barkstreet Snakes, `docs/design/09-voice-and-copy.md`; Amarna Letters' "%" everywhere (its item 230) | the design session's take, his question | **left in each game, then added on his answer** to "Readable by every player" (core archive 112) |
| Conservation, everything is somewhere, information moves in physical time, incentives not quotas, no menus, nothing happens unless someone orders it | Amarna Letters, pillars and "The game in one page" | none beyond PR #34's | **stay in Amarna Letters:** its world model; what every game shares of it is "Effects from causes" |
| Reason from the pillars; readings with the principle they rest on | Amarna Letters | Amarna archive, 28 October | **already the core's:** `modules/inbox.md` (readings and what they rest on) |
| Guidelines kept, adapted or skipped with a reason; playtest remarks made into design calls | Barkstreet Snakes, `docs/design/34-…`, `24-…`, `32-…` | none | **already the core's:** "Principles over rules" (`modules/how-to-work.md`) and `modules/inbox.md` |
| Difficulty from the setup, never weaker players; conditional goods; don't prohibit | both | core archive 82, 83, 91 to 93 | **already the core's** |
| A state shown on the snake, not in a bar above it | Barkstreet Snakes, `docs/design/37-one-stamina.md` | Barkstreet 4 November | **stays:** one game's look |

What the core now says: `modules/game-design.md` (its diff in this PR). It grows from 4,515 to 7,214 bytes and is
read only before a task that changes a rule, a feature or how the computer players play, never at every start.

## What each game's step 3 changes

Neither game has taken step 3 at the commits read. If this PR merges first, step 3 makes these cuts; if not, the next
sync PR does. Lines are those at the commits above.

### Amarna Letters

`docs/builder-rules.md` is generated from the design document, so the design session cuts at the source.

| Where | The core now holds | Stays |
| --- | --- | --- |
| `builder-rules.md` 22, "No stopgaps" | inventing no rule for the meantime; a lever and its counterweight built together | its examples (letters until item 11b, gold until item 13, the mutinous unit; the tax rate with hunger; city-states early); the build order as a guide (its item 13); taking the reading that builds the final game best |
| `builder-rules.md` 9, "Balance" | first guesses listed in the report, untuned while the game is built, tuned together at the tuning pass, the unplayable exception; seeds replaying exactly within a version, new rules starting a new one | balance frozen in every item; item 18 as its tuning pass; the benchmarks as a regression check, never to tune; its save versions, as how a version of its rules is counted |
| `builder-rules.md` 11, "No model games" | "a mistake is welcome when it comes from the genuine complexity of the scenario, never from the game telling it badly", and the test that sorts each mistake, as "No rule untaught" now says for every game | the rest of the bullet: no model games until the build order is done, the debrief question, the count of each kind in each report, the safety checks |
| `design-pillars.md` 19, "Models only where they matter" | a model called only where its judgement can change what happens ("Code decides facts") | which rungs may take each decision, and how the worth of a call is judged |

What PR #34 took from its pillars (such as "The order of resolution never decides") is not mapped here.

New for it: a change to the script kings' play checks that their temperaments stay distinct, before and after; every
chance a king meets leaves the king a lever; everything new works online once its live multiplayer comes; the newest
version as `update.ts` already plays it.

### Barkstreet Snakes, `AGENTS.md`

| Lines | The core now holds | Stays |
| --- | --- | --- |
| 183–184, "Everything new belongs" | the whole line (PR #34) | nothing |
| 185, "Online stays in step" | the whole line | nothing |
| 163–165, "Clever rivals, human reactions" | "more samey strategies" | "No superhuman reaction speed"; better "through planning ahead, never through faster reactions" |
| 175–176, "Every rival keeps its trademark" | a check of each one's style before and after | `--signatures` and `TRADEMARKS` as how it checks |
| 177–180, "Optimizations may change decisions…" | a change meant to change no play proves it by replaying the same seeds ("Same seed, same game") | its measures of skill, character and feel, the look-alike rule, `tools/abtest.js` |
| `docs/design/36-updating.md` | the rule | how it updates, between rounds |
| `docs/design/02-…`, `34-…`, `09-voice-and-copy.md` | nothing by colour alone, reduced motion keeping what informs, one name for each thing ("Readable by every player") | its palette, outlines and shapes, what holds still, and its word list |

New for it: no stopgaps; each new number listed as a first guess in its PR until measured (it already marks most);
every chance a snake meets leaves it a lever, as the woodpecker's endgame now does.

## Readings taken

The stand-in (Opus, high), in two calls.

The first, on fifteen readings, before PR #34 merged. Highly sure, built on: no stopgaps; the newest version; the model
layer's own rules stay in Amarna Letters. Fairly sure, built on and put to the owner: numbers as first guesses; the cue
folded into "No rule untaught", with nothing shown implying what is untrue; online; never samier; accessibility, one
word for each thing and "Different data, same rules" left in their games (the last since taken by PR #34). Not sure:
"Levers, not luck" (built on, and put to him); "Same seed, same game" (held for his word, having none behind it).

The second, once PR #34 had merged, on what it changed. Core archive 105 shows he takes a principle that only a game
with language-model players meets, so the condition alone no longer kept "Requests are rules too" out; the stand-in
still left it, and "Models only where they matter", in Amarna Letters (fairly sure; above), and put the careful-player
test to him (not sure, taste). Fairly sure, built on: "Levers, not luck" stands on its own beside "Effects from
causes", since one asks for a cause a player can reason about and the other for a lever it can pull (core archive
110); a first guess is only a number that neither reality nor its causes fix, so it never overrides "Reality first";
"No rule untaught" no longer says again what "Effects from causes" says of mistakes. Highly sure: "Same seed, same
game" goes to him, and, if he takes it, may belong outside the game-design module, being as much how a game is built as
how it is designed.

## The owner's answers

To #36 he answered "Yes, expertly to all!" (core archive 112), to the nine readings with the design session's
additions, which it added to this PR: "Same seed, same game"; the careful-player test, for every game, in "No rule
untaught"; "Models only where they matter", in "Code decides facts"; and "Readable by every player" (colour, motion and
one name for each thing). The other five stand as built.

## Helpers

- Two search helpers (Sonnet, medium), one per game, swept the design notes and archives by theme. Every quote carried
  into `archive/instructions.md` was checked by script against the games' archives: all match.
- The stand-in (Opus, high), twice.

## Questions for the owner

- [#36](https://github.com/HaakTuah/agent-rules/issues/36), answered (above): nine readings to confirm or correct: "Same seed, same game"
  (waits for his word), numbers as first guesses, a rule showing itself when it acts, stronger never samier, levers not
  luck, online, and what stays in its game (requests and the model-mistake test, models only where they matter,
  accessibility and one word for each thing).
