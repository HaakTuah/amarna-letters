<!-- Generated from the design document, main tab, revision 545 (2026-10-26). Do not edit: see docs/intent/INDEX.md. -->
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

**Process notes.**

- **Next steps** are the numbered items under "Build order" below. The most important open question, whether envoys and leaders are too honest, can only be answered by real model games.
- **Simulated API first.** A built-in fake Anthropic endpoint runs the full model path in the browser at zero cost; use it to check plumbing after every change to prompts or schemas.
- **First live runs.** Use a spend-limited key and a small budget (for example $3), and watch the cost meter for two seasons before letting a game run. Play one game with Sonnet 5.5 leaders and script characters, then one with Haiku 5.5 envoys, since envoys carry the core mechanic. These games wait until the build order is done ("No model games until the build order is done" under Build order).
- **Script bots test the engine, not the hypothesis.** They cannot lie strategically or invent norms. Document their decision rules so balance numbers are read against known behavior.
- **Bot archetypes** (aggressive, mercantile, loyal to a fault) stress the engine with varied behavior and give model leaders varied opponents.
- **Balance against bots is provisional.** It will shift once model leaders negotiate; do not over-tune the map before then.

**Primer experiment.** Run matched games with and without the customs primer, to see whether historical framing changes how trust and norms emerge.

