# The game-design module (9 November 2026)

The design principles both games state in their own words, written once in `modules/game-design.md`, which only
projects that are games take (core archive 80). Both games were read on `develop` (Amarna Letters at `20e00f44`,
Barkstreet Snakes at `1579ad7`) and nothing was written to either: Barkstreet Snakes' `AGENTS.md`, "Rules that stand";
Amarna Letters' `docs/builder-rules.md` and `docs/intent/overview/design-pillars.md`.

## The pairs, and what was judged

Planning design (Fable, high), given the list of pairs only, judged which are one principle and worded them; the
stand-in (Opus, high) predicted the owner's answer to the four choices it left open (below).

| Pair (Barkstreet Snakes / Amarna Letters) | Judged | In the module |
| --- | --- | --- |
| "The rivals never treat a person differently" / pillar 7, "Every seat is replaceable" | partly one | "The computer players never know who is a person" |
| "No ability only people use" / "Every feature is every seat's" | one | "No feature only people use" |
| "Every new move is tested both ways" / "Using a feature must pay", use against ignore | partly one | "Using a feature must pay, measured both ways" |
| "Every new rule needs a visible cue and a lesson" / "Every rule a king needs is in the rulebook or the seat view" | one | "No rule untaught" |
| "Clever rivals, human reactions" / script and model kings "play as competently as possible" | partly one | "Strong computer players" |
| "Conditional goods: no solutions, only trade-offs" / "Don't prohibit; give it its real cost", "Gold buys only what is there" | not one | each stays in its game |
| "Everything new belongs" / the pillars' standing ("a mechanic that breaks one needs a strong reason"), "No stopgaps" | not one | each stays in its game |

Six slots, filled by each game's manifest:

| Slot | Amarna Letters | Barkstreet Snakes |
| --- | --- | --- |
| *computer players* | the script kings and script characters, and the model kings and characters | the rivals |
| *measured players* | the script kings and script characters | the rivals, each by name |
| *what they are shown* | the seat view | `aiView()` |
| *use-against-ignore measurement* | script games on the same seeds, scripts that use the item's feature against scripts that ignore it | `tools/abtest.js` on fresh seeds, against a copy where only some rivals lose the move (the rule itself unchanged) |
| *where the numbers go* | the item's report, and the running table "Use against ignore" in `docs/BUILD-PROGRESS.md` | the PR's table |
| *where rules are taught* | the rulebook or the seat view, in the rule's own commit | a visible cue and a lesson: the one-time lesson and a Field guide row, always both |

Two player slots, not one: Amarna Letters asks model kings to use every feature too, but takes its numbers, and its
"not built until", from the scripts alone ("A model using a feature never stands in for the script players", and
"Models only where they matter").

## What the module replaces in each game, and what stays

Line numbers are those on `develop` at the commits above. "Stays" is each game's own, in substance, and stays in its
files beside a pointer to `core/modules/game-design.md`.

### Barkstreet Snakes, `AGENTS.md`

| Lines | The module replaces | Stays |
| --- | --- | --- |
| 156–158, "The rivals never treat a person differently" | the rule: no `isPlayer` in the rivals' logic or view, nothing a snake on the log could not know, judged by behaviour | the slot fills (`aiView()`); the example "such as a person's input before it lands"; "The UI may single the player out" |
| 159–162, "No ability only people use" | "Every move or rule a person can use, the rivals use too, when it pays" | "in their own style, and they see it used against them; rules tests prove both, through the same engine calls"; "If the rivals can't learn a move well, the move doesn't go in"; the whole of "No refuges" |
| 166–172, "Every new move is tested both ways" | the use-against-ignore test, the two causes, bad play fixed before the merge, the table of use and success | the slot fills; that the PR's verdict comes at every merge, "the move doesn't matter" being "a design finding for the owner", the numbers per rival, the per-use judging of rare moves, and the measure against rivals who play the counter |
| 173–174, "Every new rule needs a visible cue and a lesson" | the whole line, as the slot fill says (a cue and a lesson, both) | nothing beyond the slot fill |
| 163–165, "Clever rivals, human reactions" | "very clever", never playing below good gameplay levels | "No superhuman reaction speed"; better "through planning ahead, never through faster reactions, more samey strategies" |
| 175–186 | nothing | the trademarks, optimizations, conditional goods, everything new belongs, online in step, never rename |

