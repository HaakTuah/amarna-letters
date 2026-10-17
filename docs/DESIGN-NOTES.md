# Design notes

Decisions and simplifications made while building the prototype from the design document.
Every number here lives in `GameConfig` or `MapData` and is meant to be tuned.

## Rules as implemented

- **No retreat phase.** A dislodged unit is destroyed. This keeps one order round per season.
- **Ownership changes every season**, whenever a unit ends a season in a province, not only in
  autumn as in Diplomacy.
- **Free city-states have walls** that hold with strength 1 and never move, so taking one needs a
  supported attack. They can also be bought for 10 × yield by a power whose land or troops touch
  them, or that holds a coast on the same sea zone (islands trade by ship). Rival bids in the same
  season bounce.
- **A bought city keeps its walls**, which then hold for its owner: the owner cannot station troops
  inside but may support the walls holding; a rival still needs a supported attack, and conquest
  tears the walls down. Buying is the durable way to grow, conquest the fast one.
- **Levies** are raised only in an unoccupied province of the power's own homeland that it holds.
  Army 100, fleet 120; upkeep 30 and 35 a season.
- **Strength** = 10 × (sum of base yields of provinces held) + true gold. Growth is strength over
  starting strength. Units are not counted; they cost upkeep and are the means to land.
- **Ending.** Not before turn 15; then 15% at the end of each season; hard cap at 60 turns.
- **Dice.** Every roll comes from a stream keyed by seed, turn, purpose and subject. (An early
  version keyed it by seed XOR turn, so neighbouring seeds shared rolls at shifted turns; fixed,
  with a regression test.)
- **Shared victory** (on by default, switchable): two powers holding a sealed tablet marked as a
  sworn alliance win together if their combined growth beats every other power's growth.
- **Convoys** follow Diplomacy, with Kruijswijk's guess-and-check adjudication; circular movement
  succeeds, and convoy paradoxes are resolved by the Szykman rule (the convoyed army stays put).
- **News of a season is read the next season.** Battles, purchases, rejected orders and notices
  produced while a season resolves are delivered with the next season's reports.

## Communication

- **Greeting sealed, body spoken.** The engine renders the greeting from sender and recipient and
  the leader's deviations (omit it, own name first, withhold "brother", claim or deny "Great King",
  or free text). It arrives verbatim. The letter body is spoken by the envoy, who may distort it.
- **Tablets are verbatim** but cost a scribe fee (20), so the envoy channel stays the cheap default
  and a written agreement is a deliberate choice. Tablets are evidence only; nothing enforces them.
- **Gold travels with envoys.** The tablet's inventory states the amount; the host's weighers find
  what is left after any skimming. Purity is hidden until an assay.
- **Debasement is a ledger, not a coin type.** A power's displayed treasury counts unassayed lots
  at their weight. True gold is what is actually spent; a payment the true treasury cannot cover
  fails and exposes all debased lots at once.
- **Envoys go out and come back.** An audience has at most two exchanges. Detention is the host's
  choice; detained envoys grow attached to the host court over time. The sender hears that the
  envoy is overdue a season after it should have returned.
- **Plants.** Two of the fourteen starting envoys are secretly in the pay of another power. When a
  plant stands before its real master, the master is shown the envoy's true instructions.
- **Bribes, poaching and defection** are explicit decisions by the envoy that the engine applies:
  a gift is paid only if the host can afford it; defection moves the character to the host's
  service and adds a public fact ("Abandoned the service of…") that follows them.

## Characters

- A pool of 18: eight names attested in the Amarna letters (Mane, Keliya, Pirissi, Tulubri,
  Haamashshi, Artessupa, Mazipalali, Yanhamu; seven are drawn per game) and the rest in regional
  name styles. Each power starts with two envoys; the rest are free agents.
- Traits 0–100 (loyalty, greed, competence, ambition, courage, an optional sympathy) and discrete
  facts at three secrecy levels. Persona text is written once (template, or Sonnet narrator) and
  frozen.
- **Memory** is an episodic list. When it grows past 12 entries, the engine asks the character to
  fold its oldest entries (all but the newest six) into its summary, in its own voice: Haiku when
  characters are model-played, a deterministic condensation for script characters. The summary
  is recorded like any decision, so replays stay exact. Prompts carry the summary and the most
  recent ten entries; memory travels with the character to a new employer.
