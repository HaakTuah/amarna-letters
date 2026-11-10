# An envoy never received remembers it (bug #784, bugs lane, 7 November 2026)

Found by the slop audit of the model requests (#785). `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **The fact an envoy brings home** (`envoyArrivesHome` in `turn/envoys-home.ts`): an envoy whose trail had no audience
  (it reached a court whose king was gone, say) is remembered as "Carried a mission to Alashiya and was never received
  there, and came home (season 6).", not as having come home with the answer. A model asked for its report no longer
  reads two facts that contradict each other.
- The audience request's merging of missions (`Mission` in `src/llm/src/prompt-audience.ts`) matches only missions that
  brought an answer, so one never received stays its own sentence, unchanged.
- **Tests:** `src/engine/test/envoy.test.ts`, "An envoy never received at a court is not remembered as bringing its
  answer home (bug #784)" (it failed before).
- **Docs:** design note `18-characters-who-they-are.md` ("A name made of outcomes"). **Save version 77** (a fact in the
  game state changes).

## Readings taken

1. **It still counts as a mission carried, for the envoy's name.** The envoy went, was turned away by no fault of its
   own and came home faithfully; the court saw that, so the fact stays a good outcome and keeps its "Carried a mission"
   start, which the script kings read as a success. Principle: every error has a motive (the envoy had none here).

## Questions for the owner

Questions for the owner: none.