### Amarna Letters

Both files are generated from the design document and never edited by hand: the design session makes these cuts at the
source.

| File and lines | The module replaces | Stays |
| --- | --- | --- |
| `design-pillars.md` 12, pillar 7 "Every seat is replaceable" | that no seat's logic or view says who is a person, and nothing a player in that seat could not know | the pillar itself, stricter: the same interface for humans, models and scripts, no seat knowing who sits in the others (a person's included), "expect any move, including broken oaths" |
| `design-pillars.md` 17, "Every feature is every seat's" | "Any feature a player can use, the AI must be able to use too, and leverage sensibly, with at least occasional success"; "A rule only humans or models exploit is a rule the game is not really testing, and it hands that seat an edge no rule intended"; "no feature counts as built until the script players use it" | the slot fills (script kings and characters, later city-states); model kings and characters using every feature, and the rulebook and requests explaining it; "A model using a feature never stands in for the script players using it, nor the other way round"; the agent-simulation example |
| `builder-rules.md` 7, "Every rule a king needs is in the rulebook or the seat view" | the first sentence, as the slot fill says (in the rule's own commit) | "The design notes (`docs/design/`, indexed by `docs/DESIGN-NOTES.md`) are updated in the same commit too." |
| `builder-rules.md` 12, the script kings' rule | "They are to play as competently as possible, since strong bots reveal weaknesses in the rules" | "the sparring partners and the balance proxy"; "give the balance pass something worth measuring" |
| `builder-rules.md` 13, "Every item tests them" | "On the same seeds, play scripts that use the item's feature against scripts that ignore it: if using it does not win, either the feature does not matter or the scripts play it badly, and the report says which." | looking for weaknesses in the bots' play; "Using a feature must pay" while the game is incomplete, the running table, and "once the game is feature complete no feature may be left whose users do not come out ahead" (when the gate bites) |
| `builder-rules.md` 14, "Every weakness found is patched" | "A new rule is not finished until the script kings and characters can use it well"; the report's use and success per feature, "a feature they never use, or use without ever succeeding, is not done" | patching every weakness in the item at hand, benchmarks before and after; the audit of every feature built so far |
| `builder-rules.md` 11, model games | "Model kings and characters are asked to play as competently as they can" | the rest: no model games until the build order is done, the debrief question, the sorting of mistakes, the safety checks |
| everything else in both files | nothing | the other pillars, "Different data, same rules", "Models only where they matter", "Reason from the pillars" and its list, "Requests are rules too", balance, "No stopgaps" |

## Readings taken

The stand-in's predictions (Opus, high), each built on:

- **"Strong computer players" binds both games** (sure): difficulty comes from a game's setup (Barkstreet's speed ramp,
  Amarna's weaker starting states), never from weakened computer players, so the module says so; each game's limits
  (human reaction speed, the trademarks, the seat view) stay its own. His words: core archive 82, 83 and 90.
- **No game's duty widens** (sure): Amarna's "every weakness found is patched, benchmarks before and after" and
  Barkstreet's "neither always nor never using it wins" each stay in their game, since a rule only one project has
  stays there (`AGENTS.md`, "How changes are made here").
- **The shared rule on who is a person is Barkstreet's** (sure); Amarna's pillar 7 goes further and stays its own,
  since Barkstreet's screen may single the player out.
- **"Conditional goods" and "Don't prohibit; give it its real cost" stay apart** (not sure, and a matter of taste): they
  rule different things, and merging them would put Barkstreet's always-or-never check on Amarna. Put to the owner:
  [#14](https://github.com/HaakTuah/agent-rules/issues/14).

## Helpers

- Planning design (Fable, high), once, given only the list of pairs: the verdicts and the module's wording above, taken
  as it returned them but for the archive pointers added.
- A search helper (Sonnet), once: the owner's words behind each principle in both games' archives. Each quote was then
  checked by script against the games' archives (all match). It found no founding words for the first two principles
  in either archive (they predate the archives); item 87 ("Remember, everyone plays the same game!") is the nearest.
- The stand-in (Opus, high), once, on the four choices below.

## Questions for the owner

- [#14](https://github.com/HaakTuah/agent-rules/issues/14): should "conditional goods" (Barkstreet Snakes) and "don't
  prohibit, give it its real cost" (Amarna Letters) become one shared design rule? Reading taken: kept apart.
