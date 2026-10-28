## Characters, first package: who they are (item 10)

Build order item 10. Save version 16. The report is `docs/rounds/2026-10-28-characters-who-they-are.md`; the script
kings' part is in `07-script-kings/14-court-and-intelligence.md` ("Who they are").

### The pool

- **About 60** (`GameConfig.characterPoolSize`, 60, a first guess and a setting of the table; item 18 tunes it). The first
  eighteen (`FirstPool`) are drawn exactly as before, from the stream `characters`; the other 42 come from a stream of
  their own (`characters-more`), so every seed keeps its first eighteen (the test draws a game with a pool of 18 and one
  of 60 and compares them field by field). Each power still starts with two envoys; everyone else is free, at the court of
  its region (`rules/cast.ts`), or where a lover or family draws it.
- **Attested characters** (`rules/cast.ts`, from `docs/history/06-attested-people.md`): the first eighteen's attested
  envoys keep their names and posts, and their traits move to what the sources say (`FirstCores`: Mane loyal and brave,
  held for years; Keliya trusted and able; Yanhamu able and ambitious; ...), each within 10 points either way, from a stream
  of its own (`attested`). Fourteen more attested people join the pool (`AttestedCast`: Hani, Tutu, Mahu, Amanappa, Haya,
  Maya, Addaya, Irshappa, Asali, Salmu, Ahutabu, Kalbaya, Lupakki, Ilimilku), with the eighth attested envoy the first draw
  left out. Kings, queens and princes are seats or their households, never characters. `Character.attested` marks them.
- **Nubians in Egypt's service** (`NubianCast`): Hekanefer, prince of Miam and a child of the royal nursery (attested; his
  career spans 1346), and two captains of Nubian troops, generated with Egyptian names as many of them bore. They stand at
  Pharaoh's court and carry the public fact "A Nubian in Egypt's service, who speaks a Nubian tongue as well as
  Egyptian" (languages come with item 12).
- **Everyone else** is generated in its region's name style (`Styles`), with competence the lower of two draws (15-95):
  mostly ordinary people, few excellent ones ("Enough people, not enough good ones").

### Skills, and seeing oneself

