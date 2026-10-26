## Not built yet

Every decided direction that is not built, one line each, with where it is decided. A quoted title is an entry
of the design document, in whichever tab its system is (`grep -rn "Title" docs/intent` finds it); "question N" is in
`docs/rounds/2026-10-18-sleep-and-simulation.md`; "item N" is in its Build order; "the round report" is the
simulation-fixes round's report, `docs/archive/rounds/2026-10-19-simulation-fixes.md`.

- **News that travels**: distant provinces, and who holds them, shown at their last known state with its date, the
  news carried by people ("Hidden by default"; question 6; item 7).
- **Envoy authority and passage grants**: mandates with engine-checkable limits, the authority to seal within them,
  credentials shown or hidden, passage, basing and trade rights on sealed tablets ("Envoy authority and
  resident envoys"; questions 2, 3 and 14; item 9).
- **Errands and generalist characters**: one pool serving as envoys, spies, generals and governors on errands rather
  than in fixed roles, with a competence per role, boldness and discretion ("Errands, not roles";
  "Character attributes for many roles"; item 10).
- **Skills hard-coded and decisions left to the character, with engine rolls as a switch**, and kings never seeing
  skills, only claims and checks ("Skills are hard-coded; decisions belong to the character" and "Kings
  never see skills"; item 4 decides whether the rolls are needed; item 10).
- **Who characters are**: declaring a name and false envoys; a past before the game, then a past made in play; what
  servants know, the record of who saw what, and questioning a captive (item 10).
- **A living pool**: people entering and leaving the pool, enough people but not enough good ones, hiring as a
  negotiation, ongoing costs, and where characters keep their gold, purse and hoard ("A living pool" and the
  sections after it; item 11); and lending to kings on debt tablets ("Lending to kings"; item 11). The hoard and the
  debts are the two parts of the richest characters' wealth that count nothing yet (see "Characters' gold, and the
  richest characters").
- **Full and structured press**: two press modes, free text as today and a structured mode with templates for every
  king and for script envoys ("Two press modes"; item 8).
- **Other courts' own calendars and regnal years**: season names for the courts that have only ordinals today
  ("Season names"), and regnal or limmu years (question 26, plan steps 5-7). The one date label with the
  year BCE and the ending line are built (see "The web map and the interface").
- **The map's later layers**: roads and relay stations, and generals leading armies, drawn once the
  game has them (walls are drawn since the siege package, a ring for each level standing, as the viewer knows them, broken
  where the viewer knows of a siege; the province card gives the level and the siege) (the map leaves room for them; `docs/prompts/VISUAL-OVERHAUL.md`); and the fog of war for ownership
  once news travels (item 7; what it needs is in `docs/archive/rounds/2026-10-19-visual-overhaul.md`).
- **Gold sent without an inventory**, saving the scribe fee and checkable by nobody ("Why the envoy lies, and
  how he is caught"): today every gift has an inventory, and it costs nothing.
- **Tablets stolen, not only copied**: a spy taking a tablet out of an archive, and a conqueror seizing an archive so
  that its court loses it ("Tablets are objects in a place"; "Tablets have a place"). Item 3 built
  copying only (see "Tablets lie in archives").
- **Tablets that need a reader**: an unreadable tablet showing its seal but not its words until the king finds a
  reader, and a tablet sent to a third court to be read ("Tablets are objects in a place" and "Languages";
  item 12); and an archive that moves with the court ("Command at a distance"; item 13).
- **Model characters in the simulation kit**: envoys and spies as isolated agents, for the second agent simulation
  (item 4).
- **Memory and call size**: older letters summarized to a line, a "since you last acted" view, terser state tables,
  requests ordered so the stable part is cached, the schema's repeated shapes shared, and the setup screen's cost
  estimate brought up to date ("Call size matters as much as call count"; the round report, Part E; item 6).
- **A cheaper summariser**, measured on the same games before it is used ("A cheaper model for condensing,
  to be measured"; the round report, Part E).
- **Languages** ("Languages"; item 12).
- **Command at a distance**: the capital where the king is, commanders whose competence sets their tactical search,
  army mandates, no commander, no mandate ("Command at a distance" and "Ruling by mandate"; question 7;
  item 13).
- **Legends**: biographies of characters, histories of tablets and the rise and fall of courts, grown from the
  "follow this character" view ("The narrator illuminates; it never steers"; item 14).
- **Conditional orders beyond the two standing-order events** ("unless" conditions; the treasury, an envoy's return or
  a sealed tablet as conditions), with item 6 ("Pacing: sleeping
  seats and standing orders").
- **The message-kind fallback for reopening orders**, if kings reopen too often after audiences: reopening offered
  only for a coalition or alliance tablet, evidence of a broken tablet, a ransom demand, or a threat or news of war,
  sorted by a small model that errs toward offering, for model seats only ("If kings reopen almost every
  time, the kind of message decides"; `docs/archive/rounds/ROUND-PROMPT-ADDITIONS.md`, sections 4 and 6.2; Build order "Not yet in
  the order", after item 4; the round report, Part H).
- **Reputation from losses abroad**: characters who hear that a court loses its people abroad, or puts others' to
  death, growing wary of serving or visiting it; the news already travels (see "Losses abroad travel with people")
  ("Wages are paid on return"; `docs/archive/rounds/ROUND-PROMPT-ADDITIONS.md`, section 6; what script characters would need
  is in the round report, Part G).
- **Who receives envoys, later candidates**: a minister who receives routine envoys by the king's standing
  instructions, an attention limit the same for every seat, and tablets counting as pressing only where the
  instructions do not cover them; they need a decision first ("Under consideration: standing instructions for
  audiences" and "What the replay showed"; Build order "Not yet in the order"; the round report, "Later candidates").
- **Push notifications** when an envoy arrives ("Platforms"); the web app installs and starts from cache.
- **Echoes kept out of the primer**: Finkel's "Send gold" parody as a rare script king's letter or chronicle line, and
  "a new Idrimi" in the chronicles once outlaws exist ("Echoes from the archive" and "A new Idrimi").
- **Still to be decided before they are built**: distance-based travel and interception (which outlaws and bandit
  chiefs depend on), the royal council, trade, and multiplayer, stages 2 and 3 (Build order "Not yet in the order";
  "Path to multiplayer").
