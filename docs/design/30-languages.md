# Languages (item 12)

Build order item 12, "Languages" (`docs/intent/diplomacy-and-intelligence/languages.md`, with "Where characters are,
and what they speak" and "A king seals what his scribe wrote"), from the languages dossier
(`docs/history/07-languages.md`) and the doors' peoples (`docs/history/08-beyond-the-edges.md`). Save version 27. The
report is `docs/rounds/2026-10-29-languages.md`. Skill buys time, never noise: nothing is garbled, a weak speaker is slow.

## The data (`model/languages.ts`)

- **By province**: each land province's languages and how widely they are spoken, from the dossier's "By province":
  wide 100, common 60, some 30, few 10 (`Spread`). A court's capital adds the court's own language and, where its scribes
  read Akkadian, Akkadian, each at least "few" (`spokenIn`).
- **Each court** speaks its king's language (`courtSpeaks`: Egyptian, Hittite, Akkadian for Babylonia and Assyria,
  Hurrian, Luwian for Arzawa and its lands and Lukka, the Alashiyan tongue, Kaskean, Ugaritic, Canaanite in the Levantine
  cities, Amorite at Qatna, Nuhashshe, Hana, Suhu and the Suteans, Elamite), and **reads** what the dossier's "Court
  reads" gives (`courtReads`; Arzawa, Seha and Mira read Hittite and Luwian, not Akkadian; the Kaska, Lukka, Isuwa and the
  Suteans read nothing). A court the tables do not name speaks its capital's widest tongue and reads Akkadian if its
  capital keeps Akkadian scribes.
- **Origins**: a character grows up with the tongues of the province it comes from (`homeProvince`: a province's name or
  a town of the cast, `OriginProvince`); a stranger from beyond a door with his people's own tongue (`BeyondTongue`,
  which no court reads), and a returning trader or soldier with some of the map language where his door opens
  (`DoorTongue`: Akkadian at Ugarit, Alashiya, Susa and the Gulf; Luwian on Arzawa's coast; Egyptian in the Delta and Nubia).

## Skills (`rules/tongues.ts`, `Character.tongues`, `Character.aptitude`, `GameState.kingTongues`)

A character's skill in each language is a hidden number from 0 to 100; in words none, halting (below 40), good (below
80), fluent (`tongueWords`). First guesses:

- **Home**: the widest tongue of the home province at 100; each other tongue spoken commonly there at 40-90 six times in
  ten, each spoken by some at 15-60 three times in ten.
- **Akkadian by background**: scribes, interpreters and envoys 60-95; merchants, traders, caravan masters, stewards,
  physicians, priests and sailors 30-75; anyone else three times in ten 10-45. An interpreter has one court language
  more at 50-90; a Nubian in Egypt's service speaks a Nubian tongue and Egyptian.
- **A starting servant** has lived at the court he serves: its language at least 60-95 (`servedThere`).
- **Aptitude** 5-85, 15 more for the lettered and the trading callings ("more common among scribes and merchants").
- **A king** speaks his court's language fluently and each tongue spoken widely (100) or commonly (50) at his capital
  (`kingTongues`); a king's aptitude is `LanguageData.kingAptitude` (40).

## Learning by living there (`learnTongues`, each season as it begins)

For each place a character spent the season just past (a traveller's road by the points spent in each province, the
same accounting as the road check, `noteRoad`; anyone else where he stands), each language spoken there rises by
(`LanguageData.base` 8 + aptitude/5) × spread × share × (100 − skill), in hundreds of each: about 18 points a season
from nothing at full share, wide spread and aptitude 50, slowing near the top; the part of a point is a chance of a
point. Nobody learns from the company he keeps. Kings learn at their capital.

## The chance to cross a language (`crossChance`)

From the weakest skill along the way: 100 from 80 (`AtOnce`), else the skill in a hundred, 0 at 0, rolled once a season
on a stream keyed by the pair and the season, so the order of settling never decides.

## Speaking (`settleSpeech`, each season as it begins, before any model is called)

- **Two people in the same province** understand each other by their best shared language (`understands`); once they
  have, it holds while they stay together (`Character.understood`). A character's life request lists, for each person
  there, whether it can talk to them this season and, if not, the go-between who could carry its words and his price.
  An approach to someone it cannot talk to passes only through such a go-between, paid by the one approaching
  (`bridgeTo`), else it is not made.
