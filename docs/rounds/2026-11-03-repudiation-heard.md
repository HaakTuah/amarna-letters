# A repudiation reaches the tablet's other king by word (bug #609, side lane, 3 November 2026)

PR #619. Issue #609: a king who repudiated a tablet his envoy sealed told its other king at once, however far apart
their courts, and logged its event with both kings as parties; the other king's view showed the tablet repudiated, its
grants gone and its vassal bond ended in the same season. A twin canary (`src/web/test/twin-canary.test.ts`, "a tablet
repudiated") now guards it: with the word made instant it fails on the tablet and the grant; here it passes.

## Step 0

Every file changed is under the 50 KB mark (`rules/views.ts` 47 KB, `model/records.ts` 30 KB, `web/session/frames.ts`
27 KB, the rest smaller).

## What changed

- **The word** (`turn/authority.ts`, `repudiate`): the notice "A tablet repudiated" travels to the other king's court as
  any news does (`word`, news `Realm`), arriving at `Tablet.repudiatedHeard`. The event is the repudiating king's alone.
- **Who knows** (`model/records.ts`, `repudiationKnown`): the repudiating king at once; the other king from
  `repudiatedHeard`; a third court holding a copy never, as the map's vassal bonds already read it. Before, every holder's
  `TabletView.repudiatedTurn` showed it at once.
- **The grants** (`model/authority.ts`): `Grant.endedBy` names the king who ended a grant when it is not its grantor (a
  repudiation may be the grantee's), and `grantStandsFor` keeps a grant for the side that did not end it until
  `endHeard`. A revocation and closed roads read as before (`endedBy` null, the grantor).
- **Readers of the repudiation, for the other king:** the tablet view (`rules/views.ts`, also the copies an envoy shows
  and the tablet he proposes at an audience, `turn/envoys.ts`), each court's vassal bonds on the map
  (`web/session/frames.ts`), the new ruler's "state of the realm" (`rules/realm.ts`, `vassalBonds` given the court),
  and the cession of a capital (`model/cession.ts`): it is the giver's own order, so a tablet stands for it as he knows
  it, and its refusal no longer tells him of a repudiation he has not heard of. The legends stay true: they are shown in
  god view only.
- **Rulebook** (`llm/src/rules-authority.ts`): word of a repudiation goes to the other king as fast as a messenger
  rides; until it comes, he still counts on the tablet. **Design note:** 15.
- **Tests:** the engine test of repudiation now plays it season by season (the other king's tablet, grant and notice
  wait for the word, then come together), a test of a grant ended by its grantee, and the twin.
- **Save version 54:** two new fields, and the word journey a repudiation now sends.

## Readings taken

1. **A third court holding a copy is never told.** The repudiating king's word goes to the tablet's other king only, as
   before; the map's vassal bonds already read it so. Principle: "Hidden information".
2. **A capital ceded by a tablet stands as the giver knows it.** The cession is his own act ("Keeping a promise is an
   act"); a tablet its receiver repudiated, unheard of by him, does not stop it, and refusing it would tell him what he
   cannot know. Principle: "Hidden information"; the engine only checks the agreement he can see.
3. **The legends stay true.** They open in god view only. Principle: the god view is not a seat.

## Benchmarks

To come.

## Review

To come.

Questions for the owner: none.
