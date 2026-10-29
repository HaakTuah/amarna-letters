## City-states as powers

Build order item 11+ (`docs/intent/build-order/item-11plus.md`; "The game in one page"), built from the politics dossier
(`docs/history/01-politics.md`). Save version 24. The report is `docs/rounds/2026-10-28-city-states.md`. First guesses
for item 18: the city-states' troops and gold (`cityUnits`, `StartGold` in `model/map.ts`), the opening tribute
(`StartVassals`, `model/vassals.ts`), par (`Par`, `rules/scoring.ts`), the pool of 100 (`GameConfig.characterPoolSize`),
and the script players' vassal judgements (`bots/vassals.ts`).

### Thirty powers, one set of rules (`model/power.ts`, `model/map.ts`)

Since item 11c, 36: six cities of Canaan joined, each Egypt's vassal ([the true map](28-the-true-map-and-the-red-sea.md)).

- **The powers** are the seven Great Kings and, after them in the fixed order, 23 city-states and lands under one leader:
  Kaska, Lukka, Isuwa, Carchemish, Alalakh (Mukish), Aleppo (Halab), Ugarit, Nuhashshe, Qadesh, Qatna, Arwad, Amurru,
  Byblos, Sidon, Damascus (Upe), Tyre, Megiddo, Shechem, Jerusalem, Suhu, the Suteans, Arrapha and Elam (Susa). Each
  holds its one province as its capital and falls with it, like any kingdom. `PowerData` gives each its land's name in
  letters, its ruler (the dossier's: Aziru, Rib-Hadda, Abdi-Heba, Mut-Baal son of Labaya at Shechem, and so on; "the king
  of ..." where the sources name none, a chief for the three lands without a town) and its adjective. `isGreatKing`
  and `GreatKings` serve presentation only (greetings, titles, the start's words); `tier` gains "City", data for the
  scripts' styles and the start screen. No rule reads which power it is.
- **Egypt's own land** gains Gaza and Sumur, its commissioners' towns ("Opening relations as they were"). Terqa stays
  Mitanni's and Mira Arzawa's own land, as drawn (the table's doubt; see the report).
- **Troops and gold** (first guesses): an army of 50 men a shekel of yield at the city (Byblos 1,500); Arwad a fleet of
  20 men a shekel; the lands without a town, where every man fights, 250 men a shekel (Kaska 2,500). Gold: four
  seasons of yield. `StartUnit.men` carries a levy smaller than a full unit; its baggage is in proportion (`forMen`).
- **Walls**: every capital 3, the city-states' cities among them, as the rulebook's walls rule says; Gaza, Memphis, Nesa
  and Nineveh 2; Sumur 1; the lands without a town 2, their chiefs' strongholds [G] (from the review: without them Lukka
  fell in seasons 1-3 in every script game). Until item 11+ the cities were fortresses (2) or walled towns (1); at those,
  a neighbour's army stormed one in the first season.
- **Lands without a town** (`Province.kingless`: Kaska, Lukka, the Sutean steppe) keep no market, but under their leader
  they are taxed like any land held (`harvestSeason`). Land nobody holds pays no tax and keeps its whole harvest ("Land
  without a ruler"; until item 11+ a free city's tax filled its own stores); every harvest bears the season's catastrophes.
- **No purchase.** The order `buy`, `cityPrices` in the view, the validator's and engine's purchase and `withinReach` are
  gone: a city comes under another's power by conquest, or by agreement as his vassal; a capital still cannot be ceded.
  `cityPriceOf` is `provinceWorthOf`, what a province adds to its holder's strength.

### Vassalage is words (`model/vassals.ts`, `model/clauses.ts`, `rules/clauses.ts`)

- **The mark.** `TabletProposal.vassal` and `Tablet.vassal` name the power the tablet claims as the other's vassal, the
  writer or the reader (anything else is dropped at dispatch). Like the sworn alliance's mark it changes no rule.
- **The template.** Four clauses join `tribute` and `askTribute`: `protect` (the writer guards the reader's land),
  `serve` (the writer takes up no arms against the reader or his friends, and sends troops when called), and their
  requests `askProtect` and `askServe` (a giving clause). `vassalTerms` reads a marked, sealed tablet from the side of
  whoever proposed it: the vassal, the overlord, the tribute a year, whether it protects and serves. `vassalBonds` lists
  those standing (sealed, neither forged nor repudiated).
- **Opening bonds** (`StartVassals`, `openingBonds` in `rules/factory.ts`): Egypt's vassals Ugarit, Qadesh, Qatna, Amurru,
  Byblos, Sidon, Damascus, Tyre, Megiddo, Shechem and Jerusalem; Mitanni's Carchemish, Alalakh, Aleppo, Nuhashshe, Suhu
  and Arrapha; each a tablet sealed by both before the age began, proposed by the vassal (tribute, serve, askProtect),
  a copy in each archive. Tribute a year: half a season's yield of the vassal's land, rounded to 5 shekels.
- **Tribute counts by itself** ("What a breach means, and to whom"): it is gold sent by envoy, and leaves the vassal's
  realm and joins the overlord's on arrival like a gift. Nothing tracks whether the tablet is kept.

### The scoreboard (`rules/scoring.ts`, `turn/resolve.ts`)

- **Par** for each starting position: the growth a power that started there usually reaches by the end of a script game,
  in the games it survives (a fallen power cannot win), tribute paid and received included: `Par`, from 50 script games
  (seeds 1-50), the lands without a town from a second run after their strongholds. `parOf` (never below 0.1;
  1 where unmeasured) and `standingOf` = growth / par. The winner is the living power with the highest standing; the
  shared victory compares a pair's growth against their par, weighted by starting strength. The scripts' reckoning of
  rivals (`Board.growth`) is the same standing, so they pursue what the game rewards.
- **The land against gold and goods** stays the fixed multiple (`provinceWeight` 10 × a season's worth); the alternative
  (the gold a land can still produce in the seasons likely left) is the report's reading, for item 18.
- **When one power is left** the game ends, as before; a vassal is still a power, so holding vassals is not having them.

### The state of the realm (`rules/realm.ts`)

At the start each court finds "The state of the realm" in its inbox: what its land brings in a season (and its mines),
what it lacks (grain, mines, a coast, a market trading abroad), whose land its roads lead into, its rank in wealth among
the powers, and its vassal bonds. Plain facts by one rule for all, never a goal.

### Characters (`rules/factory.ts`, `rules/cast.ts`)

A power's starting staff follows its size (`startStaff`): a Great King the table's `startEnvoysPerPower` (2), a
city-state half of it, at least one. The pool is recounted to 100 (`characterPoolSize`; 60 before): the first pool of
18 fills the first servants, and the rest are taken from the free people of the larger pool, from their own court where
one lives there. New name styles for the Levant, Ugarit, Syria, Nuzi, Elam, the Suteans, Kaska and Lukka (the people
dossier's table; generated names, marked so). The city-states' rulers get no households.

### Script players (`bots/vassals.ts`)

`--no-vassal-play`, `--vassal-play-half`. Each season (`vassalSeason`, before strategy) a script player reads every bond
it knows (the opening bonds, public, and the tablets it holds):

- **As vassal**, it weighs each bond once a year: the overlord's power over it (strength against its own, nearer counts
  more), his protection against a third king who threatens it, its honesty and caution against its greed, and whether the
  overlord attacked it. While it serves, it sends the tribute its tablet names once a year (a humble letter, the gold,
  `tribute` and `askProtect`), and never makes war on that overlord.
- **As overlord**, it notes the gold a vassal's envoy brings; a vassal that paid within a year and the road's grace is a
  friend (`Brain.bondFriends`, counted by `isFriend`), worth more paying than conquered; one in arrears hears a demand
  (`askTribute`, a threat, a broken oath) and is fair game.
- **Offers**: a king three times a neighbour's strength offers it vassalage (`askTribute`, `protect`, `askServe`) unless
  it serves a king he would rather not cross; a power that a neighbour three times its strength threatens, serving
  nobody, offers itself (`tribute`, `serve`, `askProtect`). `sealBond` seals a vassal tablet by the same sums: as
  overlord, real tribute from a sender not hostile; as vassal, a bearable price to an overlord it fears or needs.
- **Third kings** weigh an overlord's troops near a vassal, and his friendship, before falling on it (`bondWar`).
