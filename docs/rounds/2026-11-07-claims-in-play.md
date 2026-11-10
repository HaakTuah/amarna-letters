# A claim to the rank made in play (bug #777, bugs lane, 7 November 2026)

Found by the design check of #774, as older than that item. `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **A claim enters the record** ("Recognition is earned"): a king outside the seven whose greeting, in the formula, names
  him Great King claims the rank. The first such greeting adds his claim to `GameState.claims`, new and with no overlord
  (`recordGreeting` in `turn/press.ts`). Before, only the claims the game starts with (Assyria's) were ever recorded, so a
  city's king called brother by every Great King for years never rose in rank.
- **Known where it is read** (pillar 4): `Claim.heardBy` holds the claimant's own court and each court that has read a
  greeting of his naming him Great King at an audience (`rankHeard`, called where the host reads the sender's claimed
  name). A seat view's `claims` shows only the claims its court knows of, and not who else knows them. A claim the game
  starts with, or one established (which every court is told of), is known to all (`heardBy` null).
- **Established by the same test as Assyria's**, and once established the claimant counts among the Great Kings whose
  greetings establish others' claims (`ofTheRank`), from the next season: the rank is read once at the season's start,
  so two claims settled in one season never depend on which is settled first (Codex's review).
- **Tests:** `src/engine/test/press.test.ts`, "A king outside the seven who names himself Great King makes a claim, known
  where his greeting is read (bug #777)", on a small world, with two claims established in one season.
- **Docs:** design note `14-structured-press.md` ("Recognition is earned"); the rulebook (`src/llm/src/rules.ts`).
  **Save version 76** (a new rule, and `Claim` gains a field).

## Readings taken

1. **The claim is made by the greeting's "Great King" for himself,** the field every seat already sets
   (`claimGreatKing`; "claim Great King yourself" in the web app, `claim_great_king` for models), not by a new order:
   the period claimed rank in the greeting, as Assyria's letters did (EA 16). Principle: no menus; period first.
2. **A claim made in play has no overlord.** Vassalage is words on tablets no rule reads ("Vassalage is words"), so
   which king holds the claimant his vassal is for each court to say in its greetings, not for the record. Principle:
   physics, not politics.
3. **An established claimant is of the rank,** so his greetings count toward later claims, as the seven's do. The
   design document: a power that rises "is treated as an equal" ("Different data, same rules"). Principle: different
   data, same rules.
4. **Script rulers outside the seven keep their custom** and do not claim the rank (`greet` in
   `statecraft-letters.ts`, since item 11+): rank changes no rule and no score, so there is nothing for use against
   ignore to measure, and when a script city should claim it is a matter of stakes the engine fix does not settle. A
   human or model in a city's seat can claim it now. Principle: build nothing outside the item.

## Questions for the owner

Questions for the owner: none.
