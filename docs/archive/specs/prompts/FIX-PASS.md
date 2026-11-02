# Fix pass: item 4's follow-up (Haakon, 20 October 2026, word for word)

Review of item 4: accepted. From now on, build the whole Build order, item by item, reading each item and the builder rules fresh from the live document at https://claude.ai/code/artifact/7f857750-39dc-464a-a739-c9f59dfe3dcd. The document changed a lot tonight, including items 5, 6, 7, 8, 10, 11, 13, 16 and 18 and the builder rules, so do not rely on anything you read earlier.

Builder rules to note (all in the document):
- Review points no longer stop the build: finish the item, write its review questions and your readings in the report, list them at the top of BUILD-PROGRESS, and go on.
- No model games until every item is built. Script games and stub repliers check everything.
- "Every feature is every seat's", a core tenet: script kings and script characters must use every feature sensibly, with at least occasional success. Every item tests them in script games, reports usage and success per new feature, and patches every weakness found, with benchmarks before and after. At the start of the next item you begin, audit every feature built so far the same way and patch the gaps. Models must also be able to use every feature well, so every feature is clearly described in the rulebook and requests.
- Stop rules are never overridden: if a check that says stop fails, stop and ask.
- PRs: each time an item is merged into develop, push develop and make sure a PR from develop to main carries it, so I can merge and test each item. Before every push, check the previous PR: if it is still open, the push adds to it; if it was merged, first merge main back into develop, then push and open a new PR.
- Usage: you may go up to 95% of weekly usage. Stop at a clean commit, with the progress file up to date, if it passes 95%.

First, a fix pass as item 4's follow-up, with its own branch, tests and report:
1. Kings never choose when they wake ("Decided: sleep is the default" and "No triggers of the seat's own"): remove naming a season to be woken, the five seat-defined triggers, and setting a default trigger's priority. Only the default triggers and the hidden cap wake a king. Add the missing default triggers for a threat to a walled city or a home province, fix standing orders that fire a season late, and allow scheduled orders for new levies. The rulebook says plainly that he may sleep for the rest of the game, so he must stack up orders, and lists only what wakes him; fix the sleep paragraph six kings read as a contradiction. Rulebook and seat view change in the same commit.
2. Fix the request-text and view defects from item 4's report: gold questions only when gold is carried; the envoy's own commitment kept out of "What happened"; persona trait words rewritten when traits change; archive copy numbers leaking into letters; bounce reports saying where the unit now stands; audience texts cut at 200 characters; the king's own letters, mandates and tablets in his record; STANDINGS labelled for what it is.
3. Fix the isolation test so every agent actually attempts every forbidden step, and confirm with a dry run that it can pass.
4. Fix the script skim rounding and the shadow's false seal claims and checks, under the new save version.

Then item 5 onward, in order, to the end of the Build order.

## Additions (Haakon, 20 October 2026)

Three additions from the live document, for the fix pass you're running now, since they touch the same files:
1. New builder rule "Requests are rules too": no field in a request may imply something that isn't true. Apply it while fixing the request texts: ask only what applies, show no internal ids or numbers a king or character could repeat, and keep the engine's outcomes apart from a character's own words. Check the other request schemas for the same kind of nudge, not only the cases item 4 found.
2. While you're in the kit for the isolation test: repeat the safety-check rule in docs/SIMULATION-PROMPT.md in the same words as the builder rules, since that's what an orchestrator reads.
3. Also in the kit: add the debrief question "What did you find most and least interesting about playing this role?" for kings and characters, ready for when model games return. Don't run any.
