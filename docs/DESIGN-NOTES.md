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
- **Ownership changes every season**, whenever a unit ends a season in a province, not only in
  autumn as in Diplomacy.
- **Free city-states have walls** that hold with strength 1 and never move, so taking one needs a
  supported attack. They can also be bought for 10 × yield by a power whose land or troops touch
  them, or that holds a coast on the same sea zone (islands trade by ship). Rival bids in the same
  season bounce. A city that troops take in the season of a bid is not sold: every bidder is told
  ("Gaza was taken by Babylonia's troops last season before its elders could accept your gold. No
  gold was paid.", or "Your own troops took Gaza last season; no gold was paid."), nobody pays (gold
  is only reserved when orders are checked), and a scheduled bid that fails this way wakes its seat.
  (Until the simulation-fixes round such a bid vanished without a word.)
- **A bought city keeps its walls**, which then hold for its owner: the owner cannot station troops
  inside but may support the walls holding; a rival still needs a supported attack, and conquest
  tears the walls down. Buying is the durable way to grow, conquest the fast one.
- **Levies** are raised only in an unoccupied province of the power's own homeland that it holds.
  Army 100, fleet 120; upkeep 30 and 35 a season. Troops the treasury cannot pay desert at the
  start of the season, the one farthest from the capital first (the rulebook says so).
- **Strength** = 10 × (sum of base yields of provinces held) + true gold. Growth is strength over
  starting strength. Units are not counted; they cost upkeep and are the means to land.
- **Opening positions are public.** Every king reads every power's opening troops, treasury,
  homeland yield and starting strength in the rulebook ("OPENING POSITIONS (known to every
  court)"), generated from `MapData` (`OpeningPositions`), so the cached block stays byte-stable.
  The web app's standings panel shows the same table to every seat, human or not. Script kings
  read the same facts from `MapData`, as before.
- **Ending.** Not before turn 15; then 15% at the end of each season; hard cap at 60 turns.
- **Dice.** Every roll comes from a stream keyed by seed, turn, purpose and subject. (An early
  version keyed it by seed XOR turn, so neighbouring seeds shared rolls at shifted turns; fixed,
  with a regression test.)
- **Shared victory is off** (since 18 October 2026; see `docs/rounds/2026-10-18-sleep-and-simulation.md`, question 23). One
  power wins: the one with the highest growth. A tablet can still be marked as a sworn alliance,
  and the script kings still treat it as a full alliance, but it shares nothing. The rulebook and
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
- **Failures are rejection notices.** These are reported with the kind `Rejected`: every order the
  validator refused; a levy whose province was no longer free; a purchase that failed; a payment the
  treasury could not make; a ransom that could not be sent; a captive order that could no longer be
  carried out ("Captive order failed"); a hire the person declined; a renewal below the servant's
  price, or of one dismissed that season ("Not renewed"); and a cession blocked by the
  king's own troops. The batch seat report's "invalid" column counts each of them (the validator's list once
  per order). Some failures at resolution still send no notice at all: a cession of land no longer
  held, a gift of troops whose unit is gone, and a disband of a unit that is gone (a scheduled order
  that fails this way still wakes its sleeping seat).
- **Save version.** The state and the log header carry the version of the rules
  (`GameState.CurrentVersion`, 2 since the simulation-fixes round). A log saved under another version
  is refused, both for replay and for continuing it: "This game was saved under an earlier version of
  the rules (version 1) and cannot be replayed by this version." The web app shows that message
  in the saved-games card, next to the buttons that load a game, instead of loading it. Within a version, seeds replay exactly, with sleeping seats on or off
  (tested). For analysis only, `GameRunner.ForReplay(log, anyVersion: true)` feeds an old log through
  the current rules; it may diverge.

## Communication

- **Greeting sealed, body spoken.** The engine renders the greeting from sender and recipient and
  the leader's deviations (omit it, own name first, withhold "brother", claim or deny "Great King",
  or free text). It arrives verbatim. The letter body is spoken by the envoy, who may distort it.
- **Tablets are verbatim** but cost a scribe fee (20), so the envoy channel stays the cheap default
  and a written agreement is a deliberate choice. Tablets are evidence only; nothing enforces them.
- **Gold travels with envoys.** The tablet's inventory states the amount; the host's weighers find
  what is left after any skimming. Purity is hidden until an assay.
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
  recent ten entries; memory travels with the character to a new employer.