- **Background checks**: public facts always; hidden facts with chance spend/150 (max 90%); deep
  facts with chance spend/400 (max 60%). Never the whole truth.
- **Spies**: detection chance 5% + watch spend/300 − competence/400, clamped to 2–60% a season.
  Caught spies confess their master if timid (or 40% of the time). Turned spies report what their
  new master wants, plus one true observation.
- **Authentication**: genuine tablets read genuine 95% of the time (else inconclusive). Forgeries
  are detected with chance 20% + spend/200 − forger skill/150 (5–95%), and traced to the forger's
  employer with chance 30% + spend/400 (30–80%), which is announced to every court.
- **Catastrophes**: 3.5% per power per season. Drought halves income for three seasons; plague cuts
  a quarter for two and kills a unit; floods and earthquakes zero one province for two or four
  seasons. Other courts hear rumours that are accurate, exaggerated or understated.

## Models

- **Presets**: Free (all script, no key), Budget (every role on Haiku 5.5), Standard (the design
  document's table: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys) and Showcase (Opus 5.5 kings
  and narrator, Haiku 5.5 envoys). Any seat can be set separately, envoys can be Sonnet 5.5, and the
  narrator any of the three. Kings think at a chosen effort (medium by default; host audiences run
  one level lower); characters run at low effort.
- **Cost estimates** (`CostEstimate`) come from average token counts per call: a king's orders
  read the 5,000-token rulebook from cache and add about 5,000 fresh tokens and 3,000 out; about one
  audience a season; some 15 character calls a season; the narrator's personas and chronicles.
  For 20 seasons that is roughly $0.55 (Budget), $9 (Standard) and $18 (Showcase). The spending cap
  defaults to one and a half times the estimate.
- Every state-changing output uses structured output (a JSON schema). Orders face the same
  validator as any seat. An unreadable reply is retried once with the error; then the runner
  uses a script decision for that call and logs the failure.
- **Server-side refusal fallback** (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`)
  is on for Sonnet and Opus calls. Haiku has no server fallback; a refused Haiku call falls back
  to the script character.
- **Prompt caching**: the leader rulebook, map and customs primer form one byte-stable system
  block marked for caching, shared across seats and seasons; per-seat identity and the season's
  situation come after it.
- **Transport**: the official C# SDK is used in the console runner and tests. It cannot run in the
  browser (its constructor enables HTTP decompression, which WebAssembly forbids), so the browser
  posts the same Messages API request with `HttpClient`, with the
  `anthropic-dangerous-direct-browser-access` header.
- **Prompt-injection boundaries**: a character's prompt holds only its own persona, memory and
  facts (tested); text never changes state; the narrator receives only released facts.
- **Leader memory** is a private journal of its own notes and orders. A resumed game's model
  leaders start their journal afresh.

## Balance (script bots)

Script bots exist to exercise the engine; their balance is only a rough guide to how models or
people will play. Starting positions were tuned with the batch runner until every power wins some
games. Changes from the first draft: Hatti starts with three armies (one in Kizzuwatna) instead of
a fleet; Egypt's second army starts in Akhetaten; Mitanni (Terqa) and Assyria (Ekallatum) each
start with a third army; Susa (Elam) was added as a free city for Babylonia and Assyria, with a
route from Ekallatum to Mari; the southern Levant cities yield less; starting wages were lowered.
Small kingdoms' bots bank gold for cities instead of raising troops they cannot feed.

Two runs of 100 games, all replays exact:

| Power | Tier | Wins, seeds 1–100 | Wins, seeds 101–200 |
|---|---|---|---|
| Egypt | Strong | 34% | 25% |
| Hatti | Strong | 23% | 27% |
| Babylonia | Strong | 22% | 27% |
| Mitanni | Middle | 11% | 16% |
| Assyria | Middle | 9% | 11% |
| Arzawa | Weak | 12% | 14% |
| Alashiya | Weak | 18% | 20% |

Shared wins count for both partners, so columns add up to more than 100%. Alashiya, which won 2%
before sea-reach purchases and walls that hold for their buyer, now grows by buying coastal cities.

Signal counts from script games are mostly artefacts of the bots' templates (their letters
complain, their tablets name consequences). The signals are meant to be read from model and human
games.

## Not built yet

- Multiplayer (stages 2 and 3 of the design document): the engine runs in one browser.
- Shareable spectator links; the log file is the way to share a game.
- Art, animation, sound.
