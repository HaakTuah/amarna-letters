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
- **A revocation in one province of a passage through all the land** still cuts the grant's land in place: the view
  shows a grant without its land, so the grantee reads nothing of it before the word; its event is the grantor's alone.
- **Repudiation** is unchanged (`endGrant(g, S.turn)`, known at once): it spreads past the grants into tablets, legends
  and vassal terms, so it is filed apart as bug #609.
- **Rulebook** (`llm/src/rules-authority.ts`): word of a revocation or closed roads travels; until it comes, the guest's
  court still counts on the grant. **Design notes:** 15 and 22.
- **Tests:** four twins (a grant by order, a grant revoked, a grant narrowed, a grant ended by closed roads), and an engine
  test that the grantee's notice and his view's grant (and its end) arrive in the same season (`authority.test.ts`).
- **Save version 52:** a grant's new field, and the word a grant by order now sends, change how a seed plays.

## Readings taken

1. **The grantee hears of a grant by order by a notice too,** not only by its view's list: the old event was all he had,
   and "word of it reaches his court" (the grantor's own notice) is a promise the grantee's inbox should keep. Principle:
   requests are rules too; a court learns of news by word, as of a revocation.
2. **Until word of the end comes, the grantee counts on the grant.** His troops that stay in the land after it ends take
   it, as before: the engine's rule is unchanged, only what he is shown. Principle: "Hidden information"; the fog is the
   game ("a grant is a bet on trust", the rulebook).
3. **Repudiation is left to #609.** Principle: one bug, one PR; its reach (tablets, legends, vassals) is its own work.

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay`, each run alone: before on `develop` at `042b626d`, after on this
branch at the final code. Every game replays exactly, 20 of 20, before and after, and the two logs are the same line
for line (only the run's time differs): every game lasts as many seasons, the same 20 winners, 319 kingdoms fallen, the
first fall in season 4.5 on the median, none in the first two seasons, 46 seats risen. The script kings granted nothing
by order in these games and revoked once, so the new word changes none of them. No balance was tuned. A bug fix adds no
feature, so there is no use against ignore to measure.

## Review, round 1

Codex: one P1, the save version (fixed: 52). Claude's reviewer (Opus, high): 8 of 10, one blocking, three not:

1. **Save version** (blocking): 52, with design note 15 and the save-version test.
2. **The narrowing's split did no work** (the view shows no land): the land is cut in place again, as before; filed the
   reviewer's find that a narrowed passage still reads "all your land" as bug #611.
3. **Benchmarks and review sections empty:** filled.
4. **No test that the notice and the view's grant arrive together:** an engine test of a grant by order and its
   revocation, season by season.

One idea (Opus): give `GrantView` the land it covers: filed as bug #611, since the grantor's own view is wrong today.

## Review, round 2

Codex: clean (its 👍). Claude's reviewer: 10 of 10, every round-1 point confirmed fixed, nothing open; one idea: none.

Review: rules · Claude · 8, 10; Codex · P1×1, clean

Questions for the owner: none. Filed: #609, #611 (bugs).
