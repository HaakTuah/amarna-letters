## Models

- **Presets**: Free (all script, no key), Budget (every role on Haiku 5.5, no rung above the characters), Counsel
  (item 6c: Haiku 5.5 plays every king and character, Sonnet 5.5 above them plans each king's year, gives counsel and
  takes what is passed up; Sonnet narrator since item 7a, Haakon's answer to item 6c's review, Haiku before), Standard (the design document's table: Sonnet 5.5 kings and narrator, Haiku
  5.5 envoys, with Haiku as the kings' small rung and Sonnet above the envoys) and Showcase (Opus 5.5 kings and
  narrator, Haiku 5.5 envoys, the same rungs as Standard). Any seat can be set separately, envoys can be Sonnet 5.5,
  and the narrator any of the three; the other rungs are under "Who decides" below.
- **Models are settings** ("Built to outlive its models"; fix pass after the conversion, 27 October 2026). Each job (every
  king's seat, the characters, the narrator) names any model: an Anthropic model by its id (`claude-sonnet-5-5`, or a
  model released after the last update), or `<provider>:<model>` for a provider the table sets up
  (`SeatChoices.providers`: an id and an OpenAI-compatible endpoint, such as another provider's API or a local model's,
  `http://localhost:11434/v1`). "Haiku", "Sonnet" and "Opus" are only the presets' shorthands for the 5.5 models. The start
  page's "Other model…" and the batch runner's `--leaders MODEL`, `--provider ID=URL` set them. Keys are held per
  provider, in memory (the Anthropic key also in session storage when the player asks; the batch runner reads
  `ANTHROPIC_API_KEY` and `<ID>_API_KEY`); a local endpoint needs none. A saved game reads its seats back from the log
  header's labels ("local:llama3.1 leader"); a continued game needs its other providers set up again, since the header
  keeps no endpoints. **Prices** are settings too (`PriceTable`): defaults for the three 5.5 models, and any model's price
  set on the start page or with `--price MODEL=IN,OUT,CACHE`. A model with no price shows its cost as unknown, never as
  free (item 6c): the estimate reads "unknown (no price for …)", the meter "$X + unknown" once such a model was called
  (`ModelCall.unpriced`, `GameLog.costUnknown`), and a game with a spending limit does not start until every model it uses
  has a price (`startProblem`; the web app always has one, the pause at $…, and so has the batch runner, `--budget`); a
  local model the table prices at 0 is free. Kings think at a chosen effort (medium by default; host audiences run
  one level lower); characters run at low effort.
- **Cost estimates** (`CostEstimate`) come from average token counts per call, as item 6b measured them (`src/batch/src/measure.ts`):
  a king that sleeps gives orders in about three seasons in ten, reading the rulebook and schema (some 16,000 tokens)
  from cache and about 4,500 fresh, with 3,000 out; it holds court in about one season in five, 14,000 from cache and
  3,500 fresh; some 15 character calls a season; the narrator's personas and chronicles. For the median game of 44
  seasons that was roughly $0.50 (Budget), $5.60 (Standard) and $10.50 (Showcase) in item 6b. Item 6c adds the ladder's
  first guesses, not yet measured: routine courts on the small rung with one in three passed up, light alerts in about a
  season in three, one decision in twenty audited, a plan once a year and twice more (some 3,000 tokens fresh and 1,000
  out), the small rung that plays a king passing one decision in five up, and one character call in seven going up.
  The spending cap defaults to one and a half times the estimate.
