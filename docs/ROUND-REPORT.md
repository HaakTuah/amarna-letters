# Round report: fixes from the simulation, default sleep, and a clearer seat view

Branch `round/simulation-fixes`, from `main` after PR #6, 18 October 2026. The prompt is `docs/ROUND-PROMPT.md`.
The previous round's report, which holds the plans for all 27 Part 3 questions, is now
`docs/rounds/2026-10-18-sleep-and-simulation.md`; "question N" below means that report.

*Work in progress: this report is saved as the round goes.*

## How I read the prompt

Where the prompt left room, I took these readings and carried on:

- **Old references.** The prompt asks to update "this prompt's question numbers" to the old report's new path. The
  prompt is saved word for word, and its own sentence already says that "question N" means the old report, so its
  text is unchanged; every other reference (`DESIGN-NOTES.md`, `sim/README.md`, `docs/SIMULATION-PROMPT.md`) points
  to the new path. No code comment named the report.
- **Sleep is on by default.** The design document decides "sleep is the default", and the prompt says the switch
  stays for comparison. So `SleepingSeats` now defaults to on in the engine, the batch runner and the web app;
  `--sleep off` and the web checkbox turn it off. Script and human seats still play every season.
- **What wakes a king.** The prompt's list (Part D.5) replaces the old one. Where it differs from the design
  document ("foreign troops at your border"), I followed the prompt: troops at the border, failed attacks that did
  not get in, candidates, catastrophes that kill no unit, spies caught and forgeries ready now go to the digest.
  The text the kings read names exactly what still wakes them.
- **Notes.** In the simulation the kings' notes had a median of 1,989 characters (134 orders replies; 107 longer
  than 1,500), so the prompt's example cap of 1,500 would have cut most of them. Each season's notes are kept up to
  2,000 characters, and the king is told the limit.

(More readings are added below as each part is built.)
