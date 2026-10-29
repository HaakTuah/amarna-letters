# Languages (29 October 2026)

Build order item 12, "Languages" (`docs/intent/build-order/item-12.md`), from the languages dossier
(`docs/history/07-languages.md`) and the doors' peoples (`docs/history/08-beyond-the-edges.md`). Branch
`item/languages`, PR #150, pipelined from 11b++ (#137, merged during the build; `develop` merged in before review). Save
version 27. What was built, by file: `docs/design/30-languages.md`. Weekly usage: unknown (`scripts/usage.sh` cannot
read it in this session). Effort: medium, as set. Nothing was carried over to item 12 on its row of the progress file.

## The check for changes

The copy was cut from Build order revision 88, Diplomacy and intelligence 25, Characters 20, Overview 567. Asked at the
start: nothing had changed in any of them. Asked again before the pull request: (see below).

## The audit at the start

The 50 script games before this item (seeds 1-50, the starting branch) used every feature built so far except those
earlier audits already list for later items: no hire abroad, no reputation or pact-with-consequences signal, no
secrets caught or reports sold, no winter crossing, no sea landing, one shared victory or coalition in a few games. None
is this item's. This item makes hiring abroad harder still (an envoy and the man must understand each other), which is
its rule, not a gap.

## What was built

See `docs/design/30-languages.md`. In short: languages by province and court as map data from the dossier; every
character's and king's skills from origin, calling and service; learning by living there by the share of the season;
the dice of who understands whom, settled before any model is called; envoys nobody understands (the plain notice, the
gifts presented by the envoy's own choice, stay, go home or lie, with a request of its own for model envoys); go-betweens
with a posted price, hired bridges, and bending only by one in someone else's pay (a request of its own, the script
softening a threat or dropping a demand; noticed by someone who understands both); hiring and letter carriers gated by
understanding; composing (a halting envoy leaves later, a mute one cannot be sent; a tablet in a language the receiver
reads needs a scribe); reading (a tablet waits in the archive for a reader); hearing at court by the court's own
language; the retired garbling; the rulebook's LANGUAGES part, with every court's speech and reading from the map data;
the seat view (what people say they speak, envoys unheard at court, who bridged an audience); the web app shows both.

## The review

One reviewer (Opus, high effort) read the diff against "The game in one page", the item and its section. One blocking
finding, fixed: a bridger's bending was written into the envoy's record, which the host's audience transcript prints,
so the host always learned of it; now nothing of it is recorded unless someone noticed. Should-fix, all fixed: an
unheard envoy now presents his gifts the season after, keeping what he chooses (it had handed them all over for him);
the rulebook now lists every court's language and what its scribes read (model kings lacked what script kings use);
envoys unheard at court are in the seat view, so a king can hire a bridge in any later season, not only the first; a
court that heard an envoy through a bridge who has since left tries again. Nits fixed: a go-between is paid only for
an approach that is made; no state is written while an audience view is built; gifts presented unheard stay in the
envoy's record when he is heard later. Taken as readings (below): the envoy's use of a posted go-between, and only the
envoy's message bridged by a bent go-between, not the host's reply.

## Script players

(numbers below)

## Benchmarks and script games

(numbers below)

## Readings taken

Each is settled by "The game in one page", the item's section or the dossier.

1. **Arzawa's court speaks Luwian and reads Hittite and Luwian, not Akkadian** (the dossier's reading, EA 31-32); Seha
   and Mira the same. Period first.
2. **A court's servants at court, and its king, are who understand an envoy** ("the king or any servant"); free people at
   the court are not, unless the envoy pays one as a go-between or the king hires one. The section's words.
3. **A chain through one servant at most** (envoy, servant, king), the weakest skill along it counting. "A servant who
   bridges"; longer chains are proxies by envoy ("Alien courts"), which need no rule.
4. **Understanding, once reached, holds while two stay together**; it is rolled again when they meet anew. Skill buys
   time: once the words have crossed, they have.
