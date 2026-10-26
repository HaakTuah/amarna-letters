## Models

- **Presets**: Free (all script, no key), Budget (every role on Haiku 5.5), Standard (the design
  document's table: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys) and Showcase (Opus 5.5 kings
  and narrator, Haiku 5.5 envoys). Any seat can be set separately, envoys can be Sonnet 5.5, and the
  narrator any of the three. Kings think at a chosen effort (medium by default; host audiences run
  one level lower); characters run at low effort.
- **Cost estimates** (`CostEstimate`) come from average token counts per call: a king's orders
  read the 5,000-token rulebook from cache and add about 5,000 fresh tokens and 3,000 out; about one
  audience a season; some 15 character calls a season; the narrator's personas and chronicles.
  For 20 seasons that is roughly $0.55 (Budget), $9 (Standard) and $18 (Showcase). The spending cap
  defaults to one and a half times the estimate.
- **One mind per seat** (the owner's principle, 18 October 2026): small models may only sort or
  condense; the seat's own model makes every decision: what the king answers, whether it reopens
  its orders, what it orders. A seat played by one model in one call and a weaker one in the next is
  not one mind, and the weaker call is the one that gets exploited. So the king's summary of older
  seasons and its ledger of dealings are written in its own replies, by its own model. Known
  exceptions: the script king that stands in when a call fails (below, and "When a model call
  fails" under sleeping seats), and the server-side refusal fallback, under which another model
  answers a refused Sonnet or Opus call (logged as `UsedFallback`). A host's audience runs on the
  seat's own model, one effort level lower, including an audience held while its orders stand,
  where it also sends letters and decides whether to reopen its orders (Part H). Not exceptions, but close to the line: a king's envoys
  are characters with minds of their own (script, Haiku or Sonnet), so what a host hears is the
  envoy's rendering of the king's message, and an envoy may commit its king at a foreign court
  (`commitments`, logged in the message trail); that is the character's decision, by design. The
  trail keeps the promise among its outcomes, marked "the envoy committed: …"
  (`TurnEngine.CommittedPrefix`), but nobody reads it as an outcome: the host's record of the
  audience gives it a line of its own after the outcomes ("Mane promised on behalf of Egypt:
  "…""), and the envoy's report request keeps it out of "What happened" and gives it as the
  envoy's own ("What you yourself promised on your lord's behalf, in your own words at the audience
  (your promise, not anything the king did or sealed): "…""). (Until the fix pass after item 4 both
  listed it among the outcomes, and in the second agent simulation an envoy read his own "the tablet
  sealed exactly as written" as a sealing that never happened.)
- Every state-changing output uses structured output (a JSON schema). Orders face the same
  validator as any seat. An unreadable reply is retried once with the error; then the runner
  uses a script decision for that call and logs the failure.
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
    it will not be given." (`EnvoyContext.GiftTaken`, as the engine counts the gift);
  - gold a host names for the envoy's lord is "handed to you when the audience ends, if his treasury can pay it" (and "you
    go home to your lord", when a post is offered too), not "He sends …", and a detained envoy is not told of it, since it
    takes none home;
  - an envoy that was never received (its host's kingdom had fallen) reads "you were never received there: you came back
    without an audience", not "You told its king: """; one dismissed while away reports to the king who sent it, "who is
    no longer your lord", and its schema says the same: `report` is "Your report to the king who sent you on this
    mission." (`Schemas.Report`'s `toLord`; until the follow-up's review the schema still said "Your report to your
    lord."), and its own promise was made "on his behalf", not "on your lord's behalf";
  - a spy's request gives the season it observed as the season it is, and its facts, secret master, lord, wage, purse and
    back pay as they were then (see Spies, under Characters);
  - a character's request names its lord's land once ("You serve the king of Mitanni", "Karduniash (Babylonia)"), where it
    read "Mitanni (Mitanni)";
  - an envoy remembers its own report ("I reported to my lord: "…""), without the court's note on the weighing that the
    king's news adds after it ("[The inventory lists …; your weighers found …]"), which it once remembered as its own words;
  - a file request's heading is no longer the call's key (see File seats);
  - Alashiya's king, whose title names his land, is "the King of Alashiya", not "the King of Alashiya of Alashiya"
    (`LlmCharacterMind.KingOf`, `CourtOf`).

  And for kings:
  - a host is asked `seal_tablet` only while a tablet the envoy brought waits for his seal (not when the envoy brought none,
    nor after he chose to seal it at an earlier exchange, when the audience says "You chose at an earlier exchange to seal
    the tablet …, and your seal is set on it when the audience ends"; `AudienceView.ProposalSealed`); `gift_to_envoy` and
    `gift_request` only until the envoy has accepted a gift; `end_audience` only before the last exchange ("This is the last
    exchange of the audience: it ends with your answer"); and `reopen_orders` only until he has chosen to reopen
    (`Schemas.AudienceAsks`). What he was not asked he does not choose, even if a file seat's reply carries the field;
  - `detain_envoy` has a description at last, and the purities and `sworn_alliance` say when they are not asked of a
    letter or a reply ("(100 when you send none)", "Only with a tablet to seal (false without one)"): fields inside a list
    item cannot come and go per item, so their descriptions carry it;
  - no request says any more that an envoy that woke the king "waits to be received": at a second audience the first envoy
    had been received, and the season's audiences come before orders. An audience reads "an envoy of Hatti came to your
    court", an orders request "an envoy of Hatti came to your court (you received him before these orders)"
    (`Prompts.SleepLine`, `Prompts.Came`; the reason the engine keeps is unchanged);
  - the orders request's closing line names only what applies (`Prompts.OrdersLine`; see Pacing, standing orders): its
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
  situation come after it.
- **Transport**: the official C# SDK is used in the console runner and tests. It cannot run in the
  browser (its constructor enables HTTP decompression, which WebAssembly forbids), so the browser
  posts the same Messages API request with `HttpClient`, with the
  `anthropic-dangerous-direct-browser-access` header. The SDK path lives in a project of its own,
  `Amarna.Llm.Sdk`, which the web app does not reference, so the browser never downloads the SDK; a
  console program registers it once (`AnthropicSdk.Use()`, as the batch runner does), and a model client
  built outside the browser without it says so.
- **Prompt-injection boundaries**: a character's prompt holds only its own persona, memory and
  facts (tested); text never changes state; the narrator receives only released facts.
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
  seasons it gave orders in full: its notes, the audiences it held (what it said to whose envoy, in
  full up to the 1,500 characters an envoy hears) and its orders. Older seasons leave the record, and the request says which turn's notes leave it after
  this season ("Your notes from turn 4 leave this record after this season; keep what you need in
  your summary."). Each season's notes are kept up to 2,000 characters; longer notes are cut with
  "…", and the schema says so. The summary is a reply field (`summary`, at most 2,000 characters,
  cut the same way): it replaces the summary before, and an empty one keeps it. A king that has
  written none once notes have left reads "you have written none, and your notes from turn 4 and
  before have left this record." An audience request carries the ledger, the summary and the notes
  of the last two seasons. The rulebook's HOW TO ANSWER says how the record and the ledger work.
  Summary and ledger are parsed with the orders (`TurnSubmission.Summary`, `Ledger`), so they are
  logged and a replay can read them; the engine ignores them. Ledger lines written at an audience are
  in the logged model call's output only. The record lives in the seat object:
  a resumed game's model leaders start it afresh, ledger and all. It is kept only for model and file
  kings: the web app's Rules tab tells a human seat that it keeps its own. (Until the
  simulation-fixes round it held the last five seasons in full and the notes of the eight before,
  cut to 300 characters, with no summary and no ledger; the simulation's kings wrote a median of
  1,989 characters of notes a season, 107 of 134 replies over 1,500.)
- **The king's letters.** Every seat's view carries the court's own letters as its scribes wrote
  them (`SeatView.Letters`, `Views.Letters`, from the message trails): the latest letter of each of
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
  when he first wrote to the pharaoh as a brother; one's own name above the recipient's reads as an
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

