# A passage narrowed by a revocation reads its land (bug #611, side lane, 3 November 2026)

PR #623, built on #619 (bug #609), which changes the same grant code. Issue #611: a passage through all of a king's land,
revoked in one province, was cut in place (`Grant.lands`), but the seat view's grant (`GrantView`) carried no land, so
both courts still read "passage through all the land", the grantor's own Court included.

## Step 0

Every file changed is under the 50 KB mark (`rules/views.ts` 47 KB, `llm/src/prompts.ts` 33 KB, the rest smaller).

## What changed

- **The view** (`model/authority.ts`, `rules/views.ts`): `GrantView.lands`, the provinces a passage through all the
  land covers, as the court knows them; empty for a grant in one province.
- **The narrowing** (`turn/authority.ts`, `revokeGrants`): the grant ends and a new one stands over the rest. The
  grantor's view shows the new one at once; the grantee's shows the old one until the word of the revocation comes
  (`Grant.endHeard`) and the new one from then (`Grant.heardTurn`, which the view now reads for every grant, not only
  those by order). A grant its grantee ended already by repudiation (#609) is only narrowed as its grantor reads it.
- **The lines a king reads** (`grantPlace`): the Court (`web/src/ui/format.ts`) and the model's PASSAGE AND BASING
  (`llm/src/prompts.ts`) name the provinces: "Egypt's troops may pass through your land at Nesa, Tuwanuwa and Hattusa".
  Before, "all your land", which was not true after a revocation, nor of land won since the grant.
- **The script kings** (`game/src/bots/freedom.ts`, `authority.ts`): a passage through all the land opens only the
  provinces it lists (`grantOpens`, which the engine's `grantCovers` uses too), so a king no longer counts on passage
  in a province revoked or won since.
- **Design note:** 15. **Save version 56:** a narrowing now makes a new grant, which takes an id.
- **Tests:** an engine test of the narrowing, the grantor's land at once and the grantee's with the word
  (`authority.test.ts`); the twin "a grant narrowed by a revocation" still holds with the land in the view.

## Readings taken

1. **The land is named, never "all your land".** A passage through all the land covers the land held when it was given;
   land won since is not in it, so "all" was not true even before a revocation. Principle: requests are rules too; no
   field may imply something that is not true.
2. **A narrowing is a new grant.** Its grantee learns of it as of any grant, by word; the grant he knew stands in his
   view until then. Principle: "Hidden information".

## Benchmarks

To come.

## Review

To come.

Questions for the owner: none.
