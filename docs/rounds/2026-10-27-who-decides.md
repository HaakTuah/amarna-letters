# Item 6c: who decides (27 October 2026)

Build order item 6c (split from 6b on 27 October 2026): "Every model the table's choice, with planning as an option,
presets and unpriced models shown as unknown on the cost meter ("Every model is the table's choice"); the ladder of
script, small and large model for every job, with routine audiences and light alerts as its first cases, passing up and
asking advice from a brief; and the worth of a call, the budget or target, and audits ("Minds follow what is at stake"),
for kings and characters alike. The machinery is tested with stand-in repliers; what it saves is measured in the model
games after the build order. **Stop for review.**"

Sections read: "Every model is the table's choice", "Minds follow what is at stake", "The seat's model commits; a cheaper
model handles what is light", "Routine audiences are answered by a cheaper model", "Light alerts go to the cheaper model
too" (all under Engine and models), and the design pillar "Models only where they matter". The check for changes: the
live document's Build order (revision 33) and Engine and models (revision 40) tabs have no changes since the copy.

Weekly usage: unknown (this session cannot read it). Effort: medium, as asked. Helpers: one reviewer (below); no other
agents.

## What was built

How it works is in the design notes, `docs/design/04-models.md`, "Who decides" (one fact, one place); in short:

- **The table's choice.** Each job is a ladder the table sets on the start page ("Customize the table", "Who decides")
  and in the batch runner (`--small`, `--plays`, `--characters-up`, `--planning`, `--pace`, `--season-usd`, `--target`,
  `--audit-share`): the kings' large rung per seat (as before), their small rung (Haiku by default, "Off" for none, any
  seat able to override it), who plays a woken king (his own model, or the small one with his own above), the
  characters' large rung (Sonnet by default), planning (off by default) and how the game spends. Every choice goes into
  the log header (`jobs`) and comes back with a continued game.
- **A fifth preset, Counsel**: Haiku plays every king and character; Sonnet plans each king's year, gives counsel and
  takes what is passed up. Estimated at about $4.80 a median game against Standard's $5.80 (first guesses).
- **Unpriced models are unknown, never free**: the estimate says "unknown (no price for …)", the meter "$X + unknown",
  and a game with a spending limit (every web game with models, every batch) does not start until each model has a
  price; a local model priced at 0 is free.
- **The ladder** (`Ladder.climb`): the small rung may pass a matter up whole with its reason, or ask the large rung's
  counsel from a brief of its own (the large rung reads the brief alone); a small rung's orders that would commit the
  king go up by themselves. Kings and characters alike.
