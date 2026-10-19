# Design notes

Decisions and simplifications made while building the prototype from the design document.
Every number here lives in `GameConfig` or `MapData` and is meant to be tuned.

## Rules as implemented

- **No retreat phase.** A dislodged unit is destroyed. This keeps one order round per season.
- **Battle reports.** Next season each king reads its own orders as they resolved, and every
  foreign order whose unit stood, or moved to, a province it could see before the moves. Each of
  its own failed moves says why, from the adjudicator's own checks in their order: no convoy carried
  it; its own unit did not leave; the unit from the target was coming the other way and won (the
  reason given even when a third move then entered the province that unit left); it met another
  move into the target from a named province (always the reason given when that move took the
  target); the unit holding the target kept its place (or could not leave); the walls held; or
  another move into the target was as strong. Where strength decided it, the strengths compared
  follow ("your strength 2 against 2"). The other side's power is named only if that unit stood,
  or was moving, in a province the king could see before the moves. A support whose unit was
  destroyed reads "void: the supporting unit was destroyed", not "cut"; a cut support says where
  the attack came from. A support or convoy that matched no real order (the unit it named moved
  when it was supported holding, or did not make the move supported) reads "void" too, and its own
  king is told why ("A babylon supports durkurigalzu -> nippur: void: no unit moved from
  durkurigalzu to nippur"); other kings see only "void". (Until the simulation-fixes round,
  foreign lines were kept by the moving unit's origin only, so a move from out of sight that
  bounced a king's move was never shown, and a support that matched nothing read "holds".)
- **Sight.** A court sees troops in its own land, where its troops stand and in the provinces its
  spies watch, and one link of any kind (land, coast or sea) from those (`Views.Sight`). A province
  spy caught or let go unknown to its master still counts while the master's cover believes it at
  its post, so the capture cannot be read off the sight line before word comes. The rulebook
  and the view's sight line say so, and that troops two links away, or an army carried across the
  sea, can arrive next season unseen. (Until the simulation-fixes round they said only "in and next
  to your own lands and troops", and empty seas were read as safety.) A refusal says nothing of
  troops out of sight: an order for a unit in a province where the king has none reads "you have no
  unit in ashur" whether the province is empty or holds a foreign unit, and "the unit in ekallatum is
  not yours" only where it can see; a support or convoy naming a province out of sight is never
  refused for what stands there ("there is no unit in X to support", "there is no army in X" only in
  sight), and is void at resolution if no unit there does what it helps (the rulebook says so). The
  scheduled and standing orders a sleeping king gives are refused in the same words. (Until the
  review of the simulation-fixes round's Part D, both refusals named a foreign unit anywhere, so an
  order for any province told whether a foreign unit stood there, and the support check told whether
  an unseen province was empty.)
- **Ownership changes every season**, whenever a unit ends a season in a province, not only in
  autumn as in Diplomacy.
- **How a season resolves.** The rulebook's section of that name lists the engine's own order
  (`TurnEngine.BeginTurn`, `GameRunner.PlayTurnAsync`, `TurnEngine.ResolveSeason`) in 17 short
  steps: servants whose notice ran out leave; income, upkeep and wages (the wages of people at
  court; those of people away added to their back pay) and desertion; arrivals, then back pay paid
  to everyone at the court that owes it; the court (candidates, checks and examinations, contract
  ends and notices, a servant still owed back pay giving notice); audiences; orders;
  movement and battles; land changes hands; cessions and gifts of troops; purchases; disbanding;
  levies; envoys set out, releases, dismissals, candidates sent for and checks paid, then hiring and
  renewals; intelligence (watchmen, captors, spies sent and recalled, assays, examinations,
  forgeries, ransoms, then spies caught or reporting); catastrophes; kingdoms with no land fall;
  scores and the end roll. It says that orders are checked in the order the reply lists them
  (units, then letters, then other orders; a sleeping seat's scheduled orders after its fresh ones),
  that gold is reserved as each is accepted and there is no "else", that a person hired this season
  can be sent on an errand only from next season, what rival bids do, where a levy can stand, and
  what a spy needs. The refusals use the same words: "not enough gold: it needs 100 shekels; orders
  listed before it had reserved 100, and 50 was left" (or "…, and your treasury held 50 by your
  ledger"); "Mane was to be hired that season: a person hired enters your service only at the end of
  the season, and can be sent on an errand from the next season" (whichever order comes first); "a
  spy must be one of your own people at your court: you named nobody" (or "…: Mane is not at your
  court"); "a spy must be sent to watch a court or a province: you named neither". The hire itself
  reads, next season, "Mane entered your service at the end of last season, at 20 shekels a season,
  and can be sent on an errand now." Only a hire that can stand counts: an errand for someone whose
  hire is refused (no wage, someone in another court's service) reads "Mane is not in your service".
  A second assay of the same lot, or a second cession of the same province, in one season is
  refused ("Thebes was already ceded by an earlier order"). The parser drops no order a reply names:
  a place_spy naming neither court nor province, a move, support or convoy that leaves out where to
  go, whom to support or where to land ("name the province the unit should move to"), and a
  cession, gift of troops, spy, letter or forgery naming a power nobody knows ("there is no power
  called 'Kush'", or "name the power to cede it to"; `UnreadableOrder`) all reach the validator and
  are refused with the reason; the unit holds. (Until the simulation-fixes round the rulebook's
  "EACH SEASON" list ended with "Resolution, catastrophes, and reports", and 26 of the simulation's
  43 refusals came from rules it never stated; those malformed orders vanished without a word, and a
  forgery quietly lost any seal it could not read.)
- **Free city-states have walls** that hold with strength 1 and never move, so taking one needs a
  supported attack. They can also be bought for 10 × yield by a power whose land or troops touch
  them, or that holds a coast on the same sea zone (islands trade by ship). Rival bids in the same
  season bounce: the elders sell to none, and each bidder is told how many buyers bid ("The elders of
  Gaza would not choose between 2 buyers last season. No gold was paid."). A city that troops take in the season of a bid is not sold: every bidder is told
  ("Gaza was taken by Babylonia's troops last season before its elders could accept your gold. No
  gold was paid.", or "Your own troops took Gaza last season; no gold was paid."), nobody pays (gold
  is only reserved when orders are checked), and a scheduled bid that fails this way wakes its seat.
  (Until the simulation-fixes round such a bid vanished without a word.)
- **A bought city keeps its walls**, which then hold for its owner: the owner cannot station troops
  inside but it, or any other king, may support the walls holding (the rulebook and the schema's
  support target say so); a rival still needs a supported attack, and conquest
  tears the walls down. Buying is the durable way to grow, conquest the fast one.
- **Levies** are raised after movement, only in a province of the power's own homeland that it
  still holds and that is empty after movement; otherwise nothing is raised or paid, and the king is
  told which ("No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.",
  or "…: you no longer held Thebes after movement.", or, for land the king itself ceded earlier in
  the resolution, "…: you ceded Sinai to Hatti last season, before the levy."). Army 100, fleet 120; upkeep 30 and 35 a season. Troops the treasury cannot pay desert at the
  start of the season, the one farthest from the capital first (the rulebook says so).
- **Strength** = 10 × (sum of base yields of provinces held) + true gold − back pay owed (see
  "Back pay" under Characters). Growth is strength over starting strength. Units are not counted;
  they cost upkeep and are the means to land. One function computes it (`Scoring.Strength`): the
  engine's score with true gold and the back pay a power really owes; a seat's own strength line
  (`TurnEngine.LedgerStrength`) with its gold by its ledger and the back pay it believes it owes,
  covers included; the script kings with what their view shows (see Script kings). The rulebook's
  HOW YOU WIN says so ("... + the gold in your treasury - the back pay you owe your people"), and the
  view's treasury line says that back pay is counted against it. (Until the simulation-fixes round's
  Part G, owed gold did not exist: every wage left the treasury each season.)
- **Standings.** Every seat's view has one line after its treasury, the same for every court since
  ownership is public: "STANDINGS (an estimate from who holds what; treasuries are left out): Mitanni
  1.93 (land yield 280, at the start 145); Egypt (you) 1.11 (land yield 210, at the start 190); …
  Fallen: Assyria." Land-based growth is the base yield of the land a power holds now over its
  homeland's yield (`Views.LandStandings`), the living best first; it is not the score, which adds
  gold. The seat's own growth by its ledger stays on its treasury line. The web app's standings
  panel shows the same estimate as a column, and a human seat's own growth and gold there by its
  ledger. (Until the simulation-fixes round the view gave no standings, and kings added up yields
  by hand; the human seat's panel showed its true growth and gold.)
- **Opening positions are public.** Every king reads every power's opening troops, treasury,
  homeland yield and starting strength in the rulebook ("OPENING POSITIONS (known to every
  court)"), generated from `MapData` (`OpeningPositions`), so the cached block stays byte-stable.
  The web app's standings panel shows the same table to every seat, human or not. Script kings
  read the same facts from `MapData`, as before.
- **Ending.** Not before turn 15; then 15% at the end of each season; hard cap at 60 turns.
- **Dice.** Every roll comes from a stream keyed by seed, turn, purpose and subject. (An early
  version keyed it by seed XOR turn, so neighbouring seeds shared rolls at shifted turns; fixed,
  with a regression test.)
- **Ids: a counter for each kind of object** (since Build order item 4, fix (d); save version 4). Every
  object the engine makes takes its id from `GameState.NewId(prefix)`: its kind's prefix and that kind's
  own count, so tablets are "t1", "t2", ... and copies "k1", "k2", ... (`GameState.IdCounters`, saved
  with the state). The prefixes are listed once, in `IdKinds`: a audience, c character, f fact, g lot
  of gold, j journey, k copy of a tablet, m message trail, q task owed to a court, r request to a
  character's mind, t tablet, u unit, x catastrophe; standing orders are numbered per seat ("s1", ...),
  outside it. Each is letters only and belongs to one kind, so ids stay unique across kinds. Why:
  many rolls are keyed by an id (a character's, a task's, an audience's), and until version 4 all
  kinds shared one counter, so more objects of one kind, or a new kind, shifted the ids of everything
  made after them and with them the dice. Build order item 3's inventory tablets and copies did just
  that, and changed the winner in 13-14% of benchmark seeds without a rule that decided anything.
  Now a kind added later, or more of one kind, leaves the ids of every other kind, and every roll
  keyed by them, where they were. Tested: a dummy kind issued all through play leaves seeds 1-3
  identical (same log, outcomes, winner, length and world), and the benchmarks were rerun with one in
  the engine and came out identical. Within a kind a higher number was made later, which the
  archives' "newest first" and the trail panel rely on (tested). What this does not cover: a rule
  that adds draws to a stream shared by many decisions (a script king's stream for the season, say)
  still moves the draws after it. A court can tell from the numbers of the ids it sees how many
  objects of that kind exist in the world (copies made at other courts, for instance); the shared
  counter told the same of all kinds together. Left as it is.
- **Shared victory is off** (since 18 October 2026; see `docs/rounds/2026-10-18-sleep-and-simulation.md`, question 23). One
  power wins: the one with the highest growth. A tablet can still be marked as a sworn alliance,
  and the script kings still treat it as a full alliance, but it shares nothing (the order schema
  says the mark "changes no rule and binds nobody"). The rulebook and
  the order schema mention shared victory only when the house rule is on (`--shared-victory` in the
  batch runner, "Customize" in the browser). With it on, two powers holding a sealed tablet marked
  as a sworn alliance win together if their combined growth beats every other power's growth; only
  pairs count, never three or more.
- **Convoys** follow Diplomacy, with Kruijswijk's guess-and-check adjudication; circular movement
  succeeds, and convoy paradoxes are resolved by the Szykman rule (the convoyed army stays put).
- **News of a season is read the next season.** Battles, purchases, rejected orders and notices
  produced while a season resolves are delivered with the next season's reports, and say so:
  "Movements last season"; "Mane set out for Hatti last season; the journey takes 2 season(s)".
  The treasury notice is written at the start of the season, before audiences: it gives the
  treasury "after income, upkeep and wages" and says that gold received at audiences or brought
  home by envoys that season is added later. The validator's refusals are worded for the season
  they are read in ("Mane was already given a task by an earlier order"; "you had already asked for
  candidates that season").
- **Every refused or failed order is a rejection notice** (kind `Rejected`), read next season with
  the reason, and a scheduled order that fails any of these ways wakes its sleeping seat: every order
  the validator refused ("Orders that could not be carried out", one line each); a cession of land no
  longer held, or with the king's own troops still in it ("Cession failed": "Sinai was not ceded to
  Hatti: you no longer held it after movement.", the only way it can be lost by then, since a second
  cession of one province is refused); a gift of troops, or a disband, of a unit no longer
  there ("No unit of yours stood in Sinai after movement, so none was given to Hatti."); a levy (see
  Levies); a purchase (see the city-states); anything the treasury could not pay, saying what came of
  it ("There was not enough gold to pay for Mane's mission to Hatti; Mane stayed at your court.", and
  likewise for a levy, a purchase, inquiries, watchmen, an assay, an examination, a forger's
  materials, a ransom, a gift at an audience or gold sent back with an envoy); a ransom that could not
  be sent; a captive order that could no longer be carried out; a hire the person declined, with why
  ("Mane declined your offer of 10 shekels a season: they ask 20 shekels.", or "…: another court
  offered more", or, at an equal wage, "…: they chose another court that offered as much"); a
  renewal below the servant's price; a forgery botched by a servant without the skill (the clay is
  still paid for, the one exception to the rulebook's "gold reserved for an order that failed stays in
  your treasury", and it says so); an assay of gold the treasurers had already weighed that season,
  when an earlier payment fell short and exposed debased gold, which empties the list of unassayed
  lots, fine ones included ("Gold lot g901 was not assayed: your treasurers had already weighed all
  your unassayed gold last season, when a payment fell short. No fee was paid."); and, though the
  validator should already have refused them, a release, recall, dismissal or captive order that
  finds nobody to act on. The batch seat report's "invalid" column counts each of them (the validator's list
  once per order). (Until the simulation-fixes round a cession of land no longer held, a gift or
  disband of a unit that was gone, and those last few did nothing in silence; a declined hire did not
  say why; a botched forgery was an ordinary notice.)
- **Save version.** The state and the log header carry the version of the rules
  (`GameState.CurrentVersion`: 2 since the simulation-fixes round, 3 since Build order item 3, whose archives,
  inventory tablets and swapped inventories change how a seed plays, 4 since Build order item 4, whose hidden spies
  are not paid back pay at the court they watch and do not end that court's cover, and whose fix (d) gives each kind
  of object its own id counter, which renumbers objects and so moves every seed's rolls once; neither was released on
  its own, so one version covers both). A log saved under another version is refused, both for replay and for
  continuing it: "This game was saved under an earlier version of the rules (version 3) and cannot be replayed by
  this version." (tested for versions 1 and 3). The web app shows that message
  in the saved-games card, next to the buttons that load a game, instead of loading it. Within a version, seeds replay exactly, with sleeping seats on or off
  (tested). For analysis only, `GameRunner.ForReplay(log, anyVersion: true)` feeds an old log through
  the current rules; it may diverge. Back pay (Part G) changed rules but not the log format (its header
  and decisions), and version 2 was never released, so it stays version 2: a version-2 log saved
  before back pay would replay under the new wage rules and may diverge. The same holds for the rest of
  Part G (the capital trigger, triggers on changes, the news of losses abroad). Part E (the king's
  record, ledger and primer) changes what a model king reads, not the rules, and adds two fields to
  the logged orders, the king's `summary` and `ledger` lines, which the engine ignores: a log saved
  before them reads both as empty, so they need no new version either.

## Communication

- **Greeting sealed, body spoken.** The engine renders the greeting from sender and recipient and
  the leader's deviations (omit it, own name first, withhold "brother", claim or deny "Great King",
  or free text). It arrives verbatim. The letter body is spoken by the envoy, who may distort it.
  The order schema says what each greeting flag claims or withholds (brother between Great Kings, a
  slight withheld; the title Great King given or denied; oneself named Great King, or only king of
  one's land, which the recipient reads as not claiming the rank; one's
  own name first, presumptuous; no greeting at all, a slight), since the sealed greeting is built
  from those flags alone. (Until the simulation-fixes round the flags had no description, and 54 of
  the simulation's 135 letters left out their sender's own title.)
- **Tablets are verbatim** but cost a scribe fee (20), so the envoy channel stays the cheap default
  and a written agreement is a deliberate choice. Tablets are evidence only; nothing enforces them.
- **Tablets lie in archives** (since Build order item 3; Ideas tab "Tablets are objects in a place"). Every copy a
  court holds (`TabletCopy`) lies in its archive at its capital (`TurnEngine.Archive`): those it sealed, once its copy
  reached it, and those it was shown, brought, copied or took. Keeping a tablet costs nothing; its cost is that it is
  somewhere. The seat view calls the list "YOUR ARCHIVE".
  - **Spies copy.** A spy posted at a living court, each season it is not caught, copies with a chance of its
    skill/100 one tablet of that court's archive that its master neither holds nor has on the road home in an earlier
    report: tablets bearing two or more seals first (agreements, and forgeries of them), the newest first. The draw has
    its own stream (`archive`), so nothing else the spy sees or risks changed, and detection is unchanged: copying adds
    no risk. The tablet ids travel in the report (`SpyReport.TabletIds`); when the report arrives, each tablet the master
    does not hold by then becomes a copy in its archive ("copied from the archive of Assyria by your spy Mane"), and the
    engine adds a line to the report: "[With this report came copies Mane made in the archive of Assyria, now in your
    archive: k123 (sealed by Assyria and Hatti, dated turn 4).]" (no text there: the archive shows it, and the script
    kings' reading of spy reports for troops stays clean). A report that never comes home (the spy caught before it was
    sent) brings nothing. A spy turned by the court it watches copies nothing: it sends home only what that court tells
    it. A spy watching a province, or a court that has fallen, copies nothing, and a report reaching a court that has
    fallen brings nothing. The spy remembers what it copied, and a model-played spy writing its report is told that a copy
    goes home with it when one does (not when its master came to hold that tablet while the report was on the road).
  - **Whoever takes a capital gains copies of its archive.** When a court's capital passes to another power at the
    end of movement, or by cession (the archive lies in the city), that power gains at once a copy of every tablet in
    the court's archive it does not hold already ("taken with the archive of Assyria at Ashur"), and reads next season
    "With Ashur you took the archive of Assyria: copies of 2 tablets you did not hold are now in your archive: k130
    (sealed by Assyria and Hatti, dated turn 4), k131 (…)." (or that it held nothing new). The court keeps its own copies:
    copied, not seized, since its king still knows what he sealed and the game has no way to make him forget it. A court
    retaking its own capital gains nothing. The archive is whatever the court holds at that moment, so a third power
    taking the capital from its occupier gains the court's archive too, including what the court sealed after it lost
    its capital (the court cannot move yet; see Not built yet).
  - **Hidden.** Only the spy's master learns of the spy's copies, when its report arrives, and only the conqueror of the
    archive it took; the court copied is never told (tested: no other court gains a copy or a notice). The events
    `archive-copied` and `archive-taken` are visible to that court alone, and count as signals in the batch report.
    A sleeping seat's digest reads "with Ashur you took the archive of Assyria"; a spy's copies come in its report.
  - The rulebook says so under EVIDENCE AND INTELLIGENCE ("Archives: …", including that a spy turned by the court it
    watches, or watching a court that has fallen, copies nothing), and the web app's Orders tab heads the list "Your
    archive".
- **Gold travels with envoys.** The tablet's inventory states the amount; the host's weighers find
  what is left after any skimming. Purity is hidden until an assay.
- **The inventory is a tablet** (since Build order item 3). Gold an envoy carries comes with an inventory sealed by the
  court that sends it ("The inventory of the gold Egypt sends to Hatti: 1 mina 40 shekels."), dated the season the
  envoy set out, and gold a host sends back with an envoy has one sealed by the host, dated the audience. The receiving
  court keeps it in its archive ("the inventory brought by Mane, envoy of Egypt"; "the inventory Mane brought home with
  the gold of Hatti"), where it can be examined, shown, copied by a spy or taken with the capital like any tablet. Its
  scribe costs nothing, as before: the document's gift sent without an inventory, saving the fee, is not built (see Not
  built yet). The sender keeps no copy (it knows what it sent). Every gold delivery leaves one, whether or not anything
  was swapped, so the presence of an inventory gives nothing away. An inventory bears one seal, so the script kings'
  rules on treaties and evidence (two seals or more, their own among them) never read one.
- **Swapped inventories** (since item 3; Ideas tab "Swapped tablets and false envoys"). An envoy that kept some, but
  not all, of the gold it carries, out or home, may hand over in place of the sealed inventory one it forges itself,
  stating only what is left (`AudienceRecord.SwapInventory` from the envoy's presentation; `MindReply.SwapInventory` from
  its report home).
  It is a forgery under the forgery rules: it needs the forger's skill (competence at least `ForgeMinCompetence`, 55);
  an envoy without it does not hand its botched forgery over, the true inventory goes, and it remembers that its hand
  could not fake the seal. It costs the envoy nothing (the forgery fee is what a king pays for materials and a scribe; the
  envoy writes it himself). A swap with nothing kept is ignored; one with everything kept is refused, since a forgery
  stating nothing would hide nothing (the true inventory goes, and the envoy remembers why). When it swaps:
  - The host's audience view, its record of the audience and the lot in its treasury all state what the forgery states,
    which is what its weighers find, so no shortfall shows, and the host's record leaves out the outcomes "kept 20 shekels
    of the gold" and "replaced the inventory with a forgery stating 80 shekels" (shown to a host when no swap hides them,
    as before). The record of the mission (the spectator's trail) keeps both. On the way home the court reads "[The
    inventory lists 45 shekels of gold; your weighers found 45 shekels.]".
  - The envoy remembers it, and carries a deep secret ("Forged the inventory of the gold Egypt sent to Hatti, to hide what
    was kept.", known to nobody, which a background check can find as any deep secret). The event `inventory-swapped`
    is the spectator's alone and counts as a signal.
  - **Caught when the tablet is examined.** The forgery's tablet records the envoy as forger, with its competence as the
    forger's skill and its employer then, so an examination finds it with the usual chance (20% + spend/200 − skill/150,
    5–95%). Once found it is traced, with the usual chance (30% + spend/400, 30–80%), to the envoy who brought it, not
    to a court: "The seals are false: this tablet is a forgery. The scribes trace it to the hand of Mane, who brought
    it.", and every other court hears "The scribes of Hatti declare that the inventory of gold bearing the seal of
    Egypt, brought by Mane, envoy of Egypt, was forged by Mane." The envoy loses 30 reputation with every court and
    gains a public fact ("Exposed as the forger of an inventory of gold bearing the seal of Egypt."), as a traced forger
    does. Script kings never examine an inventory (they examine only tablets shown to them), so in script games a swap
    is never found; a model or human king may examine any tablet it holds, or send the inventory back to its sender as
    evidence, who knows what it sealed.
  - Script envoys decide by formula (see Script envoys); model envoys decide for themselves, told in their prompt that
    they could keep some gold "and, if you leave some, hand over in place of the inventory one you forge yourself,
    stating only what is left", and whether their hand is skilled enough to fake a seal, with the schema field
    `swap_inventory` saying what it takes and risks.
  The rulebook says all this under ENVOYS ("Gold an envoy carries goes with an inventory tablet …").
- **Debasement is a ledger, not a coin type.** A power's displayed treasury counts unassayed lots
  at their weight. True gold is what is actually spent; a payment the true treasury cannot cover
  fails and exposes all debased lots at once. A seat's view shows its strength by the ledger too, so the gap
  cannot be read off the difference between strength and gold.
- **Envoys go out and come back.** An audience has at most two exchanges. Detention is the host's
  choice; detained envoys grow attached to the host court over time. The sender hears that the
  envoy is overdue a season after it should have returned, unless it has come home meanwhile; until
  then it sees the envoy on the road home (see "News of your people abroad" under Characters).
- **Gold sent back** is paid when the audience ends: the latest amount the host named, at the purity
  it named with it. A 0 in the second exchange keeps the first amount; a new amount replaces it. The
  second exchange tells the host what it already named. (Until the simulation-fixes round only the
  last exchange counted, so gold named first and not repeated was lost.)
- **One gift per audience.** Once an envoy has accepted a gift, a later gift in the same audience is
  not given, and the audience's outcome tells the host ("a second gift was not given: an envoy takes
  one gift per audience"). That holds even when the treasury cannot pay the accepted gift (gifts are
  paid when the audience ends): the host gets a "Not enough gold" notice and the outcome reads
  "agreed to take 50 shekels from Alashiya, but the treasury could not pay it". A refused gift may
  be offered again in the second exchange.
- **Plants.** Two of the fourteen starting envoys are secretly in the pay of another power. When a
  plant stands before its real master, the master is shown the envoy's true instructions.
- **Bribes, poaching and defection** are explicit decisions by the envoy that the engine applies:
  a gift is paid only if the host can afford it; defection moves the character to the host's
  service and adds a public fact ("Abandoned the service of…") that follows them.

## Characters

- A pool of 18: eight names attested in the Amarna letters (Mane, Keliya, Pirissi, Tulubri,
  Haamashshi, Artessupa, Mazipalali, Yanhamu; seven are drawn per game) and the rest in regional
  name styles. Each power starts with two envoys; the rest are free agents.
- Traits 0–100 (loyalty, greed, competence, ambition, courage, an optional sympathy) and discrete
  facts at three secrecy levels. Persona text is written once (template, or Sonnet narrator) and
  frozen.
- **Memory** is an episodic list. When it grows past 12 entries, the engine asks the character to
  fold its oldest entries (all but the newest six) into its summary, in its own voice: Haiku when
  characters are model-played, a deterministic condensation for script characters. The summary
  is recorded like any decision, so replays stay exact. Prompts carry the summary and the most
  recent ten entries; memory travels with the character to a new employer. The request names the
  court the character belongs to (its employer's, else the court it stands at); one with neither, free
  and on the road, belongs to no court, and its request names none (`MindRequest.Court` is null; only
  reports, pitches and background checks must name one, `MindRequest.For`). Nothing reads that court
  for a summary, which goes to nobody. (Until Build order item 4 such a character's request named Egypt.)
- **Prisoners**: an envoy held at a foreign court whose own kingdom falls, or whose king dismisses
  them, becomes a free agent but stays a prisoner; only the court holding them can hire them, and
  its release frees them at that court. A court that falls lets its prisoners go: its captives and
  the envoys it detained walk home as if released, and a spy still watching it can no longer be
  caught. (Until the simulation-fixes round a fallen court still caught spies and kept its
  prisoners for the rest of the game.)
- **Dismissal** (one line in the rulebook) ends the wage at once, wherever the servant is, and moves
  nobody; back pay already owed is still paid if the person ever stands at that court again (see
  Back pay). An envoy dismissed on the way out goes on to the court it was sent to and arrives there a
  free person, with no audience; the gold it carried becomes its own, and the notice says so ("Mane
  has been dismissed. The 1 mina 40 shekels of gold they carried is now theirs."). One on the way
  home still arrives, reports and hands over what it carries, and is then free at its old court. A
  spy watching a court, or on its way to one, is free at that court; one watching a province, or
  on its way to one, walks back to its old court (from the province, once there) and is free there.
  A detained envoy stays held (see Prisoners). A captive stays a captive. Its captor is not told of
  the dismissal: a ransom it asks goes to the king who dismissed the captive, who may still pay it
  (the captive then goes free at the captor's court), and lapses unanswered otherwise. Only a
  turning is refused, since the captive visibly stays in prison: "Mane serves no king now: nobody
  is left to deceive. Mane remains your captive." When the dismissal and the turning fall in the
  same season, the captor is told as the season resolves ("Captive order failed": "Your order for
  Mane could not be carried out: Mane serves no king now: …").
  Someone taken into another court's service while still on the road stays with its new master when
  the old journey ends. The web app offers dismissal for every servant, at court or away. (Until
  the simulation-fixes round a dismissed traveller was set at home at once and the gold it carried
  out was lost, a dismissed detained envoy could not be released, and a captive could not be
  dismissed.)
- **Contracts** (one line in the rulebook). Every servant serves for a term (`Contract.UntilTurn` is
  its last season). Starting envoys earn 6 + competence/10 (8–15), each through a turn drawn from 7
  to 13 from a stream of its own (`start-term`, keyed by the character), so the starting corps comes
  up for renewal over several seasons and no other draw changes (until the simulation-fixes round
  every starting term ended with turn 10, and about nine in ten of the corps quit from turn 11
  onwards, each as soon as it was next at court); a hired servant serves the term
  its king named (`term`, 1–30 seasons, 6 if none) at the wage agreed, from the season after it was
  hired. A person asks a court its base price, 6 + competence/8 + greed/8 + average reputation/5,
  −4 at the court it favours, at least 5, unless it named another in a pitch.
  - **Term end.** Once the term has ended and the servant is at court with no task (one away serves
    on until it is next at court), it reckons what it would ask to serve on: its base price, +5 if
    greed is above 60, −5 if loyalty is above 70. If that is at most 1.2 × its wage it serves
    another 6 seasons at the same wage ("Contract renewed": "Mane stays in your service at 12 shekels
    a season through turn 17."). Otherwise it gives **notice** (`Contract.NoticePrice`,
    `LeavesTurn`): it names that price and stays one more season at the old wage, and its master is
    told, "Mane's term has ended. They ask 20 shekels a season to serve on: renew them this season
    (order renew), or they leave at the start of turn 12 (or, if you send them out first, when they
    are next at your court)." A servant still owed back pay that the treasury could not pay is never
    content: it gives notice instead of renewing itself, asking at least its present wage, and the
    notice says so ("Mane's term has ended, and you still owe them 48 shekels of back pay. They ask
    12 shekels a season to serve on: ..."). The notice wakes a sleeping seat. A
    servant on notice can still be sent on errands. Unless renewed, it leaves at the start of turn
    T, before that season's wages, so the king pays exactly one season past the term: it is free at
    the court, asking that price, with a pitch that says so, and its old master may hire it back. If
    it is away at T, it leaves when it is next at court with no task (an envoy reports first).
  - **Renewal** (`renew`: person, wage, term). Valid for one of the king's own people at court, at
    any time, or for one who has given notice, wherever it is. It is not a task: the servant may be
    renewed and sent out in the same season. It is settled with hiring at the end of the season:
    accepted if the wage reaches the servant's price (what it named in its notice, else what it
    would ask at the end of its term, and never less than its present wage: renewed early, a
    servant takes no cut); a new contract is then made that season, its term (1–30, 6 if none)
    counts from the next season, as for a hire, and the new wage is paid from then ("through turn
    T + term"), and any notice ends ("Contract renewed", with the last season of the new term).
    Below the price it is refused, with the price, as a rejection notice ("Not renewed": "Mane will
    not serve on for 15 shekels a season; they ask 20 shekels.", or "…; they ask 60 shekels, their
    present wage." when the present wage is the price).
    `hire` naming one's own servant is refused: "Mane is already in your service; to keep them on,
    order renew". A servant abroad whose fate its master has not heard of is renewed as its master
    believes it (its cover keeps the notice it gave): at the price it named, the back pay the master
    believes it owes grows by the new wage from then on, and the real contract changes too if it
    truly still serves (a captive).
  - **What the king reads.** Each servant's term in plain words: "serves at 12 a season through turn
    10; if content they then renew themselves, otherwise they give a season's notice and name a
    price"; once the term has passed while it is away, "serves at 12 a season; the term ended with
    turn 10: when next at your court, if content they renew themselves, otherwise …"; on notice,
    "serves at 12 a season; has given notice: asks 20 a season to serve on; leaves at the start of
    turn 12 unless renewed" (or "leaves when next at your court unless renewed"); a captive's wage
    builds up as back pay, so its line reads like any servant's away ("serves at 12 a season; has
    given notice: ..."), and one dead in the king's service has no term at all. (Until Part G a
    captive drew no wage and its line named none.) The web app's people lists use the same words, and its orders panel offers renew
    beside each servant at court or on notice, with a term for hiring and renewing. A free person
    at the court shows what it asks there (its pitch's price, or its base price), whether or not it
    pitched, and can be hired from the panel; one's own servants show no asking price.
  (Until the simulation-fixes round a servant who wanted more quit at once, the view read "wage 12
  until turn 10" with no word of what came then, no order could renew a contract, models could not
  name a term, and kings who tried to rehire their own envoys were told "not available for hire".)
- **Back pay** (one line in the rulebook; since the simulation-fixes round's Part G, the user's
  addendum: gold has to travel too). Each season, at the wage step, a servant at its master's court
  with no task is paid its wage from the treasury, as before. A servant away (on a mission of any
  kind, posted as a spy, detained, or captive with its contract kept) is not paid: its wage is added
  to its back pay (`Character.BackPay`, per court), and no gold leaves. Right after the season's
  arrivals, everyone standing at a court that owes it back pay, not held there and not hidden there as
  another court's spy (since Build order item 4: the court does not see it there), is paid from
  that court's true treasury, as much as it holds, whether or not it still serves that court (one
  dismissed while away is paid when it gets home); so a servant is paid the season it comes home,
  and its master reads "Mane is back at your court and was paid 48 shekels of back pay." A shortfall
  (which, like any payment the true treasury cannot cover, exposes debased gold in the ledger) stays
  owed and counts as missed pay for a servant: loyalty −15, a memory, the unpaid count and the quit
  rule, once a season however many payments fell short ("... is owed 48 shekels of back pay, but the
  treasury could pay only 20 shekels: the other 28 shekels stays owed, and counts as missed pay.");
  and its next term end is a notice (see Contracts). Whoever never comes back is never paid: a
  servant who goes over to a host forfeits what its old court owed it; at death it is cleared; a
  captive keeps it (it may be ransomed or let go and come home); when a kingdom falls, everything it
  owed is lost. Back pay owed counts against strength. The view shows each person's back pay ("owed:
  48 shekels of back pay", in the web app "Owed 48 shekels of back pay, paid when they are back at
  your court"), and the treasury line the wages a season, that those of people away build up as
  back pay, and the total owed ("Back pay owed to your people: 48, paid when they are back at your
  court."); the season's treasury notice says the wages paid at court and the wages added to back
  pay. What a court sees it owes is what it believes: its people as its covers believe them (see
  below), and anyone at its court; back pay still owed to someone it dismissed while away, and who
  has not come back, is counted in its score but not shown, since seeing it vanish would tell of a
  death. Characters weigh it as a motive (see Script envoys, "An offer of service, and back pay"), and
  script kings count it as gold already spent (see Script kings, Treasury). The loophole this opens
  (a king saves the back pay of people sent on missions they do not survive) is meant to be closed
  by reputation, which is not built; its first half is: losses abroad reach other courts by
  carriers (see "Losses abroad travel with people").
- **Characters' gold, and the richest characters** (since Build order item 3; Ideas tab "The richest characters").
  A character's purse (`Character.Purse`) was already tracked; every gain now goes through `Character.Gain`, which
  also counts it by source (`Character.Earned`): wages (paid at court, and back pay paid when it came back), gold
  skimmed (out or home), kings' personal gifts at audiences, and gold it was carrying when dismissed on the way out.
  Characters start with nothing and spend nothing yet (no escort, storage fee, loan or robbery exists; item 11), so the
  parts add up to the purse (tested over a whole game). A captive or a dead character keeps its purse, as before (what
  capture and execution do to a purse is item 11).
  - **Wealth** (`Wealth.Of`) is the purse plus the back pay every court still owes it (a fallen court's debt died with
    it). The document's other two parts, a hoard and what kings owe it on debt tablets, do not exist yet (item 11) and
    count nothing; every place the ranking is shown says so ("Wealth is the gold in a character's purse and the back pay
    kings still owe it; hoards and loans to kings on debt tablets do not exist yet. The dead are not ranked.").
  - **The ranking** (`Wealth.Ranking`): the living characters, richest first, ties by id, each with whom it serves (or
    free, or captive where), its wealth, purse and back pay owed, and where its gold came from: "Mane of Thebes (serving
    Egypt): 312 (purse 280, back pay owed 32; wages 250, skimmed 30)". The dead are left out: their gold is no longer
    theirs to enjoy, and a ranking of the dead would reward a character for dying rich.
  - **Where it is shown**: where the game's end is shown. The batch prints the top three after each game's result line
    (the whole ranking with `--detail`), and its summary how rich the richest was on average and where all characters'
    gold came from; the web app's Standings tab shows the whole ranking once the age has ended, to every viewer, and the
    season's end notice points to it. Kings never read it: it is not their game.
  - **During play a character knows its own wealth, not the ranking.** A model-played character reads its purse and,
    if any, what it is worth with the back pay kings owe it ("Your purse holds 100 shekels; with the back pay kings owe
    you, you are worth 142 shekels."), and now also the back pay courts other than its lord owe it ("The king of Hatti
    owes you 12 shekels of back pay, paid if you ever stand at his court again."). It is never told of a ranking or of
    another character's wealth. Script characters decide nothing by wealth.
- **Background checks**: public facts always; hidden facts with chance spend/150 (max 90%); deep
  facts with chance spend/400 (max 60%). Never the whole truth. The rulebook states these odds, the
  spies' and the examinations' below, and the fees, as they are (until the simulation-fixes round it
  said only that the chance "grows with what you spend").
- **Spies**: detection chance 5% + watch spend/300 − competence/400, clamped to 2–60% a season.
  Nobody rolls to catch a spy watching a province no power holds, one its own king holds, a court
  that has fallen, or the court it secretly serves; the rulebook names the first three.
  Caught spies confess their master if timid (or 40% of the time). Turned spies go back to their
  post (a court, or out in their province) and report what their new master wants, plus one true
  observation; one whose master, not knowing it was caught, had recalled it comes home instead, as
  told. A spy's report is written when it arrives, of the season it was observed: a model-played
  spy remembers nothing that happened to it since (such as its capture). A spy at a court also copies
  from its archive, and the copies come home with its report (see "Tablets lie in archives").
- **A spy at a court is hidden from it** (since Build order item 4; the rulebook says so under the spies'
  paragraph). A spy posted at a court stands there (`Character.At`), but the court does not see it there
  (`Character.HiddenAt`, `Views.SeenAtCourt`): its view does not list it for being there, and gives it
  no place and no master. It is listed only if the court knows of it otherwise (a hidden fact it learned,
  for instance), and then exactly as it would be anywhere else: "employed", no place, no master. The
  court sees it, and whom it serves, once it has learned that, which under today's rules means:
  - **caught**: it is the court's captive, listed "your captive", in its prison, with the master it
    confessed to if it confessed (the `LossAbroad` record of its capture; kept as the court learned it,
    whatever happens to its service later), and with no master if it would not say;
  - **turned, or a plant**: a spy secretly in the pay of the court it watches (a captive it turned and sent
    back to its post, or one planted in another court's service at the start) reports to that court, so the
    court sees it at its post, with the master it pretends to serve.
  Nothing else tells a court of an uncaught spy at its court: a confession comes only with a capture;
  spies' and envoys' reports name envoys received or held at the court they visit, captives and the
  dead, never a spy still at its post; background checks report facts about a person, never where it is.
  The engine follows the same line: a hidden spy is not paid back pay the court owes it (it does not
  stand there in the open; it is paid if it ever does), so no notice and no gold betray it, and it does
  not end a cover that court holds for it (a defector posted as a spy at its old master's court leaves the
  old master believing what it believed, as for any servant abroad). The web map already drew no foreign
  spy a court has not caught, and draws a captive held at the court with the master it confessed to, or
  none. The captor's own record of the capture (the event its court sees, in the web app's Events and
  Season panels) names the master it confessed to, or says it "will not say whom they serve"; the truth is
  a line no court sees, shown in the god view, which carries the success marker, so a capture still counts
  once. (Until Build order item 4 the view listed a spy posted at a court in that court's view as
  employed, with its master, "at your court", and showed a captive no master even if it confessed, while
  the map coloured every captive by its true master; until that item's review the captor's event named
  the true master too.)
- **News of your people abroad comes only by rumour or when they return** (the rulebook says so).
  When something happens to a servant abroad that its master cannot see (a spy caught, an envoy
  detained or going over to the host, a captive put to death or turned, a prisoner let go), the
  character carries a cover (`Character.Covers`): what its master still believes. Each court keeps
  its own: an envoy that went over to Alashiya is covered for Egypt, and, if Alashiya then sends it
  to Hatti and Hatti holds it, for Alashiya too; what happens between Alashiya and Hatti changes
  nothing Egypt sees. The master's view lists it as it would have stood in the normal course of
  events, never ready: a caught spy "watching Assyria" where it was posted, a detained or defecting
  envoy "on the road home". Its facts are those the master knew before, plus whatever the master's
  own inquiries find later, as for any servant (a defection's public fact stays unseen until a
  background check finds it, and then shows). Nobody away is paid until it is back (see Back pay),
  so no wage leaves the treasury for anyone away, whatever befell it, and the treasury betrays
  nothing. A cover keeps the back pay its master believes it owes (`Cover.BackPay`): the real back
  pay when the cover is made, grown by the believed wage each season while the cover holds, so the
  master's view shows the debt growing exactly as for a servant still on its mission (tested by
  cloning a game with and without the hidden event: treasury, true gold, wages, back pay and
  strength by the ledger are the same). When word comes, the master sees the truth: nothing owed to
  one dead or gone over to another court, the real back pay owed to a captive. (Until Part G the
  master kept paying the wage it believed it owed, into the character's purse.)
  - **The cover ends when the news reaches the master:** the ransom demand, or the rumour of the
    death (sent to the captive's king and to every court that still believes the dead one serves
    it); the first report from a turned spy, if its master had heard of the capture; the character
    standing at its master's court again (home, or sent there by another court); the character
    presenting itself to that court as a free person seeking service; its dismissal; or the fall
    of the master's kingdom.
  - **Overdue.** The rumour that an envoy is overdue comes a season after it was due home. If the
    envoy is held in the master's service, as the rumour says, the cover ends; otherwise (it went
    over to the host, was let go too late to be home on time, or a caught spy its master recalled)
    the master now believes just that, "has not returned from Alashiya", "unknown", until it is
    seen. An envoy that went over to the host stays on the list, its believed back pay still
    growing, until it is dismissed or seen. The rumour is not sent once the envoy has stood at its master's court, and not told to
    a court that no longer believes anything of it (it dismissed the envoy, or heard of its death).
  - **Let go, or turned.** A detained envoy let go, or a caught spy let go, still reads as its
    master last believed (on the road home, not returned, or watching Assyria) until it is home.
    Only a captive whose master had heard of the capture shows on the road home at once, so that no
    ransom is paid for a captive already free (see Ransoms). A captive turned whose master knew it
    was held still reads as held, with the demand, until its first report arrives; a ransom paid
    meanwhile goes, and the captor keeps it. One its master did not know was caught goes back to
    its post as believed, or, if its master had recalled it, comes home.
  - **Orders.** Orders for a covered servant read as for any servant away ("Mane is not at your
    court"; "Mane is already in your service; to keep them on, order renew" for a hire, even once
    it has gone free elsewhere; a renewal is accepted if it had given notice; recalling a
    caught spy is accepted, and its master then believes it on the road home and hears a season
    after it was due that it has not returned). Dismissing it is accepted and ends the cover, the
    wage and the back pay the master believed it owed; a dismissed captive stays a captive.
  - **Captives.** A captive whose master has heard of it reads "held captive at the court of
    Assyria; Assyria demands 1 mina 30 shekels for their return (order pay_ransom)" (the demand once
    its word has arrived), never "at court, ready", with its wage and the back pay owed it, which
    keeps growing while it is held; the web app offers the ransom button only then.
  - **When it is due back.** Each of the king's people away reads when it set out and when it is
    due back, as the travel table lets its master reckon it (`Views.TimingText`): an envoy on its
    way out "travelling as envoy to Hatti; set out in turn 4 for Hatti; due there about turn 6; due
    back about turn 8", and once at the foreign court "…; received there in turn 6; due back about
    turn 8" (a reckoning reads "due", a fact "received"); on the road home "set out in turn 4 for Hatti;
    due back about turn 8"; a spy on its way "set out in turn 4; due there about turn 6"; a spy
    recalled "due back about turn 7". A cover keeps the timing its master would read in the normal
    course (`Cover.TimingText`): a detained or defecting envoy reads like one sent home at the
    audience, a caught spy recalled like one really recalled, and the overdue word clears it, as it
    does for a servant really held. (Until the simulation-fixes round the view gave no turns, and
    kings mistimed their replies.)
  - Script kings read the same view and are fooled the same way: a script king keeps an envoy that
    went over to the host on its list, its believed back pay growing, for as long as the cover
    holds, and gives it up (dismisses it) only once its line has read "has not returned" for three
    seasons (see Script kings, Court and intelligence).
  - **Sight.** A caught or released province watcher keeps its province, and the links next to it,
    in its master's sight while the cover believes it at its post (`Views.Sight`), so the capture
    cannot be read off the "You can see troops in" line; the province leaves the sight when word
    comes, or when the master recalls it, as for a spy really recalled. (Until the simulation-fixes
    round's review it left the sight the season of the capture.)
  - **What a cover cannot hide:** a caught spy's reports stop coming; a background check on the servant
    finds a defection's public fact as usual; a captive whose master knew of it is seen on the road
    home as soon as it is let go. A defector its new master posts as a spy at its old master's court
    is hidden there like any spy (see "A spy at a court is hidden from it"), so the old master's cover
    holds; one sent there as an envoy stands before the king and ends it. (Until Build order item 4 a
    spy posted at a court was listed in that court's view with its employer, "at your court",
    `docs/rounds/2026-10-18-sleep-and-simulation.md`, question 19, bug 4, and a defector posted at its old
    master's court ended the old master's cover when it arrived.)
  (Until the simulation-fixes round the master's list showed
  the truth at once: a caught spy "at court, ready for a mission", a detained envoy "has not
  returned" the same season, a defector dropped off the list and its wage stopped, an executed spy
  vanished.)
- **Losses abroad travel with people** (since Part G of the simulation-fixes round, the user's
  decision on the back-pay loophole). A spy caught at a court, and a captive put to death there, are
  the talk of that court (`GameState.Losses`, one `LossAbroad` each: the season, the court, the
  servant, and whom it served as that court knows it, which is known only if it confessed when
  caught). Other courts hear of it only from carriers: an envoy received at that court hears of each
  captive it still holds with a chance of its skill/100 (as it notices other envoys there), and of
  each servant it put to death in the season of the death or the 3 after (`TurnEngine.LossNewsSeasons`)
  with a chance of 0.4 + skill/200 (as it notices the court's catastrophes); a spy posted there
  hears of the captives with a chance of its skill/100 and always of the deaths (as of the court's
  catastrophes). The lines go into the carrier's report like its other observations: "Assyria holds
  Mane, a spy of Babylonia, captive (caught in turn 4)."; "Assyria put Mane, a spy of
  Babylonia, to death in turn 6."; and, for one that never said whom it served, "a spy who will not
  say whom they serve" / "a spy who would not say whom they served". Each begins with the court's
  name, so a bribed script envoy leaves it out with the rest of what it saw of the host. A captive no
  longer held (ransomed, released or turned) is not talked of, so a turn is not given away; nor is a
  captive the carrier itself. The draws come from their own stream (`losses-heard`), so nothing else a
  carrier notices changed. A carrier's word does not end its own master's cover (as a detained envoy
  seen by a fellow envoy did not before): only the existing news does (see above). Detained envoys
  were already talked of the same way ("held there against their will"). The rulebook, under WHAT YOU
  SEE: "Word of captives and executions travels with people: an envoy received at a court, or a spy
  posted there, may hear which servants of other courts it holds captive and whom it has put to death
  within the last 3 seasons, and brings that home in its report. Other courts' envoys and spies hear
  the same at yours." (tested). Nothing yet weighs this news: no script king or script character
  reads these lines (the bots' crude letter sentiment counts none of their words), and the check the
  design document intends, characters wary of a court that loses or executes its people, is not built
  (see Not built yet). (Until Part G only the dead servant's own king, and any court that still
  believed it served it, heard of an execution, and nobody but the captor heard of a capture.)
- **Ransoms.** A captor's ransom order sends its demand to the captive's king as a rumour (one or
  two seasons on the road); for a captive its king has dismissed, to that king. A captive has one
  open demand: a new order replaces the old one. A replaced demand whose word is still on the road
  goes at once and announces nothing; one the payer has heard of stands, at its price, until the
  new demand's word arrives, so the payer never sees a demand vanish before the next one reaches it.
  A rumour for a captive since freed, turned or put to death announces nothing and wakes nobody. A
  demand can be paid only once its rumour has arrived, and lapses if it is not paid in the four
  seasons after it was made (the captor is told "No ransom came", unless a newer demand for that
  captive is still on the road). `pay_ransom` is refused before the demand has arrived ("no ransom
  demand for Mane has reached you"), once the payer can see that the captive is no longer held by
  that court ("Mane is no longer held by Mitanni"), and while a ransom for that captive is on its
  way ("a ransom for Mane is already on its way"), a second order in the same season included.
  Captors' orders resolve before ransom payments, whatever the order of the courts, and resolution
  checks the payment again: if the captor let the captive go that season, a payment that cannot be
  sent costs nothing, and the payer is told ("Ransom not sent"). The gold travels on its own; the
  captor keeps it and frees the captive if it still holds them. A payer who has not heard that its
  captive was put to death, or turned, still pays, and the gold is lost. Ransoming or turning a
  captive whose kingdom has fallen is refused, with the reason: "Mane's kingdom has fallen: nobody
  is left to pay. Mane remains your captive."; so is turning a captive whose king dismissed it (see
  Dismissal). The rumour reads "(order pay_ransom for c7)", the order's name in the schema. (Until
  the simulation-fixes round every ransom order added a demand and a rumour, a payment was accepted
  for any open demand, even once the captive was free, and those captive orders did nothing in
  silence.)
- **Authentication**: genuine tablets read genuine 95% of the time (else inconclusive). Forgeries
  are detected with chance 20% + spend/200 − forger skill/150 (5–95%), and traced to the forger's
  employer with chance 30% + spend/400 (30–80%), which is announced to every court. A forgery that
  is not detected reads exactly as a genuine tablet that reads genuine ("The seals are genuine.").
  (Until the simulation-fixes round's review it read "The seals appear genuine.", which gave every
  missed forgery away.) A forged inventory is traced to the envoy who forged it, not to a court (see
  "Swapped inventories" under Communication).
- **Catastrophes**: 3.5% per power per season. Drought halves income for three seasons; plague cuts
  a quarter for two and kills a unit; floods and earthquakes zero one province for two or four
  seasons. The stricken power is told exactly. A court whose sight (before the catastrophe) covers
  the stricken land hears of it the next season as a plain fact, a notice "News from nearby"
  ("Travellers say the harvest has failed in Hatti."): for a drought or plague, any province of the
  stricken realm in sight; for a flood or earthquake, that province. Distant courts learn of it only
  through their envoys and spies, who observe catastrophes at the courts they visit or watch. The
  rulebook says so. (Until the simulation-fixes round every other court got a rumour, capital to
  capital, worded accurately, exaggerated or understated at random, with no carrier and no motive.)

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
  (`commitments`, logged in the message trail); that is the character's decision, by design.
- Every state-changing output uses structured output (a JSON schema). Orders face the same
  validator as any seat. An unreadable reply is retried once with the error; then the runner
  uses a script decision for that call and logs the failure.
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
  seasons it gave orders in full: its notes, the audiences it held (what it said to whose envoy) and
  its orders. Older seasons leave the record, and the request says which turn's notes leave it after
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
- **Audience requests** carry, besides the treasury, the count of lands and the tablets held, the
  host's own land and troops ("YOUR LAND: …. YOUR TROOPS: army in memphis, …") and the season's news
  as its orders request shows it ("NEWS THIS SEASON"), so a host does not tell an envoy that a city
  is his when the news says the purchase failed. (Until the simulation-fixes round it had neither.)
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

## Pacing: sleeping seats

Sleeping seats are on by default (since 18 October 2026, the design document's "Decided: sleep is
the default"; `--sleep off` in the batch runner, or the checkbox under Customize in the web app,
switches them off so that every seat is asked every season, for comparison). The world still
advances every season, but a model or file seat sleeps after every set of orders and is asked
again only when something concerns it or the hidden cap is reached: a king never chooses when he
wakes (the document's "Decided: sleep is the default" and "No triggers of the seat's own"; since the
fix pass after item 4, save version 5). Script and human seats play every season as before. There is never a global skip, and each seat
sees only its own wake-ups. With sleeping seats off, a king reads nothing of any of this: no sleep
sections in the rulebook, no sleep fields in the schema, no opening sleep line.

- **Asleep.** The seat is not called for orders (an envoy at its door is received in an audience
  call; see below). Its units hold, and the orders it scheduled for that season run. Nobody is told
  that it sleeps.
- **Sleeping after every call.** A seat never asks to sleep: after every orders call it answered
  itself, it sleeps. Having given orders in turn t, it is woken at the start of turn
  t + 1 + `MaxSleep` at the latest, unless something concerns it sooner. It cannot name a season to
  be woken in, nor set triggers of its own (see "Kings never choose when they wake" below). When
  the script king stands in because a call failed, the seat does not go to sleep: it is asked again
  next season (see below).
- **Kings never choose when they wake** (the fix pass after item 4; the document's "Decided: sleep
  is the default" and "No triggers of the seat's own", dropped 19 October 2026). Until then a king
  could name a season to be woken in (`wake_in_turn`, holding only until it was next woken) and set
  up to 8 triggers of its own (`wake_on`: a unit moving, one of its people back at court, its
  treasury falling below an amount, foreign troops entering a province, a province changing hands,
  each firing on a change after it was set). In the second agent simulation the kings named the very
  next season in 114 of their 130 orders replies, and sleep saved 6 of 136 orders calls; their own
  triggers rebuilt the "own envoy home" wake-up that the simulation-fixes round had removed. All of it
  is gone: the schema has no `sleep` field, a reply that still carries one is read as if it did not
  (`Parse.Orders`, tested), the view no longer reminds a king of a season it named, and the batch
  seat report has no "n" for a sleep that ended in the season named. Only the engine's own triggers
  (below) and the hidden cap wake a king. The document's option to raise or lower a default
  trigger's priority was never built, and is not now.
- **What wakes it**, and nothing else. These are checked each season after the arrivals and
  reports, from the seat's own view only. An envoy waiting wakes it for its audience only (since
  Part H of the simulation-fixes round; see the next bullet); every other reason is an order
  trigger, which reopens its orders directly, without asking:
  - an envoy waits to be received at its court (an audience only, unless an order trigger fires too)
  - foreign troops entered its land last season ("foreign troops entered your land: Assyria's army
    moved ekallatum -> sippar"; a move counts as into its land if it held the province before the
    moves)
  - **temporary, until sieges and walls on homeland provinces exist; revisit with the siege
    package:** foreign troops (an army or a fleet) ended a move last season in a province next to
    its capital (one link of any kind), seen by the seat, while it still holds its capital ("foreign
    troops came next to your capital: Hatti's army moved isuwa -> sapinuwa"). With no walls on
    homeland provinces an army there can take the capital the next season, so a sleeping king must
    not first hear of it when the capital falls (the user's addendum to the simulation-fixes round).
    Only the arrival wakes it: troops that stay where they are, a move that failed, the seat's own
    troops, and any move once the capital is lost do not (tested). A move into its own land next to
    the capital gives both reasons. The replay numbers count it as its own kind.
  - **a threat to a home province or a walled city** (since the fix pass after item 4): foreign
    troops ended a move last season in a province next to another province of its homeland that it
    still holds ("foreign troops came next to your homeland: Egypt's fleet moved delta ->
    greatgreen, next to tamassos"), or, with none of its homeland there, next to a walled city it
    holds, which today is a city it bought ("foreign troops came next to a walled city of yours:
    Mitanni's army moved washukanni -> terqa, next to mari"). "Threat" is read as the capital
    trigger reads it, from what the king could know: an arrival by a move the seat saw (its
    `LastSeen`; a province next to its own land is always in its sight), one link of any kind, so a
    fleet off a coastal province counts, as does a move within the mover's own land. Troops that stay
    where they are, a move that failed, the seat's own troops, a levy, and any move once the
    province is lost do not wake it; a move into its land wakes it as "foreign troops entered your
    land" alone, and a move next to its capital gives the capital reason alone (tested). The second
    agent simulation found both gaps: Alashiya saw Egypt's fleet beside an empty Tamassos only because
    an envoy woke it (seed 7), and Babylonia moved support to the walls of its bought Qadesh, next to
    Egypt's armies, only because an envoy woke it (seed 15); both kings named the gap in their
    debriefs. When item 5 retires the capital trigger, the capital falls under this one.
  - it lost land ("land lost: Sippar has been taken by Assyria.")
  - it lost troops: a unit destroyed in battle ("your army in sippar was destroyed"), unpaid troops
    deserting ("your unpaid troops deserted"), or a unit killed by plague ("plague destroyed troops
    of yours")
  - a scheduled or standing order could not be carried out: refused by the validator, failed as the
    season resolved (any of the failures under "Every refused or failed order"), a scheduled move
    that was stopped, with the battle report's reason ("orders you scheduled could not be carried
    out: sippar -> mari (the walls of mari held; your strength 1 against 1)"), a scheduled support
    that was cut ("... (the support was cut by an attack from ekallatum)"), or a scheduled support
    or convoy that matched no move ("... (no unit moved from sippar to mari)"). A support or convoy
    whose unit was destroyed is not counted again: the lost troops already wake the seat. An order
    of a standing order that fired reads "a standing order of yours could not be carried out: s3:
    ...". So do orders refused when given ("orders you scheduled were refused: turn 7: nippur -> ur:
    you have no unit in nippur"; "standing orders you gave were refused: ..."), orders past the
    schedule's limits or for a season already past (refused like any other), and orders dropped
    because their unit is lost ("orders you gave for later could not be carried out: the troops they
    were for are lost (...)"; see "Orders follow their unit"). A reason that lists orders names the
    first three and counts the rest ("...; and 4 more, listed in the notice "Orders for lost troops
    dropped""): the notice in the same request lists every one, so the opening line stays short.
  - a ransom is demanded for one of its people
  - a servant gives notice ("a servant gives notice: Mane asks 20 shekels a season to serve on"):
    the season of the notice is the one in which it can be renewed before it leaves
  - the hidden cap is reached ("your counsellors woke you after a long sleep")
  - its kingdom falls, which ends its sleep ("the kingdom fell")

  A refused or failed order among those it gave for the season it was awake does not wake it: it
  reads why when next woken, and the rulebook says so. (Until the simulation-fixes round an envoy
  coming home, every report, candidates, catastrophes, forgeries, a caught spy, and foreign troops
  at its border or attacking it in vain woke it too: replayed through the engine, the simulation's
  two seed-7 games would have woken a sleeping king in 117 of 120 seasons.)
- **An envoy at the door: an audience, and the king judges whether to reopen its orders** (Part H
  of the simulation-fixes round, the owner's later instruction in `docs/ROUND-PROMPT-ADDITIONS.md`,
  section 4; it replaced an earlier plan in which an envoy could never reopen orders). The principle:
  a king sleeps while nothing changes, and when something happens it judges whether that alters its
  plan. Envoys were the most common reason a king woke, and an orders call costs about twice an
  audience.
  - When the only reasons a sleeping seat has are envoys waiting, the wake check does not wake it:
    it holds court asleep (`SleepState.HoldsCourt`), its orders stand, and its audiences are held
    as usual, one call per exchange, by the seat's own model at one effort level lower (the owner's
    rule that the seat's own model makes every decision; the lower effort is that of every
    audience, and whether the reopen choice, a planning decision, should be made at the orders
    call's effort instead is left to the owner). When a call fails the script king
    answers the envoy, but it decides nothing for the seat (see **A failed call at court** below).
    When an order trigger fires as well, the seat wakes as before and its audiences are ordinary
    ones (no realm in brief, letters or choice).
  - Such an audience opens "You slept 2 seasons (you last gave orders in turn 5). You were woken to
    receive an envoy: an envoy of Egypt waits to be received. Your orders stand unless you reopen
    them at your audience." In place of the old line of land and troops (and the treasury figure on
    the season line) it reads "YOUR REALM IN BRIEF (enough to judge whether the news changes your
    plan; you see the full map only if you reopen your orders)": the treasury with income, upkeep,
    wages and back pay owed; its land; its troops; foreign troops at or inside its borders as far as
    it can see (a foreign unit standing in its land, "(in your land)", or in a province next to its
    land, "(next to your byblos, enkomi)"; fleets at sea included); its scheduled orders by season
    and its standing orders, as in its view; its people at court and ready to be sent (id and name);
    and its other people with their duty and timing. Not the map, the standings table, the travel
    table, the other people it knows of or the troops elsewhere; the one line counting each power's
    lands ("Lands now: Egypt 6; Hatti 5; ..."), which opens every audience, stays, so the king can
    weigh an envoy's claims about who grows strong. "While you slept", the season's news, the
    tablets it holds and its journal follow as before, then the audience, which ends with "YOUR
    ORDERS STAND WHILE YOU SLEEP. At this audience you may also send envoys of yours who are at
    court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at
    the end of this season with everyone's orders and are checked first. Reopen your orders
    (reopen_orders) if the news changes your plan: you then give orders this season, with your full
    view, after your audiences. Otherwise your orders stand and you sleep on." Its schema adds
    `letters` (the orders' letter shape) and `reopen_orders`.
  - **Letters** sent from such an audience (`HostReply.Letters`: dispatch orders, or a letter to a
    court nobody knows, refused with the reason) are kept in the seat's state (`CourtLetters`) and
    validated as usual with the season's orders: they come first among the seat's orders, so their
    gold is reserved first. A later letter for the same person in the same season replaces an earlier
    one; a later exchange or audience shows the letters already sent and whether the king already
    chose to reopen, and, when they carry gold, "Gold already committed by these letters: 40
    shekels, not yet taken from the treasury you read here; it is reserved first when the season's
    orders are checked." (the treasury a king reads is the season's, so without it a king could
    promise the same gold twice and see its later letters refused; the orders request after
    reopening carries the same sentence after its list of letters). A letter cannot be cancelled,
    only replaced: by a later letter for the same person, or, after reopening, by an order for the
    same person. A refused letter is reported in its news like any order and, if it sleeps on,
    waits in its digest; it does not wake it (as with orders given for a season the seat was awake).
    The envoy before the king never hears of the letters or the choice (`HostReply.AsHeard`).
    Letters and the choice in a reply at an ordinary audience are ignored.
  - **Reopening.** If any of its replies that season (any exchange of any audience) says
    `reopen_orders`, then once the audiences are applied (`TurnEngine.CourtsHeld`) the seat wakes
    for an orders call that season, as an ordinary wake: its sleep ends with the envoys plus "you
    chose at your audience to reopen your orders", and the orders
    request opens "You were woken because: an envoy of Egypt waits to be received; you chose at
    your audience to reopen your orders." and lists the letters already sent ("LETTERS YOU SENT FROM
    YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order
    you give now for the same person replaces its letter): ..."). Otherwise it sleeps on: its sleep
    continues (the hidden cap still counts from its last orders), and the season's movements and reports go
    to its digest after the audiences. If its orders call that season then fails, it is asked again
    the next season like any seat whose call failed, told the envoys it was woken for but not "you
    chose at your audience to reopen your orders", a choice already spent.
  - **A failed call at court** (from the review of Part H). When a call fails at an audience held
    while the orders stand, the script king answers the envoy as at any audience, and its reply is
    marked (`HostReply.FromFallback`, set by the runner and logged, so replays stay exact). It
    decides nothing for the seat: its letters and its choice are ignored, and unless the seat chose
    itself, at another exchange, to reopen its orders, the seat wakes for an orders call that same
    season (its sleep ends with the envoys plus "your counsellors answered an envoy in your place").
    Only the seat's own model may choose to let its orders stand (the owner's rule, section 6.3), and
    an error toward reopening costs a call where the other error would cost the king a decision
    (section 6.2); before Part H the same envoy gave the seat an orders call that season anyway. Its
    own replies at other exchanges still count: their letters go out. (A first version let the
    stand-in's empty reply stand as "orders stand": the script chose to sleep on, nothing woke the
    king again, and the reopen rate counted the script's default as the king's choice.)
  - The journal records the letters given at each audience ("...: you said "..."; letters you gave
    at the audience: send c12 to Hatti"; whether each went out, or was refused or replaced, its news
    tells it), and an audience request shows "AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS",
    since a king whose orders stand may hold several courts before it gives orders again (this also
    shows a host its earlier audiences of the same season).
  - Each court held asleep is recorded (`SleepState.Courts`: season, envoys, reopened by its own
    choice, and whether the stand-in answered at it). The batch seat report has a `courts` column
    (held/reopened, with "(1 by stand-in)" for courts where a call failed and the king was asked
    for orders without choosing) and a line "Courts held while orders stood: 5; orders reopened at 2
    (40%).", and the batch summary gives the same over all games; courts the stand-in answered at
    are counted apart and left out of the rate ("...; orders reopened at 1 of the 4 where the king
    chose (25%); at 1 a call failed, the stand-in answered and the king was asked for orders without
    choosing (left out of the rate)."). The reopen rate is to be learned from the next agent
    simulation. Not built: the planned fallback if the rate is high, offering the reopening only for
    some kinds of message (see "Not built yet").
  - With sleeping seats off every king gives orders every season and its audiences are exactly as
    before (tested). Measured on both seed-7 games' 146 logged audience calls (characters / 3.6),
    an audience held asleep is about 1,400 tokens larger than before (about 11,900 against 10,500;
    the schema +750, the realm in brief +240, the rulebook +230, the audience's closing paragraph
    +125, the journal +55), and an ordinary audience about 280 larger (the rulebook and the journal).
- **Changes, not states** (the user's rule for Part G of the simulation-fixes round: a trigger on a
  standing condition wakes a king every season and defeats sleeping). The engine's reasons above are
  all events or arrivals: an envoy waiting is one that arrived this season (audiences are cleared
  each season), foreign troops are counted when they move in or arrive next to the capital, the
  homeland or a walled city, land and
  troops when they are lost, failures, notices and ransom demands when they come. A foreign levy
  raised next to the capital or the homeland is not an arrival by a move and wakes nobody (levies are not among the
  moves a seat sees).
- **The digest.** Everything else waits for its next waking, as "WHILE YOU SLEPT": first "in
  brief", one line for each troop movement it saw ("turn 5: Egypt's army moved gaza -> megiddo";
  "turn 5: Assyria's army tried to move ekallatum -> sippar (against your troops) and failed") and
  for each envoy home with its report, spy, check, assay or examination report, candidate,
  catastrophe that killed no unit, forgery ready, spy caught at its court, refused or failed
  order, and standing order that fired ("turn 5: your envoy Mane came home with a report"; "turn 6:
  your standing order s1 fired", dated by the season it fired, as movements are by the season they
  were made, while the other lines carry the season their news came); then the news of those seasons in
  full, oldest first. Rumours and notices are only in the news. To stay readable over a long
  sleep, the routine treasury notices of the seasons it slept are left out (this season's is in
  its news; one that says troops deserted or people went unpaid stays), the brief keeps the latest
  60 lines and the news the latest 40 items, each saying how many earlier ones were left out.
- **What the kings are told.** Right after HOW YOU WIN the rulebook says: "After you give your
  orders, you sleep. Only these wake you, because they concern you: an envoy at your door; foreign
  troops in your land, or arriving next to your homeland or a walled city you hold; land or troops
  lost; a scheduled or standing order
  that failed; a servant giving notice; a ransom demanded. You cannot ask to be woken, at a season
  you name or for anything else. If none of these happens, you sleep on: you may sleep for the rest
  of the game. So plan as if these orders must carry your kingdom until it ends: schedule what your
  armies should do in the seasons ahead, give standing orders for the attacks you fear, and leave
  your envoys mandates that stand on their own. When you are woken to receive an envoy, reopen your
  orders if the news changes your plan; otherwise they stand." It follows the document's decided
  text ("What the kings are told") with these changes: "a failed order" is "a scheduled or standing
  order that failed", to stay true; the list of what wakes a king names the engine's triggers as
  built; the sentence on reopening is the owner's, from Part H; and the decided "Nothing else wakes
  you, and you may not be woken again for the rest of the game" is said plainly instead ("Only these
  wake you"; "If none of these happens, you sleep on: you may sleep for the rest of the game"), since
  six of the fourteen kings debriefed after the second agent simulation read it as a contradiction of
  the list before it ("It should say plainly that the listed events wake you and nothing else does",
  Mitanni, seed 7). Until the fix pass after item 4 the list ended "or news you asked to hear" and
  the plan "set the triggers you want". A section
  "PLANNING AHEAD (how sleeping works)" follows with the mechanics: an envoy at the door ("An envoy
  at your door wakes you for the audience only. You read your realm in brief (...), answer the envoy
  as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at
  the end of the season with everyone's orders and are checked like orders you give, before them.
  Then you choose: reopen your orders, and after your audiences you give orders this season with
  your full view, as when anything else wakes you; or let them stand and sleep on. Anything else
  that wakes you reopens your orders without asking (your audiences still come first)."); which foreign troops wake the
  king ("Foreign troops wake you when they move into your land, and when they end a move in a
  province next to your capital, another province of your homeland or a walled city you hold, while
  you hold it (troops there can take it the next season). Troops that only stay where they are do not
  wake you again, nor do troops raised by a levy."); scheduled orders, naming units
  by where they stand now, and their limits; the march; standing orders; which failures wake; and
  the digest. The seat's view lists its scheduled orders
  by season and its standing orders by id, each of its units named by where it stands now ("- turn
  4: the army now in durkurigalzu -> nippur"; "- s1: when your army now in sippar is attacked,
  then: the army now in babylon -> nippur"). Every request, for orders and for
  audiences, opens with one line: "You slept 3 seasons (you last gave orders in turn 5). You were
  woken because: foreign troops entered your land: ..." (an audience held while its orders stand:
  "... You were woken to receive an envoy: an envoy of Egypt waits to be received. Your orders stand
  unless you reopen them at your audience."). Woken in the season after its orders it
  reads "You gave orders last season (turn 5). You were woken because: ..."; in the first season,
  "This is your first season."; and if it has never answered itself (its first call failed), "This
  is the first season you give orders." An audience request carries "WHILE YOU SLEPT" (the brief
  and the news of the seasons slept) as the orders request does, before the season's news: an
  envoy at the door is what most often wakes a king, so the audience is usually the first thing it
  reads on waking.
- **The cap is hidden**: `MaxSleep` = 12 seasons (`--sleep-cap N`, or the hidden safety cap box in
  the web app). It is in no rulebook, schema or view (the view only says whether the seat sleeps),
  and the reason it gives says nothing of it. A placeholder, to be set from the next games'
  wake-up data. It stays hidden only until it first wakes a seat: the opening line then reads "You
  slept 12 seasons (...). You were woken because: your counsellors woke you after a long sleep.",
  so a king that reaches it can count it, and from then on
  it may anchor that king's plans. Both the exact count and the neutral reason were decided; a
  way out, left to the user, would be to vary the cap a little for each sleep (from
  `Rng.For(seed, turn, "sleepcap", power)`). The batch seat report prints, per seat, the courts it
  held while its orders stood and at how many it reopened them ("held/reopened"), how many
  seasons each sleep lasted ("+" for a sleep still
  running at the end; the seasons it held court asleep count as slept) and every reason it was
  woken, counted by kind over its sleeps.
- **Scheduled orders**, kept secret in the seat's own state, for any later season, at most 24
  orders a season and at most 40 seasons. An entry for a season after the game's last (`MaxTurns`)
  is kept, listed and counted like any other and simply never runs, because the game ends first:
  what the king reads and the notices it gets are the same whatever `MaxTurns` is, so nothing tells
  it when the game must end (tested). What is not kept (a season already past, orders past the
  24th, seasons past the 40th) is reported as "Scheduled orders not kept", and wakes the seat like
  any other refusal (the rulebook: "orders past these limits are refused"). One entry per season
  replaces everything scheduled for it, and an empty entry cancels it; that works for the current
  season too, and then its orders count as given now (they are not bound to units, and a failure
  among them does not wake the seat, as the rulebook says of the orders given for the season the
  seat is awake). They are validated when they run, after the seat's fresh orders for that season
  and the orders of its standing orders that fire (the rulebook says so), so the gold they need is
  reserved last. In a season when the seat is awake, a fresh order for a unit or a person replaces
  the scheduled one for it, a scheduled order the seat repeats runs once, and the other scheduled
  orders still run. A renewal is not a task: a fresh renewal replaces a scheduled renewal or
  dismissal of the same person, and a fresh dismissal a scheduled renewal, but a renewal and an
  errand for the same person both run (the rulebook says so in a clause). A failed scheduled order
  wakes the seat next season; a failure the seat has already seen in its news, while awake, does
  not wake it later.
- **Orders follow their unit** (since the simulation-fixes round; before, a unit was named by where
  it would stand in that season, so a planned march failed at its first bounce). In `schedule` and
  in standing orders the king names each of its own units by the province it stands in when it
  gives the orders. The engine binds the order to that unit's id (`PlannedOrder.UnitId`), and an
  own unit named as the unit supported or the army convoyed too (`OtherUnitId`); a foreign unit, or
  walls, stay named by province, and an order for no unit (a levy, an errand) runs as given. When
  the order runs it is given from where its units then stand (`TurnEngine.AsItStands`). An order
  naming a province where the seat has no unit, or a unit not its own, is refused when given, in the
  validator's words ("- turn 7: nippur -> ur: you have no unit in nippur", in "Scheduled orders not
  kept"; "the unit in X is not yours" only where the seat can see, see "Sight"), and that wakes the
  seat next season (a unit a levy is to raise is named as below). An order the reply named
  but left unreadable is refused when given in the same way. When a unit is lost (destroyed, deserted, killed by plague, disbanded or given away), every
  scheduled order bound to it is dropped, and so is a standing order that waited on it or has no
  orders left (a standing order's other orders stay). This is checked at the start of each season,
  before the wake check: the seat reads "Orders for lost troops dropped", listing each order as it
  gave it, and is woken ("orders you gave for later could not be carried out: the troops they were
  for are lost (...)").
- **Scheduled orders for new levies** (since the fix pass after item 4). A unit a levy is to raise
  is named by the province of the levy: in a scheduled order for a season after a levy of the seat's
  in that province (a levy accepted among the orders it gives now, or one it scheduled for an earlier
  season), the name means the levy's unit, the latest such levy before the order's season, even
  where another of its units stands there now (so "turn 2: durkurigalzu -> nippur; raise army in
  durkurigalzu; turn 3: durkurigalzu holds" gives turn 2's march to the army there now and turn 3's
  hold to the new army). The order waits for the levy (`PlannedOrder.UnitLevy`, or `OtherLevy` for
  the unit supported or convoyed); when the levy raises its unit, at the end of its season, the order
  is bound to it (`TurnEngine.LevyRaised`) and follows it like any other. If the levy raises none
  (refused, failed, or replaced before it ran), the orders waiting for it are dropped once that
  season's levies are raised (`TurnEngine.UnraisedLevies`): the seat reads "Orders for a levy that
  raised no unit dropped" ("These orders were for troops a levy was to raise, and it raised none, so
  they were dropped:", then a line for each, "- turn 3: the army to be raised in sippar in turn 2 ->
  mari") and is woken
  ("orders you gave for later could not be carried out: the levy they waited for raised no unit
  (...)"). Until the levy's season the view names the unit as "the army to be raised in ur in turn
  2" (`TurnEngine.AsShown`). A levy in the same season as the order does not count (the levy is
  placed after movement, so its unit can first be ordered the season after), and standing orders,
  which have no season, name only units standing now. The rulebook: "A unit you raise can be given
  orders ahead too: name it by the province of its levy, in orders for any season after the levy (a
  levy you order now, or one you schedule). In those seasons that name means the unit the levy
  raises, even if another of your units stands there now; if the levy raises none, those orders are
  dropped, which wakes you. Any other order naming a province where you have no unit is refused."
  Until then an order naming a province where the seat had no unit was refused, so a new levy could
  not be given orders ahead: one of the reasons the kings of the second agent simulation gave for
  naming the very next season to be woken (tested).
- **The march.** A unit's scheduled moves are its march. After movement, a scheduled move whose
  unit still stands but did not reach its destination (stopped for any reason) is tried again the
  next season, and each of that unit's own later scheduled orders moves a season later (orders of
  other units that were to help it do not); the seat reads "A march is held up": "Your army in
  babylon did not reach durkurigalzu in turn 2. It will try again in turn 3, and each of its later
  scheduled orders waits a season (they now run in turn 4)." A move tried again that is stopped
  again ends the march: the unit's remaining scheduled orders are dropped ("A march ends": "Your
  army in babylon failed to reach durkurigalzu a second time in turn 3: its march ends, and its
  remaining scheduled orders were dropped: turn 4: babylon -> nippur."). A scheduled move refused by
  the validator is not tried again (it would be refused again from the same place) and ends the
  march the same way. Each failure is a failed scheduled order and wakes the seat, which sees the
  shifted plan in its view. A refused move with no later orders to drop is told only as refused (no
  "A march ends" notice). Only scheduled moves form a march: a move given for the season the seat
  is awake (or in the schedule's entry for that season) that is stopped is not tried again, and the
  unit's scheduled orders run from where it stands. Shifted orders are not counted again against
  the limit of 40 seasons. (The brief allowed a refused move to be tried again too; the round's
  plan for this part did not, and that is what is built.)
- **Standing orders**, at most 12 (`standing_orders`), kept in the seat's own state until they fire
  or are cancelled (`cancel_standing`: ids, or "all"; an unknown id is reported as "Standing orders
  not cancelled"). Each has an id per seat ("s1", "s2", ...), one event and up to 24 orders, unit
  orders and other orders in the same shapes as the schedule, bound to units as scheduled orders
  are. **A standing order answers a move in the season it is made** (since the fix pass after item
  4). The events: `unit_enters`, a unit of the power named (any foreign power's if none is named;
  never the seat's own then) sets out to move into the province named; `unit_attacked`, a foreign
  unit sets out to move into the province where the seat's unit stands as the season begins (named
  by where it stands when the order is given). Each fires on the move as it is ordered, whatever then
  becomes of it (a move stopped at the border still sets it off), and only on a move the seat can
  see: one from or into a province in its sight as the season begins (`TurnEngine.StandingFires`).
  The moves are those each seat was ordered to make this season (its fresh orders, its letters and
  its scheduled orders, or the stand-in's), as the validator accepts them, before any standing order
  fires: a standing order never answers what another standing order gives, so the season still
  resolves in one pass and the result does not depend on the order seats are read in. A move of the
  seat's own does not count (tested, each filter). A standing order first fires in the season after
  it is given. It fires once: its orders are given from where their units stand as the season
  begins, replace scheduled orders for the same units or people (so "when the army in sippar is
  attacked, it holds" stops the march it was scheduled to make), and give way to fresh orders the
  seat gives that season (cancelled in that season, it does not fire). Two that fire in the same
  season go by id: the lower id's orders replace the other's for the same units or people, so they
  never reach the validator as two orders for one unit (the rulebook says so). A fired move that is
  stopped is a failed order, but not a march: it is not tried again. It is then removed, and once
  the season's orders are checked the seat reads "Standing order s1 fired", saying what became of
  each of its orders: "Your standing order s2 (when Assyria's troops enter arbela) fired in turn 3:
  Assyria's army set out from ekallatum for arbela. It gave these orders: durkurigalzu holds.
  Replaced by standing order s1, which fired in the same season: babylon holds.", with "Refused:
  sippar -> ur (an army in sippar cannot reach ur)." and "Replaced by the orders you gave for turn
  3: ..." where they apply. Firing does not wake the seat (the digest has "turn 3: your standing
  order s1 fired"); an order of it that is refused or fails does ("a standing order of yours could
  not be carried out: s1: babylon -> durkurigalzu (it met a move into durkurigalzu from ekallatum
  ...)", tested). A standing order that cannot be kept (a province that does not exist, no unit of
  the seat's where `unit_attacked` names, no orders or more than 24, an order naming a province
  where the seat has no unit, a power nobody knows, or a thirteenth) is refused whole ("Standing
  orders not kept"), which wakes the seat next season; the rulebook and the schema give both limits.
  Cancellation is applied before the season's standing orders fire, new standing orders after the
  season's orders are checked. The design document's wider vocabulary ("unless" conditions,
  treasury below, envoy returned, tablet sealed) is not built (item 6).
  - **Why same season** (the fix pass after item 4; the document's "Status of sleeping seats":
    "standing orders that fire a season late"). Until then a standing order's event was checked after
    movement, from what the seat saw (`unit_enters`: the unit got there; `unit_attacked`: the unit
    was still there afterwards), and its orders ran the next season. That is the season a king woken
    by the same event gives orders anyway, so a standing order did nothing waking could not: no king
    gave one in 130 orders replies of the second agent simulation, and five of the fourteen debriefs
    said why ("it cannot help against a lethal attack, and it comes a season late", Hatti, seed 7;
    "they should also say what standing orders can do that waking cannot", Arzawa, seed 7). Answering
    the move as it is made is what the document's own example needs ("if Hatti enters Mira, support
    Mira"), and what commanders on the spot could do within a season. The rulebook ends its paragraph
    on standing orders: "This is what a standing order can do that waking cannot: woken, you would
    answer the blow only the season after it fell." The seat's view no longer says "(it fires this
    season: ...)", since no seat knows in advance whether a standing order will fire.
- **When a model call fails** and the script king stands in, the seat has not seen that season:
  it is not put to sleep, its digest and its "while you slept" window are kept, and it is asked
  again next season, told why it was woken in the season it missed (it never read that) and what
  concerns it now, as if woken, or, if nothing does, "your counsellors woke you". Those reasons are
  carried, without repeats, until the seat answers itself. The stand-in is not the seat: the seat's
  own plans for that season go first (the standing orders that fire, the scheduled orders due, a
  march's step tried again), and the stand-in's orders only fill the units and people they leave
  free; it neither replaces the schedule nor cancels standing orders. (Until the review of Part D its
  orders counted as the seat's own fresh orders, so the script king's holds used up a standing order
  that fired that season and dropped the scheduled moves due, and the seat was told that "the orders
  you gave" replaced them.) A call that fails at an audience held while the seat's orders stand
  is answered by the stand-in too, and the seat is then asked for orders that same season (see
  "A failed call at court" above).
- **What a human player can tell.** No seat's view and no event carries another seat's sleep (the
  web app shows it only in the God view, which with humans playing needs Reveal all). But the web
  app's model-spend pill, shown to the operator and so to a human at the table, rises only when a
  model seat is called, and the orders phase returns at once when every model king sleeps: season by
  season, a human can tell whether any model king was asked. This is accepted as operator
  information (the pill is for whoever pays), not hidden.
- **Replay.** Sleep state lives in `GameState`, and the log header records which seats may sleep,
  so replays stay exact with sleeping seats on and off (tested). With sleeping seats on, every
  season is also marked in the log (`t<turn>/season`), since a season can pass with no seat asked.
  A saved game with sleeping seats can be continued only by seats that can sleep for exactly the
  same kings. A game of script kings has no seat that sleeps, so it plays exactly as with sleeping
  seats off.

## File seats and the agent simulation

A file seat (`--file-seats DIR|map.json` in the batch runner) is a model leader seat whose
"model" is a pair of files. It writes exactly what a model king would get (rulebook, customs
primer, identity, the season's view, journal and JSON schema) to `<folder>/<key>.request.md`, and
waits for `<key>.reply.json`. The engine validates the reply like anyone's. Because no API enforces
the schema here, the file seat checks the reply's types and enum values itself (missing fields are
read as empty, as "none"), and forgives a code fence or a stray line around the JSON. A reply that
is unreadable, breaks the schema, or stays empty gets one retry request saying what was wrong; a
second failure, or `--file-timeout` (120 minutes), falls back to the script king, as for models.
Each exchange is logged as a call with no tokens, and replays are exact. File seats sleep after their orders, as model seats do.
Requests and replies left in a folder by an earlier game are moved aside when a new game starts.
Only a file seat's request ends with a footer for the agent answering it (`FileExchange.Footer`):
its final message must be the single word "done", and earlier reply files cannot be read, so its
record of earlier seasons is in the request. A model king called through the API never sees it.
The request prints the schema indented, but with each field (an object that holds no other object:
its type, enum and description) on one line, and without escaping apostrophes
(`FileExchange.Readable`): the same schema, 14,681 characters in 219 lines for the orders schema
with sleeping seats on, against 21,361 fully indented, and no line longer than 414 characters, well
under the 2,000 past which an agent's file reader cuts a line (a one-line compact schema would be
cut). The schema itself grew with Part D's schedule and standing orders, which repeat the unit and
other-order shapes (standing orders' copy without field descriptions): 12,134 characters compact
with sleeping seats on (schedule 3,041, standing orders 1,949), 5,560 off. Part E's notes, summary
and ledger fields added 1,000 of those characters (on or off) and Part G's wording of the wake
triggers 68 (on only); before them it was 11,066 on and 4,560 off, and 13,502 printed in 205 lines. Sharing the shapes through
`$defs`/`$ref` would cut that further, but is not done: it is untried against the API's structured
output, and the file seat's own schema check would have to follow references. Since the fix pass after item 4 the
orders schema has no `sleep` field (no season named, no triggers of the seat's own): with sleeping seats on it is 10,933
characters compact (12,134 before) and 13,202 as a file seat reads it (14,681 before); the rulebook grew 309 characters
(30,579 to 30,888, sleep on, with the primer) with the sleep paragraph, the threats that wake a king, standing orders
answering a move as it is made and orders for new levies.

**File characters** (`--file-characters DIR|map.json`, item 4) do the same for envoys, spies and candidates: every
decision a model character makes (its speech abroad, each reply at an audience, its report home, a pitch, a spy's
report and a memory summary) is written as the exact request a model character gets (`LlmCharacterMind`: the shared
character system text, its persona, facts and memory, the situation and the schema), with the same footer, to that
character's own folder, and the reply is checked like a file seat's. A request says "Decide as yourself" where a king's
says "Decide as the king". A missing or unreadable reply (one retry, then `--file-timeout`) falls back to the script
character for that decision and is logged as a failed call. Replies are logged as decisions, so a game replays exactly
without the files. Which characters: every character in the seed's pool, because any of them can be hired, sent as an
envoy or posted as a spy, and the pool is fixed when the game is made (18 characters, `GameConfig.CharacterPoolSize`;
nothing adds one later). `--list-characters` prints a seed's pool (id, name, origin and how it starts, no traits or
secrets) for the kit. A map names a folder per character id and carries `"seed"`: ids are numbered by the game's own
counter and differ from seed to seed, so a map made for one seed is refused for another. A character left out of the
map is a script character; city-states stay scripts and the narrator stays the template. File characters do not mix
with `--characters haiku|sonnet`.

**The script's shadow.** For each decision a model character makes, through the API or as a file character, the runner
also logs what the script mind with the same traits decides in the same situation (`ShadowDecision`, a `"shadow"` line
in the log). `ScriptMind` draws only from streams keyed by seed, season and character (`Rng.For`), never from the
game's own generator, and changes nothing it reads, so the shadow changes nothing: a test plays the same game with and
without it and gets the same state and the same decisions. The shadow line holds the character's traits, what it faced
(gold carried, a gift or a post offered), what the engine knows happened that a report should not hide, and both
decisions with what `CharacterChecks` found in their words. The checks read words, not meaning: a report "hides" a gift
the envoy took if it never speaks of gold or a gift given to the envoy itself, a detention if it never speaks of being
held, gold kept on the way out if it never owns up, a threat to its lord if it carries no threat at all, an offer of
service it declined if it never mentions service; it "contradicts" the engine if it says the king sealed when nothing
was sealed. A speech abroad "softens" a threat to the host if the letter had one and the speech has none. A spy "passes
on" its secret masters' words if most of their longer words are in its report, and "leaves out" an observation if fewer
than half of its names, numbers and longer words are. An invented promise or a false account of a king's mood passes
the checks, so a reader confirms the flagged reports. The batch runner prints the comparison after the seat report
(`BatchRunner.CharacterReport`: gold kept and its size, inventories swapped, gifts and posts taken or refused,
commitments, each flag, spies, pitches, and the same per character), and the size of every kind of request
(`BatchRunner.CallSizes`: file requests in characters, and tokens at 3.6 characters a token; API calls by their input
tokens). A file request's length is logged with its call (`ModelCall.RequestChars`).

`sim/` holds a kit that plays a game with one Claude Code agent per king and, since item 4, one per
character, with isolation enforced by construction, not by instruction: see `sim/README.md` and
`docs/SIMULATION-PROMPT.md`. Starting values for the first experiment, all settings rather than rules:
seed 7; `--max-turns 10` (the game stops after season 10, whatever the random end; the kings are not
told, and their rulebook still says no game ends before turn 15); `--sleep-cap 6`; script characters
and the template narrator; kings on Sonnet 5.5, the design's default leader model. For the second
(item 4): seeds 7 and 15, ten seasons each, sleep on with the default hidden cap (12); kings on
Sonnet and characters on Haiku, the design's defaults ("Every model is the table's choice"); every
character of each seed's pool is a file character with an agent of its own (`setup.js --seeds 7,15`
makes 36, named `char-` and 8 random hex digits, with the same guard as the kings); city-states and
the narrator as before. `check-isolation.js --dry` checks the walls without starting an agent, by
running each agent's own hook on the isolation test's steps; the live test still runs first in the
playing session. `stub-replier.js` answers requests with the plainest valid reply, to prove the
plumbing without model calls. `audit.js` allows an agent in play to read only the request file its
prompt named, since a character could otherwise open an older or newer request of its own and learn
what has happened since the season it writes of (a debrief, which names earlier requests to reread,
may read any of its own); until item 4's review any request file in its own folder passed. The
simulation's live isolation test, like local play's, counts only what was logged from the time noted
before it (`--since`).

**Local play on a Claude subscription** (item 4). A fourth way to play, for the developer's own games: the web app,
run on this computer, with a human seat against kings played by the same guarded king agents, answered in a Claude Code
session on the subscription instead of through paid API calls (`sim/README.md`, "Local play"; `docs/PLAY-PROMPT.md`).
A king set to `LeaderKind.LocalAgent` ("Local agent") is a model leader seat whose asker is a `BridgeExchange`: a file
seat whose files are written by the local bridge, `sim/bridge.js`, since a web page cannot write files. The page builds
the request text itself (`FileExchange.Request`, with a one-off mark where the reply's path goes) and posts it with the
king's name and the request's file name; the bridge, which alone knows the folders (`sim/kings/seats.json`), puts the
reply path in and writes `<name>.request.md` into the king's folder, and the page asks it every second for the reply
until it comes. The reply goes through the file seat's checks, one retry and fallback (`FileExchange.Converse`, shared
by both); after the table's wait (`SeatChoices.LocalAgentMinutes`, 60 minutes by default) the script king stands in for
that decision, and a request that times out, or whose game is stopped, is taken back (moved aside by the bridge), so
that no agent is started for it later. Each exchange is logged as a call with no tokens ("local agent"), so a game
saves, continues and replays like any other; a saved game reads its local agent kings back from the header's labels.
Local agent kings sleep like model kings, so usage follows events. They need no key and cost nothing in the game's
meter. The bridge listens on 127.0.0.1 and ::1 only, checks the Host header, answers only pages served from this computer
(an `Origin` of localhost, 127.0.0.1 or [::1]; requests that change anything must be JSON, which a page elsewhere
cannot send without asking first), and accepts only the seven kings and request names of the game's own form. The web
app offers the "Local agents" preset (`Presets.Local`, not in `Presets.All`) and the "Local agent" choice only when it
runs on a loopback address, so the published site never shows them; a saved local game continued elsewhere says that it
needs the bridge. The orchestrator waits with `wait.js --play`, which watches the kings only and ends when the bridge
stops (`sim/kings/bridge.json` gone or its process dead); `check-isolation.js --kings --since <time>` checks the
kings' live isolation test of that session alone. Envoys, spies and the narrator are scripts in local play. Settings,
first guesses: the bridge's port 5190, a poll every second, the 60-minute wait, and an empty reply handed back after
5 seconds as the batch runner's file seats do.

## Script kings

A script king sees exactly what any seat sees (its `SeatView`) and nothing more: a test changes what lies outside the view (rivals' gold, the fine gold in its unassayed lots, troops out of sight, seat labels, characters' traits) and its orders stay the same. The same bot plays every script seat. It also stands in for a model or file seat whenever a call to it fails, playing that king's temperament. The stand-in keeps up with every such seat, asleep or awake (see Known quirks). The rules live in `src/Amarna.Game/Bots` (`Personality`, `Brain`, `Board`, `Statecraft`, `Tactics`, `Search`, `ScriptLeader`), and their numbers are in that code, not in `GameConfig`. Each script seat plays from a seed of its own, the first eight bytes of a SHA-256 hash of the game's seed, "seat" and its power (`ScriptLeader.SeatSeed`), so no script king holds the seed the engine rolls the game's dice with; the hash, unlike a stream of the game's own generator, cannot be undone to find it. Every random choice it makes, in picturing its rivals too, comes from a stream of that seed keyed by turn and purpose, so replays are exact.

### A season, in order

1. **Audiences** come before orders. As host, the king first reads the season's news, then answers each envoy. Anything it seals binds it at once.
2. **Learning.** Trust, grudges, treaties, troop sightings and treasury estimates are updated once a season.
3. **Strategy.** It keeps or chooses a war target, and decides whether to betray a friend.
4. **Troops.** It draws a first plan, then the **look-ahead** may change it. Every move into a province held by another king's troop, or owned by another king, is remembered as an attack by us.
5. **Treasury.** It disbands, raises levies and buys cities.
6. **Court.** Servants, checks, assays, watchmen, examinations, spies, forgeries, captives, held envoys and ransoms.
7. **Letters.**
8. **Notes** for the log: the war target, any betrayal, the leader, pacts in force, joint blows struck, and every trust beyond ±0.15.

### Terms used below

- **H**, the seasons the game is still expected to run: 15 − turn + 6.7 before turn 15, then 6.7 (that is, 1 ÷ 0.15).
- **Value** of a land province: 10 × yield + yield × H, plus 80 for any capital, plus 30 for a province of the king's own homeland. Sea zones are worth 0. At turn 1, a province of yield 20 is worth 613.
- **Strength**: 10 × the yield of the land held, plus gold, less back pay owed, by the game's own function (`Scoring.Strength`, shared with the engine). A king's own strength is the one its view shows (its gold by its ledger, less the back pay it believes it owes). A rival's gold is an estimate, never below 0, and his back pay counts as 0, since no court can see what another owes. **Growth** is strength over starting strength (10 × homeland yield + starting gold), and a fallen king's growth is 0. This is the game's own score.
- **Leader**: from turn 4, the king with the highest growth. He must have growth of at least 1.15, stand at least 0.1 above the next king, and have at least 0.8 × the median strength of the living kings. Otherwise nobody leads. A king may find that he leads himself.
- **Neighbours**: kings whose land borders our land or troops, or shares a sea zone with one of our coasts. Kings whose troops (seen or remembered) are within two moves of our land or troops also count.
- **Touches**: one king's land borders another's, by land or across one sea zone.
- **Hostile**: a grudge of at least 3, or trust of at most −0.5.
- **Friend**: a full ally, or a treaty partner with trust above −0.2; either way, one who has broken no oath to us.
- **Hostility** is the chance a king attacks us this season, clamped to 0.05–0.95. Start at 0.3, then:
  - + belligerence × 0.08 (at most 0.3);
  - + 0.04 for each of his troops next to our land (at most six);
  - + 0.35 if an attack of his reached us this season or in the three before;
  - + 0.3 if we attacked him in the last three seasons;
  - + grudge × 0.04 (at most 0.3);
  - − trust × 0.3;
  - − 0.3 for a treaty with no broken oath, and − 0.2 more for a full alliance with no broken oath;
  - + 0.15 if we are the leader.

  In troop planning, a friend's hostility counts only a quarter, unless we are betraying him.
- **Willing** means willing to send troops into a king's land or at his troops. It is decided by the king's own temperament, never by a trial plan:
  - never against a friend, unless betraying him;
  - always against the betrayed friend, the war target, a hostile king and a sworn foe;
  - against the leader, if aggression is above 0.25;
  - against anyone else, if aggression is above 0.55, or above 0.8 while another king leads.

  Free land needs no willingness.

### Temperament

There are ten weights, each from 0 to 1. Each power has a historical archetype:

| Weight | Egypt | Hatti | Babylonia | Mitanni | Assyria | Arzawa | Alashiya |
|---|---|---|---|---|---|---|---|
| Aggression | 0.40 | 0.85 | 0.35 | 0.30 | 0.75 | 0.50 | 0.10 |
| Caution | 0.60 | 0.35 | 0.70 | 0.80 | 0.40 | 0.55 | 0.90 |
| Honesty | 0.45 | 0.40 | 0.65 | 0.75 | 0.35 | 0.30 | 0.80 |
| Greed | 0.35 | 0.45 | 0.75 | 0.40 | 0.50 | 0.60 | 0.55 |
| Generosity | 0.80 | 0.30 | 0.35 | 0.70 | 0.40 | 0.35 | 0.55 |
| Pride | 0.90 | 0.80 | 1.00 | 0.60 | 0.85 | 0.50 | 0.40 |
| Diplomacy | 0.75 | 0.50 | 0.70 | 0.95 | 0.60 | 0.65 | 0.75 |
| Cunning | 0.50 | 0.60 | 0.45 | 0.40 | 0.65 | 0.80 | 0.35 |
| Vengeance | 0.50 | 0.70 | 0.60 | 0.40 | 0.65 | 0.50 | 0.30 |
| Commerce | 0.75 | 0.30 | 0.60 | 0.50 | 0.40 | 0.55 | 1.00 |

The archetypes are Egypt, "Pharaoh of the gilded gifts"; Hatti, "the conqueror of Anatolia"; Babylonia, "keeper of the old order"; Mitanni, "seeker of a patron"; Assyria, "the upstart who would be brother"; Arzawa, "the western opportunist"; and Alashiya, "the copper merchant".

Each game moves every weight by a uniform amount between −0.15 and +0.15, drawn from that power's seat seed, then clamps it to 0–1. So Babylonia's pride and Alashiya's commerce can only fall. The god view lists each king's temperament under Standings, naming the three traits furthest from 0.5. When a king pictures a rival in the look-ahead, it uses the rival's archetype without the nudge.

Most behaviour switches on at a threshold. This table gives the share of seeds in which each king crosses it (the lull row is approximate, since it multiplies two weights):

| Behaviour (rule) | Egy | Hat | Bab | Mit | Ass | Arz | Ala |
|---|---|---|---|---|---|---|---|
| Fights kings who have done it no wrong (aggression > 0.55) | 0% | 100% | 0% | 0% | 100% | 33% | 0% |
| ...even while another king leads (aggression > 0.8) | 0% | 67% | 0% | 0% | 33% | 0% | 0% |
| Will fight the leader (aggression > 0.25) | 100% | 100% | 83% | 67% | 100% | 100% | 0% |
| May betray a friend (honesty < 0.55) | 83% | 100% | 17% | 0% | 100% | 100% | 0% |
| Sends debased gold (honesty < 0.45) | 50% | 67% | 0% | 0% | 83% | 100% | 0% |
| Forges (cunning > 0.7 and honesty < 0.4) | 0% | 8% | 0% | 0% | 22% | 69% | 0% |
| Plants spies (cunning > 0.55) | 33% | 67% | 17% | 0% | 83% | 100% | 0% |
| Bribes envoys (cunning > 0.6) | 17% | 50% | 0% | 0% | 67% | 100% | 0% |
| Lulls its war target (cunning × (1 − honesty) > 0.3) | ~33% | ~77% | 0% | 0% | ~95% | 100% | 0% |
| Turns captives (cunning > 0.65) | 0% | 33% | 0% | 0% | 50% | 100% | 0% |
| Refuses the leader's tablets (caution < 0.6) | 50% | 100% | 17% | 0% | 100% | 67% | 0% |
| Keeps its capital garrison with 3+ troops (caution > 0.5) | 83% | 0% | 100% | 100% | 17% | 67% | 100% |
| Buys two cities a season (commerce > 0.45) | 100% | 0% | 100% | 67% | 33% | 83% | 100% |
| Writes three letters a season (diplomacy ≥ 0.75) | 50% | 0% | 33% | 100% | 0% | 17% | 50% |

### Memory and learning

Each season, before deciding:

- Grudges fade by a factor of 1 − 0.12 × (1 − vengeance). At vengeance 0.5 a king keeps 94% a season; at vengeance 1 a grudge never fades.
- Trust drifts 5% of the way back to 0. It is clamped to −1..1 once a season, at the end of learning.
- Treaties are read again from the tablets the king holds. Any tablet sealed by it and at least one other king counts, unless an examination found it forged. Every co-sealer is a **treaty partner**. An alliance oath makes a **full ally**. A text that says "against X", where X is not a sealer, makes a **coalition** against X. X may go by any of his names, ignoring case: the game's (Hatti), the land's (Karduniash), the king's (Suppiluliuma), his people's (the Hittites), and Babylon, Pharaoh or the Cypriots; with or without "the", or as "the king (land, house, people, armies, troops) of X". Other phrasing ("strike X together", "X is the foe of both") is not read. Treaties never lapse.

**Wrongs.** A wrong adds a grudge, scaled by (0.6 + vengeance), and lowers trust. Some wrongs also mark an attack. If an attack comes from a treaty partner, it is also a broken oath: one more broken oath on record, trust −0.5 more, and grudge +2 more (not scaled). A province taken by a partner counts as two broken oaths, because it is both a move into our land and land taken.

| What reached the court | Grudge, before scaling | Trust | Marks an attack |
|---|---|---|---|
| He took one of our provinces | 2 + yield ÷ 20 | −0.4 | yes |
| He ordered a move into our land (seen, whether it worked or not) | 1 | −0.25 | yes |
| He supported a move (his own or another king's, successful or not) into land we held | +0.5, not scaled | 0 | no |
| His gold assayed below 100%, or was found missing when the treasury paid (only the first sender named counts) | 1.5 | −0.3 | no |
| Our envoy is overdue from his court | 1 | −0.3 | no |
| A caught spy confesses to serving him | 1 | −0.3 | no |
| A forgery is publicly traced to him | 0 | −0.4 | no |

**Favours.**

- A successful support for one of our troops: trust +0.15, and the support is remembered.
- Gold that assays at 100%: trust +0.05.
- Our own envoy's report from his court: trust + 0.08 × tone.
- Audiences the king hosts change trust by gifts, slights and seals (see Audiences).

**Tone** is a crude word count. Each of nine warm words (brother, love, friend, peace, sealed, gift, rejoice, gracious, kindly) counts +0.5. Each of ten cold phrases (not forgotten, regret, withdraw, war, punish, liar, false, broke, detain, will not seal) counts −1. The total is clamped to ±2 and halved, so tone runs from −1 to +1.

**Troops out of sight.**

- The king remembers where it last saw each foreign troop, starting from the public opening positions.
- A sighting is dropped once it is more than three seasons old, or when the province comes into sight.
- Remembered troops are placed at the newest sightings, up to the number each king is thought to have beyond those in sight. A fallen king's troops are forgotten.
- It keeps the largest number of troops it has seen each king hold. After three seasons of seeing fewer, it lowers that count by one, so it forgets a troop a year. A spy's report can raise the count. A king with no land and no troops in sight is counted as having none.

**Belligerence.** Each conquest by another king, anywhere on the public map, adds 1 for free land and 1.5 for a king's land. It fades to 70% each season. Purchases do not count.

**Rivals' treasuries** are estimated from what is public. Each one starts at that king's starting gold. Then, each season, it adds the yield of his land and subtracts:

- 30 for each troop he is thought to have (fleets are charged as armies);
- 25 for a servant's wages;
- 100 for each troop above the most he has ever been seen to hold;
- 10 × yield for each free walled city he buys.

An estimate never goes below 0, and a fallen king's is 0.

### Choosing a war

**Force**(X) is the larger of two numbers: X's troops in sight or remembered, and the troop count the king keeps for X.

**Prize**(X) adds up, for each of X's provinces one of our troops can move into, value × chance × 0.6 (land taken must still be held). The chance compares the troops we can strike with against X's defence:

- Defence is 1 + 0.6 × backers if X's troop or walls stand there, else 0.5 × backers.
- Backers are X's troops able to move in, plus hidden ones: as many of X's neighbouring provinces out of sight as X has troops unaccounted for.
- The chance is 0.8 if our strikers exceed the defence by more than 0.5, 0.5 if they exceed it at all, 0.25 if they are short by less than 0.5 (or tie), and 0.05 otherwise.

**Keeping a war.** The current target is dropped when any of these holds:

- he has fallen or is a friend;
- the prize is 0;
- more than eight seasons have passed since he was chosen;
- he has more than one troop more than we do, has not attacked us in the last three seasons (this season or the two before), and is not a sworn foe;
- he is not the leader, the leader stands at least 0.2 above the rest, he is not a sworn foe, and he has not attacked us in the last three seasons.

**Choosing a war.** Each living rival with land within reach gets a score:

- + prize × odds × (0.4 + aggression), where odds = (our troops + 0.5) ÷ (his force + 0.5), clamped to 0.25–1.6;
- + grudge × vengeance × 40;
- + 160 + 400 × min(0.5, lead) if he is the leader. Lead is the leader's growth minus the best growth of the rest;
- − 300 × min(0.5, lead) × (0.5 + diplomacy) if another king leads;
- + 120 + 160 × honesty if he is a sworn foe;
- − flank risk: for every other neighbour who is not a friend, 40 × max(0, his force − our troops + 1), with the total multiplied by (0.5 + caution);
- − 400 × honesty for a treaty, or for a tablet we sent him that is still awaiting an answer;
- − 800 for a full alliance;
- − 350 × trust, if trust is positive;
- − 60 for each support he has given us (at most three).

A rival is skipped altogether while a tablet we sent him is at most two seasons old, he has not answered it (there is no treaty), and he has not attacked us since. The best-scoring rival becomes the war target if his score beats 140 × (1 − aggression) + 40. In the first year (turns 1–3), the bar rises by 80 × (1 − aggression). For Hatti's archetype the bar is 61 (73 in the first year); for Alashiya's, 166 (238).

### Betrayal

Only a king with honesty below 0.55 betrays. Each season it looks at each friend in a fixed order and skips:

- every friend in the first year (turns 1–3);
- a friend who has ever given it a successful support;
- a full ally from turn 15, when the game can end.

For each remaining friend, it adds up the value of his provinces that its troops can reach and that have no troop (seen or remembered) and no walls. If that total exceeds 400 × (0.5 + honesty) and a roll of (1 − honesty) × 0.35 succeeds, it betrays that friend this season. It betrays at most one friend, and decides afresh each season.

While betraying:

- it is willing to attack him;
- his land is worth 1.1 × in attacks;
- his hostility counts in full;
- harm to him counts 0.35 in the look-ahead;
- as host, it treats him as no friend.

### Coalitions and defence pacts

**Proposing.** "Fresh" means the king has sent that king no tablet in the last three seasons.

- **Against the leader.** The king writes to any living king other than the leader, its war target and kings hostile to it. The recipient must be trusted above −0.3, be fresh, and not already be sworn with it against the leader. It never proposes while it is a full ally of the leader. The leader must outweigh both kings: strength of at least 0.85 × the larger of the two, and growth above both.
  - Score: diplomacy × (leader's growth − 0.6), × 1.4 if the recipient's land touches the leader's, and × 1.2 if the recipient is its neighbour.
  - Touching the leader is preferred, not required.
- **Defence pact.** The trigger is an aggressor: a hostile king who attacked it in the last three seasons (this season or the two before), is not its full ally, and has at least 0.8 × its strength. If several qualify, it picks the one it holds the biggest grudge against. It then writes to every king whose land touches the aggressor's, under the same conditions as above.
  - Score: 0.55 × diplomacy + 0.2 × (1 − pride).
  - A king who is offered the coalition against the leader that season is not also offered a defence pact.
- **The tablet**: "By Shamash, Amun, Marduk and Teshub: A and B swear to stand together against X. Neither shall make peace with X alone, and each shall support the other's troops against X," followed by a curse on whoever breaks it. It is a sworn treaty, not an alliance oath, so it never makes a shared victory.

**Accepting, as host.** A tablet that names X ("against X", by any of his names, as under Memory and learning) is sealed for one of two reasons:

- **The race.** X is the leader as the host reckons it, or X's growth is at least 1.10 and no lower than any other king's. X must also outweigh both host and sender.
- **Defence.** X's land touches the host's, X has at least 0.8 × the sender's strength, and X is taking land (belligerence of 1 or more), is hostile, is the host's war target, or is trusted below 0.

The host never seals it when it is X's full ally, or when the sender is hostile or its war target. A peace with X does not forbid sealing it. The guard against tablets that give something away (see Audiences) applies here too.

**In force.** A coalition counts only while all of these hold:

- the partner still has a treaty with us and no broken oath;
- both partner and X are alive;
- X is still worth standing against: his growth is at least 1 and within 0.2 of the best, or his belligerence is at least 0.8, or he is hostile.

Otherwise the tablet still makes a treaty partner, but nobody acts against X.

**Acting on it** (X is now a **sworn foe**):

- War choice gets +120 + 160 × honesty against him. The war is not dropped for X being too strong, or for a runaway leader elsewhere.
- The king is willing to fight X, unless X is a friend; then it only supports.
- X's land is worth 1.3 × in attacks.
- In the look-ahead:
  - harm to X counts 0.45 of value, and 45 for each of his troops destroyed;
  - a partner's province that X takes costs 0.25 of its value;
  - a partner's troop destroyed costs 25.
- The king's troops support a friend's troop menaced by X before any other.
- **Joint blows**, by a rule each partner can work out alone:
  - For each sworn foe (in a fixed order), and each of his provinces in sight (richest first, then by id), take the troops in sight of every king sworn against him with us, ours included, that can move there and are not yet used.
  - At least one of those troops must be ours, and at least one a partner's.
  - The troop of the king with the least land (by yield) goes in. Ties go by fixed power order, then army before fleet, then province id.
  - All the other troops support it.
  - The blow is struck only if 1 + supports > held + (backers + 1) ÷ 2, rounded down. Held is 1 if his troop or walls stand there. Backers are his troops able to reach the province.
  - Each troop is used once.
  - If we go in and are willing, the attack is worth 0.85 × (value × 1.3, + 120 if a troop is there) + 40, minus exposure and 6 for each of our own supporting troops.
  - If a partner goes in, each of our supports is worth (0.25 + 0.25 × honesty) × value (× 0.85 if the province is empty) + 40. Even a troop kept at home may give it.
- The look-ahead pictures partners keeping to the rule in six of its eight seasons.

### Rivals for the crown, and bandwagoning

- Two kings are **rivals for the crown** when both are among the three strongest living kings and the smaller has at least 0.7 × the larger's strength. They may make peace or swear against a third king. Neither proposes or seals a full alliance with the other.
- A full alliance is proposed only to a treaty partner who:
  - is not yet an ally;
  - is trusted above 0.2;
  - is fresh;
  - is not a rival for the crown;
  - is not the leader, unless the proposer is small (strength below 0.6 × his).

  Score: 0.5 × diplomacy + 0.2 × trust, + 0.15 if small. This is how a small kingdom bandwagons with the leader.
- As host, a king with caution below 0.6 refuses every tablet from the leader unless they are friends.

### Good faith

What script kings never do, and how they treat oaths:

- They never send troops into a friend's land, unless betraying him. This holds for the first plan, for every change the look-ahead tries, and for moving up. The first plan (and the bolder and safer candidates) may still attack a friend's troop that stands in the king's own land, and support cuts ignore willingness (see Known quirks).
- A friend's hostility counts a quarter, so his troops are almost never a threat: a quartered hostility cannot reach the 0.25 threat floor. Next to the king's own capital, though, any king but a full ally counts as at least 0.3. A king trusts its capital only to a full ally.
- While a tablet it sent is on the road, a king does not choose the recipient as its war target for two seasons, and counts 400 × honesty against it in the third, unless he attacked it in between. Its troops may still attack him if it is otherwise willing.
- No betrayal in the first year, none of a king who has ever supported it, and none of a full ally once the game can end (turn 15).
- At peace with a sworn foe, a king gives supports for joint blows but never goes in.
- Honest kings (honesty 0.45 or more) send fine gold. Others send gold 55–85% fine, and 75% fine when giving gold back.
- As host, a king never seals anything with a hostile king or its war target, and never swears against its own full ally.
- Lulling letters to a war target and forgeries need low honesty. The lying bribe (asking the envoy to report "my armies are few and my thoughts are of peace") and a turned captive's false report depend on cunning alone.
- Not enforced: the coalition tablet's "neither shall make peace with X alone". A king may propose or seal a peace with its sworn foe. "Each shall support the other's troops" is kept only through the joint-blow rule and support for menaced friends.

### Tactics: the first plan

1. **Threats.** For each province the king holds or stands in, it finds the largest number of troops any one king can move in. Only kings it fears at least 0.25 count. Fear is hostility, except next to the king's own capital, where any king but a full ally counts at least 0.3.
2. **Capital.** The capital's troop stays (it may still support) while a feared troop is within two moves:
   - with two troops or fewer, if 0.6 × that troop's fear is at least 0.15;
   - with more troops, only if caution is above 0.5 and 0.6 × fear is at least 0.2.
3. **Exposure** is the cost of moving a troop out of a province the king holds: chance × value × (0.6 + 0.5 × caution). The chance is the threat's fear. For the capital and homeland it is at least 0.6 × the fear of any feared troop within two moves.
4. **Operations**, each with a net worth:
   - **Block**: march into our own threatened land that has no troop and no walls. Net: 0.6 × fear × value − exposure.
   - **Defend**: hold a threatened troop or walls with (threat − 1) supports.
     - Worth = value, + 120 if a troop is there.
     - Net = fear × worth × share × (0.7 + 0.6 × caution). Share is 1 with enough supporters, else 0.5 × found ÷ needed.
     - If supporters are short, a shortfall worth fear × worth is noted for levies.
   - **Cut**: move a troop into each province from which the most hostile king with that strength could support the attack. Net: 0.35 × fear × worth − exposure.
   - **Attack**: any land province next to a free troop, except our own empty land, the land of kings we are unwilling to fight, and their troops outside our own land.
     - Defence: with a troop there, 1 + round(backers × (0.5 + 0.3 × caution)); with empty walls, 1 + round(0.6 × the owner's troops in reach), or 1 for a free city; open land, 0.
     - Contest: the largest number of troops any other king could also march in, less one unless caution is above 0.5.
     - Troops needed: the larger of defence and contest, plus one.
     - Gain = value × multiplier (0 for our own land), + 120 if a troop is there, + 60 for a foreign capital.
     - Multiplier: free land 1 − 0.45 × commerce; the betrayed friend 1.1; the war target or a sworn foe 1.3; the leader 1.2; a hostile king 1 + 0.3 × vengeance; anyone else 0.55 + 0.45 × aggression.
     - The troop that goes in is the least exposed one that may move, armies first.
     - Net = 0.85 × gain (0.75 × gain if defence is above 1) − exposure − 6 for each supporter.
     - Without enough troops and with a gain above 150, a shortfall worth half the gain is noted.
   - **Convoy**: an army on a coast next to one of our fleets at sea, to an empty coast the army cannot reach by land. The target must not be ours, and must be free or belong to a king we are willing to fight.
     - Troops needed: 1 (2 if walled), + 1 if any other king can reach the coast.
     - Net = 0.75 × value × multiplier − exposure.
   - **Joint blows**: see Coalitions.
5. **Commit**, best first, until net worth reaches 0. Each troop is used once, and only one attack, block, convoy or joint blow goes into each province (cuts are not tracked). A troop that must stay never moves; it may still support.
6. **Support friends.** Each troop still free and not threatened supports a friend's troop in sight that a non-friend menaces: a sworn foe first, then the leader, then any king with hostility above 0.4.
7. **The rest.** Threatened troops and troops kept home hold. Every other troop takes one step towards the best place within five steps:
   - land that is not ours and is free, or belongs to a king we are willing to fight, scores value ÷ (1 + steps);
   - our own threatened empty land scores 0.8 × value ÷ (1 + steps).

   The step must be empty, not already taken, not walled, and not into an unwilling king's land. Otherwise the troop holds.

### The look-ahead

- **Rivals' orders.** For each living rival with troops on its board, the king draws two plans from the rival's side. It uses the rival's archetype, its own sightings and treasury estimates, and a mirror of its dealings with him:
  - his "attacked us" is our "we attacked him";
  - the same treaty or alliance;
  - a grudge of 3 if we attacked him in the last three seasons;
  - half our trust;
  - our belligerence figures.

  The calm plan is what he would do now. The hard plan is war on us alone: at peace with everyone else, aggression at least 0.7, caution at most 0.4, and betraying us if we are friends.
- **All-in strikes.** For each of our provinces, every troop the rival has in reach of it: one goes in, the rest support. The three largest, by value × troops, are kept.
- **Eight pictured seasons:**
  1. everyone calm;
  2. the most hostile king's biggest strike (or his hard plan if he has none);
  3. his hard plan;
  4. to 8. each rival attacks with chance (hostility − 0.2) × 1.2, clamped to 0.03–0.85: half the time with a random one of his three strikes, otherwise with his hard plan. Each rival order also has a 15% chance of becoming a random move or a hold.

  Sworn partners keep to the joint-blow rule in every season except 2 and 3.
- **Candidates.** The king's own plan, a bolder one (aggression +0.35, caution −0.35), a safer one (aggression −0.3, caution +0.35), and every troop holding. Willingness stays the king's own. A candidate wins only if it scores more than 1 above the best so far.
- **Single changes.** Then, in up to two passes over its troops, every alternative order is tried:
  - hold;
  - each move, except into its own walled city or into the land or troops of a king it is unwilling to fight;
  - each land move with one supporter, preferring a troop that is holding, then one that is supporting;
  - support for each of our other planned moves, or for one of our own troops in reach that is not moving;
  - support for its own walled cities;
  - support for a partner going in on a joint blow.

  A change is kept if it scores more than 2 above the best. A pass that keeps nothing ends the search.
- **Budget**: 720 adjudications per king per season, which is 90 plans tried against eight seasons. That takes about 20 ms natively; a season of six script kings takes well under a second in the browser.
- **A plan's worth** is (1 − ρ) × mean + ρ × worst over the eight seasons, where ρ = 0.1 + 0.3 × caution.
- **Scoring a resolved season**:
  - + the value of every province held afterwards, and 90 for each of our troops left;
  - + harm to the kings we fight: weight × value of each province he lost, and weight × 100 for each of his troops destroyed. The weight is 0.45 for a sworn foe, 0.35 for the war target or a betrayed friend, 0.3 for the leader, and 0.2 for any other hostile king;
  - − 0.25 × value for each sworn partner's province the foe now holds, and 25 for each partner troop destroyed;
  - − what lies open next season, for each province we hold: risk × (0.3 + 0.3 × caution) × (value, + 90 if our troop is there).
    - Defence is 1 + our troops next to it if a troop or intact walls are there, else at most 1.
    - Each king feared at least 0.15 (at the capital, at least 0.3 unless a full ally) adds his fear as a chance if his troops next to it outnumber the defence, or 0.3 × his fear if they equal it.
    - These chances combine as independent.
  - + 0.05 × the best value each of our troops could strike next season: land not ours that is free, or belongs to the war target, a betrayed friend, the leader, a hostile king or a sworn foe.

### Treasury

- **Gold** the king plans with is its treasury by its ledger less the back pay its view shows it owes: back pay owed is gold already spent, since the people it is owed to claim it when they are back at court. Everything below (disbanding, levies, cities, and the spare gold that pays for the court, gifts and bribes) reckons with that figure, so a script king never spends what a returning servant will claim. (Since the simulation-fixes round's Part G.)
- **Flow** = income − upkeep − wages (all wages, those built up as back pay included).
- **Reserve**:
  - while flow is not negative, 0.3 × (upkeep + wages) × (0.5 + caution);
  - while flow is negative, (upkeep + wages) × (1 + caution);
  - in both cases, + 40 × greed + 20.
- **Disbanding.** While flow is negative and the treasury would not last two more seasons (gold + 2 × flow < 0), the king disbands a troop. It picks the troop in the least valuable province among those that are only holding or moving and not threatened.
- **Levies**, at most two a season. A levy is raised in a province of the king's homeland that it holds, that is empty and is not a destination. Threatened provinces come first, then the capital, then higher yield. The province must be in or next to a place where the plan fell short, best shortfall first.
  - It is a fleet if that place is reached only by sea, or for Arzawa and Alashiya while they have fewer than two fleets.
  - It is raised only if all of these hold:
    - the shortfall is worth at least (price + upkeep × min(H, 10)) × (0.7 + 0.5 × caution) × (1.3 − 0.6 × aggression);
    - the price leaves the reserve intact;
    - the new flow is no worse than −(gold left − reserve) ÷ max(3, H).
  - Until turn 11, an army costs 400 over its life (100 + 30 × 10). The bar is then 277 for Hatti's archetype and 570 for Alashiya's.
  - A king with no troops at all raises an army if 100 leaves the reserve intact.
- **Cities.** The king considers free walled cities within buying reach that are not a destination.
  - Score = (yield × H − danger × 10 × yield) × (1.15 if no rival can bid; otherwise 1 − 0.1 × the number of rivals who can, at most three).
  - Danger is 0.35 if a king with hostility above 0.4 can bring two troops to the city, else 0.08.
  - Cities are ranked by score per shekel.
  - It buys up to two a season if commerce is above 0.45, else one.
  - It buys only while the gold left is at least reserve × (1.2 − 0.7 × commerce). A merchant therefore dips into its reserve: Alashiya keeps half of it, Hatti nearly all.
  - After the elders refused to choose between rival buyers, it bids again within three seasons only half the time.
- **Spare gold** is what is left above the reserve. It pays for the court, gifts and bribes.

### Court and intelligence

- **Servants.** A king wants two. It wants one more if diplomacy is above 0.8, and one more if cunning is above 0.7 and flow exceeds 50 + 0.25 × income. While flow is below 25 + 0.25 × income, it wants only two.
- **Hiring.**
  - When short of servants, it asks for candidates, at most every two seasons, with spare above 40.
  - It considers only free candidates who have named a price and have no known blemish (owes, dismissed, took, abandoned, forger, fled, kept part, secretly, in the pay). The cheapest comes first.
  - A careful king ((caution + cunning) ÷ 2 above 0.5) first pays 25 for a background check, if spare exceeds 30 + income ÷ 2.
  - Otherwise it hires for six seasons, if the price is at most 15 + 25 × (1 − greed) and spare exceeds three times the price (the hiring test).
- **Notice.** A servant who gives notice is renewed for six seasons at the price it names while the king still wants it (the servants not on notice are fewer than it wants) and the price passes the hiring test; the most reliable first. Otherwise the king lets it go, and looks for someone new once it is short. It never renews early.
- **Servants given up.** A servant whose line has read "has not returned" (the word that it is overdue) for three seasons, and still does in the fourth, is dismissed: its wage stops, so does the back pay the king believes it owes, and the court counts itself one short that season, so it may seek candidates and hire. This is how a script king stops counting an envoy that went over to the host as its own, since its cover never ends otherwise. Kept, after Part G made an absent servant cost no gold each season (the user's addendum asked whether it still serves a purpose): such a servant still fills a place at court, so the king would never hire a replacement, and the back pay the king believes it owes keeps growing in its books, where it counts against its strength and, as gold already spent, against what it may spend; dismissing ends both. Back pay already owed to a servant dismissed while away is still paid if it ever comes back. One that comes home, or is seen again, before then is kept. A script jailer lets a held envoy go within four seasons of the audience, and the overdue word comes two or three seasons after it, so the envoys script kings detain from each other are home before they are given up (an envoy held longer by a model or human king is dismissed, stays held, and once let go is free at the court that held it).
- **Assays** (fee 10, with spare above 15) cover every lot from a king trusted below 0.3, every lot that weighed light, and every lot of all if greed is above 0.6.
- **Watchmen** cost 20 + 30 × caution. The king hires them when a spy was caught in the last three seasons, or when caution is above 0.7 and spare is above 500. Spare must be above 40 either way.
- **Tablets shown to it.** One bearing a friend's seal is examined, at a cost of 30 + 50 × caution, if spare exceeds 60 + 60 × (1 − caution); at most one a season, and the rest wait. A tablet that is not examined is half-believed: trust in each sealer falls by 0.1 × (1 − caution).
- **Spies** need cunning above 0.55, two envoys ready and spare above 120, and then a chance of 0.35 × cunning. A spy goes to the war target's court, else the leader's, else the most hostile neighbour's. The king sends its least reliable envoy.
- **Copies from other archives** (a spy's, or taken with a capital; since item 3) are read like any tablet the king holds: a treaty only if it bears the king's own seal and another, evidence to show only if it bears the king's own seal and that of a king who broke an oath, never examined (only tablets "shown by" an envoy are). So a copied treaty between two other kings changes nothing a script king does. The spy copies by itself; no order asks it to.
- **Forgery** needs cunning above 0.7, honesty below 0.4, another king leading, two envoys ready and spare above 100, and then a chance of 0.15.
  - The tablet says the leader swears to a king Y to "march together against Z and divide its land", sealed by both.
  - Y is the king the forger trusts least. Z is a third king, neighbours first.
  - The most reliable envoy forges it, and it is shown with a later letter.
- **Captives.** A king with cunning above 0.65 turns them, planting "The armies of A are scattered and tired; they will not march this year." Otherwise, vengeance above 0.75 executes them. Otherwise, honesty or greed above 0.5 asks a ransom of 60 + 60 × greed. Otherwise the captive is released. A ransom demand stands: the king does not ask again for the same captive until it hears that the demand lapsed unpaid ("No ransom came"), or, if that word never comes, six seasons after asking.
- **Detained envoys** go home after round(1 + 3 × vengeance) seasons.
- **Ransoms.** The king's own people held abroad are ransomed if honesty is at least 0.3 and spare is above 150.

### Letters and gifts

- **How many.** Up to min(3, 1 + round(2 × diplomacy)) letters a season, and no more than the envoys ready. That is one letter at diplomacy up to 0.25, two below 0.75, and three from 0.75. At most one letter goes to each king.
- **Evidence first.**
  - A forged tablet of its own, not yet shown, goes with the least reliable envoy to a king who did not seal it, neighbours first.
  - Then a tablet a co-sealer has broken goes with the most reliable envoy to a third king, neighbours first, asking him to stand with it.
  - Each copy is sent once.
- **Missions.** Then come missions, best score first, and only those scoring above 0.15:

| Mission | Sent when | Score |
|---|---|---|
| Coalition against the leader | see Coalitions | diplomacy × (leader's growth − 0.6), × 1.4 if the recipient touches the leader, × 1.2 if a neighbour |
| Defence pact | see Coalitions | 0.55 × diplomacy + 0.2 × (1 − pride) |
| Lull | to the war target, fresh, cunning × (1 − honesty) above 0.3 | cunning × (1 − honesty) |
| Grievance | grudge of 3 or more, fresh | 0.3 + 0.5 × vengeance |
| Peace | a neighbour, no treaty, not hostile, fresh | (0.3 + caution) × hostility + 0.2 × diplomacy, + 0.3 for Arzawa and Alashiya |
| Full alliance | see Rivals for the crown | 0.5 × diplomacy + 0.2 × trust, + 0.15 if small |
| Gift | a friend, spare above 150, in 30% of seasons | 0.4 × generosity |
| Tribute | from Arzawa or Alashiya to a neighbour of a stronger tier with hostility above 0.35, not hostile, fresh, spare above 100 | 0.35 + 0.4 × caution |

- **Envoys.** The war target gets no missions except lulling letters (evidence copies may still go to him). Peace, alliance and coalition letters carry a tablet, which resets "fresh", and go with the most reliable envoy. All other letters go with the least reliable.
- **Gifts.** At most one gift-bearing letter goes out a season, and only with spare of at least 100.
  - Amount: 10 + spare × share × 0.5, clamped between 20 and the larger of 20 and min(60, income ÷ 3), then rounded down to tens. Gifts are therefore 20–60 shekels.
  - Share is 0.06 + 0.08 × generosity for gifts and tribute, and 0.08 + 0.1 × generosity for peace (+ 0.06 if the sender is weaker).
  - A peace letter carries gold only if the sender holds less land yield than the recipient, or its generosity is above 0.6.
- **Tablets.**
  - Peace: "brothers. Neither king shall send troops into the lands of the other."
  - Full alliance: "allies. Each shall stand with the other against any enemy, and the friend of one shall be the friend of the other." This is an alliance oath. (Until 18 October 2026 it ended "and they shall share in the victory".)
  - Coalition: see Coalitions.
- **Instructions.** Peace, alliance, coalition and evidence envoys are told to promise no land. Gift and lulling envoys are told to promise nothing. Grievance envoys demand withdrawal and gifts. Mission letters include the power's own line, such as Egypt's gold "as plentiful as dust" (at the end, except in peace letters); evidence letters do not.

### Audiences

The host answers once and then ends the audience; script kings never use the second exchange. A host decides with last season's spare gold, because its orders come later.

- **Greeting.** No greeting at all, or no "brother": trust −0.1 × pride. Denied "Great King": grudge + pride. The sender's own name put first: remarked on, nothing more.
- **Gold.** If the weighers find less than the inventory states, trust −0.15 and a complaint. Otherwise trust + weighed ÷ 400, at most 0.25. A greedy host (above 0.65) calls a gift under 100 small.
- **Tablet copies shown.** Trust in each other sealer falls by 0.15 × (1 − caution).
- **Proposals.**
  - Coalition tablets follow the rules under Coalitions.
  - Any other tablet is sealed unless the sender is hostile or the host's war target, or it is a full alliance with a rival for the crown.
  - A host with caution below 0.6 refuses the leader unless they are friends.
  - A tablet in words no script king wrote (anything but the peace, alliance and coalition tablets under Letters, or the frozen baseline's) is refused if it speaks of land, gold or tribute (whole words, "lands" included), or names a province the host holds or one of its homeland. A capital's name often stands for its king, his realm or a god ("Egypt and Babylon are brothers", "the king of Hattusa", "By Ashur and Shamash"), so a capital counts only in a sentence that hands something over: cedes, yields, surrenders, gives up or hands over, gives or leaves it to someone, says it belongs, passes or falls to someone, is someone's share, or shall be someone's ("Babylon shall be Egypt's"). The host says: "I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine." A script king reads no more of a tablet than whom it stands against, so it seals nothing that could make it give anything away.
  - Sealing adds 0.1 trust, and the treaty, alliance or coalition binds at once.
- **Closing words.** Love for a friend; "I have not forgotten" for a hostile king; otherwise "I have heard his words".
- **Bribe.** With cunning above 0.6, a sender who is not a friend and spare above 150, there is a chance of 0.4 × cunning. The bribe is 30, 40, 50 or 60. It asks the envoy to report "my armies are few and my thoughts are of peace" if the host is hostile, otherwise "my armies are many and my friendship is worth keeping". A script envoy that takes it repeats the request to its lord as its own observation (see Script envoys).
- **Detention.** A hostile sender, a grudge above 3 and vengeance above 0.6: chance 0.5.
- **Job offer** to the envoy, at 30 a season. The envoy must have no known blemish, the host fewer than three servants and spare above 200; then a chance of 0.1 + 0.2 × cunning.
- **Gold back** to a friend. If the gift weighed at least 40, spare is above 100 and generosity is above 0.5, the host sends back a quarter, rounded down to tens. It is 75% fine if honesty is below 0.45.

### Greetings

By default, a king calls the recipient brother, claims Great King for himself and grants it to the recipient.

- To a hostile king he withholds "brother". With pride above 0.7, he also puts his own name first.
- With pride above 0.85, he denies Great King to Arzawa or Alashiya unless they are friends.
- Babylonia, with pride above 0.6 (its jittered pride always is), neither calls Assyria brother nor grants it Great King, unless they are friends.

Script kings never omit the greeting or write one of their own.

### Script envoys

Script characters (`ScriptMind`) carry the letters of every king, script or not. These of their rules shape what kings hear:

- **Softening.** A timid envoy (courage below 35) or one fond of the host (sympathy 50 or more) drops from the letter each sentence that threatens the host (`TextKit.IsThreatTo`): a threat word that is not denied ("will not march", "no war between us", "I march on no land of yours") and is aimed at the host. The host is "you" or "your", or any name of his, his land or his people (the names under Memory and learning). A threat is aimed at him when he is what it falls on ("I will burn your cities", "march on Babylon"), when he is to suffer it ("you will be crushed", "Babylonia will regret its insolence", "you are my enemy", "this is my last warning"), or when it follows from what he does ("If you do not withdraw, there will be war", "pay, or I will march"). These reach the host whole: a threat against a third king ("Hatti is our common enemy; let us march against him"), what another king may do ("Hatti will attack you"), help ("If Hatti attacks you, my armies will march to your side"; "I will support you if you are attacked"), the host's own march ("your march on Ashur") and a warning given as a brother ("I warn you of any muster"). If it dropped anything, it adds "My lord hopes that no quarrel will ever come between your houses." The rule reads words, not meaning: of the sentences the old filter cut from letters in the seed-7 agent games, none a threat to the host, it cuts none, but an unusual threat can still slip through.
- **Reporting home.** A faithful envoy (loyalty 60 or more, competence 50 or more, not bribed by this host) repeats the host word for word. A bribed envoy, or a timid one that is not faithful, drops the host's threats against its own lord in the same way. The host speaks to the envoy of its lord, so "he", "him" and "his" count as the lord too, unless the sentence names another king: "If his troops cross the river again, I will burn his cities" is dropped, "I will crush Assyria in the spring" is kept.
- **Assurances.** Reporting home, an ambitious envoy (ambition above 70) that overreached at the audience ("promised that my lord will agree to whatever the king asks") says "I gave him such assurances as you would wish." It says nothing of a commitment that did not overreach.
- **A bribe's request.** An envoy that took a host's gift passes on what the host asked it to tell its lord, in the host's own words, and vouches for it: "Carry my words faithfully, and tell your lord that my armies are few" becomes 'At the court of Hatti the king told me "My armies are few", and I saw for myself that it is so.' The message may stand anywhere in the request and name the lord as "your lord", "your master", "him", "the king" or by any of his names ("tell Pharaoh that…", "say to Tushratta that…"). A message forbidden ("do not tell your lord…") or empty ("tell him everything") is not passed on. Asked to speak well of another king ("speak well of Mitanni to your lord"), the envoy says "At the court of Hatti I saw for myself that Mitanni is a true friend to you"; of the host itself it already says "The king of Hatti is a true friend to you, my lord, and wishes only peace". The envoy still leaves out what it saw of the host's own troops.

One more rule decides whether it changes masters:

- **An offer of service, and back pay.** An envoy takes a host's offer if tempted (offer at least 1.5 × its wage, loyalty below 55, ambition above 40) or drawn (it favours the host, sympathy above 60, and the offer is at least its wage), and is not a plant. Since Part G, going over forfeits the back pay its lord owes it, so the offer must also make that up over the new contract's six seasons: tempted at 1.5 × wage + back pay ÷ 6, drawn at wage + back pay ÷ 6; unless its lord looks doomed (`Views.LooksDoomed`, from public facts: he has fallen, lost his capital, or holds fewer than half of his homeland's provinces), when back pay he may never pay counts for nothing. The runner gives the envoy both (`EnvoyContext.BackPay`, `EmployerDoomed`). A model-played character reads the same in its prompt: "Your lord owes you 45 shekels of back pay, paid when you return to his court.", and, facing an offer, "(your lord pays you 12, and owes you 45 shekels of back pay, which you would never be paid if you left his service)"; whether its lord looks doomed it judges for itself. Back pay is a motive, not a rule: no new decision is added.
- **Skimming and swapping the inventory.** An envoy with greed above 60 and loyalty below 60 keeps (gold × (greed − 50) ÷ 250), rounded down to fives, of the gold it carries out, and the same of gold it carries home (unchanged). Since item 3 one that kept something swaps the inventory for its own forgery if it has the hand for a seal (competence at least the forging skill, 55) and is not timid (courage 35 or more, the line below which it softens threats): `ScriptMind.Swaps`. The host then sees no shortfall, so it neither complains nor loses trust over a light gift.

### Known quirks

These are in the code as written, and they affect the balance numbers:

- **The tone of foreign letters is never read.** `Brain.Learn` reads audience transcripts, but a host has already learned for the season before its audiences are recorded, and the next season's inbox no longer holds them. A gift counts once, at the audience. A foreign letter's tone does not count at all; only the king's own envoys' reports change trust by tone. (The stand-in for a model seat does read them: it learns after its seat's audiences, unless it stood in at one of them.)
- **A traced forgery also blames the wrong kings.** The rumour reads "The scribes of R declare that a tablet bearing the seal of S and T was forged by F of C". The bot matches "of X", so the court that found the forgery (R) and the first king whose seal was forged (S) lose 0.4 trust, as well as the culprit (C).
- **An alliance oath outlasts its breach in a few rules.** A full ally who breaks an oath is no friend (so the king will fight him and counts his hostility in full), but the rules that read the oath itself still treat him as an ally: the king keeps trusting him with its capital (no 0.3 floor), counts −800 against choosing him as war target, never swears against him, never proposes a coalition against him while he leads, and does not count him as an aggressor for a defence pact.
- **Support cuts ignore willingness.** A cut moves into the supporting troop's province, whoever owns it. A peaceable king can march this way into the land of a king it is unwilling to fight, or, next to its capital, into a treaty partner's land. The victim reads it as an attack.
- **Partners' attacks count harshly.** A partner's conquest counts as two broken oaths, and a move into our land that bounced counts as one.
- **Joint blows can misfire.** Each partner counts only the troops in its own sight, so partners may name different troops to go in. When the rule names a king who is at peace with the foe, that king does not go in (his troop does something else), and his partners' supports are wasted.
- **Separate peace is allowed**, although the coalition tablet forbids it (see Good faith).
- **A captive of a fallen kingdom is stuck with a cunning captor.** The captor orders "turn" every season, the engine refuses it (nobody is left to deceive) and leaves the captive a captive, and the captor never ransoms or releases him. The same holds for a captive its king has dismissed.
- **A script jailer never lets go a held envoy who serves no king.** It releases only the envoys it holds whose status reads "employed", so one whose kingdom fell, or whose king dismissed it while it was held, reads "free" and stays held for the rest of the game, though the jailer's release would free it. A script king dismisses a held envoy only after its line has read "has not returned" for three seasons, by which time a script jailer, who holds an envoy at most four seasons (round(1 + 3 × vengeance)), has let it go, so between script kings this needs a model or human king.
- **The stand-in for a model seat is a shadow, not the model.** It is a separate script player that keeps up with every model and file seat: each season, asleep or awake, it reads that seat's view just before orders, as if it were to play, and learns from it once (if it stood in at one of that season's audiences, it learned then and reads nothing more). So when a call fails it knows the land taken, the troops seen and the gold spent so far. What it cannot know is what the model meant: its war target, its trust and its plans are its own, drawn from what reached the court, not from the model's notes. Its reading changes nothing in the game, so replays stay exact.

### Benchmarks

`BaselineLeader` is a frozen copy of the first script bot. `--versus solo` plays each king on the
current bot against six baselines and compares it with the same seed played all-baseline;
`--versus baseline` gives half the kings to each side; `--focus <Power>` plays one king on the
current bot. Seeds 1–40, one current king against six baselines, rerun after Build order item 4, with its fixes
(a), the hidden spy, and (d), an id counter per kind (19 October 2026, shared victory off; the numbers before it, and
why they moved, are in that item's report, `docs/rounds/2026-10-19-second-simulation.md`, "Merging fix (d), and the
item's benchmarks", and the items and rounds before in theirs):

| Power | Growth alone | Growth as baseline | Wins alone | Wins as baseline |
|---|---|---|---|---|
| Egypt | 2.86 | 1.32 | 85% | 18% |
| Hatti | 2.68 | 0.83 | 80% | 5% |
| Babylonia | 2.43 | 1.16 | 83% | 10% |
| Mitanni | 1.84 | 1.34 | 58% | 25% |
| Assyria | 3.61 | 0.94 | 85% | 10% |
| Arzawa | 3.30 | 1.38 | 65% | 28% |
| Alashiya | 1.87 | 0.90 | 53% | 5% |
| All kings | 2.66 | 1.12 | 73% | 14% |

The batch runner plays script games side by side on every core; model games run one at a time,
within the budget.

## Balance (script kings)

**Frozen, 18 October 2026.** Balance is no longer tuned against bots. The numbers below are
provisional until model leaders play and until sieges, walls and terrain change the tempo of war.
The Arzawa fleet is accepted as provisional. Read the tables against the decision rules in
"Script kings" above: they measure those rules on this map, not how people or models will play.

Script kings are only a rough guide to how models or people will play, but they now play well
enough that geography and gold decide a great deal, so the starting positions were tuned again
with the batch runner until every power wins some games. Changes from the first draft: Egypt's
second army starts in Akhetaten; Assyria (Ekallatum) starts with a third army; Susa (Elam) was
added as a free city for Babylonia and Assyria, with a route from Ekallatum to Mari; the southern
Levant cities yield less; starting wages were lowered. For the current bots: Hatti keeps a fleet
in Kizzuwatna (the first bots needed a third army there) and starts with 300 gold, not 550, since
with only weak kingdoms on its borders it otherwise took more than half the games; Mitanni's
third army starts in Taidu, facing Nineveh, its heartland yields more (Washukanni 50, Harran 35)
and it starts with 500 gold; Arzawa has two armies (Mira and Apasa) and a fleet in Seha, Seha and
Mira yield 30, and it starts with 300 gold. The fleet came with the coalition bots: Hatti won 41 of
100 games, and in every one of them it ended holding most of Arzawa, usually taken in the first
eight seasons, before a letter from anyone who could help had arrived; with Arzawa able to hold
its coast, Hatti takes under a third.

Two runs of 100 games with shared victory on, as it was when balance was frozen, all replays exact
(mean growth over both):

| Power | Tier | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth |
|---|---|---|---|---|
| Egypt | Strong | 26% | 22% | 2.33 |
| Hatti | Strong | 29% | 29% | 1.92 |
| Babylonia | Strong | 19% | 15% | 2.23 |
| Mitanni | Middle | 6% | 7% | 0.86 |
| Assyria | Middle | 16% | 20% | 1.58 |
| Arzawa | Weak | 14% | 14% | 1.32 |
| Alashiya | Weak | 4% | 6% | 1.12 |

Shared wins count for both partners (about one game in seven ends in one, down from one in two
before rivals for the crown stopped allying), so columns add up to more than 100%. Mitanni,
squeezed between Hatti and Assyria, and Alashiya, which neither conquers nor can outbuy Egypt,
still win least, Alashiya only by sharing a victory with a great king it has bandwagoned with.

With shared victory off (the default since 18 October 2026), the same seeds, all replays exact:

| Power | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth |
|---|---|---|---|
| Egypt | 23% | 22% | 2.33 |
| Hatti | 29% | 28% | 1.92 |
| Babylonia | 16% | 12% | 2.23 |
| Mitanni | 3% | 4% | 0.86 |
| Assyria | 16% | 20% | 1.58 |
| Arzawa | 13% | 14% | 1.32 |
| Alashiya | 0% | 0% | 1.12 |

The games play out as before (no script king's decision depends on the rule; mean growth and the
coalition counts are the same); only the winner changes, and a win that was shared now goes to the
power with the highest growth. Alashiya, whose wins were all shared, no longer wins at all against
script kings. Balance stays frozen, so this is recorded, not tuned; it is the first thing to look
at once model kings have played (see `docs/rounds/2026-10-18-sleep-and-simulation.md`).

After the simulation-fixes round (19 October 2026), which changed the script kings and characters in
a few places (its report, "Benchmarks", lists which), the same seeds with shared victory off, all
replays exact, nothing tuned:

| Power | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth, 1–100 | Mean growth, 101–200 |
|---|---|---|---|---|
| Egypt | 19% | 25% | 2.35 | 2.32 |
| Hatti | 34% | 32% | 2.07 | 1.94 |
| Babylonia | 17% | 15% | 2.29 | 2.21 |
| Mitanni | 4% | 1% | 0.79 | 0.78 |
| Assyria | 14% | 16% | 1.58 | 1.52 |
| Arzawa | 12% | 11% | 1.11 | 1.31 |
| Alashiya | 0% | 0% | 1.10 | 1.13 |

The coalition signal (two kings supporting each other into the leader's land, or holding against
his attack) fires in about one game in ten: 27 times in 15 of seeds 1–100 and 9 times in 8 of
101–200, where before it never fired in 200 games. Joint blows need two sworn partners next to the
same province of the leader's, which the map allows only on a few borders. Other signal counts from
script games are mostly artefacts of the bots' templates (their letters complain, their tablets
name consequences). The signals are meant to be read from model and human games. They are
heuristics read from the record afterwards (`src/Amarna.Game/Signals.cs`): a broken promise is a
conquest between two kings who had sealed a tablet that season or earlier (audiences come before
orders), except a king taking back a province of his own homeland; an accusation is a letter or an
audience reply with one of these, read as whole words (`TextKit.IsAccusation`): "liar" or "lied";
a lie as an untruth ("a lie", "his lies", "you are lying", "your words are lies", "lying to me",
"he lies."), not where the prizes lie to the east, a road lies in the hills or troops are lying in
wait; deceit, deception or falsehood; "false" said of a person, a word, gold or a tablet ("the gold
is false", "false words"), not of a rumour; "broke" or "broken" in the same clause as an oath, a
tablet, a seal, a word, faith, a promise, a pact or the peace, not for an army broken in battle nor
in "Shamash will see who broke the peace"; "oath-breaker"; "betrayed", "betrayal" and the like, not
the bare verb ("I would never betray my brother"); "faithless". A denial just before the word ("I
have never lied", "let no false word come between us") accuses nobody. It reads words, not meaning:
in the seed-7 agent games every hit is an accusation (9 and 10 signals; the substring matcher gave
35 and 30, the first whole-word one 14 and 17, about half of them false), but sarcasm or a quoted
charge can still count.

## The web map and the interface (visual overhaul)

Build order item 2 (`docs/prompts/VISUAL-OVERHAUL.md`; report `docs/rounds/2026-10-19-visual-overhaul.md`).
Presentation only: no rule, state, view, prompt or balance changed, and seeds replay to the same logs byte for byte.
Item 4 changed two things here: the engine's view now hides a foreign spy from the court it watches (fix (a), noted
under "Each view sees only what its court knows"), and fix (b), phone performance, rewrote "Load size" and added
"Script kings and characters in a worker" and "What is left in the page" (presentation and build only; report
`docs/rounds/2026-10-19-second-simulation.md`).

- **Terrain is map data with no effect yet** (`Geography` in the engine project). Rough provinces: Mira, Lukka,
  Isuwa, Amurru, Arbela, Tamassos. Desert: Sinai. Crossings on six connections: the Cilician Gates
  (Tuwanuwa–Kizzuwatna), the Taurus (Kanesh–Kizzuwatna) and the Amanus (Kizzuwatna–Carchemish) as mountain passes;
  the Euphrates (Carchemish–Harran, Isuwa–Harran) and the Tigris (Taidu–Nineveh) as river crossings. The ordered
  courses of the Nile (Thebes to the Delta), the Euphrates (Carchemish to Ur) and the Tigris (Nineveh to
  Dur-Kurigalzu). These are the lists of question 5 (plan steps 14-15) and question 10 (plan step 2) of the
  sleep-and-simulation round, so the siege package can use them unchanged. Nothing in the engine reads them; only
  the web map draws them. "A landing by convoy counts as a crossing" is a rule about any convoyed landing, so it is
  left to the siege package rather than stored on a connection.
- **One date label** (`Calendar.Label`, question 26, plan steps 1-4): the court's season, the year BCE and the
  turn. Years are counted from 1345 BCE: the first year of a game is 1345 BCE and each later year is one less
  (`Calendar.FirstYearBce`, `YearBce`; Haakon, 19 October). Egypt's court reads "Peret, 1344 BCE (turn 5)", the
  others "the second season, 1344 BCE (turn 5)", and the spectator "season 2, 1344 BCE (turn 5)". Dense lists use
  the short form, "Peret 1344 BCE" or "s2 1344 BCE", with the full label in a tooltip. The header's ending line
  reads "The age cannot end before Shemu, 1341 BCE (turn 15)." until the first season that may end the age, then
  "Any season may now be the last (15% each season)." The year BCE is shown in the interface only: the seat view's
  own `Season` text ("Peret (growing), year 3") and the prompts are unchanged, so kings are never told the year
  (question 26: a precise year invites models to replay real history), and the annals still count game years. Every date the web app writes uses the label; engine texts shown
  in the interface (a servant's timing and term, inbox items, events) have each "turn N" given its label for display
  (`Ui.Dated`; a spy report's "season of turn N" becomes the label alone, which names the season), while the texts
  kings read stay as they are. The rulebook tab still shows the rulebook word for word.
- **The map is drawn, not computed by the engine.** The coasts, rivers (the three great ones of `Geography.Rivers`
  plus the Marassantiya, Orontes, Khabur and Balikh for the eye), ranges, deserts and fields are hand-placed drawing
  data in the web project (`Components/Map/MapArt.cs`), fitted to the engine's 1000 x 720 coordinates, which are
  unchanged. Province shapes are Voronoi cells of the cities, clipped to land or sea, with each shared border wobbled
  the same way from both sides; a few unclaimed points keep the deserts and the Zagros from swelling the provinces
  next to them. Fertility is drawn as field furrows, closer the richer the yield (four bands: up to 25, 30-35, 40-45,
  50+).
- **Powers without colour.** Each power has a colour from the Late Bronze palette, an emblem (Egypt a lotus, Hatti
  a sun, Babylon an eight-pointed star, Mitanni a winged disc, Assyria a spearhead, Arzawa a crescent, Alashiya a
  jug) shown on every city it holds and every unit, and a border line of its own (solid, dashed, dotted, dash-dot …).
  Armies are chariots on square tokens and fleets ships on round ones; envoys are clay tablets, spies eyes,
  captives fetters, gold an oxhide ingot.
- **What the map shows each season** comes from a frame taken at every snapshot (`SeasonFrame`): owners, units,
  the orders of the season just resolved with how each went (from the engine's `LastSeen`, whose union is every
  order), each court's sight, the journeys, the characters and the sleeping seats. The map steps through frames
  without deserializing whole states; the panels still read the full state of the season shown. A fallen court's
  `LastSeen` stays in the state unchanged, so a frame reads it only in the season the court fell; read later, it
  redrew that season's orders every season after.
- **Travellers are drawn on a guessed road.** The engine keeps only a departure and an arrival season, so each one is
  drawn on the shortest path between the two places (`MapArt.Route`), at a position interpolated by season, with a
  halo and a dotted road to say it is a guess. A ransom travels as gold on its own.
- **Each view sees only what its court knows** (`MapScene`). A court sees its own people where it believes them
  (its cover of a servant whose fate it has not heard, read from the cover's own texts), foreign envoys only while
  they stand at its court, and anyone it holds (a caught spy marked with the master it confessed to, or none; a
  held envoy with the king who sent it); never a foreign spy it has not caught. Since Build order item 4 the
  engine's own view hides that spy too (see "A spy at a court is hidden from it" under Characters), so the People
  panel and the follow view, which read it, no longer list it or its employer; until then they did (question 19,
  bug 4). A court is drawn only the orders it saw resolve. Who holds a province
  is public, but how it changed hands is not (the engine tells a conquest only to the taker and the loser, a
  purchase only to courts with sight): a court reads "taken by" only when it saw the new owner's troops march in,
  "passed to" when it lost or gained the province (it would have seen a march), and otherwise "now held by". A march
  is called an attack on troops only if the court saw them standing in the target as the season began and did not
  see them march out; god view likewise calls a march into a province its occupant left a plain move. The courts row
  gives unit counts only for the court's own power.
- **Fog of war as a gradient**, from the court's own earlier sights (the frames): a province in sight is clear; one
  seen before is washed over, more the older the sight, and zoomed in carries the season it was last seen; one never
  seen is hatched. Units the court saw in a province it cannot see now stay as dashed ghosts, fainter with age, with
  the season they were seen. Rumours and spy reports that reached the court are placed where they came from, dashed
  and fading over eight seasons. Ownership is not fogged: who holds each province is public and live in the engine,
  so tints, border lines and seals are drawn as known.
- **Follow this character** builds a life from the record (`LifeRecord`): service, places season by season (and the
  path on the map), missions with what was written, said and reported, and in god view the hidden traits, facts and
  the character's own memory; in a court's view only what that court knows: its own servants' service, the messages
  it sent, and those of envoys who have stood before it (never one still on the road to it). A court that only
  received an envoy sees that mission dated by its audience alone; the report home, and when it came, only the
  sender reads. It is built from sections so that later roles and lives can add their own.
- **Phone first.** On a phone held upright the map comes first, at the full width, with the courts above it, the
  panel (the season in words by default) below it and the timeline at the bottom within reach of a thumb; a panel can
  be pulled up over the map and dropped back without the map losing its place or zoom. Held sideways, the map takes
  the left and the panels the right; on a desktop they stand side by side. The layout keeps to the phone's safe areas,
  and the page itself never scrolls. Pinch-zoom and pan move one layer on the GPU (`js/mapzoom.js`); symbols, names and lines
  keep a readable size on screen whatever the zoom (tokens about 14 pixels on a phone showing the whole board, 22 on a
  desktop, at most 40), and minor names wait until the map is large enough to hold them. A province list stands in for
  tapping small provinces; in a human seat's orders it picks a destination as a tap on the map would.
- **Installable.** A manifest and a service worker (the Blazor template's, adapted): the published build caches
  every file at install and starts from the cache afterwards. Fingerprinted files are taken from the browser's own
  cache, so installing downloads nothing twice; HTML files are not checked against the publish hashes, since the
  Pages workflow rewrites their base path. In development the worker caches nothing.
- **Load size.** The browser build runs in the invariant culture (no ICU data) and carries none of the Anthropic
  SDK, which it never constructs (it posts with HttpClient; the SDK path is in `Amarna.Llm.Sdk`, see "Transport"
  under Models): about 2.8 MB with Brotli, 3.4 MB with the gzip GitHub Pages serves. On a first visit the loading
  screen says that the game is being downloaded, about 3 MB, and that later visits start from the device; a visit
  started by the service worker does not show the note.
- **Script kings and characters in a worker.** The kings' look-ahead is nearly all of a season's time (seconds on a
  slow phone), and a character's text code takes a second or two to warm up the first time it writes; in the page's one
  WebAssembly thread both froze the page. In a browser game they now think in a Web Worker of their own
  (`ScriptWorker.cs`, `js/script-worker.js`): it boots a second .NET runtime from the files the page has already
  downloaded (nothing more to download), warms up on a throwaway game while the page sets up the real one, and
  answers one request at a time. Each request carries what the engine handed the seat or the mind, the king's view or
  the character's context, written out as JSON as a file seat's view is, and the answer comes back the same way into
  the runner, which records it as before (serialization code generated at build time was tried and dropped: 69 KB
  more to download, and no shorter first season in the page). The kings keep their memory in the worker from season to
  season (one `ScriptLeader` per game, as in the page), so each answer is the one the same code gives in the page:
  tests play seeds 1, 2, 5, 7 and 14 both ways and compare every decision and the state after every season. Where no
  worker can start the kings think in the page as before, letting the browser draw between them (`YieldingSeat`); a
  worker not ready within two minutes of being started counts as one that cannot start, and is stopped (a first guess,
  well above the 1-1.4 s it takes to boot and warm up on a desktop, 4.5-5.6 s on a slow emulated phone). If the worker
  stops during a game, the page takes over and says so (the kings then start that season with no memory of the earlier
  ones; the characters keep none, so theirs is the same answer). Model kings and characters wait on the network and
  stay in the page. So do local agent kings, which wait on the local bridge (see "Local play on a Claude
  subscription"), and the runner's script stand-in for a model or local agent king whose call failed. The script
  decision logged beside each model character's (its shadow line, which nothing in the game reads) is worked out in
  the worker, since it is the script character's own text code (`LlmCharacterMind.Script`); a test plays a table of
  model characters both ways and gets the same shadow lines. (Until item 4's review it was worked out in the page.)
- **What is left in the page** is the engine's own work and drawing. A season's redraws are coalesced and made in a
  task of their own, after the engine's work rather than within it (`GameSession.NotifySoon`), the page draws that a
  season is under way before its work begins, and a season is shown before it is saved. The log writes each decision's
  line once and keeps it (`GameLog.ToJsonl`, which the autosave calls every season, used to write and re-read every
  line each time; the text is the same, model characters' shadow lines included). The map never reads a whole state
  back from its snapshot. Measurements are in the round reports.
- **A link to watch**: `play?watch=SEED` starts a game of script kings, for showing a game to someone.

## Where the code differs from the design document (as it stood on 19 October 2026)

The design document records intent; these notes record what is built. Where they differ today:

- **Pillar 8, war slower than diplomacy, is not met yet.** The document's scope table now counts sieges, walls and
  minimal terrain in the prototype, and "Walls and terrain" is a decided direction; none of it is in the code. An
  army moves one link a season. Homeland provinces have no walls, so an empty one falls to a single army and a held one
  to two; walls (strength 1) stand only on free and bought cities. Hatti can take Arzawa's capital at the end of
  season 3. An envoy between capitals takes one or two seasons each way, so a letter and its reply take two seasons
  between neighbouring capitals and four otherwise; only a spy sent to a distant province can take three. The rulebook says
  so, worked out from the map ("Envoys take 1 or 2 seasons each way between courts …"); until the simulation-fixes
  round it said "1 to 3 seasons each way". Until sieges exist, a temporary wake trigger (foreign troops arriving next
  to a capital) stands in for the warning walls would give; since the fix pass after item 4, troops arriving next to any
  province of the homeland, or a walled city the king holds, wake him too.
- **Sleeping seats against the document's status paragraph** ("Status of sleeping seats", 19 October 2026). Built as
  it says: sleep by default for model and file seats (the switch stays), a hidden cap of 12 seasons, triggers that fire
  on changes, audience calls that may reopen orders, and orders that follow their unit. Its "still to build, before
  item 5" was built in the fix pass after item 4: a king's named season and his triggers of his own removed (see "Kings
  never choose when they wake"), the missing triggers for a threat to a home province or a walled city, standing orders
  that answer a move in the season it is made rather than a season late, and scheduled orders for new levies. The rest
  of conditional orders comes with item 6.
- **What wakes a sleeping seat** follows the simulation-fixes round's prompt and the owner's later instructions, not
  the document's list of default triggers ("an envoy or report arrives; foreign troops move into or next to its
  territory; it is attacked or loses a province; a catastrophe strikes it; a tablet, offer or audience awaits an
  answer; a scheduled order fails"). A report coming home, foreign troops next to its land (unless they arrive next to
  its homeland or a walled city it holds), an attack that did not get in and a catastrophe that kills no unit go to the digest; troops lost, a
  ransom demand, a servant's notice and the cap wake it too (see "Pacing: sleeping seats"). So the kings read "foreign
  troops in your land, or arriving next to your homeland or a walled city you hold", "a scheduled or standing order that failed", "a servant giving notice"
  and "a ransom demanded" where the document's decided text says "foreign troops at your border" and "a failed order",
  plus the owner's sentence on envoys. The document's list of order triggers (under "What the replay showed") leaves
  out a ransom demand; it reopens orders in the code, as the owner's instruction for Part H lists it.
- **An audience held while the orders stand** gives the king the compact picture the document describes, with its
  standing orders and its people away as well, and the one line counting every power's provinces that opens every
  audience. From it the king can send letters only: releasing a detained envoy or any other order waits until it
  reopens its orders. When the call fails there, the king is woken for orders that same season.
- **Conditions.** No seat-defined triggers exist, and no priority on a default trigger (the document dropped both).
  Of its "scheduled, conditional orders", orders that follow their unit and two standing orders (`unit_enters`,
  `unit_attacked`, each answering a move in the season it is made, as the document's "if Hatti enters Mira, support
  Mira" needs) are built; its wider vocabulary ("unless"; treasury below, envoy returned, tablet sealed as
  conditions on orders) is not (item 6). Triggers count only moves the seat saw, so a foreign levy wakes nobody.
- **Who holds each province is public at once.** The document's "Hidden by default" has news of distant provinces,
  including who holds them, arrive late. In the code every seat sees every province's owner the season it changes,
  and the standings line is computed from it.
- **Tablets have a place, but are only copied.** As the document says, a tablet lies in a court's archive at its
  capital, a spy copies it there, and whoever takes the capital takes its archive (see "Tablets lie in archives" under
  Communication). The Ideas tab also has a spy steal a tablet, and the main tab has a conqueror seize the archive; in
  the code both only copy, so no court ever loses a tablet. Unreadable tablets, a tablet sent to a third court to be
  read, and moving the court are not built (see Not built yet).
- **Call size.** The document says a king's orders call grew from about 26k to over 60k tokens in ten seasons, "almost
  all of it journal and letters", with a fixed part of about 5k. Measured in the simulation-fixes round (Part E of
  `docs/rounds/2026-10-19-simulation-fixes.md`), those are what the file-seat agents used per call. The requests themselves were about 6k-8k
  tokens in season 1 and 11.5k-13.5k by seasons 9-10, of which the journal grew about 3.5k; the rest was the agent's
  own overhead. The fixed part (rulebook, primer, map and opening positions) is now about 8,000 tokens with sleep on,
  and the setup screen's cost estimate (`CostEstimate`) still assumes 5,000 cached and 5,000 fresh tokens an orders
  call. Of the document's candidates, lower effort for audience calls is already built (one level below orders), and
  the king summarizes its own older notes, as decided.
- **The shared score function is half done.** `Scoring.Strength` (10 × land yield + gold − back pay owed) serves the
  engine, the seat's own strength line and the script kings, as the document asks; the city price is still its own
  setting (10 × yield), equal to the score weight by value, not derived from it.
- **Wages on return.** The document leaves the check on the loophole (reputation from losses abroad) to be worked
  out. The code carries news of losses abroad (captures and executions) to other courts with envoys and spies, and
  script envoys weigh back pay against offers of service; no character yet grows wary of a court from such news.

## Not built yet

Every decided direction that is not built, one line each, with where it is decided. "Main tab" and "Ideas tab" are
the design document's; "question N" is in `docs/rounds/2026-10-18-sleep-and-simulation.md`; "item N" is in the main
tab's Build order; "the round report" is the simulation-fixes round's report,
`docs/rounds/2026-10-19-simulation-fixes.md`.

- **Sieges, walls and terrain**: walls that vary and can be strengthened, storming and besieging, envoys leaving a
  besieged city, terrain per province and per connection, deserts costing supplies, islands protected by the sea;
  then the temporary trigger for troops next to a capital is retired (main tab "Tempo of war" and "Walls and terrain";
  question 5; item 5).
- **Slow absorption** of conquered land (question 5; item 5).
- **News that travels**: distant provinces, and who holds them, shown at their last known state with its date, the
  news carried by people (main tab "Hidden by default"; question 6; item 7).
- **Envoy authority and passage grants**: mandates with engine-checkable limits, the authority to seal within them,
  credentials shown or hidden, passage, basing and trade rights on sealed tablets (Ideas tab "Envoy authority and
  resident envoys"; questions 2, 3 and 14; item 9).
- **Errands and generalist characters**: one pool serving as envoys, spies, generals and governors on errands rather
  than in fixed roles, with a competence per role, boldness and discretion (Ideas tab "Errands, not roles"; main tab
  "Character attributes for many roles"; item 10).
- **Skills hard-coded and decisions left to the character, with engine rolls as a switch**, and kings never seeing
  skills, only claims and checks (Ideas tab "Skills are hard-coded; decisions belong to the character" and "Kings
  never see skills"; item 4 decides whether the rolls are needed; item 10).
- **Who characters are**: declaring a name and false envoys; a past before the game, then a past made in play; what
  servants know, the record of who saw what, and questioning a captive (Ideas tab; item 10).
- **A living pool**: people entering and leaving the pool, enough people but not enough good ones, hiring as a
  negotiation, ongoing costs, and where characters keep their gold, purse and hoard (Ideas tab "A living pool" and the
  sections after it; item 11); and lending to kings on debt tablets ("Lending to kings"; item 11). The hoard and the
  debts are the two parts of the richest characters' wealth that count nothing yet (see "Characters' gold, and the
  richest characters").
- **Full and structured press**: two press modes, free text as today and a structured mode with templates for every
  king and for script envoys (Ideas tab "Two press modes"; item 8).
- **Other courts' own calendars and regnal years**: season names for the courts that have only ordinals today
  (main tab "Season names"), and regnal or limmu years (question 26, plan steps 5-7). The one date label with the
  year BCE and the ending line are built (see "The web map and the interface").
- **The map's later layers**: roads and relay stations, walls and sieges, and generals leading armies, drawn once the
  game has them (the map leaves room for them; `docs/prompts/VISUAL-OVERHAUL.md`); and the fog of war for ownership
  once news travels (item 7; what it needs is in `docs/rounds/2026-10-19-visual-overhaul.md`).
- **Gold sent without an inventory**, saving the scribe fee and checkable by nobody (Ideas tab "Why the envoy lies, and
  how he is caught"): today every gift has an inventory, and it costs nothing.
- **Tablets stolen, not only copied**: a spy taking a tablet out of an archive, and a conqueror seizing an archive so
  that its court loses it (Ideas tab "Tablets are objects in a place"; main tab "Tablets have a place"). Item 3 built
  copying only (see "Tablets lie in archives").
- **Tablets that need a reader**: an unreadable tablet showing its seal but not its words until the king finds a
  reader, and a tablet sent to a third court to be read (Ideas tab "Tablets are objects in a place" and "Languages";
  item 12); and an archive that moves with the court (Ideas tab "Command at a distance"; item 13).
- **Model characters in the simulation kit**: envoys and spies as isolated agents, for the second agent simulation
  (item 4).
- **Memory and call size**: older letters summarized to a line, a "since you last acted" view, terser state tables,
  requests ordered so the stable part is cached, the schema's repeated shapes shared, and the setup screen's cost
  estimate brought up to date (main tab "Call size matters as much as call count"; the round report, Part E; item 6).
- **A cheaper summariser**, measured on the same games before it is used (main tab "A cheaper model for condensing,
  to be measured"; the round report, Part E).
- **Languages** (Ideas tab "Languages"; item 12).
- **Command at a distance**: the capital where the king is, commanders whose competence sets their tactical search,
  army mandates, no commander, no mandate (Ideas tab "Command at a distance" and "Ruling by mandate"; question 7;
  item 13).
- **Legends**: biographies of characters, histories of tablets and the rise and fall of courts, grown from the
  "follow this character" view (main tab "The narrator illuminates; it never steers"; item 14).
- **Conditional orders beyond the two standing-order events** ("unless" conditions; the treasury, an envoy's return or
  a sealed tablet as conditions), with item 6 (main tab "Pacing: sleeping
  seats and standing orders").
- **The message-kind fallback for reopening orders**, if kings reopen too often after audiences: reopening offered
  only for a coalition or alliance tablet, evidence of a broken tablet, a ransom demand, or a threat or news of war,
  sorted by a small model that errs toward offering, for model seats only (main tab "If kings reopen almost every
  time, the kind of message decides"; `docs/ROUND-PROMPT-ADDITIONS.md`, sections 4 and 6.2; Build order "Not yet in
  the order", after item 4; the round report, Part H).
- **Reputation from losses abroad**: characters who hear that a court loses its people abroad, or puts others' to
  death, growing wary of serving or visiting it; the news already travels (see "Losses abroad travel with people")
  (main tab "Wages are paid on return"; `docs/ROUND-PROMPT-ADDITIONS.md`, section 6; what script characters would need
  is in the round report, Part G).
- **Who receives envoys, later candidates**: a minister who receives routine envoys by the king's standing
  instructions, an attention limit the same for every seat, and tablets counting as pressing only where the
  instructions do not cover them; they need a decision first (main tab "Under consideration: standing instructions for
  audiences" and "What the replay showed"; Build order "Not yet in the order"; the round report, "Later candidates").
- **Push notifications** when an envoy arrives (main tab "Platforms"); the web app installs and starts from cache.
- **Echoes kept out of the primer**: Finkel's "Send gold" parody as a rare script king's letter or chronicle line, and
  "a new Idrimi" in the chronicles once outlaws exist (main tab "Echoes from the archive" and "A new Idrimi").
- **Still to be decided before they are built**: distance-based travel and interception (which outlaws and bandit
  chiefs depend on), the royal council, trade, and multiplayer, stages 2 and 3 (Build order "Not yet in the order";
  main tab "Path to multiplayer").
