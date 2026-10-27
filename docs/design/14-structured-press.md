## Structured press (item 8)

Build order item 8: "Two press modes", "Recognition is earned", gold sent without an inventory, characters as agents in
local play, and a screen for a human seat's standing answers. The report is `docs/rounds/2026-10-27-structured-press.md`.

### Clauses

- **Every letter carries its formulas as clauses** (`model/clauses.ts`, `rules/clauses.ts`), as the Amarna letters set
  theirs out. A clause is a kind and only the fields its kind uses: a king (`power`), a province, a move's end (`to`), a
  turn, an amount of gold, and for an answer the kind it answers. The kinds:
  - courtesies and gifts: `wellWishes`, `gift`;
  - proposals: `peace`, `noAttack`, `alliance`, `against` (a king), `support` (a move from a province into a bordering one,
    in a turn to come), `tribute`, `cede`;
  - requests: `askGold`, `askSupport`, `askWithdraw`, `askCede`, `askTribute`, `askHelp` (a besieged city and its
    besieger), `askOath`;
  - threats: `threat` (a province, or the recipient's land);
  - grievances and accusations: `grievance`, `brokenOath`, `lightGift`, `envoyLied` ("your messenger lied"), `habiru`
    ("in league with the Habiru");
  - news: `newsTroops`, `newsStrength` (few or many), `newsTaken`, `newsSiege`;
  - answers: `accept`, `refuse`, `counter` (naming what it offers instead).
- **Templates.** `renderClause` gives each clause its words, the same whoever writes it ("Send me 50 shekels of gold.";
  "In the third season of year 2, my troops will support the move of your troops from Byblos into Sidon."). A season is
  named by the year every court counts alike, not by a court's own season names. `clauseTag` gives the short form the
  model prompts list ("askGold (gold 50)").
- **Checks** (`checkClauses`): an unknown kind, a clause missing what its kind needs, a move between provinces that do not
  border each other, a season gone by, a stand together against the writer or the recipient, more than 8 clauses
  (`MaxClauses`): the clause is left out and the writer gets a notice ("Clauses left out", with the reasons). Every field a
  clause's kind does not use is cleared (`ClauseFields`), so that no field carries words of its own between kings (found
  by the review: a `peace` clause's unused province reached the host as free text). Clauses oblige nobody, as tablets do
  not.
- **Where they go.** A dispatch carries the letter's clauses and its tablet's (`DispatchOrder.clauses`,
  `TabletProposal.clauses`); the tablet keeps them (`Tablet.clauses`, shown in `TabletView.clauses`); the envoy recites
  them (`PresentResult.clauses`, the host's `AudienceView.clauses`); the host answers in clauses (`HostReply.clauses`, and
  in structured press `bribeClauses`, news only, for what a bribed envoy is to tell his lord); the envoy reports the
  answer home (`MindReply.clauses`, on the report's notice as `InboxItem.clauses`). The record of a mission keeps the
  clauses written, recited and reported (`MessageTrail.clauses`, `deliveredClauses`, `reportClauses`) and each
  exchange's (`Exchange.clauses`). Forgeries are set out in clauses too (`ForgeOrder.clauses`), checked as their first sealer would write them to the
  second; in structured press a forgery none of whose clauses stand is not made, and its fee is not paid.

### The two press modes

- **`GameConfig.pressMode`**: `"full"` (the default, for model games) or `"structured"`. Structured press is required
  whenever the characters are script, so every table that starts a game sets it from its character layer (`pressFor` in
  `runner.ts`, called by the web app, the batch runner, the measure and the parity worker); the log keeps it in the
  config, so a replay keeps its press. Script games are therefore in structured press; a game with model or local agent
  characters is in full press.
- **Full press.** Kings write words, and clauses beside them. Where the words and the clauses differ each reader goes by
  what he reads: script kings read only clauses. A letter, tablet or forgery given in clauses alone is written out in their
  words.
- **Structured press.** The letter, the tablet, the forgery and the host's answer are their clauses in the templates'
  words; the model schemas ask no free words for them (no `message`, `tablet_to_seal` or `speech`; `gift_news` in place
  of `gift_request`), and the web app hides those fields. A standing answer speaks in clauses what it decided, in either press (a courtesy, thanks for gold, the tablet sealed or
  not), and in structured press no phrasing call is made. The small rung's routine court asks in the game's press. The mandate stays the king's own words to his envoy (a reading: see the report).

### Envoys

- **Script envoys** (`ScriptMind`): reciting the letter (`recite`), the timid and the fond leave out a threat (its
  demand stays, as a request) and add a courtesy if there is none; the careless (competence below 35) lose the last of
  three or more clauses; one that kept gold states the gift as what is left; the ambitious (65 or more) and the fond add a
  courtesy. Reporting the answer (`reportClauses`): the faithful (loyalty 60, competence 50, not bought by the host) word
  for word; the bought and the timid leave out the host's threats; the bought report a refusal as acceptance and pass on
  the host's news as what they saw; the careless lose the last clause. One that kept gold leaves out the host's complaint
  that the gold weighed light. In structured press the envoy's speech and report are these clauses' words.
- **Model envoys** recite the clauses as written and report the answer in clauses as given; they bend only their words
  (a reading: see the report).

### What script kings write

- **Every letter in clauses**, beside the words they wrote before: peace (`peace`, and `gift`), alliance (`alliance`),
  coalition (`against`, and `newsTroops` of the foe's troops seen nearest the recipient), lull (`wellWishes`, `noAttack`,
  `newsStrength` few), grievance (`brokenOath` or `grievance` naming where his troops stand in our land, `askWithdraw`
  from it, `askGold` 50, and `threat` where the letter threatens), plea (`askHelp`, and `against` the besieger for a
  friend not yet sworn), gift (`wellWishes`, `gift`), tribute (`tribute`, `gift`). Their tablets carry `peace`,
  `alliance` or `against`; their forgeries `against`. The frozen baseline writes the same kinds, as far as the rules
  require.
- **Two new missions.** *Accuse* (score 0.5 + 0.2 × vengeance): a king whose weighers found a sender's gold light tells
  him once, within four seasons, "Your messenger has lied to me" with the shortfall (`envoyLied`, `lightGift`).
  *Support* (0.45 + 0.2 × diplomacy): where a sworn partner leads a joint blow our troops can support (`Tactics.joints`),
  we promise our support for the season after next (`support`), at most once in four seasons to each partner, and keep
  it (below).
- **Gold without an inventory** (`bare`): only by an envoy who has earned it, one who told us he refused a host's post, or
  who carried our gold out twice with no word that it weighed light; never to the war target.
- **Greetings** ("Recognition is earned"): a king with pride above 0.6 withholds "brother" and "Great King" from a king
  whose claim is still new and whom he counts his vassal, unless they are friends. It replaces the named rule by which
  Babylonia snubbed Assyria, and gives the same greetings at the start.

### What script kings read

- **Tablets** by their clauses (`againstIn`, `givesAwayIn`): one with clauses gives something away only if it asks for
  gold, tribute, land or a withdrawal; one in words alone is read as before.
- **Letters** (`answerLetter`, at the audience): `askGold`, from a friend, up to a quarter of what is spare above 100
  (sent home with the envoy; a counter if less than asked), refused otherwise; `askTribute`, `askCede` refused;
  `askWithdraw` accepted only where none of our troops stand; `askHelp` remembered as a plea (it was read from words only
  before) and accepted where we would fight the besieger; `askSupport` accepted for a friend's move against a king we
  would fight, into a province one of our troops can reach, within four seasons, and promised; `askOath` accepted from a
  friend; a promise of `support` counted on; `tribute`, `cede` accepted; `noAttack` a little trust; `threat` a grudge;
  `grievance`, `brokenOath` from a king we never wronged a little less trust; `envoyLied` lets go the envoy we last sent
  him; `habiru` less trust in the king named; news remembered (troops seen where we cannot see; a conquest or a siege
  raises the king's menace). Each proposal and request is answered once (`accept`, `refuse`, `counter`); a tablet's
  sealing is answered too; gold received is thanked (`accept` gift) or complained of (`lightGift`); `askOath` is asked of
  an envoy whose oath-tablet was sealed; a friend hears `wellWishes`, a hostile king `grievance`. A bribe asks the envoy to
  pass on `newsStrength` of the host.
- **Proposals in words** (`peace`, `alliance`, `against` in a letter with no tablet) are answered too: peace accepted
  from a king we bear no grudge, alliance and a common foe from a friend. A word given back binds nobody.
- **Reports** (`readReport`, by the court the reporting envoy was sent to, as we sent him): a refusal of what we asked costs the host a little trust, an acceptance gains it; a
  complaint of light gold marks our envoy a thief; a threat is a grudge; news is heard as above.
- **Supports kept.** In the season named, a promised support becomes an `assist` in the plan where a free troop can give
  it, and a support promised to us makes the move an `attack` worth taking. A support given that keeps a promise made in a
  letter's clauses, or a request accepted at the supporter's own court, is an event (`support-kept`).
- **Measuring** (`ClausePlay`, `InventoryPlay`): `--no-clause-play` and `--clause-play-half` (half the kings, alternating
  by seed) turn off acting on what they read; `--no-inventory-play` keeps every gold with its inventory.

### Gold without an inventory

- **The inventory costs the scribe's fee** (`GameConfig.inventoryFee`, 20, the tablet's fee). A dispatch may send its
  gold without one (`DispatchOrder.noInventory`, `no_inventory` in the schema, "no inventory" in the web app): the fee is
  saved, no inventory reaches the host's archive, the host sees "The gold came with no inventory; your weighers found …"
  and the lot is stated as weighed, so no shortfall can show. The orders are checked for the fee as the engine charges it. Without an inventory nothing can be swapped. A script envoy
  is tempted at loyalty below 70 instead of 60 when nobody can check. Gold a host sends back keeps its inventory, free, as
  before (a reading).

### Recognition is earned

- **Starting data** (`StartClaims` in `model/recognition.ts`): Assyria's claim to the rank is new, and Babylonia holds
  Assyria its vassal. The opening positions say so ("Its claim to be a Great King is new: Babylonia holds Assyria to be
  its vassal."), in the rulebook and wherever they are shown.
- **The record** (`GameState.recognition`, `recordGreeting`): for each pair of kings, since when the one has called the
  other brother and granted him the title in the greetings he sent, reset by a greeting that withholds it; a greeting
  in the king's own words records nothing; no greeting withholds both.
- **Established** (`recognise`, each season): once more than half of the other living Great Kings have called the
  claimant brother for `recognitionSeasons` (9, three years) without a greeting since that withheld it. Every court gets
  "A claim is established", and the event `claim-established`. Recognition changes no rule and no score.
- **The view**: `SeatView.claims` and `SeatView.greetings` (what this court called others and they it); the model's view
  has a RANK line, and the rulebook says how a claim becomes established.

### Characters as agents in local play

- **The bridge keeps a seed's characters** (`node sim/bridge.js --seed S`, after `node sim/setup.js --seeds S`): it
  serves them by id beside the kings, writes their requests into their folders with the characters' footer ("Decide as
  yourself"), and `wait.js --play` watches them, and the isolation checks take `--seed S` beside `--kings` so that the seed's character
  agents take the test before any game (docs/PLAY-PROMPT.md). The web app offers "Local agents (Claude Code)" for envoys, spies and
  candidates on this computer only; starting checks that the bridge keeps this game's seed's characters (ids differ from
  seed to seed). Characters the bridge keeps no folder for are scripts. The game is then in full press. A saved game reads
  "Local agent characters" back.
- **They sleep as kings do**: a character is asked only for a decision of its own (presenting a letter, each answer at an
  audience, its report, a pitch, a spy's report, a memory summary), so its calls follow events. The batch report counts
  them for every game (`GameRunner.characterAsks`): calls and wake-ups a season, and per character a season, from which
  item 18 sets the pool's default size ("How many characters").

### A human seat's standing answers

- **Standing answers** (`StandingAnswersPanel` in the web app's orders): a human seat sets and cancels them as a model king
  does, saving clicks, not strength: whose envoys, bringing what (words only, gold above an amount, a tablet, anything),
  whether to seal, what share of his gold to send back, and in full press the gist of what to say. An envoy an answer
  covers is received without stopping the game for the player.
- **The audience** shows the clauses the envoy recited, a tablet's clauses and gold without an inventory, and takes the
  answer in clauses (`ClauseEditor`); in structured press it asks for nothing else in words.

### First guesses (item 18 tunes them)

- `GameConfig.inventoryFee` 20; `recognitionSeasons` 9; `MaxClauses` 8; a script grievance asks 50 shekels; a script
  envoy tempted at loyalty below 70 when the gold has no inventory; a script king gives up to a quarter of its spare gold
  above 100 to a friend who asks; support promised two seasons ahead and looked at four ahead; the accuse and support
  missions' scores; two clean trips before gold goes without an inventory; Ṣumur's yield 15 and Lukka's 15.