- **One mind per seat** (the owner's principle, 18 October 2026; since item 6c, "The seat's model commits; a cheaper
  model handles what is light"): the seat's own model makes every commitment; since item 6c a small rung answers
  routine audiences and light alerts in the king's name, playing him from his record, and everything it says is in his
  record as his own (see "Who decides" below). Before item 6c the seat's own model made every decision: what the king
  answers, whether it reopens its orders, what it orders. A seat played by one model in one call and a weaker one in the next is
  not one mind, and the weaker call is the one that gets exploited. So the king's summary of older
  seasons and its ledger of dealings are written in its own replies, by its own model. Known
  exceptions: the script king that stands in when a call fails (below, and "When a model call
  fails" under sleeping seats), and the server-side refusal fallback, under which another model
  answers a refused Sonnet or Opus call (logged as `usedFallback`). A host's audience runs on the
  seat's own model, one effort level lower, including an audience held while its orders stand,
  where it also sends letters and decides whether to reopen its orders (Part H). Not exceptions, but close to the line: a king's envoys
  are characters with minds of their own (script, Haiku or Sonnet), so what a host hears is the
  envoy's rendering of the king's message, and an envoy may commit its king at a foreign court
  (`commitments`, logged in the message trail); that is the character's decision, by design. The
  trail keeps the promise among its outcomes, marked "the envoy committed: …"
  (`CommittedPrefix`), but nobody reads it as an outcome: the host's record of the
  audience gives it a line of its own after the outcomes ("Mane promised on behalf of Egypt:
  "…""), and the envoy's report request keeps it out of "What happened" and gives it as the
  envoy's own ("What you yourself promised on your lord's behalf, in your own words at the audience
  (your promise, not anything the king did or sealed): "…""). (Until the fix pass after item 4 both
  listed it among the outcomes, and in the second agent simulation an envoy read his own "the tablet
  sealed exactly as written" as a sealing that never happened.)
- **One source for model schemas** (fix pass after the conversion). The reply schemas are defined once, in Zod
  (`Replies` in `src/llm/src/schemas.ts`); the JSON sent is derived from them (`jsonSchema`, `Schemas`), and every reply,
  a model's or a file seat's, is validated against them (`problems`). They stay small: every field required (the model
  writes the default instead of leaving one out), every object closed, one flat shape per reply with a field naming an
  order's type, and provinces, units and people as plain strings the engine checks. No call is strict: the schema goes
  as the one tool a model answers with (`reply`, `tool_choice` auto, since Opus and Sonnet 5.5 refuse a forced tool),
  so no grammar is compiled, and the first live game's "The compiled grammar is too large" cannot recur; `CallSpec.strict`
  is there for a call where a malformed reply would do real harm, and none does today, since every reply is validated and a
  script stands in. A reply that does not fit is sent back once with its errors ("Your previous reply could not be used:
  …"); the first call's log line says why (`error`) and the second is `attempt` 2; a second unfit reply, a refusal or an
  API error falls back to the script, logged as a fallback with its reason. A model that writes its JSON as text instead
  of calling the tool is read too. Orders then face the same validator as any seat.
- **The check at setup**: before a game starts (the web app, and the batch runner before its first model game), each
  model in use has its provider take the largest schema of each of its jobs (`checkJobs`: orders and the fullest audience
  reply for a king; present, react, report, pitch and a text reply for characters; a text reply for the narrator; every
  other variant only leaves fields out of these). For Anthropic it is a token count with the reply tool, which costs
  nothing; for a compatible endpoint, its model list must name the model (such endpoints document no schema limits). A
  failure stops the game before it starts and names the model and the provider's reason. A test measures every schema
  variant against Anthropic's documented limits (20 strict tools, 24 optional parameters, 16 union-type parameters;
  `AnthropicLimits`, `measure`) with no key and no spending.
- **Who wrote it, and fallbacks never silent** ("Who wrote it" under Spectator mode). Every decision in the log carries its
  author (`Decision.by`: model, script, human, file, or fallback with the seat it stood in for and the reason), kept on
  replay and in a continued game. Each season counts how many decisions models and file seats were asked for and how
  many fell back (`seasonFallbacks`), shown aloud on the game page in god view or a spectator's game; the table sets a
  share past which the game pauses ("Pause when more than …% of a season's model calls fall back", 50% by default, 0 never
  pauses), so a broken call cannot quietly turn a model game into a script game. The message trail shows its four parts
  (what the king wrote, what the envoy said abroad, what the host answered, what the envoy reported home), each with its
  author, and filters by author or kind of author.
- **Requests are rules too** (a builder rule, decided 20 October 2026; applied in the fix pass after item 4, whose report
  has the field-by-field audit under "Additions: requests are rules too"). Models read their requests literally, so every
  field is a nudge: no field may imply something that is not true. Each request asks only what applies, shows no internal
  id or number a king or character could repeat, and keeps the engine's outcomes apart from a character's own words.
  Fields that need an answer (a yes or no, an amount) are in a schema only when the question applies; a list that may be
  left empty (letters, orders, tablets to show) is an offer, not a question, and stays. Besides the cases item 4 found
  (part 2 of the fix pass), the audit changed, for characters:
  - an envoy is asked whether to swap an inventory only if its hand can fake a seal (see Swapped inventories);
  - an envoy that took the host's gift at an earlier exchange is not asked about another, which would not be given: "He
    offers you another gift of 20 shekels, but an envoy takes one gift at an audience and you have taken his already, so
    it will not be given." (`EnvoyContext.giftTaken`, as the engine counts the gift);
  - gold a host names for the envoy's lord is "handed to you when the audience ends, if his treasury can pay it" (and "you
    go home to your lord", when a post is offered too), not "He sends …", and a detained envoy is not told of it, since it
    takes none home;
  - an envoy that was never received (its host's kingdom had fallen) reads "you were never received there: you came back
    without an audience", not "You told its king: """; one dismissed while away reports to the king who sent it, "who is
    no longer your lord", and its schema says the same: `report` is "Your report to the king who sent you on this
    mission." (`Schemas.report`'s `toLord`; until the follow-up's review the schema still said "Your report to your
    lord."), and its own promise was made "on his behalf", not "on your lord's behalf";
  - a spy's request gives the season it observed as the season it is, and its facts, secret master, lord, wage, purse and
    back pay as they were then (see Spies, under Characters);
  - a character's request names its lord's land once ("You serve the king of Mitanni", "Karduniash (Babylonia)"), where it
    read "Mitanni (Mitanni)";
  - an envoy remembers its own report ("I reported to my lord: "…""), without the court's note on the weighing that the
    king's news adds after it ("[The inventory lists …; your weighers found …]"), which it once remembered as its own words;
  - a file request's heading is no longer the call's key (see File seats);
  - Alashiya's king, whose title names his land, is "the King of Alashiya", not "the King of Alashiya of Alashiya"
    (`LlmCharacterMind.kingOf`, `courtOf`).

  And for kings:
  - a host is asked `seal_tablet` only while a tablet the envoy brought waits for his seal (not when the envoy brought none,
    nor after he chose to seal it at an earlier exchange, when the audience says "You chose at an earlier exchange to seal
    the tablet …, and your seal is set on it when the audience ends"; `AudienceView.proposalSealed`); `gift_to_envoy` and
    `gift_request` only until the envoy has accepted a gift; `end_audience` only before the last exchange ("This is the last
    exchange of the audience: it ends with your answer"); and `reopen_orders` only until he has chosen to reopen
    (`AudienceAsks`). What he was not asked he does not choose, even if a file seat's reply carries the field;
  - `detain_envoy` has a description at last, and the purities and `sworn_alliance` say when they are not asked of a
    letter or a reply ("(100 when you send none)", "Only with a tablet to seal (false without one)"): fields inside a list
    item cannot come and go per item, so their descriptions carry it;
  - no request says any more that an envoy that woke the king "waits to be received": at a second audience the first envoy
    had been received, and the season's audiences come before orders. An audience reads "an envoy of Hatti came to your
    court", an orders request "an envoy of Hatti came to your court (you received him before these orders)"
    (`sleepLine`, `came`; the reason the engine keeps is unchanged);
  - the orders request's closing line names only what applies (`ordersLine`; see Pacing, standing orders): its
    troops, its envoys and letters, with sleep on the orders for later seasons, and standing orders when it has troops
    or sleeps (every king may give them since the owner's additions to the fix pass after item 4);
  - lots of gold carry marks for the king's orders, which the scribes write as the gold, as copies of tablets do (see
    Naming tablets, under Communication);
  - the event a court logs when its examination finds a forgery names the tablet as that court does, not by the engine's
    id ("Egypt found that tablet t12 is forged"): a narrator's chronicle reads the events a court knew;
  - the rulebook's WHAT YOU SEE says that a note in square brackets after a report or a pitch ("[The inventory lists …]",
    "[With this report came copies …]", "[Mane asks 20 shekels a season.]") is the court's own record, not the words of
    the envoy, spy or candidate, so the engine's outcomes and a character's words stay apart in the king's news too.
- **Server-side refusal fallback** (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`)
  is on for Sonnet and Opus calls. Haiku has no server fallback; a refused Haiku call falls back
  to the script character.
- **Prompt caching**: the leader rulebook, map, opening positions and customs primer form one
  byte-stable system block marked for caching, shared across seats and seasons; per-seat identity and the season's
  situation come after it. The reply schema goes as the request's one tool, and a provider's cached prefix begins with
  the tools, so a schema that changes from call to call is a prefix of its own: since item 6b the court's schema is the
  same at every court of a game (two variants: with the king's orders standing or not), where the audience schema,
  which asked only what applied to the exchange, made five or so prefixes a game (measured: 5.2 a game, at most 9,
  before; 2.0 after). The orders schema was already one per game.
- **Providers** (`Provider` in `src/llm/src/client.ts`): one small interface, with each provider's adapter handling its own
  format for system prompts and structured replies. Anthropic (`AnthropicProvider`) goes through the official TypeScript
  SDK (`SdkTransport`, `@anthropic-ai/sdk`) in the browser, the batch runner and the tests alike, with the
  `anthropic-dangerous-direct-browser-access` header; the simulated API stands in for it (and, with "Simulate the API",
  for every provider). Other providers and local models go through `CompatibleProvider` (chat completions, the schema as a
  JSON-schema response format, the shared and seat system texts as one system message). The C# build's transport went with that build (kept on
  the branch `archive/csharp-final`).
- **Prompt-injection boundaries**: a character's prompt holds only its own persona, memory and
  facts (tested); text never changes state; the narrator receives only released facts.
- **Call size** (item 6b; "Call size matters as much as call count", "Output is the other half"). Measured by
  `src/batch/src/measure.ts` (`node --experimental-strip-types src/batch/src/measure.ts --games 20 --seed 1`, with
  `--per-audience` for the old one-audience calls and `--dump DIR` for sample requests): script games in which every
  king is shadowed by a model king, its request for the same view built and split into parts, its record written with
  realistic notes, summary and ledger. Built: the last season's notes in full and the two before folded to their first
  400 characters (`LeaderJournal.fold`); a tablet read in full at earlier orders shown by its first 120 characters
  (`LeaderJournal.tabletsRead`), and at a court only the tablets bearing an envoy's court's seal in full; a letter
  still away in full only at the next orders after it was sent (then its opening words), and in full again when its
  report comes; battle reports without the units that held (`withoutHolds`); the explanations repeated in every view's
  headings moved to the rulebook's cached part (WHAT YOU SEE, "Your view, part by part"); one call per court
  (`LlmLeaderSeat.holdCourt`, below) with a schema stable enough to cache. Not built: a "since you last acted" view of
  the map, which the king has no earlier copy of in its request to read changes against (the digest of slept seasons
  is the part that grows with sleep, and it is shortened); terser tables of people (their contract terms stay in the
  engine's words). The numbers are in the item's report (`docs/rounds/2026-10-27-call-size.md`).
- **One call per wake-up** (item 6b): a model or file king answers every envoy at its court in one call
  (`ISeat.holdCourt`, `t<N>/court/<Power>/<round>`): one call for the first exchange of every audience, one for the
  second of those still open (an audience has at most two). Its reply has one answer per envoy, by his id
  (`answers`), and the court's letters, its choice about its orders, its ledger lines and standing answers once. Each
  answer is still logged under its own audience's key (`t<N>/aud/<id>/host/<round>`), so replays, authorship and the
  message trail read as before; an envoy the reply leaves out is answered by the stand-in, alone. Script and human
  seats answer each audience in turn, as before, so script games are unchanged. The orders call stays its own
  ("Reopening orders still runs the orders call").
- **Phrasing calls** (item 6b): a standing answer's words are a model's, worded by the king's small rung since item 6c
  (else the characters' model, else the king's own: `phrasingModel`), from the
  answer's clauses and the king's identity, without its record (`LlmLeaderSeat.phraseCall`, at most 600 tokens out).
  A file seat, or a call that fails, has the clauses read out as they are (`plainWords`); a failed phrasing call is
  noted in the runner's errors but is not a fallback, since the answer itself was the king's.
- **The output side** (item 6b): each job's cap on output is in one table (`OutputCaps`: orders 16,000; a court 6,000
  and 2,000 more for each further envoy; character calls 4,000; phrasing 600; the narrator's as before). An envoy may
  pass his lord's message on as written (`as_written`: the engine reads the letter out, "Thus says ...: "..."") and
  report the king's answer as given (`as_given`, asked only after an audience: the engine writes the king's words
  and nothing else, so nothing the envoy did there, a share kept or a gift taken, reaches his lord unless he tells it),
  writing nothing but that choice. No reply has a free-text reasoning field (audited: the king's
  notes are its memory, an envoy's commitments are its promises).
- **Leader memory** is a private record in the king's own words (`LeaderJournal`), shown in every
  orders request after its view. First comes its **ledger of dealings**, the per-court ledger of the
  design document's risk table, carried in full: "YOUR LEDGER OF DEALINGS (your own words, per
  court: what was promised, sealed, broken and paid; each line with the season you last wrote it)",
  one line per court in the fixed order of the powers ("- Egypt (turn 5): ..."), or "nothing
  written yet". The reply field `ledger`, in the orders reply and in the audience reply alike (an
  audience is where tablets are sealed and gifts given), is a list of {court, entry}: an entry (at
  most 600 characters, cut with "…") replaces that court's line, an empty entry removes it, and
  courts left out keep theirs; the ledger never leaves the record. Lines written at an audience stay
  in the seat's record and are not part of the `HostReply`, which the engine applies and the envoy's
  mind reads. Then comes the king's own summary of earlier
  seasons ("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 6): ..."), then the last three
  seasons it gave orders: its notes (the last season's in full, the two before folded to their opening words since
  item 6b), the audiences it held (what it said to whose envoy, in
  full up to the 1,500 characters an envoy hears) and its orders. Older seasons leave the record, and the request says which turn's notes leave it after
  this season ("Your notes from turn 4 leave this record after this season; keep what you need in
  your summary."). Each season's notes are kept up to 2,000 characters; longer notes are cut with
  "…", and the schema says so. The summary is a reply field (`summary`, at most 2,000 characters,
  cut the same way): it replaces the summary before, and an empty one keeps it. A king that has
  written none once notes have left reads "you have written none, and your notes from turn 4 and
  before have left this record." An audience request carries the ledger, the summary and the notes
  of the last two seasons. The rulebook's HOW TO ANSWER says how the record and the ledger work.
  Summary and ledger are parsed with the orders (`TurnSubmission.summary`, `ledger`), so they are
  logged and a replay can read them; the engine ignores them. Ledger lines written at an audience are
  in the logged model call's output only. The record lives in the seat object:
  a resumed game's model leaders start it afresh, ledger and all. It is kept only for model and file
  kings: the web app's Rules tab tells a human seat that it keeps its own. (Until the
  simulation-fixes round it held the last five seasons in full and the notes of the eight before,
  cut to 300 characters, with no summary and no ledger; the simulation's kings wrote a median of
  1,989 characters of notes a season, 107 of 134 replies over 1,500.)
- **The king's letters.** Every seat's view carries the court's own letters as its scribes wrote
  them (`SeatView.letters`, `Views.letters`, from the message trails): the latest letter of each of
  its envoys still away on that errand as far as it knows (one of its people, by what it believes,
  not at court), and every letter whose envoy's report has reached it since it last gave orders. A
  model king reads them in his orders request, after his people: "YOUR LETTERS (your record of what
  you sent, as your scribes wrote it: …): - turn 3, Mane (c7) to Babylonia, with 50 shekels (still
  away): message "…"; mandate "…"; tablet to seal "…"", and "(his report came in turn 5)" for one
  whose report has come. A letter whose envoy he knows has left his service, or died, drops out;
  one whose envoy was held drops out only when its report comes. The rulebook's HOW TO ANSWER says
  so. The record's "turn N orders" lines keep the short form ("send c7 to Babylonia with 50 shekels
  bearing a tablet to seal"), so a letter is not shown twice while its envoy is away; once the
  report has been read beside it, what matters of it is for the king's ledger and summary (item 6
  compacts older letters with the ledger of promises). Letters sent from this season's audiences,
  before they go out, are read back in full too. (Until the fix pass after item 4 a king's letters,
  mandates and tablet texts were nowhere in his requests once sent: in the second agent simulation
  six or seven kings in each game said they could not check a report against what they had sent.)
- **Audience requests** carry, besides the treasury, the count of lands and the tablets held (in full,
  each by its name with the king's mark for his copy: "Tablets you hold, in full: the tablet sealed by
  Egypt and Hatti, dated turn 1 [your copy k901]: "…""), the
  host's own land and troops ("YOUR LAND: …. YOUR TROOPS: army in memphis, …") and the season's news
  as its orders request shows it ("NEWS THIS SEASON"), so a host does not tell an envoy that a city
  is his when the news says the purchase failed. (Until the simulation-fixes round it had neither.
  Until the fix pass after item 4 the tablets there, and the king's own speeches in his record, were
  cut at 200 characters, and an envoy's promise in the host's record at 300, though the rulebook says
  the record is shown in full: six or seven kings in each game of the second agent simulation said
  so.)
- **The web app's Rules tab** shows a human seat the rulebook a model king reads, word for word,
  with a note of where a human's game differs: orders are given with the controls rather than as
  JSON, and checked units first, then the other orders in the order the human added them (not
  "units, then letters, then other orders"); and, with sleeping seats on, a human seat never sleeps,
  so the sections on sleeping and planning ahead do not apply to it.
- **The customs primer** (on by default; `--no-primer` turns it off) covers the forms of address
  and rank in the greeting ("brother" between Great Kings claims equal rank, as Assyria's king did
  when, after a modest first letter (EA 15), he began writing to the pharaoh as a brother (EA 16); one's own name above the recipient's reads as an
  insult), gifts as a measure of respect, precedent as a floor (more than was given to one's father;
  a son who breaks his father's promise, as Akhenaten did with gilded wooden statues, hands the
  argument to the other side), detained envoys and blaming the messenger, detention answering
  detention (Tushratta held Mane until his own messengers were let go), a messenger's word not being
  a tablet (Arzawa), proof needing a witness who knows (send someone who can recognise the
  princess), oaths before the gods, catastrophes as excuses, and the language of accusation:
  "Habiru" for outlaws and mercenaries, and "in league with the Habiru" as the charge of treachery.
  It is knowledge, not instructions. The Habiru are words only; there are no bandits in the engine.
  The five echoes from the design document's "Echoes from the archive" (rank, detention, words and
  tablets, witnesses, precedent) came in the simulation-fixes round, in our own wording, adding 188
  words to the primer (298 to 486).
- **Who decides** (item 6c; "Every model is the table's choice", "Minds follow what is at stake"). Every job is a ladder
  of the script, a small model and a large one, each any provider's model (`src/llm/src/ladder.ts`, `spending.ts`,
  `king-ladder.ts`). The table sets (`SeatChoices`, kept as JSON in the log header's `jobs` and read back for a continued
  game; a game saved before 6c goes on with no small rung): the kings' large rung per seat as before; their small rung
  (`small`, Haiku by default, "Off" for none; `smallFor` per seat); who plays a woken king (`plays`: his own model, or
  the small one with his own above); the characters' large rung (`charactersUp`, Sonnet by default); planning
  (`planning`, off by default); and how the game spends (`spending`). On the start page under "Customize the table",
  "Who decides"; in the batch runner `--small`, `--plays`, `--characters-up`, `--planning`, `--pace`, `--season-usd`,
  `--target`, `--audit-share`. Summaries stay with the seat's own model ("A cheaper model for condensing" waits for its
  cheap test); there is no sorting pass to set (the engine routes on what it sees).
  - **The climb** (`Ladder.climb`). A decision goes to the rung the budget buys, or, with nothing set to spend by,
    where it starts: the small rung for routine courts, light alerts and characters, the king's own model for his
    orders (unless the small one plays him). The small rung reads what it may do (`SmallNote`) and answers with two
    fields more: `pass_up` (a reason: the matter goes up whole, and nothing else of its reply is used) and
    `ask_counsel` (a brief of a few hundred words: the large rung answers the brief alone, `counselSchema`, and the
    small rung is asked again with the counsel, which joins the mind's record as its own thought). A small rung's
    orders that would commit the king go up by themselves (`ordersCommit`: a tablet to seal, a sum past the backstop,
    land or troops given, a life, a move or support into another king's land, a standing answer that seals).
  - **Routine courts** (`LlmLeaderSeat.holdCourt`). While a king's orders stand (he sleeps), or always when the small
    rung plays him, his envoys go to the small rung in one call, except those the engine passes to his own mind by
    itself, read from what he can see (`passedByEngine`: a tablet offered or shown, gold above the backstop, the
    envoy's lord's troops in or next to his land, an envoy who serves him). The small rung's answer (`routineCourt`)
    has no seal, detention, service, letters or reopening; any envoy it passes up, leaves out, or whose gifts and gold
    sent back would pass the season's backstop (a quarter of the treasury by his ledger, the standing answers'
    `AnswerGoldShare`), goes to his own model, which answers those in one call with letters and the choice about his
    orders. An audience stays with the rung that took its first exchange.
  - **Light alerts** (`readAlerts`, the runner's `alerts` phase after the wake check; `TurnEngine.lightAlerts`,
    `wakeOnWord`). News that goes "straight to the seat's own model" (a refused or failed order, a check, an assay or an
    authentication, a caught spy or a taken archive) wakes a king who has a small rung by itself, with no call. A king
    that sleeps on with only light news in his digest this season (reports home, rumours, candidates, a catastrophe to
    his fields) has it read by his small rung, in full,
    with his realm in brief and his record; it notes what it makes of it in his record and may wake him (`wake`),
    erring toward waking. Its choice is a logged decision (`t<N>/alerts/<Power>`), so a replay wakes the same kings; a
    woken king reads "word came: …" naming what came, and the season's lines leave his digest (he reads them as news).
    A failed call wakes nobody.
  - **Planning** (`LlmLeaderSeat.planIfDue`). When on, the planning model writes the king's plan at his first orders,
    once a year (three seasons), when he has lost land, his capital is newly threatened or a kingdom has fallen, and
    when he asks (`new_plan`, in his orders schema only while planning is on), from his realm in brief and his record,
    and may leave standing answers with it; the plan heads his record ("YOUR PLAN FOR THE SEASONS AHEAD").
  - **What a call is worth, and the budget** (`Spending`). Stakes are read from what the mind could see: a king's orders
    by the share of his land with foreign troops in or beside it and what woke him; a court by the gold brought against
    his treasury and tablets; characters by the gold they carry or are offered against their purse. A rung's worth is
    the stakes times how often it decides as the large rung would (first guesses: script 0.4, small 0.75, large 1; the
    audits move them kind by kind), and a decision climbs each step whose added worth per added dollar clears the going
    rate (first guess 2 per dollar), which rises by half when a season spends past its pace and falls when it spends
    under 60% of it; a free rung is always taken. Modes (`spending.mode`): off (the default: every decision where it
    starts, so each job's model decides what it did before), paced from the limit (spread over the seasons the game
    can be expected to last by the table's median and cap, `expectedSeasonsLeft`, never the drawn last season; an open
    age by its season's cost), a cost per season, or a target (the share of audited decisions that may differ in a way
    that matters; the rate falls while audits exceed it). What the budget cannot pay, the script decides where it may:
    a king's orders wait (his units hold, his schedule and standing orders run, the decision is the script's and no
    fallback, and he is asked again next season with the wait adding to its worth); a character's decision is the
    script mind's, worded by the small rung in a phrasing call where others read it; light alerts wait in the digest; a
    plan waits. Courts are never refused (see the item's report). A king's orders with foreign troops in or beside his
    capital (`Stakes.capital`, from what he sees) are always paid: they start above the script whatever the rate, and
    may spend a reserve of the limit (`reserveShare`, a tenth, a first guess) that ordinary decisions stop short of, until
    the whole limit is spent (Haakon's answer to item 6c's review, built in item 7a).
  - **Audits.** One small-rung decision in twenty (`auditShare`; a seeded draw by the call's key) is also put to the rung
    above out of play: the answer is never used, the log keeps how far the two differed and how much that weighed
    (`Audit`, `GameLog.audits`, an "audit" line), and the rates move.
  - **Nothing tells anyone; the log tells all.** No request names a rung or a model. Every routed decision's authorship
    carries its rung, the model that answered and why (`Authorship.rung`, `model`, `why`, written only when set, so
    other logs are unchanged); a decision the script took at the bottom of a ladder is the script's ("Script, for …").
    The message trail shows the rung beside the author.