- **Prisoners**: an envoy held at a foreign court whose own kingdom falls, or whose king dismisses
  them, becomes a free agent but stays a prisoner; only the court holding them can hire them, and
  its release frees them at that court. A court that falls lets its prisoners go: its captives and
  the envoys it detained walk home as if released, and a spy still watching it can no longer be
  caught. (Until the simulation-fixes round a fallen court still caught spies and kept its
  prisoners for the rest of the game.)
- **Dismissal** (one line in the rulebook) ends the wage at once, wherever the servant is, and moves
  nobody. An envoy dismissed on the way out goes on to the court it was sent to and arrives there a
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
    are next at your court)." The notice wakes a sleeping seat. A
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
    believes it (its cover keeps the notice it gave): at the price it named, the master pays the new
    wage from then on, and the real contract changes too if it truly still serves (a captive).
  - **What the king reads.** Each servant's term in plain words: "serves at 12 a season through turn
    10; if content they then renew themselves, otherwise they give a season's notice and name a
    price"; once the term has passed while it is away, "serves at 12 a season; the term ended with
    turn 10: when next at your court, if content they renew themselves, otherwise …"; on notice,
    "serves at 12 a season; has given notice: asks 20 a season to serve on; leaves at the start of
    turn 12 unless renewed" (or "leaves when next at your court unless renewed"); a captive, who
    draws no wage while held, shows only a notice it gave, and one dead in the king's service no
    term at all. The web app's people lists use the same words, and its orders panel offers renew
    beside each servant at court or on notice, with a term for hiring and renewing. A free person
    at the court shows what it asks there (its pitch's price, or its base price), whether or not it
    pitched, and can be hired from the panel; one's own servants show no asking price.
  (Until the simulation-fixes round a servant who wanted more quit at once, the view read "wage 12
  until turn 10" with no word of what came then, no order could renew a contract, models could not
  name a term, and kings who tried to rehire their own envoys were told "not available for hire".)
- **Background checks**: public facts always; hidden facts with chance spend/150 (max 90%); deep
  facts with chance spend/400 (max 60%). Never the whole truth.
- **Spies**: detection chance 5% + watch spend/300 − competence/400, clamped to 2–60% a season.
  Caught spies confess their master if timid (or 40% of the time). Turned spies go back to their
  post (a court, or out in their province) and report what their new master wants, plus one true
  observation; one whose master, not knowing it was caught, had recalled it comes home instead, as
  told. A spy's report is written when it arrives, of the season it was observed: a model-played
  spy remembers nothing that happened to it since (such as its capture).
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
  background check finds it, and then shows). The master keeps paying the wage it believes it owes,
  into the character's purse, and its view's wages count it, so the treasury betrays nothing.
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
    seen. An envoy that went over to the host stays on the list, still paid, until it is dismissed
    or seen. The rumour is not sent once the envoy has stood at its master's court, and not told to
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
    after it was due that it has not returned). Dismissing it is accepted and ends the cover and the
    wage; a dismissed captive stays a captive.
  - **Captives.** A captive whose master has heard of it reads "held captive at the court of
    Assyria; Assyria demands 1 mina 30 shekels for their return (order pay_ransom)" (the demand once
    its word has arrived), never "at court, ready", and draws no wage, so its line names none; the
    web app offers the ransom button only then.
  - Script kings read the same view and are fooled the same way: a script king pays an envoy that
    went over to the host for as long as the cover holds, and gives it up (dismisses it) only once
    its line has read "has not returned" for three seasons (see Script kings, Court and
    intelligence).
  - **What a cover cannot hide:** a caught spy's reports stop coming, and a caught province
    watcher no longer adds its province to its master's sight; a background check on the servant
    finds a defection's public fact as usual; a captive whose master knew of it is seen on the road
    home as soon as it is let go. A spy posted at a court is listed in that court's view with its
    employer, "at your court", before anyone catches it (`docs/rounds/2026-10-18-sleep-and-simulation.md`,
    question 19, bug 4; not changed this round), so a defector its new master posts at its old
    master's court ends the old master's cover when it arrives.
  (Until the simulation-fixes round the master's list showed
  the truth at once: a caught spy "at court, ready for a mission", a detained envoy "has not
  returned" the same season, a defector dropped off the list and its wage stopped, an executed spy
  vanished.)
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
  employer with chance 30% + spend/400 (30–80%), which is announced to every court.
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
  `anthropic-dangerous-direct-browser-access` header.
