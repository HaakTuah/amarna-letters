# The royal council, and omens of the end (item 16)

Build order item 16, from "The royal council" (Interface and the council) and "Omens of the end" (Victory), built from
the courts dossier (`docs/history/14-courts-and-free-cities.md`: "Period titles for the council (item 16), checked",
"Advice on record", "Omens of the end") and the letters dossier (`docs/history/09-the-letters.md`, "Hard times", EA 35).
The council is `src/game/src/bots/council.ts`, run by the runner (`src/game/src/runner.ts`, `orders`); the omens are
`src/engine/src/rules/omens.ts`. Every number is a first guess for item 18.

## The council

- **Who hears it:** every seat played by a model, a file or a human (a seat that `canSleep`), a Great King or a
  city-state's ruler alike. Script seats never have one: they run the same calculations to decide. On by default;
  a seat turns it off or on with its submission (`TurnSubmission.council`, "on" or "off", from the next season), which
  the engine keeps in `GameState.councilOff` and logs as a `council` event seen by that seat, so experiments can report
  whether it was on. The web page's toggle is at the top of the orders panel. Comparing model kings with and without it
  waits until Haakon asks for model games, so no table setting turns it off for model seats.
- **Four advisors, the script king's planner with known tilts.** Each advisor is a script king's mind (`Brain`) for that
  seat, with the court's own temperament tilted, its own seed and its own memory of what the seat has seen (it reads the
  seat's view every season, asleep or awake). Each season it plays the script king's military season on the seat's
  view: strategy, `Tactics.make`, `Search.improve` against the eight pictured seasons, sieges, sallies, and the treasury's
  levies and disbanding (`Statecraft.economy`), and keeps only troop orders and levies.

  | Advisor | Tilt (first guesses) | Its own reading |
  | --- | --- | --- |
  | General | aggression +0.4, caution -0.35, vengeance +0.2 | the best strike and in how many pictured seasons it lands |
  | Steward | aggression -0.35, caution +0.4, greed +0.3 | troops that could strike the capital, the treasury and upkeep |
  | Tjaty | cunning and commerce +0.4, aggression +0.1, vengeance -0.3; makes war on the rival whose land beside our troops lies unguarded | the open provinces beside our troops |
  | Diviner | vengeance -0.3; makes war on the runaway leader (`Board.leader`, the shared score function) when he is in reach | in signs: whose star rises, from the same estimates |

- **Numbers behind each proposal** (`Search.pictured`): each move "gets there in n of 8 pictured seasons", the same
  eight seasons a script king plays its plan against; a hold or guard names how many foreign troops could strike there;
  the readings say in how many pictured seasons the capital falls.
- **Compact:** what all four propose alike is listed once ("All four advise"; idle holds left out), then each advisor
  with its title, tilt, reading and only its proposals that differ (`CouncilView` in the seat view).
- **They see only what the king sees,** and the request and the page say so. Advisors are not characters: no loyalties,
  no price, nothing a rival can buy, and nothing they do changes the game; a strict replay skips them.
- **Titles,** only where the dossier grades them A or B, else the plain archetype ("the General"): Egypt the overseer of
  the army, the overseer of the treasury, the vizier (tjaty) and the chief lector priest; Hatti the chief of the
  bodyguard (GAL MEŠEDI) and the augur; Babylonia the governor of Nippur (šandabakku), the sukkallu and the bārû;
  Alashiya the eagle diviner. Presentation only (`titleOf`).
- **Model kings** read it as YOUR ROYAL COUNCIL in their season's report (`councilBrief`, `src/llm/src/prompts.ts`);
  **humans** in the orders panel, with buttons that take the agreed orders, or an advisor's, into the draft.

## Omens of the end

- **Every seat and character, council or not.** The seat view's `omens`, OMENS in a model king's report, the top of
  the orders panel; characters read them in their request's "The age" (`endingWords`), in the voice of the court that
  holds the province where they are.
- **Tiers by the public chance only** (`omenTier`): quiet, then troubled from 40% of the chance at the table's median
  season, grave from 75%; **borrowed time** from a season drawn in secret at 85% to 115% of the median (from the seed and
  "omens" alone, so it says nothing of the drawn last season); **the darkest** from the bottom of the cap's range
  (season 80 by default; with no cap, where the chance reaches its level at 80 of a 44-season median), then held. An
  open age is silent. No number or season is ever shown.
- **Voices:** Babylonia, Assyria and Mitanni the liver (the darkest, the mark of Ibbi-Sin); Hatti and Arzawa yes-or-no
  oracles (the darkest, every question unfavourable); Egypt the lector priests and, darkest, the Restoration Stela's gods
  "turning away from this land"; Alashiya the eagle diviner and the hand of Nergal (EA 35); every other court a plain
  voice, the sources naming none. Lines are chosen by the seed, the season and the court, so replays read the same.
- **The rulebook** says the omens darken as the end grows likelier and never foretell the season (`ending` in
  `src/llm/src/rules.ts`).

## Measuring it

`scripts/sim.sh --council-play-half`: half the script kings play their troops and levies by their council
(`follow`: the agreed orders, else each troop's majority, a tie to the king's own order; a levy at least two advisors
propose) against kings that play their own plan. The numbers are in the item's report and the progress file's table.
