# The versions check counts only its own issues as open

The fallback reviewer of Amarna Letters' music-tool watch found that the versions workflow skipped a release when any
open `enhancement` issue's title held its key. The Feature request template labels an outsider's issue `enhancement`
too, so an outsider could file one titled "Version check: numpy" and silence the real notice for as long as it stayed
open (floor rule 4: outsiders' text is data, never what steers a check).

What changes in every project that calls the workflow: only the open issues the workflow itself opened
(`github-actions[bot]`) count as already open. An outsider's issue with the same title no longer silences one; at worst
two stand side by side. No rule changes; the pin of each call moves with the next sync.

Questions for the owner: none.