- **Prompt-injection boundaries**: a character's prompt holds only its own persona, memory and
  facts (tested); text never changes state; the narrator receives only released facts.
- **Leader memory** is a private journal of its own notes and orders. A resumed game's model
  leaders start their journal afresh.
- **The customs primer** (on by default; `--no-primer` turns it off) covers the forms of address,
  gifts as a measure of respect, detained envoys and blaming the messenger, oaths before the gods,
  catastrophes as excuses, and the language of accusation: "Habiru" for outlaws and mercenaries,
  and "in league with the Habiru" as the charge of treachery. It is knowledge, not instructions.
  The Habiru are words only; there are no bandits in the engine.

## Pacing: sleeping seats

With `SleepingSeats` on (`--sleep on`, or Customize in the web app; off by default), the world
still advances every season, but a model or file seat is asked for orders only when something
concerns it, or when the time it chose has come. Script and human seats play every season as
before. There is never a global skip, and each seat sees only its own wake-ups.

- **Asleep.** The seat is not called. Its units hold, and the orders it scheduled for that season
  run. Nobody is told that it sleeps.
- **Choosing to sleep.** With its orders a seat may ask to skip N seasons (N = 0 means next season
  as usual), capped at `MaxSleep`. It is woken at the start of season t + 1 + min(N, cap).
- **Default wake triggers.** These are checked each season after the arrivals and reports, from the
  seat's own view only:
  - an envoy waits to be received
  - one of its envoys comes home, or a spy, check, assay or authentication report arrives
  - people seeking service present themselves
  - a catastrophe strikes it
  - a forged tablet it ordered is ready
  - it loses land, or unpaid troops desert
  - a foreign unit moved into its land or against its troops last season (even if the attack
    failed), or ended a move next to its land or in waters off its coast
  - one of its units was destroyed
  - a spy is caught at its court
  - a ransom is demanded for one of its people
  - a servant gives notice ("a servant gives notice: Mane asks 20 shekels a season to serve on"):
    the season of the notice is the one in which it can be renewed before it leaves
  - orders it scheduled could not be carried out, whether the validator rejected them or they
    failed as the season resolved (a levy, cession, gift or purchase that could not go through)
  - the cap is reached
- **Its own triggers** (at most 8): the unit in a named province moves or is gone; a named person of
  its own is back at court; its treasury, by its ledger, falls below an amount; foreign troops (of
  a given power, or any) are seen in a province; a province changes hands.
- **The digest.** Everything that did not wake it (distant movements it saw, rumours, treasury
  notices, rejected fresh orders) is shown when it next wakes, as "while you slept", with the
  reasons it was woken.
- **Scheduled orders**, kept secret in the seat's own state, up to cap + 1 seasons ahead, at most
  24 orders a season. Units are named by where they will stand in that season. One entry per season
  replaces everything scheduled for it, and an empty entry cancels it; that works for the current
  season too. They are validated when they run. In a season when the seat is awake, a fresh order
  for a unit or a person replaces the scheduled one for it, a scheduled order the seat repeats runs
  once, and the other scheduled orders still run. A renewal is not a task: a fresh renewal replaces
  a scheduled renewal or dismissal of the same person, and a fresh dismissal a scheduled renewal,
  but a renewal and an errand for the same person both run (the rulebook says so in a clause). A failed scheduled order wakes the seat next
  season; a failure the seat has already seen in its news, while awake, does not wake it later.
  Conditional orders ("unless X") are not built.
- **When a model call fails** and the script king stands in, the seat has not seen that season:
  its digest and its "while you slept" window are kept for its next real call.
- **A kingdom that falls** in its sleep ends its sleep that season ("the kingdom fell").
- **The cap** is a placeholder: `MaxSleep` = 6 seasons (two years), against "such as eight" in the
  design document. Batch and web reports record what each seat asked for and how long it slept,
  so the cap can be set from data. The batch seat report prints, per seat, the sleeps asked/slept
  and every reason it was woken, counted over its spells.
- **Replay.** Sleep state lives in `GameState`, and the log header records which seats may sleep,
  so replays stay exact (tested). With sleeping seats on, every season is also marked in the log
  (`t<turn>/season`), since a season can pass with no seat asked. A saved game with sleeping seats
  can be continued only by seats that can sleep for exactly the same kings.

