# Item 17+: the opening as it stood, the land east of the Jordan, and every place by its own name

Branch `item/opening-as-it-stood`, from `develop` at `20850a8` (item 17a merged). The item's text:
`docs/intent/build-order/item-17.md`, "Then **17+**"; its sections: "Starting positions come from the sources" (The
sources), "Places by their own names" (Voice of the age), "What earns a place" and "Places in their own time" (The map),
"Attested characters" (Characters). Design note: `docs/design/46-the-opening-as-it-stood.md`. Save version 38.

This account cannot reach the live design document: the copy on `develop` was cut on 2026-11-01 (revision 569 of the
Overview, 194 of the Build order), the day the item began, and the check before the pull request reads it again by its diff.

## What was built, in the order built

1. **Troops paid and fed by the king's standing order** (`c3025fb`). Every king starts with the order to pay and feed all his
   troops; he may hold back pay or food from all of them or from the troops in one province, and give it again. The
   engine pays and feeds nothing on its own. Script kings hold back pay when the treasury cannot carry the season.
2. **Armies, fleets and documented debts where the sources place them** (the Great Kings' men in the cities the dossiers
   name, the coast's ships where they campaigned, three debt tablets between courts).
3. **The land east of the Jordan and the map checked against 1346**: the Shasu in Seir and the Negev, the plateau beyond
   the Salt Sea outside the game, Gath for Hebron, the Lady of the Lions' valley, Suhu folded into Babylonia, Nesa a land
   with no great town, every town's people as it stood.
4. Places and people by their own names, and a power's name as a claim (below).
5. The people of 1346 who did not rule (below).
6. The model-text finds of the hand-off (below).

## Readings taken

Each with the principle it rests on ("Reason from the pillars").

1. **Egypt's army "at home and in Nubia"** (the armies dossier): 6,000 at Men-nefer, the army's base [B], 4,000 at
   Akhetaten with the king [B], 2,200 at Waset [G], 2,800 in Kush under the viceroy, whose campaign of year 12 is
   Akhenaten's only attested one [B that troops were there; C how many]; the garrisons at Gaza and Sumur 100 each [A]. The
   split is a first guess within the dossier's total ("Starting positions come from the sources").
2. **Kumidi's garrison waits for item 17++**, which brings its commissioner: a vassal's land is not land by leave, so an
   Egyptian unit standing in Upe would take its food from Biryawaza's people and raise unrest there every season, which
   no source shows ("Everything is somewhere"; "No stopgaps").
3. **Hatti's men** at Hattusa 5,500, Samuha 3,000 (the army base of the Upper Land, KBo VI 28 [A]), in Kizzuwatna 3,000
   under Telipinu facing Syria [B], Tuwanuwa 1,500 (the Lower Land facing Arzawa [B]), Nesa and Sapinuwa 1,000 each [G];
   its five ships off Kizzuwatna, in its waters as every other fleet, so that one unit stands in a province.
4. **Mitanni's** at Washukanni 5,000, Harran 3,000, Taidu 2,000: the west, where the Hittite war is coming [C]. **Babylonia's**
   at Babylon 4,000, Dur-Kurigalzu 3,000 [B], Nippur 1,500 [B], Sippar 1,500 [G]. **Assyria's** in the Tigris triangle,
   Ashur 2,000, Nineveh and Arbela 1,000 each [B]. **Alashiya's** at Enkomi 1,000 and in the copper hills 500 [G].
5. **The coast's ships where they campaigned:** Arwad's off Byblos, blockading it with Amurru (EA 98, 105) [A]; Sidon's off
   Tyre, cutting the island from its mainland town (EA 148-149) [A; B that it was so in 1346, since EA 155 names
   Meritaten]. A fleet in another's waters is a fact of the opening, not a war: what follows is the kings' ("Physics,
   not politics").
6. **Aziru's men in Sumur's countryside** (EA 103-106: his men around Egypt's base) [B; C on the year], standing, not
   besieging: the game starts just before the fall of Sumur as it starts just before the Great Syrian War, so the siege is
   Aziru's to order. **Labaya's war on Megiddo** (EA 244) was over before 1346: Shechem's men stand at home.
7. **Three documented debts** between courts, as the letters dossier states the claims [A]: the gold statues owed to
   Tushratta (EA 26-29), the silver owed to Burna-Buriash for his merchants and Salmu's caravan (EA 7-8), the copper
   Alashiya says it still owes Pharaoh (EA 35). The sums are first guesses against the treasuries [G]: 200, 60 and 80
   shekels; each due within the first year, since the letters press for it now. Grievances that are not claims to a sum
   (gold come short out of the kiln, envoys detained) are not debts.
8. **The Shasu hold Seir and the Negev** (Amenhotep III's lists at Soleb [A]); the Bashan is Ashtaroth's, the land south of
   it Pella's [B]; the plateau beyond the Salt Sea is land outside the game, labelled by description [B]. So the Shasu no
   longer border Ashtaroth, Pella or Jerusalem (item 11f+'s King's Highway band, grade G, undone), and the Jordan crossing
   by Jericho joins Jerusalem to Pella only.
9. **Gath for Hebron:** the province and power ids are renamed (`gath`, `Gath`), since nothing kept the old ids and a power's
   id shows in text wherever a line names a power by id (the hand-off's find). "The engine's ids stay as they are" lets
   ids stay; it does not require a misleading one to be kept. Gath (Tell es-Safi) is not rough ground; its land runs
   from the Shephelah up the Elah valley by Qiltu into the southern hills, which the sources make Shuwardata's (EA
   279-280, 290) [B], so Gath stands between Gezer and Lachish and borders Ashkelon, Aijalon, Jerusalem, Lachish and the
   Shasu.
10. **The Lady of the Lions' city-state** `aijalon`: in the Aijalon valley near Aijalon and Zorah [B], its site uncertain
    (Yalo, 31.84 N 35.02 E, stands in for it [C]); yield 5 taken from Gezer and Jerusalem (1 each) [G]; walls 1 and a
    spring [G]; a small town [G]; Egypt's vassal (EA 273-274) [A]; bandit country, since Abdi-Heba's caravan was robbed in
    the countryside of Ayyaluna (EA 287) [A]. The road from Gezer up to Jerusalem runs through it ("a road over a third
    province's land passes through it").
11. **Suhu folds into Babylonia** [C]: the dossiers show it acting as no polity in 1346 (the walls dossier: not excavated for
    the period [S]; the politics dossier: Babylonia "to about Hit"), so the province is Babylonia's land, its yield as it
    was (balance frozen), and the power is gone. The tests that used Suhu as a free city free it as before (`oldWorld`).
12. **Alshe and Ashtata (Emar) do not join the map**: Alshe appears only in Shuttarna III's doings after 1346 (the Shattiwaza
    treaty), Emar only as a crossing and Idrimi's refuge a century before; neither acts as a polity in 1346 ("What earns a
    place").
13. **Nesa a land with no great town** [B]: its town about 1,000, drawn without a town's rings; its old mound walls stay 1,
    since a mound fort is not a town.
14. **Every town's people as it stood**: Akhetaten 18,000 (the item's 15,000 to 20,000, below Waset and Men-nefer at
    30,000) [B]; Kalavasos 1,000 [B]; Nesa 1,000 [B]; Gath 3,000 [C]; Tunip 5,000 [C]; Aijalon 1,000 [G]; the rest checked
    against the people dossier's ranges and found within them.
15. **A unit held back from pay counts a season of missing pay** ("unpaid soldiers desert, as the economy's rules already
    say"); **one held back from food** draws nothing from the stores and buys nothing with its king's gold, eats what it
    carries and then takes from the land, as any unit does: the king saves his stores, his people pay ("Incentives, not
    quotas"; "Nothing happens unless someone orders it").
16. **Script kings hold back pay only when hard up** after borrowing, from units with no missed season that stand in their own
    land with no foreign troops beside them, largest pay first, and pay them again the next season; **they never hold back
    food**, since hungry men take from their own land and mutiny fast ("learn when holding back pay is worth its price").
17. **A kingdom falling within two seasons:** in the 20-game benchmark before the item, 7 games had one (Lukka 5, the Suteans 3,
    the Shasu 1); none is a Great King's capital, so the builder rules' balance exception does not apply and nothing is
    tuned ("Balance: first guesses during the build, tuning at the end").

18. **One name a place, and the letters' form first:** every province's shown name is the letters' Akkadian form where the
    letters name it, else the period's own tongue, else a description, as "Places by their own names" orders them; each
    is graded in `docs/design/46-the-opening-as-it-stood.md` [A for the letters' forms; B for Gimti, Shushan, Urim,
    Samuha's and Washukanni's sites]. Egypt's own places take the Egyptian form (Waset, Men-nefer, Ta-Mehu, Kush), as the
    section's own examples do, though the letters know Memphis as Hikuptah: one name a place, and the Egyptian seat's own.
19. **The Great Kings' realms keep the design document's names** (Egypt, Hatti, Karduniash, Mitanni, Assyria, Arzawa,
    Alashiya): the document names them so in every section, the power ids are these names, and the section's examples are
    all places within realms; Miṣri for Egypt or Aššur for Assyria would be a change of the document's own vocabulary, so
    it goes to Haakon as a matter of taste (question 1).
20. **The seas by description** (the Western Sea, the Eastern Sea, the Gulf): the Greek names (the Aegean, the Red Sea) are
    later; the Egyptians' "Great Green" names the whole sea. The waters off a coast take the coast's name.
21. **Pharaoh's father** is Nimmureya to foreign courts, as the letters write him; nothing in the game names him yet (no
    legend or request does), so the rule is kept for the first text that will.
22. **The modern name reaches the human player** on the province card's second line and the models through the rulebook's
    list of provinces, which already lists each place once (the gazetteer); the README names the renamed places once.

23. **A post is an errand:** a person in his post is employed by his court as a starting servant is, since "a job is always
    an errand" and a long stay is an errand with a deadline ("Hiring" in the one page); his first errand is named when he
    is first sent. A claimant or a town's ruler starts free at his court with a stake, so no one starts idle.
24. **Where a character can stand is a court,** so a commissioner at Hazzatu or the viceroy in Kush stands at Pharaoh's court
    with his origin and his post until item 17++ places the governors and the open residents in their provinces, as its
    text says it will.
25. **Purses scaled to the king's** [G]: a great officer of Egypt a tenth of the treasury at most, a commissioner a thirtieth,
    a city-state's claimant or town ruler a quarter of his city's treasury, the two Assyrian envoys a thirtieth of theirs.
26. **Names the sources do not give** (Assyria's envoys, the governor of Alashiya, Abdi-Heba's scribe) are given in their
    court's style and marked generated [G]; the governor of Alashiya takes a later governor's name [C].
27. **Artatama II stands at Mitanni's court** with his stake in Mitanni's love, since the sources do not say where he was and
    a character stands at a court; his share of the people's love is item 17++'s to seed.

## The model-text finds of the hand-off ("Requests are rules too")

- **The adjudicator's shorthand** ("A memphis holds", `unitLabel` in `model/state.ts`, the report lines and reasons in
  `rules/adjudicator.ts`, `turn/resolve.ts`, `turn/sieges.ts`): every unit is now "army in Men-nefer" or "fleet in Ta-Mehu
  waters", and every place in a report line, a reason or a fall-back is by its own name; nothing a king reads shows a
  province id except the orders' vocabulary, which the rulebook's list maps to the names.
- **"Qadesh won, far."** (`turn/battles.ts`): "won by far", "won clearly", "won narrowly", and the powers by their shown names.
- **"season(s)"** (`turn/intel.ts`, `turn/envoys.ts`, `turn/sieges.ts`): "1 season", "3 seasons".
- **Ids in engine text:** "watching lukka" (`rules/views.ts`) is by the place's or the court's name; the debt-default event
  names the borrower, not "c100 let debt d64 pass"; the spy who confesses names the court by its shown name. The order
  summary "pay c12 the rest of the fee owed" keeps the person's id, since person ids (c12) are the vocabulary the orders
  use and the requests show.
- **Fractional treasuries** (`formatMoney`): rounded to whole shekels before any text.
- **"10 x its homeland yield"** (`src/llm/src/rules.ts`): the strength line says what is built: ten times what the land
  produces in a season, plus the treasury and what the provinces' purses and stores and the troops' baggage hold.
- **Left as they were, listed for the next pass:** the sleep digests and wake reasons ("Assyria's army moved ashur ->
  arbela") still use province ids, as the orders do; the powers named by id in the treasury and press lines ("Egypt could not
  pay its troops"), where the id and the shown name agree for every power but Babylonia (Karduniash), Hana, Halab,
  Mukish, Upe and the renamed cities; the polish lane's list in `docs/rounds/2026-10-31-polish-lane.md`.

## Where to pick up (hand-off, 1 November 2026, usage cut-off)

The session building this item was stopped at 98% of the weekly usage. State of the branch `item/opening-as-it-stood`:

- **Built and committed:** A (positions and debts), B (the land east of the Jordan, the map check), C1-C4 (places by their
  own names, modern names on the card only, names by court: Naphurureya abroad, Akhenaten at home), D (the standing order
  to pay and feed troops, with the script kings' `--upkeep-play-half` flag), E (the people of 1346 who did not rule, with the
  names-weighed table below), F (the model-text finds). Save version 38. Benchmarks before are above; after and the
  use-against-ignore run for D are **not run yet**.
- **Tests:** the suites of the engine text tests passed after F; the full `scripts/test.sh` after F was started but its
  result was not read. Run it first and fix what fails.
- **Not built: "A power's name is a claim" (C5).** Design settled: `GameState.names: Dict<Power,string>` (the name each
  power claims) and `nameGiven: Dict<Power, Dict<string,Power>>` (whom each court gives a contested name to); `power.ts`
  gets `setNameClaims(names, fallen)` (registered beside `setRisen` in `turn/core.ts` line ~47, `factory.ts`, the batch
  runner's and the web client's state loads), `claimedName`, `holderOfName`, `claimantsOf`, `house(p)` ("Bit-" and the
  king's first name, or "Bit-" and the land), `land(p)` honouring claims (the house name when contested and not the
  original holder), `landFor(viewer, p, given)`; orders `claimName(name)` and `giveName(name, power)` with validator
  (any name the map knows or a power claims; the power must claim the name) and `court.ts` cases logging "name-claim" and
  "name-given"; `SeatView.claimedName` and `nameClaims: {name, claimants, givenTo}[]`; model actions `claim_name` and
  `give_name` (`item` is the name, `power` the claimant), a NAMES CLAIMED prompt line and a rulebook bullet in
  `rules-money.ts`; a script-king `claims.ts` (claim a fallen realm's name when holding its capital; give a contested
  name to a bond friend, else the capital's holder, else the original holder) called after `courtMove` in
  `script-leader.ts`; a select in the web `CourtSection`; an engine test `names-as-claims.test.ts`; the design note
  (`docs/design/46`), the README and this report. A patch script with the engine and model parts written was in the
  stopped session's scratchpad and is lost: write it again from this list.
- **Then:** the after-benchmark (`scripts/sim.sh --games 20 --seed 1 --verify-replay`) and `--upkeep-play-half` over 50
  games, their rows here and in the progress file's "Use against ignore" table; the people counts (wake-ups, calls, each
  person's asked/sent/served from the batch summary line "People of the sources"); the check for changes
  (`git diff 20850a8..origin/develop -- docs/intent .claude/rules`); the progress file's 17+ line and "For Haakon" table
  (design question 1 below); the reviewer (not run yet); merge; the milestone PR.
- **Leftovers noted, not done:** sleep digests and wake reasons still name provinces by id; treasury and press lines name
  powers by id; `svg-renderer.ts` is 52 KB (split in its own PR).

## Design questions

1. **Should the seven Great Kings' realms take the period forms too** (Miṣri for Egypt, Aššur for Assyria), or keep the
   names the design document uses throughout (Egypt, Hatti, Karduniash, Mitanni, Assyria, Arzawa, Alashiya)? Reading
   taken: keep them, since the document itself names them so and the section's examples are places within realms.
   Alternative: Miṣri, Aššur (Hatti, Karduniash, Mitanni, Arzawa and Alashiya are period forms already). Answerable with
   "keep" or "period".

(Filled in as the item proceeds; each checked against "The game in one page" and the item's sections first.)

## Benchmarks

20 games, seed 1, `--verify-replay`, develop as the item started: a capital fell in 20 of 20 games (339 kingdoms fell in
all); the first fall in season 3.5 on the median; a kingdom fallen in the first two seasons in 7 of 20 (Lukka 5, Suteans 3,
Shasu 1); Egypt fell in 0, Hatti 3, Babylonia 0, Mitanni 3, Assyria 9, Arzawa 3, Alashiya 0. After: below.

## The people of 1346 who did not rule: every name weighed

Each name passes two tests or is left out: the historical (active in 1346, placeable, graded) and the game's (he starts
on an errand the game can carry out, or with a stake in a province's love, and adds play rather than noise and model
calls). "Post" means employed by his court from the first season, his post his job; "stake" means a free man at a court
with a claim or a town of his own, which item 17++'s ledger seeds. Kings, queens and princes stay out as before. What the
sources say of each is his traits (`core`), never a script. Sources: the people dossier, the courts dossier, the letters'
index of persons (Moran).

| Name | Where in 1346, and what the sources say | In the game | Taken? |
| --- | --- | --- | --- |
| Ay | God's Father, Master of the Horse, at Akhetaten (his tomb) [A] | Egypt's post: the chariotry and the king's household; able, ambitious, rich | taken |
| Nakht | Vizier at Akhetaten (his house) [B] | Egypt's post: vizier; competent, loyal | taken |
| Panehesy | Chief servitor of the Aten (his tomb) [A]; a Nubian name [C] | Egypt's post: priest of the Aten | taken |
| Huya | Steward of Queen Tiye (his tomb) [A] | Egypt's post: steward of the queen mother | taken |
| Thutmose | Viceroy of Kush, named on the Buhen and Amada stelae [A] | Egypt's post: King's Son of Kush, origin Kush; item 17++ gives him Kush as his grant | taken |
| Paatenemheb | A general of Akhenaten's (his Amarna tomb) [B] | Egypt's post: general, who may be granted an army | taken |
| Ramose | A general's Amarna tomb [B] | one general is enough for the cast | left |
| Meryra I, Meryra II | High priest of the Aten; overseer of the harem (their tombs) [A] | no errand the game carries: the cult and the harem | left |
| Pahanate (Pahamnata) | Commissioner at Sumur (EA 60, 62, 68) [A; doubt in 1346] | Egypt's post: commissioner at Ṣumur | taken |
| Pawura (Pihuru) | Commissioner in the north, with troops (EA 117, 124, 131-132, 287, 362) [A; doubt] | Egypt's post: commissioner, origin Gubla | taken |
| Ha'ip | The official who handed Sumur to Abdi-Ashirta's sons, Rib-Hadda says (EA 132) [A] | Egypt's post: commissioner; greedy, disloyal by Rib-Hadda's account | taken |
| Rianap | Commissioner, Gezer's and the south's (EA 292, 315-326) [A; likely] | Egypt's post: commissioner, origin Hazzatu | taken |
| Tahmashshi | Commissioner, Tagi writes to him (EA 265) [A; likely] | Egypt's post: commissioner | taken |
| Hatip | The official who came with Hani to Amurru and took the gold, Aziru says (EA 161) [A] | Egypt's post: royal envoy; greedy | taken |
| Amanmasha | An official with Rib-Hadda (EA 113-114) [A] | one more Egyptian in the north adds little beside Amanappa | left |
| Shuta | A name of Egypt's envoys in Tushratta's letters, its reading unsure [C] | not placeable with confidence | left |
| The scribes of the Place of the Letters | Unnamed [A] | the court scribes already stand for them | left |
| Nefertiti, Tiye, Meritaten, Kiya, Tadukhepa | The royal women [A] | queens and princesses stay out | left |
| Hekanefer | Prince of Miam (in since item 10) [B] | as before | in |
| Zida | Chief of the bodyguard, Suppiluliuma's brother, who led armies (the Deeds) [A] | Hatti's post: chief of the bodyguard; brave, loyal | taken |
| Lupakki | General (in since item 10) [A] | as before | in |
| Hattusa-ziti | Chamberlain and envoy, later [A, later] | a generation on | left |
| Arnuwanda, Telipinu, Piyassili, Mursili, Zannanza | The king's sons [A] | princes stay out | left |
| The chief scribe | Unnamed in 1346 | the court scribe stands for him | left |
| Artatama II | Rival king of the Hurrians, with Hittite backing (the Shattiwaza treaty) [A; B the timing] | a claimant: free at Mitanni's court with a stake in Mitanni's love; proud, ambitious, disloyal to Tushratta | taken |
| Shuttarna III | Artatama's son, who later hands the treasure to Assyria and Alshe [A; likely] | his father's heir: free with the same stake; greedy, cunning | taken |
| Kili-Teshup (Shattiwaza) | Tushratta's son [A] | a prince | left |
| Akit-Teshup (Mitanni) | A noble who fled to Babylon with chariots, later [A, later] | a generation on | left |
| Iuni, Gilukhepa | The queen and the king's sister [A] | out | left |
| Enlil-kidinni | Governor of Nippur (the Nippur letters) [A] | Babylonia's post: governor of Nippur; item 17++ gives him Nippur as his grant | taken |
| Ili-ippashra | Governor of Dilmun, writing to Enlil-kidinni [B] | Babylonia's post: governor of Dilmun, origin Dilmun | taken |
| Shindishugab | Burna-Buriash's envoy to Egypt (EA 11) [B] | Babylonia's post: royal envoy | taken |
| The sukkallu, the diviner | Unnamed offices [B] | no name to place | left |
| Kurigalzu, the bride | The king's kin [A] | out | left |
| Assyria's envoys | Kept standing in the sun in Egypt, unnamed (EA 16) [A] | two of Assyria's post: royal envoys, named in the Assyrian style [G], come home with the fact of it | taken |
| Muballitat-Sherua, Enlil-nirari | The king's kin [A] | out | left |
| Kalbaya, Irshappa | Envoys (in since item 10) [A; doubt] | as before | in |
| Tarhundaradu's scribe | Writes a personal note to Pharaoh's scribe (EA 32) [A] | the court scribe stands for him | left |
| The governor of Alashiya | Writes to his Egyptian counterpart (EA 40) [A] | Alashiya's post: the governor, named in the Cypriot style (Eshuwara, a later governor's name [C]); item 17++ gives him his grant | taken |
| The king's merchants, the eagle diviner | Unnamed (EA 35, 39) [A] | the styled merchants stand for them | left |
| Ilirabih (Ili-rapih) | Rib-Hadda's brother, who shut him out of Gubla (EA 137-140, 162) [A; B the brother] | a claimant: free at Gubla with a stake in its love; ambitious, disloyal to Rib-Hadda | taken |
| Pu-Baʿlu | Son of Abdi-Ashirta, Aziru's brother (EA 104, 132) [A] | free at Amurru with a stake in Amurru's love, Aziru's brother and rival; bold | taken |
| Baʿluya (Baaluya) | Aziru's brother, who wrote to him while he was held in Egypt (EA 170) [A] | free at Amurru with the same stake; loyal to the house | taken |
| Bet-ili | Another writer of EA 170 [A] | a third brother of one house is noise | left |
| Akit-Teshup (Niya) | Takuwa's brother, who turned Niya against him and Hatti (the Shattiwaza treaty) [A] | a claimant: free at Niya with a stake; ambitious | taken |
| Tagi | Labaya's ally, who ruled his own town, Ginti-kirmil, in the Carmel region (EA 249, 264-266) [A] | a town's ruler: free at Magidda with a stake in Magidda's love and a purse of his own; cunning | taken |
| Yashdata | Driven from his town by Labaya's men, with Biridiya at Megiddo (EA 245, 248) [A] | a dispossessed town ruler: free at Magidda with a stake; aggrieved, brave | taken |
| Endaruta | Ruler of Akshapa, near Akko (EA 223, 366) [A] | a town's ruler: free at Akka with a stake | taken |
| Shum-Adda son of Balumme | A man of Akko who killed Babylon's merchants at Hinnatuna (EA 8) [A] | free at Akka; greedy, violent | taken |
| Shutatna (Zatatna) son of Surata | A man of Akko, with Shum-Adda; later Akko's ruler (EA 8) [A] | free at Akka; the ruler's son, with a stake | taken |
| Yapah-Hadda | Rib-Hadda's enemy on the coast, siding with Aziru (EA 83, 85, 98, 113-114, 116) [A; C which town] | free at Ṣiduna with a stake on the coast; hostile to Rib-Hadda | taken |
| Arzawiya of Ruhizzi | With Aitakama against Pharaoh's land in Upe (EA 53-54, 191, 197) [A] | a town's ruler: free at Dimashqa with a stake in Upe's love, leaning to Qadesh | taken |
| Teuwatti of Lapana | The same (EA 53-54, 193) [A] | the same | taken |
| Biridashwa of Yanuamu | Took Biryawaza's chariots, with Arzawiya (EA 197) [A] | a town's ruler: free at Ashtartu with a stake | taken |
| Abdi-Risha, Shatiya of Enishasi | Rulers of a Beqaa town (EA 187, 363) [A] | Upe already has two town rulers; a third adds noise | left |
| Zitriyara, Bayadi, Shubandu, Rusmanya, Dagan-takala, Hiziru, Shamu-Adda, Baʿlu-mehir | Vassals whose towns cannot be placed [A the letters; S the place] | not placeable | left |
| Pu-Baʿlu of Yurza | A ruler near Gaza (EA 314-316) [A] | Yurza unplaced; a name shared with Aziru's brother | left |
| Yabni-ilu, Shipti-Baʿlu | Lachish's rulers beside Zimreddi (EA 328-332) [A] | rulers in sequence; the seat's is Zimreddi | left |
| Yapahu | Milkilu's brother and successor at Gezer (EA 297-300) [A; B in 1346] | free at Gazru with a stake, the ruler's brother | taken |
| Baʿlu-shipti, Addu-danu | Of Gezer (EA 292-294) [A] | one claimant at Gezer is enough | left |
| Abdi-Ashtarti | A southern vassal, perhaps Shuwardata's successor (EA 63-65) [C] | unplaced | left |
| Labaya's other son | Unnamed (EA 250) [A] | out | left |
| Abdi-Heba's scribe | Trained in north Syria, by his hand (EA 286-289) [B] | Urusalim's court scribe, attested, named in the north Syrian style [G] in place of the generated one | taken |
| Ilimilku | Scribe at Ugarit (in since item 10, but at Hatti's court) [A] | moved to Ugarit's court, where he wrote | in, corrected |
| Shutatarra | Aitakama's father, dead or old (EA 189) [A] | out | left |
| Heba | Perhaps Niqmaddu's queen (EA 48) [C] | out | left |
| The captains of the Nubian garrisons | Unnamed (EA 287 and others) [A] | the two generated captains stand for them, as before | in |
