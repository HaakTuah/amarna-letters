# A fallen king still rules to a court that has not heard (bug #817, bugs lane, 7 November 2026)

Found while building item 17b part C2 (#815). `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **A court's view of a person** (`factsAsHeard` in `rules/people-views.ts`): when a realm falls, its living king's public fact
  "Rules Gubla from …" becomes "Ruled …" (`fall` in `turn/resolve.ts`). A court that has not yet heard of the fall
  (`GameState.fallsHeard`, as its `fallen` list already reads it) now still reads "Rules …", so a king who holds the
  fallen king captive far away learns of the fall only when word of it comes.
- The engine's own reading of the fact (`turn/unrest.ts`) is unchanged: it is the truth, not a court's view.
- **Tests:** `src/engine/test/people-lines.test.ts`, "A fallen king still rules his realm to a court that has not heard
  of its fall (bug #817)" (it failed before).
- **Docs:** design note `13-travel-and-news.md` ("Fallen kingdoms"). No save version: only the view changes.

## Readings taken

1. **The view rewrites the word back, rather than the engine keeping two facts.** One fact, as the engine keeps it;
   each court reads it as far as its news goes, as the `fallen` list does. Principle: information moves in physical
   time.

## Questions for the owner

Questions for the owner: none.
