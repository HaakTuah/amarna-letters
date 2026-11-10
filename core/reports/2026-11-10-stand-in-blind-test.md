# The stand-in's blind test (10 November 2026)

The stand-in (`modules/inbox.md`) predicted the owner's answers to his last 20 answered questions in each game, reading
each game only as it stood before the question was asked; Opus and Fable each did both games. Four questions were left
out because their answers were visible to the predictors. A separate Opus session scored the predictions against what he
decided. What changed in the core from it: the stand-in runs on Opus only; only a highly sure answer stands alone (92%
right in the test), the rest also go to the owner; and it reads the design's decided sections first, since two of its
misses were settled there.


Scored: Amarna Letters 19 questions (464 left out), Barkstreet Snakes 17 (447, 536, 569 left out); no other prediction was marked leaked. Match = 1, partial = 0.5, miss = 0.

## 1. Score

| Game | Model | Match | Partial | Miss | Match rate |
| --- | --- | --- | --- | --- | --- |
| Amarna Letters | Opus | 10 | 3 | 6 | 61% |
| Amarna Letters | Fable | 10 | 5 | 4 | 66% |
| Barkstreet Snakes | Opus | 11 | 5 | 1 | 79% |
| Barkstreet Snakes | Fable | 11 | 5 | 1 | 79% |
| Both | Opus | 21 | 8 | 7 | 69% |
| Both | Fable | 21 | 10 | 5 | 72% |

How some cases were scored:
- **Snakes #563:** scored on the fix alone; his answer on the UI suite in CI is not recorded.
- **Partials:** mostly a right main choice that misses something he added himself: Portal-style blue and orange portals (Snakes #592), islands that stay only when attached to an edge (#611), one hunger clock for the whole round (#616), contracts paid part up front and part after (Amarna #587). Others got one part wrong: Codex keeps reviewing meanwhile (Snakes #528), every realm follows the realms' name setting (Amarna #768), only "hire a carrier" (Amarna #836).

## 2. Calibration

Match rate by the model's stated confidence:

| Confidence | Opus | Fable |
| --- | --- | --- |
| High | 92% (13) | 86% (11) |
| Medium | 65% (17) | 68% (20) |
| Low | 33% (6) | 60% (5) |

"Send to owner" flag:
- **On misses:** Opus 6 of 7 (all but Amarna #492). Fable 5 of 5.
- **On misses and partials:** Opus 12 of 15. Fable 14 of 15.
- **On matches (sent when it need not have been):** Opus 6 of 21. Fable 12 of 21.

Opus flagged 18 of 36, Fable 26. Opus's confidence and flag track its errors; Fable says "yes" to almost everything, so its flag tells little.

## 3. Every miss

The last part of each line says what the predictor could not have known.

**Amarna Letters**
- **#492: what water five besieged cities drink (how long each holds a siege).** Opus: change two, keep three as built, marked as guesses. He: an earlier guess counts for nothing; each city gets the published experts' consensus (now a standing rule). *A new idea of his; his archived "as accurate as possible" pointed that way.*
- **#587: who pays for porters and works done far off before the court hears of them.** Opus: the bill comes home with the news. He: paid only from gold already there, or by contracts paid part up front, part after. *A new idea of his (contracts); the "everything is somewhere" principle, which Fable used, was overlooked.*
- **#642: how many seconds a season takes to watch at each speed (both models).** Both: keep Normal about 12 s. The design document already set 15 / 6 / about 1 s. *The design document said it; both overlooked it.*
- **#735: "15%" or "15 in a hundred" (both models).** Both: % in the rulebook, "in a hundred" in notices. He: % everywhere, clearer. *Taste.*
- **#806: whether a captured king's court keeps giving orders in his name.** Opus: yes, the court rules on. He: a caretaker script holds the realm (standing orders, defence, no new wars); his player plays the captive. *A new idea of his; the design's "nothing at a distance unless carried", which Fable used, pointed away from Opus's answer.*
- **#832: Lukka, a kingdom with no town, falls in one battle.** Both: held only after some seasons of occupation. He: no time rule; the people fight back every season, a real obstacle that can be overcome, and the court flees to the hills. *A new idea of his; the War section's "hostility goes on as harassment" pointed there.*
- **#775 (Fable): "season" or "turn" on the screens, and gold in minas or shekels.** Fable: "season" in the text, shekels alone. He: keep both as built. *Taste; both models wrongly carried his "%" answer over to shekels.*

**Barkstreet Snakes**
- **#530 (Opus): two builder sessions on the one-stamina entry.** Opus: keep the old session. He: the earlier sessions are stopped; the new builder takes it. *A fact only he had.*
- **#577 (Fable): the rivals' near reaction, 240 ms on average or never under 240 ms.** Fable: never under 240 ms. He: keep the average, as built. *Taste.*

## 4. Is Fable better?

No, not clearly. The two models are level on Barkstreet Snakes (79% each) and Fable is 5 points ahead on Amarna Letters, which comes to about one question out of 36. Fable did better at drawing conclusions from the design's own principles (Amarna #587, #806, Snakes #530), but Opus's confidence and "send to owner" flag track its errors much better. Both models fail on the same thing: his new ideas and his taste.
