## Characters

- A pool of 18: eight names attested in the Amarna letters (Mane, Keliya, Pirissi, Tulubri,
  Haamashshi, Artessupa, Mazipalali, Yanhamu; seven are drawn per game) and the rest in regional
  name styles. Each power starts with two envoys; the rest are free agents.
- Traits 0–100 (loyalty, greed, competence, ambition, courage, an optional sympathy) and discrete
  facts at three secrecy levels. Persona text is written once (template, or Sonnet narrator) and
  kept, but its trait words follow the traits: every model request is built with the persona as it is
  now (`Personas.current`). A template persona has its trait words ("loyal mostly to yourself; fond
  of gold and quick to see a profit; …") and what it wants most rewritten in place from the current
  traits, the rest (its secrets among them) as written; a persona the narrator wrote cannot be
  rewritten without a model, so it is followed by "As you are now (where anything above differs,
  this is how you are now): you are …. What you want most: …." The web app's people panel shows the
  same. (Until the fix pass after item 4 the words were frozen: in the second agent simulation nine
  characters lost loyalty and four were described wrongly. Item 11 replaces the persona with a
  strategy, rewritten when the traits change which strategy fits.)
- **Memory** is an episodic list. When it grows past 12 entries, the engine asks the character to
  fold its oldest entries (all but the newest six) into its summary, in its own voice: Haiku when
  characters are model-played, a deterministic condensation for script characters. The summary
  is recorded like any decision, so replays stay exact. Prompts carry the summary and the most
  recent ten entries; memory travels with the character to a new employer. The request names the
  court the character belongs to (its employer's, else the court it stands at); one with neither, free
  and on the road, belongs to no court, and its request names none (`MindRequest.court` is null; only
  reports, pitches and background checks must name one, `MindRequest.for`). Nothing reads that court
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
- **Contracts** (one line in the rulebook). Every servant serves for a term (`Contract.untilTurn` is
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
    a season through turn 17."). Otherwise it gives **notice** (`Contract.noticePrice`,
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
  to its back pay (`Character.backPay`, per court), and no gold leaves. Right after the season's
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
- **Characters' gold, and the richest characters** (since Build order item 3; "The richest characters").
  A character's purse (`Character.purse`) was already tracked; every gain now goes through `Character.gain`, which
  also counts it by source (`Character.earned`): wages (paid at court, and back pay paid when it came back), gold
  skimmed (out or home), kings' personal gifts at audiences, and gold it was carrying when dismissed on the way out.
  Characters start with nothing and spend nothing yet (no escort, storage fee, loan or robbery exists; item 11), so the
  parts add up to the purse (tested over a whole game). A captive or a dead character keeps its purse, as before (what
  capture and execution do to a purse is item 11).
  - **Wealth** (`Wealth.of`) is the purse plus the back pay every court still owes it (a fallen court's debt died with
    it). The document's other two parts, a hoard and what kings owe it on debt tablets, do not exist yet (item 11) and
    count nothing; every place the ranking is shown says so ("Wealth is the gold in a character's purse and the back pay
    kings still owe it; hoards and loans to kings on debt tablets do not exist yet. The dead are not ranked.").
  - **The ranking** (`Wealth.ranking`): the living characters, richest first, ties by id, each with whom it serves (or
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
  spy remembers nothing that happened to it since (such as its capture), and its request says it is
  that season ("It is now season 3", where it once gave the season the report arrived, beside "This
  season you observed"), with the facts of its life and its secret master as they were then (the
  report keeps them: `SpyReport.factCount`, `SpyReport.secretMaster`), so a report still on the road
  when the spy was caught and turned is not written by the double agent it became. Since the follow-up's review of
  that pass the report also keeps its lord, wage, purse and back pay then (`SpyReport.lord`, `Wage`, `Purse`,
  `backPay`): a spy dismissed while its report was on the road read "You serve nobody at present" beside "You are
  quietly watching … for your lord". Its persona's trait words are still as its traits are now. A spy at a court also copies
  from its archive, and the copies come home with its report (see "Tablets lie in archives").
- **A spy at a court is hidden from it** (since Build order item 4; the rulebook says so under the spies'
  paragraph). A spy posted at a court stands there (`Character.at`), but the court does not see it there
  (`Character.hiddenAt`, `Views.seenAtCourt`): its view does not list it for being there, and gives it
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
  character carries a cover (`Character.covers`): what its master still believes. Each court keeps
  its own: an envoy that went over to Alashiya is covered for Egypt, and, if Alashiya then sends it
  to Hatti and Hatti holds it, for Alashiya too; what happens between Alashiya and Hatti changes
  nothing Egypt sees. The master's view lists it as it would have stood in the normal course of
  events, never ready: a caught spy "watching Assyria" where it was posted, a detained or defecting
  envoy "on the road home". Its facts are those the master knew before, plus whatever the master's
  own inquiries find later, as for any servant (a defection's public fact stays unseen until a
  background check finds it, and then shows). Nobody away is paid until it is back (see Back pay),
  so no wage leaves the treasury for anyone away, whatever befell it, and the treasury betrays
  nothing. A cover keeps the back pay its master believes it owes (`Cover.backPay`): the real back
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
    course (`Cover.timingText`): a detained or defecting envoy reads like one sent home at the
    audience, a caught spy recalled like one really recalled, and the overdue word clears it, as it
    does for a servant really held. (Until the simulation-fixes round the view gave no turns, and
    kings mistimed their replies.)
  - Script kings read the same view and are fooled the same way: a script king keeps an envoy that
    went over to the host on its list, its believed back pay growing, for as long as the cover
    holds, and gives it up (dismisses it) only once its line has read "has not returned" for three
    seasons (see Script kings, Court and intelligence).
  - **Sight.** A caught or released province watcher keeps its province, and the links next to it,
    in its master's sight while the cover believes it at its post (`Views.sight`), so the capture
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
  the talk of that court (`GameState.losses`, one `LossAbroad` each: the season, the court, the
  servant, and whom it served as that court knows it, which is known only if it confessed when
  caught). Other courts hear of it only from carriers: an envoy received at that court hears of each
  captive it still holds with a chance of its skill/100 (as it notices other envoys there), and of
  each servant it put to death in the season of the death or the 3 after (`LossNewsSeasons`)
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