- **Skills** (`Character.skills`): gathering information (`gather`: what an envoy notices, a spy's observations, copying and
  stealing from an archive), slipping past guards (`stealth`: a spy's chance of being caught, a siege run, the road
  check), and forging (`forge`: a forgery's quality). Each is drawn within 20 points of the character's competence, from a
  stream of its own (`skills`). Competence stays a trait: the script mind's judgement and the persona's words.
- **Kings never see skills.** No view shows a skill or a trait. What a court knows is what a person says it can do
  (`CharacterView.claims`, words such as "says they can slip past most guards", set when it pitches: `claimOf`, its belief,
  raised by 15 for one loyal mostly to itself and fond of gold; since item 10+b a model character chooses its own claim) and what it saw happen (below). The asking price no longer
  reads the true skill: 6 + belief/8 + greed/8 + its name at that court/5 + debts/30 (at most 9), less 4 at the court it
  favours and 3 where its lover or family lives (`basePrice`).
- **Seeing oneself** (`Character.inclination`, `Character.belief`): a hidden inclination (the sum of three draws of -10 to
  10) sets the starting belief, its skill plus the inclination. A forger tries only if it believes it can (the king's
  forge order, an envoy's swapped inventory); the forgery passes by its true skill. Its request says "What you believe of
  yourself: you believe you can …" (`beliefWords`), in the changing part, never the persona.
- **It may come to doubt it** (`learn`): at each roll on a skill with a clear outcome (a spy's season unseen or caught, a
  siege run, a copy or theft from an archive), the belief moves by 20 × (outcome − the chance it expected), the chance
  computed by the same formula from its belief less 0.3 of its inclination. It settles where what it expects matches what
  happens: the true skill plus the part of the inclination that never goes (`InclinationKept`, 0.3). A run of luck
  misleads it.

### A name made of outcomes

- **Outcomes are facts** (`TurnEngine.outcome`), hidden, known to the court that saw them, tagged `outcome` or
  `outcome-bad`: a mission carried and the answer brought home; a turn back on the road; siege lines slipped through; a
  post watched unseen (two seasons or more); a spy caught; an envoy caught by besiegers. Each moves the name at that court
  (+6, -10, first guesses) and spreads as rumour (`NewsKind` "Name") to every other living court except the character's
  master, a secret master, any court still holding a cover for it (its news comes its own ways), and, for a post watched
  unseen, the court it watched (a spy unseen stays unseen). On arrival the fact is
  known there and the name moves; a good tale grows by 15% for each season the word travelled (`TaleGrowth`).
- **A past made in play** adds the long years abroad (12 seasons at a foreign court, `LongAbroad`), questioning, and an
  imposture exposed, beside the facts the engine already recorded (skimming, defection, forgery, turning).

### A past before the game

The seeded facts now carry ties (`Character.ties`): a debt to a land's trader (`Debt`, its amount), a brother in a
king's army (`Family`), a lover kept at a court (`Lover`; the five places are now courts, so the tie has a court to act
through). A debt raises the wage it asks; a tie to a court makes a script envoy readier to take that host's gift, and gives
that court a hold when it questions the character. A free person with a lover or family lives at that court.

### Declaring a name and false envoys

- **A pitch declares a name** (`MindReply.name`): its own by default. Only at a court that knows nothing of the person
  (`strangerAt`: never seen, heard of or pitched to there) is it offered, in the request, an invented name never used in
  the game (`Aliases`, `MindRequest.aliases`), and the engine takes no other: a court that already lists the person would
  see the same person (the same id) under a new name. Borrowing a living person's name waits for a court's own handle for
  each name it is given (design question). The engine records the declaration (`Character.declared`, `Declared`); the
  court knows the person by that name (`CharacterView.name`, and every notice about it: `notify` names it so), sees only
  what it learned under it (`Fact.alias`; `factsKnownTo`), and the name has its own standing there (`Declared.rep`).
- **Exposure** (`TurnEngine.impostors`, each season): 50% a season where someone at that court has seen the person under
  its own name, 60% where a real envoy of the king a false envoy names stands at that court, never by
  chance with nobody looking (item 10+b); and a background check finds it with a hidden fact's chance. Exposed, the court is told who it is
  ("An impostor exposed"), and the fact "Posed as … at the court of …" travels as an outcome.
- **A false envoy** (`MindReply.claimsToServe`, offered as `MindRequest.envoyOf`, the farthest living king it never
  served, only at the court where it stands): it claims to be that king's envoy, seeks no service, and its host is told
  ("An envoy without a letter"). A host gives gifts with the new order `gift` (any person it sees at its court; a hidden spy is nobody there). The check is the
  period's: an envoy sent to that king with `checkClaim` (accepted only for a person at the court who claims to serve the
  king written to, so that it is never a way to ask whom anyone serves) asks there, and brings home whether the person serves him
  ("A claim checked"); a false claim is then exposed.

### What servants know, captives, tablets taken

- **The record of who saw what** (`Character.seen`): the tablets that passed through a person's hands: carried (a
  proposal, copies shown), sealed before it at an audience, copied or stolen from an archive.
- **Questioning** (captive fate `Question`, with what is spent, at least 10): each tablet it saw that the captor does not
  hold is drawn out with 25% + spent/150 − (courage + loyalty)/2/250, between 5% and 90%, 25 points of resistance less
  where the captor's court holds its lover, family or a debt; at most three. A captive loyal (60+) and brave (50+) lies:
  it recites a tablet that never was, a forgery in its own hand (its master and another king in league against the
  captor), which only an examination can show; others tell the truth, and the copies go into the captor's archive ("told
  by … under questioning"). Since item 10+b a captive decides what it says the next season (the script mind by this
  formula, a model by its own choice): `20-people-across-borders.md`.
- **Captives handed over** (fate `HandOver`, `to`): since item 10+b it travels under guard and the other court holds it
  when it arrives (`20-people-across-borders.md`); any ransom asked lapses. Captives
  are exchanged like any good: the price is the kings' to agree in letters, as for gold and land.
- **Stealing** (order `steal`, for a spy posted at a court): that season, with a chance of its `gather` skill, it takes
  the tablet its master would most want; the court loses its copy and is told a tablet is missing; the tablet comes home
  with the report. Stealing adds 15 in 100 to the chance of being caught that season (`StealRisk`).
- **A capital's archive is carried off** (`takeArchive`): the court holds none of its tablets any more (it is told, if it
  still stands); since item 10+b the taker gains them when the load reaches his capital (`20-people-across-borders.md`).

### Errands built here, and those that come later

The errands that exist after this item: deliver a letter, tablet or gold (dispatch), observe a court or a province (spy),
copy or steal a tablet, check a claim (`checkClaim`), stay and report, and give gold to a person at court (`gift`). Carrying
a candidate an offer waits for item 11's live pool; carrying a ransom or a bribe by hand, and chaining several stops, wait
for item 11b ("Messengers are errands"), as letters travel by themselves until then; taking command comes with item 13.
