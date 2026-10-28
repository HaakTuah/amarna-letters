## Roads and reputations (item 11b)

Build order item 11b. Save version 21. The report is `docs/rounds/2026-10-28-roads-and-reputations.md`. First guesses
are in `BandData` (`src/engine/src/model/bands.ts`), `LetterData` (`turn/letters.ts`), `NewsData` (`rules/news.ts`),
`LossData` (`turn/bands.ts`), `WaryLost`/`WaryKilled`/`WaryMost` (`turn/court.ts`) and `LeaderPace` (`turn/travel.ts`);
item 18 tunes them.

### Bands (`turn/bands.ts`, `GameState.bands`, `Band`)

- **A band** is men a chief (a character, duty `Leading`, `at` null, `watchProvince` its province) gathered from the
  loose men of a province. It holds no land and seals nothing. Kings see the bands in their land and sight
  (`SeatView.bands`).
- **Heads rise** ("A head rises where men lack one"), each a new character whose traits the circumstance leans, with the
  public fact of how he rose and the hidden fact "Rode with the Habiru":
  - a crowd of at least `crowd` 3,000 loose men where the holder's troops do not stand, a chance a season of 1 + 1 for
    each 3,000 more (at most 8) in a hundred, halved for each band working there or next door (stream `heads`); 2 in a
    hundred of the crowd follow him, at most 80;
  - mutineers (`feedTroops`): an army that mutinies on land follows one of its own with a chance of 20 + 1 for each 500
    men in a hundred, its men and savings his;
  - a fallen court's refugees (`fall`): with a chance of 50 in a hundred, a careful head at the fallen capital, speaking
    its tongue, with its loose men (or townsfolk who fled);
  - a successor (`leaderLost`): a band whose chief is lost follows one of its own with a chance of 40 + 1 for each ten
    men, else it melts back into the loose men;
  - a split: a band short of pay with 200 men or more may lose a third of them to a lieutenant;
  - a free person turning outlaw (life choice `outlaw`, below).
