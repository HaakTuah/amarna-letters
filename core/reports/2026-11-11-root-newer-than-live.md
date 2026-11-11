# The root is published from any commit of main newer than the one live

**What:** `scripts/site-publish.sh root` records the commit it published in `.root-commit` at the site's root, and
publishes only a commit of main that comes after that one (main's history fetched as commits only). It replaces the
rule of the same day that published only main's newest commit.

**Why:** under that rule, a passing build that main had already moved past was skipped, so when the newer commit's
build then failed, the live game stayed on the version before both until main built green again. Now a passing build
goes live whenever it is newer than what is live; a re-run of an older build is still skipped, so the live game never
goes back. Asked for by the owner in the design session ("Do that.", on this proposal, 11 November 2026).

**What it changes in every project:** nothing to do but take the sync. The first publish after it has no record to
compare with and publishes as before; from then on the record decides.

**Checked:** against a local repository, from a shallow clone like CI's: with nothing live a commit of main publishes,
even when main has moved past it; a newer one publishes; an older re-run skips; a commit not on main skips; the same
commit again is "unchanged"; the fetch leaves no filter set for later fetches.
