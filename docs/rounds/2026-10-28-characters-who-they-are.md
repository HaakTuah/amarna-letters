# Item 10: characters, first package: who they are (28 October 2026)

Build order item 10 (`docs/intent/build-order/item-10.md`): "Errands, not roles", "Kings never see skills", "Seeing
oneself", "A name made of outcomes", "Declaring a name" and false envoys, "A past before the game, then a past made in
play", "What servants know", "Attested characters" and "Nubians in Egypt's service"; captives exchanged like any good;
tablets taken, not only copied; a starting pool of about 60. Branch `item/characters-who-they-are`; save version 16.
What was built is in `docs/design/18-characters-who-they-are.md` (the script kings' part in
`docs/design/07-script-kings/14-court-and-intelligence.md`, "Who they are"); this report says why, what it cost and what
was found. Weekly usage: unknown (this session cannot read it). Effort: medium, as asked. Helpers: one reviewer, none
other. Sources: `docs/history/06-attested-people.md` (the attested people, the Nubians in Egypt's service, the name
styles).

## The check for changes

Asked at the start (Build order since 64, Characters since 18, Diplomacy and intelligence since 23): nothing new.
Haakon had not answered the questions of items 8, 9, 9+a or 9+b in `docs/BUILD-PROGRESS.md`, so their readings stand.
Asked again before the pull request: CHECK_AGAIN.

## The audit at the start

Seeds 1-50 from a clean copy of `develop`, every king a script king, and `--versus solo` (40 seeds): the same figures as
item 9+b's after-numbers, signal for signal (wins 0, 8, 6, 23, 2, 11, 0; 2.57 growth alone, 1.00 as baseline, 68% and
14% of wins). No feature built so far went unused beyond what item 9 found (no spy posted to watch a province). Nothing to
patch.

## What was built

- **The pool of 60**, the first eighteen drawn exactly as before and the other 42 from a stream of their own (a test
  compares a game with a pool of 18 and one of 60, field by field). Fourteen more attested people and the eighth attested
  envoy, Hekanefer and two Nubian captains at Pharaoh's court, and ordinary people in their regions' name styles, whose
  competence is the lower of two draws. The first eighteen's attested envoys keep their names and posts; their traits
  move to what the sources say.
- **Skills and belief**: three skills the engine rolls on (gathering, slipping past guards, forging), drawn around
  competence; a hidden inclination; a belief that moves with outcomes and settles at the truth plus 0.3 of the
  inclination. A forger tries by its belief and passes by its skill. The asking price reads the belief, never the skill.
  Model characters are told their beliefs as beliefs.
- **Claims and checks**: a pitch's claims (`CharacterView.claims`), in words; background checks also find a false name.
- **A name made of outcomes**: outcome facts (missions done, turned back, siege lines slipped, posts watched unseen,
  captures, impostures), known to the court that saw them and spread as rumour to the rest, with the name moving, and good
  tales growing with distance.
- **A past before the game**: debts, a brother in an army, a lover at a court now carry ties that act (price, a host's
  gift, a hold under questioning, where a free person lives); a past made in play adds long years abroad, questioning and
  impostures.
- **Declaring a name, false envoys**: a pitch gives a name (own, borrowed, invented) and may claim to be an envoy; courts
  know a person by the name given, and see through it by someone who saw the real man, a real envoy of the king named, a
  slip, or inquiries; hosts give gifts (`gift`); a letter to the king named checks the claim (`checkClaim`).
- **What servants know**: the record of the tablets that passed through a person's hands; questioning a captive
  (`captive_question`), who tells the truth or recites a forgery.
- **Captives handed over** (`captive_hand_over`), **tablets stolen** (`steal_tablet`) and **a capital's archive carried
  off**.
- **Every seat**: the rulebook (kings' and characters' requests), the model schemas and parser, and the web app's orders
  panel (question, hand over, steal, gift; a letter asks about anyone claiming to serve its addressee).

## Script kings and characters

SCRIPTS

## Benchmarks and script games

BENCH

## Readings taken and design questions

Each is a question Haakon can answer; the reading taken comes first, the alternative in brackets.

1. **Skills**: three skills the engine rolls on (gathering, slipping past guards, forging), drawn within 20 points of
   competence, which stays a trait for judgement; assaying and commanding wait for the items that use them (or one skill,
   competence, until "What skills cover" is scheduled; or every skill in that list now)?
2. **Claims**: what a person says it can do when it pitches is its belief, 15 more for one loyal mostly to itself and
   fond of gold, set by the engine for model characters too, whose words may say more (or a structured claim each model
   character chooses)?