- **A court hears a person** (`courtHears`) through its king directly or one servant of his standing at court who speaks
  with both (`reach`: the weakest skill along the way, the best such chain); for an envoy, failing that, through a
  go-between at the court, the cheapest whose price his purse covers, paid from his purse when the words cross (his
  standing practice: the go-between's price is posted and used "without bargaining"; a reading of the item). A court
  heard him while someone still reaches him: if every bridge has left, he is tried again.
- **An envoy arrived at a court** is heard, and his audience goes on (`PendingAudience.through` names who bridged), or
  his audience waits (`GameState.unheard`) and the host is told plainly ("An envoy nobody understands"). If he is still
  not understood the next season, or as he leaves, he presents his gifts (`presentGifts`), keeping what he chooses (a
  model in its request's `keep`, a script by the same motive as at an audience, `scriptKeep`), with their inventory;
  the host is told what was weighed ("Gifts presented"). Each season he is tried again, and chooses: a model envoy in its own request (task "Unheard", taken the next season), a script one by
  its traits (`scriptChoice`): it waits a season and one more for every 25 of loyalty, then a disloyal (below 40) greedy
  (55 or more) one goes home to say it was heard, any other goes home and says it was not. Its report home says so; a
  waiting envoy learns the court's tongue meanwhile.
- **Hiring** needs understanding: at court, the court must hear the man this season; an offer carried abroad, the envoy
  and the man must understand each other (`hireAll`).
- **Letters**: a carrier takes a letter only to a court where someone, its king or a servant there, shares a language
  with him (`carryLetters`). How long each court's letters waited is counted by the court they go to
  (`GameState.lettersToCarried`, `lettersToWaited`) and printed by the batch runner.

## Go-betweens

A free person standing at a court who speaks two or more languages well (40 or more) posts a price for each message he
carries across (`postPrices`: `LanguageData.bridgeShare` 20 in a hundred of his season's asking price there, at least
`bridgeMin` 2 shekels). A court may also hire one (the errand stay): he then bridges as a servant. **In someone else's
pay** (`inOthersPay`): a planted servant's real master, a job with someone else, or gold handed to him
(`Character.handed`: a king's gift, a host's bribe, an approach's gold) by anyone but whoever pays him for this exchange,
in the last `paySeasons` (4) seasons. Only then is his mind asked, once for the envoy's message (task "Bridge", in the
runner after the envoy presents): a script one softens a threat to the host or, with none, drops the envoy's last demand;
a model one passes the words and terms on as it chooses. Only the envoy's message is bridged this way; the host's reply
reaches the envoy as given (a first build: one call a message, the message that matters most). Nothing of a change goes
into the envoy's record, which the host's transcript and the envoy's own report read: the envoy cannot tell, and the host
learns only if someone noticed. Either way he hears every word (the tablet passes through his
hands, `saw`). A servant of the host's standing there who understands both may notice a change, by the same chance:
the bridger then carries a hidden fact the host knows, and the host is told ("Words bent").

## Composing (`composing`, at dispatch)

The envoy must take in his king's words: by `reach` from the envoy to his own king, at once from fluent, else the seasons
of failed rolls before success (at most `composeSeasons` 6), rolled at dispatch; with no chain at all the envoy cannot be
sent ("Envoy not sent", no gold paid). The tablet goes in a language the receiver reads that the sender's court reads
(Akkadian first where both do); otherwise in a language the receiver reads written by the king or a servant at court
(the weaker of that language and the king's counting), taking the longer of the two delays; with nobody, in the
sender's own written language (`Tablet.tongue`). The journey sets out that many seasons later.

## Reading a tablet (`readable`, `readersSeason`)

A tablet in a language its holder's court reads is read at once. Any other waits (`TabletCopy.unread`): each season a
reader is tried, the king himself or a servant at court, by the weaker of the tablet's language and the king's. An unread
copy shows its seals and the language only (`Views.tablet`); a tablet brought to an audience that nobody could read that
season is shown so, and is sealed, if at all, on the envoy's word. A tablet read late is announced ("A tablet read").

Envoys standing unheard at a court are in its view (`SeatView.unheardHere`), so a king can still take on a bridge in a
later season.

## What one hears (`observe`)

An envoy's look at a foreign court: what he sees (troops near the capital, other envoys) by his gathering skill alone;
what he overhears (the treasury, catastrophes, captives and executions) by that skill × (0.25 + 0.75 × his skill in the
court's own language ÷ 100).

## Retired

The script envoys' garbling by competence (`recite` losing the last of three clauses below 35, reports losing the last
clause or sentence below 40): whether a message is altered is the envoy's choice, never his skill's ("Retired with the
chain").

## The script kings (`bots/tongues.ts`)

A king sees only what people say they speak (`CharacterView.speaks`: its belief in words, one level more for one who
overrates itself by more than 10). To a court he sends, of those at hand in the order he would otherwise take them, the
first whose claims score 2 or more there (`tongueScore`: the court's language in full, Akkadian at 0.9 where it reads
Akkadian, any other tongue of its capital at 0.6, plus half his claim in the king's own language), else the best. When
told of an envoy nobody at his court understands, he hires a free person at court who says he speaks the king's
language and one of the envoy's well, to stay four seasons. `--no-language-play` and `--language-play-half` turn this
off for all or half of them.
