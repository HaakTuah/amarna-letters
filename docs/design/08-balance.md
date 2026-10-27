## Balance (script kings)

**Frozen, 18 October 2026.** Balance is no longer tuned against bots. The numbers below are
provisional until model leaders play and until sieges, walls and terrain change the tempo of war.
The Arzawa fleet is accepted as provisional. Read the tables against the decision rules in
"Script kings" above: they measure those rules on this map, not how people or models will play.

Script kings are only a rough guide to how models or people will play, but they now play well
enough that geography and gold decide a great deal, so the starting positions were tuned again
with the batch runner until every power wins some games. Changes from the first draft: Egypt's
second army starts in Akhetaten; Assyria (Ekallatum) starts with a third army; Susa (Elam) was
added as a free city for Babylonia and Assyria, with a route from Ekallatum to Mari; the southern
Levant cities yield less; starting wages were lowered. For the current bots: Hatti keeps a fleet
in Kizzuwatna (the first bots needed a third army there) and starts with 300 gold, not 550, since
with only weak kingdoms on its borders it otherwise took more than half the games; Mitanni's
third army starts in Taidu, facing Nineveh, its heartland yields more (Washukanni 50, Harran 35)
and it starts with 500 gold; Arzawa has two armies (Mira and Apasa) and a fleet in Seha, Seha and
Mira yield 30, and it starts with 300 gold. The fleet came with the coalition bots: Hatti won 41 of
100 games, and in every one of them it ended holding most of Arzawa, usually taken in the first
eight seasons, before a letter from anyone who could help had arrived; with Arzawa able to hold
its coast, Hatti takes under a third.

Two runs of 100 games with shared victory on, as it was when balance was frozen, all replays exact
(mean growth over both):

| Power | Tier | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth |
|---|---|---|---|---|
| Egypt | Strong | 26% | 22% | 2.33 |
| Hatti | Strong | 29% | 29% | 1.92 |
| Babylonia | Strong | 19% | 15% | 2.23 |
| Mitanni | Middle | 6% | 7% | 0.86 |
| Assyria | Middle | 16% | 20% | 1.58 |
| Arzawa | Weak | 14% | 14% | 1.32 |
| Alashiya | Weak | 4% | 6% | 1.12 |

Shared wins count for both partners (about one game in seven ends in one, down from one in two
before rivals for the crown stopped allying), so columns add up to more than 100%. Mitanni,
squeezed between Hatti and Assyria, and Alashiya, which neither conquers nor can outbuy Egypt,
still win least, Alashiya only by sharing a victory with a great king it has bandwagoned with.

With shared victory off (the default since 18 October 2026), the same seeds, all replays exact:

| Power | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth |
|---|---|---|---|
| Egypt | 23% | 22% | 2.33 |
| Hatti | 29% | 28% | 1.92 |
| Babylonia | 16% | 12% | 2.23 |
| Mitanni | 3% | 4% | 0.86 |
| Assyria | 16% | 20% | 1.58 |
| Arzawa | 13% | 14% | 1.32 |
| Alashiya | 0% | 0% | 1.12 |

The games play out as before (no script king's decision depends on the rule; mean growth and the
coalition counts are the same); only the winner changes, and a win that was shared now goes to the
power with the highest growth. Alashiya, whose wins were all shared, no longer wins at all against
script kings. Balance stays frozen, so this is recorded, not tuned; it is the first thing to look
at once model kings have played (see `docs/rounds/2026-10-18-sleep-and-simulation.md`).

After the simulation-fixes round (19 October 2026), which changed the script kings and characters in
a few places (its report, "Benchmarks", lists which), the same seeds with shared victory off, all
replays exact, nothing tuned:

| Power | Wins, seeds 1–100 | Wins, seeds 101–200 | Mean growth, 1–100 | Mean growth, 101–200 |
|---|---|---|---|---|
| Egypt | 19% | 25% | 2.35 | 2.32 |
| Hatti | 34% | 32% | 2.07 | 1.94 |
| Babylonia | 17% | 15% | 2.29 | 2.21 |
| Mitanni | 4% | 1% | 0.79 | 0.78 |
| Assyria | 14% | 16% | 1.58 | 1.52 |
| Arzawa | 12% | 11% | 1.11 | 1.31 |
| Alashiya | 0% | 0% | 1.10 | 1.13 |

The coalition signal (two kings supporting each other into the leader's land, or holding against
his attack) fires in about one game in ten: 27 times in 15 of seeds 1–100 and 9 times in 8 of
101–200, where before it never fired in 200 games. Joint blows need two sworn partners next to the
same province of the leader's, which the map allows only on a few borders. Other signal counts from
script games are mostly artefacts of the bots' templates (their letters complain, their tablets
name consequences). The signals are meant to be read from model and human games. They are
heuristics read from the record afterwards (`src/game/src/signals.ts`): a broken promise is a
conquest between two kings who had sealed a tablet that season or earlier (audiences come before
orders), except a king taking back a province of his own homeland; an accusation is a letter or an
audience reply with one of these, read as whole words (`TextKit.isAccusation`): "liar" or "lied";
a lie as an untruth ("a lie", "his lies", "you are lying", "your words are lies", "lying to me",
"he lies."), not where the prizes lie to the east, a road lies in the hills or troops are lying in
wait; deceit, deception or falsehood; "false" said of a person, a word, gold or a tablet ("the gold
is false", "false words"), not of a rumour; "broke" or "broken" in the same clause as an oath, a
tablet, a seal, a word, faith, a promise, a pact or the peace, not for an army broken in battle nor
in "Shamash will see who broke the peace"; "oath-breaker"; "betrayed", "betrayal" and the like, not
the bare verb ("I would never betray my brother"); "faithless". A denial just before the word ("I
have never lied", "let no false word come between us") accuses nobody. It reads words, not meaning:
in the seed-7 agent games every hit is an accusation (9 and 10 signals; the substring matcher gave
35 and 30, the first whole-word one 14 and 17, about half of them false), but sarcasm or a quoted
charge can still count. A messenger is blamed (`SignalDetector.blamesMessenger`) when a letter or an
audience reply says he lied or his words are false, or, since the fix pass after item 4, that he, his
scribe, his interpreter or his tongue erred, misspoke, garbled or twisted the words ("Either your
scribe erred or your tongue did", which Babylonia said to Egypt's envoy in the second agent
simulation and the signal missed). A complaint about gold ("your messenger's hands are heavy with my
gold", the script kings' line for a short lot) blames him for the gold, not the words, and is not
counted.