## File seats and the agent simulation

A file seat (`--file-seats DIR|map.json` in the batch runner) is a model leader seat whose
"model" is a pair of files. It writes exactly what a model king would get (rulebook, customs
primer, identity, the season's view, journal and JSON schema) to `<folder>/<key>.request.md`, and
waits for `<key>.reply.json`. The engine validates the reply like anyone's. Because no API enforces
the schema here, the file seat checks the reply's types and enum values itself (missing fields are
read as empty, as "none"), and forgives a code fence or a stray line around the JSON. A reply that
is unreadable, breaks the schema, or stays empty gets one retry request saying what was wrong; a
second failure, or `--file-timeout` (120 minutes), falls back to the script king, as for models.
Each exchange is logged as a call with no tokens, and replays are exact. File seats can sleep.
Requests and replies left in a folder by an earlier game are moved aside when a new game starts.
Only a file seat's request ends with a footer for the agent answering it (`FileExchange.Footer`):
its final message must be the single word "done", and earlier reply files cannot be read, so its
record of earlier seasons is in the request. A model king called through the API never sees it.

`sim/` holds a kit that plays a game with one Claude Code agent per king, with isolation enforced
by construction, not by instruction: see `sim/README.md` and `docs/SIMULATION-PROMPT.md`. Starting
values for the first experiment, all settings rather than rules: seed 7; `--max-turns 10` (the game
stops after season 10, whatever the random end; the kings are not told, and their rulebook still
says no game ends before turn 15); `--sleep-cap 6`; script characters and the template narrator;
kings on Sonnet 5.5, the design's default leader model.

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
- **Strength**: 10 × the yield of the land held, plus gold. A king knows his own gold exactly. A rival's gold is an estimate, never below 0. **Growth** is strength over starting strength (10 × homeland yield + starting gold), and a fallen king's growth is 0. This is the game's own score.
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

- **Flow** = income − upkeep − wages.
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
- **Servants given up.** A servant whose line has read "has not returned" (the word that it is overdue) for three seasons, and still does in the fourth, is dismissed: its wage stops, and the court counts itself one short that season, so it may seek candidates and hire. This is how a script king stops paying an envoy that went over to the host, since its cover never ends otherwise. One that comes home, or is seen again, before then is kept. A script jailer lets a held envoy go within four seasons of the audience, and the overdue word comes two or three seasons after it, so the envoys script kings detain from each other are home before they are given up (an envoy held longer by a model or human king is dismissed, stays held, and once let go is free at the court that held it).
- **Assays** (fee 10, with spare above 15) cover every lot from a king trusted below 0.3, every lot that weighed light, and every lot of all if greed is above 0.6.
- **Watchmen** cost 20 + 30 × caution. The king hires them when a spy was caught in the last three seasons, or when caution is above 0.7 and spare is above 500. Spare must be above 40 either way.
- **Tablets shown to it.** One bearing a friend's seal is examined, at a cost of 30 + 50 × caution, if spare exceeds 60 + 60 × (1 − caution); at most one a season, and the rest wait. A tablet that is not examined is half-believed: trust in each sealer falls by 0.1 × (1 − caution).
- **Spies** need cunning above 0.55, two envoys ready and spare above 120, and then a chance of 0.35 × cunning. A spy goes to the war target's court, else the leader's, else the most hostile neighbour's. The king sends its least reliable envoy.
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

Script characters (`ScriptMind`) carry the letters of every king, script or not. Four of their rules shape what kings hear:

