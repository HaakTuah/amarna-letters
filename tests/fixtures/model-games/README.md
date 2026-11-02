# Real model games, exported from the web app

Games the owner played with model seats, exported with the game's own export (`.jsonl`, save version 38), kept as data
on real API calls: what was sent, what came back, the tokens and cost of each call, and every error. Replaying them
makes no API calls. Before a file goes in it is searched for API keys, e-mail addresses, local paths, account or
organisation ids and request ids; the export itself is audited by the side lane "What a game's export holds"
(`docs/BUILD-PROGRESS.md`).

| File | Game | What it shows |
| --- | --- | --- |
| `haiku-two-seasons-seed-407184.jsonl` | 1 November 2026, seed 407184: every seat, character and the narrator on Haiku 5.5; setup and two seasons, $0.52 | 156 calls refused for too many in flight (429), 57 of season 1's 104 decisions falling back to scripts; 25 copies of one 70,600-token cache written in season 1; 26 answers refused for slips (a quoted blank, a list where a blank was asked, "babylon" for Babylonia). The data for "Calls that get through, live or in the background" (Engine and models). |
