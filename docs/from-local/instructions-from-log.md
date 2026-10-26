# Instructions from the owner's message log not recorded elsewhere

Haakon's message log (`owner-messages-log.md`, 71 messages from 17 to 26 October 2026) stays out of the repo. It was
read once on 26 October 2026, and each instruction, decision or open question about this project was checked against
the repo's docs and `docs/from-local/`. These are the ones that were not recorded anywhere else. Each is quoted word
for word, with the date and time (UTC) it was sent. Only project matters are included.

What was left out:
- the pasted round prompts and additions, already saved word for word in the repo
- instructions already recorded in `docs/BUILD-PROGRESS.md`, the two spec files, the design notes or the copied memory
  notes
- one-off commands whose result is in git and on GitHub (create the repo, merges, pushes, Auto-fix switches)
- questions that were answered

No open questions were found.

## Still current

1. **2026-10-17 14:07**, the answer to a setup question ("How should live Claude API calls be tested? I can't type
   your API key into the game myself."):

   > Offline only, you run live (Recommended)

2. **2026-10-19 05:25**, on how chat instructions relate to the design document when starting the Build order:

   > Start with item 1, which is this interrupted round (If any of the work you do now isn't on the document, do it first unless it contridicts the document)

3. **2026-10-19 14:05**, on running the agent games of item 4, and a principle for any later model games:

   > For the two games: after the first two or three seasons of the first game, estimate what a full game costs in weekly usage. Only start the second game if, by that estimate, it can finish below 70%. If it can't, finish the first game, write it up, and leave the second ready to run in a later session. A complete game is worth more than two halves.

4. **2026-10-20 07:20**, the usage plan and how to wrap up:

   > Usage plan: both of my Claude Code sessions share the weekly limit, so check usage after every commit from now on. When weekly usage reaches 92%, stop starting new work and wrap up so you finish below 95%:
   > 1. Bring whatever is in progress to a clean commit that builds and passes its tests. If something can't be finished, leave it out of the commit and note it in the progress file.
   > 2. If item 5 is finished and reviewed, merge it into develop and push as the builder rules say, with the usual check of the previous PR.
   > 3. If item 5 is not finished, do not merge it into develop. Push its branch and open a draft PR from item/sieges to develop, titled as unfinished, listing what works and can be tested now, what is missing, and anything known to be broken.
   > 4. Update BUILD-PROGRESS.md (including the "For Haakon" table) and the item's report so the next session can resume from them, then stop.
   > In the PR description, say how to test the new features: what to click or run, and which seed or setup shows them.

5. **2026-10-20 10:04**:

   > Let's push it up. You wrap up approaching 95% weekly usage. If the item is on the lighter side, you may start it at 94%.

6. **2026-10-20 11:33**, after item 5's review answers (which are recorded in `docs/BUILD-PROGRESS.md`):

   > Do not start item 6 or any other work until I tell you to continue.

   Since then, Haakon has set what comes next: the docs and preview pass, the TypeScript conversion, the fix pass, then
   item 6 (`docs/CONVERSION-PLAN.md`). Each of these starts when he says so.

7. **2026-10-21 16:29**, on mirroring the design document:

   > README only. You're right, there is no mirror: the design document records intent, and docs/DESIGN-NOTES.md is the source of truth for what's built. Add "The courts" next to "The seven Great Kings" as you described, as its own PR into main for me to merge, separate from the conversion. Don't create docs/DESIGN.md.

## Superseded, kept for the record

8. **2026-10-19 05:25**:

   > For this session, stop at a clean commit when the weekly usage limit passes 50%.

9. **2026-10-19 14:00**:

   > You are cleared up to 70% of weekly usage instead of 50%.

Both were replaced on 19 October by the limit of 95% now in the builder rules in `docs/BUILD-PROGRESS.md`. Haakon
sets the limit for each new session himself.
