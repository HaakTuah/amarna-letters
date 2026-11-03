# A grant and its end reach the other court by word (bug #565, side lane, 3 November 2026)

PR #606. Issue #565: a grant of passage or basing given by order logged its event with the grantee as a party, so his
court saw it at once, while the grant itself reached his view only when a messenger could have brought it; a
revocation's event did the same while its word travelled. The twin canary (`src/web/test/twin-canary.test.ts`) now plays
four twins for it, each failing on `develop` and passing here.

## Step 0

`turn/authority.ts` (16 KB), `model/authority.ts`, `rules/views.ts` (47 KB) and the twin canary are under the 50 KB mark;
`resolve.ts` is not changed.

## What changed

- **A grant by order** (`grantByOrder`): its event is the grantor's alone, and word of it travels to the grantee's court
  (`word`, news `Grant`, the notice "Passage and basing"), arriving the season his view shows it (`heardTurn`). Before,
  he had only the event, a season or more early, and no notice at all.
- **A revocation** (`revokeGrants`) and **closed roads** (`endGrants`): the event is the grantor's alone; the grant ends
  at once for the engine, as before, and for the grantee's view only when the word of it arrives (`Grant.endHeard`,
  `grantStandsFor`), with the revocation's notice or the closed roads'.
- **A revocation in one province of a passage through all the land** ends that grant and leaves a new one over the rest,
  which the grantee's view takes up with the same word (`heardTurn`); its grantor sees the narrowed grant at once.
  Before, the grant's land was cut in place, so the grantee's view would have changed at once had it shown the land.
- **Repudiation** is unchanged (`endGrant(g, S.turn)`, known at once): it spreads past the grants into tablets, legends
  and vassal terms, so it is filed apart as bug #609.
- **Rulebook** (`llm/src/rules-authority.ts`): word of a revocation or closed roads travels; until it comes, the guest's
  court still counts on the grant. **Design notes:** 15 and 22.
- **Tests:** four twins (a grant by order, a grant revoked, a grant narrowed, a grant ended by closed roads), and an engine
  test of the narrowing (`authority.test.ts`).

## Readings taken

1. **The grantee hears of a grant by order by a notice too,** not only by its view's list: the old event was all he had,
   and "word of it reaches his court" (the grantor's own notice) is a promise the grantee's inbox should keep. Principle:
   requests are rules too; a court learns of news by word, as of a revocation.
2. **Until word of the end comes, the grantee counts on the grant.** His troops that stay in the land after it ends take
   it, as before: the engine's rule is unchanged, only what he is shown. Principle: "Hidden information"; the fog is the
   game ("a grant is a bet on trust", the rulebook).
3. **Repudiation is left to #609.** Principle: one bug, one PR; its reach (tablets, legends, vassals) is its own work.

## Benchmarks

(below, at the final code)

## Review

(below)

Questions for the owner: none.
