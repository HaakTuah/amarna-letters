# Review guidelines: this game's own

What every reviewer judges a change by here, read whole with `core/modules/review-guidelines.md`, its brief
("The fallback reviewer's brief" in `core/modules/reviews.md`), `SECURITY.md` and the floor. It changes only on the
owner's word (archive item 206).

**The design checker's brief** adds, when the item adds or changes real-world content, the dossier passages it cites;
a fact without a source, or against its source, blocks.

**History holds,** for every reviewer: report as P1 a real-world fact (a person, place, date, name, custom or event) the
change adds or alters that has no source in `docs/history/`, or contradicts the source it cites. Each real fact in the
game's data names the dossier line it rests on by that line's anchor, and the line quotes the few words of its source it
relies on; a test fails when an anchor is missing or its line names someone else (archive item 167). Where no source
speaks, the game takes the most plausible estimate: published expert estimates, as many as can be found, their consensus
or middle, each cited, graded [G]; a guess made earlier has no standing of its own, and gives way to a better-grounded
one (archive item 170).

**Hidden information,** for every reviewer: report as P1 any read of the true game state that a seat could not know, in
what it is shown, what a model is asked, what a script king reads or what an export holds. Check every path: the latest
season, past seasons, replays and the god view. The canary tests (`src/web/test/canary.test.ts` and
`src/web/test/twin-canary.test.ts`) guard the same from the other
side, since a reviewer can miss it.

**Text a player reads,** for every reviewer of a change that adds or rewrites it (archive item 178), the tells beyond
the core's "Text users read": hedging; modern idiom in an ancient voice
(`docs/intent/world-and-history/voice-of-the-age-letters-customs-and-vocabulary.md`); the same formula in every
season's report; lines too long for the seat view. A 10 means nothing reads machine-made, every
voice is its own and no formula repeats; where a PR shows lines before and after, the owner's read of them is the
final word.
