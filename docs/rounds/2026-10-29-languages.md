# Languages (29 October 2026)

Build order item 12, "Languages" (`docs/intent/build-order/item-12.md`), from the languages dossier
(`docs/history/07-languages.md`) and the doors' peoples (`docs/history/08-beyond-the-edges.md`). Branch
`item/languages`, PR #150, pipelined from 11b++ (#137, merged during the build). Held, as the orchestrating session
asked, until item 11e merged (#154), so that its measurements are on 11e's game; `develop` (11c, 11e, 11c+ and Haakon's
#166 and #167) merged in. Save version 29. What was built, by file: `docs/design/30-languages.md`. Weekly usage: unknown (`scripts/usage.sh` cannot
read it in this session). Effort: medium, as set. Nothing was carried over to item 12 on its row of the progress file.

## The check for changes

The copy was cut from Build order revision 88, Diplomacy and intelligence 25, Characters 20, Overview 567. Asked at the
start: nothing had changed in any of them. Asked again before the pull request: Build order revision 89 added item 11e,
to come before item 12's measurements; nothing else changed, and item 12's text is the same. 11c's six cities of
Canaan (Akko, Hazor, Gezer, Ashkelon, Lachish, Hebron) were given their languages when 11c merged in (Canaanite, as the
dossier gives Megiddo, Shechem and Jerusalem).

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

How often each feature was used, and succeeded, in 50 script games on 11e's game (seeds 1-50, after): envoys not
understood on arrival 1,971 (then heard through a court's bridge or a go-between, gone home 496, gone home to lie 227,
the rest still waiting or heard later); go-betweens carrying an envoy's words at a court 2,287, between two people 502;
a court's servant bridging 189; mandates taking seasons longer 1,252; envoys who could not be sent 0; tablets waiting for
a reader 2,067, read later 933; words bent by a bridger in someone else's pay 44, noticed 3; bridges hired by script kings
(stay jobs) 543 against 421 before. Weaknesses found and patched: the script kings first sent the envoy who spoke the
host's language even with gold or a tablet, where reliability matters more (patched: such missions go with the more
reliable half), and hired a bridge for every unheard envoy at once (patched: one a season); the review found the
script kings could hire a bridge only in an envoy's first season (patched: by the envoys standing unheard, from the seat
view). Left: a script king sends no young servant abroad only to learn (the posts it sends learn anyway: envoys,
residents, spies, detained envoys), and script characters do not yet choose where to seek work by their languages.

## Benchmarks and script games

**Before** (`develop` with 11e, seeds 1-50) and **after** (this branch), `scripts/sim.sh --games 50 --seed 1`; after
with `--verify-replay`: 50 of 50 replays exact. A capital fell in every game both times (560 kingdoms before, 579 after);
the first fall came in season 5 on the median, and a kingdom fell in the first two seasons in 1 game of 50 both times.
The Great Kings (the city-states and chiefs are in the logs):

| Power | Wins before | Wins after | Growth before | Growth after | Score before | Score after |
|---|---|---|---|---|---|---|
| Egypt | 15 | 20 | 0.83 | 0.86 | 0.69 | 0.77 |
| Hatti | 2 | 8 | 1.12 | 1.39 | 0.47 | 0.63 |
| Babylonia | 25 | 17 | 1.03 | 0.99 | 0.77 | 0.73 |
| Mitanni | 0 | 0 | 0.72 | 0.71 | 0.43 | 0.41 |
| Assyria | 7 | 4 | 0.99 | 1.00 | 0.57 | 0.57 |
| Arzawa | 0 | 0 | 0.82 | 0.67 | 0.36 | 0.35 |
| Alashiya | 0 | 0 | 0.97 | 0.96 | 0.35 | 0.35 |

The retired garbling: "a clause lost" in recited letters went from 497 to 88 and answers misreported from 172
to 5; what is left comes from envoys' own motives and clauses the templates refuse. Hiring at court 11,835 to 11,407; carriers hired
925 to 790 (a carrier must be understood where he goes).

**Calibration** ("Calibrate how widely Akkadian is spoken"): envoys not understood on arrival, in a hundred of those
that arrived, by the court that sent them: Egypt 31, Alashiya 28, Babylonia 22, Hatti 21, Ugarit 17, Assyria 14, Mitanni
11, Arzawa 6, the Levant's cities mostly 3 to 15, the Kaska 42. Native Akkadian (Babylonia, Assyria) is no shield: their
envoys go unheard where a court keeps few Akkadian speakers at hand (Arzawa, Alashiya, the Kaska, small cities), and
Egypt's most, since it sends the most envoys and its own servants speak Egyptian first. Akkadian as the dossier gives it
blocks about one envoy in five at first; most are heard within a season or two through a bridge.

**How long each court's letters wait for a carrier understood where they go** (seasons, letters carried): the Great
Kings 1.3 to 1.9 (Alashiya 1.9, Arzawa 1.3), the cities 1.0 to 2.2 (Qatna, Terqa 2.2; Carchemish, Tyre 2.1); before item
12 they waited 1.5 on the whole.

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

`--language-play-half` (half the script kings choose envoys without regard to languages and hire no bridges), seeds
1-50, on 11e's game: 0.75 growth to 0.75, 23 wins to 27. Before 11e: 0.69 to 0.72 and 21 to 29 at first, then 0.69 to
0.70 and 22 to 28 after the patches above. Even, within noise: the rules of being understood bind every king alike,
and what a king's choices add (the right envoy, a bridge) saves a season or two that the scripts' growth does not yet
turn into gain. Re-measure with command at a distance (13) and in item 18.

## Questions for Haakon

1. **Stop for review: the balance between courts with native Akkadian and the rest.** As the dossier gives it, Akkadian
   is spoken mostly by scribes, traders and envoys outside Babylonia and Assyria, and about one envoy in five is not
   understood where he arrives (Egypt's 31 in a hundred, Babylonia's 22, Arzawa's 6): native Akkadian is no shield, and
   languages block at the centre as well as at the edges. The section's "Calibration" suggests Akkadian common, scarcer at
   the edges. Reading taken: leave it as the dossier gives it until item 18. Alternative: every court that reads
   Akkadian keeps an Akkadian-speaking scribe at court from the start (a servant of the court's), so envoys with Akkadian
   are heard at the centre and languages block mostly at Arzawa, Alashiya, the Kaska and the Lukka. Which do you want?