- **Softening.** A timid envoy (courage below 35) or one fond of the host (sympathy 50 or more) drops from the letter each sentence that threatens the host (`TextKit.IsThreatTo`): a threat word that is not denied ("will not march", "no war between us", "I march on no land of yours") and is aimed at the host. The host is "you" or "your", or any name of his, his land or his people (the names under Memory and learning). A threat is aimed at him when he is what it falls on ("I will burn your cities", "march on Babylon"), when he is to suffer it ("you will be crushed", "Babylonia will regret its insolence", "you are my enemy", "this is my last warning"), or when it follows from what he does ("If you do not withdraw, there will be war", "pay, or I will march"). These reach the host whole: a threat against a third king ("Hatti is our common enemy; let us march against him"), what another king may do ("Hatti will attack you"), help ("If Hatti attacks you, my armies will march to your side"; "I will support you if you are attacked"), the host's own march ("your march on Ashur") and a warning given as a brother ("I warn you of any muster"). If it dropped anything, it adds "My lord hopes that no quarrel will ever come between your houses." The rule reads words, not meaning: of the sentences the old filter cut from letters in the seed-7 agent games, none a threat to the host, it cuts none, but an unusual threat can still slip through.
- **Reporting home.** A faithful envoy (loyalty 60 or more, competence 50 or more, not bribed by this host) repeats the host word for word. A bribed envoy, or a timid one that is not faithful, drops the host's threats against its own lord in the same way. The host speaks to the envoy of its lord, so "he", "him" and "his" count as the lord too, unless the sentence names another king: "If his troops cross the river again, I will burn his cities" is dropped, "I will crush Assyria in the spring" is kept.
- **Assurances.** Reporting home, an ambitious envoy (ambition above 70) that overreached at the audience ("promised that my lord will agree to whatever the king asks") says "I gave him such assurances as you would wish." It says nothing of a commitment that did not overreach.
- **A bribe's request.** An envoy that took a host's gift passes on what the host asked it to tell its lord, in the host's own words, and vouches for it: "Carry my words faithfully, and tell your lord that my armies are few" becomes 'At the court of Hatti the king told me "My armies are few", and I saw for myself that it is so.' The message may stand anywhere in the request and name the lord as "your lord", "your master", "him", "the king" or by any of his names ("tell Pharaoh that…", "say to Tushratta that…"). A message forbidden ("do not tell your lord…") or empty ("tell him everything") is not passed on. Asked to speak well of another king ("speak well of Mitanni to your lord"), the envoy says "At the court of Hatti I saw for myself that Mitanni is a true friend to you"; of the host itself it already says "The king of Hatti is a true friend to you, my lord, and wishes only peace". The envoy still leaves out what it saw of the host's own troops.

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
current bot. Seeds 1–40, one current king against six baselines:

| Power | Growth alone | Growth as baseline | Wins alone | Wins as baseline |
|---|---|---|---|---|
| Egypt | 2.87 | 1.34 | 81% | 19% |
| Hatti | 2.65 | 0.82 | 73% | 8% |
| Babylonia | 2.48 | 1.13 | 54% | 6% |
| Mitanni | 1.80 | 1.30 | 36% | 25% |
| Assyria | 3.18 | 0.96 | 54% | 11% |
| Arzawa | 3.24 | 1.46 | 51% | 24% |
| Alashiya | 1.98 | 0.87 | 44% | 8% |
| All kings | 2.60 | 1.13 | 56% | 14% |

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

## Where the code differs from the design document (17 October 2026 revision)

The design document records intent; these notes record what is built. Where they differ today:

- **Pillar 8, war slower than diplomacy, is not met yet.** An army moves one link a season. Homeland
  provinces have no walls, so an empty one falls to a single army and a held one to two; walls
  (strength 1) stand only on free and bought cities. Hatti can take Arzawa's capital at the end of
  season 3. An envoy between capitals takes one or two seasons each way (never the rulebook's three),
  so a letter and its reply take two seasons between neighbouring capitals and four otherwise.
  Sieges, walls that vary, terrain and the other tempo ideas are not built (see
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, question 5).
- **Shared victory is off by default**, as recommended in `docs/rounds/2026-10-18-sleep-and-simulation.md` (question 23),
  and kept as a house rule. Scoring is as described in "Rules as implemented". Buying a city is score-neutral at the moment of purchase: its price is
  10 × yield in gold, and it counts 10 × yield in strength. The growth comes afterwards, from its
  income.
- **Two kinds of threat.** The script kings already weigh a security threat (hostility, troops on
  their borders) separately from a victory threat (the estimated growth leader), with temperament
  setting the mix (see "Script kings").
- **The sleep cap** is 6 seasons as a placeholder; the document suggests "such as eight".
- **Prototype scope** in the document still lists terrain modifiers as out, while "Walls and
  terrain" is now a decided direction. Neither exists in the code yet.

## Not built yet

- Sieges, varying walls, terrain, and distance-based marching (pillar 8).
- Conditional orders for sleeping seats.
- Multiplayer (stages 2 and 3 of the design document): the engine runs in one browser.
- Shareable spectator links; the log file is the way to share a game.
- Art, animation, sound.
