# Counsel's plans from a digest (side lane, 2 November 2026)

Found by "Model calls that get through" (`2026-11-02-model-calls-get-through.md`, "Found: Counsel no longer costs less
than Standard"). The design: "When planning is on, the strong model writes the plan from a digest of the year, what the
mind decided and what happened, rather than the whole record" (Engine and models, "Passing up and asking advice").

## What changed

- **The plan call has its own opening** (`src/llm/src/rules-plan.ts`, `planRules`): who the powers are and how a power
  wins, a short section on the plan (what it is for, that orders are given elsewhere with the full rulebook, when it is
  written anew), and the rules of standing answers and their conditions, which its reply's fields use. 9,189 characters
  against the kings' rulebook's 164,710: about 3,900 tokens where it read 70,600. Byte-stable for a configuration, so
  every king's plan reads it from one cache.
- **Written once:** those sections are now functions in `rules.ts` (`howYouWin`, `conditionsRules`,
  `standingAnswersRules`) that the rulebook and the plan's opening both use. The rulebook is byte-identical before and
  after for three configurations, with and without the customs (checked by hash).
- **Every field true** ("Requests are rules too"): the plan's opening points to no section it lacks (the capital line
  says "as your full rulebook tells" there, where the rulebook says "step 10 ... below"; it drops the pointer to PEOPLE;
  and its OMENS are "below", since the plan request now shows the season's omens, which the king reads in his report);
  its account of when the plan is written anew follows `planDue` (before the next orders, measured since the plan); its standing answers heading
  names the plan as a place to give them; and the realm in brief in a plan request no longer says "you see the full map
  only if you reopen your orders", which belongs to light alerts, but "enough to plan by; you see the full map when you
  give your orders".
- **Hidden information:** the opening is the table's rules alone; the user part holds the king's own realm in brief and
  his omens (both from his view) and his own record.
- **The estimate** counts plans apart from light alerts, over their own opening (`CostEstimate.Recorded.plan`: 3,900
  cached, 4,000 fresh, 900 out, not yet recorded; a test holds the opening's figure within a tenth of its text scaled as
  the rulebook's was recorded).

## What a season costs now

| Table | A season live | In the background | 80 seasons live | In the background |
| --- | --- | --- | --- | --- |
| Counsel, before | $1.41 | $0.87 | about $115 | about $70 |
| Counsel, now | $1.13 | $0.68 | about $90 | about $55 |
| Standard (unchanged) | $1.34 | $0.78 | about $110 | about $65 |

`src/game/test/who-decides.test.ts` asserts again that Counsel costs less than Standard; the planning test checks
that every plan request opens with the plan's opening and not the rulebook. README and `docs/design/04-models.md`
carry the new figures.

## Readings taken

1. **What a planner needs of the rules:** how a power wins (its aim), and standing answers with their conditions (the
   only fields it fills beyond the plan's words). Not the season's steps, orders, economy or war: it gives no orders,
   and the king who plays by the plan reads the whole rulebook. Principle: "Requests are rules too" (ask only what
   applies) and the design's "from a digest ... rather than the whole record".
2. **The digest stays as built:** the king's realm in brief and his record (folded notes, summary, orders), which is
   "what the mind decided and what happened". Only its header changed.
3. **The plan's call size** (4,000 fresh, 900 out) is a first guess until a game with planning is recorded ("Balance:
   first guesses during the build").

## Script players

No rule changed and no script king plays a plan, so use against ignore does not apply; the benchmarks are untouched by
a change to model requests only.

## Helpers

None: one pass of small, dependent edits.

## Questions for the owner

None.