- **Routine audiences** (the small rung holds a sleeping king's court, envoy by envoy, except what the engine passes to
  his own model by itself; a backstop on what it gives in a season) and **light alerts** (the small rung reads a
  sleeping king's news and wakes him when it might matter; a logged decision, so replays wake the same kings).
- **Planning** as an option: a strong model writes the king's plan at the start, once a year, when something large
  happens and when he asks, from his realm in brief and his record, with standing answers.
- **The worth of a call and the budget** (`Spending`): stakes read from what the mind could see; a going rate paced
  from the limit over the seasons the table's settings make likely (never the drawn last season), a cost per season, or
  a target; what the budget cannot pay, the script decides where it may (a king's orders wait and grow in worth).
- **Audits**: one small-rung decision in twenty also put, out of play, to the rung above; logged (`audit` lines) and
  moving the rung's rates.
- **Who wrote it**: every routed decision's authorship carries its rung, the model and why; the message trail shows it.
  No request names a rung or a model; the rulebook gained one sentence on the king's thoughts and plan in his record.

## Measured with stand-in repliers

The simulated API answers every call; what the ladder saves is for the model games after the build order. Four games
each, seeds 1-4, 24 seasons at most (93 seasons in all), every king a model (the stand-in kings send no envoys, so these
games exercise orders, light alerts, plans and audits; courts and characters are covered by the tests below):

| | Standard | Counsel |
|---|---|---|
| Orders calls | 91 on Sonnet (the king's own) | 91 on Haiku (the small rung plays), none passed up |
| Light-alert calls | 17 on Haiku, none woke a king (the stand-in says no) | 17 on Haiku |
| Plans | none (planning off) | 76 on Sonnet |
| Audits | none (no small-rung decisions) | 4 on Sonnet, none differed (stand-ins answer alike) |
| Narrator | Sonnet | Haiku |

The tests (`src/game/test/who-decides.test.ts`, 16) show, with stand-ins that answer as each case needs: the climb to
where a decision starts; passing up and counsel from a brief; a committing reply going up; audits never used and
moving the rates; the budget leaving a decision to the script once the limit is spent and always taking a free model;
the pace from the table's ending settings; routine courts on the small rung and an envoy it passes up answered by the
king's own model; light alerts noting into the record and waking the king ("word came: …"); the small rung off giving
the behaviour before 6c; planning; characters passing up; a king the budget cannot pay waiting with no fallback counted;
exact replay with rungs and audits in the log; the header round trip; unpriced models; the Counsel preset.

## Benchmarks and the script games

- **50 script games**, seeds 1-50, `--verify-replay`: 50 of 50 replay exactly, every line of the report the same as
  before the item (and as after 6b).
- **`--versus solo`**, 40 seeds: unchanged (all kings 8.26 alone and 1.25 as baseline; 94% and 14% of wins).

Script kings and characters make no calls, so nothing of the ladder is theirs to use (the tenet "Every feature is every
seat's" is met by the features being the same for every model-played mind, king or character). One thing the script
games show for the model games: **script kings' envoys nearly always bring a tablet to seal**, so at a model king's
court the engine passes them to his own model (in seed 3's first eight seasons, every envoy to a model king did); routine
audiences will matter between model kings, whose letters are often words alone.

## The feature audit

The 50 script games before the item give the same counts as item 6b's audit (sealed tablets 50/1744, authentication
47/503, evidence shown 44/351, bribes 23/44, defections 28/52, detentions 38/219, skims 40/198, debasement found 14/63,
spies caught 20/38, double agents 5/6, archives copied 40/588 and taken 44/106, inventories swapped 20/38, forgeries 4/4,
sieges begun 50/869 and won 50/799, storms 33/64, walls strengthened 50/1846, sallies 46/310, terrain held 36/190 and
beaten 12/18, desert supplies 7/10, coalitions 4/4). No gap; nothing patched.

## First guesses (not tuned; item 18 tunes them)

- How often a rung decides as the large one would, in a way that matters: script 0.4, small 0.75 (`RungQuality`), each
  worth five audits against what the audits find.
- The going rate starts at 2 worth per dollar; it rises by half when a season spends past 110% of its pace and falls by a
  third under 60%; within a season it rises with the overspend. A target moves it by the season's audits (a difference
  that matters is one weighing at least 0.25).
- Stakes: a king's orders 0.15 plus the share of his land with foreign troops in or beside it plus 0.1 a wake reason; a
  court 0.05 plus the gold brought against the treasury, 0.5 a tablet offered and 0.3 tablets shown; light alerts 0.05
  each; a plan 0.5; characters 0.1-0.2 plus gold carried or offered against their purse plus 50 (a post at four
  seasons' wage, 0.3 a tablet carried, 0.5 detention). What waits gains half its worth a season.
- One decision in twenty audited. The engine passes an envoy up for gold above the backstop, a quarter of the treasury
  by the king's ledger, the standing answers' share. A plan once a year (three seasons). Counsel at most 1,500 tokens.
- The estimate's ladder figures (in `04-models.md`).

## The review

To be filled in after the reviewer's pass.

## Readings taken and review questions

1. **The spending limit paces only when the table says so.** "From a limit the engine paces itself" read with "With no
   limit and no season's cost set, each job's model decides everything it decides today": the web app always has a
   limit (the pause at $…), so pacing from it by default would change every model game by a first-guess rate. Pacing is a
   setting ("Spend calls where they matter most": off, from the limit, per season, to a target), off by default; the
   limit still pauses the game and still refuses unpriced models. Should pacing from the limit be the default?
2. **Courts are never refused by the budget.** No envoy can wait at court in the engine (he is received the season he
   arrives), so at a routine court the budget chooses only between the small and the large rung, and an envoy the engine
   or the small rung passes up always reaches the king's own model. Should envoys wait, as the entry says, when the budget
   cannot pay?
3. **What the script does for a king the budget cannot pay**: his units hold and what stands runs (his schedule, his
   standing orders, and the standing answers at court); he is asked again the next season. No defensive moves of the
   script's own: his standing orders are his defence. Right?
4. **"How close the script's own choice is"** is not built as its own factor: the script kings expose no margins between
   their options. The audits stand in for it kind by kind (how often a small rung differs, in a way that matters). Should
   the scripts report their margins (item 18)?
5. **Only small-rung decisions are audited.** A script-rung decision has no model reply to compare with (model
   characters' shadow lines already compare them with the script's). The audits' rates start from the first guesses in
   every game; saving them from earlier games is left for the model games after the build order.
6. **Sorting and summaries are not on the menu.** No sorting pass exists (the engine routes on what it sees; "words that
   say more than their clauses" is not read), and summaries stay with the seat's own model until "A cheaper model for
   condensing" has its cheap test.
7. **Routine audiences serve sleeping kings** (orders standing), or every king the small rung plays; a king awake for
   orders holds his court with his own model. Light alerts are read only for a king that sleeps on with news and holds no
   court that season (a court's request already carries the season's news).
8. **Audits run in every model game** (one in twenty, a setting; 0 turns them off), with or without a budget.
9. **"An ally lost"**, for a new plan, is read as any kingdom fallen; a plan due while the king sleeps is written at his
   next orders.
10. **Counsel's narrator is Haiku** ("small models playing every mind"; the narrator is no mind). Standard and Showcase
    gain Haiku as the kings' small rung and Sonnet above the envoys, as the entry's defaults say; Budget has no rung above
    its Haiku characters.
11. **A small rung's ledger lines are kept** (one mind: his ledger is his, whoever wrote the line); it gives no standing
    answers (one may seal) and sends no letters.
12. **Human seats** get none of this help ("whether a human seat may turn on the same help is still to be decided").

## Haakon's words in this session

None given in this session; the session's brief named the item and the rules above.
