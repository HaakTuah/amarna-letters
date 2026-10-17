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
- **Prisoners**: an envoy held at a foreign court whose own kingdom falls becomes a free agent but
  stays a prisoner; only the court holding them can hire them.
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

## Script kings

A script king sees exactly what any seat sees (its `SeatView`) and nothing more. The same bot
plays every script seat, and stands in for a model seat whenever a call to the model fails,
playing that king's temperament.

- **Temperament.** Ten weights from 0 to 1: aggression, caution, honesty, greed, generosity,
  pride, diplomacy, cunning, vengeance and commerce. Each power has a historical archetype
  (Egypt, "Pharaoh of the gilded gifts"; Hatti, "the conqueror of Anatolia"; Babylonia, "keeper of
  the old order"; Mitanni, "seeker of a patron"; Assyria, "the upstart who would be brother";
  Arzawa, "the western opportunist"; Alashiya, "the copper merchant"), and every game nudges each
  weight by up to 0.15 from the seed. The weights decide whether it starts wars and whom it
  attacks, how much risk a plan may carry, its gold reserve, whether it buys or conquers, how
  often it writes and seals, what it gives, whether it debases its gifts or breaks an oath, and how
  it greets: Babylon will not call Assyria brother or Great King. The god view lists each king's
  temperament under Standings.
- **Memory.** Trust and grudges for every other king, learned from what reaches its court: land
  taken, attacks and supports seen last season, sealed tablets and broken oaths, gold that weighed
  light or assayed false, overdue envoys, spies who confess, gifts, and the tone of letters and
  envoy reports. Grudges fade at a rate set by vengeance. It also remembers where it last saw
  foreign troops it can no longer see (starting from the public opening positions) for three
  seasons, and roughly how many troops each king has.
- **Strategy.** A war is worth what it can win this year: each of the rival's provinces within
  reach, by the chance our troops there beat what can hold it (a unit and its supports, walls, and
  troops we cannot see), times the odds of the two armies, minus the risk from other neighbours
  while we are busy. Treaties, trust, gifts and supports given weigh against war; grudges, a
  runaway leader and a king we have sworn against weigh for it. While one king runs away with the
  game, a war of choice among the rest weighs less, and only the most warlike still grab land from
  the others. In the first year only the warlike or the wronged start one, and no king marches on
  one he has just sent a tablet to while the answer is on the road. Betrayal is rare: only for the
  faithless, only for a real prize, never in the first year and never against a king who has
  supported us.
- **Balance of power.** Each court reckons every king's strength the way the game scores it, land
  plus gold: rivals' treasuries are estimated from what is public (starting gold, then each season
  the income of the land they hold, less the upkeep of the troops it thinks they have, a servant's
  wages, levies it saw raised and cities it saw bought). Buying a city turns gold into the same
  strength in land, so a buyer is not mistaken for a conqueror. The leader is the king whose growth
  so reckoned is at least 1.15 and 0.1 above the next, once the first year is out, and who has the
  weight to be feared (at least 80% of the median strength): a small kingdom that grows fast leads
  the race but threatens nobody. Kings propose a coalition against the leader to the kings whose
  land touches his, if he outweighs them both; a king losing land to a stronger neighbour asks that
  neighbour's other neighbours for a defence pact. The tablet names the king it is sworn against,
  and is a sworn treaty, not an alliance: it does not make the partners share a victory. Partners
  then act on it: the foe becomes their war, his land is worth more to them, a support that holds a
  partner against him or helps a partner into his land is valued in the look-ahead, and they strike
  **joint blows** by a rule each can work out from its own side of the board, so no letter has to
  settle who does what: next to each of his provinces (richest first, each troop once), the troops
  of the partner with the least land go in and every other sworn troop in sight supports them. A
  king at peace with the foe still gives the support (it sends no troops into his land) but leaves
  going in to a partner. Great kings of a size, both among the three strongest, keep the peace but
  do not swear full alliances (that would let them share the victory and leave the rest nothing);
  a small kingdom may seek the alliance of the leader himself.
- **Tactics** draws a plan from operations (defend with supports, block, cut supports, attacks
  sized to beat the likely defence, convoys, approach), then **looks ahead**. It pictures each
  rival's orders: the plan that rival would draw from its side of the board, with its archetype's
  temperament and a mirror of our dealings with it; a harder plan aimed at us; and all-in strikes
  (every unit it has in reach of one of our provinces). Eight seasons are pictured: everyone calm;
  the most hostile king striking, or attacking by plan; and five mixes drawn by each king's
  hostility, with some units wandering at random. Candidate plans (its own, a bolder one, a safer
  one, everyone holding) and then every single-unit change (hold, each legal move, each support, a
  move with a supporter) are resolved against all eight with the engine's own adjudicator. A
  resolved season scores the land held (10 × yield, plus the yield for each season the game is
  still expected to run; capitals and homeland count extra), 90 a unit, and harm done to enemies,
  minus what lies open to a hostile neighbour next season, plus troops placed to strike. A plan's
  worth is the average, pulled towards the worst case by caution. Sworn partners are pictured
  keeping to the joint-blow rule. It never orders troops into the land of a king it is unwilling
  to fight, and it trusts its capital only to a sworn ally, however warm the letters. Budget: 720
  adjudications per king per season, about 20 ms natively; a season of six script kings takes well
  under a second in the browser.