3. **Talk of outcomes**: what one court saw travels as rumour to every other court, as word travels, except the
   person's own master and courts holding a cover for it (whose news comes its own ways) and the court a spy watched
   unseen; +6 a success, -10 a failure, a good tale growing 15% a season on the road (or only through carriers at that
   court, as captures already spread)?
4. **False names**: invented names only, offered only at a court that knows nothing of the person; borrowing a living
   person's name needs each court to have its own handle for each name it is given, since today a court that lists the
   real man would see two people of one name with different ids (or build those handles now)?
5. **Exposure**: 50% a season where someone at that court has seen the person under its own name, 60% where a real envoy
   of the king a false envoy names stands there, 3% otherwise, and a background check with a hidden fact's chance (or
   other odds)?
6. **False envoys** get no audience: the host is told, may give a gift (the new order `gift`), and a letter to the king
   named checks the claim; a free person living in a city is a stranger to its king until it presents itself, so it can
   pose there (or a full audience with return gifts, which needs a trail no court sent)?
7. **Questioning**: whether a captive lies is a formula (loyal 60+ and brave 50+ lie), for model characters too, and a
   lie is a forged tablet in its own hand (its master and another king in league against the captor) (or a request to
   the character's mind)?
8. **Captives handed over** pass at once, as a province ceded does, and their price is the kings' to agree in letters,
   with no clause for it (or the captive travels under guard, and a clause "give me your captive")?
9. **Debts** raise the wage a person asks and give the creditor's court a hold (a host's gift, questioning); nothing is
   repaid, since purses never shrink yet (or repaid from wages now)?
10. **A capital's archive** is carried off whole: the court loses every tablet in it, even those the taker held already
   (or it keeps its copies of tablets the taker already held)?
11. **Errands left for the items that bring their consequence**: carrying a candidate an offer (item 11), carrying a
   ransom or a bribe by hand and chaining several stops (item 11b), taking command (item 13) (or build them now with
   stand-ins)?
12. **Attested traits from the sources**: Mane loyal and brave, Keliya trusted and able, Yanhamu able and ambitious,
   Tutu greedy and ambitious, Salmu brave and loyal, Lupakki a brave general, Ilimilku a fine scribe, and so on
   (`rules/cast.ts`), each within 10 points either way (or other readings of them)?
BALANCEQ

## First guesses (item 18 tunes them)

- The pool: 60 (`characterPoolSize`); ordinary competence the lower of two draws of 15-95.
- Skills within 20 of competence; inclination the sum of three draws of -10 to 10; belief step 20; 0.3 of the inclination
  kept.
- A name: +6 a success, -10 a failure, -20 an imposture at the court that saw it; a tale grows 15% a season of travel.
- Exposure: 50% a season where the real man was seen, 60% where a real envoy of the king named stands, 3% otherwise.
- Questioning: 25% + spent/150 − resistance/250, 5-90%, at most three tablets, a hold worth 25; a captive loyal 60+ and
  brave 50+ lies.
- Stealing: +15 in 100 to the chance of being caught.
- Long years abroad: 12 seasons.
- Price: a debt adds a shekel for each 30 owed (at most 9); a lover or family at the court takes 3 off.

## The review

One reviewer (Opus, high effort), given the diff and the item's text. It found seven problems, all fixed before merging:

1. `checkClaim` let any king ask whom any person serves (hidden spies included): accepted now only for a person at the
   court who claims to be an envoy of the king written to.
2. A gift to every id would find a hidden spy at one's court: a hidden spy is nobody there, refused as a stranger is.
3. The steal order's refusal told a king its spy was caught before word came: it follows the recall's rule, by what the
   court believes.
4. A false name kept the person's id, so a court that listed it already would see the same person renamed, and a
   borrowed name showed two people of one name: invented names only, offered only at a court that knows nothing of the
   person (reading 4).
5. A post watched unseen was told to the court watched: that court is left out of the talk.
6. The false-name test could pass without checking anything: it now pitches, and asserts the view.
7. A false name carried the real name's standing: each declared name has its own (`Declared.rep`).

A test checks the three leaks (the claim, the gift, the steal).

## Tests

`src/engine/test/who-they-are.test.ts` (the pool and its first eighteen, the newcomers' spread, belief, price, outcomes
and their rumours, false names and inquiries, false envoys, questioning, handing over, stealing); tests that set a
character's competence now set its skills and belief too (`skilled`); the archive tests now expect a capital's archive
carried off; the starting fingerprints and the save version were taken again.

## Left for later

Carrying a candidate an offer (item 11's live pool); carrying a ransom or a bribe by hand and chaining several stops in
one errand (item 11b); taking command (item 13); characters answering questioning, and choosing to lie, themselves rather
than by formula; captives travelling under guard when handed over; languages for the Nubians' tongue (item 12).
