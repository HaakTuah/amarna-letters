# A governor of his own court's people (bug #765, side lane, 7 November 2026)

Found by the slop audit's reader of the cast's biographies (#764). `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **A post of 1346 whose holder's name the sources lost** (a governor, or one of Pharaoh's open residents) goes to one
  of the free people of its court's name style, as before; where none is left, a man is made for the post in that
  style, an ordinary person standing at its court, as the larger pool's are (`ownMan` in `openingLoyalties`,
  `rules/factory.ts`), never a stranger of another people. On seed 3, Urim's governor for Babylon was Yapa-ilu of
  Hazzatu and Samuha's for Hatti Shagarakti of Nippur; both are now of their own courts.
- The scribes' naming (a court's style, or the nearest court's; a name nobody has yet) is shared with it: `styleOf`,
  `freeName`.
- **Tests:** `src/engine/test/who-they-are.test.ts`, "Every governor of 1346 whose name the sources lost is a man of his
  own court's people" (twelve seeds; it failed before), and the pool's count, which now allows for those made.
- **Docs:** design note `47-whom-a-province-obeys.md`. **Save version 74** (the opening changes).

## Readings taken

1. **A man made for the post, rather than a bigger pool.** The issue offers both; making one only where the pool runs
   short changes no other seed's draws and keeps the pool's size (item 10's "about 60", now 100) where it was set.
   Principle: one fact, one place; build nothing outside the item.

## Questions for the owner

Questions for the owner: none.
