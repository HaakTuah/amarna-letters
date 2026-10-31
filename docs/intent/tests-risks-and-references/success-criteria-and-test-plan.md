<!-- Generated from the design document, Tests, risks and references tab, revision 14 (2026-10-31). Do not edit: see docs/intent/INDEX.md. -->
## Success criteria and test plan

The prototype succeeds if, across ten or more full games, norms of trust appear that no rule created. Decide the signals before building, and read them from the logs.

**Signals that the hypothesis holds.**

- [ ] Players demand sealed tablets for important deals, without being told to.
- [ ] Players accuse envoys of lying, and sometimes use that as an excuse.
- [ ] Messages refer back to past betrayals and kept promises (reputation forms).
- [ ] Coalitions form against whoever leads.
- [ ] Someone attempts a forgery, and someone pays to authenticate.
- [ ] Players invent rules for each other, such as a pact with written consequences.
- [ ] Weak powers win sometimes.

**Build milestones (all six are built and tested offline).**

1. **Engine and map.** Seeded engine, province graph, gold, units, Diplomacy-style resolution, replay from log.
2. **Seats.** The shared seat interface, plus scripted bots to test the engine at speed.
3. **Characters and envoys.** Character records, persona generation, travel, audiences, reports.
4. **Language-model leaders.** Leader seats on the same interface; first all-AI games, watched in spectator mode.
5. **Evidence and intelligence.** Tablets, seals, authentication, forgery, spies, background checks, the market.
6. **Narrator chronicle.** Optional per-nation chronicles after each game.

**Experiments once it runs.** All-AI games for tuning; mixed human and AI tables; model comparisons in the same seat (an Opus Egypt against a Sonnet Hatti); tuning starting tiers until each power wins some games.

**Script against model** (decided 27 October 2026). The first model games after the build order measure two things before the ladder's defaults hand any decision of a model seat to the script. Divergence: the shadow scripts' log ("Shadow scripts" under "Minds follow what is at stake") shows, kind by kind, where script and model decide alike. Outcome: matched games on the same seeds, model seats deciding everything against model seats on the ladder, show whether the ladder costs them in score and wins; if it costs more than a little, it hands decisions back to the models until it does not. The same data improve the scripts: where model seats do better and the two diverge, the script kings and characters are taught to play more like the models there, as rules of their own that stay deterministic, never copied replies, and only where the models win, since models make mistakes too. The new scripts are then shadowed and measured again, and a change is kept only if it holds on fresh seeds. Stronger scripts make better stand-ins for model seats, better sparring partners and a better balance proxy. Each round needs model games, so it runs only when Haakon asks for them.

**The first model games: one plan** (decided 27 October 2026). Model games are expensive, so the first ones come only after every item of the build order is built, the balance pass included, and only when Haakon asks; they run as one planned batch in which every game answers every open question at once, never one game per question. The plan below is fixed now and refined when the build order is done, its number of games set by what the measurements need and the budget Haakon gives.

- **First, one short game** of a few seasons on a spend-limited key, to check the plumbing, the fallback rate and the cost of a season before the batch runs ("Live runs" below).
- **Every game logs everything at once:** the shadow scripts and the audits for every decision ("Shadow scripts", "Audits"); the cost of each season by job, which sets pacing's defaults; the fallback rate; and whether rivals learn to tell the rungs apart.
- **Games come in pairs on the same seeds,** model seats deciding everything in one and on the ladder in the other, for "Script against model". Other comparisons, the customs primer and the advisors on or off, share the batch on further seeds as the budget allows, one comparison per pair so their effects stay apart.
- **Every game is read for** the signals that the hypothesis holds (above); whether envoys and kings are too honest; whether each feature is used as the rulebook says it can be; whether characters' greed and kings' trust settle where the game stays interesting; and every debrief asks each king and character what it found most and least interesting about its role.
- **No new games for what old ones can show:** the test of a cheaper model for condensing reads the journals these games recorded ("A cheaper model for condensing").
- **Then the scripts learn from the batch** where the models did better ("Script against model"), and the balance pass's numbers move only where the batch shows they should.

**Process notes.**

- **Next steps** are the numbered items under "Build order". The most important open question, whether envoys and leaders are too honest, can only be answered by real model games.
- **Simulated API first.** A built-in fake Anthropic endpoint runs the full model path in the browser at zero cost; use it to check plumbing after every change to prompts or schemas.
- **Live runs.** The first live game (26 October 2026) had nearly all its model calls refused for the size of their schemas, which the fix pass after the conversion fixes ("One source for model schemas"). Further live runs use a spend-limited key and a small budget (for example $3), with the cost meter watched for two seasons before a game is left to run: one game with Sonnet 5.5 leaders and script characters, then one with Haiku 5.5 envoys, since envoys carry the core mechanic. The first also checks that no king claims or does anything only because a field of his court's request implied it: since item 6b, that request asks every field of every envoy, each saying when it applies, so its fixed part stays cached ("Requests are rules too"). They wait until the build order is done ("No model games until the build order is done" under Build order).
- **Script bots test the engine, not the hypothesis.** They cannot lie strategically or invent norms. Document their decision rules so balance numbers are read against known behavior.
- **Script kings' temperaments** (each court's historical archetype by default, or rolled per game from item 18) stress the engine with varied behavior and give model leaders varied opponents.
- **Balance is tuned against the script kings,** at their strongest, in item 18; model games afterwards, when Haakon asks for them, may shift it.

**Primer experiment.** Run matched games with and without the customs primer, to see whether historical framing changes how trust and norms emerge.

