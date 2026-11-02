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
(and a shadow's), none taken in the games kept:

1. A file seat or file character that times out logs `no reply in <reply file> after N minutes`, the reply file's
   **absolute local path** (`src/llm/src/node/file-exchange.ts`, `resolve(folder)`).
2. A provider's error: Anthropic's message is logged, and where its body has no message the SDK's whole text, which
   carries the **request id**; its rate-limit messages can name the **organisation's id**; an OpenAI-compatible provider's
   whole body is logged when it has no message, and OpenAI's own 401 echoes a **masked key** (`sk-proj-****Ab1x`).
3. The local bridge's errors name its **address**, which may carry a token, and repeat whatever it answered.

Keys never reach the log: the web app holds them in memory and the batch runner in environment variables, and no call
or header field is built from them. The header holds labels and model choices only; prompts are built from the game.

## What was built

- `src/game/src/sensitive.ts`: `withoutSensitive`, each sensitive piece replaced by a marker that says what stood there
  (`[key]`, `[address]`, `[id]`, `[e-mail]`, `[path]`, `[device]`), the rest of the message kept. `GameLog` reads every
  call's system text, prompt, reply and error and every shadow's error through it as they are logged and as an old log
  is read back, and the header's labels, jobs and note as it is written: nothing sensitive is in the log, so none is in
  a saved game, a batch log or any export. Run over the four fixtures (about 14 MB of prompts and replies), it changes
  nothing: no false hits.
- `src/game/src/export.ts`: `exportJsonl(log, parts)`, one export, everything by default; parts `calls`, `shadows`,
  `audits` and `humanWords`. Without human words, his decisions' word fields are blanked to the same length (`▒`,
  spaces kept) and every quote of them, in any record: a span from a word's start matching the start of one of his
  texts or sentences for 12 letters or more, however soon it is cut off (a short text only whole); orders, ids and
  names are never blanked.
- The web app: "Export log" in the menu opens four boxes, all ticked (`src/web/src/components/ExportLog.tsx`); the
  worker builds the export with `exportJsonl`.
- `src/game/test/export.test.ts`: ten leaks as providers, the bridge and the file system write them, none left in the
  log, a log read back, or any export; an old file's leak cleaned on reading; each filter leaves its part out and the
  default equals the log; a game with two human seats exported without their words, none of them left (quotes in a
  model's prompt included), each a blank of its length, and the export replays to the same game.

## The export, field by field

In `docs/design/50-the-export.md` ("What it holds").

## Readings taken

1. **The log itself is cleaned, not only the export** (Pillar: one fact, one place; "never in any export"). Saved games
   and the batch runner's logs are exports in all but name: the fixtures came from them. Cleaning as a call is logged
   covers every path at once, and costs one pass per call. The viewer's error line now shows `[path]` where it showed
   a path. Alternative: clean only `exportJsonl`'s output, leaving saved games and batch logs as they are.
2. **"Thinking whenever a model thinks"**: no call asks a model to think in this build, so there is nothing to keep; the
   change that turns thinking on adds its text to the call. A field kept empty until then would be a stopgap. Notes,
   plans, ledger and standing orders are in every call's reply, which the export keeps whole.
3. **"Names he typed"**: the only names a human types are realm names he claims (`claimName`), which the engine reads,
   so they are orders and never blanked. His words are the free-text fields listed in the note.
4. **Quotes of a human's words elsewhere** are found by their start (a whole text's or a sentence's), so a quote cut
   short or with a name put in by the scribe is still caught; a model's paraphrase is the model's words and stays.
5. **Old logs with no authors** (before item 6c) cannot tell a human's decisions; the filter blanks only decisions
   marked human.

## Overlap with other lanes

`src/llm` (the limiter lane's) changes in three lines: each provider registers its key with the scrubber as it is
made (`anthropic.ts`, `compatible.ts`), and a file seat's timeout names only its reply file, not the folder
(`src/llm/src/node/file-exchange.ts`); the log cleans what the other sources write. `src/web/src/pages/Play.tsx` changes one line (the menu's export button).

## Helpers

None: one pass of reading and building.