- **Treasury and court.** A reserve sized to upkeep and caution; disbanding before troops desert;
  levies where a plan fell short and the unit pays for itself; cities bought when the price leaves
  the reserve intact, preferring cities no rival can bid for, and after the elders refuse to choose
  between rival buyers, bidding again only half the time (two kings who both bid every season never
  get the city). Servants beyond two only while the surplus matches the size of the kingdom;
  checks before hiring for the careful who can spare the fee; assays of doubtful gold; watchmen
  after a spy is caught; tablets examined only when they could turn it against a friend.
- **Letters.** Coalitions and defence pacts (see above), peace with neighbours (the weak with
  tribute, and further gifts only to a great neighbour who looks ready to march), alliance with
  trusted partners, small gifts to friends (one a season, never more than a third of a season's
  income), grievances, copies of tablets that prove a broken oath, and forgeries from the cunning.
  What a host seals at an audience binds it that same season, before it gives its orders.

### Benchmarks

`BaselineLeader` is a frozen copy of the first script bot. `--versus solo` plays each king on the
current bot against six baselines and compares it with the same seed played all-baseline;
`--versus baseline` gives half the kings to each side; `--focus <Power>` plays one king on the
current bot. Seeds 1–40, one current king against six baselines:

| Power | Growth alone | Growth as baseline | Wins alone | Wins as baseline |
|---|---|---|---|---|
| Egypt | 2.87 | 1.34 | 81% | 19% |
| Hatti | 2.65 | 0.82 | 73% | 8% |
| Babylonia | 2.48 | 1.13 | 54% | 6% |
| Mitanni | 1.80 | 1.30 | 36% | 25% |
| Assyria | 3.18 | 0.96 | 54% | 11% |
| Arzawa | 3.24 | 1.46 | 51% | 24% |
| Alashiya | 1.98 | 0.87 | 44% | 8% |
| All kings | 2.60 | 1.13 | 56% | 14% |

The batch runner plays script games side by side on every core; model games run one at a time,
within the budget.

## Balance (script kings)

Script kings are only a rough guide to how models or people will play, but they now play well
enough that geography and gold decide a great deal, so the starting positions were tuned again
with the batch runner until every power wins some games. Changes from the first draft: Egypt's
second army starts in Akhetaten; Assyria (Ekallatum) starts with a third army; Susa (Elam) was
added as a free city for Babylonia and Assyria, with a route from Ekallatum to Mari; the southern
Levant cities yield less; starting wages were lowered. For the current bots: Hatti keeps a fleet
in Kizzuwatna (the first bots needed a third army there) and starts with 300 gold, not 550, since
with only weak kingdoms on its borders it otherwise took more than half the games; Mitanni's
third army starts in Taidu, facing Nineveh, its heartland yields more (Washukanni 50, Harran 35)
and it starts with 500 gold; Arzawa has two armies (Mira and Apasa) and a fleet in Seha, Seha and
Mira yield 30, and it starts with 300 gold. The fleet came with the coalition bots: Hatti won 41 of
100 games, and in every one of them it ended holding most of Arzawa, usually taken in the first
eight seasons, before a letter from anyone who could help had arrived; with Arzawa able to hold
its coast, Hatti takes under a third.

Two runs of 100 games, all replays exact (mean growth over both):

| Power | Tier | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth |
|---|---|---|---|---|
| Egypt | Strong | 26% | 22% | 2.33 |
| Hatti | Strong | 29% | 29% | 1.92 |
| Babylonia | Strong | 19% | 15% | 2.23 |
| Mitanni | Middle | 6% | 7% | 0.86 |
| Assyria | Middle | 16% | 20% | 1.58 |
| Arzawa | Weak | 14% | 14% | 1.32 |
| Alashiya | Weak | 4% | 6% | 1.12 |

Shared wins count for both partners (about one game in seven ends in one, down from one in two
before rivals for the crown stopped allying), so columns add up to more than 100%. Mitanni,
squeezed between Hatti and Assyria, and Alashiya, which neither conquers nor can outbuy Egypt,
still win least, Alashiya only by sharing a victory with a great king it has bandwagoned with.

The coalition signal (two kings supporting each other into the leader's land, or holding against
his attack) fires in about one game in ten: 27 times in 15 of seeds 1–100 and 9 times in 8 of
101–200, where before it never fired in 200 games. Joint blows need two sworn partners next to the
same province of the leader's, which the map allows only on a few borders. Other signal counts from
script games are mostly artefacts of the bots' templates (their letters complain, their tablets
name consequences). The signals are meant to be read from model and human games.

## Not built yet

- Multiplayer (stages 2 and 3 of the design document): the engine runs in one browser.
- Shareable spectator links; the log file is the way to share a game.
- Art, animation, sound.
