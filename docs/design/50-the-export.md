## The export

One export, with filters for what goes in (Engine and models, "Logging and replay"; the owner, 2 November 2026). Built in
`src/game/src/export.ts` (`exportJsonl`) and `src/game/src/failure.ts`; the web app's menu offers it as "Export log"
(`src/web/src/components/ExportLog.tsx`). While a human plays, it is offered only when the god view is (no human seat,
"Reveal all" ticked, the game over, or his realm fallen: `Session.canSeeAll`), since it holds everything a seat must not
know (#424); the page's session asks its worker for no export otherwise.

- **What it holds, by default everything** (the log's JSON lines, `GameLog.toJsonl`), each record giving only the fields
  listed for it (`ExportFields`):
  - the header: save version, seed, the game's settings (`config`), each seat's label ("Human", "Script", "Haiku 5.5
    leader", "File seat", "Local agent"), the sleepers, the characters' and narrator's labels, the table's model choices
    (`jobs`: models by job, ladders, the spending plan) and a note;
  - every decision under its key, with who wrote it (kind, label, the ladder's rung and model and why, or a fallback's
    kind of failure) and its value: orders, notes, summaries, ledger lines, letters, speeches, answers, chronicles;
  - every model call: key, season, role, model, the system text and prompt sent, the reply in full (each model's notes,
    plans, ledger and standing orders are in it), tokens read, written and cached, cost, whether the provider fell back,
    the kind of failure if any, request size and attempt. No model is asked to think in this build, so there is no
    thinking to keep; the change that turns thinking on keeps its text in the call;
  - the shadow scripts beside model characters (what each faced, the model's choice, the script's, the kind of failure)
    and beside model kings (each side's orders or answer in brief, how far they differ, the kind of failure);
  - the audits of lower rungs' decisions.
- **Filters** leave parts out: the model calls, the shadow scripts, the audits, and a human player's words. Without his
  words, in a game with a human seat, every text is a blank of the same length, each letter a `▒` and its spaces kept
  (the same text always blanks the same, and two different texts never do: the nth text of a shape ends in its number
  written in `▒░▓█` (past what its letters can number, the rest follows a `▚`), since the game compares texts, a go-between who changed an envoy's words having bent them; and an
  answer that did not fit keeps only "did not fit: " before its blanked account, which may quote the answer):
  the word fields of every decision (`letter`, `mandate`, `notes`, `summary`, `entry`, `speech`, `bribeAsk`, `say`,
  `reply`, `text`, `custom`, `commitments`, a character's approach `words`, a turned captive's `poison`, and `unreadable` and `reason` for text the game
  could not read; a test holds every string field of the orders and answers to one side or the other), a decision whose
  whole value is a text (a chronicle, a persona), a ladder's why, every call's system text, prompt and reply, and every
  shadow's texts. Models quote and echo what they read, so nothing short of that keeps his words out. A name made up
  in an order (`NameFields`: a pitch's `name`, a traveller's `goAs`, a realm a king claims) becomes a stand-in, Name-1,
  Name-2 in the order they first appear, the same name (trimmed) always the same stand-in; a real name stays: an alias
  the engine offers (`Aliases`), a fixed power's id, land, ruler or his other names (`namesOf`), or one only the game's
  state knows (`realNames`: every person's, a risen power's), in any case; the filter refuses to run without the latter
  (#427). The engine takes only a name it knows and reads any
  other as no false name (a pitch or a traveller gives its own, a claim is refused), so the game replays the same; where it
  echoes a made-up name in a text (a rejected claim's notice, a journey's `asName`), the replay holds the stand-in, as it
  holds a blank where it echoes words. Each record keeps
  its shape (who, when, what kind, its tokens and timings, whether the answer fitted), and orders, ids and names the
  engine reads are never blanked, so the export replays to the same game. A game with no human seat loses nothing. A
  human's words are not sensitive: a normal export keeps them, since he wrote them in play.
- **What is sensitive is never a filter and never in any export, and it is kept out by design, never scrubbed after the
  fact** (there is always another way to spell a secret):
  - nothing sensitive is recorded: a failure is logged as its kind and code (`failureOf`: "timed out", "unreachable",
    "refused (401)", "rate limited (429)", "overloaded (529)", "provider error (500)", "rejected (400)", "refused by the
    model", "cut off", "did not fit" with the schema's own account of what did not, or "failed"), never the message a
    provider, the bridge or the file system gave, which may carry a key, an address, an account, organisation or request
    id, or a local path. The player's own list of what failed in his game (the runner's `errors`, shown in the app) keeps
    the message; it is never logged;
  - the export gives only the listed fields of each record, so a field the log gains stays out until it is listed (a
    test holds every field of the log's schemas to the list or to a named "left out");
  - a log written before failures were kinds may hold raw messages: the export gives any failure that is not wholly a
    kind (a kind, a kind and a three-figure code, or "did not fit: " and its account) as "failed";
  - keys never reach the log: the web app holds them in memory and the batch runner in environment variables, and no
    call or header field is built from them.
- **The canary test** (another lane, #421) plants secrets in a small game, exports it under every filter, decodes it and
  finds none; it calls `exportJsonl(log, parts)` from `@amarna/game`. Without human words, the realm a human made up
  and claimed is a stand-in and the export still replays; and while a human seat has no god view, the page asks for no
  export.
