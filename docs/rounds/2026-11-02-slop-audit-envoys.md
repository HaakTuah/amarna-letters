# The slop audit, part 2: the script envoys' speech

Branch `lane/slop-audit-envoys`, from `develop`. The lane: "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178), its first kind's second half: what script envoys say abroad and report at
home (`src/game/src/bots/script-mind.ts`). Part 1: `docs/rounds/2026-11-02-slop-audit-letters.md` (#558).

## What changed

- **The words move to their own file**, `src/game/src/bots/envoy-words.ts`, as part 1's moved to `voices.ts`. Each line
  comes in two or three forms, chosen by the season, the envoy and the court (`pick`, no random draw). An envoy now
  addresses a city's ruler as "King of {Land}", not "Great King". An envoy swears by Shamash, witness of oaths in the rulebook, in an honest promise as well as an over-promise, so the oath marks no lie. (Court-specific gods were tried and dropped on Codex's review: the name dossiers source names, not oaths, and Akhenaten had closed Amun's temples.)
- **Rewritten in place** (rare lines nothing reads): a character's hiring pitch and a captive's answers.
- **What the kings and checks read stays the same.** `src/game/test/readings.ts` now holds the reading for both parts'
  tests, by who says a text:
  - a king's letter: warmth words, threats, an accusation, a blamed messenger;
  - a host's words, quoted in the report home: also weighing, a gift to the speaker, a seal claimed, a detention, a skim,
    an offer of service, and "agree" or "swear", which an envoy answers with its word;
  - an envoy's words: read as a report is.

  `envoy-words.test.ts` checks every form of every line against its first form, that every return names "the court of"
  its host, and that a refused post keeps the words `Brain.learn` reads. Every new form was also checked against the
  line it replaced.
- **Part 1's lines, read more widely now,** gave four forms that read differently once the report checks were added.
  Three of Alashiya's closings lacked the gift to the speaker that its first has; a host's thanks gained one ("pleases
  me"); two peace-letter forms lacked the seal its first form claims. All four now read as their first forms do.
- **Tests changed only where they asserted the old words:** `aimed-threat`, `script-envoy`, `bribed-envoy`,
  `check-wording`, `inventory-swap` and `file-character` now ask for one of the line's forms (`saysOneOf`), the same line
  whichever form was chosen. No check is loosened: `doesNotContain("true friend")` became "says none of the bribed
  line's forms".

## The review (fresh eyes, Opus at high effort; given only the text and the brief)

| Round | Score | What kept it from 10 |
| --- | --- | --- |
| 1 | 5 | "Great King" to every ruler; "my lord" in thirty lines; "carry your words" three times; "honours me" for yes and no; modern idiom ("find another voice"); every court's envoy alike; phrasings that mark a hidden state |
| 2 | 6 | The round-1 wording surviving as each line's first form; "wants"; "I am back"; "I give you my word" |
| 3 | 8 | The new god-oath only in the over-promise (a new tell); "won him over"; one shape abroad and at home; "by his own messenger" marking the lie |
| Escalation 1 | 8 | Repetition: the address in most lines, "every word" three times, "words" in every opening, "your house and his" twice; "He wishes you well"; "by his own messenger" still marking the lie; two lines too long |
| Escalation 2 | 9 | "and bring his tablet" could be untrue when no tablet travels; one line still long |
| Escalation 3 | **10** | Given by the helper once its one remaining point was fixed (the tablet claim, now "with his words") |

## Readings taken

- **The bribed envoy's invented news keeps its form** ("What I saw: At the court of {Land} I saw for myself that it is
  so…"). It mimics the engine's own observations, so that a lie reads like a sighting. It changes with the notices kind.
- **The spy report's "season of turn N" stays**: it is the game's dating token, which the interface renders as the court's
  season and year. Whether a model's request should carry it unrendered belongs to the requests kind.
- **Phrasings that mark an envoy's hidden state stay**, since they carry words the kings weigh: #591 asks the owner.

## Behaviour unchanged

The same three games (`--games 3 --seed 1 --max-turns 16`) on this branch's base (`6879232`) and its head print
identical tables (323 lines; only the timing line differs). No save version.

## Questions for the owner

- #591: should an envoy's wording give away that it was bribed, frightened or overstepped?
