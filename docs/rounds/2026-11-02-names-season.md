# When each claim was read (#550)

An accepted idea (the owner, 2 November 2026; archive item 182): under NAMES CLAIMED, the season each claim was read
from its sealed greeting. PR #574.

## Built

- **The seat view:** `NameClaimView.heard` holds, for each claimant whose claim the court read in a sealed greeting, the
  season that greeting was sealed. The source is the court's own `namesHeard` (`HeardName.sealed`). The court's own
  king, and a claimant to his own land's name, need no greeting and get no entry.
- **The Court section:** for example, ", as read in Amurru's greeting sealed in season 2, 1344 BCE", in the court's own
  calendar (`heardIn`, `ui/format.ts`).
- **The models' line:** the same, with the season as the request's SEASON line writes it ("Peret (growing), year 2"). No
  turn's number appears.
- The rulebook line on NAMES CLAIMED, the README and design note 46 say it too. The page's registry
  (`session/core.ts`) is unchanged: the Court section reads the season from the view.
- No save version: the change is to views only, and no seed moves.

## Readings taken

- **"Heard" means sealed:** the game keeps the date a greeting was sealed, which is the date the tablet bears and so
  what the court can know. It does not keep the date the greeting arrived. The line says "sealed". Principle: show only
  what the seat could know ("Hidden information").
- **No turn number:** the season is named as the game names it, so a king has no internal number to repeat ("Requests
  are rules too").

## Script kings

There is nothing new to use: the season is information shown to the seat. The bots' choice of whom to give a name to is
unchanged, so there is no use-against-ignore row.

## Review

- **Codex:** a P1 that the README was not updated; fixed.
- **Claude's reviewer (Opus, high):**
  - round 1, 7: the README, the rulebook, design note 46, the wording with two claims, and no test of `heardIn`; all fixed.
  - round 2, 9: one README sentence; fixed.
  - round 3, 10.
- One idea: none.

Questions for the owner: none.
