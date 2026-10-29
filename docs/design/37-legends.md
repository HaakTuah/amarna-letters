# Legends (item 14)

Build order item 14, from "Legends, read from the record" and "The narrator illuminates; it never steers" (Spectator
mode), with the two echoes kept for the chronicle, "A new Idrimi" and "Finkel's version" (Voice of the age). Everything
here reads the record; nothing is written in advance, and nothing the engine, a seat's view or a request reads comes
from it. The code is `src/engine/src/rules/legends.ts` (pure functions over the state) and the web's `LegendsPanel`.

## What the record tells

- **Biographies** grow from the follow view (`LifeRecord`): a section "In the record" lists every event that names the
  person, the tablets they sealed with their king's seal, and their capture or death abroad (`characterLegend`). An
  event names a person by their name as a whole word, and only while no one else in the world bears it, so nothing is
  pinned on the wrong man. A court's follow view lists only the events it saw (`GameEvent.visibleTo`): "What your court
  saw of them".
- **Histories of tablets** (`tabletLegends`): every tablet sealed or forged, oldest first: who proposed it, who sealed it
  and by whose hand (beyond the envoy's authority, where it was), what it says, who forged it and for whom, who
  repudiated it, each copy that came to a court not among its sealers and how (shown, stolen, copied, taken with an
  archive), with what its examiners found. A tablet of peace (a peace, no-attack or alliance clause) between two kings
  shows the first province one of them took from the other after sealing it as "Broken". Inventories of gold are left
  out: their story is the envoy's, under "Who skimmed".
- **The rise and fall of courts** (`courtLegend`): the land a court began with and held at its height (from the scores),
  every province it took and lost and to or from whom (the holders' log), the first season its troops entered each
  other king's land and each king's entered its own, its tablets, its fall or the falls it brought, the chronicle's
  lines that name it, and how it ended the age.

## The record opens

When a game ends, the web app lets every seat take god view (`canSeeAll`), as a table of script kings always could;
the ending line says so. The Legends tab, shown in god view, opens on "The record opens" (`revelations`): each kind of
deception with every instance, read from the events nobody or few saw, by the signal the engine gave them (who lied: a
questioned envoy reciting a tablet that never was, an unheard envoy saying at home he was heard, false names and false
envoys; who skimmed: envoys, collectors, swapped inventories; which seals were forged; which go-betweens bent the words
they carried; who sent debased gold; who sold their errand's knowledge or a court's secrets; which envoys took a host's
gold), everyone who served one king in secret for another, and the season the end was drawn for (`finalSeason`, by the
hard cap or the rising chance). The drawn season shows only once the age has ended, so a spectator reading the Legends
during play never sees it (item 6a: nothing shown reads it). Played on into an open age, the record closes again with
the game.

## The two echoes

- **Finkel's version.** The third time a court hears a king beg it for gold (an envoy's delivered clauses holding
  `askGold`, at the audience), the engine logs a `begging` event, seen by the two kings: "X begged Y for gold a third
  time: 'I love you my gold owning brother.'" Only the third, not the fourth. A greedy script king (greed above 0.7)
  short of gold (spare under 100) may once in a game beg a stronger friend in Finkel's own words (`FinkelLetter`, with
  well-wishes and a request for 100 shekels), at one chance in ten each season the conditions hold for that friend.
- **A new Idrimi.** When a character rises to rule a city of his own, read from the record of the powers risen in play
  (`GameState.risen`, item 13+): since 13+ a fallen kingdom's governor rises so, ruling his province with a seat of his
  own. The line, "A new Idrimi: X, who governed P for K, rose to rule it in his own name when K fell", stands in his
  biography and in the legends of both courts (`newIdrimi`), and the risen ruler's own annals call him "a new Idrimi"
  (the template narrator, on the `rise` event). A band taking a city rises with item 17 and reads the same way.
- **In the annals** (the template narrator): the court begged a third time writes Finkel's line ("So the kings love His
  Majesty"); the beggar's own annals keep none, as a court's chronicle flatters its own king.

## Not built here

- Legends in a seat's view beyond its follow view: during play a court reads its own history from its events, inbox
  and archive; the Legends tab is god view's.
- A narrator connecting threads in prose ("Find the thread, don't make it"): the template annals and the model
  narrator's chronicle stay as they were; the legends are lists from the record.
