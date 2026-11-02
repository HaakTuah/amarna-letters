## The export

One export, with filters for what goes in (Engine and models, "Logging and replay"; Haakon, 2 November 2026). Built in
`src/game/src/export.ts` (`exportJsonl`) and `src/game/src/sensitive.ts`; the web app's menu offers it as "Export log"
(`src/web/src/components/ExportLog.tsx`).

- **What it holds, by default everything** (the log's JSON lines, `GameLog.toJsonl`):
  - the header: save version, seed, the game's settings (`config`), each seat's label ("Human", "Script", "Haiku 5.5
    leader", "File seat", "Local agent"), the sleepers, the characters' and narrator's labels, the table's model choices
    (`jobs`: models by job, ladders, the spending plan) and a note;
  - every decision under its key, with who wrote it (kind, label, the ladder's rung and model and why, or a fallback's
    reason) and its value: orders, notes, summaries, ledger lines, letters, speeches, answers, chronicles;
  - every model call: key, season, role, model, the system text and prompt sent, the reply in full (each model's notes,
    plans, ledger and standing orders are in it), tokens read, written and cached, cost, whether the provider fell back,
    the error if any, request size and attempt. No model is asked to think in this build, so there is no thinking to
    keep; the change that turns thinking on keeps its text in the call;
  - the shadow scripts beside model characters (what each faced, the model's choice, the script's, the error);
  - the audits of lower rungs' decisions.
- **Filters** leave parts out: the model calls, the shadow scripts, the audits, and a human player's words. Without
  his words, every word field of a human's decisions (`letter`, `mandate`, `notes`, `summary`, `entry`, `speech`,
  `bribeAsk`, `say`, `reply`, `text`, `custom`, `commitments`, a turned captive's `poison`, and `unreadable` and `reason`
  for text the game could not read; a test holds every string field of his orders and answers to one side or the other) becomes a blank of the same length, each letter a `▒`
  and its spaces kept, and every quote of them is blanked wherever it stands: in a
  model's prompt, a character's report, the narrator's chronicle (a decision whose whole value is a text). A quote is any span, from a word's start, that
  matches the start of one of his texts or of one of its sentences for twelve letters or more, however soon it is cut
  off (a prompt's brief of a letter keeps its first 120 letters); a text shorter than that counts only whole. Each is also looked for as it stands inside a JSON string, since a
  model's reply is JSON. Orders, ids and names the engine reads are never
  blanked, so the export replays to the same game, his words blanked in it too (`src/game/test/export.test.ts`). A
  human's words are not sensitive: a normal export keeps them, since he wrote them in play.
- **What is sensitive is never a filter and never in the log.** It reaches the log only through what a provider, the
  bridge or the file system says when a call fails (a file seat's timeout names its reply file's full path; a
  provider's error can carry a request id, the organisation's id or a masked key). Every call's texts and every
  shadow's error, and a fallback decision's reason (its failed call's error again), are read through
  `withoutSensitive` as they are logged, and as an old log is read back, and the
  header's labels, jobs and note as it is written; each piece becomes a marker that says what stood there: `[key]`
  (keys, masked or not, bearer tokens, a key named as one), `[address]` (any URL: a provider's or the bridge's may carry
  a token), `[id]` (request and organisation ids, any UUID), `[e-mail]`, `[path]` (absolute paths in any alphabet; one under a drive, a share or a home folder to the end of its
  line, since a folder's name may hold spaces),
  `[device]` (a browser's or device's description). The rest of the message stays, so the log still says what failed.
  Keys themselves never reach the log: they live in memory in the web app and in environment variables in the batch
  runner, and nothing writes them into a call.
