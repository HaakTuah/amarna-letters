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
- **Tablets lie in archives** (since Build order item 3; "Tablets are objects in a place"). Every copy a
  court holds (`TabletCopy`) lies in its archive at its capital (`TurnEngine.archive`): those it sealed, once its copy
  reached it, and those it was shown, brought, copied or took. Keeping a tablet costs nothing; its cost is that it is
  somewhere. The seat view calls the list "YOUR ARCHIVE".
  - **Spies copy.** A spy posted at a living court, each season it is not caught, copies with a chance of its
    skill/100 one tablet of that court's archive that its master neither holds nor has on the road home in an earlier
    report: tablets bearing two or more seals first (agreements, and forgeries of them), the newest first. The draw has
    its own stream (`archive`), so nothing else the spy sees or risks changed, and detection is unchanged: copying adds
    no risk. The tablet ids travel in the report (`SpyReport.tabletIds`); when the report arrives, each tablet the master
    does not hold by then becomes a copy in its archive ("copied from the archive of Assyria by your spy Mane"), and the
    engine adds a line to the report: "[With this report came copies Mane made in the archive of Assyria, now in your
    archive: the tablet sealed by Assyria and Hatti, dated turn 4 (your copy k123).]" (no text there: the archive shows it, and the script
    kings' reading of spy reports for troops stays clean). A report that never comes home (the spy caught before it was
    sent) brings nothing. A spy turned by the court it watches copies nothing: it sends home only what that court tells
    it. A spy watching a province, or a court that has fallen, copies nothing, and a report reaching a court that has
    fallen brings nothing. The spy remembers what it copied, and a model-played spy writing its report is told that a copy
    goes home with it when one does (not when its master came to hold that tablet while the report was on the road).
  - **Whoever takes a capital gains copies of its archive.** When a court's capital passes to another power at the
    end of movement, or by cession (the archive lies in the city; since the siege package a king cannot cede his own
    capital, so a capital is ceded only by whoever holds it after its kingdom fell, and the rulebook says "and so does
    anyone that city is later ceded to (a king cannot cede his own capital)"), that power gains at once a copy of every tablet in
    the court's archive it does not hold already ("taken with the archive of Assyria at Ashur"), and reads next season
    "With Ashur you took the archive of Assyria: copies of 2 tablets you did not hold are now in your archive: the
    tablet sealed by Assyria and Hatti, dated turn 4 (your copy k130), … (your copy k131)." (or that it held nothing new). The court keeps its own copies:
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
  - **Naming tablets** (since the fix pass after item 4). Every court names a tablet the same way, by its kind, seals and
    the date it bears (`Views.tabletName`: "the tablet sealed by Babylonia and Mitanni, dated turn 2", "the inventory
    sealed by Egypt, dated turn 3"), with its first eight words added where the archive holds another of the same kind,
    seals and date. A copy's id ("k8") is each court's own mark, for its orders only (`show_tablet_copies`,
    `authenticate`): the archive lists "- the tablet sealed by Hatti and Egypt, dated turn 1 [your copy k900]: "Peace."
    (how it came)", the audience request's "Tablets you hold" the same, and notices name the tablet before the mark
    ("… (your copy k130)"); the examination notice gives the tablet's text in full. **The scribes**
    (`TurnEngine.scribe`) write what other courts read with the writer's own marks as the tablets' names, and the ids of
    the people the writer knows ("c12", or "Mane (c12)") as their names: only those its view lists, its court or the
    people it knows (`Views.knows`, the test the view itself uses), so an id it does not know stays as written (since
    the review of the fix pass after item 4: before, any id became a name, so Egypt's letter "Greetings. c3 c4 c5 c6
    c7" came back in its own YOUR LETTERS naming five people none of its lists held, and the envoy and the host read
    the names too; tested). They scribe a letter, its mandate and its tablet (at dispatch, so the envoy, the
    host and the record all read the scribed text), a host's words and what it asks for a gift at an audience (in the
    runner, after the reply is logged, so the log keeps the king's own words and a replay scribes them again), the words
    given with a release, what a turned spy is to report, and a forgery's text. Marks that are not the writer's, and all
    other text, stay as written. The rulebook says so ("Naming tablets: …"), its HOW TO ANSWER asks for ids and marks "in
    your orders", and the schema's descriptions of `show_tablet_copies` and `item` speak of "your marks". (Until then
    each court read its own copy ids as the tablets' names, and kings used them aloud: in the second agent simulation
    Babylonia's "the peace of k8" reached Mitanni, whose copy had another id, and an envoy turned it into "the peace of
    turn eight". Script kings write no ids in their letters, so their games are unchanged.)
  - **Marks for gold** (since "Requests are rules too", the same fix pass). A lot of unassayed gold is named the same way:
    the view reads "Unassayed gold from Hatti, weighed in turn 3 [your mark g7]: 15 shekels weighed (the inventory said
    20)", where it read "Unassayed gold g7: …", and the scribes write the writer's own mark as the gold it names
    (`TurnEngine.goldName`: "the gold Hatti sent to Egypt, weighed in turn 3", with ", its inventory stating 20 shekels"
    where another lot of the writer's shares sender and season). The rulebook says so ("Your treasury likewise marks each
    lot of unassayed gold (like g7), for your assay orders only"), HOW TO ANSWER names the gold marks among those used "in
    your orders", and the schema's `item` speaks of "your mark for the gold (like g7)". A standing order's id ("s1") is the
    king's own too, for `cancel_standing`, and the view says so; no other court could read it, so the scribes leave it.
- **Gold travels with envoys.** The tablet's inventory states the amount; the host's weighers find
  what is left after any skimming. Purity is hidden until an assay.
- **The inventory is a tablet** (since Build order item 3). Gold an envoy carries comes with an inventory sealed by the
  court that sends it ("The inventory of the gold Egypt sends to Hatti: 1 mina 40 shekels."), dated the season the
  envoy set out, and gold a host sends back with an envoy has one sealed by the host, dated the audience. The receiving
  court keeps it in its archive ("the inventory brought by Mane, envoy of Egypt"; "the inventory Mane brought home with
  the gold of Hatti"), where it can be examined, shown, copied by a spy or taken with the capital like any tablet. Its
  scribe costs the inventory fee (20) since item 8, and gold may go without one, saving the fee and checkable by nobody
  (see [structured press](14-structured-press.md)). The sender keeps no copy (it knows what it sent). Every gold delivery leaves one, whether or not anything
  was swapped, so the presence of an inventory gives nothing away. An inventory bears one seal, so the script kings'
  rules on treaties and evidence (two seals or more, their own among them) never read one.
- **Swapped inventories** (since item 3; "Swapped tablets and false envoys"). An envoy that kept some, but
  not all, of the gold it carries, out or home, may hand over in place of the sealed inventory one it forges itself,
  stating only what is left (`AudienceRecord.swapInventory` from the envoy's presentation; `MindReply.swapInventory` from
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
    does. Until the fix pass after item 4 script kings never examined an inventory (they examined only tablets shown to
    them), so in script games a swap was never found; now they examine inventories, most often those that weighed light
    (see Script kings, Court and intelligence), and let go a servant of theirs found out. A model or human king may
    examine any tablet it holds, or send the inventory back to its sender as evidence, who knows what it sealed.
  - Script envoys decide by formula (see Script envoys); model envoys decide for themselves, told in their prompt that
    they could keep some gold "and, if you leave some, hand over in place of the inventory one you forge yourself,
    stating only what is left", and that their hand is skilled enough to fake a seal, with the schema field
    `swap_inventory` saying what it risks. The gold fields (`keep_gold`, `swap_inventory`) are in the schema of
    a presentation or a report home only when the envoy carries gold, and the shared character text says the gold
    decisions come "only when you carry gold"; likewise an envoy's answer at an audience asks `accept_gift` only when a gift
    is offered and `accept_service` only when a post is. (Until the fix pass after item 4 every speech and report asked
    how much of "the carried gold" to keep: in the second agent simulation one envoy told a host that gold came with him
    when none did, and 35 of the 36 character debriefs raised it.) Since the same pass's builder rule "Requests are rules
    too", `swap_inventory` is asked only of an envoy whose hand can fake a seal: one without the skill is told "your hand is
    not skilled enough to fake a seal, so you could not pass off a forged inventory: what you keep would show as gold
    missing against the inventory", and is not offered the swap (it once was, beside the line saying it could not).
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

