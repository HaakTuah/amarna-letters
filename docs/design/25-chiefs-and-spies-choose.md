# Chiefs and spies choose for themselves (after item 11b+)

Haakon's answers to item 11b: "a model chief decides raids, ships and the way back in a request of his own, like every
character, and only a script chief by formula", and "no rule moves a spy whose reports wait for a carrier: he decides
whether to wait, carry them home himself or pay a passing traveller, a script spy by his traits". Item 11b+ built the
script's side ([`24-jobs-and-money-answers.md`](24-jobs-and-money-answers.md)); this builds the model's.

## The requests

- **When** (`ownRequests`, `turn/own-choices.ts`): as each season begins, after the bands' season and the letters' look
  for carriers, the engine asks every chief leading a band (task `Chief`) and every posted spy with reports waiting at
  its post for a carrier (task `Reports`). The choices are taken when the next season begins (`freshPlan`: made last
  season). A script mind answers nothing (`ScriptMind`), so its traits decide as before; script games are unchanged
  apart from the request ids.
- **A chief sees** (`ChiefView`): his men, ship and purse, what his men cost a season and how long they went unpaid; the
  land where he works and the land next door as he hears of it, in round numbers (its people's purse and stores, whether
  an army stands there, other bands' men, a coast); a ship's price where he could buy one, or the men one needs; whom he
  kills now, if he has said.
- **A chief decides** (`ChiefChoice`, on `Character.chiefPlan`): land next door to move to (or stay), buying a ship
  (only asked when he can), whom his men kill of the travellers they rob ("nobody", "kings' servants", "everyone",
  standing until he says otherwise, `killsByChoice`), and giving up the road (`wayBack`). A chief who chose this season
  does nothing by formula (`chiefDecides`, at the start of his band's season; hunted, he flees as anyone). A chief whose
  call failed or who has not yet been asked (his first season) decides by the formula of his traits, as the stand-in.
- **A spy sees** (`ReportsView`): its post, its master, how many reports wait and for how long, its purse, the seasons
  home, about what a passing traveller and a man hired at the court there would ask (reckoned from what it would ask
  itself), and whether its master's standing order pays carriers on delivery.
- **A spy decides** (`ReportsChoice`, on `Character.reportsPlan`): the most it pays now from its purse for a carrier next
  season (it may hire at once, without the script's season of waiting), and whether it carries them home itself if
  nobody takes them.
- **Who decides** (item 6c): both calls go on the characters' ladder as `chief` (stakes 0.5: his men, purse and neck)
  and `carry` (0.2: its post and some of its purse), shadowed by the script, which leaves both to the traits.

## Readings

1. The choices are taken the season after they are made (the request comes as a season begins, after the band's
   season), so a model chief's first season, before he has been asked, is decided by the formula of his traits.
2. A spy's prices are what it reckons a carrier would ask, from its own price; the carrier it finds asks his own.
3. No new save version: script games play the same, and saves of version 22 load with no choices made.
