# A governor of his own court's people (bug #765, side lane, 7 November 2026)

Found by the slop audit's reader of the cast's biographies (#764). `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **A post of 1346 whose holder's name the sources lost** (a governor, or one of Pharaoh's open residents) goes to one
  of the free people of its court's name style, as before; where none is left, the ordinary person who would have been
  taken (one standing at the court, not a Nubian in Pharaoh's service) is made one of its people: named and born in its
  style, his tongues those of his birthplace (`ofCourt` in `rules/factory.ts`), never a stranger of another people. The
  pool keeps its size and order. On seed 3, Urim's governor for Babylon was Yapa-ilu of Hazzatu and Samuha's for Hatti
  Shagarakti of Nippur; both are now of their own courts.
- The scribes' naming (a court's style, or the nearest court's; a name nobody has yet) is shared with it: `styleOf`,
  `freeName`.
- **Tests:** `src/engine/test/who-they-are.test.ts`, "Every governor of 1346 whose name the sources lost is a man of his
  own court's people" (twelve seeds; it failed before); the fingerprints of the opening's people
  (`starting-term.test.ts`), which this moves.
- **Docs:** design note `47-whom-a-province-obeys.md`. **Save version 75** (the opening changes; 74 on the branch until `develop` took it).

## Readings taken

1. **The man who would have been taken is made one of the court's people,** rather than the pool grown or a man added:
   only seeds that run short change, and the pool keeps its size and order (an ordinary person of the pool is drawn, not
   recorded, so his name and birthplace are the draw's to set). Principle: build nothing outside the item.

## Questions for the owner

Questions for the owner: none.