- **Its season** (`bandsSeason`, in the people's season after the loose men rob): the holder's army standing where a
  band works falls on it (losing a quarter as many men as the band loses), killing or scattering 40 in a hundred of its
  men times army / (army + band), taking its chief captive with a chance of 25 in a hundred (an ordinary captive of that
  court), and driving it next door. Then it robs its province, 15 per thousand of its purse and stores times men / (men
  + 100), halved where the holder's troops stand, only the farmers' granary outside a besieged city. The grain feeds its
  men (half their cost), the rest is sold at the market there; the gold and the grain's price are the chief's
  (`GoldSource` "Loot"), who pays his men 20 shekels a thousand a season less what the grain fed, spent at the market.
  Short of pay, as many leave as went unpaid (at most a fifth a season), or a large band splits; three seasons short and
  the men take what the chief has and turn on him. Paid, the loose men there join as many as a fifth of what the surplus,
  less the chief's cut (20 to 50 in a hundred by greed), could pay. Bands in one province compete: a short band's men go
  over to the strongest that pays.
- **The chief's choices**, by formula for every chief: with 15 men or fewer a careful chief gives up the road half the
  time (`wayBack`: his men go loose, he walks to the nearest court a free man seeking service); with 30 men and twice the
  price in hand a bold chief on a coast buys a ship (40 shekels, spent at the market) and works the sea beside it; and
  he moves to a neighbouring province whose pickings (purse and stores per man there, guarded land counting a third or
  a sixth) beat his own by 30 in a hundred. Hiring a band to fight for a king waits for command at a distance (item 13);
  a chief who gives up the road can be hired like anyone.
- **On the road** (`bandOdds`, `robbedBy`): a band adds 20 × men / (men + 200) in a hundred to the outlaws' odds of the
  road check in its province, and with a ship in the sea zone off its coast (halved where the holder's troops stand). It
  falls on caravans and ships passing there with those odds (signals `caravan-banded`, `ship-pirated`), selling the grain
  where it stands. What is robbed, from a traveller, a caravan or a ship, goes to the band's chief, or, with no band, to
  the loose men there (`S.loot`) and the grain to the market: nothing vanishes.

### Travellers on the road (`turn/travel.ts`, `turn/life.ts`, `turn/pool.ts`)

- People travelling on their own way (`Travel` journeys: free people, collectors, newcomers from the doors, chiefs going
  back) walk the road like envoys (`setOut`, `isWalker`), meeting its outlaws and nature, never a king's closed roads
  (they are nobody's people). Robbed, a traveller of any kind loses its purse with what it carries; robbed by a band, it
  is killed with a chance of 10 in a hundred.
- **The leader's skill** in the pace: a traveller makes (competence − 50)/5 in a hundred more road a season, from −10 to
  +10; a captive's guards none.

### Letters need carriers (`turn/letters.ts`; "Messengers are errands")

- A spy's report written at a foreign court or at a watch post in foreign land waits there (`Journey.waitAt`,
  `arriveTurn` `Waiting`) until carried: by one of its master's own people setting out from there for his capital (free);
  by a traveller going there (a fifth of half a season of his service a season of road, paid by the master on delivery);
  after a season, by a free person at that court hired for half a season of service a season of road, half from the spy's
  purse and the rest on delivery (all of it on delivery from a court trusted 60 in a hundred or more); and after two
  seasons with nobody, by the spy itself, which leaves its post (its master believes it posted until it is home). A
  carrier takes every report waiting there for that court. The report goes with its carrier (`lettersGo`): lost if he is
  robbed of it or killed, read by whoever catches him (signal `letter-read`). A fee unpaid on delivery is a broken
  promise. A watch post in its master's land, or next to it, hands its reports to the realm's couriers as before.
- Rumours, word of the world and ransom demands are talk and still travel by themselves (a reading); envoys carry their
  own letters and reports as before.
- `GameState.lettersCarried` and `lettersWaited` count, by the court a letter was written at, the letters carried and the
  seasons they waited; the batch prints them.

### News for sale (`turn/news.ts`, `rules/news.ts`; "Characters as sellers of news")

- Each season a free person at a court notes its news, at most every other season: each army or fleet near its land
  (0.3 + gather skill/200), what its treasury is said to hold (gather/150; a greedy, disloyal seller makes it half as
  large again), the captives and executions there (`lossesHeard`), a siege of its capital. It keeps the newest of three
  courts (`Character.news`).
- At another court it offers each piece no older than 6 seasons (`CharacterView.news`) at (4 + 3 a line) × (1 + greed/100),
  less 15 in a hundred a season of age. Order `buy_news {character, court}` pays it, delivers the lines as a report, and
  brings the holders of that court's land as of then. A seller may sell the same news to anyone.

### Reputation from losses abroad (`turn/news.ts`, `turn/court.ts`)

- People hear of losses abroad (`S.losses`) where they stand, at the court where they happened, and from everyone at the
  same court, who pass on what they heard (`Character.heard`, the newest 40, of the last 12 seasons).
- A person asks a court more for each of its people it heard were caught or put to death abroad (10 in a hundred) and
  each it put to death (15), at most 60, times (1 − courage/200). The life view tells it both (`CourtSeen.executions`,
  `lost`), and script characters weigh them in where to stand.

### Natural losses (`naturalLosses`; "No age in this game")

- People die only of risk: the road (above), plague where they stand (5 in a hundred a season) and famine (2 where the
  people had less than half their food). `dies` sets `diedWith`, and its master hears by rumour from where it died. Nobody
  ages; personas never state an age.

### Script players

- **Script kings** (`bots/outlaws.ts`): an army holding in its own land with no foreign troops beside it marches on a
  band of 40 men or more working next door in its land (`huntBands`); and once a season it buys the freshest news (4
  seasons old at most) of its war target or a court it does not trust (trust under 0.1), at no more than a thirtieth of its gold or 10 shekels
  (`buyNewsOrders`). Spied and bought sightings ("had an army in") count in what it believes of other kings' troops.
  `--no-outlaw-play` turns this off, `--outlaw-play-half` for half the kings, alternating by seed.
- **Script characters** (`bots/life-mind.ts`): a free person with a crowd of 500 or more loose men where it stands or
  next door turns outlaw when it is pushed (8 seasons unhired, 3 if its way to a fortune is the outlaw's, or unable to pay
  its living after 3) and willing ((courage + greed + ambition)/3 at least 55, loyalty under 50), unless it gave up the
  road within 12 seasons (`Character.leftRoad`).
- **Model characters** see the crowds near them (`LifeView.crowds`) and may take to the hills (`take_to_hills`). Model
  chiefs' own choices (raids, ships, the way back) are the formula above (a reading).

### Haakon's answers to items 11a and 11a+ built here

- Farmers' granaries rot like the king's stores (5 in a hundred a season).
- Dismissing a servant before its job's term ends is a broken promise on the court's record.
- The rest (jobs as errands offered through carriers, every payment by the payer's order, no going rate, records and
  grants as news, seizing hoards, collecting and selling tablets, dealing anywhere in a shared province, the levy's size,
  a captive's purse) is a rework of item 11a's jobs, left to the start of the next item that touches them (the report says
  why).
