# No usage caps; other providers first

The owner's word of 11 November 2026 (core archive 146): every reference to usage caps goes, since sessions and
orchestrators misread them and no cloud session can read the plan's usage anyway; the rule on spending other providers
first stays.

What changes in every project:

- **Floor rule 16** ("The owner's share of Claude", the 90% stop) is removed, on his yes (core archive 146, relayed in
  this PR). Rule 3 lists "the cloud setup script" among what runs by itself, the status line script being gone.
- **`modules/claude.md`:** the brake (no new side lane from about 85%, only small things from about 90%) and its
  measuring after every commit are gone. In their place, "Work continuously, other providers first": Codex, and any
  provider the owner keeps only for the projects, gets every part of the work it can do well (today its reviews; its
  lanes once it builds) before Claude does. Core archive 76 gave that rule; the cut-down of 10 November dropped it with
  the measuring it leaned on; it returns needing none.
- **`modules/orchestrating.md`** no longer says the brake closes lanes first; **`modules/work-flow.md`**, point 4, drops
  the polish lane's account and usage clauses: it runs beside the main lane and never ahead of it.
- **`scripts/usage.sh` and `scripts/statusline.sh`** are removed, with their lines in `README.md` and in jq's entry of
  `.github/licences-audit.json`, and the core's own "Usage" line in `AGENTS.md`. Each game drops the status line from
  its `.claude/settings.json` in its own PR, beside its sync.

The floor and modules are 44,485 bytes of the 45,056 cap.

Readings taken:

- The Fable rule in `modules/claude.md` stays: it sends the scarcest model only to planning design, the last escalation
  step and work the owner names, which no one measures; it routes, it caps nothing.
- Amarna Letters' model-game kit keeps its own stop points (the simulation and play prompts): those games are dormant
  until the build order is done and the owner starts one himself, and one can spend a week in hours. Told to him, to
  remove on his word.

Questions for the owner: none.
