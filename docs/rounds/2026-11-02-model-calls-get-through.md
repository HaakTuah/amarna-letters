# Model calls that get through (side lane, 2 November 2026)

Branch `lane/model-calls-get-through`, PR #386. The design: Engine and models, "Calls that get through, live or in the
background" (`docs/intent/engine-and-models/architecture-seats-engine-characters-narrator.md`). As built:
`docs/design/04-models.md`, "Calls that get through" and "Cost estimates".

Haakon's words (2 November 2026; archived word for word in `docs/archive/instructions.md`, items 134 and 136), after his Haiku game of
1 November: "Pretty expensive now if the first 2 round was representative. A little over Half a dollar for those 2
seasons, and not all of the api calls got through ... Probably should spread them out then? And have it work in the
background while you do your stuff?", then, to the design session's findings: "Yes, please, expertly to both!"

No model games and no real API calls were made. Everything was checked against a stand-in service
(`src/game/test/stand-in-service.ts`) that refuses calls past a limit on calls in flight, writes a cache copy for every
call that arrives before the first write lands, answers batches late, lets caches lapse, and is checked against the slips
of the Haiku game (`tests/fixtures/model-games/`).

## What was built

| Fault in the Haiku game | Built | Checked by (`src/game/test/calls-get-through.test.ts`) |
| --- | --- | --- |
| 57 of season 1's 104 decisions fell back on 429s (190 refused calls in the game) | `CallLimiter` per provider (`src/llm/src/limiter.ts`): a limit on calls in flight from 4, halved once per crowd on a 429, growing by about one a round to 32; a refused, overloaded or unreachable call waits as `retry-after` asks (else 2 s doubling to 60 s) and is sent again, each send logged, for up to ten minutes before the script stands in. The SDK's own retries are off, so the limiter learns from every refusal. | 104 calls at once against a limit of 6: all 104 answered, peak in flight within the limit, under 20 refusals; 529s sent again after the asked wait; a 400 not sent again; patience ends within ten minutes |
| 25 copies of one 70,600-token cache written in season 1 | `CacheGate` (`cache-gate.ts`): calls sharing an opening (model, reply tool, shared system block) wait while the first writes the cache; an opening found lapsed is written to last an hour from then on; one too short to cache is never waited on | 25 kings: 1 write, 24 reads; a lapsed opening's second write asks `ttl: "1h"` |
| 26 answers refused for slips | `readAsMeant` (`reading.ts`) before the schema check, in the client and the file exchange; `problems` now says what was given and what was asked; the reply line says a field that does not apply may be left out | every one of the 26 slips in the fixture fails before and passes after; the retry note's wording |
| Every call live | Background mode: `BatchTransport` and `SdkBatchService` (`background.ts`), batches kept in IndexedDB (`savedBatches`), "Play in the background" on the start page, carried when a game is continued | 25 kings in the background: 2 batches (the opening alone, then 24), 1 cache write, 0 refusals, half the live price; a game stopped while its batch was out collects the answer when opened again, with no second batch |
| An estimate from 16,000-token openings | `CostEstimate.perSeason(choices, background)` from the recorded token counts; the setup shows a season's cost both ways | the estimate figures below |

The fallback rate with its reasons was already shown (`FallbackNotice`, the viewer's side panel); refusals the limiter
sends again are logged as calls with their reason, so the log still shows every 429.

## What a season costs

**Replayed from the recorded game** (Haiku in every seat; prices as `DefaultPrices` hold them; every decision answered,
each opening's cache written once, the average recorded call of each kind for the calls that fell back):

| Season | As played | Live, built now | In the background |
| --- | --- | --- | --- |
| 1 (47 orders, 57 character calls) | $0.32, with 57 decisions lost | $0.16 | $0.08 |
| 2 (27 orders, 12 courts, 31 life, 60 envoy and 8 other calls) | $0.18 | $0.145 | $0.08 |

So an early season of an all-Haiku table costs about $0.15 live and $0.08 in the background, against $0.32 and $0.18
paid (and season 1's half lost).

**The estimate for a long game** (`CostEstimate.perSeason`; kings sleep as item 6b measured, so fewer calls than an
early season, but the presets' Sonnet rungs and characters going up add to it):

| Table | A season live | In the background | 80 seasons live | In the background |
| --- | --- | --- | --- | --- |
| Budget (Haiku) | $0.12 | $0.06 | about $9 | about $5 |
| Counsel | $1.41 | $0.87 | about $115 | about $70 |
| Standard | $1.34 | $0.78 | about $110 | about $65 |
| Showcase | $2.20 | $1.31 | about $180 | about $105 |

These are about twice the old figures, which assumed a 16,000-token rulebook; the kings' opening is 70,600 tokens now.
The README's table gives the new ones.

## Readings taken

1. **The limiter's numbers** (start 4, most 32, halving once per crowd, patience ten minutes, waits 2 s to 60 s) are
   first guesses: "Balance: first guesses during the build". The account's limit is unknown, so it is learned.
2. **The cache gate's key is the cache's real prefix**: model, reply tool and shared system block, since Anthropic's
   cached prefix begins with the tools. Two calls with the same rules but different schemas share no cache, so they do
   not wait for each other.
3. **"A longer-lived cache where seasons are far apart"** is read as: an opening whose five-minute cache lapsed before
   it was next used is written to last an hour from then on (twice the input price for the write); in the background
   always, since batch answers come minutes apart. No setting: the game learns it from its own pace.
4. **The gate holds in the background too** (one batch for each opening's first call, then the rest): "The cache is
   written once" names no exception, and a batch writing 25 copies at half price still costs more than one write and an
   extra wait.
5. **A field left out is read as its blank**: empty text, no choice, an empty list, 0 and false, each the schema's own
   "none" ("Requests are rules too"). The schema sent still lists every field as required, so providers' limits and the
   schema tests are unchanged; only the reply line says a field that does not apply may be left out.
6. **Names in any spelling shown** are matched by case and accents, then by a unique start of four letters or more
   ("babylon" for Babylonia). No list of alternative names was built: the engine's names vary by court (claimed names,
   houses), and the start rule mends the recorded slip without guessing between two options ("Hatt" is left for the
   retry when both Hatti and Hattusa are options). Free text is never changed, except that a quoted blank (`""`) is blank.
7. **Leaked tool markup** in a choice (`\n<parameter name="go_as">`, one recorded slip) is stripped before matching, in
   choices only.
8. **The background mode is a table setting, not in the log**: "the models and the record are the same either way", so
   the header does not record it and the export lane's records are untouched. A continued game takes the box from the
   start page, like providers and prices; continued without it, the game plays on live and sends again what it waited on.
9. **Other providers stay live in the background mode**: only Anthropic's batch service is built; an OpenAI-compatible
   batch API differs per provider.
10. **The batch runner (`scripts/sim.sh`) gets no background flag**: it plays no model games until the build order is
    done, and live and background give the same record.
11. **The estimate keeps item 6b's measured wake rates** (kings give orders in three seasons in ten) and takes the
    recorded game's call sizes and character call counts. The recorded game's first two seasons had more kings awake,
    so the replayed figures above are for early seasons and the estimate is for a long game.

## Design questions

None that the design leaves open.

## Script play and benchmarks

The lane changes only the model layer: script kings and characters make no calls, and no rule changed. The script
regression run is recorded in the PR.

## Helpers

None: the parts depended on each other through the client, and each was small.
