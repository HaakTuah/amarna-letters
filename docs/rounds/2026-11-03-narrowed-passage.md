# A passage narrowed by a revocation reads its land (bug #611, side lane, 3 November 2026)

PR #623, built on #619 (bug #609), which changes the same grant code. Issue #611: a passage through all of a king's land,
revoked in one province, was cut in place (`Grant.lands`), but the seat view's grant (`GrantView`) carried no land, so
both courts still read "passage through all the land", the grantor's own Court included.

## Step 0

Every file changed is under the 50 KB mark (`rules/views.ts` 47 KB, `llm/src/prompts.ts` 33 KB, the rest smaller).

## What changed

- **The view** (`model/authority.ts`, `rules/views.ts`): `GrantView.cut`, the provinces a passage through all the
  land was revoked in, as the court has heard (`Grant.cut`). Never the land itself: it is the grantor's true holdings
  when it was given, which neither court may read whole (round 1).
- **The narrowing** (`turn/authority.ts`, `revokeGrants`): the grant ends and a new one stands over the rest, in the
  old one's place in the list (so passage read before basing stays so, round 1). The grantor's view shows it at once;
  the grantee's shows the old one until the word of the revocation comes (`Grant.endHeard`) and the new one from then
  (`Grant.heardTurn`, which the view now reads for every grant, not only those by order). Narrowed to no land, it opens
  nothing but stands as the courts know it (round 2). A grant its grantee repudiated already (#609) is only narrowed as its grantor reads it.
- **A repudiation after a narrowing** (`repudiate`): the repudiating grantee knows at once that the old grant ended too,
  though the word of the narrowing has not come (round 1).
- **The lines a king reads** (`grantPlace`): the Court (`web/src/ui/format.ts`) and the model's PASSAGE AND BASING
  (`llm/src/prompts.ts`): "Egypt's troops may pass through all your land but Nesa", "Your troops may pass through all
  his land but Nesa, by leave of Hatti". Before, "all your land" after the revocation too.
- **The script kings** (`game/src/bots/freedom.ts`, `authority.ts`): a passage through all the land opens every
  province of its grantor's but those it was revoked in (`grantOpens`), so a king no longer counts on a revoked one.
- **Design note:** 15. **Save version 56:** `Grant.cut`, and a narrowing now makes a new grant, which takes an id.
- **Tests** (`authority.test.ts`): the narrowing season by season, its line by name, a second narrowing, one to nothing,
  passage before basing kept in order, a grant narrowed to no land; a tablet's grant narrowed and then repudiated by its grantee before the word,
  and narrowed again by its grantor; the twin "a grant narrowed by a revocation" holds.

## Readings taken

1. **"All your land but Nesa", not the provinces covered.** The land a passage through all covers is what its grantor
   held when he gave it; naming it would tell both courts his true holdings then, including far land lost out of his
   sight. What was revoked, both learn by word. Principle: "Hidden information". Land won since the grant is still not
   covered, as before (design note 15), and the line does not say so: left as it stood.
2. **A narrowing is a new grant.** Its grantee learns of it as of any grant, by word; the grant he knew stands in his
   view until then. Principle: "Hidden information".

## Review, round 2

Claude's reviewer: 10 of 10, every round-1 point confirmed fixed, nothing open; one idea: none. Codex: one P1, new:
revoking the last province of a grant whose true land lacked a far province lost out of sight ended it in full, which
told the grantor of the loss (the grant vanished where, had he kept the province, it would stay). Fixed: a grant
narrowed to no land opens nothing but stands, read by what was revoked; its test.

## Review, round 3

Claude's reviewer: 9 of 10, one blocking: revoking the passage in a province its grantor lost out of sight before the
grant was refused (the order check and the narrowing read the true land), which told him of the loss. Fixed: both read
what he knows (a province he knows as his, not revoked already); its test, which fails with the old check.

## Benchmarks

To come.

## Review, round 1

Codex: three P1s. Claude's reviewer (Opus, high): 6 of 10, two blocking, four not.

1. **The land in the view told the grantor's true holdings** (Codex P1; Opus, blocking): the view carries the
   provinces revoked instead (`cut`), the engine's own check unchanged.
2. **A grantee repudiating after a narrowing still saw the old grant** (Codex P1; Opus, blocking): `repudiate` tells
   him at once; a test.
3. **Narrowing moved passage behind basing** (Codex P1): the new grant takes the old one's place; a test.
4. **Narrowed to nothing read "at none"** (Opus, not blocking): the "none" is gone with the list (round 2 keeps such a
   grant, read by what was revoked).
5. **Untested cases** (not blocking): a second narrowing, one to nothing, a repudiated grant narrowed, the order of
   repudiation and word, a tablet's grant still shown: tested. The expected line is a literal.
6. **`bidden` and the revoke check repeat `grantOpens`** (not blocking): no longer, since `grantOpens` reads a view
   (`cut`) and those read the engine's grant (`lands`), as `grantCovers` does.
7. **"Hatti's land … by leave of Hatti"** (not blocking): "his land".

One idea (Opus): none.

Questions for the owner: none.
