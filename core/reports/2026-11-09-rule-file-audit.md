# The core's rule-file audit (9 November 2026)

Point 6 of `modules/workshop-check.md`, for the core (core archive 54, 67 and 68): a fresh reviewer (Opus, high), given
only the core (`README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `floor/`, `modules/`, and the archive searched
only to check citations), looked for contradictions, duplication, stale lines, unclear instructions, broken pointers
and what can be cut. It found 25 points (A1 to A25); 24 are made here, one is not, and one opened a question. The files
every session reads at the start lose 92 bytes together (`floor/security.md` 7,195 to 7,185, `how-to-work.md` 5,173 to
5,200, `work-flow.md` 1,987 to 1,900, `claude.md` 6,917 to 6,872); `README.md` loses 426.

## The floor (the owner's yes is asked in the PR)

| | What | Kind | What changes for a project |
| --- | --- | --- | --- |
| A1 | "A break of a rule here blocks" becomes "a break of any floor rule": "here" could be read as `floor/security.md` alone, leaving out `floor/topics.md` | unclear | nothing (it was always meant so) |
| A2 | "A milestone PR needs it only for a commit…" becomes "needs its security review only…": "it" could be read as the code review | unclear | nothing (`modules/reviews.md` already read it so) |
| A3 | **Cut:** "Test data uses made-up names." from rule 11, since rule 8 says it in full | duplication | nothing |
| A4 | The threat model's ways in name rules 15 and 17 (dependencies, Dependabot's PRs) beside 2, 7 and 10 | stale | nothing |
| A5 | Floor rule 8 bars anything on the owner's machine; `modules/orchestrating.md` named "a machine of the owner's" among the places an orchestrator could run. The floor stays as it is (the stand-in: sure); the module now says "never the owner's machine, floor rule 8" | contradiction | an orchestrator never runs on the owner's machine, as the floor already required; whether he wants that later: [#16](https://github.com/HaakTuah/agent-rules/issues/16) |

## The modules, `README.md` and `AGENTS.md`

| | What | Kind | What changes for a project |
| --- | --- | --- | --- |
| A6 | `reviews.md`: the design checker's brief is "The briefs" below, not "point 7" (which is another list's) | broken pointer | nothing |
| A7 | **Cut:** `reviews.md`: "its first canary found every planted fault", dated history, and untrue since Codex later missed two (core archive 72) | stale | nothing |
| A8 | **Cut:** `updates.md`'s list of floor rule 17's conditions, a second copy that had already dropped the source check of what ships; it points to rule 17 | duplication | nothing |
| A9 | `claude.md`: "if its last step fails too, or Fable is unavailable, it is blocked" contradicted "Fable's fallback" (nothing waits for Fable); "or Fable is unavailable" is dropped | contradiction | **yes:** with Fable unavailable, the last escalation runs on Opus at high, as the fallback says, instead of the problem being blocked at once (the stand-in: sure; core archive 25 and 73) |
| A10 | **Cut:** `orchestrating.md`'s "The aim…" (the aim in `how-to-work.md`, which now cites its archive item 17 too) and "No turn sits idle" ("Print little" and work-flow point 1) | duplication | nothing |
| A11 | **Cut:** `README.md` restated the top of `floor/security.md` and `AGENTS.md`; it now points to them | duplication | nothing |
| A12 | **Cut:** `work-flow.md` point 4, a pointer to the brake that its own header and Claude's start reading already give | pointer no reader needs | nothing |
| A13 | `work-flow.md`: re-reading the spec came as point 5, "before opening the PR", after point 1 had marked the long-open draft ready; it now opens point 1 | unclear | nothing: the spec is re-read when the work is done, before the ready mark, as meant |
| A14 | `how-to-work.md`: "the file-by-file reviews", defined nowhere, is the workshop check's search for files to split (its point 3) | broken pointer | nothing |
| A15 | `claude.md` and `helpers.md` gave the workshop check two duties (review rounds by model; the helpers' sum) that `workshop-check.md`, the one file its builder reads, did not list; they are its points 8 and 9, and the comparison of usage by model is made only where usage can be read (as "Usage" in `claude.md` requires) | contradiction | nothing new: the duties stood already, now where their builder reads them |
| A16 | Game words in the core: `claude.md`'s "engine rules" and "news lines" (the *hard work* slot holds them), `workshop-check.md`'s "they come daily" (the *milestone due* slot), `reviews.md`'s "slop audit's formula test", defined nowhere (now in the *slop bar* slot, which both manifests already fill with it) | unclear | nothing: both manifests already fill those slots so |
| A17 | `roles.md`: "Every rule names a role, never a model" was untrue (the floor and several modules name Claude and Codex) | untrue description | nothing |
| A18 | `roles.md` and `orchestrating.md`: "gives the hard work more effort inside its own session", though a session cannot change its own effort; the route is a helper above it (`claude.md`) | unclear | nothing |
| A19 | **Cut:** `review-guidelines.md` repeated the builder's filing steps for the one idea; it points to `inbox.md`. This file changes only on the owner's word, so his yes is asked in the PR | duplication | nothing |
| A20 | `workshop-check.md`: "answered questions moved to `docs/archive/`" predates questions living in issues (`inbox.md`) | stale | nothing |
| A22 | `AGENTS.md`: "The rest describe work this repository does not do" now says "but for the rule-file audit below", which it runs | untrue description | nothing |
| A23 | `reviews.md` held two Codex-building rules, dormant until Codex builds (its checks that rerun the measurements; the review sums routing work to it); they move to `codex-building.md`, read when Codex builds | split by meaning | nothing (dormant) |
| A24 | `how-to-work.md`: "Principles over rules" put readings "in the PR"; every other reading goes in the *report* | contradiction | nothing where the report is the PR (Barkstreet Snakes); elsewhere this reading joins the others |
| A25 | `README.md`: the list of paths "the core names outright" was incomplete and would keep drifting; it gives examples | stale | nothing |

## Not made

- **A21,** `updates.md`'s cue for moving Node ("each October… when a new even-numbered Node becomes long-term
  support") against core archive 39 (a new major of the Node types as the cue): the first core took this on purpose,
  with "or at the cue the project names", Amarna Letters keeping its types cue and Barkstreet Snakes its own reason,
  which the owner confirmed (each keeps its own where the games differ; `2026-11-09-first-core.md`, #7). Changing the
  shared cue would change Barkstreet's.

## Looked at and kept

The reviewer checked every slot against the table, every quoted pointer and every archive citation (all resolve and
support their rule but those above), and kept, as each adds something its reader needs: floor rule 4 and rule 17
pointing to each other; rule 1's revocation beside rule 9's replacement; Codex's "nothing open passes" in three files;
the 20 and 50 KB marks beside their slots; the status dates still ahead or needed; two small repeats worth less than
their cut.

## Questions for the owner

- [#16](https://github.com/HaakTuah/agent-rules/issues/16): may an orchestrator ever run on your own computer, or only
  on a server? Reading taken: the floor stays; the orchestrator module now says never on your machine.
