# The record of each cap's raises

The history behind the caps of `scripts/size.mjs`: each raise of a role's cap, with its leanness check's numbers. Whoever
raises a cap adds its entry here in the same pull request, after the last one; no check reads this file, and the check
of a raise (`node scripts/size.mjs --raise`) reads the caps' own block in `scripts/size.mjs`, never this record.

Each role's cap, a whole number of KB: one line a role, spelled exactly so. The builder's is the one cap of before,
which held what every session read at its start, raised one step on 16 November 2026 for the builder's own file
(#304), its leanness check having found 108 bytes of room for the 1,038 that file needed; the others were first set
that day, each the whole KB next above its start. The reviewer's, raised one step the same day for the review
guidelines' "A finding names its rule" (#254), its leanness check having found 124 bytes of room for 204 over, in
trims of the guidelines that its issue did not ask for and so are not made; and again on 17 November 2026 for #486's
package rule, its pointers in the review guidelines and how-to-work, its leanness check having found 135 bytes of
room, made, for 262 over, and 65 more in trims of the guidelines that its issue did not ask for. The builder's, the
design session's and the orchestrator's, each raised one step on 19 November 2026 for #702's merge line, their
leanness check having found 216 bytes of room for the orchestrator, made, and too little for the three. The
orchestrator's, raised one step again on 19 November 2026 for #467's tiers in tasks/roles.md, merged after #702's, its
fresh leanness check having found 118 bytes of room for 940 over: 17 made in tools/claude.md, and 101 in rules its
issue did not ask for, not made. The adviser's, set at 33 KB on 19 November 2026 for #492, what its start read when
the role came; the design session's and the orchestrator's not raised for it, two fresh leanness checks having found
room enough; the reviewer's, raised one step for it, merged after #777, a third fresh leanness check having found 9
bytes of room in the floor's new text, made, for 474 over; and the design session's and the orchestrator's, one step
each, merged after #790, a fourth having found 34 and 61 bytes of room, made, for 179 and 322 over. The builder's, the
design session's and the orchestrator's, each raised one step on 19 November 2026 for #829's description rule in
roles/shared/work-flow.md: a fifth fresh leanness check found 38 bytes of room in the builder's start for 546 over
(824 once point 1 was written whole), in the stop switch's words, which the staged case stop holds; a sixth found 45
in roles/design.md for the design session's 122 over, and 231 in the orchestrator's start for its 219, of which 80
cut a rule's explanation, leaving 151 that a trim may take: too little each time, in rules and lines #829 did not
ask for, and so not made. The orchestrator's, raised one step again on 19 November 2026 for #471's "Never held back in
silence", merged after #829: a seventh fresh leanness check found no room in the sections #471 changes that cuts no
condition, reason, design point or holder (89 bytes would cut the pace rule's reason and holder, and the design check
had refused cutting the rule's condition and its design's point 5), and about 47 bytes in rules it did not ask for,
not made, for 312 over. The reviewer's, raised one step the same day for #307's worked examples in the review
guidelines, merged after #829: an eighth fresh leanness check found 51 bytes of room in the guidelines, made, for
1,073 over. The builder's and the orchestrator's, raised one step each on 19 November 2026 for #750, point 7, "A
builder hands over by its context": a ninth fresh leanness check found about 68 bytes of room in the builder's start,
for 282 over, and about 142 in the orchestrator's, for 69 over; of those, 57 rested on a misread, 74 cut a rule's
name and 11 a restatement it called marginal, so none was made, and the design check's fixes grew both starts. The
adviser's and the reviewer's, raised one step each on 19 November 2026 for #886, point 1, floor rule 3's yes asked of
no path that follows a moved file: a tenth fresh leanness check found 22 bytes of room in the floor, 41 in the review
guidelines and 20 in the inbox, for 143 over in the adviser's and 140 in the reviewer's once the clause took its
reviewed words; the floor's and the guidelines' are changes the owner's yes on #886 does not cover, the inbox's cuts
the name of another rule ("Bugs don't wait"), so none was made, and neither start would fit all the same.
The reviewer's, raised one step on 20 November 2026 for #887, the review guidelines' point on a rule held by reading
alone where a form a check can hold exists: an eleventh fresh leanness check read the reviewer's start whole and
found 8 bytes of valid trim, in the point itself, which was made, for 312 over once the point read a project's own
rules too. The auditor's first, on 20 November 2026 for #464, the whole KB above its start's 19,352 bytes, and the
smallest the base holds.
