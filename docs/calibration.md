# Calibration

The log of the checks that keep the review bar from slipping, the weekly blind re-reviews, the canaries, and the monthly
history spot-checks and slop checks, newest first ("Reviews", point 5, in `docs/claude-and-codex.md`).

| Date | Check | PR | Reviewer checked | Misses | What changed |
| --- | --- | --- | --- | --- | --- |
| 2026-11-02 | Full history check | #473 to #510 (15 PRs) | Every dossier, the README and the cast (Opus helpers, high; Codex reviewing each PR) | 230 wrong and 111 without a source in 1,447 claims (16%, and 8% with no source), 213 left unclear; Codex then found 39 more in the helpers' fixes, and one finding of its own was answered with the source's words (Luckenbill's "he fled") | Every dossier and the cast fixed to their sources; anchors and quotes on every line the game rests on; the anchor test for people and rulers; questions #476, #482, #486, #492; anchors for the rest of the data and the unclear lines stay in "Follow-ups" |
| 2026-11-02 | History spot-check | #466 | The dossiers and the cast (Claude's reviewer, Opus, high) | 3 of 13: Tushratta's detained envoys (Mane was Pharaoh's, #460); Yapahu as Milkilu's brother (#461); Shindishugab cited to EA 11, not EA 10 (#462). Held: Naphurureya and Akhenaten's dates, Burna-Buriash's dates, EA 16, Tarhundaradu [C], the gilded statues, Hinnatuna (EA 8), Salmu robbed twice (EA 7), Tagi, Zida, Rib-Hadda shut out | Dossiers and cast fixed in this PR; dossier lines added for Shindishugab, Yapahu and Tagi as Milkilu's father-in-law, which the cast used without a source |
| 2026-11-02 | Blind re-review | #374 | Codex | 1 blocking (province card reads the latest state when looking back) | Fixed in #414; second Codex miss in a row on seat views: interface went to Claude's reviewer until its guidelines were tightened with the owner, the same day ("Hidden information" in "Review guidelines", #420); interface is Codex's again, and the next canary plants a seat-view leak |
| 2026-11-01 | Blind re-review | #359 | Codex (and Claude's round 2) | 1 blocking (province panel leak) | Fixed in #374; follow-up for the seat view's own early drop goes to item 17++ |
| 2026-11-01 | Canary (before this rule) | Snakes #298 | Codex | 0 of 3 | None needed |
