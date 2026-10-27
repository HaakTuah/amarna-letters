# Design notes

Decisions and simplifications made while building the prototype from the design document.
Every number here lives in `GameConfig` or `MapData` and is meant to be tuned.

Split into one file per topic under `docs/design/` on 26 October 2026, word for word, so that a session reads only
the topics its task needs. The text as it stood before the split is in git history. A new topic gets its own file and a line
here.

The historical sources behind the data (item 6+) are in [`history/`](history/README.md): dossiers on 1346 BCE, each
claim graded and sourced.

| File | Topic | KB |
| --- | --- | --- |
| [`design/01-rules-as-implemented.md`](design/01-rules-as-implemented.md) | Rules as implemented | 45.0 |
| [`design/02-communication.md`](design/02-communication.md) | Communication | 16.4 |
| [`design/03-characters.md`](design/03-characters.md) | Characters | 34.1 |
| [`design/04-models.md`](design/04-models.md) | Models | 16.9 |
| [`design/05-pacing-sleeping-seats.md`](design/05-pacing-sleeping-seats.md) | Pacing: sleeping seats | 56.0 |
| [`design/06-file-seats-and-the-agent-simulation.md`](design/06-file-seats-and-the-agent-simulation.md) | File seats and the agent simulation | 15.4 |
| [`design/07-script-kings/00-overview.md`](design/07-script-kings/00-overview.md) | Script kings: overview and "Every feature is every seat's" | 2.8 |
| [`design/07-script-kings/01-a-season-in-order.md`](design/07-script-kings/01-a-season-in-order.md) | Script kings: A season, in order | 1.3 |
| [`design/07-script-kings/02-terms-used-below.md`](design/07-script-kings/02-terms-used-below.md) | Script kings: Terms used below | 3.5 |
| [`design/07-script-kings/03-temperament.md`](design/07-script-kings/03-temperament.md) | Script kings: Temperament | 3.0 |
| [`design/07-script-kings/04-memory-and-learning.md`](design/07-script-kings/04-memory-and-learning.md) | Script kings: Memory and learning | 5.1 |
| [`design/07-script-kings/05-choosing-a-war.md`](design/07-script-kings/05-choosing-a-war.md) | Script kings: Choosing a war | 2.6 |
| [`design/07-script-kings/06-betrayal.md`](design/07-script-kings/06-betrayal.md) | Script kings: Betrayal | 0.8 |
| [`design/07-script-kings/07-coalitions-and-defence-pacts.md`](design/07-script-kings/07-coalitions-and-defence-pacts.md) | Script kings: Coalitions and defence pacts | 4.5 |
| [`design/07-script-kings/08-rivals-for-the-crown-and-bandwagoning.md`](design/07-script-kings/08-rivals-for-the-crown-and-bandwagoning.md) | Script kings: Rivals for the crown, and bandwagoning | 0.8 |
| [`design/07-script-kings/09-good-faith.md`](design/07-script-kings/09-good-faith.md) | Script kings: Good faith | 1.9 |
| [`design/07-script-kings/10-tactics-the-first-plan.md`](design/07-script-kings/10-tactics-the-first-plan.md) | Script kings: Tactics: the first plan | 8.1 |
| [`design/07-script-kings/11-the-look-ahead.md`](design/07-script-kings/11-the-look-ahead.md) | Script kings: The look-ahead | 6.1 |
| [`design/07-script-kings/12-standing-orders.md`](design/07-script-kings/12-standing-orders.md) | Script kings: Standing orders | 5.6 |
| [`design/07-script-kings/13-treasury.md`](design/07-script-kings/13-treasury.md) | Script kings: Treasury | 8.5 |
| [`design/07-script-kings/14-court-and-intelligence.md`](design/07-script-kings/14-court-and-intelligence.md) | Script kings: Court and intelligence | 8.4 |
| [`design/07-script-kings/15-letters-and-gifts.md`](design/07-script-kings/15-letters-and-gifts.md) | Script kings: Letters and gifts | 5.5 |
| [`design/07-script-kings/16-audiences.md`](design/07-script-kings/16-audiences.md) | Script kings: Audiences | 5.2 |
| [`design/07-script-kings/17-greetings.md`](design/07-script-kings/17-greetings.md) | Script kings: Greetings | 0.9 |
| [`design/07-script-kings/18-script-envoys.md`](design/07-script-kings/18-script-envoys.md) | Script kings: Script envoys | 7.4 |
| [`design/07-script-kings/19-known-quirks.md`](design/07-script-kings/19-known-quirks.md) | Script kings: Known quirks | 3.6 |
| [`design/07-script-kings/20-benchmarks.md`](design/07-script-kings/20-benchmarks.md) | Script kings: Benchmarks | 1.7 |
| [`design/08-balance.md`](design/08-balance.md) | Balance (script kings) | 6.6 |
| [`design/09-the-web-map-and-the-interface.md`](design/09-the-web-map-and-the-interface.md) | The web map and the interface (visual overhaul) | 16.1 |
| [`design/10-where-the-code-differs-from-the-design-document.md`](design/10-where-the-code-differs-from-the-design-document.md) | Where the code differs from the design document (as it stood on 19 October 2026) | 6.6 |
| [`design/11-not-built-yet.md`](design/11-not-built-yet.md) | Not built yet | 7.3 |
