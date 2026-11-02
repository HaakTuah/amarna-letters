# What a game's export holds: audit and one export with filters

Side lane, 2 November 2026. PR #385. Design: Engine and models, "Logging and replay"; the note is
`docs/design/50-the-export.md`.

## The owner's words

> And queue a job going fully over what the export function includes, and ensuring it doesn't include anything
> sensitive, at all. If it does, it must all be fixed, and we must be alerted, so we can remove this file.

(2 November 2026; with the export's filters as the design's "Logging and replay" quotes him.)

## What was found

**No file in `tests/fixtures/` holds anything sensitive.** All four logs there were read in full, every line, for keys
(Anthropic, OpenAI, Google, bearer tokens, a key named as one), any URL, request and organisation ids (`req_…`,
`request_id`, `org-…`, UUIDs), e-mail addresses, local paths (Unix, home, Windows) and browser or device strings:

| File | Lines | Found |
| --- | --- | --- |
| `model-games/haiku-two-seasons-seed-407184.jsonl` | 923 | nothing (156 errors read "…exceeded your organization's limit…", with no id) |
| `replays/first-simulation-sleep-on-seed-7.jsonl` | 457 | nothing |
| `replays/second-simulation-seed-15.jsonl` | 701 | nothing |
| `replays/second-simulation-seed-7.jsonl` | 760 | nothing |

**The code could have written sensitive things, and now cannot.** Three routes, all through a failed call's `error`
(and a shadow's, and a fallback decision's reason), none taken in the games kept:

1. A file seat or file character that times out logged `no reply in <reply file> after N minutes`, the reply file's
   **absolute local path** (`src/llm/src/node/file-exchange.ts`, `resolve(folder)`).
2. A provider's error: Anthropic's message was logged, and where its body has no message the SDK's whole text, which
   carries the **request id**; its rate-limit messages can name the **organisation's id**; an OpenAI-compatible provider's
   whole body was logged when it has no message, and OpenAI's own 401 echoes a **masked key**.
3. The local bridge's errors name its **address**, which may carry a token, and repeat whatever it answered.

Keys never reach the log: the web app holds them in memory and the batch runner in environment variables, and no call
or header field is built from them. The header holds labels and model choices only; prompts are built from the game.

## What was built

The first build scrubbed: it replaced each sensitive piece it could recognise as a log line was written. Each of
Codex's review rounds then found another way to spell a secret (escapes, other alphabets, JSON inside an error, keys
of any shape), which is the lesson the design copy took (#422, "kept out by design, never scrubbed"). The build now
follows it, and the scrubber is gone:

- `src/game/src/failure.ts`: `failureOf`, a failure's kind and code ("timed out", "rate limited (429)", "refused by
  the model", "did not fit: …", "failed"), read from what the error is (its status, its own kind), never from what it
  says. The model client, the file and bridge exchanges, the character minds' shadows and the runner's fallbacks log
  only that. The player's own list of failures in the app keeps the message; it is never logged.
- `src/game/src/export.ts`: `exportJsonl(log, parts)`, one export built from the fields listed for each record
  (`ExportFields`); a failure from an older log that is not a kind is given as "failed". Parts `calls`, `shadows`,
  `audits` and `humanWords`. Without human words, in a game with a human seat, every text is blanked to the same length
  (`▒`, spaces kept): the word fields of every decision, chronicles, a ladder's why, every call's texts and every
  shadow's; orders, ids and names never, so it replays. A game with no human seat loses nothing.
- The web app: "Export log" in the menu opens four boxes, all ticked (`src/web/src/components/ExportLog.tsx`); the
  worker builds the export with `exportJsonl`.
- `src/game/test/export.test.ts`: failures logged as kinds, whatever their message; a failed exchange's secrets in no
  export; an old log's raw messages given as "failed"; every field of the log's schemas listed or knowingly left out;
  each filter; every string of the orders held to words or orders; a game with human seats exported without their
  words, every text blank, every record the same shape, replaying to the same game; a game with none losing nothing.

## The export, field by field

In `docs/design/50-the-export.md` ("What it holds").

## Readings taken

1. **The player's own failure list keeps the message** (the runner's `errors`, shown in the app while he plays): it is
   his own machine's account to him, never logged, and he needs it to fix a key or a folder. Alternative: show him only
   the kind too.
2. **"Thinking whenever a model thinks"**: no call asks a model to think in this build, so there is nothing to keep; the
   change that turns thinking on adds its text to the call. A field kept empty until then would be a stopgap. Notes,
   plans, ledger and standing orders are in every call's reply, which the export keeps whole.
3. **"Names he typed"**: the only names a human types are realm names he claims (`claimName`), which the engine reads,
   so they are orders and never blanked. His words are the free-text fields listed in the note.
4. **"did not fit" keeps the schema's own account** of what did not ("did not fit: letters[0].to"): it is the game's
   text about the reply's shape, not a provider's message, and it is what a reader needs to see why a model failed.
5. **A game with a human seat** is one whose header names a seat "Human" or whose log marks a decision human; the
   filter blanks every text of such a game and nothing of any other.
6. **Hidden information** (`AGENTS.md`, "Review guidelines"): the export is the whole game's record for whoever runs the
   game, the log replays are built from, never shown to a seat; so it holds the true game state by design. Whether
   "Export log" should wait for "Reveal all" while a human plays is the open question #424 (reading taken there:
   nothing changes); the button and the worker's `export` stay easy to gate.

## Questions for the owner

- [#424](https://github.com/HaakTuah/amarna-letters/issues/424): should "Export log" wait for "Reveal all" while a human plays? (open; the reading taken: nothing changes)
- [#427](https://github.com/HaakTuah/amarna-letters/issues/427): should the human-words filter also blank names a model character invents (a pitch's `name`, `goAs`), at the cost of exact replay? (open; the reading taken: orders are never blanked)
- [#422](https://github.com/HaakTuah/amarna-letters/pull/422) (merged): the design this export is built to, secrets kept out by design.
- [#421](https://github.com/HaakTuah/amarna-letters/pull/421): the canary lane, which calls `exportJsonl(log, parts)`.

## Overlap with other lanes

`src/llm` (the limiter lane's) changes in a few lines, each logging a failure's kind: `client.ts`, `exchange.ts`,
`character-mind.ts`, `bridge.ts` and `node/file-exchange.ts` (its own errors say their kind). `src/web/src/pages/Play.tsx` changes one line (the menu's export button).

## Helpers

One: Claude's reviewer (Opus, high) on the rebuilt export, which scored it 7 and found a character's approach `words`
not blanked, a blank collision for many tiny texts, an unchecked failure kind, this section missing and two import
nits; all fixed, the decision schemas the runner records now all held to words or orders by the test.