5. **The dice for every pair are rolled when first needed in a season, on a stream keyed by the pair and the season**,
   so the result is the same whichever part of the engine asks first ("The order of resolution never decides"); the
   ones a character's request lists are settled before it is asked.
6. **An unheard envoy presents his gifts the season after he arrives, or as he leaves**, so that what he keeps is his
   own choice made in his request, as at any audience ("characters decide"); the host is told at once that nobody
   understands him.
7. **An envoy nobody understands uses a go-between at his posted price from his own purse** ("anyone there may use him at
   that price without bargaining"): the go-between's price is the only thing to choose, and the envoy is the one who
   wants to be heard. A model envoy may go home or stay instead in its request.
8. **Only the envoy's message is bridged by a bent go-between**; the host's reply reaches the envoy as given. "Once for
   each message he bridges": the envoy's message is the one that carries the terms; a call for each reply round would
   double the calls for little. A first build, noted in the design notes.
9. **A carrier takes a letter only to a court where someone shares a language with him** at any skill ("speaks its
   language or the lingua franca"); being slow to be understood at delivery does not delay a letter, which is read by
   the court's scribes.
10. **The king's composing and the tablet's scribe are rolled at dispatch for the seasons to come**, at most six; skill
    gained meanwhile does not shorten it. Simple, and the same odds.
11. **A tablet with no common written language goes in the sender's own** (Akkadian where it writes it) and waits for a
    reader there. "An unreadable tablet waits until a reader is found."
12. **The king chooses who translates by standing practice: the best reader at court tries each season.** "The king
    chooses who translates it"; no order is needed to choose the best, and any other choice would be worse.
13. **A tablet sent to a third court to be read and its reading sent back is not built** (no translation comes home by
    envoy); a copy can be shown abroad. Left with "Tablets are objects in a place".
14. **People say what they speak in words, a level more for one who overrates himself**; kings see it only for people at
    their court or who pitched to them, and not for their own servants away. "Kings never see skills".
15. **A go-between's price is a fifth of his season's asking price there, at least 2 shekels**, set by the same formula
    for every mind as asking prices are. "A script go-between sets his price by expected income".
16. **Starting servants speak their court's language well** (60 to 95): they have lived there for years ("Learning by
    living there").
17. **A king learns the languages spoken at his capital, as anyone does**, at aptitude 40. "Kings and rulers follow the
    same rules".
18. **Learning comes from where one spent the season, whatever one did there**; a captive learns as a guest does
    ("Detained envoys come home speaking their hosts' tongue").
19. **A model envoy's choice when unheard and a bent go-between's words are requests of their own** ("Unheard",
    "Bridge"), on the ladder like a spy's waiting reports; the script decides by traits and is the shadow.

## First guesses (for item 18)

Spread wide 100, common 60, some 30, few 10. Learning (8 + aptitude/5) × spread × share × (100 − skill) / 10⁶ points a
season; aptitude 5-85 (+15 for the lettered and traders); a king's 40. Starting skills: home's widest 100, common
tongues 40-90 (6 in 10), some 15-60 (3 in 10); Akkadian 60-95 (scribes, interpreters, envoys), 30-75 (traders and the
like), 10-45 (3 in 10 of the rest); a starting servant's court language 60-95. Crossing: at once from 80, else the
skill in a hundred. An unheard envoy waits 1 season + 1 per 25 loyalty; lies below loyalty 40 with greed 55 or more.
Composing at most 6 seasons. Go-between price 20 in 100 of a season's asking price, at least 2. Someone else's pay:
gold handed in the last 4 seasons. Hearing at court: × (0.25 + 0.75 × skill in the court's language / 100).

## Use against ignore

Interim, before item 11e (to be measured again on 11e's game): `--language-play-half`, seeds 1-50: 0.69 growth to
0.72, 21 wins to 29 at first; after keeping gold and tablets with the more reliable half of the envoys and one bridge a
season, 0.69 to 0.70, 22 wins to 28. Not paying yet by wins: being understood saves seasons, which the scripts' growth
does not yet turn into gain; re-measure after 11e and in item 18.

## Questions for Haakon

(below)
