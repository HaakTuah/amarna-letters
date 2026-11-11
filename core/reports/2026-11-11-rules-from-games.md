# Rules the games wrote for themselves that hold for every project

The owner asked whether rules that belong in the core were being kept in the games (core archive 143). Four were: one
game wrote each, but each holds for every game, or every project. They move here; each game keeps only what is its own,
in its own PR after its sync.

What changes in every project:

- **An optimization changes nothing a player would notice** (`modules/game-design.md`, "Same seed, same game"): one
  that changes the computer players' decisions proves, on fresh seeds, that their skill and styles and the game's feel
  and look stay within noise. Barkstreet Snakes had it in its `AGENTS.md`.
- **Rare features, and counters** (`modules/game-design.md`, "Using a feature must pay"): a feature too rare to change
  whole games is judged per use, each use played on with and without it; and every feature is measured against players
  who play its counter. From Barkstreet Snakes' "Every new move, measured".
- **No refuges** (`modules/game-design.md`, "No solutions, only trade-offs"): no feature makes a player safe. From
  Barkstreet Snakes' "No refuges".
- **A long task may end its session at a passed gate** (`modules/work-flow.md`, "Sessions"), with a commit and a note in
  the *progress file* saying where to pick up. From Amarna Letters' `AGENTS.md`.

To stay under the cap (`README.md`), wording that said a thing twice goes, and no rule changes:

- `modules/game-design.md`: its opening; "No rule untaught" no longer restates its own purpose; the measurement that
  those using a feature where it fits beat both those that never and those that always do is stated once, in "Using a
  feature must pay", where "No solutions, only trade-offs" pointed to it already; shorter wording in "No feature only
  people use", "Effects from causes", "Everything new belongs", "Numbers are first guesses" and "Players always play the
  newest version".
- `modules/work-flow.md`, point 1: which reviews a PR needs is `modules/reviews.md`'s, and is now only pointed to.

Readings taken:

- "No refuges" in Barkstreet Snakes also said to measure whether a move's users outlive everyone; the use-against-ignore
  measurement already shows who comes out ahead, so the core says only the rule.
- Amarna Letters' builder rules repeat core rules too ("One item at a time", "Branches", "Review points do not stop the
  build", "No rule checks which power it is", "The design notes"); they come from its design document, so they are cut
  there, and the next copy of it carries the cut.

Questions for the owner: none.
